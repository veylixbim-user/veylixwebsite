"use client";

import * as React from "react";
import { Check, Loader2, Send } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { EMAIL_RE } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

type FormText = { name: string; email: string; message: string; submit: string; success: string; company?: string; seats?: string };

/**
 * Teams enquiry (company + seats) or, with `topics`, the general contact / support form.
 * Messages land in Admin → Inbox and are forwarded to the VEYLIX Gmail inbox.
 */
export function ContactForm({
  t,
  errorsT,
  locale,
  topics,
  topicLabel,
  messageError,
}: {
  t: FormText;
  errorsT: Dictionary["checkout"]["errors"];
  locale?: string;
  topics?: Record<string, string>;
  topicLabel?: string;
  messageError?: string;
}) {
  const [v, setV] = React.useState({ name: "", email: "", company: "", seats: "", message: "", website: "", topic: topics ? Object.keys(topics)[0] : "teams" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = errorsT.name;
    if (!EMAIL_RE.test(v.email.trim())) errs.email = errorsT.email;
    if (topics && v.message.trim().length < 5) errs.message = messageError ?? errorsT.generic;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("loading");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, locale }) });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setErrors({ form: errorsT.generic });
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] p-5 text-success">
        <Check className="size-5 shrink-0" aria-hidden />
        {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label={t.name} htmlFor="ct-name" error={errors.name}>
        <Input id="ct-name" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label={t.email} htmlFor="ct-email" error={errors.email}>
        <Input id="ct-email" type="email" dir="ltr" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </Field>
      {topics ? (
        <Field label={topicLabel ?? ""} htmlFor="ct-topic" className="sm:col-span-2">
          <select
            id="ct-topic"
            value={v.topic}
            onChange={set("topic")}
            className="h-11 w-full rounded-xl border border-border-strong bg-surface-2 px-3.5 text-sm text-fg outline-none focus-visible:border-accent"
          >
            {Object.entries(topics).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label={t.company ?? ""} htmlFor="ct-company">
            <Input id="ct-company" autoComplete="organization" value={v.company} onChange={set("company")} />
          </Field>
          <Field label={t.seats ?? ""} htmlFor="ct-seats">
            <Input id="ct-seats" inputMode="numeric" dir="ltr" value={v.seats} onChange={set("seats")} />
          </Field>
        </>
      )}
      <Field label={t.message} htmlFor="ct-message" className="sm:col-span-2" error={errors.message}>
        <Textarea id="ct-message" value={v.message} onChange={set("message")} rows={topics ? 6 : undefined} aria-invalid={!!errors.message} dir="auto" />
      </Field>
      {errors.form ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="sm:col-span-2" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden className="rtl:-scale-x-100" />}
        {t.submit}
      </Button>
    </form>
  );
}
