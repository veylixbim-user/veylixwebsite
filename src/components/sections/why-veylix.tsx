import { FileBox, FileSpreadsheet, RefreshCw, ShieldCheck, Sparkles, Timer, WifiOff, Workflow, Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { REVIT_VERSIONS as revitVersions } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { SpotlightGroup } from "@/components/motion/spotlight";

const STANDARDS = [
  { code: "IEC 60364", region: "INT" },
  { code: "NEC 2023", region: "US" },
  { code: "BS 7671", region: "UK" },
  { code: "NF C 15-100", region: "FR" },
  { code: "ECP 306-1", region: "EG", highlight: true },
];

function Tile({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn("h-full", className)}>
      <div className="spotlight relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong sm:p-7">
        {children}
      </div>
    </Reveal>
  );
}

function TileHead({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div>
      <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-accent-fg">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

export function WhyVeylix({ dict }: { dict: Dictionary }) {
  const t = dict.why;
  const it = t.items;
  return (
    <section aria-labelledby="why-title" className="relative cv-auto py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />
      <div className="container-page">
        <SectionHeader id="why-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />

        <SpotlightGroup className="mt-16 grid gap-4 lg:grid-cols-6">
          {/* Speed */}
          <Tile className="lg:col-span-4">
            <TileHead icon={Timer} title={it.speed.title} body={it.speed.body} />
            <div className="mt-8 grid gap-4" dir="ltr">
              <div>
                <div className="mb-2 flex justify-between font-mono text-xs">
                  <span className="text-muted">{it.speed.manual}</span>
                  <span className="text-fg-soft">{it.speed.manualTime}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full w-full rounded-full bg-[repeating-linear-gradient(135deg,var(--border-strong)_0_6px,var(--surface-3)_6px_12px)]" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between font-mono text-xs">
                  <span className="text-accent-fg">{it.speed.veylix}</span>
                  <span className="font-semibold text-fg">{it.speed.veylixTime}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                  <Reveal y={0} className="h-full w-[9.5%] origin-left rounded-full bg-gradient-to-r from-accent to-violet shadow-[0_0_16px_var(--glow)]">
                    <span className="sr-only">{it.speed.veylixTime}</span>
                  </Reveal>
                </div>
              </div>
              <p className="text-end font-mono text-[40px] font-semibold leading-none tracking-tight text-fg sm:text-5xl">
                10.5<span className="text-accent-fg">×</span>
              </p>
            </div>
          </Tile>

          {/* Offline */}
          <Tile className="lg:col-span-2" delay={0.08}>
            <TileHead icon={WifiOff} title={it.offline.title} body={it.offline.body} />
            <div className="mt-auto pt-8">
              <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-bg-elevated p-4">
                <div>
                  <p className="ltr font-mono text-3xl font-semibold text-fg">{it.offline.stat}</p>
                  <p className="mt-1 text-xs text-muted">{it.offline.statLabel}</p>
                </div>
                <ShieldCheck className="size-10 text-success" strokeWidth={1.4} aria-hidden />
              </div>
            </div>
          </Tile>

          {/* Codes */}
          <Tile className="lg:col-span-2">
            <TileHead icon={ShieldCheck} title={it.codes.title} body={it.codes.body} />
            <ul className="mt-6 flex flex-wrap gap-2">
              {STANDARDS.map((s) => (
                <li
                  key={s.code}
                  className={cn(
                    "ltr inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs",
                    s.highlight
                      ? "border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg"
                      : "border-border-strong bg-surface-2 text-fg-soft",
                  )}
                >
                  <span className="text-[10px] text-muted">{s.region}</span>
                  {s.code}
                </li>
              ))}
            </ul>
          </Tile>

          {/* Rules */}
          <Tile className="lg:col-span-2" delay={0.08}>
            <TileHead icon={Workflow} title={it.rules.title} body={it.rules.body} />
            <pre dir="ltr" className="mt-6 overflow-x-auto rounded-xl border border-border bg-bg-elevated p-4 text-[11.5px] leading-6">
              {it.rules.rule.map((line, i) => {
                const [kw, ...rest] = line.split(" ");
                return (
                  <div key={i}>
                    <span className="text-violet-fg">{kw}</span> <span className="text-fg-soft">{rest.join(" ")}</span>
                  </div>
                );
              })}
            </pre>
          </Tile>

          {/* IFC */}
          <Tile className="lg:col-span-2" delay={0.16}>
            <TileHead icon={FileBox} title={it.ifc.title} body={it.ifc.body} />
            <ul dir="ltr" className="mt-6 grid gap-1.5 rounded-xl border border-border bg-bg-elevated p-3 font-mono text-[11.5px]">
              {[
                { icon: FileBox, name: "Tower-B_Electrical.ifc", meta: "IFC4X3" },
                { icon: FileSpreadsheet, name: "Panel_Schedules.xlsx", meta: "24 sheets" },
                { icon: FileSpreadsheet, name: "Load_Summary.csv", meta: "38.4 kVA" },
              ].map(({ icon: Icon, name, meta }) => (
                <li key={name} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                  <Icon className="size-3.5 text-accent-fg" aria-hidden />
                  <span className="flex-1 truncate text-fg-soft">{name}</span>
                  <span className="text-[10px] text-muted">{meta}</span>
                  <Check className="size-3.5 text-success" aria-hidden />
                </li>
              ))}
            </ul>
          </Tile>

          {/* Updates */}
          <Tile className="lg:col-span-6">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
              <TileHead icon={RefreshCw} title={it.updates.title} body={it.updates.body} />
              <ol dir="ltr" className="relative flex items-center justify-between">
                <span aria-hidden className="absolute inset-x-3 top-1/2 h-px -translate-y-[14px] bg-gradient-to-r from-border-strong via-accent to-violet" />
                {revitVersions.map((v, i) => (
                  <li key={v} className="relative flex flex-col items-center gap-3">
                    <span
                      className={cn(
                        "relative z-10 size-3 rounded-full border-2",
                        i === revitVersions.length - 1 ? "border-accent bg-accent shadow-[0_0_14px_var(--accent)]" : "border-border-strong bg-surface",
                      )}
                    />
                    <span className={cn("font-mono text-xs", i === revitVersions.length - 1 ? "text-fg" : "text-muted")}>{v}</span>
                  </li>
                ))}
                <li className="relative flex flex-col items-center gap-3">
                  <span className="relative z-10 inline-flex size-3 items-center justify-center rounded-full border-2 border-dashed border-violet bg-surface" />
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-violet-fg">
                    <Sparkles className="size-3" aria-hidden />
                    {it.updates.next}
                  </span>
                </li>
              </ol>
            </div>
          </Tile>
        </SpotlightGroup>
      </div>
    </section>
  );
}
