// Every "online payments" phrase that is swapped for InstaPay-only wording must still exist in the dictionaries.
// Run: node --experimental-strip-types tests/e2e/copy-check.mts
import { en } from "../../src/i18n/dictionaries/en.ts";
import { ar } from "../../src/i18n/dictionaries/ar.ts";
import { applyManualPaymentCopy, missingPhrases } from "../../src/i18n/manual-payment-copy.ts";

let failed = 0;
for (const [locale, dict] of [["en", en], ["ar", ar]] as const) {
  const missing = missingPhrases(dict, locale);
  console.log(`${missing.length ? "FAIL" : "PASS"}  ${locale}: all ${locale === "en" ? "English" : "Arabic"} online-payment phrases found${missing.length ? " — missing: " + missing.join(" | ") : ""}`);
  if (missing.length) failed++;
  const manual = JSON.stringify(applyManualPaymentCopy(dict, locale));
  const leftovers = ["Fawry or InstaPay", "card, wallet", "فوري أو InstaPay", "بالبطاقة أو المحفظة"].filter((w) => manual.includes(w));
  console.log(`${leftovers.length ? "FAIL" : "PASS"}  ${locale}: InstaPay-only wording mentions no card/wallet/Fawry${leftovers.length ? " — still has: " + leftovers.join(", ") : ""}`);
  if (leftovers.length) failed++;
}
process.exit(failed ? 1 : 0);
