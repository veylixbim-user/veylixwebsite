import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { getProductById } from "@/lib/server/products";
import { isBlobEnabled } from "@/lib/server/storage";
import { deleteProductAction } from "@/app/admin/actions";
import { AdminHeader, Card } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const p = await getProductById(id);
  if (!p) notFound();

  return (
    <>
      <AdminHeader
        title={p.name}
        sub={
          <>
            <Link href="/admin/products" className="hover:text-fg">
              Products
            </Link>{" "}
            / {p.name}
            {created ? <span className="ms-3 text-success">Created ✓</span> : null}
          </>
        }
        actions={
          p.published ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/en/products/${p.slug}`} target="_blank">
                <ExternalLink aria-hidden /> View on site
              </Link>
            </Button>
          ) : null
        }
      />
      <ProductForm
        key={p.updatedAt.toISOString()}
        blobEnabled={isBlobEnabled()}
        initial={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          taglineEn: p.taglineEn,
          taglineAr: p.taglineAr,
          descriptionEn: p.descriptionEn,
          descriptionAr: p.descriptionAr,
          featuresEn: p.featuresEn.join("\n"),
          featuresAr: p.featuresAr.join("\n"),
          version: p.version,
          revitVersions: p.revitVersions,
          priceMonthly: p.priceMonthly?.toString() ?? "",
          priceYearly: p.priceYearly?.toString() ?? "",
          images: p.images,
          fileUrl: p.fileUrl ?? "",
          fileName: p.fileName ?? "",
          fileSize: p.fileSize?.toString() ?? "",
          art: p.art ?? "",
          published: p.published,
          sortOrder: String(p.sortOrder),
        }}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="font-semibold">Licensing for this plugin</h2>
          <p className="mt-1.5 text-sm text-muted">
            Add this ready-made file to your Revit add-in project once and rebuild. It already contains your server address, this product&apos;s ID
            (<code className="font-mono text-fg">{p.slug}</code>) and your signing key. The check interval and trial length stay controlled from Settings — no
            rebuild needed when you change them.
          </p>
          <ol className="mt-4 grid gap-1.5 text-sm text-fg-soft">
            <li>1. Download the file and add it to your project (e.g. the <code className="font-mono">src</code> folder).</li>
            <li>
              2. At the top of every command&apos;s <code className="font-mono">Execute</code>:{" "}
              <code className="font-mono text-accent-fg">if (!VeylixLicense.Require()) return Result.Cancelled;</code>
            </li>
            <li>3. Rebuild, then upload the build folder above.</li>
          </ol>
          <Button asChild className="mt-5" variant="secondary">
            <a href={`/api/admin/plugin-kit/${p.id}`}>
              <Download aria-hidden /> Download VeylixLicense.cs
            </a>
          </Button>
        </Card>
        <Card>
          <h2 className="font-semibold text-danger">Delete product</h2>
          <p className="mt-1.5 text-sm text-muted">Removes the product, its images and installer. License keys issued for this product are revoked.</p>
          <form action={deleteProductAction} className="mt-4">
            <input type="hidden" name="id" value={p.id} />
            <Button type="submit" variant="ghost" className="border-[color-mix(in_oklab,var(--danger)_40%,transparent)] text-danger">
              <Trash2 aria-hidden /> Delete
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
