import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageMetadata } from "@/lib/metadata";
import { CheckoutForm } from "@/components/forms/checkout-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { ...pageMetadata(locale, "/checkout", dict.checkout.title, dict.checkout.sub), robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="container-page pt-28 pb-8 sm:pt-32">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{dict.checkout.title}</h1>
        <p className="mt-2 text-muted">{dict.checkout.sub}</p>
      </div>
      <CheckoutForm locale={locale} t={dict.checkout} cart={dict.cart} common={dict.common} />
    </div>
  );
}
