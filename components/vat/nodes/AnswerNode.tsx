"use client";

import type { FlowResponse } from "@/lib/schemas/flow";
import { NodeShell } from "@/components/vat/NodeShell";

export function AnswerNode({
  roundId,
  data,
  isFirst,
  isLast,
}: {
  roundId: string;
  data: FlowResponse;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <NodeShell title="Answer" isFirst={isFirst} isLast={isLast}>
      {data.answer ? (
        <>
          <div className="text-base font-semibold">
            {data.answer.conclusion}
          </div>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {data.answer.reasoning.map((line, i) => (
              <li key={`${roundId}-reason-${i}`}>{line}</li>
            ))}
          </ul>

          {data.citations.length ? (
            <div className="mt-4 rounded-2xl border border-khgreen/12 p-3">
              <div className="text-xs font-medium opacity-80">Citations</div>
              <ul className="mt-2 space-y-2 text-sm">
                {data.citations.map((c, i) => {
                  const label =
                    c.docParagraphIndex !== undefined
                      ? `${c.basePath} (p${c.docParagraphIndex})`
                      : c.basePath;

                  return (
                    <li key={`${roundId}-cit-${i}`} className="space-y-1">
                      <a
                        className="underline"
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {label}
                      </a>
                      <div className="opacity-80">{c.snippet}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-sm opacity-80">No answer yet.</div>
      )}
    </NodeShell>
  );
}
