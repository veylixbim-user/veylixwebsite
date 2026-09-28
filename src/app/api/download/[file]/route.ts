/**
 * Download portal stub. Point these env vars at your signed installer URLs (e.g. an S3/R2 bucket)
 * and the success page's download buttons start working.
 */
const FILES: Record<string, string | undefined> = {
  suite: process.env.DOWNLOAD_URL_SUITE,
  msi: process.env.DOWNLOAD_URL_MSI,
};

export async function GET(_request: Request, ctx: RouteContext<"/api/download/[file]">) {
  const { file } = await ctx.params;
  const url = FILES[file];
  if (!url) {
    return Response.json({ ok: false, error: "Download portal not configured yet." }, { status: 503 });
  }
  return Response.redirect(url, 302);
}
