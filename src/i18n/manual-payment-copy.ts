import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

/**
 * Until Paymob is connected, only the manual InstaPay transfer works. The dictionaries describe the full set of methods
 * (card, wallet, Fawry, …), so while online payments are off the site swaps those sentences back to InstaPay-only
 * wording — it never promises a payment method that isn't live. Pairs are [online wording, manual wording].
 */
const PAIRS: Record<Locale, [string, string][]> = {
  en: [
    ["and payable by card, wallet or InstaPay.", "and payable by InstaPay."],
    ["Licensed per device · Pay in EGP by card, wallet or InstaPay", "Licensed per device · Pay in EGP with InstaPay"],
    ["Card, wallet or InstaPay", "Pay with InstaPay"],
    ["Pay by card, wallet, Fawry or InstaPay. Your product key arrives the moment the payment is confirmed.", "Pay with InstaPay. Your product key arrives as soon as we confirm the transfer."],
    ["Pay securely", "Pay with InstaPay"],
    ["Add a plugin to your cart and pay by card, wallet, Fawry or InstaPay. Your key is issued automatically.", "Add a plugin to your cart and transfer the amount to our InstaPay. Enter the transfer reference at checkout."],
    [
      "Online, in Egyptian Pounds: Visa, Mastercard or Meeza card, mobile wallet (Vodafone Cash and others), Fawry, installments, or InstaPay. You can also send an InstaPay transfer yourself and enter the reference. Card and wallet details are typed on our payment partner's secure page — we never see them.",
      "By InstaPay in Egyptian Pounds. At checkout you'll see the amount and our InstaPay number; transfer the amount, then enter the transfer reference. Card, Fawry and wallet payments are coming soon.",
    ],
    [
      "Card, wallet and InstaPay payments are confirmed instantly: your key appears on the next page and in your email. Fawry codes are confirmed the moment you pay at the outlet. Manual InstaPay transfers are checked by hand — usually within a few hours.",
      "As soon as we confirm your InstaPay transfer — usually within a few hours during working days. Your key appears on your order page, so keep that link.",
    ],
    ["Pay by card, wallet or InstaPay and receive a compliant tax invoice for every order.", "Pay by InstaPay and receive a compliant tax invoice for every order."],
    ["Add a plugin to your cart and pay by card, wallet, Fawry or InstaPay. Your key arrives by email instantly.", "Add a plugin to your cart, pay by InstaPay, and enter the transfer reference at checkout."],
    ["Paying online", "Paying with InstaPay"],
    [
      "Choose card, wallet, Fawry or InstaPay at checkout, finish on our payment partner's secure page, and your key is issued automatically. Prefer to transfer yourself? Pick “InstaPay transfer”, send the exact total and keep the reference.",
      "Send the exact order total to our InstaPay and keep the transfer reference.",
    ],
    ["Online payments are processed by Paymob and confirmed automatically; InstaPay transfers are confirmed after we verify them.", "Orders are confirmed after we verify your InstaPay transfer."],
    ["We refund to your original payment method (or by InstaPay) and disable the product key.", "We refund by InstaPay and disable the product key."],
    ["Payment questions: include your order number (and the InstaPay reference, if you paid by transfer).", "Payment questions: include your InstaPay reference and order number."],
    ["Pay securely by card, wallet, Fawry or InstaPay — in Egyptian Pounds.", "Pay with InstaPay in Egyptian Pounds."],
  ],
  ar: [
    ["والأسعار بالجنيه المصري والدفع بالبطاقة أو المحفظة أو InstaPay.", "والأسعار بالجنيه المصري والدفع عبر InstaPay."],
    ["ترخيص لكل جهاز · ادفع بالجنيه بالبطاقة أو المحفظة أو InstaPay", "ترخيص لكل جهاز · ادفع بالجنيه عبر InstaPay"],
    ["بطاقة أو محفظة أو InstaPay", "ادفع عبر InstaPay"],
    ["ادفع بالبطاقة أو المحفظة أو فوري أو InstaPay. يصلك مفتاح المنتج لحظة تأكيد الدفع.", "ادفع عبر InstaPay. يصلك مفتاح المنتج فور تأكيد التحويل."],
    ["ادفع بأمان", "ادفع عبر InstaPay"],
    ["أضف الإضافة إلى السلة وادفع بالبطاقة أو المحفظة أو فوري أو InstaPay. يُصدر مفتاحك تلقائيًا.", "أضف الإضافة إلى السلة وحوّل المبلغ إلى رقم InstaPay الخاص بنا، ثم أدخل رقم التحويل عند الدفع."],
    [
      "إلكترونيًا وبالجنيه المصري: بطاقة فيزا أو ماستركارد أو ميزة، أو محفظة إلكترونية (فودافون كاش وغيرها)، أو فوري، أو التقسيط، أو InstaPay. ويمكنك أيضًا تحويل InstaPay بنفسك وإدخال رقم المرجع. تُكتب بيانات البطاقة والمحفظة في صفحة شريك الدفع الآمنة — ولا نراها أبدًا.",
      "عبر InstaPay بالجنيه المصري. في صفحة الدفع ستجد المبلغ ورقم InstaPay الخاص بنا؛ حوّل المبلغ ثم أدخل رقم التحويل. الدفع بالبطاقة وفوري والمحافظ قريبًا.",
    ],
    [
      "الدفع بالبطاقة والمحفظة وInstaPay يُؤكَّد فورًا: يظهر مفتاحك في الصفحة التالية وفي بريدك. أكواد فوري تُؤكَّد لحظة الدفع في الفرع. أما تحويلات InstaPay اليدوية فنراجعها يدويًا — عادةً خلال ساعات قليلة.",
      "فور تأكيد تحويل InstaPay — عادةً خلال ساعات قليلة في أيام العمل. يظهر مفتاحك في صفحة طلبك، فاحتفظ برابطها.",
    ],
    ["ادفع بالبطاقة أو المحفظة أو InstaPay واحصل على فاتورة ضريبية متوافقة لكل طلب.", "ادفع عبر InstaPay واحصل على فاتورة ضريبية متوافقة لكل طلب."],
    ["أضف الإضافة إلى السلة وادفع بالبطاقة أو المحفظة أو فوري أو InstaPay. يصلك مفتاحك بالبريد فورًا.", "أضف الإضافة إلى السلة، وادفع عبر InstaPay، وأدخل رقم التحويل عند الدفع."],
    ["الدفع إلكترونيًا", "الدفع عبر InstaPay"],
    [
      "اختر البطاقة أو المحفظة أو فوري أو InstaPay عند الدفع، وأكمل في صفحة شريك الدفع الآمنة ويُصدر مفتاحك تلقائيًا. تفضّل التحويل بنفسك؟ اختر «تحويل InstaPay» وحوّل الإجمالي بالضبط واحتفظ برقم المرجع.",
      "حوّل إجمالي الطلب بالضبط إلى InstaPay الخاص بنا واحتفظ برقم التحويل.",
    ],
    ["تُعالَج المدفوعات الإلكترونية عبر Paymob وتُؤكَّد تلقائيًا؛ وتُؤكَّد تحويلات InstaPay بعد التحقق منها.", "تُؤكَّد الطلبات بعد التحقق من تحويل InstaPay."],
    ["نعيد المبلغ إلى وسيلة الدفع الأصلية (أو عبر InstaPay) ونعطّل مفتاح المنتج.", "نعيد المبلغ عبر InstaPay ونعطّل مفتاح المنتج."],
    ["أسئلة الدفع: اكتب رقم طلبك (ومرجع تحويل InstaPay إن دفعت بالتحويل).", "أسئلة الدفع: اكتب مرجع تحويل InstaPay ورقم الطلب."],
    ["ادفع بأمان بالبطاقة أو المحفظة أو فوري أو InstaPay — بالجنيه المصري.", "ادفع عبر InstaPay بالجنيه المصري."],
  ],
};

function swap(value: unknown, pairs: [string, string][]): unknown {
  if (typeof value === "string") {
    for (const [online, manual] of pairs) {
      if (value === online) return manual;
      // Substring swaps only for long, unambiguous phrases (a short one like "Pay securely" must match a whole line).
      if (online.length >= 30 && value.length > online.length && value.includes(online)) return value.replace(online, manual);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => swap(v, pairs));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swap(v, pairs)]));
  return value;
}

export function applyManualPaymentCopy(dict: Dictionary, locale: Locale): Dictionary {
  return swap(dict, PAIRS[locale]) as Dictionary;
}

/** Every online-wording phrase must exist in its dictionary, or a later edit would silently stop the swap (tested). */
export function missingPhrases(dict: Dictionary, locale: Locale): string[] {
  const all = JSON.stringify(dict);
  return PAIRS[locale].map(([online]) => online).filter((o) => !all.includes(JSON.stringify(o).slice(1, -1)));
}
