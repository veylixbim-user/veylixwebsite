"use client";

import * as React from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Billing } from "@/lib/catalog-types";
import { cartStore } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { useUI } from "@/components/providers/site-providers";

export function AddToCartButton({
  productId,
  billing,
  label,
  addedLabel,
  variant = "primary",
  size = "lg",
  className,
}: {
  productId: string;
  billing: Billing;
  label: string;
  addedLabel: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
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
        cartStore.add(productId, billing);
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
