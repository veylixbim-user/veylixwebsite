import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { BeforeAfter } from "@/components/mockups/before-after";

export function Showcase({ dict }: { dict: Dictionary }) {
  const t = dict.showcase;
  const b = t.beforeAfter;
  return (
    <section aria-labelledby="showcase-title" className="relative cv-auto py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_80%_20%,color-mix(in_oklab,var(--violet)_10%,transparent),transparent),radial-gradient(40%_30%_at_10%_70%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent)]" />
      <div className="container-page">
        <SectionHeader id="showcase-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="min-w-0 lg:col-span-5">
            <div className="max-w-lg">
              <Badge variant="accent">{b.tag}</Badge>
              <h3 className="mt-5 text-balance text-2xl font-semibold tracking-[-0.025em] text-fg sm:text-3xl">{b.title}</h3>
              <p className="mt-4 text-pretty leading-relaxed text-muted">{b.body}</p>
              <ul className="mt-6 grid gap-3">
                {b.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[15px] text-fg-soft">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)]">
                      <Check className="size-3 text-success" aria-hidden />
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="min-w-0 lg:col-span-7">
            <BeforeAfter before={b.before} after={b.after} label={b.sliderLabel} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
