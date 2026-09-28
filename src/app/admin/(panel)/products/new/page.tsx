import Link from "next/link";
import { isBlobEnabled } from "@/lib/server/storage";
import { AdminHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <>
      <AdminHeader
        title="New product"
        sub={
          <>
            <Link href="/admin/products" className="hover:text-fg">
              Products
            </Link>{" "}
            / New
          </>
        }
      />
      <ProductForm
        blobEnabled={isBlobEnabled()}
        initial={{
          name: "",
          slug: "",
          taglineEn: "",
          taglineAr: "",
          descriptionEn: "",
          descriptionAr: "",
          featuresEn: "",
          featuresAr: "",
          version: "1.0.0",
          revitVersions: "2021–2025",
          priceMonthly: "",
          priceYearly: "",
          images: [],
          fileUrl: "",
          fileName: "",
          fileSize: "",
          art: "",
          published: false,
          sortOrder: "0",
        }}
      />
    </>
  );
}
