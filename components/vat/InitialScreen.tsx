"use client";

import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { NeuBadge, NeuButton } from "@/components/ui/NeuSurface";

const PLACEHOLDERS = [
  'e.g. "importing a car from Argentina"',
  'e.g. "hot takeaway food"',
  'e.g. "commercial property rental"',
  'e.g. "consultancy services for UK client"',
];

const CHIPS = [
  "Is children's clothing zero-rated or exempt?",
  "What rate applies to hot takeaway food?",
  "Is residential construction standard or zero-rated?",
];

export function InitialScreen({
  draft,
  setDraft,
  loading,
  error,
  onSubmitInitial,
}: {
  draft: string;
  setDraft: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmitInitial: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phIdx, setPhIdx] = useState(0);

  // Cycle placeholder when the field is empty
  useEffect(() => {
    if (draft) return;
    const id = setInterval(
      () => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3000,
    );
    return () => clearInterval(id);
  }, [draft]);

  const submit = () => {
    if (!loading && draft.trim()) onSubmitInitial();
  };

  return (
    <div className="neu-page">
      <Header />

      <main className="initial-screen">
        <div className="initial-hero">
          <p className="neu-eyebrow">VAT Liability Classification</p>
          <h1 className="initial-h1">
            Is your supply <span className="accent">taxable</span> —
            <br />
            and at what rate?
          </h1>
          <p className="initial-subtitle">
            Describe a good or service. We&apos;ll ask clarifiers only when they
            would change the VAT result.
          </p>
        </div>

        <div className="initial-input-wrap">
          <label htmlFor="supply-input" className="neu-label">
            Describe the supply
          </label>

          <div className="neu-input-shell">
            <input
              ref={inputRef}
              id="supply-input"
              className="neu-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={PLACEHOLDERS[phIdx]}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="neu-icon-btn"
              onClick={submit}
              disabled={loading || !draft.trim()}
              aria-label="Submit"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="8" x2="13" y2="8" />
                <polyline points="9 4 13 8 9 12" />
              </svg>
            </button>
          </div>

          <div className="initial-meta">
            <span className="neu-hint hint-desktop">
              Press Enter to send · Shift+Enter for new line
            </span>
            <span className="neu-hint hint-mobile">Press Enter to send</span>
            <NeuBadge>Not legal advice</NeuBadge>
          </div>
        </div>
        <div className="initial-chips">
          {CHIPS.map((c) => (
            <NeuButton
              key={c}
              disabled={loading}
              onClick={() => {
                setDraft(c);
                inputRef.current?.focus();
              }}
            >
              {c}
            </NeuButton>
          ))}
        </div>

        <div className="initial-status" aria-live="polite">
          {loading && (
            <div className="initial-loading anim-pulse">
              <div className="initial-dot" />
              Analyzing...
            </div>
          )}
          {error && !loading && (
            <div className="initial-error" role="alert">
              <p>{error}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer"></footer>
    </div>
  );
}
