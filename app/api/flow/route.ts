import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";

import { resolveGovUkDoc } from "@/lib/govuk/resolve";
import { getVatNoticesIndex } from "@/lib/govuk/vatNoticesIndex";
import {
  FlowRequestSchema,
  FlowResponseSchema,
  QuestionSchema,
  type FlowResponse,
} from "@/lib/schemas/flow";

type EvidencePara = {
  //represents a single paragraph of evidence from a GOV.UK doc
  poolIndex: number;
  basePath: string;
  webUrl: string;
  docParagraphIndex: number;
  text: string;
};

function scoreTitle(title: string, words: string[]) {
  //figure out how relevant a VAT Notice is to the user's query based on word overlap.
  const t = title.toLowerCase();
  return words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0);
}

async function selectNotices(userText: string, maxPick = 5) {
  //ranked list of notices in two steps: first, word overlap.

  const index = await getVatNoticesIndex(); //list of notices.
  const words = userText //user input text split into words, lowercased, and filtered to remove short/common words so that matching is more relevant.
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3); //the list needs to have more than three characters to be considered a meaningful match

  const ranked = index //simple ranking
    .map((n) => ({ ...n, score: scoreTitle(n.title, words) }))
    .sort((a, b) => b.score - a.score);

  const CANDIDATES = 30;
  const candidates = ranked.slice(0, CANDIDATES);

  const PickSchema = z.object({
    picks: z.array(z.string()).max(maxPick),
  });

  const picked = await generateObject({
    //second step of ranking: ask the model to pick the most relevant notices from the top of the ranked list, with a hard cap to avoid overwhelming it.
    model: "openai/gpt-4o-mini",
    schema: PickSchema,
    prompt: [
      "Pick the minimum set of VAT Notices needed to determine VAT liability for the query.",
      "Rules:",
      "- You may ONLY pick from the provided list.",
      "- Prefer specific notices over general ones.",
      `- Return between 1 and ${maxPick} basePath strings.`,
      "",
      `Query: ${userText}`,
      "",
      "Notices (title | basePath):",
      candidates.map((r) => `${r.title} | ${r.basePath}`).join("\n"),
      "",
      'Return JSON: {"picks":["/base/path", "..."]}',
    ].join("\n"),
  });

  const allowed = new Set(index.map((i) => i.basePath));
  const valid = picked.object.picks.filter((p) => allowed.has(p));

  return valid.length
    ? Array.from(new Set(valid))
    : ranked.slice(0, 3).map((r) => r.basePath); //fallback to top-ranked notices if model picks none or invalid ones.
}

function scoreParagraph(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) score += 1;
  }

  // small boost for VAT-liability language
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

async function buildEvidencePool(basePaths: string[], queryTerms: string[]) {
  const docs = await Promise.all(basePaths.map(resolveGovUkDoc));

  const PER_DOC = 40; // keep each doc tight
  const MAX_TOTAL = 160; // keep total context tight

  const candidates: Omit<EvidencePara, "poolIndex">[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    const paras = doc.paragraphs.slice(0, 800);

    const top = paras
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

  const trimmed = candidates
    .map((e) => ({ e, s: scoreParagraph(e.text, queryTerms) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_TOTAL)
    .map((x) => x.e);

  return trimmed.map((e, i) => ({ ...e, poolIndex: i }));
}

function assertInRange(indices: number[], maxExclusive: number) {
  //checks each cited number is a numberbetween 0 and the length of the evidence pool.
  for (const n of indices) {
    if (!Number.isInteger(n) || n < 0 || n >= maxExclusive) {
      throw new Error(`Model produced out-of-range cite index: ${n}`); //500 error.
    }
  }
}

function pickMinimalCitations(
  evidenceOut: Array<{
    url: string;
    basePath: string;
    paragraphIndex: number; // pool index
    docParagraphIndex: number;
    snippet: string;
  }>,
  usedIndices: number[],
  opts?: { maxTotal?: number; maxPerDoc?: number },
) {
  const maxTotal = opts?.maxTotal ?? 5; // total citations you return
  const maxPerDoc = opts?.maxPerDoc ?? 2; // avoid dumping many from one notice

  // Keep order of first appearance in usedIndices
  const uniqueUsed: number[] = [];
  const seen = new Set<number>();
  for (const i of usedIndices) {
    if (!seen.has(i)) {
      seen.add(i);
      uniqueUsed.push(i);
    }
  }

  // Map pool index -> evidence item
  const byIndex = new Map<number, (typeof evidenceOut)[number]>();
  for (const e of evidenceOut) byIndex.set(e.paragraphIndex, e);

  // Enforce per-doc cap, then total cap
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

export async function POST(req: Request) {
  //route handler
  const raw = await req.json().catch(() => null);
  const parsed = FlowRequestSchema.safeParse(raw);
  console.log("SERVER ← received flow payload", {
    answered: raw.answered,
    stateAnswers: raw.state?.answers,
    userText: raw.userText,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userText = (parsed.data.userText ?? "").trim(); //initialise state
  const priorAnswers = parsed.data.state?.answers ?? {};
  const priorAsked = parsed.data.state?.asked ?? [];
  const priorBasePaths = parsed.data.state?.basePaths ?? [];

  const askedSet = new Set(priorAsked);

  // apply newly answered clarifiers.
  const answered = parsed.data.answered ?? [];
  for (const a of answered) priorAnswers[a.id] = a.value;
  const queryTerms = Array.from(
    new Set(
      [userText, ...Object.values(priorAnswers).map((v) => String(v))]
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
        .filter((w) => w.length >= 3),
    ),
  );

  const mergedQuery = [
    userText,
    ...Object.values(priorAnswers).map((v) => String(v)),
  ].join(" ");

  const basePaths =
    priorBasePaths.length > 0
      ? priorBasePaths
      : await selectNotices(mergedQuery);

  //build the evidence pool based on the user query and the model's picks.
  const evidence = await buildEvidencePool(basePaths, queryTerms);

  const evidenceOut = evidence.map((e) => ({
    //the evidence pool we send to the client and show the model includes the metadata and text snippet for each paragraph.
    url: e.webUrl,
    basePath: e.basePath,
    paragraphIndex: e.poolIndex, // pool index
    docParagraphIndex: e.docParagraphIndex, // real doc paragraph index
    snippet: e.text,
  }));

  const MAX_QUESTIONS = 2; //cap to avoid overwhelming the user and encourage critical thinking

  const ModelSchema = z.object({
    //response schema for model. the model either provides an answer with evidence cites, or asks clarifying questions with evidence cites, but not both.
    status: z.enum(["ANSWER", "NEED_INFO"]),
    answer: z
      .object({
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
      })
      .nullable(),
    questions: z.array(QuestionSchema).max(3),
  });

  const result = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: ModelSchema,
    prompt: [
      "Task: Determine the VAT liability of the good/service itself (zero/reduced/standard/exempt/out of scope) for the described good/service, using ONLY the evidence provided.",
      "Do NOT determine VAT reclaim/input tax recovery for the buyer.",
      "",
      "Rules:",
      "- If the query is ambiguous in a way that could change the supply's VAT rate/category (e.g. 'bike' could mean bicycle vs motorbike), return NEED_INFO and ask the minimum clarifier(s) (max " +
        MAX_QUESTIONS +
        ").",
      "- Otherwise, return ANSWER if the evidence supports a conclusion; do not guess.",
      "- Only ask a question if the answer could change the supply's VAT rate/category. Do NOT ask questions only relevant to input tax recovery (business vs personal use, reclaiming VAT), VAT return process, or bookkeeping.",
      "- Answer options for each question must reflect distinctions that actually appear in the cited evidence paragraphs and would change the VAT liability conclusion. Do NOT invent categories from general knowledge.",
      "- Do NOT ask any question whose id appears in Previously asked ids or Answered clarifiers.",
      "- Every question and every bullet must cite evidence paragraph indices.",
      "- Your conclusion must be directly applicable to the good/service in the query, not a general statement of law.",
      "",
      `User query: ${userText}`,
      `Answered clarifiers: ${JSON.stringify(priorAnswers)}`,
      `Previously asked ids: ${JSON.stringify(priorAsked)}`,
      "",
      "Evidence (indexed):",
      evidence.map((p) => `[${p.poolIndex}] ${p.text}`).join("\n\n"),
      "",
      "Return JSON only.",
    ].join("\n"),
  });

  // validate cites
  const maxIdx = evidence.length;

  if (result.object.status === "ANSWER" && result.object.answer) {
    //citations are looked up by matching paragraphIndex. equivalent to array indexing, but using find rather than evidenceOut[i]. slower but robust
    assertInRange(result.object.answer.citeParagraphs, maxIdx);
    for (const b of result.object.answer.bullets)
      assertInRange(b.cites, maxIdx);
  }

  if (result.object.status === "NEED_INFO") {
    //if model asks questions, validate their citations too.
    for (const q of result.object.questions)
      assertInRange(q.citeParagraphs, maxIdx);
  }

  // suppress repeats (asked or answered), then cap AFTER filtering
  const rawQuestions =
    result.object.status === "NEED_INFO" ? result.object.questions : [];

  const filteredQuestions = rawQuestions.filter((q) => {
    if (askedSet.has(q.id)) return false;
    if (priorAnswers[q.id] !== undefined) return false;
    return true;
  });

  const questions = filteredQuestions.slice(0, MAX_QUESTIONS);
  const nextAsked = [...priorAsked, ...questions.map((q) => q.id)];

  // STALL GUARD: model says NEED_INFO but we have nothing new to ask
  const isStalled =
    result.object.status === "NEED_INFO" &&
    questions.length === 0 &&
    Object.keys(priorAnswers).length > 0;

  if (isStalled) {
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

    const forced = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: ForceAnswerSchema,
      prompt: [
        "You are not allowed to repeat questions.",
        "Either:",
        "A) Provide the best supported VAT liability conclusion from the evidence, OR",
        "B) State explicitly: 'Insufficient evidence in the provided VAT notices to determine liability for this query.'",
        "If B, your bullets must explain what is missing, citing evidence that shows the dependency exists.",
        "",
        `User query: ${userText}`,
        `Answered clarifiers: ${JSON.stringify(priorAnswers)}`,
        `Previously asked ids: ${JSON.stringify(priorAsked)}`,
        "",
        "Evidence (indexed):",
        evidence.map((p) => `[${p.poolIndex}] ${p.text}`).join("\n\n"),
        "",
        "Return JSON only.",
      ].join("\n"),
    });

    assertInRange(forced.object.citeParagraphs, maxIdx);
    for (const b of forced.object.bullets) assertInRange(b.cites, maxIdx);

    const citations = pickMinimalCitations(
      evidenceOut as any,
      forced.object.bullets.flatMap((b) => b.cites),
      { maxTotal: 5, maxPerDoc: 2 },
    ) as any;

    const response: FlowResponse = {
      state: { answers: priorAnswers, asked: priorAsked, basePaths },
      questions: [],
      answer: {
        conclusion: forced.object.conclusion,
        reasoning: forced.object.bullets.map((b) => b.text),
      },
      evidencePool: evidenceOut as any,
      citations,
    };

    return NextResponse.json(FlowResponseSchema.parse(response));
  }

  const citations =
    result.object.status === "ANSWER" && result.object.answer
      ? (pickMinimalCitations(
          evidenceOut as any,
          result.object.answer.bullets.flatMap((b) => b.cites),
          { maxTotal: 5, maxPerDoc: 2 },
        ) as any)
      : [];

  const response: FlowResponse = {
    state: { answers: priorAnswers, asked: nextAsked, basePaths },
    questions,
    answer:
      result.object.status === "ANSWER" && result.object.answer
        ? {
            conclusion: result.object.answer.conclusion,
            reasoning: result.object.answer.bullets.map((b) => b.text),
          }
        : null,
    evidencePool: evidenceOut as any,
    citations,
  };

  return NextResponse.json(FlowResponseSchema.parse(response));
}
