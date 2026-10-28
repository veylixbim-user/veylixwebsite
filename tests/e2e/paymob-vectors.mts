// Checks the Paymob signature code against the worked example in Paymob's documentation, without a server.
// Run: node --conditions=react-server --experimental-strip-types tests/e2e/paymob-vectors.mts
import { createHmac } from "node:crypto";
import { fromCallbackObject, fromRedirectParams, parseIntegrationIds, signTransaction, verifyRedirectHmac, verifyTransactionHmac } from "../../src/lib/server/paymob.ts";

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
};

// Paymob's documented sample transaction and the exact concatenation string it produces.
const obj = {
  amount_cents: 100,
  created_at: "2020-03-25T18:39:44.719228",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  id: 2556706,
  integration_id: 6741,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 4778239, merchant_order_id: "VX-TEST-1" },
  owner: 4705,
  pending: false,
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
  success: true,
};
const expectedString = "1002020-03-25T18:39:44.719228EGPfalsefalse25567066741truefalsefalsefalsetruefalse47782394705false2346MasterCardcardtrue";
const secret = "test-hmac-secret";
const expected = createHmac("sha512", secret).update(expectedString).digest("hex");

check("signature matches the documented concatenation order", signTransaction(secret, obj) === expected);
check("a correct signature is accepted", verifyTransactionHmac(secret, obj, expected));
check("an upper-case signature is accepted", verifyTransactionHmac(secret, obj, expected.toUpperCase()));
check("a wrong secret is rejected", !verifyTransactionHmac("other-secret", obj, expected));
check("a missing signature is rejected", !verifyTransactionHmac(secret, obj, null) && !verifyTransactionHmac(secret, obj, ""));
check("a garbage signature is rejected", !verifyTransactionHmac(secret, obj, "abc") && !verifyTransactionHmac(secret, obj, "z".repeat(128)));
check("a tampered amount is rejected", !verifyTransactionHmac(secret, { ...obj, amount_cents: 1 }, expected));
check("a tampered success flag is rejected", !verifyTransactionHmac(secret, { ...obj, success: false }, expected));
check("a tampered order id is rejected", !verifyTransactionHmac(secret, { ...obj, order: { id: 1 } }, expected));
check("no object is rejected", !verifyTransactionHmac(secret, null, expected) && !verifyTransactionHmac(secret, "x", expected));

// Redirect (GET) form: same fields as query parameters, order id under `order`.
const params = new URLSearchParams({
  amount_cents: "100",
  created_at: "2020-03-25T18:39:44.719228",
  currency: "EGP",
  error_occured: "false",
  has_parent_transaction: "false",
  id: "2556706",
  integration_id: "6741",
  is_3d_secure: "true",
  is_auth: "false",
  is_capture: "false",
  is_refunded: "false",
  is_standalone_payment: "true",
  is_voided: "false",
  order: "4778239",
  owner: "4705",
  pending: "false",
  "source_data.pan": "2346",
  "source_data.sub_type": "MasterCard",
  "source_data.type": "card",
  success: "true",
  hmac: expected,
});
check("redirect signature is accepted", verifyRedirectHmac(secret, params));
const bad = new URLSearchParams(params);
bad.set("success", "false");
check("redirect with a changed flag is rejected", !verifyRedirectHmac(secret, bad));
check("redirect without a signature is rejected", !verifyRedirectHmac(secret, new URLSearchParams({ id: "1" })));

const txn = fromCallbackObject(obj);
check("callback object is normalised", !!txn && txn.id === "2556706" && txn.providerOrderId === "4778239" && txn.amountCents === 100 && txn.success && !txn.pending && txn.merchantOrderId === "VX-TEST-1");
const rtxn = fromRedirectParams(params);
check("redirect parameters are normalised", !!rtxn && rtxn.providerOrderId === "4778239" && rtxn.success && rtxn.amountCents === 100 && rtxn.methodType === "card");
check("a callback without ids is refused", fromCallbackObject({ amount_cents: 1 }) === null && fromCallbackObject(null) === null);
check("integration ids are parsed safely", JSON.stringify(parseIntegrationIds("123, 456;789 abc 0 -5 99999999999999999999")) === "[123,456,789]");

console.log(failed === 0 ? "\nAll Paymob signature checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
