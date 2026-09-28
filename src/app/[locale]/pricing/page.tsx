import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pluginSlugs, products, type PluginSlug } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import { suiteSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { PricingSection } from "@/components/sections/pricing";
import { RoiCalculator } from "@/components/sections/roi-calculator";
import { FaqList } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { SectionHeader } from "@/components/ui/section";

export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/pricing", dict.nav.pricing, `${dict.pricing.title} ${dict.pricing.sub}`);
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.pricing;
  const pluginNames = Object.fromEntries(pluginSlugs.map((s) => [s, products[s].name])) as Record<PluginSlug, string>;
  const tiers = ["starter", "pro", "studio", "enterprise"] as const;
  const faqs = [dict.faq.items[8], dict.faq.items[9], dict.faq.items[3], dict.faq.items[4], dict.faq.items[6]];

  return (
    <>
      <JsonLd data={suiteSchema(locale, dict)} />
      <div className="pt-16">
        <PricingSection locale={locale} t={t} common={dict.common} pluginNames={pluginNames} headingLevel="h1" />
      </div>

      <section aria-labelledby="compare-title" className="py-16 sm:py-20">
        <div className="container-page">
          <SectionHeader id="compare-title" title={t.compare.title} />
          <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">{t.compare.title}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-[28%] px-6 py-5 text-start font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                    {t.compare.feature}
                  </th>
                  {tiers.map((id) => (
                    <th
                      key={id}
                      scope="col"
                      className={cn("px-4 py-5 text-center text-base font-semibold", id === "pro" && "bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] text-accent-fg")}
                    >
                      <span className="ltr">{t.plans[id].name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.compare.rows.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-6 py-4 text-start font-normal text-fg-soft">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className={cn("px-4 py-4 text-center", tiers[i] === "pro" && "bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]")}>
                        {v === true ? (
                          <Check className="mx-auto size-4 text-success" aria-label="✓" />
                        ) : v === false ? (
                          <Minus className="mx-auto size-4 text-border-strong" aria-label="—" />
                        ) : (
                          <span className="text-fg">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <RoiCalculator locale={locale} t={dict.roi} perMonth={dict.common.perMonth} />

      <section aria-labelledby="pricing-faq" className="py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeader id="pricing-faq" align="start" eyebrow={dict.faq.eyebrow} title={dict.faq.title} />
          </div>
          <div className="lg:col-span-8">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
