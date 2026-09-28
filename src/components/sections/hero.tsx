import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/links";
import { trustedBy } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RevitWindow } from "@/components/mockups/revit-window";
import { Counter } from "@/components/motion/counter";
import { DemoDialog } from "./demo-dialog";

const TRACES = [
  "M-20 120 H180 L240 180 H420",
  "M-20 300 H120 L200 220 H360 L400 180",
  "M1460 90 H1240 L1180 150 H1010",
  "M1460 280 H1320 L1250 210 H1080 L1040 170",
  "M300 -20 V60 L360 120 H480",
  "M1140 -20 V40 L1080 100 H960",
];

const NODES: [number, number][] = [
  [420, 180],
  [400, 180],
  [1010, 150],
  [1040, 170],
  [480, 120],
  [960, 100],
];

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.hero;
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pt-28 sm:pt-32">
      {/* Background: blueprint grid, glows, circuit traces */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]" />
        <div className="absolute top-40 -end-40 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--violet)_20%,transparent),transparent)]" />
        <svg className="absolute inset-x-0 top-0 h-[520px] w-full" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMin slice" fill="none">
          <g stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.55">
            {TRACES.map((d, i) => (
              <path key={i} d={d} pathLength={1} className="draw" style={{ "--delay": `${0.2 + i * 0.15}s`, "--dur": "1.8s" } as CSSProperties} />
            ))}
          </g>
          <g fill="var(--accent)">
            {NODES.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" className="appear" style={{ "--delay": `${1.6 + i * 0.12}s` } as CSSProperties} />
            ))}
          </g>
        </svg>
      </div>

      <div className="container-page">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <Link
            href={href(locale, "/changelog")}
            className="group animate-fade-up inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/70 py-1 ps-1 pe-3 text-xs text-fg-soft transition-colors hover:border-[color-mix(in_oklab,var(--accent)_50%,var(--border-strong))]"
          >
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-accent">{dict.common.new}</span>
            <span className="truncate">{t.announcement}</span>
            <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </Link>

          <h1
            id="hero-title"
            className="mt-7 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-6xl lg:text-[84px]"
          >
            <span className="block">{t.headlineA}</span>
            <span className="text-gradient block pb-2">{t.headlineB}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {t.sub}
          </p>

          <div className="animate-fade-up mt-9 flex w-full flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={href(locale, "/trial")}>
                {t.ctaPrimary}
                <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
            <DemoDialog
              label={t.ctaSecondary}
              title={t.demoTitle}
              body={t.demoBody}
              cta={t.demoCta}
              ctaHref={href(locale, "/enterprise#contact")}
              closeLabel={dict.common.close}
            />
          </div>

          <ul className="animate-fade-up mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted [animation-delay:320ms]">
            {t.microcopy.map((m) => (
              <li key={m} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-success" aria-hidden />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Product window */}
        <div className="animate-fade-up relative mx-auto mt-16 max-w-6xl [animation-delay:380ms] [perspective:2000px] sm:mt-20">
          <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-10 -z-10 rounded-[40px] bg-[radial-gradient(60%_50%_at_50%_30%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]" />
          <div className="origin-top transition-transform duration-700 lg:[transform:rotateX(8deg)] lg:hover:[transform:rotateX(2deg)]">
            <RevitWindow file={t.mock.file} status={t.mock.status} schedule={t.mock.schedule} connected={t.mock.connected} demand={t.mock.demand} />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-16 bg-gradient-to-t from-bg/80 to-transparent" />
        </div>

        {/* Trust strip */}
        <div className="relative mt-16 sm:mt-20">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t.trustedBy}</p>
          <div dir="ltr" className="mask-fade-x mt-6 overflow-hidden">
            <ul className="marquee-track flex w-max animate-marquee items-center gap-14 pe-14" aria-label={t.trustedBy}>
              {[...trustedBy, ...trustedBy].map((logo, i) => (
                <li
                  key={i}
                  aria-hidden={i >= trustedBy.length}
                  className={cn("ltr whitespace-nowrap text-lg text-muted transition-colors hover:text-fg", logo.style)}
                >
                  {logo.name}
                </li>
              ))}
            </ul>
          </div>

          <dl className="mt-14 grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface/40 lg:grid-cols-4">
            {t.stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-7 text-center",
                  i % 2 === 1 && "border-s border-border",
                  i >= 2 && "border-t border-border lg:border-t-0",
                  i === 2 && "lg:border-s",
                )}
              >
                <dt className="order-2 text-xs text-muted sm:text-sm">{s.label}</dt>
                <dd className="ltr order-1 text-3xl font-semibold tracking-tight text-fg tabular-nums sm:text-4xl">
                  <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
