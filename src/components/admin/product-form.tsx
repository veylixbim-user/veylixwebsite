"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowLeftToLine, Check, FileArchive, FolderUp, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { saveProductAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ART, ART_IDS, type ArtId } from "@/lib/art";
import { cn } from "@/lib/utils";
import { ProductArt } from "@/components/mockups/product-art";
import { isDevArtifact, uploadFile } from "./upload-client";

export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  taglineEn: string;
  taglineAr: string;
  descriptionEn: string;
  descriptionAr: string;
  featuresEn: string;
  featuresAr: string;
  version: string;
  revitVersions: string;
  priceMonthly: string;
  priceYearly: string;
  images: { url: string; name?: string }[];
  fileUrl: string;
  fileName: string;
  fileSize: string;
  art: ArtId | "";
  published: boolean;
  sortOrder: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type FolderEntry = { name: string; size: number; files: File[]; isDir: boolean; excludedByDefault: boolean };

export function ProductForm({ initial, blobEnabled }: { initial: ProductFormValue; blobEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, undefined);
  const [name, setName] = React.useState(initial.name);
  const [slug, setSlug] = React.useState(initial.slug);
  const [slugEdited, setSlugEdited] = React.useState(Boolean(initial.id));
  const [images, setImages] = React.useState(initial.images);
  const [art, setArt] = React.useState<ArtId | "">(initial.art);
  const [file, setFile] = React.useState({ url: initial.fileUrl, name: initial.fileName, size: initial.fileSize });
  const [progress, setProgress] = React.useState<{ label: string; pct: number } | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [folder, setFolder] = React.useState<{ root: string; entries: FolderEntry[]; included: Set<string> } | null>(null);
  const busy = progress !== null;

  async function addImages(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(null);
    try {
      for (const [i, f] of [...list].entries()) {
        setProgress({ label: `Uploading image ${i + 1} of ${list.length}`, pct: 0 });
        const url = await uploadFile(f, f.name, "image", blobEnabled, (pct) => setProgress({ label: `Uploading image ${i + 1} of ${list.length}`, pct }));
        setImages((prev) => [...prev, { url, name: f.name }].slice(0, 12));
      }
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function uploadInstaller(blob: Blob, fileName: string) {
    setUploadError(null);
    try {
      setProgress({ label: `Uploading ${fileName}`, pct: 0 });
      const url = await uploadFile(blob, fileName, "plugin", blobEnabled, (pct) => setProgress({ label: `Uploading ${fileName}`, pct }));
      setFile({ url, name: fileName, size: String(blob.size) });
      setFolder(null);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  function pickFolder(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    const root = files[0].webkitRelativePath.split("/")[0] || "plugin";
    const map = new Map<string, FolderEntry>();
    for (const f of files) {
      const parts = f.webkitRelativePath.split("/");
      const top = parts[1] ?? f.name;
      const isDir = parts.length > 2;
      const entry = map.get(top) ?? { name: top, size: 0, files: [], isDir, excludedByDefault: true };
      entry.files.push(f);
      entry.size += f.size;
      // A top-level entry is excluded by default only if every file in it is a development artifact.
      entry.excludedByDefault = entry.excludedByDefault && isDevArtifact(f.webkitRelativePath);
      map.set(top, entry);
    }
    const entries = [...map.values()].sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
    setFolder({ root, entries, included: new Set(entries.filter((e) => !e.excludedByDefault).map((e) => e.name)) });
  }

  async function zipFolder() {
    if (!folder) return;
    setProgress({ label: "Compressing folder", pct: 0 });
    try {
      const { zip } = await import("fflate");
      const input: Record<string, Uint8Array> = {};
      const selected = folder.entries.filter((e) => folder.included.has(e.name));
      // Strip dev artifacts (e.g. .pdb, .cs) inside shipped folders; entries the admin re-ticked go in whole.
      const all = selected.flatMap((e) => (e.excludedByDefault ? e.files : e.files.filter((f) => !isDevArtifact(f.webkitRelativePath))));
      let done = 0;
      for (const f of all) {
        input[f.webkitRelativePath] = new Uint8Array(await f.arrayBuffer());
        done++;
        setProgress({ label: "Compressing folder", pct: Math.round((done / all.length) * 60) });
      }
      const data = await new Promise<Uint8Array>((resolve, reject) => zip(input, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out))));
      const blob = new Blob([data as BlobPart], { type: "application/zip" });
      await uploadInstaller(blob, `${folder.root}.zip`);
    } catch (err) {
      setUploadError((err as Error).message);
      setProgress(null);
    }
  }

  const v = initial;
  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="fileUrl" value={file.url} />
      <input type="hidden" name="fileName" value={file.name} />
      <input type="hidden" name="fileSize" value={file.size} />

      <div className="grid gap-6">
        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugEdited) setSlug(slugify(e.target.value));
                }}
                placeholder="Smart Wiring"
              />
            </Field>
            <Field label="URL name" htmlFor="slug" hint={`veylix.com/en/products/${slug || "…"}`}>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                dir="ltr"
              />
            </Field>
            <Field label="Version" htmlFor="version">
              <Input id="version" name="version" defaultValue={v.version} placeholder="1.0.0" dir="ltr" />
            </Field>
            <Field label="Revit versions" htmlFor="revitVersions">
              <Input id="revitVersions" name="revitVersions" defaultValue={v.revitVersions} placeholder="2021–2025" dir="ltr" />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Description</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Tagline (English)" htmlFor="taglineEn">
              <Input id="taglineEn" name="taglineEn" defaultValue={v.taglineEn} placeholder="One sentence about what it does" />
            </Field>
            <Field label="Tagline (Arabic)" htmlFor="taglineAr">
              <Input id="taglineAr" name="taglineAr" defaultValue={v.taglineAr} dir="rtl" lang="ar" />
            </Field>
            <Field label="Description (English)" htmlFor="descriptionEn">
              <Textarea id="descriptionEn" name="descriptionEn" defaultValue={v.descriptionEn} rows={6} />
            </Field>
            <Field label="Description (Arabic)" htmlFor="descriptionAr">
              <Textarea id="descriptionAr" name="descriptionAr" defaultValue={v.descriptionAr} rows={6} dir="rtl" lang="ar" />
            </Field>
            <Field label="Features (English)" htmlFor="featuresEn" hint="One feature per line">
              <Textarea id="featuresEn" name="featuresEn" defaultValue={v.featuresEn} rows={6} />
            </Field>
            <Field label="Features (Arabic)" htmlFor="featuresAr" hint="ميزة واحدة في كل سطر">
              <Textarea id="featuresAr" name="featuresAr" defaultValue={v.featuresAr} rows={6} dir="rtl" lang="ar" />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Images</h2>
            <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2 text-sm font-medium hover:bg-surface-3", busy && "pointer-events-none opacity-50")}>
              <ImagePlus className="size-4" aria-hidden /> Add images
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple className="sr-only" onChange={(e) => (addImages(e.target.files), (e.target.value = ""))} />
            </label>
          </div>
          {images.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-muted">Screenshots of the plugin inside Revit work best. The first image is the cover.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, i) => (
                <li key={img.url} className="group relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  {i === 0 ? <span className="absolute start-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-on-accent">COVER</span> : null}
                  <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {i > 0 ? (
                      <button type="button" title="Make cover" onClick={() => setImages((prev) => [prev[i], ...prev.filter((_, j) => j !== i)])} className="rounded-md bg-black/70 p-1.5 text-white">
                        <ArrowLeftToLine className="size-3.5" aria-hidden />
                        <span className="sr-only">Make cover</span>
                      </button>
                    ) : null}
                    <button type="button" title="Remove" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="rounded-md bg-black/70 p-1.5 text-white">
                      <X className="size-3.5" aria-hidden />
                      <span className="sr-only">Remove image</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Card artwork</h2>
            <p className="mt-1 text-sm text-muted">Show one of the VEYLIX animated line-art illustrations on the product card, or use your cover image. Hover a tile to preview the animation.</p>
          </div>
          <input type="hidden" name="art" value={art} />
          <div role="radiogroup" aria-label="Card artwork" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              role="radio"
              aria-checked={art === ""}
              onClick={() => setArt("")}
              className={cn(
                "flex aspect-[16/10] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border bg-bg-elevated text-xs text-muted transition-colors",
                art === "" ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-border hover:border-border-strong",
              )}
            >
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0].url} alt="" className="size-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="size-5" aria-hidden />
                  Cover image
                </>
              )}
            </button>
            {ART_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={art === id}
                aria-label={ART[id].label}
                title={ART[id].label}
                onClick={() => setArt(id)}
                className={cn(
                  "group bg-blueprint relative aspect-[16/10] overflow-hidden rounded-xl border bg-bg-elevated p-3 transition-colors",
                  art === id ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-border hover:border-border-strong",
                )}
              >
                <ProductArt art={id} />
                {art === id ? (
                  <span className="absolute end-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Plugin installer</h2>
            <p className="mt-1 text-sm text-muted">
              Upload a .zip / .msi / .exe, or pick your plugin folder — it is zipped in your browser. Customers can only download it with a valid product key.
            </p>
          </div>
          {file.url ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <FileArchive className="size-5 shrink-0 text-accent-fg" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted">{file.size ? formatBytes(Number(file.size)) : ""}</span>
                </span>
              </span>
              <button type="button" onClick={() => setFile({ url: "", name: "", size: "" })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
                <Trash2 className="size-3.5" aria-hidden /> Remove
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2 text-sm font-medium hover:bg-surface-3", busy && "pointer-events-none opacity-50")}>
              <FolderUp className="size-4" aria-hidden /> Choose plugin folder
              <input
                type="file"
                className="sr-only"
                // @ts-expect-error — non-standard but supported by every desktop browser
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => (pickFolder(e.target.files), (e.target.value = ""))}
              />
            </label>
            <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2 text-sm font-medium hover:bg-surface-3", busy && "pointer-events-none opacity-50")}>
              <Upload className="size-4" aria-hidden /> Upload a file
              <input type="file" accept=".zip,.msi,.exe,.addin,.rar,.7z" className="sr-only" onChange={(e) => (e.target.files?.[0] && uploadInstaller(e.target.files[0], e.target.files[0].name), (e.target.value = ""))} />
            </label>
          </div>

          {folder ? (
            <div className="rounded-xl border border-border-strong bg-bg-elevated">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">
                  Folder <span className="font-mono">{folder.root}</span> — choose what customers receive
                </p>
                <p className="mt-0.5 text-xs text-muted">Source code, build files and backups are unticked so your code is never shipped. Tick anything the plugin needs at runtime.</p>
              </div>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                {folder.entries.map((e) => (
                  <li key={e.name}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-surface-2/60">
                      <input
                        type="checkbox"
                        checked={folder.included.has(e.name)}
                        onChange={(ev) =>
                          setFolder((f) => {
                            if (!f) return f;
                            const included = new Set(f.included);
                            if (ev.target.checked) included.add(e.name);
                            else included.delete(e.name);
                            return { ...f, included };
                          })
                        }
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className={cn("flex-1 truncate", !folder.included.has(e.name) && "text-muted line-through")}>
                        {e.name}
                        {e.isDir ? "/" : ""}
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {e.isDir ? `${e.files.length} files · ` : ""}
                        {formatBytes(e.size)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <span className="text-xs text-muted">
                  {formatBytes(folder.entries.filter((e) => folder.included.has(e.name)).reduce((s, e) => s + e.size, 0))} selected
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="subtle" size="sm" onClick={() => setFolder(null)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={zipFolder} disabled={busy || folder.included.size === 0}>
                    <FolderUp aria-hidden /> Zip & upload
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="grid content-start gap-6">
        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Pricing (EGP)</h2>
          <Field label="Monthly price" htmlFor="priceMonthly" hint="Leave empty to hide">
            <Input id="priceMonthly" name="priceMonthly" inputMode="numeric" defaultValue={v.priceMonthly} placeholder="1499" dir="ltr" />
          </Field>
          <Field label="Yearly price" htmlFor="priceYearly" hint="Leave empty to hide">
            <Input id="priceYearly" name="priceYearly" inputMode="numeric" defaultValue={v.priceYearly} placeholder="14399" dir="ltr" />
          </Field>
        </section>
        <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-semibold">Visibility</h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">Published</span>
              <span className="text-xs text-muted">Show on the website</span>
            </span>
            <input type="checkbox" name="published" defaultChecked={v.published} className="size-5 accent-[var(--accent)]" />
          </label>
          <Field label="Display order" htmlFor="sortOrder" hint="Lower numbers appear first">
            <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={v.sortOrder} dir="ltr" />
          </Field>
        </section>

        <div className="sticky bottom-4 grid gap-3 rounded-2xl border border-border bg-bg-elevated/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur">
          {progress ? (
            <div>
              <p className="text-xs text-muted">{progress.label}…</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          ) : null}
          {uploadError ? (
            <p role="alert" className="text-sm text-danger">
              {uploadError}
            </p>
          ) : null}
          {state?.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p role="status" className="flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" aria-hidden /> {state.message}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={pending || busy}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {v.id ? "Save changes" : "Create product"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
