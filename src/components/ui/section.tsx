import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "center",
  className,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-2xl items-start", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-balance text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
        {title}
      </h2>
      {sub ? <p className="text-pretty text-base leading-relaxed text-muted sm:text-lg">{sub}</p> : null}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent-fg", className)}>
      <span aria-hidden className="h-px w-5 bg-gradient-to-r from-transparent to-[var(--accent-fg)] rtl:bg-gradient-to-l" />
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted", className)}>
      {children}
    </kbd>
  );
}
