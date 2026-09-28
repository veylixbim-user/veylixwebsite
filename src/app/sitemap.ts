import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getPublishedProducts } from "@/lib/server/products";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  const pages = [
    { path: "", priority: 1, lastModified: new Date() },
    { path: "/pricing", priority: 0.9, lastModified: new Date() },
    ...products.map((p) => ({ path: `/products/${p.slug}`, priority: 0.9, lastModified: new Date(p.updatedAt) })),
    { path: "/download", priority: 0.6, lastModified: new Date() },
    { path: "/trial", priority: 0.7, lastModified: new Date() },
    { path: "/enterprise", priority: 0.5, lastModified: new Date() },
    { path: "/contact", priority: 0.5, lastModified: new Date() },
    { path: "/docs", priority: 0.5, lastModified: new Date() },
    ...["terms", "privacy", "refunds", "eula"].map((d) => ({ path: `/legal/${d}`, priority: 0.2, lastModified: new Date("2026-09-28") })),
  ];
  return pages.flatMap(({ path, priority, lastModified }) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
    })),
  );
}
