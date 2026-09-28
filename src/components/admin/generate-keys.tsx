"use client";

import { useActionState, useState } from "react";
import { Dialog } from "radix-ui";
import { Download, KeyRound, Loader2, Plus, X } from "lucide-react";
import { generateKeysAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export function GenerateKeys({ products }: { products: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(generateKeysAction, undefined);

  const download = () => {
    if (!state?.keys?.length) return;
    const blob = new Blob([state.keys.join("\r\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `veylix-new-keys-${state.keys.length}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus aria-hidden /> Generate keys
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="pop fixed inset-x-0 top-[8vh] z-[81] mx-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border-strong bg-bg-elevated p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="size-5 text-accent-fg" aria-hidden /> Generate product keys
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">New keys appear in the list and in the CSV export.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <form action={action} className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="How many" htmlFor="gk-count">
                <Input id="gk-count" name="count" inputMode="numeric" defaultValue="100" dir="ltr" />
              </Field>
              <Field label="Valid for" htmlFor="gk-product">
                <Select id="gk-product" name="productId" defaultValue="">
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expiry date" htmlFor="gk-exp" hint="Empty = never expires">
                <Input id="gk-exp" name="expiresAt" type="date" dir="ltr" />
              </Field>
              <Field label="Check interval (days)" htmlFor="gk-days" hint="Empty = use Settings">
                <Input id="gk-days" name="activationDays" inputMode="numeric" dir="ltr" />
              </Field>
            </div>
            <Field label="Note" htmlFor="gk-note" hint="e.g. who these keys are for">
              <Input id="gk-note" name="note" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="trial" className="size-4 accent-[var(--accent)]" /> Trial keys (expire after the trial length, counted from first activation)
            </label>
            {state?.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
            {state?.ok ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-4 py-3 text-sm text-success">
                {state.message}
                <Button type="button" size="sm" variant="secondary" onClick={download}>
                  <Download aria-hidden /> Download .txt
                </Button>
              </div>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Generate
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
