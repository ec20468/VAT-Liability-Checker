import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";

type Props = React.PropsWithChildren<{
  className?: string;
  innerClassName?: string;
  contentSize?: "content" | "wide" | "full";
}>;

export function Section({
  className,
  innerClassName,
  contentSize = "content",
  children,
}: Props) {
  return (
    <section className={cn("w-full", className)}>
      <Container
        size={contentSize}
        className={cn("px-5 sm:px-8 lg:px-12", innerClassName)}
      >
        {children}
      </Container>
    </section>
  );
}
