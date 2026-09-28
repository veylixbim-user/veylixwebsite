import { CONTACT_EMAIL } from "@/lib/site";
import { isAdmin } from "@/lib/server/auth";
import { publicKeyFormats } from "@/lib/server/license-keys";
import { getProductById } from "@/lib/server/products";
import { renderCSharpKit } from "@/lib/plugin-kit/template";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/plugin-kit/[id]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const product = await getProductById(id);
  if (!product) return new Response("Not found", { status: 404 });
  // The plugin talks to the production domain, even when this file is downloaded from a preview deployment.
  const serverUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(request.url).origin);
  const { xml } = await publicKeyFormats();
  const source = renderCSharpKit({ serverUrl, productSlug: product.slug, productName: product.name, publicKeyXml: xml, supportEmail: CONTACT_EMAIL });
  return new Response(source, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="VeylixLicense.cs"`,
      "Cache-Control": "no-store",
    },
  });
}
