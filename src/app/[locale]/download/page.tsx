import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPublishedProducts } from "@/lib/server/products";
import { href } from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/ui/page-hero";
import { ProductThumb } from "@/components/brand/product-thumb";
import { DownloadForm } from "@/components/forms/download-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/download">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return pageMetadata(locale, "/download", dict.download.title, dict.download.sub);
}

export default async function DownloadPage({ params, searchParams }: PageProps<"/[locale]/download">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const selected = typeof sp.product === "string" ? sp.product : null;
  const [dict, products] = await Promise.all([getDictionary(locale), getPublishedProducts()]);
  const t = dict.download;
  const list = selected ? [...products].sort((a, b) => Number(b.slug === selected) - Number(a.slug === selected)) : products;

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      <div className="container-page max-w-3xl pb-8">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-muted">{t.noProducts}</p>
        ) : (
          <ul className="grid gap-4">
            {list.map((p) => (
              <li key={p.id} id={p.slug} className={cn("scroll-mt-24 rounded-2xl border bg-surface p-5 sm:p-6", p.slug === selected ? "border-[color-mix(in_oklab,var(--accent)_50%,var(--border))]" : "border-border")}>
                <div className="mb-4 flex items-center gap-4">
                  <ProductThumb image={p.images[0]?.url} art={p.art} name={p.name} className="size-14" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">
                      <Link href={href(locale, `/products/${p.slug}`)} className="hover:underline">
                        <bdi>{p.name}</bdi>
                      </Link>
                    </h2>
                    <p className="ltr font-mono text-xs text-muted">
                      {p.version ? `v${p.version}` : ""}
                      {p.revitVersions ? ` · Revit ${p.revitVersions}` : ""}
                    </p>
                  </div>
                </div>
                {p.hasFile ? <DownloadForm product={p.slug} t={t} /> : <p className="text-sm text-muted">{t.noFile}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-center text-sm text-muted">
          {t.getKey}{" "}
          <Link href={href(locale, "/pricing")} className="text-accent-fg hover:underline">
            {dict.nav.pricing}
          </Link>{" "}
          ·{" "}
          <Link href={href(locale, "/trial")} className="text-accent-fg hover:underline">
            {dict.nav.freeTrial}
          </Link>
        </p>
      </div>
    </>
  );
}
