"use client";

import { useActionState, useState } from "react";
import { Dialog } from "radix-ui";
import { Ban, CalendarPlus, Loader2, MonitorX, RotateCcw, Settings2, Timer, Trash2, X } from "lucide-react";
import { keyAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CopyButton } from "./copy-button";

export type KeyView = {
  id: number;
  key: string;
  status: string;
  trial: boolean;
  productId: string | null;
  productName: string | null;
  assignedTo: string | null;
  note: string | null;
  deviceName: string | null;
  deviceId: string | null;
  activatedAt: string | null;
  lastCheckAt: string | null;
  validUntil: string | null;
  expiresAt: string | null;
  activationDays: number | null;
  downloads: number;
  /** Hardware changes the key followed in total, and within the current 30-day window. */
  hwChanges: number;
  hwRecent: number;
  hwSignals: number;
};

function ActionForm({ id, action, children, extra }: { id: number; action: string; children: React.ReactNode; extra?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(keyAction, undefined);
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {extra}
      <div className="flex items-center gap-2">
        {children}
        {pending ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
        {state?.ok ? <span className="text-xs text-success">{state.message}</span> : null}
        {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

export function KeyManage({ k, products }: { k: KeyView; products: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg">
          <Settings2 className="size-3.5" aria-hidden /> Manage
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="pop fixed inset-x-0 top-[5vh] z-[81] mx-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border-strong bg-bg-elevated p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-mono text-lg font-semibold">
                {k.key} <CopyButton value={k.key} />
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {k.trial ? "Trial · " : ""}
                {k.productName ?? "All products"} · <span className="capitalize">{k.status}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
            <dt className="text-muted">Device</dt>
            <dd className="truncate">{k.deviceName ?? (k.deviceId ? "Unnamed device" : "Not activated")}</dd>
            <dt className="text-muted">First activated</dt>
            <dd>{fmt(k.activatedAt)}</dd>
            <dt className="text-muted">Last key entry</dt>
            <dd>{fmt(k.lastCheckAt)}</dd>
            <dt className="text-muted">Valid until (next re-entry)</dt>
            <dd>{fmt(k.validUntil)}</dd>
            <dt className="text-muted">Key expires</dt>
            <dd>{fmt(k.expiresAt)}</dd>
            <dt className="text-muted">Downloads</dt>
            <dd>{k.downloads}</dd>
            <dt className="text-muted">Hardware ID</dt>
            <dd>{k.deviceId ? `${k.hwSignals} signals${k.hwSignals ? "" : " (older plugin)"}` : "—"}</dd>
            <dt className="text-muted">Hardware changes followed</dt>
            <dd className={k.hwRecent >= 2 ? "text-warning" : undefined}>
              {k.hwChanges} total · {k.hwRecent} in the last 30 days (limit 3)
            </dd>
          </dl>

          <div className="mt-5 grid gap-4">
            <div className="flex flex-wrap gap-2">
              {k.status === "revoked" ? (
                <ActionForm id={k.id} action="restore">
                  <Button type="submit" size="sm" variant="secondary">
                    <RotateCcw aria-hidden /> Restore key
                  </Button>
                </ActionForm>
              ) : (
                <ActionForm id={k.id} action="revoke">
                  <Button type="submit" size="sm" variant="secondary" className="text-danger">
                    <Ban aria-hidden /> Revoke key
                  </Button>
                </ActionForm>
              )}
              <ActionForm id={k.id} action="reset-device">
                <Button type="submit" size="sm" variant="secondary" disabled={!k.deviceId}>
                  <MonitorX aria-hidden /> Reset device
                </Button>
              </ActionForm>
              <ActionForm id={k.id} action="force-recheck">
                <Button type="submit" size="sm" variant="secondary" disabled={!k.lastCheckAt}>
                  <Timer aria-hidden /> Ask for key now
                </Button>
              </ActionForm>
            </div>

            <ActionForm
              id={k.id}
              action="renew"
              extra={
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Renew (customer paid you)</p>
                  <p className="text-xs text-muted">
                    Adds time from the current end date — or from today if the license already lapsed past the grace period. A trial key becomes a paid key.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select name="period" defaultValue="monthly" aria-label="Renewal period" className="h-9 w-40">
                      <option value="monthly">+1 month</option>
                      <option value="yearly">+1 year</option>
                    </Select>
                    <label className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--accent)]" /> Email the customer
                    </label>
                  </div>
                </div>
              }
            >
              <Button type="submit" size="sm" disabled={k.status === "revoked"}>
                <CalendarPlus aria-hidden /> Renew
              </Button>
            </ActionForm>

            <ActionForm
              id={k.id}
              action="set-expiry"
              extra={
                <Field label="Key expiry date" htmlFor={`exp-${k.id}`} hint="Empty = never expires">
                  <Input id={`exp-${k.id}`} name="expiresAt" type="date" dir="ltr" defaultValue={k.expiresAt?.slice(0, 10) ?? ""} />
                </Field>
              }
            >
              <Button type="submit" size="sm" variant="secondary">
                Save expiry
              </Button>
            </ActionForm>

            <ActionForm
              id={k.id}
              action="set-days"
              extra={
                <Field label="Check interval for this key (days)" htmlFor={`days-${k.id}`} hint="Empty = use the global setting">
                  <Input id={`days-${k.id}`} name="days" inputMode="numeric" dir="ltr" defaultValue={k.activationDays ?? ""} />
                </Field>
              }
            >
              <Button type="submit" size="sm" variant="secondary">
                Save interval
              </Button>
            </ActionForm>

            <ActionForm
              id={k.id}
              action="assign"
              extra={
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Given to (email / name)" htmlFor={`as-${k.id}`}>
                    <Input id={`as-${k.id}`} name="assignedTo" defaultValue={k.assignedTo ?? ""} />
                  </Field>
                  <Field label="Note" htmlFor={`note-${k.id}`}>
                    <Input id={`note-${k.id}`} name="note" defaultValue={k.note ?? ""} />
                  </Field>
                </div>
              }
            >
              <Button type="submit" size="sm" variant="secondary">
                Save
              </Button>
            </ActionForm>

            <ActionForm
              id={k.id}
              action="set-product"
              extra={
                <Field label="Valid for" htmlFor={`prod-${k.id}`}>
                  <Select id={`prod-${k.id}`} name="productId" defaultValue={k.productId ?? ""}>
                    <option value="">All products</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              }
            >
              <Button type="submit" size="sm" variant="secondary">
                Save product
              </Button>
            </ActionForm>

            <div className="border-t border-border pt-4">
              <ActionForm id={k.id} action="delete">
                <Button type="submit" size="sm" variant="ghost" className="text-danger" onClick={(e) => !confirm(`Delete ${k.key}? This cannot be undone.`) && e.preventDefault()}>
                  <Trash2 aria-hidden /> Delete key
                </Button>
              </ActionForm>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
