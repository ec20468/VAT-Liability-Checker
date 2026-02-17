import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";

import { resolveGovUkDoc } from "@/lib/govuk/resolve";
import { getVatNoticesIndex } from "@/lib/govuk/vatNoticesIndex";
import {
  FlowRequestSchema,
  FlowResponseSchema,
  type FlowResponse,
} from "@/lib/schemas/flow";

// ─── Types ────────────────────────────────────────────────────────────────────

type EvidencePara = {
  poolIndex: number;
  basePath: string;
  webUrl: string;
  docParagraphIndex: number;
  text: string;
};

// ─── STEP 1: Select notices ───────────────────────────────────────────────────

// counts how many query words appear in a notice title — cheap relevance signal before touching the model
function scoreTitle(title: string, words: string[]) {
  const t = title.toLowerCase();
  return words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0);
}

// two-stage notice selection: model first classifies the supply into generic terms that match notice titles,
// then we word-overlap score against those terms, then the model picks the minimum set actually needed.
// the classification step is what makes brand names and specific products work —
// "Skittles" → "confectionery food product" overlaps with the food products notice title, "Skittles" alone doesn't.
async function selectNotices(userText: string, maxPick = 5) {
  const index = await getVatNoticesIndex();

  // classify the supply into generic terms before scoring — this is what lets us match notice titles
  // for branded/specific queries that wouldn't overlap with any notice title on their own
  const classified = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: z.object({ supplyDescription: z.string() }),
    prompt: [
      "Describe the type of good or service being queried in 3-6 generic words that would appear in a UK VAT notice title.",
      "Focus on the supply category, not the brand or specific name.",
      "Examples:",
      "  'Skittles' → 'confectionery food product'",
      "  'Tesla Model 3' → 'passenger motor vehicle'",
      "  'GP appointment' → 'medical healthcare service'",
      "  'Deliveroo order' → 'takeaway food catering'",
      "",
      `Query: ${userText}`,
    ].join("\n"),
  });

  // strip short words so we don't match "the", "of", "in" etc.
  const words = classified.object.supplyDescription
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // pre-rank by title overlap against the classified description, take top 30 as candidates for the model
  const ranked = index
    .map((n) => ({ ...n, score: scoreTitle(n.title, words) }))
    .sort((a, b) => b.score - a.score);

  const candidates = ranked.slice(0, 30);

  const PickSchema = z.object({ picks: z.array(z.string()).max(maxPick) });

  // model picks the minimum set from the shortlist — better at understanding relevance than word overlap.
  // notice 700 is explicitly a last resort so the model doesn't default to the general guide.
  const picked = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: PickSchema,
    prompt: [
      "Pick the minimum set of VAT Notices needed to determine VAT liability for the query.",
      "- You may ONLY pick from the provided list.",
      "- Prefer specific notices over general ones.",
      "- Only pick the general VAT guide (notice 700) if no specific notice covers this supply type.",
      `- Return between 1 and ${maxPick} basePath strings.`,
      "",
      `Query: ${userText}`,
      `Supply type: ${classified.object.supplyDescription}`,
      "",
      "Notices (title | basePath):",
      candidates.map((r) => `${r.title} | ${r.basePath}`).join("\n"),
    ].join("\n"),
  });

  // validate picks against the full index — model sometimes hallucinates paths
  const allowed = new Set(index.map((i) => i.basePath));
  const valid = picked.object.picks.filter((p) => allowed.has(p));

  // fallback to top word-overlap matches if model returns nothing usable
  return valid.length
    ? Array.from(new Set(valid))
    : ranked.slice(0, 3).map((r) => r.basePath);
}

// ─── STEP 2: Build evidence pool ─────────────────────────────────────────────

// simple term frequency score — just enough to filter irrelevant paragraphs before sending to the model.
// the VAT-liability language boost means paragraphs that explicitly state a rate float to the top.
function scoreParagraph(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) score += 1;
  }
  // boost paragraphs that explicitly state a VAT treatment — these are almost always what we need
  if (
    t.includes("zero-rated") ||
    t.includes("standard-rated") ||
    t.includes("reduced rate") ||
    t.includes("exempt")
  ) {
    score += 2;
  }
  return score;
}

// fetches all selected notices, scores their paragraphs, and returns the top N as the evidence pool.
// the model does the real reading in step 3 — this is just to keep context size manageable.
async function buildEvidencePool(basePaths: string[], queryTerms: string[]) {
  const docs = await Promise.all(basePaths.map(resolveGovUkDoc));

  const PER_DOC = 40; // max paragraphs we keep per notice
  const MAX_TOTAL = 160; // hard cap on total evidence sent to the model

  const candidates: Omit<EvidencePara, "poolIndex">[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    // score each paragraph, drop anything that scores 0, keep top PER_DOC
    const top = doc.paragraphs
      .slice(0, 800)
      .map((p) => ({ p, s: scoreParagraph(p.text, queryTerms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_DOC);

    for (const { p } of top) {
      const key = `${doc.basePath}:${p.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        basePath: doc.basePath,
        webUrl: doc.webUrl,
        docParagraphIndex: p.index,
        text: p.text,
      });
    }
  }

  // re-rank across all docs and trim to MAX_TOTAL, then assign pool indices
  return candidates
    .map((e) => ({ e, s: scoreParagraph(e.text, queryTerms) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_TOTAL)
    .map((x) => x.e)
    .map((e, i) => ({ ...e, poolIndex: i }));
}

// ─── Citation helpers ─────────────────────────────────────────────────────────

// throws if the model returns a cite index outside the evidence pool — better to 500 than silently show a wrong source
function assertInRange(indices: number[], maxExclusive: number) {
  for (const n of indices) {
    if (!Number.isInteger(n) || n < 0 || n >= maxExclusive) {
      throw new Error(`Model produced out-of-range cite index: ${n}`);
    }
  }
}

// trims the raw citations down to a small readable set.
// per-doc cap stops one notice dominating the citations panel even if it was cited a lot.
function pickMinimalCitations(
  evidenceOut: Array<{
    url: string;
    basePath: string;
    paragraphIndex: number;
    docParagraphIndex: number;
    snippet: string;
  }>,
  usedIndices: number[],
  opts?: { maxTotal?: number; maxPerDoc?: number },
) {
  const maxTotal = opts?.maxTotal ?? 5;
  const maxPerDoc = opts?.maxPerDoc ?? 2;

  // deduplicate while preserving order of first appearance
  const uniqueUsed: number[] = [];
  const seen = new Set<number>();
  for (const i of usedIndices) {
    if (!seen.has(i)) {
      seen.add(i);
      uniqueUsed.push(i);
    }
  }

  const byIndex = new Map<number, (typeof evidenceOut)[number]>();
  for (const e of evidenceOut) byIndex.set(e.paragraphIndex, e);

  const perDocCount = new Map<string, number>();
  const picked: (typeof evidenceOut)[number][] = [];

  for (const idx of uniqueUsed) {
    const e = byIndex.get(idx);
    if (!e) continue;
    const c = perDocCount.get(e.basePath) ?? 0;
    if (c >= maxPerDoc) continue;
    picked.push(e);
    perDocCount.set(e.basePath, c + 1);
    if (picked.length >= maxTotal) break;
  }

  return picked;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

// each option must cite the paragraph that defines its category —
// this is the core fix for the "invented categories" problem.
// if the model can't point to a notice paragraph, it can't offer the option.
const OptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  citeParagraph: z.number().int().nonnegative(),
});

const QuestionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  reasoning: z.string(),
  options: z.array(OptionSchema).min(2).max(6),
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1),
});

// call 1 result: model reads the evidence and decides what state we're in.
// ANSWER = can conclude now. NEED_CLARIFICATION = genuinely ambiguous, needs one question.
// separating this from question generation means the model focuses purely on reading before deciding anything.
const ReadSchema = z.object({
  status: z.enum(["ANSWER", "NEED_CLARIFICATION"]),
  // which paragraphs govern this supply — used by both the answer and question calls
  governingParagraphs: z.array(z.number().int().nonnegative()).min(1),
  // if ANSWER: what the liability is and why
  conclusion: z.string().nullable(),
  reasoningBullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .nullable(),
  // if NEED_CLARIFICATION: what branch point needs resolving and why existing answers don't cover it
  unresolvedBranch: z.string().nullable(),
});

// call 2 result (only reached if call 1 returns NEED_CLARIFICATION):
// model generates exactly one question based on the unresolved branch identified in call 1.
const AskSchema = z.object({
  question: QuestionSchema,
});

// call 2 fallback (stall guard): model gives the best answer it can with what it knows.
// conditional rules ("if X then zero-rated, if Y then standard-rated") are fine here.
const ForceAnswerSchema = z.object({
  conclusion: z.string().min(1),
  bullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .min(1)
    .max(8),
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1).max(12),
});

// ─── Multi-step prompts ───────────────────────────────────────────────────────

// call 1: purely a reading task. model finds the governing section, checks whether it branches,
// and checks whether the answered clarifiers already resolve any branch.
// it does NOT generate questions here — that's call 2's job.
function buildReadPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  const hasAnswers = Object.keys(priorAnswers).length > 0;

  return [
    "You are a VAT liability reader. Your only job is to read the evidence and report what you find.",
    "Do NOT generate questions. Do NOT speculate. Only report what the evidence says.",
    "",
    "Do this in order:",
    "",
    "1. Find the paragraph(s) that directly govern the supply described. Return their indices in governingParagraphs.",
    "",
    "2. Does the governing section branch into sub-categories with different VAT rates?",
    "   If NO branches exist, or the supply clearly falls into one branch: set status=ANSWER.",
    "   If branches exist and the supply could fall into more than one: go to step 3.",
    "",
    hasAnswers
      ? [
          "3. The user has already answered some clarifying questions:",
          `   ${JSON.stringify(priorAnswers)}`,
          "   Do these answers resolve which branch applies?",
          "   If YES: set status=ANSWER. Use the answered clarifiers to determine the branch.",
          "   If NO: set status=NEED_CLARIFICATION and describe the unresolved branch in unresolvedBranch.",
        ].join("\n")
      : "3. No clarifying answers yet. If branches exist and are unresolved: set status=NEED_CLARIFICATION and describe the branch in unresolvedBranch.",
    "",
    "If status=ANSWER: fill conclusion and reasoningBullets. Set unresolvedBranch=null.",
    "If status=NEED_CLARIFICATION: fill unresolvedBranch. Set conclusion=null and reasoningBullets=null.",
    "",
    `Supply: ${userText}`,
    hasAnswers ? `Answered clarifiers: ${JSON.stringify(priorAnswers)}` : "",
    "",
    "Evidence (index | source | text):",
    evidence
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ]
    .filter(Boolean)
    .join("\n");
}

// call 2: question generation. only runs if call 1 said NEED_CLARIFICATION.
// the unresolved branch description from call 1 is passed in so the model knows exactly what to ask about.
// every option must cite the paragraph that defines it — no invented categories.
function buildAskPrompt(
  userText: string,
  priorAsked: string[],
  unresolvedBranch: string,
  governingParagraphs: number[],
  evidence: EvidencePara[],
) {
  return [
    "You are a VAT clarification assistant. Generate exactly one question to resolve the branch point described below.",
    "",
    "Rules:",
    "- Options must be categories that literally appear in the evidence. Options must NOT be rates of VAT. Cite the paragraph that defines each one.",
    "- Do NOT invent categories from general knowledge.",
    "- Do NOT ask about anything that won't change the VAT rate (e.g. buyer's VAT recovery, bookkeeping).",
    "- Questions must ask about a factual characteristic of the supply that the user can observe themselves (e.g. is it hot or cold, is it sold on premises, does it contain alcohol).",
    "- Do NOT ask the user to make legal classifications or determine their own VAT status — that is this tool's job.",
    `- Do NOT use any of these question ids: ${JSON.stringify(priorAsked)}`,
    "",
    `Supply: ${userText}`,
    `Branch to resolve: ${unresolvedBranch}`,
    `Governing paragraphs: ${JSON.stringify(governingParagraphs)}`,
    "",
    "Relevant evidence (index | source | text):",
    evidence
      .filter((p) => governingParagraphs.includes(p.poolIndex))
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

// stall guard prompt: fires when call 1 still says NEED_CLARIFICATION but we've hit the question cap.
// asks for the best possible answer — conditional rules by branch are better than "insufficient evidence".
function buildForceAnswerPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  return [
    "You have already asked the maximum number of clarifying questions.",
    "Give the most specific VAT liability conclusion the evidence supports given what you know.",
    "If the branch is still unresolved, give the VAT rule for each possible branch rather than refusing.",
    "Do NOT say 'insufficient evidence' if you can give conditional rules instead.",
    "",
    `Supply: ${userText}`,
    `Answered clarifiers: ${JSON.stringify(priorAnswers)}`,
    "",
    "Evidence (index | source | text):",
    evidence
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = FlowRequestSchema.safeParse(raw);

  console.log("SERVER ← received flow payload", {
    answered: raw?.answered,
    stateAnswers: raw?.state?.answers,
    userText: raw?.userText,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userText = (parsed.data.userText ?? "").trim();
  const priorAnswers = parsed.data.state?.answers ?? {};
  const priorAsked = parsed.data.state?.asked ?? [];
  const priorBasePaths = parsed.data.state?.basePaths ?? [];
  const askedSet = new Set(priorAsked);

  // merge newly submitted answers into state before doing anything else
  for (const a of parsed.data.answered ?? []) priorAnswers[a.id] = a.value;

  // combine the original query and all answers into search terms for evidence scoring
  const queryTerms = Array.from(
    new Set(
      [userText, ...Object.values(priorAnswers).map(String)]
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
        .filter((w) => w.length >= 3),
    ),
  );

  const mergedQuery = [
    userText,
    ...Object.values(priorAnswers).map(String),
  ].join(" ");

  // notice selection is cached in state after the first round — no point re-running it
  const basePaths =
    priorBasePaths.length > 0
      ? priorBasePaths
      : await selectNotices(mergedQuery);

  const evidence = await buildEvidencePool(basePaths, queryTerms);

  const evidenceOut = evidence.map((e) => ({
    url: e.webUrl,
    basePath: e.basePath,
    paragraphIndex: e.poolIndex,
    docParagraphIndex: e.docParagraphIndex,
    snippet: e.text,
  }));

  const maxIdx = evidence.length;

  // call 1: read the evidence and decide whether we can answer or need to ask
  const read = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: ReadSchema,
    prompt: buildReadPrompt(userText, priorAnswers, evidence),
  });

  assertInRange(read.object.governingParagraphs, maxIdx);

  // call 1 says we can answer — no clarification needed
  if (
    read.object.status === "ANSWER" &&
    read.object.conclusion &&
    read.object.reasoningBullets
  ) {
    for (const b of read.object.reasoningBullets)
      assertInRange(b.cites, maxIdx);

    const citations = pickMinimalCitations(
      evidenceOut,
      read.object.reasoningBullets.flatMap((b) => b.cites),
      { maxTotal: 5, maxPerDoc: 2 },
    );

    const response: FlowResponse = {
      state: { answers: priorAnswers, asked: priorAsked, basePaths },
      questions: [],
      answer: {
        conclusion: read.object.conclusion,
        reasoning: read.object.reasoningBullets.map((b) => b.text),
      },
      evidencePool: evidenceOut as any,
      citations: citations as any,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  // call 1 says we need clarification — check if we've hit the question cap first
  const isStalled = priorAsked.length >= 2;

  if (isStalled) {
    // we've asked enough questions, force an answer with whatever we know
    const forced = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: ForceAnswerSchema,
      prompt: buildForceAnswerPrompt(userText, priorAnswers, evidence),
    });

    assertInRange(forced.object.citeParagraphs, maxIdx);
    for (const b of forced.object.bullets) assertInRange(b.cites, maxIdx);

    const citations = pickMinimalCitations(
      evidenceOut,
      forced.object.bullets.flatMap((b) => b.cites),
      { maxTotal: 5, maxPerDoc: 2 },
    );

    const response: FlowResponse = {
      state: { answers: priorAnswers, asked: priorAsked, basePaths },
      questions: [],
      answer: {
        conclusion: forced.object.conclusion,
        reasoning: forced.object.bullets.map((b) => b.text),
      },
      evidencePool: evidenceOut as any,
      citations: citations as any,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  // call 2: generate exactly one question about the unresolved branch call 1 identified
  const ask = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: AskSchema,
    prompt: buildAskPrompt(
      userText,
      priorAsked,
      read.object.unresolvedBranch ??
        "the relevant VAT category for this supply",
      read.object.governingParagraphs,
      evidence,
    ),
  });

  const q = ask.object.question;

  // validate and deduplicate — drop the question if it's already been asked
  assertInRange(q.citeParagraphs, maxIdx);
  assertInRange(
    q.options.map((o) => o.citeParagraph),
    maxIdx,
  );

  if (askedSet.has(q.id)) {
    // model generated a duplicate id despite being told not to — force an answer instead
    const forced = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: ForceAnswerSchema,
      prompt: buildForceAnswerPrompt(userText, priorAnswers, evidence),
    });

    assertInRange(forced.object.citeParagraphs, maxIdx);
    for (const b of forced.object.bullets) assertInRange(b.cites, maxIdx);

    const citations = pickMinimalCitations(
      evidenceOut,
      forced.object.bullets.flatMap((b) => b.cites),
      { maxTotal: 5, maxPerDoc: 2 },
    );

    const response: FlowResponse = {
      state: { answers: priorAnswers, asked: priorAsked, basePaths },
      questions: [],
      answer: {
        conclusion: forced.object.conclusion,
        reasoning: forced.object.bullets.map((b) => b.text),
      },
      evidencePool: evidenceOut as any,
      citations: citations as any,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  const nextAsked = [...priorAsked, q.id];

  const response: FlowResponse = {
    state: { answers: priorAnswers, asked: nextAsked, basePaths },
    questions: [q] as any,
    answer: null,
    evidencePool: evidenceOut as any,
    citations: [],
  };

  return NextResponse.json(FlowResponseSchema.parse(response));
}
