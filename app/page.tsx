"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";

const SITE_PASSWORD = "vat2025"; // ← change this to your chosen password

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  function attempt() {
    if (value === SITE_PASSWORD) {
      onUnlock();
    } else {
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <main className="min-h-screen px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center">
        <div
          className="w-full space-y-3 rounded-2xl border border-khgreen/12 bg-white p-6"
          style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          <div className="text-center">
            <div className="text-xl font-semibold">VAT liability helper</div>
            <div className="mt-1 text-sm opacity-70">
              Enter the access password
            </div>
          </div>

          <input
            type="password"
            autoFocus
            className="w-full rounded-xl border border-khgreen/12 px-4 py-3 text-sm"
            placeholder="Password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") attempt();
            }}
          />

          <button
            className="w-full rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
            onClick={attempt}
            type="button"
          >
            Enter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </main>
  );
}

type AnswersMap = Record<string, string>;

type AnsweredPair = { id: string; value: string; label?: string };

type RoundEntry = {
  id: string;
  answered: AnsweredPair[];
  data: FlowResponse;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Bubble({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
          align === "right"
            ? "bg-khgreen/5 border-khgreen/15"
            : "bg-white border-khgreen/12",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function NodeShell({
  title,
  children,
  isFirst,
  isLast,
}: {
  title: string;
  children: React.ReactNode;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative pl-10">
      {!isLast ? (
        <div className="absolute left-[14px] top-7 h-full w-px bg-khgreen/15" />
      ) : null}

      <div className="absolute left-2 top-5 h-4 w-4 rounded-full border border-khgreen/20 bg-cream" />

      <div className="rounded-2xl border border-khgreen/12 bg-white p-4">
        <div className="text-xs font-medium opacity-80">{title}</div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  // ── ALL hooks must come before any conditional return ──────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<AnswersMap>({});
  const [showEvidence, setShowEvidence] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const latest = rounds[rounds.length - 1]?.data ?? null;
  const questions = latest?.questions ?? [];
  const isActive = submittedQuery !== null;

  const answeredChipsByRound = useMemo(() => {
    const map = new Map<string, AnsweredPair[]>();
    for (const r of rounds) map.set(r.id, r.answered);
    return map;
  }, [rounds]);

  useEffect(() => {
    if (!latest) return;
    const next: AnswersMap = {};
    for (const q of questions) {
      const existing = latest.state.answers[q.id];
      if (existing) next[q.id] = existing;
    }
    setPendingAnswers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.state?.asked?.length, questions.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [rounds.length, loading, error]);
  // ──────────────────────────────────────────────────────────────────────────

  // Password gate — safe to early-return here because all hooks are above
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  function startFresh() {
    setSubmittedQuery(null);
    setRounds([]);
    setPendingAnswers({});
    setError(null);
    setLoading(false);
    setShowEvidence(false);
  }

  async function callFlow(payload: unknown, answeredMeta: AnsweredPair[]) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          json
            ? JSON.stringify(json, null, 2)
            : `Request failed (${res.status}) with non-JSON response`,
        );
        return;
      }

      const data = json as FlowResponse;

      setRounds((cur) => [
        ...cur,
        {
          id: uid(),
          answered: answeredMeta,
          data,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submitInitial() {
    const q = draft.trim();
    if (!q) return;

    startFresh();
    setSubmittedQuery(q);
    callFlow({ userText: q }, []);
  }

  function submitClarifiers() {
    if (!latest || !submittedQuery) return;

    const answeredForThisRound: AnsweredPair[] = [];
    for (const q of questions) {
      const value = pendingAnswers[q.id];
      if (typeof value !== "string" || value.length === 0) continue;

      const opt = q.options.find((o) => o.value === value);
      answeredForThisRound.push({ id: q.id, value, label: opt?.label });
    }

    const answeredPayload = answeredForThisRound.map(({ id, value }) => ({
      id,
      value,
    }));

    callFlow(
      {
        userText: submittedQuery,
        answered: answeredPayload,
        state: latest.state,
      },
      answeredForThisRound,
    );
  }

  // INITIAL SCREEN
  if (!isActive) {
    return (
      <main className="min-h-screen px-6">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center">
          <div className="w-full space-y-3">
            <div className="text-center">
              <div className="text-xl font-semibold">VAT liability helper</div>
              <div className="mt-1 text-sm opacity-80">
                Enter a situation. Clarifiers only when needed.
              </div>
            </div>

            <div className="rounded-2xl border border-khgreen/12 bg-white p-4">
              <input
                className="w-full rounded-xl border border-khgreen/12 px-4 py-3 text-sm"
                placeholder='e.g. "book", "importing a car from Argentina", "cakes"'
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitInitial();
                }}
              />
              <div className="mt-3 flex justify-end">
                <button
                  className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
                  disabled={loading}
                  onClick={submitInitial}
                  type="button"
                >
                  {loading ? "Working..." : "Search"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-khgreen/12 bg-white p-4">
                <div className="text-sm font-medium">Error</div>
                <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
                  {error}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  // ACTIVE SCREEN
  return (
    <main className="min-h-screen px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <div className="flex-1 py-6">
          <div className="space-y-5">
            <Bubble align="right">{submittedQuery}</Bubble>

            <div className="space-y-4">
              {rounds.map((r, roundIdx) => {
                const isLastRound = roundIdx === rounds.length - 1;

                const uniqueDocs = Array.from(
                  new Set(r.data.evidencePool.map((e) => e.basePath)),
                );
                const answeredChips = answeredChipsByRound.get(r.id) ?? [];

                const nodes: Array<
                  | { kind: "evidence" }
                  | { kind: "clarifiers" }
                  | { kind: "answer" }
                > = [];

                nodes.push({ kind: "evidence" });
                if (r.data.questions.length) nodes.push({ kind: "clarifiers" });
                if (r.data.answer) nodes.push({ kind: "answer" });

                return (
                  <div key={r.id} className="space-y-4">
                    {nodes.map((n, nodeIdx) => {
                      const isFirst = roundIdx === 0 && nodeIdx === 0;
                      const isLast =
                        roundIdx === rounds.length - 1 &&
                        nodeIdx === nodes.length - 1;

                      if (n.kind === "evidence") {
                        return (
                          <NodeShell
                            key={`${r.id}-evidence`}
                            title="Evidence selected"
                            isFirst={isFirst}
                            isLast={isLast}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm opacity-80">
                                {uniqueDocs.length} notice(s),{" "}
                                {r.data.evidencePool.length} paragraph(s)
                              </div>
                              <button
                                className="rounded-xl border border-khgreen/12 px-3 py-1.5 text-xs"
                                type="button"
                                onClick={() => setShowEvidence((v) => !v)}
                              >
                                {showEvidence ? "Hide" : "Show"}
                              </button>
                            </div>

                            {showEvidence ? (
                              <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  {uniqueDocs.map((bp) => (
                                    <span
                                      key={bp}
                                      className="rounded-full border border-khgreen/12 bg-cream px-3 py-1 text-xs"
                                    >
                                      {bp}
                                    </span>
                                  ))}
                                </div>

                                <div className="rounded-2xl border border-khgreen/12 p-3">
                                  <div className="text-xs font-medium opacity-80">
                                    Paragraphs
                                  </div>
                                  <ul className="mt-2 space-y-2 text-sm">
                                    {r.data.evidencePool.map((e, i) => {
                                      const label =
                                        e.docParagraphIndex !== undefined
                                          ? `${e.basePath} (p${e.docParagraphIndex})`
                                          : e.basePath;

                                      return (
                                        <li
                                          key={`${r.id}-pool-${i}`}
                                          className="space-y-1"
                                        >
                                          <a
                                            className="underline"
                                            href={e.url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {label}
                                          </a>
                                          <div className="opacity-80">
                                            {e.snippet}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>
                            ) : null}
                          </NodeShell>
                        );
                      }

                      if (n.kind === "clarifiers") {
                        const isLatestInteractive =
                          isLastRound && !r.data.answer;

                        return (
                          <NodeShell
                            key={`${r.id}-clarifiers`}
                            title="Clarifier questions"
                            isFirst={isFirst}
                            isLast={isLast}
                          >
                            {answeredChips.length ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {answeredChips.map((a) => (
                                  <span
                                    key={`${r.id}-chip-${a.id}`}
                                    className="rounded-full border border-khgreen/12 bg-cream px-3 py-1 text-xs"
                                  >
                                    {a.label ?? a.value}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="space-y-5">
                              {r.data.questions.map((q) => {
                                const selected = isLatestInteractive
                                  ? (pendingAnswers[q.id] ?? "")
                                  : (r.data.state.answers[q.id] ?? "");

                                return (
                                  <div
                                    key={`${r.id}-q-${q.id}`}
                                    className="space-y-2"
                                  >
                                    <div className="text-sm font-medium">
                                      {q.questionText}
                                    </div>
                                    <div className="text-xs opacity-70">
                                      {q.reasoning}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      {q.options.map((opt) => {
                                        const active = selected === opt.value;
                                        return (
                                          <button
                                            key={`${r.id}-q-${q.id}-opt-${opt.value}`}
                                            type="button"
                                            disabled={
                                              loading || !isLatestInteractive
                                            }
                                            onClick={() => {
                                              if (!isLatestInteractive) return;
                                              setPendingAnswers((cur) => ({
                                                ...cur,
                                                [q.id]: opt.value,
                                              }));
                                            }}
                                            className={[
                                              "rounded-2xl border px-3 py-2 text-left text-sm",
                                              "border-khgreen/12",
                                              active
                                                ? "bg-khgreen/5"
                                                : "bg-white opacity-80 hover:opacity-100",
                                              !isLatestInteractive
                                                ? "cursor-default"
                                                : "",
                                            ].join(" ")}
                                          >
                                            <div className="font-medium">
                                              {opt.label}
                                            </div>
                                            {opt.description ? (
                                              <div className="mt-1 text-xs opacity-70">
                                                {opt.description}
                                              </div>
                                            ) : null}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {q.citeParagraphs.length ? (
                                      <div className="rounded-2xl border border-khgreen/12 p-3">
                                        <div className="text-xs font-medium opacity-80">
                                          Why this matters (sources)
                                        </div>
                                        <ul className="mt-2 space-y-2 text-sm">
                                          {q.citeParagraphs.map((poolIdx) => {
                                            const e = r.data.evidencePool.find(
                                              (p) =>
                                                p.paragraphIndex === poolIdx,
                                            );
                                            if (!e) return null;

                                            const label =
                                              e.docParagraphIndex !== undefined
                                                ? `${e.basePath} (p${e.docParagraphIndex})`
                                                : e.basePath;

                                            return (
                                              <li
                                                key={`${r.id}-q-${q.id}-pool-${poolIdx}`}
                                                className="space-y-1"
                                              >
                                                <a
                                                  className="underline"
                                                  href={e.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                >
                                                  {label}
                                                </a>
                                                <div className="opacity-80">
                                                  {e.snippet}
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>

                            {isLatestInteractive ? (
                              <div className="mt-4 flex justify-end">
                                <button
                                  className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
                                  disabled={loading}
                                  onClick={submitClarifiers}
                                  type="button"
                                >
                                  {loading ? "Working..." : "Submit clarifiers"}
                                </button>
                              </div>
                            ) : null}
                          </NodeShell>
                        );
                      }

                      // answer
                      return (
                        <NodeShell
                          key={`${r.id}-answer`}
                          title="Answer"
                          isFirst={isFirst}
                          isLast={isLast}
                        >
                          {r.data.answer ? (
                            <>
                              <div className="text-base font-semibold">
                                {r.data.answer.conclusion}
                              </div>

                              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                                {r.data.answer.reasoning.map((line, i) => (
                                  <li key={`${r.id}-reason-${i}`}>{line}</li>
                                ))}
                              </ul>

                              {r.data.citations.length ? (
                                <div className="mt-4 rounded-2xl border border-khgreen/12 p-3">
                                  <div className="text-xs font-medium opacity-80">
                                    Citations
                                  </div>
                                  <ul className="mt-2 space-y-2 text-sm">
                                    {r.data.citations.map((c, i) => {
                                      const label =
                                        c.docParagraphIndex !== undefined
                                          ? `${c.basePath} (p${c.docParagraphIndex})`
                                          : c.basePath;

                                      return (
                                        <li
                                          key={`${r.id}-cit-${i}`}
                                          className="space-y-1"
                                        >
                                          <a
                                            className="underline"
                                            href={c.url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {label}
                                          </a>
                                          <div className="opacity-80">
                                            {c.snippet}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="text-sm opacity-80">
                              No answer yet.
                            </div>
                          )}
                        </NodeShell>
                      );
                    })}
                  </div>
                );
              })}

              {error ? (
                <div className="relative pl-10">
                  <div className="absolute left-[14px] top-7 h-full w-px bg-khgreen/15" />
                  <div className="absolute left-2 top-5 h-4 w-4 rounded-full border border-khgreen/20 bg-cream" />
                  <div className="rounded-2xl border border-khgreen/12 bg-white p-4">
                    <div className="text-xs font-medium opacity-80">Error</div>
                    <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
                      {error}
                    </pre>
                  </div>
                </div>
              ) : null}

              <div ref={scrollRef} />
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="sticky bottom-0 bg-cream py-4">
          <div className="rounded-2xl border border-khgreen/12 bg-white p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-khgreen/12 px-4 py-3 text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="New query (press Enter)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitInitial();
                }}
                disabled={loading}
              />
              <button
                className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
                onClick={submitInitial}
                disabled={loading}
                type="button"
              >
                {loading ? "Working..." : "Search"}
              </button>
              <button
                className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
                onClick={startFresh}
                disabled={loading}
                type="button"
              >
                Reset
              </button>
            </div>

            {latest && latest.questions.length && !latest.answer ? (
              <div className="mt-2 text-xs opacity-70">
                Clarifiers are active above. Submit them there to append the
                next node.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
