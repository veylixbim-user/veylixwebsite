import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { isLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { productSlugs, products, purchasablePlans, type PurchasablePlanId } from "@/lib/catalog";
import { href } from "@/lib/links";
import { siteUrl } from "@/lib/site";
import { SiteProviders } from "@/components/providers/site-providers";
import { Navbar, type NavProduct } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CommandMenu, type CommandItem } from "@/components/layout/command-menu";
import { themeScript } from "@/components/layout/theme-toggle";
import { RevealObserver } from "@/components/motion/reveal-observer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter-sans", display: "swap" });
// IBM Plex Sans Arabic is self-hosted (public/fonts, @font-face in globals.css) so it can be
// preloaded on Arabic pages only — English pages never download it.
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap", preload: false });

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0B0F" },
    { media: "(prefers-color-scheme: light)", color: "#F6F7F9" },
  ],
  colorScheme: "dark light",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.meta.title, template: dict.meta.titleTemplate },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    applicationName: "VEYLIX",
    authors: [{ name: "VEYLIX" }],
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: "VEYLIX",
      locale: localeMeta[locale].ogLocale,
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeMeta[l].ogLocale),
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
    },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = await getDictionary(locale);
  const { dir, htmlLang } = localeMeta[locale];

  const navProducts: NavProduct[] = productSlugs.map((slug) => ({
    slug,
    name: products[slug].name,
    tagline: dict.products.items[slug].tagline,
    category: dict.products.items[slug].category,
    accent: products[slug].accent,
  }));

  const commandItems: CommandItem[] = [
    ...navProducts.map((p) => ({
      id: `product-${p.slug}`,
      group: "products" as const,
      label: p.name,
      hint: p.tagline,
      href: href(locale, `/products/${p.slug}`),
      product: { slug: p.slug, accent: p.accent },
      keywords: p.category,
    })),
    { id: "page-home", group: "pages", label: "VEYLIX", hint: dict.common.tagline, href: href(locale) },
    { id: "page-pricing", group: "pages", label: dict.nav.pricing, hint: dict.pricing.title, href: href(locale, "/pricing") },
    { id: "page-trial", group: "pages", label: dict.nav.trial, hint: dict.trial.sub, href: href(locale, "/trial") },
    { id: "page-enterprise", group: "pages", label: dict.nav.enterprise, hint: dict.enterprise.sub, href: href(locale, "/enterprise") },
    { id: "page-docs", group: "pages", label: dict.nav.docs, hint: dict.docs.sub, href: href(locale, "/docs") },
    { id: "page-changelog", group: "pages", label: dict.nav.changelog, hint: dict.changelog.sub, href: href(locale, "/changelog") },
    { id: "page-checkout", group: "pages", label: dict.checkout.title, hint: dict.checkout.sub, href: href(locale, "/checkout") },
    ...dict.docs.sections.flatMap((section, si) =>
      section.articles.map((a, ai) => ({
        id: `doc-${si}-${ai}`,
        group: "help" as const,
        label: a.title,
        hint: `${dict.nav.docs} · ${section.title}`,
        href: href(locale, "/docs"),
      })),
    ),
    ...dict.faq.items.map((f, i) => ({
      id: `faq-${i}`,
      group: "help" as const,
      label: f.q,
      hint: dict.faq.eyebrow,
      href: href(locale, "/#faq"),
    })),
  ];

  const planNames = Object.fromEntries(purchasablePlans.map((p) => [p, dict.pricing.plans[p].name])) as Record<PurchasablePlanId, string>;
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html
      lang={htmlLang}
      dir={dir}
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {locale === "ar" ? (
          // Headline weight only: the Arabic hero heading is the LCP element.
          <link rel="preload" href="/fonts/ibm-plex-sans-arabic-600.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        ) : null}
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="fixed start-4 top-3 z-[100] -translate-y-20 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-transform focus:translate-y-0"
        >
          {dict.common.skipToContent}
        </a>
        <SiteProviders locale={locale} dir={dir}>
          <Navbar locale={locale} nav={dict.nav} products={navProducts} />
          <main id="main" className="relative">
            {children}
          </main>
          <Footer locale={locale} dict={dict} />
          <CartDrawer
            locale={locale}
            t={dict.cart}
            common={{
              monthly: dict.common.monthly,
              yearly: dict.common.yearly,
              perMonth: dict.common.perMonth,
              perYear: dict.common.perYear,
              exclVat: dict.common.exclVat,
            }}
            planNames={planNames}
          />
          <RevealObserver />
          <CommandMenu items={commandItems} placeholder={dict.commandMenu.placeholder} empty={dict.commandMenu.empty} groups={dict.commandMenu.groups} />
        </SiteProviders>
        {plausible ? <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}
