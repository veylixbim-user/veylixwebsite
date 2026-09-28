"use client";

import * as React from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { BillingCycle, PluginSlug, PurchasablePlanId } from "@/lib/catalog";
import { cartStore } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { useUI } from "@/components/providers/site-providers";

export function AddToCartButton({
  plan,
  billing = "yearly",
  plugin,
  label,
  addedLabel,
  variant = "primary",
  size = "lg",
  className,
}: {
  plan: PurchasablePlanId;
  billing?: BillingCycle;
  plugin?: PluginSlug;
  label: string;
  addedLabel: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  className?: string;
}) {
  const { setCartOpen } = useUI();
  const [added, setAdded] = React.useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        cartStore.add({ plan, billing, plugin });
        setAdded(true);
        setCartOpen(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
    >
      {added ? <Check aria-hidden /> : <ShoppingBag aria-hidden />}
      {added ? addedLabel : label}
    </Button>
  );
}
