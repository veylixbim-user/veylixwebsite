"use client";

import { Tabs } from "radix-ui";
import { ArrowRight } from "lucide-react";
import type { ProductSlug } from "@/lib/catalog";
import { ProductIcon } from "@/components/brand/product-icon";

export type SpecTab = {
  slug: ProductSlug;
  name: string;
  version: string;
  standards: string[];
  accent: "cyan" | "violet" | "mint";
  input: string;
  output: string;
};

export function SpecTabs({ tabs, labels }: { tabs: SpecTab[]; labels: { input: string; output: string; standards: string; version: string } }) {
  return (
    <Tabs.Root defaultValue={tabs[0].slug} className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Tabs.List className="flex overflow-x-auto border-b border-border bg-bg-elevated/60 p-1.5 [scrollbar-width:none]" aria-label={labels.standards}>
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.slug}
            value={tab.slug}
            className="ltr relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-fg data-[state=active]:bg-surface-2 data-[state=active]:text-fg data-[state=active]:shadow-[inset_0_0_0_1px_var(--border-strong)]"
          >
            {tab.name.replace("VEYLIX ", "")}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.slug} value={tab.slug} className="grid gap-6 p-6 outline-none sm:p-8 lg:grid-cols-[auto_1fr_auto_1fr_1fr] lg:items-center">
          <div className="flex items-center gap-3 lg:pe-4">
            <ProductIcon slug={tab.slug} accent={tab.accent} size="lg" />
            <div>
              <p className="ltr font-semibold text-fg">{tab.name}</p>
              <p className="font-mono text-xs text-muted">
                {labels.version} · <span className="ltr">v{tab.version}</span>
              </p>
            </div>
          </div>
          <>
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{labels.input}</p>
              <div className="mt-2 text-sm text-fg-soft">{tab.input}</div>
            </div>
            <ArrowRight className="mx-auto hidden size-5 text-accent-fg lg:block rtl:-scale-x-100" aria-hidden />
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_5%,var(--bg-elevated))] p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent-fg">{labels.output}</p>
              <div className="mt-2 text-sm text-fg">{tab.output}</div>
            </div>
            <div className="lg:ps-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{labels.standards}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tab.standards.map((s) => (
                  <span key={s} className="ltr rounded-md border border-border-strong bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-soft">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
