import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { productSlugs, products } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { BeforeAfter } from "@/components/mockups/before-after";
import { Terminal } from "@/components/mockups/terminal";
import { PanelSchedule } from "@/components/mockups/panel-schedule";
import { SpecTabs, type SpecTab } from "./spec-tabs";

function Copy({ tag, title, body, bullets }: { tag: string; title: string; body: string; bullets: string[] }) {
  return (
    <div className="max-w-lg">
      <Badge variant="accent" className="ltr font-mono">
        {tag}
      </Badge>
      <h3 className="mt-5 text-balance text-2xl font-semibold tracking-[-0.025em] text-fg sm:text-3xl">{title}</h3>
      <p className="mt-4 text-pretty leading-relaxed text-muted">{body}</p>
      <ul className="mt-6 grid gap-3">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 text-[15px] text-fg-soft">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)]">
              <Check className="size-3 text-success" aria-hidden />
            </span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ visual, copy, flip = false }: { visual: React.ReactNode; copy: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <Reveal className={cn("min-w-0 lg:col-span-5", flip && "lg:order-2")}>{copy}</Reveal>
      <Reveal delay={0.1} className={cn("min-w-0 lg:col-span-7", flip && "lg:order-1")}>
        {visual}
      </Reveal>
    </div>
  );
}

export function Showcase({ dict }: { dict: Dictionary }) {
  const t = dict.showcase;
  const tabs: SpecTab[] = productSlugs.map((slug) => ({
    slug,
    name: products[slug].name,
    version: products[slug].version,
    standards: products[slug].standards,
    accent: products[slug].accent,
    input: dict.products.items[slug].spec.input,
    output: dict.products.items[slug].spec.output,
  }));

  return (
    <section aria-labelledby="showcase-title" className="relative cv-auto py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_80%_20%,color-mix(in_oklab,var(--violet)_10%,transparent),transparent),radial-gradient(40%_30%_at_10%_70%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent)]" />
      <div className="container-page">
        <SectionHeader id="showcase-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />

        <div className="mt-20 grid gap-24 lg:gap-32">
          <Row
            copy={<Copy tag={t.beforeAfter.tag} title={t.beforeAfter.title} body={t.beforeAfter.body} bullets={t.beforeAfter.bullets} />}
            visual={<BeforeAfter before={t.beforeAfter.before} after={t.beforeAfter.after} label={t.beforeAfter.sliderLabel} />}
          />
          <Row
            flip
            copy={<Copy tag={t.terminal.tag} title={t.terminal.title} body={t.terminal.body} bullets={t.terminal.bullets} />}
            visual={<Terminal title={t.terminal.title_bar} lines={t.terminal.lines} />}
          />
          <Row
            copy={<Copy tag={t.panel.tag} title={t.panel.title} body={t.panel.body} bullets={t.panel.bullets} />}
            visual={
              <PanelSchedule
                panelName={t.panel.panelName}
                specs={t.panel.specs}
                columns={t.panel.columns}
                rows={t.panel.rows}
                total={t.panel.total}
                synced={t.panel.synced}
              />
            }
          />
        </div>

        <Reveal className="mt-28 min-w-0">
          <div className="mb-8 flex flex-col gap-2">
            <h3 className="text-2xl font-semibold tracking-tight text-fg">{t.specs.title}</h3>
            <p className="text-muted">{t.specs.sub}</p>
          </div>
          <SpecTabs tabs={tabs} labels={{ input: t.specs.input, output: t.specs.output, standards: t.specs.standards, version: t.specs.version }} />
        </Reveal>
      </div>
    </section>
  );
}
