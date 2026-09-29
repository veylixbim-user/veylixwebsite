# VEYLIX — Website, store and license server

The VEYLIX website sells electrical BIM plugins for Autodesk Revit. It runs in English and Arabic (with full right-to-left layout) and prices everything in Egyptian Pounds.
It is also the **store** (InstaPay orders), the **download portal** (product key required), the
**license server** the Revit plugins talk to, and an **admin panel** for running all of it.

Contact / support inbox: **veylixbim@gmail.com**. Customers write here, and every email the site sends comes from it.

---

## Going live on Vercel (15 minutes)

1. **Merge the pull request** into `main`. Vercel deploys `main`.
2. In Vercel open the project → **Storage**:
   - **Create database → Neon (Postgres)** → connect it to this project. This adds `DATABASE_URL`.
   - **Create → Blob** → connect it. This adds `BLOB_READ_WRITE_TOKEN` (installers and images live here).
3. Project → **Settings → Environment Variables**, add:
   | Name | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | your admin password |
   | `GMAIL_APP_PASSWORD` | a Gmail **App Password** for veylixbim@gmail.com (see [Email](#email)) |
   | `CRON_SECRET` | any long random text — protects the daily renewal-reminder and payment-recheck jobs |
   | `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` | from Paymob → Settings → API Keys (turns on card / wallet / Fawry / InstaPay payments — see [Online payments](#online-payments-paymob)) |
   | `PAYMOB_API_KEY` | optional — lets the site recover a payment whose confirmation was missed |
4. **Deployments → Redeploy** so the new variables are picked up.
5. Open `https://<your-site>/admin`, sign in, and add your first plugin.
6. In **Admin → Settings → Two-step sign-in**, turn it on with an authenticator app and keep the recovery codes safe.

> The password is **not** in the code: this repository is public, so secrets only live in Vercel.
> Because the password was shared in a chat, change it once from **Admin → Settings → Admin password**.

---

## The admin panel (`/admin`)

| Page | What you do there |
| --- | --- |
| **Dashboard** | Keys, active PCs, pending payments, recent activity and a setup checklist. |
| **Products** | Add a plugin: name, EN/AR tagline, description and features, prices (monthly / yearly EGP), Revit versions, images, **card artwork**, and the installer. **Choose plugin folder** zips your build folder in the browser. Source code, `obj/`, `backup/`, `.csproj`, `.py`, `build.bat` and similar files are unticked automatically. Each product page also has **Download VeylixLicense.cs** (see below). |
| **License keys** | 1,000 keys are generated on your first sign-in. Search, filter, **export CSV**, generate more (for one product or all products; trial or paid). **Manage** a key to revoke or restore it, reset its PC, "ask for the key now", or set its expiry, check interval, owner or product. |
| **Orders** | InstaPay orders waiting for you. Check the transfer in your bank app, then **Payment received — issue keys**. Keys appear on the customer's order page and are emailed to them. You can also reject an order, which emails the customer too. |
| **Inbox** | Messages from the website's contact forms. Reply from the panel; the message is also forwarded to Gmail. |
| **Customers** | Everyone who gave an email address: buyers, trial users, newsletter sign-ups and people who wrote in. Email any of them, copy all addresses for BCC, or export CSV. |
| **Design library** | All the original VEYLIX illustrations and animations: product line-art, icon badges, logo (static and animated), hero circuit traces, command-palette terminal, panel schedule, floor plan, before/after slider, counters, marquee. Replay them and download them as **SVG** (animated or still) or **PNG**. |
| **Settings** | License check interval (default 30 days), free-trial length and on/off, renewal grace (default 3 days), InstaPay number and name, VAT, email status and a test email, **two-step sign-in**, admin password, the license public key. |

### Email

All mail is sent from **veylixbim@gmail.com** through Gmail. This covers:
- order confirmations with product keys,
- trial keys,
- your replies from the admin panel,
- a notification to you for every new order or message.

Replies from customers land in the same Gmail inbox.

To switch it on:
1. Sign in to veylixbim@gmail.com and turn on **2-Step Verification** (Google Account → Security).
2. Open **myaccount.google.com/apppasswords**, create one called "VEYLIX website" and copy the 16 letters.
3. Add them in Vercel as `GMAIL_APP_PASSWORD`, then redeploy. Use **Settings → Send a test email** to check.

Until then nothing is lost: messages are saved in the Inbox, order keys show on the order page,
and the Email button offers to open the message in Gmail instead.

---

## Online payments (Paymob)

Customers can pay by **Visa / Mastercard / Meeza card, mobile wallet (Vodafone Cash…), InstaPay, Fawry / Aman / Masary, or installments (valU, Sympl, bank plans)** in EGP, and their key is issued and emailed **automatically** the moment Paymob confirms the payment. Card numbers are typed on Paymob's own page — never on this site. The manual "InstaPay transfer" (you check it) stays available as a fallback.

Setup (test mode works before Paymob verifies your business):

1. Create a merchant account at paymob.com. In the dashboard: **Settings → API Keys** → copy the *Secret key*, *Public key* and *HMAC secret*; **Settings → Payment Integrations** → copy the *ID* of each method you enabled.
2. In Vercel add `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` (and optionally `PAYMOB_API_KEY`), then redeploy.
3. Open **Admin → Settings → Online payments**, paste the integration IDs, save, and press **Test the Paymob connection**. Make a test payment with Paymob's test card, then switch Paymob to Live and replace the keys/IDs with the live ones.

Admin → **Orders → New payment link** creates a secure link for a customer (also for renewals); **Payments** lists every attempt. The site sends Paymob its own callback and return addresses with each payment, so nothing needs pasting into the Paymob dashboard. Security and edge cases (wrong amount, replays, lost callbacks, refunds) are described in `docs/SECURITY-AND-LICENSING.md` §9.

## How licensing works

> The complete A–Z reference — every case (buying twice, moving PCs, reinstalling Windows, trials, late
> renewals, offline, clock changes…), what the customer sees, what you can do, and the test that proves it — is in
> **[docs/SECURITY-AND-LICENSING.md](docs/SECURITY-AND-LICENSING.md)**.

1. **Buying:** the customer pays by InstaPay to **01100444395** and enters the transfer reference. You confirm
   the payment in **Orders**, and a product key (`VLX-XXXX-XXXX-XXXX-XXXX`) is issued.
2. **Downloading:** `/download` asks for the product key. Only a valid key for that plugin unlocks the installer.
3. **Activating inside Revit:** the first command asks for the key. The server **locks the key to that PC**
   (a hardware ID made from hashed SMBIOS UUID, board serial, CPU ID, Windows ID, drive serial and MAC
   addresses — a Windows reinstall or new network card keeps the license, another PC doesn't) and returns a
   license **signed with an RSA-2048 private key** that never leaves your database. A PC can hold **one working
   license per plugin**: a second key for the same plugin is refused on it, and checkout stops customers from
   paying twice.
4. **Monthly renewal:** a key bought monthly ends after a month. Reminder emails go out 7, 3 and 1 days before;
   renewing (checkout → "Renewing an existing license?" → same key) adds a month from the old end date. A
   3-day grace period (editable) covers late InstaPay renewals.
5. **Monthly re-check:** the license is valid for the **check interval** (30 days by default, editable in
   Settings, and per key in Manage). When it runs out, the plugin asks for the key again. The time remaining
   is shown in the status window, and a reminder appears when less than 3 days are left.
6. **Free trial:** `/trial` issues a trial key. The trial clock (editable in Settings) starts at first activation,
   and each PC gets one trial per plugin.
7. **Changes reach the PC:** while Revit is online, the plugin checks the server every 6 hours.
   Revoking a key, resetting its PC, shortening the interval or "ask for key now" all apply without a plugin update.

### Adding licensing to a plugin

1. In **Products → your plugin** click **Download VeylixLicense.cs**. The file is generated for that product
   and already contains the server address, the product id and the public key.
2. Add it to the Visual Studio project. It needs WinForms for the key window:
   - .NET Framework 4.8 (Revit 2021–2024): reference `System.Windows.Forms` and `System.Drawing`.
   - .NET 8 (Revit 2025+): add `<UseWindowsForms>true</UseWindowsForms>` to the `.csproj`.
3. First line of **every** `IExternalCommand.Execute`:
   ```csharp
   if (!Veylix.Licensing.VeylixLicense.Require()) return Result.Cancelled;
   ```
4. Optional: a ribbon button that shows the time remaining and lets the user change key:
   ```csharp
   Veylix.Licensing.VeylixLicense.ShowStatus();
   ```
5. Rebuild, **obfuscate** the DLL (recommended), then upload the build folder in the admin panel.

The file is C# 7.3 with no NuGet packages. It is checked with the Mono C# compiler, and its signature check
is verified against real server licenses.

### Security

- **Licenses can't be forged or edited.** They are signed server-side (RSA-2048, SHA-256), and the plugin only
  holds the public key. A replayed server reply is rejected: each request carries a one-time nonce.
- **One PC per key.** A key is locked to a hardware ID (Windows machine GUID + system volume serial + computer
  name). The license file is encrypted with Windows DPAPI and ignored on any other PC.
- **Clock tricks** (setting Windows' date back) are detected and force a key re-entry.
- **Brute force is throttled.** Activation, status, download, trial, checkout and contact endpoints are rate-limited.
  Admin sign-in locks out after 5 wrong passwords for 15 minutes.
- **Admin:**
  - The password is stored hashed (scrypt); two-step sign-in (authenticator app + recovery codes) is built in.
  - Sessions are signed `__Host-` cookies (HttpOnly, Secure, SameSite=Strict), and changing the password signs
    out every session.
  - Uploads are limited to signed-in admins from the same site.
- **Website:** strict security headers (CSP, HSTS, no framing), rate limits on every public form, and CSV exports
  safe against spreadsheet formulas.
- **Installers** are only handed out for a valid key. Your source code is excluded from uploaded folders by default.

No client-side licensing is impossible to crack: someone determined can patch a .NET DLL to skip the check.
Obfuscating the DLL (e.g. with ConfuserEx or Dotfuscator) makes that much harder. The server side also limits
the damage: keys are single-PC, expire, and can be revoked.

---

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD at least
npm run dev                  # http://localhost:3000  (admin: /admin)
npm run lint && npm run typecheck && npm run build
```

Without `DATABASE_URL`, an embedded Postgres (PGlite) is created in `.data/pglite`, and uploads go to
`.data/uploads`. Both are git-ignored.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Motion, Radix UI, lucide-react.
The backend uses Postgres (postgres.js, or PGlite locally), Vercel Blob and Nodemailer (Gmail SMTP).

## Project layout

```
src/
  app/[locale]/          public pages: home, products/[slug], pricing, download, trial, checkout,
                         order/[id] (order status + tax invoice), contact, enterprise, docs, legal
  app/admin/             admin panel (login + pages under (panel)/), server actions in actions.ts
  app/api/license/       activate + status endpoints used by the Revit plugin
  app/api/               download, trial, checkout, contact, newsletter, admin uploads/exports
  components/            sections, layout, forms, admin, mockups (SVG art), motion
  i18n/dictionaries/     en.ts, ar.ts — all website copy (ar.ts is type-checked against en.ts)
  lib/server/            database, schema, products, license keys, orders, auth, mail, storage
  lib/plugin-kit/        the VeylixLicense.cs template
  lib/art.ts             the built-in product artwork ids
  proxy.ts               locale detection (Next 16 "proxy", formerly middleware)
```

Copy and translations live in `src/i18n/dictionaries/`. Product content, prices and images are managed in the
admin panel. Brand colours are the CSS variables at the top of `src/app/globals.css`.
