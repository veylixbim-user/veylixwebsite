import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPublishedProduct, getPublishedProducts } from "@/lib/server/products";
import { formatDate } from "@/lib/format";
import { href } from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";
import { productSchema } from "@/lib/schema";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { ProductThumb } from "@/components/brand/product-thumb";
import { localized } from "@/components/sections/product-grid";
import { ProductGallery } from "@/components/sections/product-gallery";
import { BuyBox } from "@/components/sections/buy-box";
import { FinalCta } from "@/components/sections/final-cta";

export const dynamicParams = true;
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await getPublishedProduct(slug);
  if (!p) return {};
  const c = localized(p, locale);
  const meta = pageMetadata(locale, `/products/${slug}`, p.name, c.tagline || c.description.slice(0, 160) || p.name);
  const cover = p.images[0]?.url;
  return cover ? { ...meta, openGraph: { ...meta.openGraph, images: [cover] } } : meta;
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, p, all] = await Promise.all([getDictionary(locale), getPublishedProduct(slug), getPublishedProducts()]);
  if (!p) notFound();
  const t = dict.productPage;
  const c = localized(p, locale);
  const related = all.filter((x) => x.id !== p.id).slice(0, 3);

  return (
    <>
      <JsonLd data={productSchema(p, locale)} />
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_30%_0%,#000_30%,transparent_100%)]" />
        </div>
        <div className="container-page">
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-sm text-muted">
            <Link href={href(locale, "/#products")} className="hover:text-fg">
              {t.breadcrumb}
            </Link>
            <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
            <span aria-current="page" className="ltr text-fg">
              {p.name}
            </span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="min-w-0 lg:col-span-7">
              <ProductGallery images={p.images} art={p.art} name={p.name} />
            </div>
            <div className="min-w-0 lg:col-span-5">
              <div className="flex flex-wrap items-center gap-2">
                {p.version ? (
                  <Badge variant="accent" className="ltr font-mono">
                    v{p.version}
                  </Badge>
                ) : null}
                {p.revitVersions ? (
                  <Badge variant="mono" className="ltr">
                    Revit {p.revitVersions}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                <bdi>{p.name}</bdi>
              </h1>
              {c.tagline ? <p className="mt-3 text-lg leading-snug text-fg-soft">{c.tagline}</p> : null}
              <div className="mt-6">
                <BuyBox
                  locale={locale}
                  product={{ id: p.id, slug: p.slug, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, hasFile: p.hasFile }}
                  t={t}
                  common={dict.common}
                  pricing={dict.pricing}
                  download={dict.download}
                />
              </div>
              <p className="mt-3 text-xs text-muted">
                {t.updated} {formatDate(p.updatedAt, locale)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {c.description || c.features.length ? (
        <section className="py-12 sm:py-16">
          <div className="container-page grid gap-10 lg:grid-cols-12">
            {c.description ? (
              <div className="lg:col-span-7">
                <div className="grid gap-4 whitespace-pre-line text-[17px] leading-relaxed text-fg-soft">{c.description}</div>
              </div>
            ) : null}
            {c.features.length ? (
              <div className={c.description ? "lg:col-span-5" : "lg:col-span-12"}>
                <h2 className="text-xl font-semibold">{t.features}</h2>
                <ul className="mt-5 grid gap-3">
                  {c.features.map((f) => (
                    <li key={f} className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-[15px] text-fg-soft">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)]">
                        <Check className="size-3 text-success" aria-hidden />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="related-title" className="py-12 sm:py-16">
          <div className="container-page">
            <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
              {t.related}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} href={href(locale, `/products/${r.slug}`)} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                  <ProductThumb image={r.images[0]?.url} art={r.art} name={r.name} className="size-14" />
                  <span className="min-w-0">
                    <span className="ltr block truncate font-semibold">{r.name}</span>
                    <span className="line-clamp-2 text-sm text-muted">{localized(r, locale).tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
