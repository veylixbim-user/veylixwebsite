/** Public address: NEXT_PUBLIC_SITE_URL, else the Vercel production domain, else a placeholder. Server-side only. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://veylix.com")
).replace(/\/$/, "");

/** Social profiles appear in the footer only once their URLs are set (Vercel environment variables). */
export const social = {
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || "",
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
  github: process.env.NEXT_PUBLIC_GITHUB_URL || "",
};

/** One inbox for everything: customers write here and every email the site sends comes from it. */
export const CONTACT_EMAIL = "veylixbim@gmail.com";

export const contact = {
  email: CONTACT_EMAIL,
  sales: CONTACT_EMAIL,
  support: CONTACT_EMAIL,
};

