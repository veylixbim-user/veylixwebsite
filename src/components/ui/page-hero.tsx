import * as React from "react";
import { Eyebrow } from "./section";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  sub,
  children,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_30%,transparent_100%)]" />
        <div className="absolute -top-48 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]" />
      </div>
      <div className={cn("container-page flex flex-col gap-5", align === "center" ? "items-center text-center" : "items-start")}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className={cn("text-balance text-4xl font-semibold tracking-[-0.035em] text-fg sm:text-5xl lg:text-6xl", align === "center" && "max-w-4xl")}>
          {title}
        </h1>
        {sub ? <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted">{sub}</p> : null}
        {children ? <div className="animate-fade-up mt-3 [animation-delay:160ms]">{children}</div> : null}
      </div>
    </section>
  );
}
