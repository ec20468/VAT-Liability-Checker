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
    <main className="min-h-dvh flex flex-col relative overflow-hidden">
      <style jsx global>{`
        :root {
          --findvat-border: #252828;
          --findvat-border-mid: #313535;
          --findvat-accent: #1d70b8;
          --findvat-accent-dim: #135896;
          --findvat-accent-glow: rgba(29, 112, 184, 0.1);
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

        /* Stop hover handlers from being the only styling change on touch devices */
        @media (hover: none) {
          .findvat-chip:hover {
            border-color: var(--findvat-border-mid) !important;
            background: rgba(21, 22, 22, 0.7) !important;
            color: var(--findvat-text-mid) !important;
          }
        }
      `}</style>

      <div className="findvat-noise absolute inset-0" />

      <header
        className="relative z-10 h-[58px] px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b"
        style={{ borderColor: "var(--findvat-border)" }}
      >
        <div className="flex items-baseline gap-2 sm:gap-[10px] min-w-0">
          <span
            className="uppercase font-semibold whitespace-nowrap"
            style={{
              color: "var(--findvat-accent)",
              letterSpacing: "0.12em",
              fontSize: 22,
            }}
          >
            FindVAT
          </span>

          <span
            aria-hidden="true"
            className="hidden sm:inline-block"
            style={{
              width: 1,
              height: 14,
              background: "var(--findvat-border-mid)",
              transform: "translateY(-2px)",
            }}
          />

          <span
            className="uppercase hidden sm:inline-block truncate"
            style={{
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.18em",
              fontSize: 10,
              fontWeight: 300,
            }}
          >
            VAT Liability Advisor
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <span
            className="hidden sm:inline-flex items-center gap-[7px] uppercase"
            style={{
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.12em",
              fontSize: 10,
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#4caf82",
                boxShadow: "0 0 6px rgba(76,175,130,0.5)",
              }}
            />
            System live
          </span>

          <span
            className="uppercase border px-2 sm:px-[10px] py-[4px]"
            style={{
              borderColor: "var(--findvat-border)",
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.1em",
              fontSize: 10,
            }}
          >
            UK VAT · 2025/26
          </span>
        </div>
      </header>

      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-[4vw]"
        style={{ paddingBottom: "12vh" }}
      >
        <div className="w-full flex flex-col items-center gap-6 sm:gap-10 max-w-[720px] lg:max-w-[60vw]">
          <div className="text-center flex flex-col gap-3 sm:gap-[1vw]">
            <p
              className="uppercase"
              style={{
                color: "var(--findvat-accent)",
                letterSpacing: "0.22em",
                fontSize: "clamp(9px, 2.8vw, 12px)",
              }}
            >
              VAT Liability Classification
            </p>

            <h1
              className="text-white font-medium tracking-tight leading-[1.05]"
              style={{
                fontSize: "clamp(26px, 7.2vw, 84px)",
              }}
            >
              What rate is your{" "}
              <span style={{ color: "var(--findvat-accent)" }}>taxable</span> —
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              supply?
            </h1>

            <p
              className="mx-auto leading-relaxed max-w-[44ch] sm:max-w-[60ch]"
              style={{
                color: "var(--findvat-text-mid)",
                fontSize: "clamp(13px, 3.8vw, 16px)",
              }}
            >
              Describe a good or service. We&apos;ll ask clarifiers only when
              they would change the VAT result.
            </p>
          </div>

          <div className="w-full flex flex-wrap justify-center gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                disabled={loading}
                onClick={() => setDraft(c)}
                className="findvat-chip text-left border px-3 sm:px-[14px] py-2 sm:py-[8px] transition w-full sm:w-auto"
                style={{
                  borderColor: "var(--findvat-border-mid)",
                  background: "rgba(21,22,22,0.70)",
                  color: "var(--findvat-text-mid)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  lineHeight: 1.4,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--findvat-accent-dim)";
                  e.currentTarget.style.background =
                    "var(--findvat-accent-glow)";
                  e.currentTarget.style.color = "var(--findvat-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--findvat-border-mid)";
                  e.currentTarget.style.background = "rgba(21,22,22,0.70)";
                  e.currentTarget.style.color = "var(--findvat-text-mid)";
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="w-full">
            <div
              className="uppercase mb-2"
              style={{
                color: "var(--findvat-text-dim)",
                letterSpacing: "0.16em",
                fontSize: "clamp(9px, 2.8vw, 11px)",
              }}
            >
              Describe the supply
            </div>

            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              value={draft}
              onValueChange={setDraft}
              onSubmit={handleSubmit}
              disabled={loading}
            />

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span
                style={{
                  color: "var(--findvat-text-dim)",
                  fontSize: "clamp(9px, 2.8vw, 11px)",
                  letterSpacing: "0.06em",
                }}
              >
                Press Enter to send · Shift+Enter for new line
              </span>

              <span
                className="border px-2 py-[2px] uppercase self-center sm:self-auto"
                style={{
                  borderColor: "var(--findvat-border)",
                  color: "var(--findvat-text-dim)",
                  fontSize: "clamp(8px, 2.4vw, 10px)",
                  letterSpacing: "0.1em",
                }}
              >
                Not legal advice
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col items-center justify-center min-h-[28px] sm:min-h-[2vw]">
            {loading && (
              <div
                className="flex items-center font-medium animate-pulse"
                style={{
                  gap: 10,
                  color: "var(--findvat-text-dim)",
                  fontSize: "clamp(11px, 3.2vw, 14px)",
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--findvat-accent)",
                    boxShadow: "0 0 10px rgba(29,112,184,0.55)",
                  }}
                />
                Analyzing...
              </div>
            )}

            {error && (
              <div
                className="w-full rounded-xl border px-4 py-3"
                style={{
                  borderColor: "rgba(239,68,68,0.25)",
                  background: "rgba(239,68,68,0.08)",
                }}
              >
                <p
                  className="leading-relaxed"
                  style={{
                    color: "rgba(252,165,165,0.95)",
                    fontSize: "clamp(11px, 3.2vw, 14px)",
                  }}
                >
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer
        className="relative z-10 py-3 sm:py-[1.5vh] text-center border-t"
        style={{ borderColor: "var(--findvat-border)" }}
      >
        <p
          className="font-semibold uppercase px-4"
          style={{
            color: "rgba(243,242,241,0.22)",
            letterSpacing: "0.25em",
            fontSize: "clamp(8px, 2.4vw, 11px)",
          }}
        >
          VAT Engine v5.2 · UK Statutory Guidance 2026
        </p>
      </footer>
    </main>
  );
}
