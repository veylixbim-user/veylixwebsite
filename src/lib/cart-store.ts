import { pluginSlugs, purchasablePlans, type PluginSlug, type PurchasablePlanId } from "./catalog";
import { cartItemId, type CartItem } from "./pricing";

const KEY = "veylix-cart-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

/** Validates untrusted cart data (localStorage, request bodies). Pure — safe on the server. */
export function sanitize(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return EMPTY;
  const out: CartItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const plan = r.plan as PurchasablePlanId;
    const billing = r.billing;
    const plugin = r.plugin as PluginSlug | undefined;
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(r.quantity) || 1)));
    if (!(purchasablePlans as readonly string[]).includes(plan)) continue;
    if (billing !== "monthly" && billing !== "yearly") continue;
    if (plan === "starter" && !(pluginSlugs as readonly string[]).includes(plugin ?? "")) continue;
    const p = plan === "starter" ? plugin : undefined;
    out.push({ id: cartItemId(plan, billing, p), plan, billing, quantity, plugin: p });
  }
  return out;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) items = sanitize(JSON.parse(raw));
  } catch {
    items = EMPTY;
  }
}

function commit(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — cart still works for this page view */
  }
  listeners.forEach((l) => l());
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY) return;
  try {
    items = sanitize(event.newValue ? JSON.parse(event.newValue) : []);
  } catch {
    items = EMPTY;
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot() {
    load();
    return items;
  },
  getServerSnapshot() {
    return EMPTY;
  },
  add(input: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) {
    load();
    const plugin = input.plan === "starter" ? input.plugin : undefined;
    const id = cartItemId(input.plan, input.billing, plugin);
    const existing = items.find((i) => i.id === id);
    if (existing) {
      commit(items.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, i.quantity + (input.quantity ?? 1)) } : i)));
    } else {
      commit([...items, { id, plan: input.plan, billing: input.billing, plugin, quantity: input.quantity ?? 1 }]);
    }
  },
  setQuantity(id: string, quantity: number) {
    if (quantity < 1) return cartStore.remove(id);
    commit(items.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, Math.floor(quantity)) } : i)));
  },
  remove(id: string) {
    commit(items.filter((i) => i.id !== id));
  },
  clear() {
    commit(EMPTY);
  },
};
