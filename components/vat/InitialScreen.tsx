"use client";

import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VATInput from "../ui/VATInput";

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
            What rate is your <span className="accent">taxable</span>
            <br />
            supply?
          </h1>
        </div>
        <br />
        <br />

        <div className="initial-input-wrap">
          <label htmlFor="supply-input" className="neu-label">
            Describe the supply
          </label>

          <VATInput
            value={draft}
            onChange={setDraft}
            onSubmit={onSubmitInitial}
            placeholder={PLACEHOLDERS[phIdx]}
            disabled={loading}
            inputRef={inputRef}
          />
          <div className="initial-meta">
            <span className="neu-hint hint-desktop">
              Press Enter to send · Shift+Enter for new line
            </span>
            <span className="neu-hint hint-mobile">Press Enter to send</span>
            <Badge variant="neutral">Not legal advice</Badge>
          </div>
        </div>
        <div className="initial-chips">
          {CHIPS.map((c) => (
            <Button
              key={c}
              variant="neutral"
              onClick={() => {
                setDraft(c);
                inputRef.current?.focus();
              }}
            >
              {c}
            </Button>
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
