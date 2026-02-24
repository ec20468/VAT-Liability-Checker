"use client";

import { useMemo } from "react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

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
  const placeholders = useMemo(
    () => [
      'e.g. "importing a car from Argentina"',
      'e.g. "hot takeaway food"',
      'e.g. "commercial property rental"',
      'e.g. "consultancy services for UK client"',
    ],
    [],
  );

  const chips = useMemo(
    () => [
      "Is children's clothing zero-rated or exempt?",
      "What rate applies to hot takeaway food?",
      "Is residential construction standard or zero-rated?",
    ],
    [],
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    onSubmitInitial();
  };

  return (
    <main className="min-h-dvh flex flex-col relative overflow-hidden bg-black">
      <style jsx global>{`
        :root {
          --findvat-border: #252828;
          --findvat-border-mid: #313535;
          --findvat-accent: #1d70b8;
          --findvat-text-mid: #b1b4b6;
          --findvat-text-dim: #6f777b;
        }

        .findvat-noise::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.55;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="findvat-noise absolute inset-0" />

      {/* HEADER: Explicit Grid for perfect vertical centering */}
      <header
        className="relative z-20 w-full h-[64px] border-b grid grid-cols-2 px-4 md:px-8 items-center"
        style={{
          borderColor: "var(--findvat-border)",
          backgroundColor: "rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="uppercase font-bold leading-none"
            style={{
              color: "var(--findvat-accent)",
              letterSpacing: "0.1em",
              fontSize: "20px",
            }}
          >
            FindVAT
          </span>
          <div className="hidden md:flex items-center gap-3">
            <div
              style={{
                width: 1,
                height: 16,
                background: "var(--findvat-border-mid)",
              }}
            />
            <span className="uppercase text-[10px] text-[var(--findvat-text-dim)] tracking-widest">
              VAT Liability Advisor
            </span>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4caf82] shadow-[0_0_8px_#4caf82]" />
            <span className="uppercase text-[9px] text-[var(--findvat-text-dim)] tracking-widest">
              System Live
            </span>
          </div>
          <div
            className="border px-2 py-1 uppercase text-[9px] text-[var(--findvat-text-dim)] tracking-tighter"
            style={{ borderColor: "var(--findvat-border)" }}
          >
            UK · 2025/26
          </div>
        </div>
      </header>

      {/* MAIN CONTENT: Added padding-top to prevent "VAT Liability Classification" from hitting the header */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <div className="w-full max-w-[640px] flex flex-col items-center gap-8 md:gap-12">
          <div className="text-center flex flex-col gap-4">
            <p
              className="uppercase font-medium tracking-[0.3em] text-[var(--findvat-accent)]"
              style={{ fontSize: "10px" }}
            >
              VAT Liability Classification
            </p>

            <h1 className="text-white font-semibold tracking-tight leading-[1.1] text-4xl md:text-6xl">
              Is your supply{" "}
              <span className="text-[var(--findvat-accent)]">taxable</span>?
            </h1>

            <p className="text-[var(--findvat-text-mid)] text-sm md:text-base max-w-[480px] mx-auto leading-relaxed">
              Describe a good or service. We&apos;ll ask clarifiers only when
              they would change the VAT result.
            </p>
          </div>

          {/* CHIPS: Vertical stack for Mobile to match your screenshot, Grid for Desktop */}
          <div className="w-full flex flex-col md:flex-row md:flex-wrap md:justify-center gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft(c)}
                className="w-full md:w-auto text-left border px-4 py-3 text-[var(--findvat-text-mid)] text-xs transition-colors hover:border-[var(--findvat-accent)]"
                style={{
                  borderColor: "var(--findvat-border-mid)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="uppercase text-[9px] tracking-widest text-[var(--findvat-text-dim)]">
              Describe the supply
            </label>
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              value={draft}
              onValueChange={setDraft}
              onSubmit={handleSubmit}
              disabled={loading}
            />
            <div className="flex justify-between items-center text-[9px] text-[var(--findvat-text-dim)] tracking-wide pt-1">
              <span className="hidden sm:inline">
                Press Enter to send · Shift+Enter for new line
              </span>
              <span className="sm:hidden">Press Enter to send</span>
              <span className="border px-1.5 py-0.5 border-[var(--findvat-border)] uppercase">
                Not legal advice
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer
        className="relative z-10 py-6 border-t flex justify-center items-center"
        style={{ borderColor: "var(--findvat-border)" }}
      >
        <p className="uppercase text-[9px] tracking-[0.4em] text-white/20 font-bold">
          VAT Engine v5.2 · UK Statutory Guidance 2026
        </p>
      </footer>
    </main>
  );
}
