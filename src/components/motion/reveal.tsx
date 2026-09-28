import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fade-and-rise on scroll. Zero JS per instance: a single <RevealObserver/> in the root
 * layout adds `.in` when the element enters the viewport. Without JS (no `.js` class on
 * <html>) content is simply visible.
 */
export function Reveal({
  delay = 0,
  y = 18,
  className,
  children,
  as: Comp = "div",
}: {
  delay?: number;
  y?: number;
  className?: string;
  children?: ReactNode;
  as?: "div" | "li" | "section";
}) {
  return (
    <Comp data-reveal="" className={cn(className)} style={{ "--reveal-delay": `${delay}s`, "--reveal-y": `${y}px` } as CSSProperties}>
      {children}
    </Comp>
  );
}
