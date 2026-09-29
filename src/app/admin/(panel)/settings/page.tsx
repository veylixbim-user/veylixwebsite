import { getSettings } from "@/lib/server/settings";
import { publicKeyFormats } from "@/lib/server/license-keys";
import { isBlobEnabled } from "@/lib/server/storage";
import { AdminHeader, Card } from "@/components/admin/page-header";
import { PasswordForm, SettingsForm, TestEmailButton, TestPaymobButton } from "@/components/admin/settings-forms";
import { paymobEnv } from "@/lib/server/paymob";
import { methodAvailability } from "@/lib/server/payments";
import { METHOD_LABEL, PAYMENT_METHODS } from "@/lib/payment-methods";
import { siteUrl } from "@/lib/site";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { MfaSettings } from "@/components/admin/mfa-settings";
import { mfaBypassed, mfaEnabled, recoveryCodesLeft } from "@/lib/server/totp";
import { mailProvider } from "@/lib/server/mail";
import { CONTACT_EMAIL } from "@/lib/site";
import { CopyButton } from "@/components/admin/copy-button";

export default async function SettingsPage() {
  const [settings, keys, mfaOn, recoveryLeft] = await Promise.all([getSettings(), publicKeyFormats(), mfaEnabled(), recoveryCodesLeft()]);
  const provider = mailProvider();
  const env = paymobEnv();
  const avail = methodAvailability(settings);
  const callbackUrl = `${siteUrl}/api/paymob/callback`;
  const returnUrl = `${siteUrl}/api/paymob/return/`;
  const dbKind = process.env.DATABASE_URL || process.env.POSTGRES_URL ? "Postgres" : "Local embedded database (development)";

  return (
    <>
      <AdminHeader title="Settings" />
      <div className="grid gap-6">
        <Card>
          <h2 id="payments" className="scroll-mt-24 font-semibold">
            Online payments — Paymob
          </h2>
          <p className="mt-1 text-sm text-muted">
            Paymob is an Egyptian, Central-Bank-licensed payment gateway. With it customers pay by <b>Visa / Mastercard / Meeza card</b>, mobile wallet, Fawry, InstaPay or installments,
            and their product key is issued and emailed <b>automatically</b> the moment the payment is confirmed. Card numbers are typed on Paymob&apos;s page and never reach this website.
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              {env ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <CircleAlert className="size-4 text-warning" aria-hidden />}
              {env ? (
                <span>
                  Paymob keys found — <b className={env.testMode ? "text-warning" : "text-success"}>{env.testMode ? "TEST mode (no real money)" : "LIVE mode (real money)"}</b>
                </span>
              ) : (
                <span>Paymob keys are not set yet — customers can only pay by InstaPay transfer.</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              {env?.apiKey ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <CircleAlert className="size-4 text-muted" aria-hidden />}
              <span>{env?.apiKey ? "PAYMOB_API_KEY set — missed callbacks are recovered automatically." : "Optional: add PAYMOB_API_KEY so the site can recover a payment whose callback was missed."}</span>
            </li>
            <li className="text-muted">
              On the checkout now:{" "}
              {PAYMENT_METHODS.filter((m) => avail[m]).map((m) => METHOD_LABEL[m]).join(" · ") || "—"}
            </li>
          </ul>
          {env ? null : (
            <ol className="mt-4 grid list-decimal gap-1.5 ps-5 text-sm text-fg-soft">
              <li>
                Create a merchant account at <span className="font-mono">paymob.com</span> (business documents are checked by Paymob — usually 1–3 days). Test mode works straight away.
              </li>
              <li>
                In the Paymob dashboard open <b>Settings → API Keys</b> and copy the <b>Secret key</b>, <b>Public key</b> and <b>HMAC secret</b>.
              </li>
              <li>
                In Vercel → Settings → Environment Variables add <span className="font-mono">PAYMOB_SECRET_KEY</span>, <span className="font-mono">PAYMOB_PUBLIC_KEY</span> and{" "}
                <span className="font-mono">PAYMOB_HMAC_SECRET</span> (and optionally <span className="font-mono">PAYMOB_API_KEY</span>), then redeploy.
              </li>
              <li>
                In Paymob open <b>Settings → Payment Integrations</b>, copy the <b>ID</b> of each method (card, wallet, …) into the boxes below and save.
              </li>
            </ol>
          )}
          <dl className="mt-4 grid gap-2 rounded-xl border border-border bg-bg-elevated p-3.5 text-xs sm:grid-cols-[150px_1fr]">
            <dt className="text-muted">Callback address</dt>
            <dd className="flex items-center gap-1 font-mono break-all">
              {callbackUrl} <CopyButton value={callbackUrl} />
            </dd>
            <dt className="text-muted">Return address</dt>
            <dd className="break-all font-mono">{returnUrl}&lt;order id&gt;</dd>
            <dt className="text-muted" />
            <dd className="text-muted">The site sends both to Paymob with every payment, so nothing needs pasting into the Paymob dashboard. Make sure this is your real public address.</dd>
          </dl>
          <div className="mt-4">
            <TestPaymobButton />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Licensing, payment methods & store</h2>
          <p className="mb-5 mt-1 text-sm text-muted">
            Changing the check interval applies to every activated plugin the next time it goes online — no plugin update needed.
          </p>
          <SettingsForm initial={settings} />
        </Card>

        <Card>
          <h2 id="email" className="scroll-mt-24 font-semibold">
            Email — {CONTACT_EMAIL}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Customers write to this address, and the website sends from it: order confirmations with product keys, trial keys, your replies from the Inbox and
            Customers pages, and a notification to you for every new order or message.
          </p>
          <p className="mt-3 text-sm">
            Status:{" "}
            {provider === "gmail" ? (
              <span className="font-medium text-success">Sending from Gmail</span>
            ) : provider === "resend" ? (
              <span className="font-medium text-success">Sending with Resend</span>
            ) : (
              <span className="font-medium text-warning">Not set up — emails are logged but not sent</span>
            )}
          </p>
          {provider ? null : (
            <ol className="mt-3 grid list-decimal gap-1.5 ps-5 text-sm text-fg-soft">
              <li>
                Sign in to <b>{CONTACT_EMAIL}</b> and turn on 2-Step Verification (Google Account → Security).
              </li>
              <li>
                Open <span className="font-mono">myaccount.google.com/apppasswords</span>, create an app password named “VEYLIX website” and copy the 16 letters.
              </li>
              <li>
                In Vercel → your project → Settings → Environment Variables add <span className="font-mono">GMAIL_APP_PASSWORD</span> with those letters, then
                redeploy.
              </li>
            </ol>
          )}
          <div className="mt-4">
            <TestEmailButton />
          </div>
        </Card>

        <Card>
          <h2 id="two-step" className="scroll-mt-24 font-semibold">
            Two-step sign-in
          </h2>
          <div className="mt-3">
            <MfaSettings enabled={mfaOn} bypassed={mfaBypassed()} recoveryLeft={recoveryLeft} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Admin password</h2>
          <p className="mb-5 mt-1 text-sm text-muted">After changing it you&apos;ll be signed out everywhere. The new password is stored hashed (scrypt) in your database.</p>
          <PasswordForm />
        </Card>

        <Card>
          <h2 className="font-semibold">License signing key</h2>
          <p className="mt-1 text-sm text-muted">
            The server signs every license with a private RSA key that never leaves your database. The plugin checks signatures with this public key, which is
            already included in the <b>VeylixLicense.cs</b> file you download from each product page.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[
              { label: "Public key (.NET XML)", value: keys.xml },
              { label: "Public key (PEM)", value: keys.pem },
            ].map((k) => (
              <div key={k.label} className="min-w-0 rounded-xl border border-border bg-bg-elevated p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">{k.label}</p>
                  <CopyButton value={k.value} />
                </div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-fg-soft">{k.value}</pre>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">System</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-muted">Database</dt>
            <dd>{dbKind}</dd>
            <dt className="text-muted">File storage</dt>
            <dd>{isBlobEnabled() ? "Vercel Blob" : process.env.VERCEL ? "Not connected — add Blob storage in Vercel" : "Local folder (development)"}</dd>
            <dt className="text-muted">Email</dt>
            <dd>{provider === "gmail" ? `Gmail (${CONTACT_EMAIL})` : provider === "resend" ? "Resend" : "Not set up — see Email above"}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
