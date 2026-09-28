"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Download, Sparkles, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { Billing } from "@/lib/catalog-types";
import { formatEGP } from "@/lib/format";
import { href } from "@/lib/links";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { DownloadForm } from "@/components/forms/download-form";
import { useUI } from "@/components/providers/site-providers";

export function BuyBox({
  locale,
  product,
  t,
  common,
  pricing,
  download,
}: {
  locale: Locale;
  product: { id: string; slug: string; name: string; priceMonthly: number | null; priceYearly: number | null; hasFile: boolean };
  t: Dictionary["productPage"];
  common: Dictionary["common"];
  pricing: Dictionary["pricing"];
  download: Dictionary["download"];
}) {
  const { shop } = useUI();
  const options = (["monthly", "yearly"] as const).filter((b) => (b === "monthly" ? product.priceMonthly : product.priceYearly) != null);
  const [billing, setBilling] = React.useState<Billing>(options[0] ?? "monthly");
  const price = billing === "monthly" ? product.priceMonthly : product.priceYearly;

  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
      {options.length > 1 ? (
        <div role="radiogroup" aria-label={t.billing} className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg-elevated p-1 text-sm">
          {options.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={cn("h-9 rounded-lg font-medium transition-colors", billing === b ? "bg-surface-3 text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:text-fg")}
            >
              {b === "monthly" ? common.monthly : common.yearly}
            </button>
          ))}
        </div>
      ) : null}
      {price != null ? (
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatEGP(price, locale)}</span>
          <span className="text-sm text-muted">{billing === "monthly" ? common.perMonth : common.perYear}</span>
        </p>
      ) : (
        <p className="text-2xl font-semibold">{t.noPrice}</p>
      )}
      <p className="text-xs text-muted">
        {t.perDevice}
        {price != null && shop.vatRate > 0 ? ` · ${common.exclVat}` : ""}
      </p>
      {price != null ? <AddToCartButton productId={product.id} billing={billing} label={t.buy} addedLabel={pricing.added} className="w-full" /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button variant="secondary" disabled={!product.hasFile} className={shop.trialsEnabled ? "" : "col-span-2"}>
              <Download aria-hidden /> {t.download}
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="pop fixed inset-x-0 top-[15vh] z-[81] mx-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border-strong bg-bg-elevated p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold">
                    {t.download} <span className="ltr">{product.name}</span>
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">{download.sub}</Dialog.Description>
                </div>
                <Dialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label={common.close}>
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <div className="mt-5">
                <DownloadForm product={product.slug} t={download} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {shop.trialsEnabled ? (
          <Button asChild variant="ghost">
            <Link href={`${href(locale, "/trial")}?product=${product.slug}`}>
              <Sparkles aria-hidden /> {common.freeTrial}
            </Link>
          </Button>
        ) : null}
      </div>
      {!product.hasFile ? <p className="text-xs text-muted">{t.noFile}</p> : null}
    </div>
  );
}
