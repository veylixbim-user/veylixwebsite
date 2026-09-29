import { cn } from "@/lib/utils";
import type { MethodAvailability } from "@/lib/payment-methods";

/**
 * Small, self-drawn marks for the payment methods we accept. They are simplified — the exact colours are what people
 * recognise — and only ever shown for methods that are really switched on.
 */
export function MastercardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={cn("h-4 w-auto", className)} aria-hidden>
      <circle cx="11.5" cy="10" r="8" fill="#EB001B" />
      <circle cx="20.5" cy="10" r="8" fill="#F79E1B" />
      <path d="M16 3.6a8 8 0 0 1 0 12.8 8 8 0 0 1 0-12.8Z" fill="#FF5F00" />
    </svg>
  );
}

export function VisaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 14" className={cn("h-3 w-auto", className)} aria-hidden>
      <text x="0" y="12" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="15" letterSpacing="-0.5" fill="#1A1F71" className="dark:fill-white">
        VISA
      </text>
    </svg>
  );
}

const CHIP = "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg-soft";

/**
 * The row of accepted methods. `soon` (when given) adds a muted "cards, wallets & Fawry coming soon" chip while
 * online payments aren't switched on yet.
 */
export function PaymentBadges({
  methods,
  labels,
  soon,
  className,
}: {
  methods: MethodAvailability;
  labels: { card: string; fawry: string; wallet: string; meeza: string; instapay: string };
  soon?: string;
  className?: string;
}) {
  const online = methods.card || methods.wallet || methods.instapay || methods.kiosk || methods.installments;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {methods.card ? (
        <>
          <li className={cn(CHIP, "ltr")}>
            <VisaMark />
          </li>
          <li className={cn(CHIP, "ltr")}>
            <MastercardMark />
            <span>Mastercard</span>
          </li>
          <li className={cn(CHIP, "ltr")}>{labels.meeza}</li>
        </>
      ) : null}
      {methods.wallet ? <li className={CHIP}>{labels.wallet}</li> : null}
      {methods.kiosk ? <li className={CHIP}>{labels.fawry}</li> : null}
      {methods.installments ? <li className={cn(CHIP, "ltr")}>valU · Sympl</li> : null}
      {methods.instapay || methods.transfer ? (
        <li className={cn(CHIP, "ltr border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_9%,transparent)] text-accent-fg")}>{labels.instapay}</li>
      ) : null}
      {!online && soon ? <li className={cn(CHIP, "text-muted")}>{soon}</li> : null}
    </ul>
  );
}
