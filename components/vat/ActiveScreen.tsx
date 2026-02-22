"use client";

import type { RefObject } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";

import { Bubble } from "@/components/vat/Bubble";
import { BottomBar } from "@/components/vat/BottomBar";
import { EvidenceNode } from "./nodes/EvidenceNode";
import { ClarifiersNode } from "./nodes/ClarifiersNode";
import { AnswerNode } from "@/components/vat/nodes/AnswerNode";
import type { AnsweredPair, RoundEntry } from "@/app/page";

type AnswersMap = Record<string, string>;

export function ActiveScreen({
  draft,
  setDraft,
  submittedQuery,
  rounds,
  latest,
  loading,
  error,
  showEvidence,
  setShowEvidence,
  pendingAnswers,
  setPendingAnswers,
  answeredChipsByRound,
  scrollRef,
  onSubmitInitial,
  onSubmitClarifiers,
  onReset,
}: {
  draft: string;
  setDraft: (v: string) => void;
  submittedQuery: string;
  rounds: RoundEntry[];
  latest: FlowResponse | null;
  loading: boolean;
  error: string | null;

  showEvidence: boolean;
  setShowEvidence: (updater: (v: boolean) => boolean) => void;

  pendingAnswers: AnswersMap;
  setPendingAnswers: (updater: (cur: AnswersMap) => AnswersMap) => void;

  answeredChipsByRound: Map<string, AnsweredPair[]>;
  scrollRef: RefObject<HTMLDivElement | null>;

  onSubmitInitial: () => void;
  onSubmitClarifiers: () => void;
  onReset: () => void;
}) {
  return (
    <main className="min-h-screen px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <div className="flex-1 py-6">
          <div className="space-y-5">
            <Bubble align="right">{submittedQuery}</Bubble>

            <div className="space-y-4">
              {rounds.map((r, roundIdx) => {
                const isLastRound = roundIdx === rounds.length - 1;

                const nodes: Array<
                  | { kind: "evidence" }
                  | { kind: "clarifiers" }
                  | { kind: "answer" }
                > = [];

                nodes.push({ kind: "evidence" });
                if (r.data.questions.length) nodes.push({ kind: "clarifiers" });
                if (r.data.answer) nodes.push({ kind: "answer" });

                const answeredChips = answeredChipsByRound.get(r.id) ?? [];

                return (
                  <div key={r.id} className="space-y-4">
                    {nodes.map((n, nodeIdx) => {
                      const isFirst = roundIdx === 0 && nodeIdx === 0;
                      const isLast =
                        roundIdx === rounds.length - 1 &&
                        nodeIdx === nodes.length - 1;

                      if (n.kind === "evidence") {
                        return (
                          <EvidenceNode
                            key={`${r.id}-evidence`}
                            roundId={r.id}
                            data={r.data}
                            isFirst={isFirst}
                            isLast={isLast}
                            showEvidence={showEvidence}
                            onToggleShowEvidence={() =>
                              setShowEvidence((v) => !v)
                            }
                          />
                        );
                      }

                      if (n.kind === "clarifiers") {
                        const isLatestInteractive =
                          isLastRound && !r.data.answer;

                        return (
                          <ClarifiersNode
                            key={`${r.id}-clarifiers`}
                            roundId={r.id}
                            data={r.data}
                            isFirst={isFirst}
                            isLast={isLast}
                            isLatestInteractive={isLatestInteractive}
                            loading={loading}
                            answeredChips={answeredChips}
                            pendingAnswers={pendingAnswers}
                            setPendingAnswers={setPendingAnswers}
                            onSubmitClarifiers={onSubmitClarifiers}
                          />
                        );
                      }

                      return (
                        <AnswerNode
                          key={`${r.id}-answer`}
                          roundId={r.id}
                          data={r.data}
                          isFirst={isFirst}
                          isLast={isLast}
                        />
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

        <BottomBar
          draft={draft}
          setDraft={setDraft}
          loading={loading}
          latest={latest}
          onSubmitInitial={onSubmitInitial}
          onReset={onReset}
        />
      </div>
    </main>
  );
}
