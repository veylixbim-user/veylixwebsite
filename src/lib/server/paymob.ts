import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paymob (https://paymob.com) — a CBE-licensed Egyptian payment gateway. One integration gives customers card,
 * mobile-wallet (Vodafone Cash, …), and — where Paymob has enabled it on the merchant account — InstaPay
 * payments, confirmed automatically.
 *
 * Flow: we create a payment "intention" server-side with the secret key, send the customer to Paymob's hosted
 * Unified Checkout, and Paymob tells us the result with an HMAC-SHA512-signed callback. Only a callback whose
 * signature matches (or Paymob's own API, queried with our key) can mark an order paid.
 *
 * Secrets live only in the hosting environment, never in the database or the browser:
 *   PAYMOB_SECRET_KEY   Dashboard → Settings → API Keys → Secret Key  (sk_live_… / sk_test_…)
 *   PAYMOB_PUBLIC_KEY   Dashboard → Settings → API Keys → Public Key  (pk_live_… / pk_test_…)
 *   PAYMOB_HMAC_SECRET  Dashboard → Settings → API Keys → HMAC
 *   PAYMOB_API_KEY      optional: lets the site ask Paymob about a payment whose callback never arrived
 *   PAYMOB_BASE_URL     optional: region (default https://accept.paymob.com for Egypt)
 */

export type PaymobEnv = {
  baseUrl: string;
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  apiKey: string | null;
  testMode: boolean;
};

export class PaymobError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PaymobError";
    this.status = status;
  }
}

function cleanEnv(name: string) {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

/** The Paymob account configured in the hosting environment, or null when online payments aren't set up. */
export function paymobEnv(): PaymobEnv | null {
  const secretKey = cleanEnv("PAYMOB_SECRET_KEY");
  const publicKey = cleanEnv("PAYMOB_PUBLIC_KEY");
  const hmacSecret = cleanEnv("PAYMOB_HMAC_SECRET");
  if (!secretKey || !publicKey || !hmacSecret) return null;
  let baseUrl = (cleanEnv("PAYMOB_BASE_URL") ?? "https://accept.paymob.com").replace(/\/+$/, "");
  try {
    const u = new URL(baseUrl);
    // Plain http only for a local test double; real money always goes over TLS.
    const local = u.hostname === "127.0.0.1" || u.hostname === "localhost";
    if (u.protocol !== "https:" && !(local && process.env.PAYMOB_ALLOW_INSECURE_LOCAL === "1")) return null;
    baseUrl = u.origin;
  } catch {
    return null;
  }
  return {
    baseUrl,
    secretKey,
    publicKey,
    hmacSecret,
    apiKey: cleanEnv("PAYMOB_API_KEY"),
    testMode: /_test_/.test(secretKey) || /_test_/.test(publicKey),
  };
}

/** Integration IDs are whole numbers; anything else in the admin setting is ignored. */
export function parseIntegrationIds(...values: string[]): number[] {
  const ids = new Set<number>();
  for (const value of values)
    for (const part of value.split(/[\s,;]+/)) {
      if (!/^\d{1,12}$/.test(part)) continue;
      const n = Number(part);
      if (Number.isSafeInteger(n) && n > 0) ids.add(n);
    }
  return [...ids];
}

async function call<T>(env: PaymobEnv, path: string, init: { method: "GET" | "POST"; body?: unknown; auth?: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.baseUrl}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.auth ? { Authorization: init.auth } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new PaymobError(`Paymob is unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await res.text();
  if (!res.ok) throw new PaymobError(`Paymob ${path} answered ${res.status}: ${text.slice(0, 400)}`, res.status);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PaymobError(`Paymob ${path} returned something that isn't JSON.`, res.status);
  }
}

export type IntentionInput = {
  amountCents: number;
  specialReference: string;
  integrationIds: number[];
  items: { name: string; amountCents: number; quantity: number; description?: string }[];
  customer: { name: string; email: string; phone: string };
  notificationUrl: string;
  redirectionUrl: string;
  expiresInSeconds?: number;
};

export type Intention = { intentionId: string; providerOrderId: string | null; checkoutUrl: string };

/** "01012345678" → "+201012345678" (Paymob requires a phone number in billing data). */
function intlPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `+2${digits}`;
  if (/^201\d{9}$/.test(digits)) return `+${digits}`;
  return digits ? `+${digits}` : "+200000000000";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = (parts[0] ?? "Customer").slice(0, 50);
  const last = (parts.slice(1).join(" ") || first).slice(0, 50);
  return { first, last };
}

/** Creates a payment intention and returns the Paymob-hosted checkout URL to send the customer to. */
export async function createIntention(env: PaymobEnv, input: IntentionInput): Promise<Intention> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new PaymobError("Invalid amount.");
  if (input.integrationIds.length === 0) throw new PaymobError("No Paymob integration IDs are configured.");
  const itemsTotal = input.items.reduce((s, i) => s + i.amountCents * i.quantity, 0);
  const { first, last } = splitName(input.customer.name);
  const billing = {
    first_name: first,
    last_name: last,
    email: input.customer.email,
    phone_number: intlPhone(input.customer.phone),
    apartment: "NA",
    floor: "NA",
    street: "NA",
    building: "NA",
    shipping_method: "NA",
    postal_code: "NA",
    city: "NA",
    state: "NA",
    country: "EGY",
  };
  const data = await call<{ id?: unknown; client_secret?: unknown; intention_order_id?: unknown }>(env, "/v1/intention/", {
    method: "POST",
    auth: `Token ${env.secretKey}`,
    body: {
      amount: input.amountCents,
      currency: "EGP",
      payment_methods: input.integrationIds,
      // Paymob checks that the items add up to the amount; if they don't (they always should), send none.
      items:
        itemsTotal === input.amountCents
          ? input.items.map((i) => ({ name: i.name.slice(0, 50), amount: i.amountCents, quantity: i.quantity, description: (i.description ?? i.name).slice(0, 255) }))
          : [],
      billing_data: billing,
      customer: { first_name: first, last_name: last, email: input.customer.email },
      special_reference: input.specialReference,
      extras: { special_reference: input.specialReference },
      expiration: input.expiresInSeconds ?? 3600,
      notification_url: input.notificationUrl,
      redirection_url: input.redirectionUrl,
    },
  });
  const clientSecret = typeof data.client_secret === "string" ? data.client_secret : "";
  if (!/^[A-Za-z0-9_\-]{8,200}$/.test(clientSecret)) throw new PaymobError("Paymob did not return a usable client secret.");
  const intentionId = data.id == null ? "" : String(data.id).slice(0, 120);
  const orderId = data.intention_order_id;
  const providerOrderId = typeof orderId === "number" || (typeof orderId === "string" && /^\d{1,20}$/.test(orderId)) ? String(orderId) : null;
  const url = new URL(`${env.baseUrl}/unifiedcheckout/`);
  url.searchParams.set("publicKey", env.publicKey);
  url.searchParams.set("clientSecret", clientSecret);
  return { intentionId, providerOrderId, checkoutUrl: url.toString() };
}

/* ------------------------------------------------------------------------------------------------------------ */
/* HMAC                                                                                                           */
/* ------------------------------------------------------------------------------------------------------------ */

/** The fields Paymob signs on a "transaction processed" callback, in Paymob's documented order. */
const TXN_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function asText(value: unknown, nullAs: string) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null || value === undefined) return nullAs;
  if (typeof value === "object") return nullAs;
  return String(value);
}

function sign(secret: string, message: string) {
  return createHmac("sha512", secret).update(message, "utf8").digest("hex");
}

function sameHex(a: string, b: string) {
  if (!/^[0-9a-f]{128}$/.test(a) || !/^[0-9a-f]{128}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Checks the `hmac` query parameter of a POST callback against the transaction object (`body.obj`).
 * Empty/null values are tried both as "" and "null" (Paymob's own plugins differ); every candidate is an HMAC
 * computed with our secret, so trying two spellings gives an attacker nothing.
 */
export function verifyTransactionHmac(secret: string, obj: unknown, received: string | null): boolean {
  const hmac = (received ?? "").trim().toLowerCase();
  if (!hmac || !obj || typeof obj !== "object") return false;
  for (const nullAs of ["", "null"]) {
    const message = TXN_FIELDS.map((f) => asText(pick(obj, f), nullAs)).join("");
    if (sameHex(sign(secret, message), hmac)) return true;
  }
  return false;
}

/**
 * The same check for the customer's browser redirect (GET), where the fields arrive as query parameters and the
 * Paymob order id is called `order` (older docs: `order_id`).
 */
export function verifyRedirectHmac(secret: string, params: URLSearchParams): boolean {
  const hmac = (params.get("hmac") ?? "").trim().toLowerCase();
  if (!hmac) return false;
  const orderKeys = ["order", "order_id"].filter((k) => params.has(k));
  for (const orderKey of orderKeys) {
    const message = TXN_FIELDS.map((f) => params.get(f === "order.id" ? orderKey : f) ?? "").join("");
    if (sameHex(sign(secret, message), hmac)) return true;
  }
  return false;
}

/** For tests and the admin "check" tool: the signature Paymob would send for a transaction object. */
export function signTransaction(secret: string, obj: unknown) {
  return sign(secret, TXN_FIELDS.map((f) => asText(pick(obj, f), "")).join(""));
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Normalised transaction                                                                                         */
/* ------------------------------------------------------------------------------------------------------------ */

export type PaymobTransaction = {
  id: string;
  providerOrderId: string;
  merchantOrderId: string | null;
  amountCents: number;
  currency: string;
  success: boolean;
  pending: boolean;
  isAuth: boolean;
  isCapture: boolean;
  isVoided: boolean;
  isRefunded: boolean;
  hasParent: boolean;
  methodType: string;
  methodSubType: string;
  pan: string;
  createdAt: string | null;
};

const bool = (v: unknown) => v === true || v === "true";

/** From a POST callback's `obj` (or a transaction returned by Paymob's API). */
export function fromCallbackObject(obj: unknown): PaymobTransaction | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const order = (o.order && typeof o.order === "object" ? o.order : { id: o.order }) as Record<string, unknown>;
  const source = (o.source_data && typeof o.source_data === "object" ? o.source_data : {}) as Record<string, unknown>;
  const id = o.id == null ? "" : String(o.id);
  const providerOrderId = order.id == null ? "" : String(order.id);
  const amount = Number(o.amount_cents);
  if (!/^\d{1,20}$/.test(id) || !/^\d{1,20}$/.test(providerOrderId) || !Number.isSafeInteger(amount)) return null;
  return {
    id,
    providerOrderId,
    merchantOrderId: order.merchant_order_id == null ? null : String(order.merchant_order_id).slice(0, 80),
    amountCents: amount,
    currency: String(o.currency ?? "").toUpperCase(),
    success: bool(o.success),
    pending: bool(o.pending),
    isAuth: bool(o.is_auth),
    isCapture: bool(o.is_capture),
    isVoided: bool(o.is_voided),
    isRefunded: bool(o.is_refunded),
    hasParent: bool(o.has_parent_transaction),
    methodType: String(source.type ?? "").slice(0, 40),
    methodSubType: String(source.sub_type ?? "").slice(0, 40),
    pan: String(source.pan ?? "").slice(-4),
    createdAt: o.created_at == null ? null : String(o.created_at),
  };
}

/** From the redirect's query parameters (already HMAC-verified). */
export function fromRedirectParams(p: URLSearchParams): PaymobTransaction | null {
  return fromCallbackObject({
    id: p.get("id"),
    order: { id: p.get("order") ?? p.get("order_id"), merchant_order_id: p.get("merchant_order_id") },
    amount_cents: p.get("amount_cents"),
    currency: p.get("currency"),
    success: p.get("success"),
    pending: p.get("pending"),
    is_auth: p.get("is_auth"),
    is_capture: p.get("is_capture"),
    is_voided: p.get("is_voided"),
    is_refunded: p.get("is_refunded"),
    has_parent_transaction: p.get("has_parent_transaction"),
    source_data: { type: p.get("source_data.type"), sub_type: p.get("source_data.sub_type"), pan: p.get("source_data.pan") },
    created_at: p.get("created_at"),
  });
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Transaction inquiry (safety net when a callback never arrives)                                                 */
/* ------------------------------------------------------------------------------------------------------------ */

async function authToken(env: PaymobEnv) {
  if (!env.apiKey) return null;
  const data = await call<{ token?: unknown }>(env, "/api/auth/tokens", { method: "POST", body: { api_key: env.apiKey } });
  return typeof data.token === "string" && data.token.length > 10 ? data.token : null;
}

/**
 * Asks Paymob for the latest transaction on one of its orders. Returns null when inquiry isn't configured or
 * Paymob has nothing yet. The answer comes straight from Paymob over TLS with our API key, so it needs no HMAC.
 */
export async function inquireOrder(env: PaymobEnv, providerOrderId: string): Promise<PaymobTransaction | null> {
  const token = await authToken(env);
  if (!token) return null;
  const data = await call<unknown>(env, "/api/ecommerce/orders/transaction_inquiry", {
    method: "POST",
    auth: `Bearer ${token}`,
    body: { auth_token: token, order_id: Number(providerOrderId) },
  });
  const txn = fromCallbackObject(data);
  return txn && txn.providerOrderId === providerOrderId ? txn : null;
}
