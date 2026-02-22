"use client";

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
  const placeholders = [
    'e.g. "importing a car from Argentina"',
    'e.g. "hot takeaway food"',
    'e.g. "commercial property rental"',
    'e.g. "consultancy services for UK client"',
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    onSubmitInitial();
  };

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Center cluster — pushed slightly above true center */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-[4vw]"
        style={{ paddingBottom: "12vh" }}
      >
        <div
          className="w-full flex flex-col items-center"
          style={{ gap: "2.5vw", maxWidth: "60vw" }}
        >
          {/* Title */}
          <div
            className="text-center"
            style={{ display: "flex", flexDirection: "column", gap: "1vw" }}
          >
            <h1
              className="text-white font-semibold tracking-tight leading-tight"
              style={{ fontSize: "clamp(24px, 5vw, 200px)" }}
            >
              VAT liability helper
            </h1>
            <p
              className="text-white/50 leading-relaxed mx-auto"
              style={{
                fontSize: "clamp(13px, 2vw, 200px)",
                maxWidth: "38vw",
              }}
            >
              Enter a situation. We&apos;ll ask for clarifiers only when they
              impact the tax result.
            </p>
          </div>

          {/* Input */}
          <div className="w-full">
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              value={draft}
              onValueChange={setDraft}
              onSubmit={handleSubmit}
              disabled={loading}
            />
          </div>

          {/* Status */}
          <div
            className="w-full flex flex-col items-center justify-center"
            style={{ minHeight: "2vw" }}
          >
            {loading && (
              <div
                className="flex items-center text-white/40 font-medium animate-pulse"
                style={{ gap: "0.6vw", fontSize: "clamp(11px, 0.8vw, 200px)" }}
              >
                <div
                  className="bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{
                    width: "0.5vw",
                    height: "0.5vw",
                    minWidth: "8px",
                    minHeight: "8px",
                  }}
                />
                Analyzing...
              </div>
            )}
            {error && (
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p
                  className="text-red-300 leading-relaxed"
                  style={{ fontSize: "clamp(11px, 0.8vw, 200px)" }}
                >
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="py-[1.5vh] text-center">
        <p
          className="text-white/20 font-semibold tracking-[0.25em] uppercase"
          style={{ fontSize: "clamp(8px, 0.4vw, 200px)" }}
        >
          VAT Engine v5.2 · UK Statutory Guidance 2026
        </p>
      </footer>
    </main>
  );
}
