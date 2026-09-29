"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Check, Link2, Loader2, Plus, X } from "lucide-react";
import { createPaymentLinkAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CopyButton } from "@/components/admin/copy-button";
import { useKeepFormAction } from "@/components/admin/use-form-action";

/**
 * "New payment link": the owner enters a sale and gets a secure link for the customer to pay by card, wallet, Fawry or
 * InstaPay. The key is issued and emailed automatically when the payment is confirmed.
 */
export function NewPaymentLink({ products, onlineReady }: { products: { id: string; name: string; priceMonthly: number | null; priceYearly: number | null }[]; onlineReady: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useKeepFormAction<ActionState>(createPaymentLinkAction);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus aria-hidden /> New payment link
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="pop fixed inset-x-0 top-[6vh] z-[81] mx-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border-strong bg-bg-elevated p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <Link2 className="size-5 text-accent-fg" aria-hidden /> New payment link
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Enter the sale, send the customer the link, and they pay by card (Visa / Mastercard / Meeza), wallet, Fawry or InstaPay. Their key is issued automatically.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          {!onlineReady ? (
            <p role="alert" className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--warning)_45%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-3 text-sm">
              Online payments aren&apos;t connected yet (Settings → Online payments). The link will still work, but the customer can only pay by InstaPay transfer until Paymob is set up.
            </p>
          ) : null}

          {state?.ok && state.link ? (
            <div className="mt-5 grid gap-3 rounded-xl border border-[color-mix(in_oklab,var(--success)_40%,var(--border))] bg-[color-mix(in_oklab,var(--success)_7%,transparent)] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <Check className="size-4" aria-hidden /> {state.message}
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-bg p-2 font-mono text-xs break-all">
                {state.link} <CopyButton value={state.link} label="Copy link" />
              </div>
              <p className="text-xs text-muted">Send it to the customer by WhatsApp or email. It stays valid until it is paid.</p>
              <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer name" htmlFor="pl-name">
                  <Input id="pl-name" name="name" autoComplete="off" required />
                </Field>
                <Field label="Customer email" htmlFor="pl-email">
                  <Input id="pl-email" name="email" type="email" dir="ltr" autoComplete="off" required />
                </Field>
                <Field label="Mobile number" htmlFor="pl-phone" hint="Required by the payment page">
                  <Input id="pl-phone" name="phone" type="tel" dir="ltr" placeholder="010 1234 5678" autoComplete="off" required />
                </Field>
                <Field label="Plugin" htmlFor="pl-product">
                  <Select id="pl-product" name="productId" required defaultValue="">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.priceMonthly ? ` — EGP ${p.priceMonthly}/mo` : ""}
                        {p.priceYearly ? ` · EGP ${p.priceYearly}/yr` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Period" htmlFor="pl-billing">
                  <Select id="pl-billing" name="billing" defaultValue="monthly">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </Field>
                <Field label="Licenses (PCs)" htmlFor="pl-qty" hint="One key per PC">
                  <Input id="pl-qty" name="quantity" inputMode="numeric" defaultValue="1" dir="ltr" />
                </Field>
                <Field label="Renewing an existing key? (optional)" htmlFor="pl-renew" hint="Paste the customer's key to extend it instead of issuing a new one" className="sm:col-span-2">
                  <Input id="pl-renew" name="renewKey" dir="ltr" placeholder="VLX-XXXX-XXXX-XXXX-XXXX" className="font-mono" autoComplete="off" />
                </Field>
                <Field label="Language of the page" htmlFor="pl-locale">
                  <Select id="pl-locale" name="locale" defaultValue="en">
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </Select>
                </Field>
                <label className="flex cursor-pointer items-center gap-2 self-end pb-3 text-sm">
                  <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--accent)]" /> Email the link to the customer
                </label>
              </div>
              {state?.error ? (
                <p role="alert" className="text-sm text-danger">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending} className="justify-self-start">
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Link2 aria-hidden />} Create payment link
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
