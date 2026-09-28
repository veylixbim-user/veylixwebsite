"use client";

import * as React from "react";
import Link from "next/link";
import { Slider } from "radix-ui";
import { ArrowRight, Calculator } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { plans } from "@/lib/catalog";
import { formatEGP, formatNumber } from "@/lib/format";
import { href } from "@/lib/links";
import { fill } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

const AUTOMATION = 0.6;
const WEEKS_PER_MONTH = 4.33;

function Range({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <label id={`${id}-label`} className="text-sm text-fg-soft">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 font-mono text-sm font-semibold text-fg tabular-nums">
          {display}
        </output>
      </div>
      <Slider.Root
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex h-5 w-full touch-none select-none items-center"
        aria-labelledby={`${id}-label`}
      >
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
          <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-accent to-violet rtl:bg-gradient-to-l" />
        </Slider.Track>
        <Slider.Thumb
          aria-labelledby={`${id}-label`}
          className="block size-5 rounded-full border-2 border-accent bg-bg shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent)] transition-shadow hover:shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_22%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
        />
      </Slider.Root>
    </div>
  );
}

export function RoiCalculator({ locale, t, perMonth }: { locale: Locale; t: Dictionary["roi"]; perMonth: string }) {
  const [engineers, setEngineers] = React.useState(4);
  const [hours, setHours] = React.useState(18);
  const [rate, setRate] = React.useState(450);

  const hoursSaved = engineers * hours * WEEKS_PER_MONTH * AUTOMATION;
  const value = hoursSaved * rate;

  let planLabel: string;
  let cost: number | null;
  if (engineers > 15) {
    planLabel = t.planLabel.enterprise;
    cost = null;
  } else if (engineers === 1) {
    planLabel = t.planLabel.pro;
    cost = plans.pro.price!.yearly / 12;
  } else {
    const count = Math.ceil(engineers / 5);
    planLabel = fill(t.planLabel.studio, { count });
    cost = (plans.studio.price!.yearly / 12) * count;
  }
  const paybackDays = cost !== null && value > 0 ? (cost / value) * 30 : null;

  return (
    <section aria-labelledby="roi-title" className="relative cv-auto py-20 sm:py-24">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <SectionHeader id="roi-title" align="start" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
          </div>
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="grid gap-7 p-6 sm:p-8">
                <Range id="roi-engineers" label={t.engineers} value={engineers} min={1} max={30} step={1} onChange={setEngineers} display={formatNumber(engineers)} />
                <Range id="roi-hours" label={t.hours} value={hours} min={2} max={40} step={1} onChange={setHours} display={`${hours} h`} />
                <Range id="roi-rate" label={t.rate} value={rate} min={150} max={1500} step={25} onChange={setRate} display={formatEGP(rate, locale)} />
              </div>
              <div className="grid grid-cols-2 border-t border-border bg-bg-elevated/60 sm:grid-cols-4" aria-live="polite">
                <Stat label={t.hoursSaved} value={formatNumber(hoursSaved)} />
                <Stat label={t.valueSaved} value={formatEGP(value, locale)} highlight />
                <Stat label={t.plan} value={planLabel} sub={cost !== null ? `${formatEGP(cost, locale)}${perMonth}` : undefined} />
                <Stat
                  label={t.payback}
                  value={paybackDays === null ? "—" : paybackDays < 1 ? t.lessThanDay : `${Math.ceil(paybackDays)} ${t.days}`}
                />
              </div>
              {cost === null ? (
                <div className="flex flex-col items-start justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center">
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Calculator className="size-4 text-accent-fg" aria-hidden />
                    {t.enterpriseNote}
                  </p>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={href(locale, "/enterprise#contact")}>
                      {t.planLabel.enterprise}
                      <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="border-border p-5 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0 [&:not(:first-child)]:border-s max-sm:[&:nth-child(3)]:border-s-0">
      <p className="text-xs leading-snug text-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold tracking-tight tabular-nums sm:text-xl ${highlight ? "text-accent-fg" : "text-fg"}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 font-mono text-[11px] text-muted">{sub}</p> : null}
    </div>
  );
}
