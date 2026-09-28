"use client";

import { Terminal } from "@/components/mockups/terminal";
import { PanelSchedule } from "@/components/mockups/panel-schedule";
import { BeforeAfter } from "@/components/mockups/before-after";
import { Counter } from "@/components/motion/counter";
import { COUNTER_SAMPLE, MARQUEE_SAMPLE, PANEL_SAMPLE, TERMINAL_SAMPLE } from "./samples";

export function TerminalDemo() {
  return <Terminal title={TERMINAL_SAMPLE.title} lines={TERMINAL_SAMPLE.lines} />;
}

export function PanelDemo() {
  return <PanelSchedule {...PANEL_SAMPLE} />;
}

export function BeforeAfterDemo() {
  return <BeforeAfter before="Manual" after="VEYLIX" label="Compare manual model and VEYLIX output" />;
}

export function CounterDemo() {
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4">
      {COUNTER_SAMPLE.map((s, i) => (
        <div key={s.label} className={`flex flex-col items-center gap-1 px-4 py-7 text-center ${i % 2 === 1 ? "border-s border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-s" : ""}`}>
          <dt className="order-2 text-xs text-muted sm:text-sm">{s.label}</dt>
          <dd className="ltr order-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MarqueeDemo() {
  return (
    <div dir="ltr" className="mask-fade-x overflow-hidden py-8">
      <ul className="flex w-max animate-marquee items-center gap-14 pe-14">
        {[...MARQUEE_SAMPLE, ...MARQUEE_SAMPLE].map((item, i) => (
          <li key={i} aria-hidden={i >= MARQUEE_SAMPLE.length} className="whitespace-nowrap font-mono text-lg tracking-[0.15em] text-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
