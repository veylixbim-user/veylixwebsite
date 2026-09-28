"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { changePasswordAction, saveSettingsAction, sendTestEmailAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

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

export function SettingsForm({ initial }: { initial: { activationDays: number; trialDays: number; renewalGraceDays: number; trialsEnabled: boolean; vatRate: number; instapayNumber: string; instapayName: string } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, undefined);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="License check interval (days)" htmlFor="activationDays" hint="How long the plugin works before it asks for the key again">
          <Input id="activationDays" name="activationDays" inputMode="numeric" defaultValue={initial.activationDays} dir="ltr" />
        </Field>
        <Field label="Free trial length (days)" htmlFor="trialDays" hint="Counted from the first activation in Revit">
          <Input id="trialDays" name="trialDays" inputMode="numeric" defaultValue={initial.trialDays} dir="ltr" />
        </Field>
        <Field label="Renewal grace (days)" htmlFor="renewalGraceDays" hint="A paid license keeps working this many days after its end date, so a late InstaPay renewal doesn't cut the customer off (0–30)">
          <Input id="renewalGraceDays" name="renewalGraceDays" inputMode="numeric" defaultValue={initial.renewalGraceDays} dir="ltr" />
        </Field>
        <Field label="InstaPay number or address" htmlFor="instapayNumber">
          <Input id="instapayNumber" name="instapayNumber" defaultValue={initial.instapayNumber} dir="ltr" />
        </Field>
        <Field label="Account name shown to customers" htmlFor="instapayName" hint="Optional — helps customers confirm they're paying the right person">
          <Input id="instapayName" name="instapayName" defaultValue={initial.instapayName} />
        </Field>
        <Field label="VAT (%)" htmlFor="vatRate" hint="Set 0 if you don't charge VAT">
          <Input id="vatRate" name="vatRate" inputMode="numeric" defaultValue={initial.vatRate} dir="ltr" />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 self-center text-sm">
          <input type="checkbox" name="trialsEnabled" defaultChecked={initial.trialsEnabled} className="size-5 accent-[var(--accent)]" />
          <span>
            <span className="block font-medium">Offer free trials</span>
            <span className="text-xs text-muted">Shows the free-trial form on the website</span>
          </span>
        </label>
      </div>
      <Status state={state} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Save settings
      </Button>
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
