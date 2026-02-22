"use client";

import type { FlowResponse } from "@/lib/schemas/flow";
import { NodeShell } from "@/components/vat/NodeShell";
import type { AnsweredPair } from "@/app/page";

type AnswersMap = Record<string, string>;

export function ClarifiersNode({
  roundId,
  data,
  isFirst,
  isLast,
  isLatestInteractive,
  loading,
  answeredChips,
  pendingAnswers,
  setPendingAnswers,
  onSubmitClarifiers,
}: {
  roundId: string;
  data: FlowResponse;
  isFirst: boolean;
  isLast: boolean;
  isLatestInteractive: boolean;
  loading: boolean;
  answeredChips: AnsweredPair[];
  pendingAnswers: AnswersMap;
  setPendingAnswers: (updater: (cur: AnswersMap) => AnswersMap) => void;
  onSubmitClarifiers: () => void;
}) {
  return (
    <NodeShell title="Clarifier questions" isFirst={isFirst} isLast={isLast}>
      {answeredChips.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {answeredChips.map((a) => (
            <span
              key={`${roundId}-chip-${a.id}`}
              className="rounded-full border border-khgreen/12 bg-cream px-3 py-1 text-xs"
            >
              {a.label ?? a.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-5">
        {data.questions.map((q) => {
          const selected = isLatestInteractive
            ? (pendingAnswers[q.id] ?? "")
            : (data.state.answers[q.id] ?? "");

          return (
            <div key={`${roundId}-q-${q.id}`} className="space-y-2">
              <div className="text-sm font-medium">{q.questionText}</div>
              <div className="text-xs opacity-70">{q.reasoning}</div>

              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const active = selected === opt.value;

                  return (
                    <button
                      key={`${roundId}-q-${q.id}-opt-${opt.value}`}
                      type="button"
                      disabled={loading || !isLatestInteractive}
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
                        !isLatestInteractive ? "cursor-default" : "",
                      ].join(" ")}
                    >
                      <div className="font-medium">{opt.label}</div>
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
                      const e = data.evidencePool.find(
                        (p) => p.paragraphIndex === poolIdx,
                      );
                      if (!e) return null;

                      const label =
                        e.docParagraphIndex !== undefined
                          ? `${e.basePath} (p${e.docParagraphIndex})`
                          : e.basePath;

                      return (
                        <li
                          key={`${roundId}-q-${q.id}-pool-${poolIdx}`}
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
                          <div className="opacity-80">{e.snippet}</div>
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
            onClick={onSubmitClarifiers}
            type="button"
          >
            {loading ? "Working..." : "Submit clarifiers"}
          </button>
        </div>
      ) : null}
    </NodeShell>
  );
}
