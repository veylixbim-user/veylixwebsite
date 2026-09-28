import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomString } from "./ids";

/**
 * File storage for product images and plugin installers.
 * - Production: Vercel Blob (BLOB_READ_WRITE_TOKEN), uploaded straight from the admin's browser.
 * - Local development: files under .data/uploads, served by /api/files/[...path].
 */
export function isBlobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isStorageConfigured() {
  return isBlobEnabled() || !process.env.VERCEL;
}

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

export function safeFileName(name: string) {
  const base = name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return base.slice(-120) || "file";
}

export async function saveLocalFile(folder: "images" | "plugins", name: string, data: ArrayBuffer) {
  const dir = path.join(LOCAL_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const fileName = `${randomString(10, "abcdefghijkmnpqrstuvwxyz23456789")}-${safeFileName(name)}`;
  await writeFile(path.join(dir, fileName), Buffer.from(data));
  return `/api/files/${folder}/${fileName}`;
}

export function localPathFor(parts: string[]) {
  const target = path.normalize(path.join(LOCAL_ROOT, ...parts));
  if (!target.startsWith(LOCAL_ROOT + path.sep)) return null;
  return target;
}

export async function deleteStoredFile(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith("/api/files/")) {
      const target = localPathFor(url.replace("/api/files/", "").split("/"));
      if (target) await unlink(target);
    } else if (isBlobEnabled() && /\.blob\.vercel-storage\.com\//.test(url)) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* already gone */
  }
}
