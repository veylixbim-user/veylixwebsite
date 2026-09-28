import { Quote } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const AVATAR_GRADIENTS = [
  "from-[#00e5ff] to-[#1f4c86]",
  "from-[#7c5cff] to-[#2a1f6b]",
  "from-[#22d3aa] to-[#0d4f45]",
  "from-[#ffb547] to-[#6b3d0a]",
];

function initials(name: string) {
  return name
    .replace(/[.]/g, "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

/** Quotes are PLACEHOLDERS (see dictionaries) — replace with approved customer quotes before launch. */
export function Testimonials({ dict }: { dict: Dictionary }) {
  const t = dict.testimonials;
  return (
    <section aria-labelledby="testimonials-title" className="relative cv-auto py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader id="testimonials-title" eyebrow={t.eyebrow} title={t.title} />
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {t.items.map((item, i) => (
            <Reveal key={item.name} delay={(i % 2) * 0.08} className="h-full">
              <figure
                className={cn(
                  "relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-border bg-surface p-7 sm:p-8",
                  i === 0 && "md:bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_7%,var(--surface)),var(--surface)_55%)]",
                )}
              >
                <blockquote className="relative text-pretty text-lg leading-relaxed text-fg sm:text-xl">
                  <Quote aria-hidden className="mb-4 size-7 fill-[color-mix(in_oklab,var(--accent)_20%,transparent)] text-accent-fg rtl:-scale-x-100" strokeWidth={1.2} />
                  <p>“{item.quote}”</p>
                </blockquote>
                <figcaption className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-2 ring-bg",
                      AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                    )}
                  >
                    {initials(item.name)}
                  </span>
                  <span>
                    <span className="block font-medium text-fg">{item.name}</span>
                    <span className="block text-sm text-muted">
                      {item.role} · {item.company}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
