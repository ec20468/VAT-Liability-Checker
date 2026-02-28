"use client";

import { useEffect, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";
import { Header } from "../ui/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniSphere } from "../ui/MiniSphere";

const RATE_LABELS: Record<"zero" | "reduced" | "standard" | "exempt", string> =
  {
    zero: "Zero-rated · 0%",
    reduced: "Reduced rate · 5%",
    standard: "Standard-rated · 20%",
    exempt: "Exempt",
  };

function extractRate(
  vatRate: "zero" | "reduced" | "standard" | "exempt" | null | undefined,
): { label: string; kind: "zero" | "reduced" | "standard" | "exempt" } | null {
  if (!vatRate) return null;
  return { label: RATE_LABELS[vatRate], kind: vatRate };
}

type Props = {
  query: string;
  response: FlowResponse;
  onReset: () => void;
};

export function AnswerScreen({ query, response, onReset }: Props) {
  const [expandedCite, setExpandedCite] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const answer = response.answer!;
  const rate = extractRate(answer.vatRate);

  return (
    <div className="neu-page">
      <Header onReset={onReset} />

      <main
        className="screen screen--top screen--fade"
        data-visible={visible ? "true" : "false"}
      >
        <div className="screen-body screen-body--narrow">
          <div className="section">
            {/* Top strip — orb + query + status */}
            <div className="top-strip">
              <div className="orb" aria-hidden="true">
                <MiniSphere color="#4caf82" />
              </div>
              <div className="query-block">
                <div className="neu-label">Query</div>
                <p className="query-text">&ldquo;{query}&rdquo;</p>
              </div>
              <Badge variant="neutral">Complete</Badge>
            </div>

            {/* Conclusion */}
            <section className="section">
              <div className="as-badges">
                {rate && (
                  <Badge
                    variant="neutral"
                    className={`rate-badge--${rate.kind}`}
                  >
                    {rate.label}
                  </Badge>
                )}
                {response.needsReview && (
                  <Badge className="warn-badge">⚠ Verify with advisor</Badge>
                )}
              </div>
              <p className="as-conclusion-text">{answer.conclusion}</p>
            </section>

            {/* Reasoning */}
            <section className="section">
              <div className="neu-label">Reasoning</div>
              <div className="section">
                {answer.reasoning.map((bullet, i) => (
                  <div key={i} className="tl-row tl-row--animated">
                    <div className="tl-line tl-line--done" aria-hidden="true" />
                    <p className="as-reason-text">{bullet}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sources */}
            {response.citations.length > 0 && (
              <section className="section">
                <div className="neu-label">Sources</div>
                <div className="as-cites">
                  {response.citations.map((c, i) => {
                    const isOpen = expandedCite === i;
                    const label = c.basePath
                      .split("/")
                      .pop()
                      ?.replace(/-/g, " ");

                    return (
                      <Button
                        key={i}
                        variant="neutral"
                        data-active={isOpen ? "true" : "false"}
                        onClick={() => setExpandedCite(isOpen ? null : i)}
                        className="as-cite-btn"
                      >
                        <div className="as-cite-left">
                          <div className="as-cite-meta">
                            {label} · ¶{c.docParagraphIndex}
                          </div>
                          <div
                            className="as-cite-snippet"
                            data-open={isOpen ? "true" : "false"}
                          >
                            {c.snippet}
                          </div>
                        </div>
                        <span className="as-cite-chevron" aria-hidden="true">
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="actions-row">
              <Button variant="neutral" onClick={onReset}>
                ← New query
              </Button>
              <a
                className="as-link"
                href="https://www.gov.uk/government/collections/vat-notices-numerical-order"
                target="_blank"
                rel="noopener noreferrer"
              >
                ↗ GOV.UK VAT Notices
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
