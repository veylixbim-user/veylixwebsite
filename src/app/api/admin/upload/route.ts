import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/server/auth";
import { isBlobEnabled, saveLocalFile } from "@/lib/server/storage";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_PLUGIN = 2 * 1024 * 1024 * 1024;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Admin uploads.
 * - JSON body: Vercel Blob client-upload handshake (files go straight from the browser to Blob storage).
 * - multipart/form-data: local development fallback, stored under .data/uploads.
 */
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("multipart/form-data")) {
    if (process.env.VERCEL) return Response.json({ error: "Connect Vercel Blob storage to upload files." }, { status: 400 });
    if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind") === "image" ? "image" : "plugin";
    if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
    if (kind === "image" && (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE)) {
      return Response.json({ error: "Images must be PNG, JPG, WebP, GIF or AVIF under 10 MB." }, { status: 400 });
    }
    const url = await saveLocalFile(kind === "image" ? "images" : "plugins", file.name, await file.arrayBuffer());
    return Response.json({ url });
  }

  if (!isBlobEnabled()) return Response.json({ error: "Blob storage is not configured." }, { status: 400 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Runs for the browser's token request only; Vercel's completion callback skips it.
        if (!sameOrigin(request) || !(await isAdmin())) throw new Error("Unauthorized");
        const image = clientPayload === "image";
        return {
          allowedContentTypes: image ? IMAGE_TYPES : undefined,
          maximumSizeInBytes: image ? MAX_IMAGE : MAX_PLUGIN,
          addRandomSuffix: true, // unguessable URLs
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
