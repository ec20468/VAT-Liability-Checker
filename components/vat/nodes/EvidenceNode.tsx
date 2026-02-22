"use client";

import type { FlowResponse } from "@/lib/schemas/flow";
import { NodeShell } from "@/components/vat/NodeShell";

export function EvidenceNode({
  roundId,
  data,
  isFirst,
  isLast,
  showEvidence,
  onToggleShowEvidence,
}: {
  roundId: string;
  data: FlowResponse;
  isFirst: boolean;
  isLast: boolean;
  showEvidence: boolean;
  onToggleShowEvidence: () => void;
}) {
  const uniqueDocs = Array.from(
    new Set(data.evidencePool.map((e) => e.basePath)),
  );

  return (
    <NodeShell title="Evidence selected" isFirst={isFirst} isLast={isLast}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm opacity-80">
          {uniqueDocs.length} notice(s), {data.evidencePool.length} paragraph(s)
        </div>
        <button
          className="rounded-xl border border-khgreen/12 px-3 py-1.5 text-xs"
          type="button"
          onClick={onToggleShowEvidence}
        >
          {showEvidence ? "Hide" : "Show"}
        </button>
      </div>

      {showEvidence ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {uniqueDocs.map((bp) => (
              <span
                key={`${roundId}-doc-${bp}`}
                className="rounded-full border border-khgreen/12 bg-cream px-3 py-1 text-xs"
              >
                {bp}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-khgreen/12 p-3">
            <div className="text-xs font-medium opacity-80">Paragraphs</div>
            <ul className="mt-2 space-y-2 text-sm">
              {data.evidencePool.map((e, i) => {
                const label =
                  e.docParagraphIndex !== undefined
                    ? `${e.basePath} (p${e.docParagraphIndex})`
                    : e.basePath;

                return (
                  <li key={`${roundId}-pool-${i}`} className="space-y-1">
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
        </div>
      ) : null}
    </NodeShell>
  );
}
