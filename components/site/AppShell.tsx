"use client";

import { StarfieldBackground } from "@/components/ui/starfield-background"; // adjust path

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <StarfieldBackground
        className="pointer-events-none -z-10"
        count={400}
        speed={0.5}
        starColor="#ffffff"
        twinkle
      />
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
