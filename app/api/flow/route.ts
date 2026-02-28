// route.ts — streaming VAT pipeline (NDJSON)
//
// This route streams newline-delimited JSON events so the UI can show progress while the model runs.
// Format (one JSON object per line):
//   { type: "progress", stage: string, detail?: string }
//   { type: "done", payload: FlowResponse }
//   { type: "error", message: string }
//
// Stage strings ("classifying", "fetching_notices", etc) are consumed by the loading UI.
// Keep stage names stable unless you update the frontend too.

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

// Types used inside this route only.
// EvidencePara = a paragraph we might cite, flattened into one pool with stable indices.
// ProgressEvent = the NDJSON “event” object we stream to the client.

type EvidencePara = {
  poolIndex: number;
  basePath: string;
  webUrl: string;
  docParagraphIndex: number;
  text: string;
};

type ProgressEvent =
  | { type: "progress"; stage: string; detail?: string }
  | { type: "done"; payload: FlowResponse }
  | { type: "error"; message: string };

// Streaming helper.
// Emits NDJSON lines: JSON.stringify(event) + "\n".
// Client should read the response stream and parse per line (not res.json()).

function createStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function emit(event: ProgressEvent) {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  }

  function close() {
    controller.close();
  }

  return { stream, emit, close };
}

// -------- Notice selection (cheap narrowing step) --------
// scoreTitle: crude keyword matching against notice titles.
// selectNotices:
//   1) ask model for 1–3 generic “supply descriptions” (worded like notice titles)
//   2) rank notices using those words
//   3) ask model to pick the minimum set of notices from the ranked candidate list
// Output = list of basePath strings (deduped, validated).

function scoreTitle(title: string, words: string[]) {
  const t = title.toLowerCase();
  return words.reduce((s, w) => (t.includes(w) ? s + 1 : s), 0);
}

async function selectNotices(
  userText: string,
  emit: (e: ProgressEvent) => void,
  maxPick = 5,
) {
  const index = await getVatNoticesIndex();

  // UI stage: model is classifying the query into a generic supply category.
  emit({
    type: "progress",
    stage: "classifying",
    detail: "Classifying your supply…",
  });

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

  // Tokenise the supply descriptions into words for title scoring.
  const words = Array.from(
    new Set(
      classified.object.supplyDescriptions
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    ),
  );

  // Rank all notices by crude title match score; then keep a candidate shortlist.
  const ranked = index
    .map((n) => ({ ...n, score: scoreTitle(n.title, words) }))
    .sort((a, b) => b.score - a.score);

  const candidates = ranked.slice(0, 30);

  // UI stage: selecting notices. The detail string is shown directly in the loader.
  emit({
    type: "progress",
    stage: "selecting_notices",
    detail: classified.object.isAmbiguous
      ? `Ambiguous supply — checking ${classified.object.supplyDescriptions.length} interpretations`
      : `Identified as: ${classified.object.supplyDescriptions[0]}`,
  });

  // Ask the model to pick the minimum basePaths from the candidate list.
  const PickSchema = z.object({ picks: z.array(z.string()).max(maxPick) });

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

  // Validate model output against the known index (prevents hallucinated basePaths).
  const allowed = new Set(index.map((i) => i.basePath));
  const valid = picked.object.picks.filter((p) => allowed.has(p));

  // Fallback: if model output is empty/invalid, use the top few ranked notices.
  return valid.length
    ? Array.from(new Set(valid))
    : ranked.slice(0, 3).map((r) => r.basePath);
}

// -------- Evidence scoring / pooling --------
// scoreParagraph: crude term matching + small boost for VAT treatment keywords.
// buildEvidencePool:
//   - fetch notice docs for chosen basePaths
//   - pick top paragraphs per doc
//   - then re-rank globally and cap total
// Output = EvidencePara[] with stable poolIndex (used as cite ids everywhere else).

function scoreParagraph(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) score += 1;
  }
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

function mergeColonParagraphs(paragraphs: { index: number; text: string }[]) {
  //ensure the model sees multi-line paragraphs as one chunk (e.g., a condition followed by its consequence)
  const merged: { index: number; text: string }[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const current = paragraphs[i];
    const trimmed = current.text.trimEnd();
    if (
      (trimmed.endsWith(":") || trimmed.endsWith("—")) &&
      i + 1 < paragraphs.length
    ) {
      merged.push({
        index: current.index,
        text: current.text + " " + paragraphs[i + 1].text,
      });
      i += 2;
    } else {
      merged.push(current);
      i += 1;
    }
  }
  return merged;
}

async function buildEvidencePool(
  basePaths: string[],
  queryTerms: string[],
  emit: (e: ProgressEvent) => void,
) {
  // UI stage: fetching notice docs
  emit({
    type: "progress",
    stage: "fetching_notices",
    detail: `Reading ${basePaths.length} VAT notice${basePaths.length > 1 ? "s" : ""}…`,
  });

  const docs = await Promise.all(basePaths.map(resolveGovUkDoc));

  // UI stage: scoring paragraphs
  emit({
    type: "progress",
    stage: "scoring_paragraphs",
    detail: "Scoring paragraphs for relevance…",
  });

  // Limits: cap per doc + cap total so the prompt stays bounded.
  const PER_DOC = 40;
  const MAX_TOTAL = 160;

  const candidates: Omit<EvidencePara, "poolIndex">[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    const top = mergeColonParagraphs(doc.paragraphs)
      .slice(0, 800)
      .map((p) => ({ p, s: scoreParagraph(p.text, queryTerms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_DOC);

    // Deduplicate paragraphs across docs by (basePath + paragraph index).
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

  // Global re-rank and assign poolIndex (this becomes the cite id).
  return candidates
    .map((e) => ({ e, s: scoreParagraph(e.text, queryTerms) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_TOTAL)
    .map((x) => x.e)
    .map((e, i) => ({ ...e, poolIndex: i }));
}

// -------- Citation safety helpers --------
// localWindow: build an allowed set around indices (prevents far-away/hallucinated blockers).
// filterLocal: keep only indices in the allowed set.
// assertInRange: hard guardrail so we never emit out-of-range cite indices.

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

function assertInRange(indices: number[], maxExclusive: number) {
  for (const n of indices) {
    if (!Number.isInteger(n) || n < 0 || n >= maxExclusive) {
      throw new Error(`Model produced out-of-range cite index: ${n}`);
    }
  }
}

// pickMinimalCitations: select a small set of citations from used indices.
// Caps total citations + caps per doc to keep the UI readable.

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

  // Dedup used indices while preserving first-seen order.
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

// computeNeedsReview: conservative flag for cases where the answer probably needs eyeballing.
// True when we only used the general guide (700) or we never cite a paragraph that explicitly states treatment words.

function computeNeedsReview(basePaths: string[], citedSnippets: string[]) {
  const onlyGeneralGuide = basePaths.every((p) =>
    p.includes("vat-guide-notice-700"),
  );
  const hasExplicitTreatment = citedSnippets.some(
    (s) =>
      s.includes("zero-rated") ||
      s.includes("standard-rated") ||
      s.includes("reduced rate") ||
      s.includes("exempt"),
  );
  return onlyGeneralGuide || !hasExplicitTreatment;
}

// buildSupplyContext: inject “fixed attributes” so the model treats prior answers as hard constraints.
// This is here to stop repeated questions and stop it from “assuming away” conditions.

function buildSupplyContext(
  userText: string,
  priorAnswers: Record<string, string>,
) {
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

// Zod schemas for model outputs.
// These schemas are the contract between the route and the model output.
// If you change them, also check prompts + frontend expectations.

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

const ReadSchema = z.object({
  status: z.enum(["ANSWER", "NEED_CLARIFICATION"]),
  supportCites: z.array(z.number().int().nonnegative()).min(1).max(3),
  blockerCites: z.array(z.number().int().nonnegative()).max(6),
  conclusion: z.string().nullable(),
  reasoningBullets: z
    .array(
      z.object({
        text: z.string().min(1),
        cites: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .nullable(),
  unresolvedBranch: z.string().nullable(),
});

const AskSchema = z.object({ question: QuestionSchema });

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

// Prompt builders.
// buildReadPrompt: model must either answer (with bullet cites) or return NEED_CLARIFICATION with a concrete unresolved fact.
// buildAskPrompt: generate exactly one question with options, each option tied to a cite.
// buildForceAnswerPrompt: used when we’ve hit the question limit; returns conditional rules instead of looping.

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
  const supplyContext = buildSupplyContext(userText, priorAnswers);

  // Build a local evidence slice around support + blocker cites to keep the ask prompt tight.
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
    "- Ask about an observable factual characteristic only — something the user can see, measure or verify.",
    "- FORBIDDEN: asking whether legal conditions or VAT concessions are 'met'.",
    "- FORBIDDEN: asking the user to make legal classifications of any kind.",
    "- FORBIDDEN: options that restate VAT outcomes (zero-rated, standard-rated, exempt, etc.).",
    "- Options must NOT be VAT rates.",
    "- BAD question: 'Does this meet zero-rated conditions?' — this is a legal classification.",
    "- GOOD question: 'Is the product sold at above room temperature?' — this is an observable fact.",
    "- Each option MUST cite the paragraph that defines the option/branch.",
    "- option.value MUST be a short stable token (e.g., YES/NO, HOT/NOT_HOT)",
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

// Route handler.
// Runs the pipeline async and streams ProgressEvents as each stage completes.

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = FlowRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { stream, emit, close } = createStream();

  (async () => {
    try {
      const userText = (parsed.data.userText ?? "").trim();
      const priorAnswers = parsed.data.state?.answers ?? {};
      const priorAsked = parsed.data.state?.asked ?? [];
      const priorBasePaths = parsed.data.state?.basePaths ?? [];
      const askedSet = new Set(priorAsked);

      // Merge newly answered values into the running state.
      for (const a of parsed.data.answered ?? []) priorAnswers[a.id] = a.value;

      // Query terms = user text + prior answers, tokenised for paragraph scoring.
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

      // Used for notice selection (includes prior answers to reduce ambiguity).
      const mergedQuery = [
        userText,
        ...Object.values(priorAnswers).map(String),
      ].join(" ");

      // Stage 1+2: select VAT notices (or re-use cached basePaths from state).
      const basePaths =
        priorBasePaths.length > 0
          ? priorBasePaths
          : await selectNotices(mergedQuery, emit);

      // Stage 3+4: fetch and rank evidence paragraphs into a single pool.
      const evidence = await buildEvidencePool(basePaths, queryTerms, emit);

      // Evidence output shape sent to frontend (includes stable paragraphIndex = poolIndex).
      const evidenceOut = evidence.map((e) => ({
        url: e.webUrl,
        basePath: e.basePath,
        paragraphIndex: e.poolIndex,
        docParagraphIndex: e.docParagraphIndex,
        snippet: e.text,
      }));

      const maxIdx = evidence.length;

      // Stage 5: “read” step — decide ANSWER vs NEED_CLARIFICATION.
      emit({
        type: "progress",
        stage: "analysing",
        detail: "Analysing evidence…",
      });

      const read = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: ReadSchema,
        prompt: buildReadPrompt(userText, priorAnswers, evidence),
      });

      // Guardrails: never allow out-of-range cites.
      assertInRange(read.object.supportCites, maxIdx);
      assertInRange(read.object.blockerCites ?? [], maxIdx);

      // Only allow blockers that are local to the supports (prevents random far-away blockers).
      const allowed = localWindow(read.object.supportCites, maxIdx, 2);
      const validBlockers = filterLocal(read.object.blockerCites, allowed);

      const canAsk =
        read.object.status === "NEED_CLARIFICATION" &&
        validBlockers.length > 0 &&
        !!read.object.unresolvedBranch;

      // Force-answer path (used when we can’t/shouldn’t ask more questions).
      async function emitForceAnswer() {
        emit({
          type: "progress",
          stage: "drafting",
          detail: "Drafting conditional answer…",
        });

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

        emit({ type: "done", payload: FlowResponseSchema.parse(response) });
      }

      // Direct answer path.
      if (
        read.object.status === "ANSWER" &&
        read.object.conclusion &&
        read.object.reasoningBullets
      ) {
        emit({
          type: "progress",
          stage: "drafting",
          detail: "Drafting answer…",
        });

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

        emit({ type: "done", payload: FlowResponseSchema.parse(response) });
        return;
      }

      // Stall guard: cap how many clarifying questions we allow.
      if (priorAsked.length >= 2) {
        await emitForceAnswer();
        return;
      }

      // If we can’t justify a local blocker, don’t ask — force answer instead.
      if (!canAsk) {
        await emitForceAnswer();
        return;
      }

      // Stage 6: generate a single clarifying question.
      emit({
        type: "progress",
        stage: "clarifying",
        detail: "Generating clarifying question…",
      });

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

      assertInRange(q.citeParagraphs, maxIdx);
      assertInRange(
        q.options.map((o) => o.citeParagraph),
        maxIdx,
      );

      // If the model repeats an id we already asked, bail out to force answer.
      if (askedSet.has(q.id)) {
        await emitForceAnswer();
        return;
      }

      const nextAsked = [...priorAsked, q.id];

      const response: FlowResponse = {
        state: { answers: priorAnswers, asked: nextAsked, basePaths },
        questions: [q] as any,
        answer: null,
        evidencePool: evidenceOut as any,
        citations: [],
        needsReview: false,
      };

      emit({ type: "done", payload: FlowResponseSchema.parse(response) });
    } catch (err: any) {
      emit({ type: "error", message: err?.message ?? "Unknown error" });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
