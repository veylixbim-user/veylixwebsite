"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, NavigationMenu } from "radix-ui";
import { ArrowUpRight, ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { ProductSlug } from "@/lib/catalog";
import { href } from "@/lib/links";
import { cn, fill } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ProductIcon } from "@/components/brand/product-icon";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/section";
import { useCart, useUI } from "@/components/providers/site-providers";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";

export type NavProduct = {
  slug: ProductSlug;
  name: string;
  tagline: string;
  category: string;
  accent: "cyan" | "violet" | "mint";
};

type Props = {
  locale: Locale;
  nav: Dictionary["nav"];
  products: NavProduct[];
};

export function Navbar({ locale, nav, products }: Props) {
  const pathname = usePathname();
  const { setCartOpen, setSearchOpen } = useUI();
  const items = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: nav.pricing, path: "/pricing" },
    { label: nav.docs, path: "/docs" },
    { label: nav.changelog, path: "/changelog" },
    { label: nav.enterprise, path: "/enterprise" },
  ];

  const isActive = (path: string) => pathname === href(locale, path) || pathname?.startsWith(href(locale, path) + "/");

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "glass border-b border-border" : "border-b border-transparent",
      )}
    >
      <nav aria-label="Main" className="container-page flex h-16 items-center gap-4">
        <Link href={href(locale)} aria-label={nav.home} className="me-2 rounded-lg">
          <Logo />
        </Link>

        {/* Desktop links */}
        <NavigationMenu.Root className="relative hidden lg:block" delayDuration={80}>
          <NavigationMenu.List className="flex items-center gap-0.5">
            <NavigationMenu.Item className="relative">
              <NavigationMenu.Trigger className="group inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-fg data-[state=open]:text-fg">
                {nav.products}
                <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="absolute start-0 top-full pt-3">
                <div className="w-[640px] overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{nav.productsMenuTitle}</span>
                    <NavigationMenu.Link asChild>
                      <Link href={href(locale, "/pricing")} className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:underline">
                        {nav.productsMenuAll}
                        <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                      </Link>
                    </NavigationMenu.Link>
                  </div>
                  <ul className="grid grid-cols-2 gap-1 p-2">
                    {products.map((p) => (
                      <li key={p.slug}>
                        <NavigationMenu.Link asChild>
                          <Link
                            href={href(locale, `/products/${p.slug}`)}
                            className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                          >
                            <ProductIcon slug={p.slug} accent={p.accent} size="sm" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                                <span className="ltr">{p.name}</span>
                                {p.slug === "bundle" ? <span className="rounded-full bg-accent/15 px-1.5 py-px text-[10px] font-semibold text-accent-fg">★</span> : null}
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{p.tagline}</span>
                            </span>
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            {links.map((l) => (
              <NavigationMenu.Item key={l.path}>
                <NavigationMenu.Link asChild active={isActive(l.path)}>
                  <Link
                    href={href(locale, l.path)}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-fg data-[active]:text-fg"
                  >
                    {l.label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-surface/60 ps-3 pe-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg md:inline-flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="whitespace-nowrap lg:hidden xl:inline">{nav.search}</span>
            <Kbd className="whitespace-nowrap xl:ms-4">Ctrl K</Kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={nav.search}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg md:hidden"
          >
            <Search className="size-[18px]" aria-hidden />
          </button>
          <ThemeToggle label={nav.themeToggle} className="hidden sm:inline-flex" />
          <LanguageToggle locale={locale} label={nav.switchLanguage} short={nav.languageShort} name={nav.languageName} className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={fill(nav.openCart, { count })}
            className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ShoppingBag className="size-[18px]" aria-hidden />
            {count > 0 ? (
              <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-on-accent">
                {count}
              </span>
            ) : null}
          </button>
          <Button asChild size="sm" className="ms-2 hidden sm:inline-flex">
            <Link href={href(locale, "/trial")}>
              <span className="hidden xl:inline">{nav.trial}</span>
              <span className="xl:hidden">{nav.trialShort}</span>
            </Link>
          </Button>

          {/* Mobile menu */}
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={nav.openMenu}
                className="inline-flex size-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2 lg:hidden"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
              <Dialog.Content className="sheet sheet-top fixed inset-x-0 top-0 z-[61] max-h-[100dvh] overflow-y-auto border-b border-border bg-bg-elevated pb-8">
                <Dialog.Title className="sr-only">{nav.menu}</Dialog.Title>
                <Dialog.Description className="sr-only">{nav.searchHint}</Dialog.Description>
                <div className="container-page flex h-16 items-center justify-between">
                  <Logo />
                  <Dialog.Close asChild>
                    <button type="button" aria-label={nav.closeMenu} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface-2">
                      <X className="size-5" aria-hidden />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="container-page grid gap-6">
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{nav.products}</p>
                    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {products.map((p) => (
                        <li key={p.slug}>
                          <Link
                            href={href(locale, `/products/${p.slug}`)}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface-2"
                          >
                            <ProductIcon slug={p.slug} accent={p.accent} size="sm" />
                            <span className="ltr text-sm font-medium">{p.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ul className="grid gap-1 border-t border-border pt-4">
                    {links.map((l) => (
                      <li key={l.path}>
                        <Link
                          href={href(locale, l.path)}
                          onClick={() => setMobileOpen(false)}
                          className="flex h-11 items-center rounded-xl px-2.5 text-base font-medium hover:bg-surface-2"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    <LanguageToggle locale={locale} label={nav.switchLanguage} short={nav.languageShort} name={nav.languageName} variant="full" className="border border-border" />
                    <ThemeToggle label={nav.themeToggle} className="border border-border" />
                  </div>
                  <Button asChild size="lg" className="w-full">
                    <Link href={href(locale, "/trial")} onClick={() => setMobileOpen(false)}>
                      {nav.trial}
                    </Link>
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  );
}
