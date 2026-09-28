"use client";

import * as React from "react";
import { Direction } from "radix-ui";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { cartStore } from "@/lib/cart-store";
import type { CartItem } from "@/lib/pricing";
import type { Locale } from "@/i18n/config";

type UIContextValue = {
  locale: Locale;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const UIContext = React.createContext<UIContextValue | null>(null);

export function SiteProviders({ locale, dir, children }: { locale: Locale; dir: "ltr" | "rtl"; children: React.ReactNode }) {
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

  const value = React.useMemo(() => ({ locale, cartOpen, setCartOpen, searchOpen, setSearchOpen }), [locale, cartOpen, searchOpen]);

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
