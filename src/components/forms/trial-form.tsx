"use client";

import * as React from "react";
import { ArrowRight, Check, Copy, Download, Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { revitVersions } from "@/lib/catalog";
import { fill } from "@/lib/utils";
import { EMAIL_RE } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export function TrialForm({ t, errorsT, common }: { t: Dictionary["trial"]["form"]; errorsT: Dictionary["checkout"]["errors"]; common: Dictionary["common"] }) {
  const [v, setV] = React.useState({ name: "", email: "", company: "", role: t.roles[0], revit: "2025", website: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const [key, setKey] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = errorsT.name;
    if (!EMAIL_RE.test(v.email.trim())) errs.email = errorsT.email;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("loading");
    try {
      const res = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const data = (await res.json()) as { ok: boolean; key?: string };
      if (!data.ok) throw new Error();
      setKey(data.key ?? "");
      setState("done");
    } catch {
      setErrors({ form: errorsT.generic });
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="grid gap-5">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)]">
          <Check className="size-6 text-success" aria-hidden />
        </span>
        <h2 className="text-2xl font-semibold">{t.success}</h2>
        <p className="text-muted">{fill(t.successBody, { email: v.email })}</p>
        {key ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
            <code className="ltr font-mono text-sm font-semibold tracking-wider">{key}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(key);
                  setCopied(true);
                } catch {
                  /* ignore */
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-fg"
            >
              {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? common.copied : common.copy}
            </button>
          </div>
        ) : null}
        <Button asChild size="lg">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page */}
          <a href="/api/download/suite">
            <Download aria-hidden />
            {t.download}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {/* Honeypot */}
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label={t.name} htmlFor="tr-name" error={errors.name}>
        <Input id="tr-name" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label={t.email} htmlFor="tr-email" error={errors.email}>
        <Input id="tr-email" type="email" dir="ltr" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label={t.company} htmlFor="tr-company">
        <Input id="tr-company" autoComplete="organization" value={v.company} onChange={set("company")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.role} htmlFor="tr-role">
          <Select id="tr-role" value={v.role} onChange={set("role")}>
            {t.roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label={t.revit} htmlFor="tr-revit">
          <Select id="tr-revit" value={v.revit} onChange={set("revit")}>
            {[...revitVersions].reverse().map((r) => (
              <option key={r} value={r}>
                Revit {r}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {errors.form ? (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-2" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t.submit}
        {state !== "loading" ? <ArrowRight className="rtl:-scale-x-100" aria-hidden /> : null}
      </Button>
      <p className="text-center text-xs text-muted">{t.privacy}</p>
    </form>
  );
}
