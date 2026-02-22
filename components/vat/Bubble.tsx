"use client";

import type { ReactNode } from "react";

export function Bubble({
  children,
  align,
}: {
  children: ReactNode;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
          align === "right"
            ? "bg-khgreen/5 border-khgreen/15"
            : "bg-white border-khgreen/12",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
