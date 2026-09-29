"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Sits on the order page while a payment is being confirmed. Asks the server every few seconds (the server asks Paymob
 * if the confirmation is slow) and refreshes the page the moment the order is paid, rejected or the payment fails.
 */
export function OrderWatcher({ id, token, initialPayment, label }: { id: string; token: string; initialPayment: string | null; label: string }) {
  const router = useRouter();
  React.useEffect(() => {
    let stopped = false;
    let tries = 0;
    let timer: number | undefined;
    const tick = async () => {
      if (stopped) return;
      tries++;
      try {
        const res = await fetch(`/api/pay/status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status?: string; payment?: string | null };
          if ((data.status && data.status !== "pending") || (data.payment && data.payment !== initialPayment)) {
            router.refresh();
            return;
          }
        }
      } catch {
        /* offline for a moment — try again */
      }
      if (tries < 400) timer = window.setTimeout(tick, tries < 30 ? 3000 : 10_000);
    };
    timer = window.setTimeout(tick, 2500);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [id, token, initialPayment, router]);

  return (
    <p role="status" className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
      <Loader2 className="size-4 animate-spin text-accent-fg" aria-hidden /> {label}
    </p>
  );
}
