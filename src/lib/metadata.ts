import type { Metadata } from "next";
import { localeMeta, locales, type Locale } from "@/i18n/config";

/** Per-page metadata with canonical + hreflang alternates for every locale. */
export function pageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}${path}`]));
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { ...languages, "x-default": `/en${path}` },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      locale: localeMeta[locale].ogLocale,
    },
  };
}
