import Link from "next/link";
import { ArrowRight, BookOpen, GitCommitHorizontal, Search } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { href } from "@/lib/links";
import { currentRelease } from "@/lib/site";
import { SectionHeader, Kbd } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";

export function DocsTeaser({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.docsTeaser;
  return (
    <section aria-labelledby="docs-title" className="relative cv-auto py-20 sm:py-24">
      <div className="container-page">
        <SectionHeader id="docs-title" eyebrow={t.eyebrow} title={t.title} />
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-accent-fg">
                  <BookOpen className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{t.docsTitle}</h3>
                  <p className="text-sm text-muted">{t.docsBody}</p>
                </div>
              </div>
              <form action={href(locale, "/docs")} method="get" role="search" className="relative mt-7">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <label htmlFor="docs-q" className="sr-only">
                  {t.searchPlaceholder}
                </label>
                <input
                  id="docs-q"
                  name="q"
                  type="search"
                  placeholder={t.searchPlaceholder}
                  className="h-12 w-full rounded-xl border border-border-strong bg-bg-elevated ps-10 pe-16 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-[color-mix(in_oklab,var(--accent)_60%,transparent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_12%,transparent)]"
                />
                <Kbd className="absolute end-3 top-1/2 -translate-y-1/2">↵</Kbd>
              </form>
              <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{t.popular}</p>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {t.popularLinks.map((l) => (
                  <li key={l}>
                    <Link href={`${href(locale, "/docs")}?q=${encodeURIComponent(l)}`} className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-fg-soft hover:bg-surface-2 hover:text-fg">
                      {l}
                      <ArrowRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={href(locale, "/docs")} className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-medium text-accent-fg hover:underline">
                {t.openDocs}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="h-full">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-7 sm:p-8">
              <div aria-hidden className="bg-blueprint pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(200deg,#000,transparent_60%)]" />
              <div className="relative flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{t.releaseTitle}</p>
                <time dateTime={currentRelease.date} className="text-xs text-muted">
                  {formatDate(currentRelease.date, locale)}
                </time>
              </div>
              <div className="relative mt-5 flex items-center gap-3">
                <Badge variant="accent" className="ltr font-mono text-sm">
                  <GitCommitHorizontal className="size-3.5" aria-hidden />v{currentRelease.version}
                </Badge>
              </div>
              <h3 className="relative mt-4 text-2xl font-semibold tracking-tight">{t.releaseName}</h3>
              <ul className="relative mt-5 grid gap-3">
                {t.releaseItems.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] text-fg-soft">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={href(locale, "/changelog")} className="relative mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-medium text-accent-fg hover:underline">
                {t.allReleases}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
