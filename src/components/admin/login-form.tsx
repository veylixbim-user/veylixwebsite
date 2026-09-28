"use client";

import { useActionState, useState } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { loginAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);
  // Controlled so the password survives the form reset between the password and code steps.
  const [password, setPassword] = useState("");
  const needCode = Boolean(state?.needCode);
  return (
    <form action={action} className="grid gap-4">
      <div className={needCode ? "sr-only" : "grid gap-2"}>
        <label htmlFor="password" className="text-sm font-medium text-fg-soft">
          Admin password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus={!needCode}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!state?.error && !needCode}
        />
      </div>
      {needCode ? (
        <div className="grid gap-2">
          <label htmlFor="code" className="flex items-center gap-2 text-sm font-medium text-fg-soft">
            <KeyRound className="size-4 text-accent-fg" aria-hidden /> Code from your authenticator app
          </label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required autoFocus dir="ltr" className="font-mono tracking-[0.3em]" />
          <p className="text-xs text-muted">Lost your phone? Enter one of your recovery codes instead.</p>
        </div>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        {needCode ? "Verify and sign in" : "Sign in"}
      </Button>
    </form>
  );
}
