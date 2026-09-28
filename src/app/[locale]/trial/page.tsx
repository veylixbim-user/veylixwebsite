import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Monitor } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageMetadata } from "@/lib/metadata";
import { Eyebrow } from "@/components/ui/section";
import { LogoMark } from "@/components/brand/logo";
import { TrialForm } from "@/components/forms/trial-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/trial">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/trial", dict.nav.trial, dict.trial.sub);
}

export default async function TrialPage({ params }: PageProps<"/[locale]/trial">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.trial;

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_30%,transparent_100%)]" />
        <div className="absolute -top-40 start-1/4 h-[420px] w-[700px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]" />
      </div>
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{t.sub}</p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{t.included}</h2>
              <ul className="mt-4 grid gap-3">
                {t.includedItems.map((i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] text-fg-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{t.requirements}</h2>
              <ul className="mt-4 grid gap-3">
                {t.requirementItems.map((i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] text-fg-soft">
                    <Monitor className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="gradient-border relative overflow-hidden rounded-3xl bg-surface p-7 shadow-[0_30px_80px_-30px_var(--glow)] sm:p-9">
            <div className="mb-7 flex items-center gap-3">
              <LogoMark className="size-11" />
              <div>
                <p className="font-semibold">VEYLIX Pro</p>
                <p className="text-sm text-muted">{dict.hero.microcopy.join(" · ")}</p>
              </div>
            </div>
            <TrialForm t={t.form} errorsT={dict.checkout.errors} common={dict.common} />
          </div>
        </div>
      </div>
    </section>
  );
}
