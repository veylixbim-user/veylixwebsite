"use client";

import { useActionState } from "react";
import { Check, ExternalLink, Loader2, PlugZap } from "lucide-react";
import { changePasswordAction, saveSettingsAction, sendTestEmailAction, testPaymobAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useKeepFormAction } from "@/components/admin/use-form-action";

function Status({ state }: { state: ActionState }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" aria-hidden /> {state.message}
      </p>
    );
  return null;
}

export type SettingsFormValues = {
  activationDays: number;
  trialDays: number;
  renewalGraceDays: number;
  trialsEnabled: boolean;
  vatRate: number;
  instapayNumber: string;
  instapayName: string;
  instapayLink: string;
  manualPaymentsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  paymob: { card: string; wallet: string; instapay: string; kiosk: string; installments: string };
};

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-elevated p-3.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function Group({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left w-full">
        <span className="block text-sm font-semibold">{title}</span>
        {sub ? <span className="mt-0.5 block text-xs font-normal text-muted">{sub}</span> : null}
      </legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, onSubmit, pending] = useKeepFormAction<ActionState>(saveSettingsAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Group title="Licensing" sub="How long a plugin works between checks, and how trials and renewals behave.">
        <Field label="License check interval (days)" htmlFor="activationDays" hint="How long the plugin works before it asks for the key again">
          <Input id="activationDays" name="activationDays" inputMode="numeric" defaultValue={initial.activationDays} dir="ltr" />
        </Field>
        <Field label="Free trial length (days)" htmlFor="trialDays" hint="Counted from the first activation in Revit">
          <Input id="trialDays" name="trialDays" inputMode="numeric" defaultValue={initial.trialDays} dir="ltr" />
        </Field>
        <Field label="Renewal grace (days)" htmlFor="renewalGraceDays" hint="A paid license keeps working this many days after its end date, so a late renewal doesn't cut the customer off (0–30)">
          <Input id="renewalGraceDays" name="renewalGraceDays" inputMode="numeric" defaultValue={initial.renewalGraceDays} dir="ltr" />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 self-center text-sm">
          <input type="checkbox" name="trialsEnabled" defaultChecked={initial.trialsEnabled} className="size-5 accent-[var(--accent)]" />
          <span>
            <span className="block font-medium">Offer free trials</span>
            <span className="text-xs text-muted">Shows the free-trial form on the website</span>
          </span>
        </label>
        <Field label="VAT (%)" htmlFor="vatRate" hint="Set 0 if you don't charge VAT">
          <Input id="vatRate" name="vatRate" inputMode="numeric" defaultValue={initial.vatRate} dir="ltr" />
        </Field>
      </Group>

      <Group title="Payment methods on the checkout" sub="Tick what customers may use. Online methods also need the Paymob keys (see “Online payments” above).">
        <Toggle name="onlinePaymentsEnabled" label="Online payments (Paymob)" hint="Cards, wallets, InstaPay, Fawry and installments — keys are issued automatically." defaultChecked={initial.onlinePaymentsEnabled} />
        <Toggle name="manualPaymentsEnabled" label="InstaPay transfer (you check it)" hint="The customer sends money by InstaPay and types the reference; you confirm it in Orders." defaultChecked={initial.manualPaymentsEnabled} />
      </Group>

      <Group title="Paymob payment methods" sub="Paste the Integration ID of each method you enabled in Paymob (Settings → Payment Integrations). Leave a box empty to hide that method. You can list several IDs separated by commas.">
        <Field label="Cards — Visa, Mastercard, Meeza" htmlFor="paymobCard" hint="Online card integration">
          <Input id="paymobCard" name="paymobCard" inputMode="numeric" defaultValue={initial.paymob.card} placeholder="e.g. 4569876" dir="ltr" />
        </Field>
        <Field label="Mobile wallets" htmlFor="paymobWallet" hint="Vodafone Cash, Orange Cash, e& money, WE Pay">
          <Input id="paymobWallet" name="paymobWallet" inputMode="numeric" defaultValue={initial.paymob.wallet} placeholder="e.g. 4569877" dir="ltr" />
        </Field>
        <Field label="InstaPay (instant, through Paymob)" htmlFor="paymobInstapay" hint="Only once Paymob has enabled InstaPay on your account">
          <Input id="paymobInstapay" name="paymobInstapay" inputMode="numeric" defaultValue={initial.paymob.instapay} dir="ltr" />
        </Field>
        <Field label="Fawry / Aman / Masary (cash at a shop)" htmlFor="paymobKiosk" hint="The customer gets a reference number to pay at any outlet">
          <Input id="paymobKiosk" name="paymobKiosk" inputMode="numeric" defaultValue={initial.paymob.kiosk} dir="ltr" />
        </Field>
        <Field label="Installments — valU, Sympl, bank plans" htmlFor="paymobInstallments" hint="One or more integration IDs">
          <Input id="paymobInstallments" name="paymobInstallments" inputMode="numeric" defaultValue={initial.paymob.installments} dir="ltr" />
        </Field>
      </Group>

      <Group title="InstaPay transfer details" sub="Shown to customers who choose “InstaPay transfer”.">
        <Field label="InstaPay number or address" htmlFor="instapayNumber">
          <Input id="instapayNumber" name="instapayNumber" defaultValue={initial.instapayNumber} dir="ltr" />
        </Field>
        <Field label="Account name shown to customers" htmlFor="instapayName" hint="Optional — helps customers confirm they're paying the right person">
          <Input id="instapayName" name="instapayName" defaultValue={initial.instapayName} />
        </Field>
        <Field label="InstaPay payment link (optional)" htmlFor="instapayLink" hint="From the InstaPay app → your profile → “Share payment link”. Customers get an “Open InstaPay” button and a QR code." className="sm:col-span-2">
          <Input id="instapayLink" name="instapayLink" type="url" defaultValue={initial.instapayLink} placeholder="https://ipn.eg/S/yourname/instapay/…" dir="ltr" />
        </Field>
      </Group>

      <div className="grid gap-3">
        <Status state={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Save settings
        </Button>
      </div>
    </form>
  );
}

/** Creates an unpaid EGP 10 payment request on Paymob to prove the keys and integration IDs are right. */
export function TestPaymobButton() {
  const [state, action, pending] = useActionState<ActionState, FormData>(testPaymobAction, undefined);
  return (
    <form action={action} className="grid gap-2">
      <Status state={state} />
      {state?.ok && state.link ? (
        <a href={state.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent-fg underline-offset-4 hover:underline">
          Open the test payment page <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />} Test the Paymob connection
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <Field label="Current password" htmlFor="current">
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="next">
        <Input id="next" name="next" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Repeat new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <div className="sm:col-span-3">
        <Status state={state} />
        <Button type="submit" variant="secondary" disabled={pending} className="mt-2">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Change password
        </Button>
      </div>
    </form>
  );
}

export function TestEmailButton() {
  const [state, action, pending] = useActionState(sendTestEmailAction, undefined);
  return (
    <form action={action} className="grid gap-2">
      <Status state={state} />
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Send a test email to myself
        </Button>
      </div>
    </form>
  );
}
