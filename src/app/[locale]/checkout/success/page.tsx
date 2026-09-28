import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { purchasablePlans, type PurchasablePlanId } from "@/lib/catalog";
import { OrderSuccess } from "@/components/sections/order-success";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/success">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.success.title, robots: { index: false, follow: false } };
}

export default async function SuccessPage({ params }: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const planNames = Object.fromEntries(purchasablePlans.map((p) => [p, dict.pricing.plans[p].name])) as Record<PurchasablePlanId, string>;

  return (
    <div className="container-page max-w-5xl pt-28 pb-8 sm:pt-36">
      <OrderSuccess
        locale={locale}
        t={dict.success}
        common={dict.common}
        planNames={planNames}
        totalsLabels={{ subtotal: dict.checkout.subtotal, vat: dict.checkout.vat, total: dict.checkout.total }}
      />
    </div>
  );
}
