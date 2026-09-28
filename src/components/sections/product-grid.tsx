import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { PublicProduct } from "@/lib/server/products";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { ProductIcon } from "@/components/brand/product-icon";
import { ProductArt } from "@/components/mockups/product-art";
import { SpotlightGroup } from "@/components/motion/spotlight";
import { Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/forms/newsletter-form";

export function localized(p: PublicProduct, locale: Locale) {
  const ar = locale === "ar";
  return {
    tagline: (ar ? p.taglineAr || p.taglineEn : p.taglineEn || p.taglineAr) ?? "",
    description: (ar ? p.descriptionAr || p.descriptionEn : p.descriptionEn || p.descriptionAr) ?? "",
    features: ar ? (p.featuresAr.length ? p.featuresAr : p.featuresEn) : p.featuresEn.length ? p.featuresEn : p.featuresAr,
  };
}

export function ProductGrid({ locale, dict, products }: { locale: Locale; dict: Dictionary; products: PublicProduct[] }) {
  const t = dict.products;
  return (
    <section id="products" aria-labelledby="products-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader id="products-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />

        {products.length === 0 ? (
          <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-dashed border-border-strong bg-surface/50 p-8 text-center">
            <LogoMark className="mx-auto size-12" />
            <p className="mt-5 text-lg font-semibold">{t.emptyTitle}</p>
            <p className="mt-1 text-sm text-muted">{t.emptyBody}</p>
            <div className="mx-auto mt-6 max-w-sm text-start">
              <NewsletterForm t={dict.newsletter} locale={locale} />
            </div>
          </div>
        ) : (
          <SpotlightGroup className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => {
              const c = localized(p, locale);
              const price = p.priceMonthly ?? p.priceYearly;
              return (
                <Reveal key={p.id} delay={(i % 3) * 0.08} className="h-full">
                  <article className="spotlight group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-1.5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_20px_60px_-30px_var(--glow)]">
                    <div className="bg-blueprint relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-bg-elevated">
                      {p.art ? (
                        <div className="absolute inset-0 p-5">
                          <ProductArt art={p.art} />
                        </div>
                      ) : p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <LogoMark className="absolute inset-0 m-auto size-16 opacity-80" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        {p.art ? <ProductIcon art={p.art} size="sm" /> : null}
                        <h3 className="ltr me-auto text-lg font-semibold tracking-tight text-fg">
                          <Link href={href(locale, `/products/${p.slug}`)} className="after:absolute after:inset-0 after:content-['']">
                            {p.name}
                          </Link>
                        </h3>
                        {p.version ? (
                          <Badge variant="mono" size="sm" className="ltr">
                            v{p.version}
                          </Badge>
                        ) : null}
                      </div>
                      {c.tagline ? <p className="mt-2 text-[15px] leading-relaxed text-fg-soft">{c.tagline}</p> : null}
                      <div className="mt-auto pt-6" />
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-fg">
                          {t.viewDetails}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden />
                        </span>
                        {price != null ? (
                          <span className="text-end text-sm">
                            <span className="block text-[11px] text-muted">{t.from}</span>
                            <span className="font-semibold tabular-nums">
                              {formatEGP(price, locale)}
                              <span className="text-xs font-normal text-muted">{p.priceMonthly != null ? dict.common.perMonth : dict.common.perYear}</span>
                            </span>
                          </span>
                        ) : null}
                      </div>
                      {p.revitVersions ? <p className="ltr mt-3 font-mono text-[11px] text-muted">Revit {p.revitVersions}</p> : null}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </SpotlightGroup>
        )}
      </div>
    </section>
  );
}
