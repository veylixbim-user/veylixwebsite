"use client";

export type UploadKind = "image" | "plugin";

/** Uploads a file to Vercel Blob (production) or local storage (development). Returns the file URL. */
export async function uploadFile(file: Blob, name: string, kind: UploadKind, blobEnabled: boolean, onProgress?: (pct: number) => void): Promise<string> {
  const safe = name.replace(/[^\w.\-]+/g, "-").slice(-120) || "file";
  if (blobEnabled) {
    const { upload } = await import("@vercel/blob/client");
    const res = await upload(`${kind === "image" ? "images" : "plugins"}/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      clientPayload: kind,
      multipart: file.size > 25 * 1024 * 1024,
      onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
    });
    return res.url;
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file, safe);
    form.append("kind", kind);
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
        if (xhr.status < 300 && data.url) resolve(data.url);
        else reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/** Folders and files that are development-only and should never ship to customers. */
const EXCLUDED_DIRS = /^(src|obj|backup|\.git|\.vs|\.vscode|\.idea|node_modules|claude outputs|packages|testresults)$/i;
const EXCLUDED_FILES = /(\.(cs|csproj|sln|user|suo|py|pyc|pdb|log|md|ps1)$|^build(_out)?\.(bat|txt)$|^\.gitignore$)/i;

export function isDevArtifact(relativePath: string) {
  const parts = relativePath.split("/").slice(1); // drop the selected root folder name
  if (parts.slice(0, -1).some((p) => EXCLUDED_DIRS.test(p))) return true;
  return EXCLUDED_FILES.test(parts[parts.length - 1] ?? "");
}
