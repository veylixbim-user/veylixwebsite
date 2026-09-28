import Link from "next/link";
import { FileArchive, ImageOff, Plus } from "lucide-react";
import { listProducts } from "@/lib/server/products";
import { formatNumber } from "@/lib/format";
import { AdminHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <>
      <AdminHeader
        title="Products"
        sub="Your Revit plugins. Only published products appear on the website."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus aria-hidden /> New product
            </Link>
          </Button>
        }
      />
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-12 text-center">
          <p className="font-medium">No products yet</p>
          <p className="mt-1 text-sm text-muted">Add your first plugin: name, description, images and the installer.</p>
          <Button asChild className="mt-6">
            <Link href="/admin/products/new">
              <Plus aria-hidden /> New product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/60">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-bg-elevated">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="absolute inset-0 m-auto size-5 text-muted" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.published ? <Badge variant="success" size="sm">Published</Badge> : <Badge size="sm">Draft</Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{p.taglineEn || "No tagline"}</span>
                  </span>
                  <span className="hidden text-end text-sm sm:block">
                    <span className="block tabular-nums">{p.priceMonthly != null ? `EGP ${formatNumber(p.priceMonthly)}/mo` : "—"}</span>
                    <span className="flex items-center justify-end gap-1 text-xs text-muted">
                      <FileArchive className="size-3.5" aria-hidden />
                      {p.fileName ?? "No installer"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
