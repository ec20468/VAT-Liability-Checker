import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLink = BaseProps &
  Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children"> & {
    href: string;
  };

type Props = ButtonAsButton | ButtonAsLink;

const base =
  "inline-flex items-center justify-center rounded-xl font-medium transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-khgreen/30 disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-khgreen text-cream hover:opacity-90 shadow-soft",
  secondary:
    "bg-cream text-khgreen border border-khgreen/25 hover:bg-khgreen/5",
  ghost: "bg-transparent text-khgreen hover:bg-khgreen/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
};

export function Button(props: Props) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    ...rest
  } = props as Props;

  const cls = cn(base, variants[variant], sizes[size], className);

  if ("href" in props) {
    const { href, ...linkRest } = rest as Omit<ButtonAsLink, keyof BaseProps>;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={cls}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
