"use client";

import { Accordion } from "radix-ui";
import { Plus } from "lucide-react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible defaultValue="item-0" className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((item, i) => (
        <Accordion.Item key={item.q} value={`item-${i}`} className="group">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-6 px-6 py-5 text-start text-[15px] font-medium text-fg transition-colors hover:bg-surface-2/50 sm:text-base">
              {item.q}
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-muted transition-[transform,color,border-color] duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-[color-mix(in_oklab,var(--accent)_50%,transparent)] group-data-[state=open]:text-accent-fg">
                <Plus className="size-4" aria-hidden />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="accordion-content overflow-hidden">
            <p className="max-w-3xl px-6 pb-6 text-[15px] leading-relaxed text-muted">{item.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
