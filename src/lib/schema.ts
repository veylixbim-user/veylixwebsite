import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { plans, products, type ProductSlug } from "./catalog";
import { siteUrl, social } from "./site";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VEYLIX",
    url: siteUrl,
    logo: `${siteUrl}/brand/veylix-mark.svg`,
    slogan: "Power Your BIM Workflow.",
    sameAs: Object.values(social),
    address: { "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" },
  };
}

export function suiteSchema(locale: Locale, dict: Dictionary) {
  const prices = [plans.starter, plans.pro, plans.studio].map((p) => p.price!.monthly);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VEYLIX Suite",
    applicationCategory: "DesignApplication",
    applicationSubCategory: "Autodesk Revit add-in",
    operatingSystem: "Windows 10, Windows 11",
    softwareRequirements: "Autodesk Revit 2021–2025",
    softwareVersion: products.bundle.version,
    inLanguage: locale === "ar" ? "ar-EG" : "en",
    description: dict.meta.description,
    url: `${siteUrl}/${locale}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EGP",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: 3,
      availability: "https://schema.org/InStock",
    },
    publisher: { "@type": "Organization", name: "VEYLIX" },
  };
}

export function productSchema(slug: ProductSlug, locale: Locale, dict: Dictionary) {
  const p = products[slug];
  const c = dict.products.items[slug];
  const price = slug === "bundle" ? plans.pro.price!.monthly : plans.starter.price!.monthly;
  const url = `${siteUrl}/${locale}/products/${slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: p.name,
      applicationCategory: "DesignApplication",
      operatingSystem: "Windows 10, Windows 11",
      softwareRequirements: "Autodesk Revit 2021–2025",
      softwareVersion: p.version,
      description: c.description,
      url,
      offers: { "@type": "Offer", price, priceCurrency: "EGP", availability: "https://schema.org/InStock", url },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: c.tagline,
      brand: { "@type": "Brand", name: "VEYLIX" },
      category: "Software > Engineering > BIM",
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "EGP",
        availability: "https://schema.org/InStock",
        url,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: "EGP",
          valueAddedTaxIncluded: false,
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
      },
    },
  ];
}

export function faqSchema(dict: Dictionary) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: dict.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
