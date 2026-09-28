import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSettingsSafe } from "@/lib/server/settings";
import { pageMetadata } from "@/lib/metadata";
import { PricingSection } from "@/components/sections/pricing";
import { HowItWorks } from "@/components/sections/how-it-works";
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
  const [dict, settings] = await Promise.all([getDictionary(locale), getSettingsSafe()]);
  const faqs = [0, 1, 3, 4, 5, 9].map((i) => dict.faq.items[i]).map((f) => ({ q: f.q, a: f.a.replaceAll("{days}", String(settings.activationDays)) }));

  return (
    <>
      <div className="pt-16">
        <PricingSection locale={locale} t={dict.pricing} common={dict.common} methods={dict.checkout.methods} headingLevel="h1" />
      </div>
      <HowItWorks t={dict.how} activationDays={settings.activationDays} />
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
