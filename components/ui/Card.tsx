import * as React from "react";
import { cn } from "@/lib/utils";

type CardInnerProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "accent" | "green";
};

const toneClass: Record<NonNullable<CardInnerProps["tone"]>, string> = {
  accent: "bg-accent text-khgreen border border-[#e4e4e7] rounded-[16px]",
  green:
    "bg-khgreen text-cream border border-[rgba(255,255,255,0.2)] rounded-[16px]",
};

export function CardInner({
  tone = "accent",
  className,
  ...props
}: CardInnerProps) {
  return (
    <div className={cn(toneClass[tone], "relative", className)} {...props} />
  );
}
