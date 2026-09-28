"use client";

import * as React from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { EMAIL_RE } from "@/lib/validation";
import { fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CopyInline } from "./copy-inline";
import { DownloadForm } from "./download-form";

export function TrialRequestForm({
  t,
  download,
  products,
  initialProduct,
  trialDays,
}: {
  t: Dictionary["trial"];
  download: Dictionary["download"];
  products: { slug: string; name: string; hasFile: boolean }[];
  initialProduct: string | null;
  trialDays: number;
}) {
  const [v, setV] = React.useState({ name: "", email: "", product: initialProduct ?? products[0]?.slug ?? "", website: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = React.useState<{ key: string; hasFile: boolean; emailed: boolean } | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = t.errors.name;
    if (!EMAIL_RE.test(v.email.trim())) errs.email = t.errors.email;
    if (!v.product) errs.product = t.errors.product;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("loading");
    try {
      const res = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const data = (await res.json()) as { ok: boolean; key?: string; hasFile?: boolean; emailed?: boolean; error?: string };
      if (!data.ok || !data.key) {
        setErrors({ form: data.error === "rate_limited" ? t.errors.rate_limited : t.errors.generic });
        setState("idle");
        return;
      }
      setResult({ key: data.key, hasFile: Boolean(data.hasFile), emailed: Boolean(data.emailed) });
      setState("done");
    } catch {
      setErrors({ form: t.errors.generic });
      setState("idle");
    }
  }

  if (state === "done" && result) {
    return (
      <div role="status" className="grid gap-5">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)]">
          <Check className="size-6 text-success" aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">{t.successTitle}</h2>
          <p className="mt-2 text-muted">{fill(result.emailed ? t.successBody : t.successBodyNoEmail, { email: v.email, days: trialDays })}</p>
        </div>
        <CopyInline value={result.key} />
        {result.hasFile ? <DownloadForm product={v.product} t={download} initialKey={result.key} /> : <p className="text-sm text-muted">{download.noFile}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label={t.form.product} htmlFor="tr-product" error={errors.product}>
        <Select id="tr-product" value={v.product} onChange={set("product")}>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.form.name} htmlFor="tr-name" error={errors.name}>
        <Input id="tr-name" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label={t.form.email} htmlFor="tr-email" error={errors.email}>
        <Input id="tr-email" type="email" dir="ltr" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </Field>
      {errors.form ? (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-2" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t.form.submit}
        {state !== "loading" ? <ArrowRight className="rtl:-scale-x-100" aria-hidden /> : null}
      </Button>
      <p className="text-center text-xs text-muted">{t.form.privacy}</p>
    </form>
  );
}
