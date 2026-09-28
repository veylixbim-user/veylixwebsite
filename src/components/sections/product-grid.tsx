import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { productSlugs, products, revitVersions } from "@/lib/catalog";
import { href } from "@/lib/links";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { ProductIcon } from "@/components/brand/product-icon";
import { ProductArt } from "@/components/mockups/product-art";
import { SpotlightGroup } from "@/components/motion/spotlight";
import { Reveal } from "@/components/motion/reveal";

export function ProductGrid({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.products;
  return (
    <section id="products" aria-labelledby="products-title" className="relative cv-auto py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader id="products-title" eyebrow={t.eyebrow} title={t.title} sub={t.sub} />

        <SpotlightGroup className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productSlugs.map((slug, i) => {
            const p = products[slug];
            const c = t.items[slug];
            const isBundle = slug === "bundle";
            return (
              <Reveal key={slug} delay={(i % 3) * 0.08} className="h-full">
                <article
                  className={cn(
                    "spotlight group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface p-1.5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1",
                    isBundle
                      ? "gradient-border border-transparent shadow-[0_0_60px_-20px_var(--glow)]"
                      : "border-border hover:border-border-strong hover:shadow-[0_20px_60px_-30px_var(--glow)]",
                  )}
                >
                  <div className="bg-blueprint relative h-36 overflow-hidden rounded-xl border border-border bg-bg-elevated">
                    <div className="absolute inset-0 p-4">
                      <ProductArt slug={slug} />
                    </div>
                    {isBundle ? (
                      <Badge variant="accent" size="sm" className="absolute end-3 top-3">
                        {t.bundleBadge}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col p-4 pt-5">
                    <div className="flex items-center gap-3">
                      <ProductIcon slug={slug} accent={p.accent} />
                      <div>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{c.category}</p>
                        <h3 className="ltr text-lg font-semibold tracking-tight text-fg">
                          <Link href={href(locale, `/products/${slug}`)} className="after:absolute after:inset-0 after:content-['']">
                            {p.name}
                          </Link>
                        </h3>
                      </div>
                    </div>
                    <p className="mt-4 text-[15px] leading-relaxed text-fg-soft">{c.tagline}</p>
                    {isBundle ? <p className="mt-2 text-sm font-medium text-accent-fg">{t.bundleSave}</p> : null}

                    <div className="mt-auto pt-6">
                      <div className="flex flex-wrap items-center gap-1" aria-label={`${t.compatible} ${revitVersions[0]}–${revitVersions[revitVersions.length - 1]}`}>
                        <span className="me-1 font-mono text-[10px] text-muted">{t.compatible}</span>
                        {revitVersions.map((v) => (
                          <Badge key={v} variant="mono" size="sm" className="px-1.5">
                            {v}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-fg">
                          {dict.common.learnMore}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden />
                        </span>
                        <span className="text-end">
                          <span className="ltr block font-mono text-sm font-semibold text-fg">{c.metric.value}</span>
                          <span className="block text-[11px] text-muted">{c.metric.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </SpotlightGroup>
      </div>
    </section>
  );
}
