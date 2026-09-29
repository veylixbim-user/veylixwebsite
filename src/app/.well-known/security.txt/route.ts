import { CONTACT_EMAIL, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** RFC 9116 — where to report a security problem. */
export function GET() {
  const expires = new Date(Date.now() + 300 * 86_400_000).toISOString();
  const body = `Contact: mailto:${CONTACT_EMAIL}\nExpires: ${expires}\nPreferred-Languages: en, ar\nCanonical: ${siteUrl}/.well-known/security.txt\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
