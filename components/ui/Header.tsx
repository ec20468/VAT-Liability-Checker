"use client";

export function Header() {
  return (
    <>
      {/* FindVAT design tokens — REQUIRED for reuse */}
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
      `}</style>

      <header
        className="relative z-10 h-[58px] px-4 md:px-8 flex items-center justify-between border-b"
        style={{ borderColor: "var(--findvat-border)" }}
      >
        <div className="flex items-center gap-[10px] h-full">
          <span
            className="uppercase font-semibold flex items-center h-full"
            style={{
              color: "var(--findvat-accent)",
              letterSpacing: "0.12em",
              fontSize: "clamp(18px, 2vw, 22px)",
              lineHeight: 1,
            }}
          >
            FindVAT
          </span>

          <span
            aria-hidden="true"
            className="hidden md:inline-block"
            style={{
              width: 1,
              height: 14,
              background: "var(--findvat-border-mid)",
            }}
          />

          <span
            className="uppercase hidden md:inline-flex items-center h-full"
            style={{
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.18em",
              fontSize: 10,
              fontWeight: 300,
              lineHeight: 1,
            }}
          >
            VAT Liability Advisor
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-5 h-full">
          <span
            className="inline-flex items-center gap-[7px] uppercase h-full"
            style={{
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.12em",
              fontSize: 10,
              lineHeight: 1,
            }}
          >
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#4caf82",
                boxShadow: "0 0 6px rgba(76,175,130,0.5)",
              }}
            />
            <span className="hidden sm:inline">System live</span>
          </span>

          <span
            className="uppercase border px-[10px] py-[4px] flex items-center"
            style={{
              borderColor: "var(--findvat-border)",
              color: "var(--findvat-text-dim)",
              letterSpacing: "0.1em",
              fontSize: 10,
              lineHeight: 1,
            }}
          >
            <span className="sm:hidden">UK · 25/26</span>
            <span className="hidden sm:inline">UK VAT · 2025/26</span>
          </span>
        </div>
      </header>
    </>
  );
}
