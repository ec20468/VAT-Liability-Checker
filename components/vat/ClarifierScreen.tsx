"use client";

import { useState, useEffect } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { MiniSphere } from "@/components/ui/MiniSphere";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  query: string;
  response: FlowResponse;
  onSubmitAnswer: (questionId: string, value: string) => void;
  onReset: () => void;
};

export function ClarifierScreen({
  query,
  response,
  onSubmitAnswer,
  onReset,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(id);
  }, []);

  const q = response.questions[0];

  function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    onSubmitAnswer(q.id, selected);
  }

  return (
    <div
      className="screen screen--fade"
      data-visible={visible ? "true" : "false"}
      data-submitting={submitting ? "true" : "false"}
    >
      <div className="cs-inner section">
        <div className="top-strip">
          <div className="orb">
            <div className="cs-orb-glow" />
            <MiniSphere color="#1d70b8" />
          </div>
          <div className="query-block">
            <p className="neu-eyebrow">Query</p>
            <p className="query-text">&ldquo;{query}&rdquo;</p>
          </div>
          <div className="status-pill">
            <div className="status-pill__dot" />
            <span className="status-pill__text">Clarification</span>
          </div>
        </div>

        <div className="section">
          <p className="neu-eyebrow">Clarification needed</p>
          <p className="cs-question-text">{q.questionText}</p>
          <p className="cs-reason">{q.reasoning}</p>
        </div>

        <div className="section">
          {q.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Button
                key={opt.value}
                variant={isSelected ? "default" : "neutral"}
                disabled={submitting}
                onClick={() => !submitting && setSelected(opt.value)}
                className="cs-option-btn"
              >
                <span className="cs-option-label">{opt.label}</span>
                {opt.description && (
                  <span className="cs-option-desc">{opt.description}</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="actions-row">
          <Button
            variant={selected && !submitting ? "default" : "neutral"}
            onClick={handleSubmit}
            disabled={!selected || submitting}
          >
            {submitting && <span className="spinner" />}
            {submitting ? "Analysing…" : "Continue →"}
          </Button>
          <Button variant="neutral" onClick={onReset}>
            ← Start over
          </Button>
        </div>
      </div>
    </div>
  );
}
