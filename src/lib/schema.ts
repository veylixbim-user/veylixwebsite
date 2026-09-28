import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { PublicProduct } from "./server/products";
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

export function suiteSchema(locale: Locale, dict: Dictionary, products: PublicProduct[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "VEYLIX Revit plugins",
    description: dict.meta.description,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/${locale}/products/${p.slug}`,
      name: p.name,
    })),
  };
}

export function productSchema(p: PublicProduct, locale: Locale) {
  const url = `${siteUrl}/${locale}/products/${p.slug}`;
  const description = (locale === "ar" ? p.descriptionAr || p.taglineAr : p.descriptionEn || p.taglineEn) || p.name;
  const price = p.priceMonthly ?? p.priceYearly;
  const offer =
    price != null
      ? {
          "@type": "Offer",
          price,
          priceCurrency: "EGP",
          availability: "https://schema.org/InStock",
          url,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price,
            priceCurrency: "EGP",
            referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: p.priceMonthly != null ? "MON" : "ANN" },
          },
        }
      : undefined;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: p.name,
      applicationCategory: "DesignApplication",
      operatingSystem: "Windows 10, Windows 11",
      softwareRequirements: p.revitVersions ? `Autodesk Revit ${p.revitVersions}` : "Autodesk Revit",
      softwareVersion: p.version || undefined,
      description,
      image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl}${i.url}`)),
      url,
      offers: offer,
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description,
      brand: { "@type": "Brand", name: "VEYLIX" },
      image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl}${i.url}`)),
      offers: offer,
    },
  ];
}

export function faqSchema(dict: Dictionary, activationDays: number) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: dict.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replaceAll("{days}", String(activationDays)) },
    })),
  };
}
