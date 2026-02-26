import { ReactNode, ButtonHTMLAttributes } from "react";

type NeuButtonVariant = "default" | "selected" | "primary" | "subtle";

export function NeuBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`neu-badge ${className ?? ""}`.trim()}>{children}</span>
  );
}

export function NeuButton({
  children,
  className,
  variant = "default",
  ...props
}: {
  children: ReactNode;
  className?: string;
  variant?: NeuButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`neu-btn ${className ?? ""}`.trim()}
      data-active={variant === "selected" ? "true" : undefined}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  );
}
