import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPublishedProducts } from "@/lib/server/products";
import { getSettingsSafe } from "@/lib/server/settings";
import { faqSchema, organizationSchema, suiteSchema } from "@/lib/schema";
import { JsonLd } from "@/components/seo/json-ld";
import { Hero } from "@/components/sections/hero";
import { ProductGrid } from "@/components/sections/product-grid";
import { WhyVeylix } from "@/components/sections/why-veylix";
import { Showcase } from "@/components/sections/showcase";
import { ElectricalShowcase } from "@/components/sections/electrical-showcase";
import { PricingSection } from "@/components/sections/pricing";
import { HowItWorks } from "@/components/sections/how-it-works";
import { FaqSection } from "@/components/sections/faq-section";
import { FinalCta } from "@/components/sections/final-cta";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, products, settings] = await Promise.all([getDictionary(locale), getPublishedProducts(), getSettingsSafe()]);

  return (
    <>
      <JsonLd data={[organizationSchema(), ...(products.length ? [suiteSchema(locale, dict, products)] : []), faqSchema(dict, settings.activationDays)]} />
      <Hero locale={locale} dict={dict} />
      <ProductGrid locale={locale} dict={dict} products={products} />
      <WhyVeylix dict={dict} />
      <Showcase dict={dict} />
      <ElectricalShowcase dict={dict} />
      <PricingSection locale={locale} t={dict.pricing} common={dict.common} methods={dict.checkout.methods} />
      <HowItWorks t={dict.how} activationDays={settings.activationDays} />
      <FaqSection dict={dict} activationDays={settings.activationDays} />
      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
