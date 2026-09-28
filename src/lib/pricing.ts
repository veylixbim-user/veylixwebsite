import type { Billing, CatalogItem } from "./catalog-types";

export type CartItem = {
  id: string;
  productId: string;
  billing: Billing;
  quantity: number;
};

export function cartItemId(productId: string, billing: Billing) {
  return `${productId}:${billing}`;
}

export function priceOf(product: CatalogItem | undefined, billing: Billing) {
  if (!product) return null;
  return billing === "yearly" ? product.priceYearly : product.priceMonthly;
}

/** Client-side estimate for the cart UI. The server always re-prices orders from the database. */
export function cartTotals(items: CartItem[], catalog: Map<string, CatalogItem>, vatRate: number) {
  const subtotal = items.reduce((sum, i) => sum + (priceOf(catalog.get(i.productId), i.billing) ?? 0) * i.quantity, 0);
  const vat = Math.round(subtotal * vatRate) / 100;
  return { subtotal, vat, total: subtotal + vat };
}
