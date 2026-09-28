import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPublishedProducts } from "@/lib/server/products";
import { getSettingsSafe } from "@/lib/server/settings";
import { pageMetadata } from "@/lib/metadata";
import { fill } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/section";
import { LogoMark } from "@/components/brand/logo";
import { TrialRequestForm } from "@/components/forms/trial-request-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/trial">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [dict, settings] = await Promise.all([getDictionary(locale), getSettingsSafe()]);
  return pageMetadata(locale, "/trial", fill(dict.trial.title, { days: settings.trialDays }), dict.trial.sub);
}

export default async function TrialPage({ params, searchParams }: PageProps<"/[locale]/trial">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const [dict, products, settings] = await Promise.all([getDictionary(locale), getPublishedProducts(), getSettingsSafe()]);
  const t = dict.trial;
  const initial = typeof sp.product === "string" && products.some((p) => p.slug === sp.product) ? sp.product : null;

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_30%,transparent_100%)]" />
      </div>
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{fill(t.title, { days: settings.trialDays })}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{t.sub}</p>
          <ol className="mt-10 grid gap-3">
            {t.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[15px] text-fg-soft">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] font-mono text-xs text-accent-fg">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <div className="lg:col-span-6">
          <div className="gradient-border relative overflow-hidden rounded-3xl bg-surface p-7 shadow-[0_30px_80px_-30px_var(--glow)] sm:p-9">
            <div className="mb-7 flex items-center gap-3">
              <LogoMark className="size-11" />
              <p className="flex items-center gap-2 text-sm text-muted">
                <Check className="size-4 text-success" aria-hidden />
                {fill(dict.pricing.trialNote, { days: settings.trialDays })}
              </p>
            </div>
            {!settings.trialsEnabled ? (
              <p className="text-muted">{t.disabled}</p>
            ) : products.length === 0 ? (
              <p className="text-muted">{t.noProducts}</p>
            ) : (
              <TrialRequestForm
                t={t}
                download={dict.download}
                products={products.map((p) => ({ slug: p.slug, name: p.name, hasFile: p.hasFile }))}
                initialProduct={initial}
                trialDays={settings.trialDays}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
