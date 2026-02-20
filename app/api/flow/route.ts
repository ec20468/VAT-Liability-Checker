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

type EvidencePara = {
  poolIndex: number; // index in the flattened evidence pool we send to the model
  basePath: string; // gov.uk basePath for the notice
  webUrl: string; // public URL for citations UI
  docParagraphIndex: number; // paragraph index inside that notice doc
  text: string; // paragraph text
};

//Select VAT notices to read
// Goal: pick a small set of notices that are actually relevant to the user's supply.
// do it in two stages because:
// - pure keyword search is cheap but dumb
// - model is smarter but needs a shortlist so it can’t wander

// Cheap relevance signal: how many query words appear in the notice title.
function scoreTitle(title: string, words: string[]) {
  const t = title.toLowerCase();
  return words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0);
}

// Two-stage notice selection:
// 1) model converts the user query into short “notice-title-like” supply descriptions
//    (and returns up to 3 if the query could mean different supplies)
// 2) do title overlap scoring to build a shortlist
// 3) model picks the minimum set of notices from the shortlist
//
// Reason: “bike” can mean a bicycle or a motorcycle and the VAT treatment can differ.
// I’d rather over-include a few candidate notices than silently commit to one meaning.
async function selectNotices(userText: string, maxPick = 5) {
  const index = await getVatNoticesIndex();

  // classify the supply into generic words that would plausibly appear in notice titles.
  const classified = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: z.object({
      supplyDescriptions: z.array(z.string()).min(1).max(3),
      isAmbiguous: z.boolean(),
    }),
    prompt: [
      "Describe the type of good or service being queried in 3-6 generic words per description that would appear in a UK VAT notice title.",
      "If the query is ambiguous and could refer to multiple supply types with different VAT treatments, return one description per interpretation (max 3).",
      "If unambiguous, return exactly one description.",
      "Focus on the supply category, not the brand or specific name.",
      "Examples:",
      "  'bike' → ['bicycle pedal cycle', 'motorcycle motor vehicle'], isAmbiguous: true",
      "  'Tesla Model 3' → ['passenger motor vehicle'], isAmbiguous: false",
      "  'GP appointment' → ['medical healthcare service'], isAmbiguous: false",
      "  'Deliveroo order' → ['takeaway food catering'], isAmbiguous: false",
      "",
      `Query: ${userText}`,
    ].join("\n"),
  });

  // build a union word-set across all interpretations (covers ambiguity safely).
  const words = Array.from(
    new Set(
      classified.object.supplyDescriptions
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    ),
  );

  // pre-rank and take a shortlist for the model to choose from.
  const ranked = index
    .map((n) => ({ ...n, score: scoreTitle(n.title, words) }))
    .sort((a, b) => b.score - a.score);

  const candidates = ranked.slice(0, 30);

  const PickSchema = z.object({ picks: z.array(z.string()).max(maxPick) });

  // Step 1d: model selects the minimum set from the shortlist.
  // Notice 700 is explicitly “last resort” so it doesn’t default to the general guide. - this is because the model kept defaulting to this one
  const picked = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: PickSchema,
    prompt: [
      "Pick the minimum set of VAT Notices needed to determine VAT liability for the query.",
      "- You may ONLY pick from the provided list.",
      "- Prefer specific notices over general ones.",
      "- Only pick the general VAT guide (notice 700) if no specific notice covers this supply type.",
      "- If the supply is ambiguous, pick notices for ALL plausible interpretations.",
      `- Return between 1 and ${maxPick} basePath strings.`,
      "",
      `Query: ${userText}`,
      `Supply descriptions: ${classified.object.supplyDescriptions.join(" | ")}`,
      `Ambiguous: ${classified.object.isAmbiguous}`,
      "",
      "Notices (title | basePath):",
      candidates.map((r) => `${r.title} | ${r.basePath}`).join("\n"),
    ].join("\n"),
  });

  // Guardrail: validate picks against the real index.
  // Models sometimes hallucinate a basePath even when told not to.
  const allowed = new Set(index.map((i) => i.basePath));
  const valid = picked.object.picks.filter((p) => allowed.has(p));

  // Fallback: if the model returns nothing usable, take the top overlap matches.
  return valid.length
    ? Array.from(new Set(valid))
    : ranked.slice(0, 3).map((r) => r.basePath);
}

// 2. Build an evidence pool
// Goal: keep context small enough to be reliable while still giving the model the paragraphs that actually say “zero-rated / exempt / standard-rated” etc etc

// Barebones scoring: term frequency + a small boost for explicit VAT treatment language.
// This is NOT “semantic search”. It’s just pruning.
function scoreParagraph(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) score += 1;
  }

  // Boost paragraphs that explicitly state a VAT treatment.
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

// Pull all selected notices, score paragraphs, and keep the best ones.
// The model does the real “reading” later — this step is jus about context budgeting.
async function buildEvidencePool(basePaths: string[], queryTerms: string[]) {
  const docs = await Promise.all(basePaths.map(resolveGovUkDoc));

  const PER_DOC = 40; // keep up to 40 paragraphs per notice
  const MAX_TOTAL = 160; // hard cap overall

  const candidates: Omit<EvidencePara, "poolIndex">[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    // Score paragraphs, drop score=0, keep top PER_DOC.
    // Slice(0, 800) is a practical limit so it don’t scan massive docs endlessly.
    const top = doc.paragraphs
      .slice(0, 800)
      .map((p) => ({ p, s: scoreParagraph(p.text, queryTerms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_DOC);

    // Deduplicate per (doc + paragraph index).
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

  // Re-rank globally and trim to MAX_TOTAL, then assign pool indices.
  return candidates
    .map((e) => ({ e, s: scoreParagraph(e.text, queryTerms) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_TOTAL)
    .map((x) => x.e)
    .map((e, i) => ({ ...e, poolIndex: i }));
}

// Citation helpers
// Goal: stop the model citing random indices and keep the citations panel readable.

// Build a local “allowed set” around the support paragraphs (±window).
// If a blocker cite isn’t near the support cite, treat it as suspicious.
function localWindow(indices: number[], maxExclusive: number, window = 1) {
  const s = new Set<number>();
  for (const idx of indices) {
    for (let j = idx - window; j <= idx + window; j++) {
      if (j >= 0 && j < maxExclusive) s.add(j);
    }
  }
  return s;
}

function filterLocal(indices: number[] | undefined, allowed: Set<number>) {
  if (!indices?.length) return [];
  return indices.filter((i) => allowed.has(i));
}

// Hard guardrail: if the model gives a cite index outside the evidence pool, fail loudly.
// Better to 500 than show a wrong source.
function assertInRange(indices: number[], maxExclusive: number) {
  for (const n of indices) {
    if (!Number.isInteger(n) || n < 0 || n >= maxExclusive) {
      throw new Error(`Model produced out-of-range cite index: ${n}`);
    }
  }
}

// Trim citations down to something a human can actually read.
// Also cap per-doc so one notice can’t dominate the thing.
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

  // Deduplicate while preserving order.
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
// Confidence. deterministic computation of whether the answer is likely to be incomplete
// Goal: the frontend needs a “this might be incomplete” signal without asking the model.

// needsReview flips on when retrieval probably failed / answer isn’t explicitly grounded.
// I only want to look confident when the citations actually contain rate language.
function computeNeedsReview(
  basePaths: string[],
  citedSnippets: string[],
): boolean {
  // If i only selected notice 700, odds are it missed a specific notice.
  const onlyGeneralGuide = basePaths.every((p) =>
    p.includes("vat-guide-notice-700"),
  );

  // If none of the cited paragraphs explicitly state a treatment, the answer is shaky.
  const hasExplicitTreatment = citedSnippets.some(
    (s) =>
      s.includes("zero-rated") ||
      s.includes("standard-rated") ||
      s.includes("reduced rate") ||
      s.includes("exempt"),
  );

  return onlyGeneralGuide || !hasExplicitTreatment;
}

// Schemas
// Goal: force the model into a tight shape so it can’t “vibe” the answer.

// Each option must cite the paragraph that defines it.
// This is the core fix for “invented categories” — if it can’t cite, it can’t offer it.
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

// Call 1 result: model reads evidence and decides whether it can answer now or needs one clarifier.
// Splitting “read/decide” from “ask” keeps the first call focused on evidence.
const ReadSchema = z.object({
  status: z.enum(["ANSWER", "NEED_CLARIFICATION"]),

  // always present
  supportCites: z.array(z.number().int().nonnegative()).min(1).max(3),

  // always present (empty array when not applicable)
  blockerCites: z.array(z.number().int().nonnegative()).max(6),

  // always present (null when not applicable)
  conclusion: z.string().nullable(),

  // always present (null when not applicable)
  reasoningBullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .nullable(),

  // always present (null when not applicable)
  unresolvedBranch: z.string().nullable(),
});

// Call 2 result: only if call 1 returns NEED_CLARIFICATION.
// Generates exactly one question that resolves the unresolved branch.
const AskSchema = z.object({
  question: QuestionSchema,
});

// Stall guard: if it hit s the question cap, force the most specific conditional answer possible.
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

// ─────────────────────────────────────────────────────────────────────────────
// Supply context builder
// Goal: treat answered clarifiers as facts so it dont keep repeating the same questions

function buildSupplyContext(
  userText: string,
  priorAnswers: Record<string, string>,
): string {
  const facts = Object.values(priorAnswers);
  if (facts.length === 0) return `ITEM TO CLASSIFY: ${userText}`;

  return [
    `ITEM TO CLASSIFY: ${userText}`,
    `FIXED ATTRIBUTES (MANDATORY CONSTRAINTS):`,
    ...facts.map((v) => `- ${v}`),
    "",
    "INSTRUCTIONS:",
    "1. You must treat FIXED ATTRIBUTES as absolute truth.",
    "2. If a legal branch in a VAT notice is resolved by an attribute (e.g., if 'Cold food' is confirmed, you must skip the 'Hot food' rules), you are FORBIDDEN from asking about it again.",
    "3. Do not ask the user to choose legal labels like 'Catering' or 'Excepted Item'. Ask for physical facts (e.g., 'Is it sold in a sealed bag?').",
  ].join("\n");
}

// Multi-step prompts
// Structure: Call 1 reads + decides. Call 2 asks exactly one question if needed.

function buildReadPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  const supplyContext = buildSupplyContext(userText, priorAnswers);

  return [
    "You are a Senior VAT Auditor. Your job is to find the legal VAT rate using ONLY the provided evidence.",
    "",
    "### THE STRICT CONDITIONALITY RULE",
    "VAT law is defined by exceptions. If a paragraph says 'X applies UNLESS/EXCEPT/PROVIDED THAT Y', you are BLOCKED from concluding X until Y is known.",
    "- If FIXED ATTRIBUTES already define Y, you must not ask again.",
    "- If Y is unknown and it would change the outcome, you must set status=NEED_CLARIFICATION.",
    "- NEVER assume a condition is absent just because it isn't mentioned.",
    "",
    "### HIERARCHY OF REVIEW",
    "1. EXEMPTION: Check evidence for exemption conditions.",
    "2. REDUCED RATE (5%): Check evidence for reduced-rate conditions.",
    "3. ZERO-RATE: Check evidence for zero-rate conditions and any disqualifying conditions.",
    "4. STANDARD-RATE: Conclude only if evidence supports it or other outcomes are not supported.",
    "",
    "### REQUIRED FIELDS (DO NOT OMIT KEYS)",
    "Return ALL keys every time, even if null/empty:",
    "- status",
    "- supportCites (1–3 integers)",
    "- blockerCites (array; [] if not applicable)",
    "- conclusion (string or null)",
    "- reasoningBullets (array or null)",
    "- unresolvedBranch (string or null)",
    "",
    "### MODE RULES (MUST FOLLOW)",
    "If status=ANSWER:",
    "- conclusion MUST be a non-empty string",
    "- reasoningBullets MUST be a non-empty array",
    "- blockerCites MUST be []",
    "- unresolvedBranch MUST be null",
    "",
    "If status=NEED_CLARIFICATION:",
    "- conclusion MUST be null",
    "- reasoningBullets MUST be null",
    "- blockerCites MUST be non-empty and must contain the paragraph(s) that state the blocking condition(s)",
    "- unresolvedBranch MUST be a concrete observable fact the user can answer (not a legal label)",
    "",
    "### CITATION DISCIPLINE",
    "- supportCites: 1–3 paragraph indices you are relying on for the path you are taking.",
    "- blockerCites: ONLY the paragraph indices that actually contain the blocking condition text.",
    "",
    supplyContext,
    "",
    "### EVIDENCE (index | source | text)",
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

function buildAskPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  priorAsked: string[],
  unresolvedBranch: string,
  supportCites: number[],
  blockerCites: number[],
  evidence: EvidencePara[],
) {
  // Call 2 needs to see the same supply facts, otherwise it will re-ask stuff we already know.
  const supplyContext = buildSupplyContext(userText, priorAnswers);

  // Only show evidnece around the actual support+blocker cites (+/-2).
  // keeps the question anchored to the precise blocking condition.
  const indices = new Set<number>([...supportCites, ...blockerCites]);
  for (const idx of Array.from(indices)) {
    for (let j = idx - 2; j <= idx + 2; j++) {
      if (j >= 0 && j < evidence.length) indices.add(j);
    }
  }

  const merged = Array.from(indices)
    .sort((a, b) => a - b)
    .map((i) => evidence[i]);

  return [
    "You are a VAT clarification assistant. Generate exactly one question to resolve the blocking condition described below.",
    "",
    "Rules:",
    "- Your question MUST resolve the blocking condition; do not ask unrelated checks.",
    "- Ask about an observable factual characteristic only.",
    "- Do NOT ask the user to make legal classifications.",
    "- Options must NOT be VAT rates.",
    "- Each option MUST cite the paragraph that defines the option/branch.",
    "- option.value MUST be a short stable token (e.g., YES/NO, HOT/NOT_HOT) so answers persist reliably.",
    `- Do NOT use any of these question ids: ${JSON.stringify(priorAsked)}`,
    "",
    supplyContext,
    "",
    `Blocking condition to resolve (factual): ${unresolvedBranch}`,
    "",
    "Evidence (local region only):",
    merged
      .map(
        (p) =>
          `[${p.poolIndex}] ${p.basePath} p${p.docParagraphIndex}: ${p.text}`,
      )
      .join("\n\n"),
    "",
    "Return JSON only.",
  ].join("\n");
}

// Fires when it hits the question cap.
//still want something useful: conditional rules by branch are better than refusing.
function buildForceAnswerPrompt(
  userText: string,
  priorAnswers: Record<string, string>,
  evidence: EvidencePara[],
) {
  const supplyContext = buildSupplyContext(userText, priorAnswers);

  return [
    "You have already asked the maximum number of clarifying questions.",
    "Give the most specific VAT liability conclusion the evidence supports given what you know.",
    "If the branch is still unresolved, give the VAT rule for each possible branch rather than refusing.",
    "Do NOT say 'insufficient evidence' if you can give conditional rules instead.",
    "",
    supplyContext,
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

// Route handler

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

  // State coming from the client (persisted between rounds).
  const priorAnswers = parsed.data.state?.answers ?? {};
  const priorAsked = parsed.data.state?.asked ?? [];
  const priorBasePaths = parsed.data.state?.basePaths ?? [];
  const askedSet = new Set(priorAsked);

  // Merge newly submitted answers into state *before* we do retrieval / prompting.
  for (const a of parsed.data.answered ?? []) priorAnswers[a.id] = a.value;

  // Query terms for paragraph scoring = original query + any fixed attributes we already collected.
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

  // Notice selection uses the “merged query” so earlier clarifiers influence retrieval.
  const mergedQuery = [
    userText,
    ...Object.values(priorAnswers).map(String),
  ].join(" ");

  // Notice selection is cached after round 1 (no reason to re-run it every time).
  const basePaths =
    priorBasePaths.length > 0
      ? priorBasePaths
      : await selectNotices(mergedQuery);

  // Evidence pool is rebuilt each round because the query terms can change as clarifiers come in.
  const evidence = await buildEvidencePool(basePaths, queryTerms);

  // Flattened evidence format for the frontend + citations UI.
  const evidenceOut = evidence.map((e) => ({
    url: e.webUrl,
    basePath: e.basePath,
    paragraphIndex: e.poolIndex,
    docParagraphIndex: e.docParagraphIndex,
    snippet: e.text,
  }));

  const maxIdx = evidence.length;

  // CALL 1: read + decide.
  // Either we get a grounded answer, or we get a single blocked branch we need to clarify.
  const read = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: ReadSchema,
    prompt: buildReadPrompt(userText, priorAnswers, evidence),
  });

  assertInRange(read.object.supportCites, maxIdx);
  assertInRange(read.object.blockerCites ?? [], maxIdx);

  // Clarification is only allowed if blocker cites are local to the support cites.
  // This stops the model from “inventing” a blocker from somewhere else in the pool.
  const allowed = localWindow(read.object.supportCites, maxIdx, 2);
  const validBlockers = filterLocal(read.object.blockerCites, allowed);

  const canAsk =
    read.object.status === "NEED_CLARIFICATION" &&
    validBlockers.length > 0 &&
    !!read.object.unresolvedBranch;

  // If call 1 says ANSWER, we return an answer + minimal citations.
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

    const needsReview = computeNeedsReview(
      basePaths,
      citations.map((c) => c.snippet),
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
      needsReview,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  // If we already asked enough questions, force the best conditional answer we can.
  const isStalled = priorAsked.length >= 2;

  if (isStalled) {
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

    const needsReview = computeNeedsReview(
      basePaths,
      citations.map((c) => c.snippet),
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
      needsReview,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  // If call 1 wants to clarify but can’t justify it locally, we forbid clarification and force an answer.
  if (!canAsk) {
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

    const needsReview = computeNeedsReview(
      basePaths,
      citations.map((c) => c.snippet),
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
      needsReview,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  // CALL 2: generate exactly one clarifying question grounded in the blocker region.
  const ask = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: AskSchema,
    prompt: buildAskPrompt(
      userText,
      priorAnswers,
      priorAsked,
      read.object.unresolvedBranch ?? "the blocking condition",
      read.object.supportCites,
      validBlockers,
      evidence,
    ),
  });

  const q = ask.object.question;

  // Validate citations: question and each option must cite real paragraphs in the pool.
  assertInRange(q.citeParagraphs, maxIdx);
  assertInRange(
    q.options.map((o) => o.citeParagraph),
    maxIdx,
  );

  // If the model reuses an id we already asked, force an answer instead (no loops).
  if (askedSet.has(q.id)) {
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

    const needsReview = computeNeedsReview(
      basePaths,
      citations.map((c) => c.snippet),
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
      needsReview,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  const nextAsked = [...priorAsked, q.id];

  // Question stage: no answer yet, so needsReview is false (only computed on answer payloads).
  const response: FlowResponse = {
    state: { answers: priorAnswers, asked: nextAsked, basePaths },
    questions: [q] as any,
    answer: null,
    evidencePool: evidenceOut as any,
    citations: [],
    needsReview: false,
  };

  return NextResponse.json(FlowResponseSchema.parse(response));
}
