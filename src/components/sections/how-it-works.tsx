import { CreditCard, Download, KeyRound, MonitorCheck } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const ICONS = [CreditCard, KeyRound, Download, MonitorCheck];

export function HowItWorks({ t, activationDays }: { t: Dictionary["how"]; activationDays: number }) {
  return (
    <section aria-labelledby="how-title" className="relative cv-auto py-20 sm:py-24">
      <div className="container-page">
        <SectionHeader id="how-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="absolute inset-x-[12%] top-[38px] hidden h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent)_50%,transparent)] to-transparent lg:block" />
          {t.steps.map((step, i) => {
            const Icon = ICONS[i] ?? KeyRound;
            return (
              <Reveal as="li" key={step.title} delay={i * 0.06} className="relative">
                <div className="h-full rounded-2xl border border-border bg-surface p-6">
                  <span className="relative z-10 inline-flex size-12 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))] text-accent-fg">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-5 font-mono text-xs text-muted">0{i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{fill(step.body, { days: activationDays })}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
