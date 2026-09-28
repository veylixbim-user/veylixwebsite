import { plans, VAT_RATE, type BillingCycle, type PluginSlug, type PurchasablePlanId } from "./catalog";

export type CartItem = {
  id: string;
  plan: PurchasablePlanId;
  billing: BillingCycle;
  quantity: number;
  /** Starter licenses one plugin of the customer's choice. */
  plugin?: PluginSlug;
};

export function unitPrice(item: Pick<CartItem, "plan" | "billing">) {
  const price = plans[item.plan].price;
  if (!price) throw new Error(`Plan ${item.plan} has no list price`);
  return price[item.billing];
}

export function lineTotal(item: CartItem) {
  return unitPrice(item) * item.quantity;
}

export function totals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

export function cartItemId(plan: PurchasablePlanId, billing: BillingCycle, plugin?: PluginSlug) {
  return [plan, billing, plugin].filter(Boolean).join(":");
}
