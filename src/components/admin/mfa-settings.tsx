"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { confirmMfaAction, disableMfaAction, newRecoveryCodesAction, startMfaAction, type MfaState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { CopyButton } from "./copy-button";

function Codes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--warning)_45%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-4">
      <p className="text-sm font-semibold">Save these recovery codes now — they are shown only once.</p>
      <p className="mt-1 text-xs text-muted">Each code signs you in once if you lose your phone. Keep them somewhere safe (not on the same phone).</p>
      <ul className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted">
        Copy all <CopyButton value={codes.join("\n")} />
      </div>
    </div>
  );
}

function Message({ state }: { state: MfaState }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" aria-hidden /> {state.message}
      </p>
    );
  return null;
}

export function MfaSettings({ enabled, bypassed, recoveryLeft }: { enabled: boolean; bypassed: boolean; recoveryLeft: number }) {
  const [setup, setSetup] = useState<MfaState>(undefined);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirm, confirming] = useActionState<MfaState, FormData>(confirmMfaAction, undefined);
  const [disableState, disable, disabling] = useActionState<MfaState, FormData>(disableMfaAction, undefined);
  const [codesState, regenerate, regenerating] = useActionState<MfaState, FormData>(newRecoveryCodesAction, undefined);

  if (confirmState?.codes) {
    return (
      <div className="grid gap-4">
        <Message state={confirmState} />
        <Codes codes={confirmState.codes} />
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="grid gap-5">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-success" aria-hidden />
          <span>
            <b>On.</b> Signing in needs your password and a code from your authenticator app. {recoveryLeft} recovery code{recoveryLeft === 1 ? "" : "s"} left.
          </span>
        </p>
        {codesState?.codes ? <Codes codes={codesState.codes} /> : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={regenerate} className="grid content-start gap-3">
            <Field label="New recovery codes" htmlFor="mfa-regen" hint="Replaces all old recovery codes">
              <Input id="mfa-regen" name="code" inputMode="numeric" placeholder="Current 6-digit code" dir="ltr" required />
            </Field>
            <Message state={codesState?.codes ? undefined : codesState} />
            <Button type="submit" variant="secondary" size="sm" disabled={regenerating} className="justify-self-start">
              {regenerating ? <Loader2 className="animate-spin" aria-hidden /> : null} Create new recovery codes
            </Button>
          </form>
          <form action={disable} className="grid content-start gap-3">
            <Field label="Turn off two-step sign-in" htmlFor="mfa-off-pw">
              <Input id="mfa-off-pw" name="password" type="password" autoComplete="current-password" placeholder="Admin password" required />
            </Field>
            <Input name="code" inputMode="numeric" placeholder="Current code or recovery code" aria-label="Current code or recovery code" dir="ltr" required />
            <Message state={disableState} />
            <Button type="submit" variant="ghost" size="sm" disabled={disabling} className="justify-self-start text-danger">
              {disabling ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldOff aria-hidden />} Turn off
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Message state={disableState} />
      {bypassed ? (
        <p className="text-sm text-warning">ADMIN_MFA_DISABLED is set in the environment, so codes are not being asked for. Remove it once you have access again.</p>
      ) : null}
      {!setup?.setup ? (
        <div>
          <p className="text-sm text-muted">
            Protects the admin panel even if someone learns your password. You&apos;ll need an authenticator app such as Google Authenticator, Microsoft
            Authenticator or 1Password.
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={starting}
            onClick={() => startTransition(async () => setSetup(await startMfaAction()))}
          >
            {starting ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />} Turn on two-step sign-in
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <div
            className="size-[180px] overflow-hidden rounded-xl bg-white p-2 [&_svg]:size-full"
            role="img"
            aria-label="QR code for your authenticator app"
            // SVG generated on the server by the qrcode library from our own otpauth URI.
            dangerouslySetInnerHTML={{ __html: setup.setup.qrSvg }}
          />
          <form action={confirm} className="grid content-start gap-3">
            <ol className="grid list-decimal gap-1 ps-5 text-sm text-fg-soft">
              <li>Open your authenticator app and scan this QR code.</li>
              <li>
                Can&apos;t scan? Add a key manually: <span className="break-all font-mono text-xs text-fg">{setup.setup.secret}</span>
              </li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" dir="ltr" required className="max-w-40 font-mono tracking-[0.3em]" aria-label="6-digit code" />
            <Message state={confirmState} />
            <Button type="submit" disabled={confirming} className="justify-self-start">
              {confirming ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} Confirm and turn on
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
