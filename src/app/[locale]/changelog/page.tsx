import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/ui/page-hero";
import { NewsletterForm } from "@/components/forms/newsletter-form";

const TYPE_STYLE: Record<string, string> = {
  new: "border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent-fg",
  improved: "border-[color-mix(in_oklab,var(--violet)_40%,transparent)] bg-[color-mix(in_oklab,var(--violet)_10%,transparent)] text-violet-fg",
  fixed: "border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-success",
};

export async function generateMetadata({ params }: PageProps<"/[locale]/changelog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/changelog", dict.changelog.title, dict.changelog.sub);
}

export default async function ChangelogPage({ params }: PageProps<"/[locale]/changelog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.changelog;

  return (
    <>
      <PageHero eyebrow={dict.nav.changelog} title={t.title} sub={t.sub}>
        <div className="w-full max-w-md">
          <NewsletterForm t={dict.newsletter} locale={locale} />
        </div>
      </PageHero>
      <div className="container-page max-w-4xl pb-8">
        <ol className="relative">
          <span aria-hidden className="absolute bottom-0 start-[7px] top-2 w-px bg-gradient-to-b from-accent via-border-strong to-transparent md:start-[167px]" />
          {t.releases.map((r, i) => (
            <li key={r.version} className="relative grid gap-4 pb-14 ps-8 md:grid-cols-[160px_1fr] md:gap-10 md:ps-0">
              <span
                aria-hidden
                className={cn(
                  "absolute start-0 top-1.5 size-[15px] rounded-full border-2 md:start-[160px]",
                  i === 0 ? "border-accent bg-accent shadow-[0_0_14px_var(--accent)]" : "border-border-strong bg-bg",
                )}
              />
              <div className="md:pt-0.5 md:text-end md:pe-8">
                <p className="ltr font-mono text-sm font-semibold text-fg md:ps-0">v{r.version}</p>
                <time dateTime={r.date} className="text-sm text-muted">
                  {formatDate(r.date, locale)}
                </time>
              </div>
              <article className="md:ps-6">
                <h2 className="text-xl font-semibold tracking-tight">{r.title}</h2>
                <ul className="mt-4 grid gap-2.5">
                  {r.items.map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-[15px] text-fg-soft">
                      <span className={cn("mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide", TYPE_STYLE[item.type])}>
                        {t.labels[item.type as keyof typeof t.labels]}
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
