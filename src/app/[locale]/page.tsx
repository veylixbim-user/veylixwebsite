import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pluginSlugs, products, type PluginSlug } from "@/lib/catalog";
import { faqSchema, organizationSchema, suiteSchema } from "@/lib/schema";
import { JsonLd } from "@/components/seo/json-ld";
import { Hero } from "@/components/sections/hero";
import { ProductGrid } from "@/components/sections/product-grid";
import { WhyVeylix } from "@/components/sections/why-veylix";
import { Showcase } from "@/components/sections/showcase";
import { PricingSection } from "@/components/sections/pricing";
import { RoiCalculator } from "@/components/sections/roi-calculator";
import { Testimonials } from "@/components/sections/testimonials";
import { DocsTeaser } from "@/components/sections/docs-teaser";
import { FaqSection } from "@/components/sections/faq-section";
import { FinalCta } from "@/components/sections/final-cta";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const pluginNames = Object.fromEntries(pluginSlugs.map((s) => [s, products[s].name])) as Record<PluginSlug, string>;

  return (
    <>
      <JsonLd data={[organizationSchema(), suiteSchema(locale, dict), faqSchema(dict)]} />
      <Hero locale={locale} dict={dict} />
      <ProductGrid locale={locale} dict={dict} />
      <WhyVeylix dict={dict} />
      <Showcase dict={dict} />
      <PricingSection locale={locale} t={dict.pricing} common={dict.common} pluginNames={pluginNames} />
      <RoiCalculator locale={locale} t={dict.roi} perMonth={dict.common.perMonth} />
      <Testimonials dict={dict} />
      <DocsTeaser locale={locale} dict={dict} />
      <FaqSection dict={dict} />
      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
