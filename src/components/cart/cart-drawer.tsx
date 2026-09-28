"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { cartStore } from "@/lib/cart-store";
import { products, type PurchasablePlanId } from "@/lib/catalog";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { lineTotal, totals, unitPrice } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/brand/product-icon";
import { useCart, useUI } from "@/components/providers/site-providers";

type Props = {
  locale: Locale;
  t: Dictionary["cart"];
  common: Pick<Dictionary["common"], "monthly" | "yearly" | "perMonth" | "perYear" | "exclVat">;
  planNames: Record<PurchasablePlanId, string>;
};

export function CartDrawer({ locale, t, common, planNames }: Props) {
  const { cartOpen, setCartOpen } = useUI();
  const items = useCart();
  const { subtotal } = totals(items);

  return (
    <Dialog.Root open={cartOpen} onOpenChange={setCartOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="sheet-end fixed inset-y-0 end-0 z-[71] flex w-full max-w-md flex-col border-s border-border-strong bg-bg-elevated shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
              <ShoppingBag className="size-4 text-accent-fg" aria-hidden />
              {t.title}
            </Dialog.Title>
            <Dialog.Description className="sr-only">{t.vatNote}</Dialog.Description>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-2">
                <ShoppingBag className="size-6 text-muted" aria-hidden />
              </span>
              <p className="text-muted">{t.empty}</p>
              <Button asChild variant="secondary" onClick={() => setCartOpen(false)}>
                <Link href={href(locale, "/pricing")}>{t.emptyCta}</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
                {items.map((item) => {
                  const plugin = item.plugin ? products[item.plugin] : null;
                  return (
                    <li key={item.id} className="flex gap-4 py-5">
                      <ProductIcon slug={item.plugin ?? "bundle"} accent={plugin?.accent ?? "cyan"} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              <span className="ltr">VEYLIX {planNames[item.plan]}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {plugin ? (
                                <>
                                  {t.plugin}: <span className="ltr">{plugin.name}</span> ·{" "}
                                </>
                              ) : null}
                              {item.billing === "monthly" ? common.monthly : common.yearly}
                            </p>
                          </div>
                          <p className="text-end text-sm font-semibold tabular-nums">
                            {formatEGP(lineTotal(item), locale)}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-lg border border-border" role="group" aria-label={t.quantity}>
                            <button
                              type="button"
                              aria-label={t.decrease}
                              onClick={() => cartStore.setQuantity(item.id, item.quantity - 1)}
                              className="inline-flex size-8 items-center justify-center text-muted hover:text-fg"
                            >
                              <Minus className="size-3.5" aria-hidden />
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={t.increase}
                              onClick={() => cartStore.setQuantity(item.id, item.quantity + 1)}
                              className="inline-flex size-8 items-center justify-center text-muted hover:text-fg"
                            >
                              <Plus className="size-3.5" aria-hidden />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.quantity > 1 ? (
                              <span className="text-xs text-muted tabular-nums">
                                {formatEGP(unitPrice(item), locale)} {t.each}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => cartStore.remove(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              {t.remove}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-border bg-surface/50 px-5 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">{t.subtotal}</span>
                  <span className="text-xl font-semibold tabular-nums">{formatEGP(subtotal, locale)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{t.vatNote}</p>
                <Button asChild size="lg" className="mt-4 w-full">
                  <Link href={href(locale, "/checkout")} onClick={() => setCartOpen(false)}>
                    {t.checkout}
                  </Link>
                </Button>
                <button type="button" onClick={() => setCartOpen(false)} className="mt-3 w-full text-center text-sm text-muted hover:text-fg">
                  {t.continue}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
