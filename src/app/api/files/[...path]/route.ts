import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { localPathFor } from "@/lib/server/storage";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".zip": "application/zip",
};

/** Serves locally stored uploads (development only — production files live in Vercel Blob). */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...path]">) {
  if (process.env.VERCEL) return new Response("Not found", { status: 404 });
  const { path: parts } = await ctx.params;
  const target = localPathFor(parts);
  if (!target) return new Response("Not found", { status: 404 });
  try {
    await stat(target);
    const data = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    const isImage = parts[0] === "images";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": isImage ? "public, max-age=31536000, immutable" : "private, no-store",
        ...(isImage ? {} : { "Content-Disposition": `attachment; filename="${path.basename(target).replace(/^[a-z0-9]+-/, "")}"` }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
