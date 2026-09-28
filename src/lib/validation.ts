export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Egyptian mobile: 010/011/012/015 + 8 digits, optional +20 / 0020 prefix. */
export const EG_MOBILE_RE = /^(?:\+20|0020|0)?1[0125]\d{8}$/;
export const TAX_ID_RE = /^\d{9}$/;

export function normalizePhone(v: string) {
  return v.replace(/[\s\-()]/g, "");
}

export function normalizeTaxId(v: string) {
  return v.replace(/[\s\-]/g, "");
}

export function isStudentEmail(v: string) {
  return EMAIL_RE.test(v) && /\.edu\.eg$/i.test(v.trim());
}

export function clean(v: unknown, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
