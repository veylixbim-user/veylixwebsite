import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { productSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

const paths = ["", "/pricing", "/docs", "/changelog", "/enterprise", "/trial", ...productSlugs.map((s) => `/products/${s}`), "/legal/terms", "/legal/privacy", "/legal/refunds", "/legal/eula"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: new Date("2026-09-15"),
      changeFrequency: path === "" || path === "/changelog" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/pricing" || path.startsWith("/products") ? 0.9 : 0.6,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
    })),
  );
}
