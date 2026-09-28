import "server-only";
import { isArtId, type ArtId } from "@/lib/art";
import { isDatabaseConfigured, query } from "./db";

export type ProductImage = { url: string; name?: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  taglineEn: string;
  taglineAr: string;
  descriptionEn: string;
  descriptionAr: string;
  featuresEn: string[];
  featuresAr: string[];
  version: string;
  revitVersions: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  images: ProductImage[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  /** Built-in animated artwork shown on the product card instead of the first image. */
  art: ArtId | null;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

/** What public pages and client components receive — never includes the installer URL. */
export type PublicProduct = Omit<Product, "fileUrl" | "createdAt" | "updatedAt" | "published" | "sortOrder"> & {
  hasFile: boolean;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  tagline_en: string;
  tagline_ar: string;
  description_en: string;
  description_ar: string;
  features_en: string;
  features_ar: string;
  version: string;
  revit_versions: string;
  price_monthly: number | null;
  price_yearly: number | null;
  images: ProductImage[] | string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | string | null;
  art: string | null;
  published: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function map(r: ProductRow): Product {
  const images = typeof r.images === "string" ? (JSON.parse(r.images) as ProductImage[]) : r.images;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    taglineEn: r.tagline_en,
    taglineAr: r.tagline_ar,
    descriptionEn: r.description_en,
    descriptionAr: r.description_ar,
    featuresEn: lines(r.features_en),
    featuresAr: lines(r.features_ar),
    version: r.version,
    revitVersions: r.revit_versions,
    priceMonthly: r.price_monthly,
    priceYearly: r.price_yearly,
    images: Array.isArray(images) ? images : [],
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileSize: r.file_size == null ? null : Number(r.file_size),
    art: isArtId(r.art) ? r.art : null,
    published: r.published,
    sortOrder: r.sort_order,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function toCatalogItem(p: PublicProduct): import("@/lib/catalog-types").CatalogItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    taglineEn: p.taglineEn,
    taglineAr: p.taglineAr,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    image: p.images[0]?.url ?? null,
    art: p.art,
    hasFile: p.hasFile,
  };
}

export function toPublic(p: Product): PublicProduct {
  const { fileUrl, createdAt, published, sortOrder, updatedAt, ...rest } = p;
  void createdAt;
  void published;
  void sortOrder;
  return { ...rest, hasFile: Boolean(fileUrl), updatedAt: updatedAt.toISOString() };
}

const ORDER = "ORDER BY sort_order ASC, created_at ASC";

export async function listProducts(): Promise<Product[]> {
  return (await query<ProductRow>(`SELECT * FROM products ${ORDER}`)).map(map);
}

export async function getProductById(id: string): Promise<Product | null> {
  const rows = await query<ProductRow>("SELECT * FROM products WHERE id = $1", [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await query<ProductRow>("SELECT * FROM products WHERE slug = $1", [slug]);
  return rows[0] ? map(rows[0]) : null;
}

/** Published products for the public site. Never throws — an unconfigured database means an empty catalog. */
export async function getPublishedProducts(): Promise<PublicProduct[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await query<ProductRow>(`SELECT * FROM products WHERE published = true ${ORDER}`);
    return rows.map(map).map(toPublic);
  } catch (err) {
    console.error("[products] failed to load catalog", err);
    return [];
  }
}

export async function getPublishedProduct(slug: string): Promise<PublicProduct | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const rows = await query<ProductRow>("SELECT * FROM products WHERE slug = $1 AND published = true", [slug]);
    return rows[0] ? toPublic(map(rows[0])) : null;
  } catch (err) {
    console.error("[products] failed to load product", err);
    return null;
  }
}

export type ProductInput = {
  slug: string;
  name: string;
  taglineEn: string;
  taglineAr: string;
  descriptionEn: string;
  descriptionAr: string;
  featuresEn: string;
  featuresAr: string;
  version: string;
  revitVersions: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  images: ProductImage[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  art: ArtId | null;
  published: boolean;
  sortOrder: number;
};

export async function insertProduct(id: string, p: ProductInput) {
  await query(
    `INSERT INTO products (id, slug, name, tagline_en, tagline_ar, description_en, description_ar, features_en, features_ar,
       version, revit_versions, price_monthly, price_yearly, images, file_url, file_name, file_size, published, sort_order, art)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20)`,
    [id, p.slug, p.name, p.taglineEn, p.taglineAr, p.descriptionEn, p.descriptionAr, p.featuresEn, p.featuresAr, p.version, p.revitVersions, p.priceMonthly, p.priceYearly, JSON.stringify(p.images), p.fileUrl, p.fileName, p.fileSize, p.published, p.sortOrder, p.art],
  );
}

export async function updateProduct(id: string, p: ProductInput) {
  await query(
    `UPDATE products SET slug=$2, name=$3, tagline_en=$4, tagline_ar=$5, description_en=$6, description_ar=$7, features_en=$8, features_ar=$9,
       version=$10, revit_versions=$11, price_monthly=$12, price_yearly=$13, images=$14::jsonb, file_url=$15, file_name=$16, file_size=$17,
       published=$18, sort_order=$19, art=$20, updated_at=now()
     WHERE id=$1`,
    [id, p.slug, p.name, p.taglineEn, p.taglineAr, p.descriptionEn, p.descriptionAr, p.featuresEn, p.featuresAr, p.version, p.revitVersions, p.priceMonthly, p.priceYearly, JSON.stringify(p.images), p.fileUrl, p.fileName, p.fileSize, p.published, p.sortOrder, p.art],
  );
}

export async function deleteProduct(id: string) {
  await query("DELETE FROM products WHERE id = $1", [id]);
}

export async function slugTaken(slug: string, exceptId?: string) {
  const rows = await query<{ id: string }>("SELECT id FROM products WHERE slug = $1", [slug]);
  return rows.some((r) => r.id !== exceptId);
}
