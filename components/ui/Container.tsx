import * as React from "react";
import { cn } from "@/lib/utils";

type ContainerSize = "content" | "wide" | "full";

type Props = React.PropsWithChildren<{
  className?: string;
  size?: ContainerSize;
}>;

export function Container({ className, size = "content", children }: Props) {
  const sizeClass =
    size === "full"
      ? "w-full"
      : size === "wide"
        ? "mx-auto w-full max-w-[1440px]"
        : "mx-auto w-full max-w-[1100px]";

  return <div className={cn(sizeClass, className)}>{children}</div>;
}
