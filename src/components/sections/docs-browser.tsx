"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Search } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Kbd } from "@/components/ui/section";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[ً-ٟ]/g, "");
}

export function DocsBrowser({ t }: { t: Dictionary["docs"] }) {
  const params = useSearchParams();
  const [query, setQuery] = React.useState(() => params.get("q") ?? "");
  const q = normalize(query.trim());

  const sections = t.sections
    .map((s) => ({ ...s, articles: q ? s.articles.filter((a) => normalize(`${a.title} ${a.body} ${s.title}`).includes(q)) : s.articles }))
    .filter((s) => s.articles.length > 0);

  return (
    <div>
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="docs-search" className="sr-only">
          {t.search}
        </label>
        <input
          id="docs-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="h-14 w-full rounded-2xl border border-border-strong bg-surface ps-12 pe-16 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-[color-mix(in_oklab,var(--accent)_60%,transparent)] focus:shadow-[0_0_0_5px_color-mix(in_oklab,var(--accent)_12%,transparent)]"
        />
        <Kbd className="absolute end-4 top-1/2 -translate-y-1/2">Ctrl K</Kbd>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2" aria-live="polite">
        {sections.length === 0 ? (
          <p className="col-span-full py-10 text-center text-muted">{t.noResults}</p>
        ) : (
          sections.map((s) => (
            <section key={s.title} className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-fg">{s.title}</h2>
              <ul className="mt-4 grid gap-1">
                {s.articles.map((a) => (
                  <li key={a.title}>
                    <div className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                      <div>
                        <h3 className="text-[15px] font-medium text-fg">{a.title}</h3>
                        <p className="mt-0.5 text-sm text-muted">{a.body}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
