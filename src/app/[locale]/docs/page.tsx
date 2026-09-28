import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/ui/page-hero";
import { DocsBrowser } from "@/components/sections/docs-browser";

export async function generateMetadata({ params }: PageProps<"/[locale]/docs">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/docs", dict.docs.title, dict.docs.sub);
}

export default async function DocsPage({ params }: PageProps<"/[locale]/docs">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.docs;

  return (
    <>
      <PageHero eyebrow={dict.nav.docs} title={t.title} sub={t.sub} />
      <div className="container-page pb-8">
        <Suspense fallback={null}>
          <DocsBrowser t={t} />
        </Suspense>

        <section aria-labelledby="quickstart" className="mt-16 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <h2 id="quickstart" className="text-xl font-semibold">
              {t.quickstart.title}
            </h2>
          </div>
          <ol className="grid gap-0 divide-y divide-border">
            {t.quickstart.steps.map((step, i) => (
              <li key={step.title} className="grid gap-4 px-6 py-6 sm:grid-cols-[48px_1fr] sm:px-8">
                <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] font-mono text-sm font-semibold text-accent-fg">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                  {step.code ? (
                    <pre dir="ltr" className="mt-4 overflow-x-auto rounded-xl border border-border bg-bg-elevated p-4 text-[12.5px] text-fg">
                      <code>
                        <span className="text-accent-fg">› </span>
                        {step.code}
                      </code>
                    </pre>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
