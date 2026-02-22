"use client";

import type { ReactNode } from "react";

export function NodeShell({
  title,
  children,
  isFirst,
  isLast,
}: {
  title: string;
  children: ReactNode;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative pl-10">
      {!isLast ? (
        <div className="absolute left-[14px] top-7 h-full w-px bg-khgreen/15" />
      ) : null}

      <div className="absolute left-2 top-5 h-4 w-4 rounded-full border border-khgreen/20 bg-cream" />

      <div className="rounded-2xl border border-khgreen/12 bg-white p-4">
        <div className="text-xs font-medium opacity-80">{title}</div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
