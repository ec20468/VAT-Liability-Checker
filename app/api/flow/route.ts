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
      ranked.map((r) => `${r.title} | ${r.basePath}`).join("\n"),
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

async function buildEvidencePool(basePaths: string[], queryTerms: string[]) {
  const docs = await Promise.all(basePaths.map(resolveGovUkDoc)); //resolveGovUkDoc resolves a basePath to the full doc content and metadata.

  const out: EvidencePara[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    const paras = doc.paragraphs.slice(0, 400); //safety cap on number of paragraphs to consider from each doc
    for (const p of paras) {
      const key = `${doc.basePath}:${p.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        // append to out: the evidence pool we will show the model, with the pool index, doc metadata, and paragraph text.
        poolIndex: out.length,
        basePath: doc.basePath,
        webUrl: doc.webUrl,
        docParagraphIndex: p.index,
        text: p.text,
      });
    }
  }

  return out;
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

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userText = (parsed.data.userText ?? "").trim(); //initialise state
  const priorAnswers = parsed.data.state?.answers ?? {};
  const priorAsked = parsed.data.state?.asked ?? [];
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

  const basePaths = await selectNotices(userText); //build the evidence pool based on the user query and the model's picks.
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
      "Determine UK VAT LIABILITY using ONLY the provided evidence paragraphs from GOV.UK VAT Notices.",
      "",
      "Hard rules:",
      "- Prefer ANSWER over NEED_INFO whenever the evidence supports a defensible conclusion.",
      `- If you must ask questions, ask the MINIMUM required (max ${MAX_QUESTIONS}).`,
      "- Only ask a question if its answer would change the VAT liability outcome.",
      "- Do NOT ask any question whose id appears in Previously asked ids.",
      "- Do NOT ask any question whose id already exists in Answered clarifiers.",
      "- Each question must cite evidence paragraphs that show why that fact matters.",
      "- Each answer bullet must cite evidence paragraphs.",
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
    result.object.status === "NEED_INFO" && questions.length === 0;

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
      state: { answers: priorAnswers, asked: priorAsked },
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
    state: { answers: priorAnswers, asked: nextAsked },
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
