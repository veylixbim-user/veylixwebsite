"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";
import { loginAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <label htmlFor="password" className="text-sm font-medium text-fg-soft">
        Admin password
      </label>
      <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus aria-invalid={!!state?.error} />
      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        Sign in
      </Button>
    </form>
  );
}
