"use client";

import * as React from "react";
import { Direction } from "radix-ui";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { cartStore } from "@/lib/cart-store";
import type { CartItem } from "@/lib/pricing";
import type { Locale } from "@/i18n/config";
import type { CatalogItem } from "@/lib/catalog-types";

export type ShopSettings = {
  vatRate: number;
  trialsEnabled: boolean;
  trialDays: number;
  activationDays: number;
  instapayNumber: string;
  instapayName: string;
  /** Optional InstaPay payment link (https) and its QR code (inline SVG made on the server). */
  instapayLink: string;
  instapayQr: string;
  /** Which payment methods the checkout offers right now. */
  methods: import("@/lib/payment-methods").MethodAvailability;
};

type UIContextValue = {
  locale: Locale;
  catalog: Map<string, CatalogItem>;
  products: CatalogItem[];
  shop: ShopSettings;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const UIContext = React.createContext<UIContextValue | null>(null);

export function SiteProviders({
  locale,
  dir,
  products,
  shop,
  children,
}: {
  locale: Locale;
  dir: "ltr" | "rtl";
  products: CatalogItem[];
  shop: ShopSettings;
  children: React.ReactNode;
}) {
  const [cartOpen, setCartOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The Revit plugin's "Buy" button opens the site with ?device=<PC id>. Remember it for this visit so checkout
  // can refuse to sell the same plugin twice to that PC.
  React.useEffect(() => {
    try {
      const device = new URLSearchParams(window.location.search).get("device");
      if (device && /^W[12]-[0-9A-Fa-f]{40}$/.test(device)) window.sessionStorage.setItem("veylix-device", device);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const catalog = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const value = React.useMemo(
    () => ({ locale, catalog, products, shop, cartOpen, setCartOpen, searchOpen, setSearchOpen }),
    [locale, catalog, products, shop, cartOpen, searchOpen],
  );

  return (
    <Direction.Provider dir={dir}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation} strict>
          <UIContext.Provider value={value}>{children}</UIContext.Provider>
        </LazyMotion>
      </MotionConfig>
    </Direction.Provider>
  );
}

export function useUI() {
  const ctx = React.useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <SiteProviders>");
  return ctx;
}

export function useCart(): CartItem[] {
  return React.useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}
