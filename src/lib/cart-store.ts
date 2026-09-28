import type { Billing } from "./catalog-types";
import { cartItemId, type CartItem } from "./pricing";

const KEY = "veylix-cart-v2";
const EMPTY: CartItem[] = [];
const PRODUCT_ID = /^p_[a-z0-9]{6,32}$/;

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return EMPTY;
  const out: CartItem[] = [];
  for (const raw of value.slice(0, 20)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const productId = String(r.productId ?? "");
    const billing = r.billing === "yearly" ? "yearly" : r.billing === "monthly" ? "monthly" : null;
    if (!PRODUCT_ID.test(productId) || !billing) continue;
    const quantity = Math.min(50, Math.max(1, Math.floor(Number(r.quantity) || 1)));
    out.push({ id: cartItemId(productId, billing), productId, billing, quantity });
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
  add(productId: string, billing: Billing, quantity = 1) {
    load();
    const id = cartItemId(productId, billing);
    const existing = items.find((i) => i.id === id);
    if (existing) commit(items.map((i) => (i.id === id ? { ...i, quantity: Math.min(50, i.quantity + quantity) } : i)));
    else commit([...items, { id, productId, billing, quantity }]);
  },
  setQuantity(id: string, quantity: number) {
    if (quantity < 1) return cartStore.remove(id);
    commit(items.map((i) => (i.id === id ? { ...i, quantity: Math.min(50, Math.floor(quantity)) } : i)));
  },
  remove(id: string) {
    commit(items.filter((i) => i.id !== id));
  },
  clear() {
    commit(EMPTY);
  },
};
