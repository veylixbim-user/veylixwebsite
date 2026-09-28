"use client";

import * as React from "react";
import { useActionState } from "react";
import { Dialog } from "radix-ui";
import { ExternalLink, Loader2, Mail, Send, X } from "lucide-react";
import { sendEmailAction, type EmailActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

type Props = {
  to: string;
  name?: string | null;
  subject?: string;
  body?: string;
  messageId?: number;
  label?: string;
  variant?: "primary" | "secondary" | "subtle" | "ghost";
  size?: "sm" | "md";
};

/** "Email customer" button + dialog. Sends from the VEYLIX Gmail inbox; offers Gmail compose as a fallback. */
export function ComposeEmail({ to, name, subject = "", body, messageId, label = "Email", variant = "secondary", size = "sm" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<EmailActionState, FormData>(sendEmailAction, undefined);
  const first = name?.trim().split(/\s+/)[0];
  const initialBody = body ?? `Hi${first ? ` ${first}` : ""},\n\n\n\n— VEYLIX`;

  React.useEffect(() => {
    if (state?.ok) {
      const t = window.setTimeout(() => setOpen(false), 1200);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant={variant} size={size} aria-label={label ? undefined : `Email ${name || to}`} title={label ? undefined : `Email ${name || to}`}>
          <Mail aria-hidden /> {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="pop fixed inset-x-0 top-[6vh] z-[81] mx-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border-strong bg-bg-elevated p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Email {name || to}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Sent from veylixbim@gmail.com — their reply comes back to your Gmail inbox.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <form action={action} className="mt-5 grid gap-4">
            {messageId ? <input type="hidden" name="messageId" value={messageId} /> : null}
            <Field label="To" htmlFor={`to-${to}`}>
              <Input id={`to-${to}`} name="to" defaultValue={to} dir="ltr" required />
            </Field>
            <Field label="Subject" htmlFor={`su-${to}`}>
              <Input id={`su-${to}`} name="subject" defaultValue={subject} required />
            </Field>
            <Field label="Message" htmlFor={`bd-${to}`} hint="Product keys like VLX-XXXX-… are highlighted automatically">
              <Textarea id={`bd-${to}`} name="body" defaultValue={initialBody} rows={10} dir="auto" required />
            </Field>
            {state?.error ? (
              <div role="alert" className="grid gap-2 rounded-xl border border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3 text-sm">
                <p className="text-danger">{state.error}</p>
                {state.fallback ? (
                  <a href={state.fallback} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent-fg hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden /> Open this email in Gmail instead
                  </a>
                ) : null}
              </div>
            ) : null}
            {state?.ok ? (
              <p role="status" className="text-sm text-success">
                {state.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Send
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
