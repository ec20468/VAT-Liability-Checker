"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "@/components/ui/Header";
import { MolecularSphere } from "@/components/ui/Sphere";
import { Badge } from "@/components/ui/badge";

const STAGE_META: Record<string, string> = {
  classifying: "Classifying supply",
  selecting_notices: "Selecting VAT notices",
  fetching_notices: "Fetching legislation",
  scoring_paragraphs: "Scoring paragraphs",
  analysing: "Analysing evidence",
  drafting: "Drafting answer",
  clarifying: "Forming question",
};

const STAGE_ORDER = Object.keys(STAGE_META);

type StageRecord = {
  stage: string;
  detail?: string;
  completedAt?: number;
};

type Props = {
  request: {
    userText: string;
    answered?: { id: string; value: string }[];
    state?: FlowResponse["state"];
  };
  onDone: (response: FlowResponse) => void;
  onError: (message: string) => void;
};

export function LoadingScreen({ request, onDone, onError }: Props) {
  const startRef = useRef(Date.now());

  const [stages, setStages] = useState<StageRecord[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  // Stream the pipeline from /api/flow
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.body) {
        onError("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone || cancelled) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "progress") {
              setActive(event.stage);
              setStages((prev) => {
                // Mark the previous stage complete, then append the new one
                const next = prev.map((s) =>
                  s.completedAt == null ? { ...s, completedAt: Date.now() } : s,
                );
                if (!next.find((s) => s.stage === event.stage))
                  next.push({ stage: event.stage, detail: event.detail });
                return next;
              });
            }

            if (event.type === "done") {
              setStages((prev) =>
                prev.map((s) =>
                  s.completedAt == null ? { ...s, completedAt: Date.now() } : s,
                ),
              );
              setActive(null);
              setDone(true);
              setTimeout(() => onDone(event.payload), 600);
            }

            if (event.type === "error") onError(event.message);
          } catch {
            /* malformed line — skip */
          }
        }
      }
    }

    run().catch((e) => onError(e?.message ?? "Fetch failed"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the elapsed timer until done
  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setElapsed(Date.now() - startRef.current),
      100,
    );
    return () => clearInterval(id);
  }, [done]);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const completedCount = stages.filter((s) => s.completedAt != null).length;
  const pct = Math.round((completedCount / STAGE_ORDER.length) * 100);

  return (
    <>
      <Header />

      <div className="screen">
        {/* Sphere */}
        <div className="ls-sphere-wrap">
          <div
            className={`ls-sphere-glow ${done ? "ls-sphere-glow--done" : "ls-sphere-glow--active"}`}
          />
          <div className="ls-sphere-ring ls-sphere-ring--inner" />
          <div className="ls-sphere-ring ls-sphere-ring--outer" />

          <MolecularSphere done={done} />

          <div className="ls-progress">
            <div
              className="ls-progress-line"
              style={{ width: `${pct * 1.2}px` }}
            />
            <span className="ls-progress-label">
              {done ? "complete" : `${pct}%`}
            </span>
          </div>
        </div>

        {/* Body card */}
        <div className="screen-body screen-body--card screen-body--narrow">
          {/* Query */}
          <div className="ls-query">
            Query
            <p className="ls-query-text">&ldquo;{request.userText}&rdquo;</p>
          </div>

          {/* Pipeline */}
          <div className="section-hdr">
            <span className="ls-elapsed">{fmt(elapsed)}</span>
          </div>

          <div className="section">
            {done ? (
              <div className="tl-row">
                <div className="ls-stage-tile">
                  <div className="tl-dot tl-dot--done" />
                  <div className="ls-stage-name">Complete</div>
                </div>
              </div>
            ) : active ? (
              <div className="tl-row tl-row--animated">
                <div className="ls-stage-tile">
                  <div className="tl-dot tl-dot--active" />
                  <div className="ls-stage-text">
                    <div className="ls-stage-name">
                      {STAGE_META[active] ?? active}
                    </div>
                    <div className="ls-stage-detail">
                      {completedCount} of {STAGE_ORDER.length} steps
                    </div>
                  </div>
                  <span className="spinner" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
