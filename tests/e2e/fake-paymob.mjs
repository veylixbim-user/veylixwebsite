// A stand-in for Paymob, for testing the website's payment flow without real money or network access.
// It implements just what the site uses — create an intention, the hosted checkout page, signed callbacks and redirects,
// transaction inquiry — and signs everything with its OWN independent implementation of Paymob's HMAC rules
// (plain string concatenation in the documented order), so a mistake in the site's code can't hide behind a shared bug.
//
//   node tests/e2e/fake-paymob.mjs            (port 4010, see FAKE_PAYMOB_PORT)
//
// Test controls (not part of Paymob):
//   GET  /__test/intentions                 every intention the site created (request body included)
//   POST /__test/next-error {status}        make the next create-intention call fail
//   POST /__test/deliver {orderId, ...}     send a callback for an order:
//        outcome: success | declined | pending | refunded | voided   (default success)
//        badHmac: true       sign with the wrong secret
//        amountCents: n      report a different amount (signed correctly)
//        txnId: n            reuse a transaction id
//        unknownOrder: true  use a Paymob order id the site has never seen
//        type: "TOKEN"       send a different callback type
//   POST /__test/settle {orderId, outcome}  record a result for inquiry WITHOUT sending any callback
import http from "node:http";
import { createHmac, randomBytes } from "node:crypto";

const PORT = Number(process.env.FAKE_PAYMOB_PORT || 4010);
const SECRET_KEY = process.env.PAYMOB_SECRET_KEY || "sk_test_fake";
const PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY || "pk_test_fake";
const HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || "fake-hmac-secret";
const API_KEY = process.env.PAYMOB_API_KEY || "fake-api-key";

const intentions = []; // {id, clientSecret, orderId, body}
const byOrder = new Map(); // paymob order id -> intention
const byClientSecret = new Map();
const txns = new Map(); // paymob order id -> last transaction object
let nextOrder = 9000 + (Date.now() % 1_000_000);
let nextTxn = 70000 + (Date.now() % 1_000_000);
let failNext = null;

const send = (res, status, data, headers = {}) => {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  res.writeHead(status, { "content-type": typeof data === "string" ? "text/html; charset=utf-8" : "application/json", ...headers });
  res.end(body);
};
const readBody = (req) => new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b)); });

function makeTxn(intent, { outcome = "success", txnId, amountCents, orderIdOverride } = {}) {
  const refunded = outcome === "refunded";
  const voided = outcome === "voided";
  const success = outcome === "success" || refunded || voided;
  const pending = outcome === "pending";
  const kiosk = intent.body.payment_methods.includes(Number(process.env.FAKE_KIOSK_ID || 333));
  return {
    amount_cents: amountCents ?? intent.body.amount,
    created_at: "2026-09-29T10:15:30.123456",
    currency: intent.body.currency,
    error_occured: false,
    has_parent_transaction: refunded || voided,
    id: txnId ?? nextTxn++,
    integration_id: intent.body.payment_methods[0],
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: refunded,
    is_standalone_payment: true,
    is_voided: voided,
    order: { id: orderIdOverride ?? intent.orderId, merchant_order_id: intent.body.special_reference },
    owner: 4705,
    pending,
    source_data: kiosk ? { pan: "", sub_type: "AGGREGATOR", type: "aggregator" } : { pan: "2346", sub_type: "MasterCard", type: "card" },
    success,
  };
}

// Paymob's documented field order — written out longhand on purpose.
function signObj(o, secret = HMAC_SECRET) {
  const s =
    String(o.amount_cents) + o.created_at + o.currency + o.error_occured + o.has_parent_transaction + o.id + o.integration_id +
    o.is_3d_secure + o.is_auth + o.is_capture + o.is_refunded + o.is_standalone_payment + o.is_voided + o.order.id + o.owner +
    o.pending + o.source_data.pan + o.source_data.sub_type + o.source_data.type + o.success;
  return createHmac("sha512", secret).update(s).digest("hex");
}

function redirectQuery(o) {
  const q = new URLSearchParams({
    amount_cents: String(o.amount_cents), created_at: o.created_at, currency: o.currency, error_occured: String(o.error_occured),
    has_parent_transaction: String(o.has_parent_transaction), id: String(o.id), integration_id: String(o.integration_id),
    is_3d_secure: String(o.is_3d_secure), is_auth: String(o.is_auth), is_capture: String(o.is_capture), is_refunded: String(o.is_refunded),
    is_standalone_payment: String(o.is_standalone_payment), is_voided: String(o.is_voided), order: String(o.order.id), owner: String(o.owner),
    pending: String(o.pending), "source_data.pan": o.source_data.pan, "source_data.sub_type": o.source_data.sub_type,
    "source_data.type": o.source_data.type, success: String(o.success), merchant_order_id: o.order.merchant_order_id,
  });
  q.set("hmac", signObj(o));
  return q.toString();
}

async function deliverCallback(intent, opts) {
  const obj = makeTxn(intent, opts);
  txns.set(intent.orderId, obj);
  const hmac = signObj(obj, opts.badHmac ? "not-the-secret" : HMAC_SECRET);
  const url = new URL(intent.body.notification_url);
  url.searchParams.set("hmac", hmac);
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: opts.type ?? "TRANSACTION", obj }) });
  return { status: res.status, body: await res.text(), obj };
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (req.method === "POST" && path === "/v1/intention/") {
      if (req.headers.authorization !== `Token ${SECRET_KEY}`) return send(res, 401, { detail: "Authentication credentials were not provided or are invalid." });
      if (failNext) { const s = failNext; failNext = null; return send(res, s, { detail: "simulated outage" }); }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { detail: "bad json" }); }
      if (!Number.isInteger(body.amount) || body.amount <= 0) return send(res, 400, { amount: ["A valid integer is required."] });
      if (!Array.isArray(body.payment_methods) || body.payment_methods.length === 0 || !body.payment_methods.every(Number.isInteger)) return send(res, 400, { payment_methods: ["Invalid."] });
      if (!body.billing_data?.phone_number) return send(res, 400, { billing_data: { phone_number: ["This field is required."] } });
      if (Array.isArray(body.items) && body.items.length && body.items.reduce((s, i) => s + i.amount * i.quantity, 0) !== body.amount) return send(res, 400, { detail: "Sum of items amounts should equal the amount" });
      const orderId = nextOrder++;
      const clientSecret = "csk_test_" + randomBytes(9).toString("hex");
      const intent = { id: "int_" + orderId, clientSecret, orderId, body };
      intentions.push(intent);
      byOrder.set(orderId, intent);
      byClientSecret.set(clientSecret, intent);
      return send(res, 201, { id: intent.id, client_secret: clientSecret, intention_order_id: orderId, status: "intended", confirmed: false, payment_methods: body.payment_methods });
    }

    if (req.method === "GET" && path === "/unifiedcheckout/") {
      const intent = byClientSecret.get(url.searchParams.get("clientSecret") || "");
      if (url.searchParams.get("publicKey") !== PUBLIC_KEY || !intent) return send(res, 404, "<h1>Unknown payment</h1>");
      const cs = intent.clientSecret;
      const btn = (outcome, label) => `<a id="${outcome}" href="/__pay?cs=${cs}&outcome=${outcome}" style="display:inline-block;margin:6px;padding:10px 16px;border:1px solid #888;border-radius:8px">${label}</a>`;
      return send(res, 200, `<!doctype html><title>Fake Paymob checkout</title><h1>Fake Paymob — pay EGP ${(intent.body.amount / 100).toFixed(2)}</h1>
        <p id="ref">${intent.body.special_reference}</p>${btn("success", "Pay")}${btn("declined", "Decline")}${btn("pending", "Pay later (kiosk)")}${btn("close", "Go back without paying")}`);
    }

    if (req.method === "GET" && path === "/__pay") {
      const intent = byClientSecret.get(url.searchParams.get("cs") || "");
      if (!intent) return send(res, 404, "unknown");
      const outcome = url.searchParams.get("outcome");
      const redirect = new URL(intent.body.redirection_url);
      if (outcome === "close") return send(res, 302, "", { location: redirect.toString() });
      const callbackFirst = url.searchParams.get("callback") !== "0";
      let obj;
      if (callbackFirst) obj = (await deliverCallback(intent, { outcome })).obj;
      else { obj = makeTxn(intent, { outcome }); txns.set(intent.orderId, obj); }
      return send(res, 302, "", { location: `${redirect.origin}${redirect.pathname}?${redirectQuery(obj)}` });
    }

    if (req.method === "POST" && path === "/api/auth/tokens") {
      const b = JSON.parse((await readBody(req)) || "{}");
      return b.api_key === API_KEY ? send(res, 201, { token: "tok_fake_token_1" }) : send(res, 401, { detail: "bad api key" });
    }

    if (req.method === "POST" && path === "/api/ecommerce/orders/transaction_inquiry") {
      if (req.headers.authorization !== "Bearer tok_fake_token_1") return send(res, 401, { detail: "unauthorized" });
      const b = JSON.parse((await readBody(req)) || "{}");
      const t = txns.get(Number(b.order_id));
      return t ? send(res, 200, t) : send(res, 404, { detail: "Not found." });
    }

    // ---- test controls
    if (path === "/__test/intentions") return send(res, 200, intentions);
    if (req.method === "POST" && path === "/__test/next-error") { failNext = JSON.parse((await readBody(req)) || "{}").status || 503; return send(res, 200, { ok: true }); }
    if (req.method === "POST" && (path === "/__test/deliver" || path === "/__test/settle")) {
      const b = JSON.parse((await readBody(req)) || "{}");
      const intent = b.unknownOrder ? { ...(intentions.at(-1) ?? {}), orderId: 424242 } : intentions.find((i) => i.body.special_reference.startsWith(b.orderId) && (!b.reference || i.body.special_reference === b.reference)) ?? [...intentions].reverse().find((i) => i.body.special_reference.startsWith(b.orderId));
      if (!intent) return send(res, 404, { error: "no intention for that order" });
      const opts = { outcome: b.outcome || "success", txnId: b.txnId, amountCents: b.amountCents, badHmac: b.badHmac, type: b.type };
      if (path === "/__test/settle") { txns.set(intent.orderId, makeTxn(intent, opts)); return send(res, 200, { ok: true }); }
      const out = await deliverCallback(intent, opts);
      return send(res, 200, { siteStatus: out.status, siteBody: out.body, txnId: out.obj.id });
    }
    send(res, 404, { detail: "not found" });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake Paymob on http://127.0.0.1:${PORT}`));
