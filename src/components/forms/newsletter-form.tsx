"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NewsletterForm({ t, locale }: { t: Dictionary["newsletter"]; locale: string }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success">
        <Check className="size-4" aria-hidden /> {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {t.label}
        </label>
        <Input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder={t.placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? "newsletter-error" : undefined}
          className="h-10 text-start rtl:text-end"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-10" disabled={state === "loading"}>
          {t.cta}
          <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </Button>
      </div>
      {state === "error" ? (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-danger">
          {t.error}
        </p>
      ) : null}
    </form>
  );
}
