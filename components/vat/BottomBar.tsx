"use client";

import type { FlowResponse } from "@/lib/schemas/flow";

export function BottomBar({
  draft,
  setDraft,
  loading,
  latest,
  onSubmitInitial,
  onReset,
}: {
  draft: string;
  setDraft: (v: string) => void;
  loading: boolean;
  latest: FlowResponse | null;
  onSubmitInitial: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky bottom-0 bg-cream py-4">
      <div className="rounded-2xl border border-khgreen/12 bg-white p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-khgreen/12 px-4 py-3 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New query (press Enter)..."
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitInitial();
            }}
            disabled={loading}
          />
          <button
            className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
            onClick={onSubmitInitial}
            disabled={loading}
            type="button"
          >
            {loading ? "Working..." : "Search"}
          </button>
          <button
            className="rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
            onClick={onReset}
            disabled={loading}
            type="button"
          >
            Reset
          </button>
        </div>

        {latest && latest.questions.length && !latest.answer ? (
          <div className="mt-2 text-xs opacity-70">
            Clarifiers are active above. Submit them there to append the next
            node.
          </div>
        ) : null}
      </div>
    </div>
  );
}
