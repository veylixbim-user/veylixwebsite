# VEYLIX — Security & Licensing, A to Z

This is the reference for how VEYLIX licenses behave in **every** case: buying, activating, moving PCs,
trials, monthly renewals, going offline, and what the admin can do. It also covers how the website and admin
panel are protected. Each case lists what happens, the message the customer sees, and the automated test that
proves it (IDs like `L06` refer to [`tests/e2e`](../tests/e2e/README.md)).

Contents: [The rules](#1-the-rules) · [How a license works](#2-how-a-license-works) ·
[Hardware ID](#3-hardware-id-mac-address-and-more) · [Case matrix](#4-case-matrix) ·
[Threats & defences](#5-threats-and-defences) · [What is deliberately not done](#6-deliberately-not-done) ·
[Runbook](#7-runbook-for-the-admin) · [Settings reference](#8-settings-reference)

---

## 1. The rules

| Rule | How it's enforced |
| --- | --- |
| **One product key = one PC.** | The first activation binds the key to the PC's hardware ID. Any other PC gets `device_mismatch`. |
| **One working license per plugin per PC.** A PC can't hold two licenses for the same plugin. | At activation, the server looks for other working paid keys on the same PC, recognised by hardware, that cover that plugin. A second one is refused (`already_licensed`). At checkout, a PC that came from the plugin's *Buy* button can't pay for a plugin it already owns, and an email that already owns the plugin is asked to renew instead. |
| **Licenses are renewed monthly (or yearly).** | Each paid key has an end date. Renewing adds a month from the *old* end date, so no days are lost. Reminders go out at 7, 3 and 1 days before the end, and once more during grace. |
| **The key is re-checked every 30 days** (admin-editable). | The signed license is valid until *last key entry + 30 days*, capped at the end date + grace. After that the plugin asks for the key again and shows the time remaining. |
| **Grace period** (default 3 days, admin-editable 0–30). | A paid key keeps working that long after its end date, so a late InstaPay renewal doesn't cut anyone off. |
| **Linked to the PC's MAC address "etc."** | The hardware ID combines six hashed signals: SMBIOS UUID, board serial, CPU ID, Windows MachineGuid, drive serial and physical MAC addresses. The MAC is one signal, **never the only one**, because it's easy to spoof. |
| **Free trial: one per PC per plugin.** | A trial is refused on a PC that already had a trial or a paid license for that plugin, even after reinstalling Windows. |
| **Licenses can't be forged.** | Every license is signed with RSA-2048/SHA-256. The plugin only contains the public key, and each reply carries a one-time nonce. |

## 2. How a license works

```
Customer pays by InstaPay ─► enters reference at checkout ─► order "pending" ─► admin checks the transfer
   ─► "Payment received" ─► key issued (end date = +1 month / +12 months) ─► email + order page show the key
Customer downloads installer (key required) ─► installs ─► first command in Revit asks for the key
   ─► POST /api/license/activate {key, deviceId, components, product, nonce}
   ─► server: key valid? not revoked? not past end+grace? right plugin? same PC? PC not already licensed?
   ─► signed license: VLX1|key|deviceId|scope|validUntil|issuedAt|hardStop|checkDays|trial|nonce|components|renewDue
Plugin stores it encrypted (Windows DPAPI) ─► works offline until validUntil ─► every 6 h online: status check
   (revocations, device resets, shorter intervals and renewals reach the PC here)
validUntil passed ─► plugin asks for the key again (re-activation starts a new 30-day period)
```

- `validUntil`: when the plugin next asks for the key (last entry + check interval, capped by `hardStop`).
- `hardStop`: end date + grace, extended while an on-time renewal payment waits for approval. `0` means it never ends.
- `renewDue`: the end date shown to the customer ("Renew by …", "Trial ends …").

## 3. Hardware ID (MAC address and more)

The plugin collects six signals and sends only `SHA-256("VLXHW|type|value")`, truncated to 16 hex. Raw
values never leave the PC.

| Signal | Source | Weight | Changes when |
| --- | --- | --- | --- |
| `uuid` | SMBIOS system UUID (firmware) | 3 | Motherboard replaced |
| `mac` | Burned-in MACs of physical Ethernet/Wi-Fi adapters | 2 | Network card replaced |
| `board` | Baseboard serial (SMBIOS) | 2 | Motherboard replaced |
| `mg` | Windows `MachineGuid` | 2 | Windows reinstalled |
| `cpu` | Processor ID (SMBIOS) | 1 | CPU changed |
| `vol` | System drive volume serial | 1 | Drive formatted |

MAC filtering skips virtual, VPN, Hyper-V, VMware, VirtualBox, Docker, WSL, Bluetooth, Wi-Fi Direct and
tunnel adapters. It also skips locally administered MACs (randomised or spoofed) and multicast addresses.
Placeholder firmware values ("To be filled by O.E.M.", all-zero UUIDs) are ignored.

**Same PC?** If both sides have a UUID, the UUID must match *and* the total weight of matching signals must be
at least 6. Without a UUID, a physical MAC must match *and* the score must be at least 4. The website
(`src/lib/server/hardware.ts`) and the plugin (`Hardware.Same` in `VeylixLicense.cs`) use the identical rule.
The tests compare both on 3,000+ inputs.

| Scenario | Result | Test |
| --- | --- | --- |
| Same PC, nothing changed | ✅ same PC | L01 |
| Windows reinstalled (MachineGuid + drive serial change) | ✅ same PC, key follows | L03, L04 |
| PC renamed | ✅ (the name isn't part of the ID) | — |
| New network card / USB Ethernet / Wi-Fi randomised MAC | ✅ same PC | L07b |
| CPU upgrade, RAM upgrade, extra drive | ✅ same PC | vectors |
| Motherboard replaced | ❌ new PC → admin **Reset device** | vectors |
| Different PC | ❌ `device_mismatch` | L02, L05 |
| Cloned virtual machine (new UUID and MAC) | ❌ `device_mismatch` | L06 |
| Clone with a spoofed MAC but a different UUID | ❌ `device_mismatch` | L07 |
| Older plugin build without hardware list | exact device-ID match only | L13 |

**Hardware-change limiter.** A key follows its PC through at most **3 hardware changes in 30 days**. A 4th
change is refused with `hw_limit` and logged. Constant "changes" mean the key is being passed between PCs. The
keys table shows a **moved N×** badge, and **Reset device** clears the counter (L08, A03).

## 4. Case matrix

### A. Activation and PCs

| # | Case | What happens | Customer sees | Test |
| --- | --- | --- | --- | --- |
| A1 | First activation of a valid key | Key bound to the PC, 30-day period starts | "Activated. The next key check is in 30 days." | L01 |
| A2 | Invalid / mistyped key | Refused, attempt rate-limited | "This product key is not valid." | D01, L16 |
| A3 | Key already used on another PC | Refused | "This key is already activated on another PC. Contact support to move it." | L02 |
| A4 | Same PC re-enters its key (monthly re-check) | New 30-day period | "Activated…" | L03 |
| A5 | Windows reinstall / hardware change on the same PC | Key follows the PC (counted) | "Activated…" | L03, L07b |
| A6 | More than 3 hardware changes in 30 days | Refused, logged, admin can reset | "This key has moved between PCs too often this month…" | L08 |
| A7 | Key for plugin X entered in plugin Y | Refused | "This key is for a different VEYLIX product." | L12 |
| A8 | "All products" key (admin pool) | Works for every plugin on its one PC | — | L10 |
| A9 | Revoked key | Refused at activation, status check and download | "This product key has been disabled." | A02 |
| A10 | Key past end date + grace | Refused | "This product key has expired. Renew your license to continue." | R03 |
| A11 | Malformed device ID / garbage hardware list / oversized request | Rejected safely, no crash | — | L14, L15, L15b |
| A12 | Brute-forcing keys | 20 tries / 10 min per IP, 10 / hour per key → 429 | "Too many attempts…" | L16 |
| A13 | Edited license file (e.g. +1 year) | Signature check fails → plugin asks for the key | "Enter your product key…" | L17 |
| A14 | License file copied to another PC | DPAPI can't decrypt it for another Windows user, and the device check fails → ignored | "Enter your product key…" | (plugin logic) |
| A15 | Replayed server reply | Refused: the nonce must match the request | "The server response could not be verified." | (plugin logic) |

### B. One license per plugin per PC

| # | Case | What happens | Customer sees | Test |
| --- | --- | --- | --- | --- |
| B1 | Second paid key for the same plugin on a PC that already has a working one | Refused, logged `duplicate-blocked` | "This PC already has a working license for this plugin. Use this new key on another PC, or contact VEYLIX support to add it to your current license." | L09 |
| B2 | …after that PC's hardware changed | Still refused (tolerant match) | same | L09b |
| B3 | The second key on a different PC | Works | — | L09c |
| B4 | PC has an "all products" key, then a product key for the same plugin | Refused | same as B1 | L10, L10b |
| B5 | Different plugin on the same PC | Allowed | — | L11 |
| B6 | Old license expired / revoked, then a new key on the same PC | Allowed (only *working* licenses count) | — | logic |
| B7 | Customer opens *Buy* from inside the plugin (URL carries `?device=`) and tries to buy a plugin that PC owns | Checkout refuses before payment | "This PC already has a working license for this plugin. To extend it, tick 'Renewing an existing license?'…" | C05 |
| B8 | Same email buys the same plugin again from a browser | Checkout asks: **Renew my current license** or **This is for another PC** | "You already own this plugin…" | C04, C04b |
| B9 | Team buys 10 keys for 10 PCs | One order, 10 keys, each binds to its own PC | — | C04b |

### C. Free trials

| # | Case | What happens | Customer sees | Test |
| --- | --- | --- | --- | --- |
| C1 | Trial requested | Trial key shown and emailed; the clock starts at first activation (admin-set length, default 14) | "Here's your trial key…" | T01, E03 |
| C2 | Same email asks again | Same key returned (no new trial) | — | T06 |
| C3 | Second trial on the same PC (new email) | Refused | "A free trial was already used on this PC." | T02 |
| C4 | Trial after reinstalling Windows | Refused (tolerant hardware match) | same | T04 |
| C5 | Trial on a PC that already had a paid license | Refused | "This PC already had a paid license for this plugin… Renew your license instead." | T03 |
| C6 | Trial → buy | Paid key allowed on the trial PC, or the trial key itself is renewed at checkout and becomes paid | — | T05, R09 |
| C7 | Trial ends | No grace; the plugin locks, with a reminder email before the end | "Your free trial has ended." | T01, M06 |
| C8 | Clock set back during the trial | Detected → key required again | "Your system clock was changed…" | (plugin logic) |
| C9 | Trials switched off by admin | Trial form hidden, API refuses | — | logic |

### D. Monthly renewal and grace

| # | Case | What happens | Test |
| --- | --- | --- | --- |
| D1 | Key bought monthly | End date = +1 month (yearly: +12) | C03 |
| D2 | 7 / 3 / 1 days before the end | One reminder email per stage, never repeated; the plugin also warns in the last 3 days | M02, M03 |
| D3 | End date passed, within grace | Keeps working; the plugin shows "ended on …, works until …"; a reminder email is sent | R02, M04 |
| D4 | Grace over | Refused (`expired`) | R03 |
| D5 | Renewed early | New end = old end + 1 month (no days lost) | R07 |
| D6 | Renewed during grace | New end = old end + 1 month | R06 |
| D7 | Renewed after the license lapsed | New end = payment date + 1 month | R08 |
| D8 | Renewal paid on time, admin approves later | License keeps working up to 7 days while the payment waits | R04 |
| D9 | Renewal submitted after the license already lapsed | Does not revive it until approved | R05 |
| D10 | Renewal pending → no reminder spam | Reminders pause | M05 |
| D11 | Renewing with a key for another plugin / a never-expiring key / 2 units | Refused with a clear message | C06, C07, C08 |
| D12 | Admin shortens the check interval / forces a re-check | Reaches every PC at its next online check | A01 |
| D14 | Customer paid you outside the website (e.g. InstaPay directly) | **Keys → Manage → Renew +1 month / +1 year**: same rule as D5–D7, trial keys become paid, optional email to the customer, logged | AR1–AR7 |
| D13 | Plugin offline for longer than the check interval | Asks for the key (online needed) — never before `validUntil` | (plugin logic) |

### E. Offline and clock

| # | Case | What happens |
| --- | --- | --- |
| E1 | No internet for 29 days | Works normally (signed license stored locally) |
| E2 | No internet past `validUntil` | Asks for the key; entering it needs internet ("Could not reach the license server…") |
| E3 | Server down / DNS blocked / proxy / captive portal | Same as offline: works until `validUntil`; background checks retry every 6 hours |
| E4 | Clock set back > 10 minutes, or 24 h before the license was issued | Treated as tampering → key required online |
| E5 | Clock set forward | The license just ends sooner; the next online entry fixes it |
| E6 | Time-zone change / daylight saving | No effect (UTC everywhere) |

### F. Buying (InstaPay) and orders

| # | Case | What happens | Test |
| --- | --- | --- | --- |
| F1 | Customer pays and enters the reference | Order pending; you get an email "New InstaPay order … EGP …" (Reply-To = customer) | C01, E02 |
| F2 | Same transfer reference used again | Refused while the first order is pending or paid ("Each transfer pays for one order") | C02, C09 |
| F3 | Admin confirms the transfer | Keys issued, invoice number assigned, customer emailed with keys, order link and "how to start" | C03, E01 |
| F4 | Admin rejects (wrong or missing transfer) | Order rejected; optional email asks for a transfer screenshot | C04b |
| F5 | Prices tampered in the browser | Ignored: the server re-prices from the database, VAT from settings | logic |
| F6 | Under- / over-payment | Admin sees the expected amount next to the reference and decides (approve / reject / contact via the email button) | manual |
| F7 | Order page link | Only works with its secret token (timing-safe check); a wrong token shows nothing | S08 |
| F8 | Checkout flooding | 10 orders / 10 min per IP | logic |

### G. Admin actions on a key

| Action | Effect on the customer's PC | Test |
| --- | --- | --- |
| Revoke | Next status check (≤ 6 h online) → locked; downloads refused | A02 |
| Restore | Works again | A02 |
| Renew +1 month / +1 year | New end date reaches the PC at its next status check (or immediately when the key is entered) | AR1–AR7 |
| Reset device | Key can be activated on a new PC; the old PC is refused; the hardware counter is cleared | A03, A03b |
| Ask for key now | Next status check → plugin asks for the key | A01 |
| Set expiry / check days / product / owner | Applies at the next status check | logic |
| Delete product | Its keys are revoked (never silently become "all products") | logic |

### H. Emails (all from veylixbim@gmail.com)

| Email | To | Test |
| --- | --- | --- |
| New order / new contact message | You (Reply-To = customer) | E02 |
| Keys issued (order approved) | Customer | E01 |
| Order rejected (optional) | Customer | — |
| Trial key | Customer | E03 |
| Renewal / trial-ending reminders | Key owner | E04, M02–M06 |
| Your replies (Inbox / Customers) | Customer | — |
| Every email comes from veylixbim@gmail.com | — | E05 |

## 5. Threats and defences

| Threat | Defence | Residual risk |
| --- | --- | --- |
| Forged or edited license | RSA-2048 signature; public key only in the plugin | None practical |
| Replay of an old server reply | Client nonce inside the signed payload | None practical |
| Sharing one key between PCs | Device binding, tolerant hardware ID, 3-changes/30-days limiter, revoke | Two VMs cloned with identical UUID **and** MAC can't be told apart |
| Buying twice for the same PC | Activation refuses a second working license; checkout blocks or asks | None |
| Trial farming with new emails | One trial per PC (hardware-matched), none after a paid license | A brand-new PC gets a new trial (by design) |
| Patching the plugin DLL to skip checks | **Obfuscate the DLL** (ConfuserEx / Dotfuscator); keys still expire and can be revoked | Any .NET client can be cracked by a determined attacker — see §6 |
| Brute-forcing keys | 79-bit random keys, rate limits per IP and per key | None practical |
| Admin password guessed or leaked | scrypt hash, 5 tries → 15-min lockout, **two-step sign-in (TOTP)** with one-time codes and single-use recovery codes, sessions invalidated on password change | Phishing of both password and code in real time |
| Stolen admin session | `__Host-` cookie, HttpOnly, Secure, SameSite=Strict, HMAC-signed, 12 h | — |
| CSRF on admin actions | SameSite=Strict + Next.js server-action origin check + same-origin check on uploads | — |
| XSS | React escaping everywhere; CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`) | CSP allows inline scripts (needed by Next.js static pages) |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | — |
| SQL injection | Parameterised queries everywhere | — |
| CSV / formula injection in exports | Cells starting with `= + - @` are prefixed with `'` | — |
| Downgrade / sniffing | HSTS (2 years, preload), TLS by Vercel | — |
| Spam through contact / trial / newsletter | Rate limits + honeypot fields | — |
| Uploading files without being admin | Upload tokens only for a signed-in admin from the same site; image/zip size and type limits | — |
| Installer downloaded without a key | Link returned only after key validation (random, unguessable Blob URL) | A buyer could share the link; the plugin still needs a key |
| Hardware identifiers as personal data | Only one-way hashes are sent; the privacy policy says so | — |
| Lost access to the authenticator app | Recovery codes; break-glass `ADMIN_MFA_DISABLED=1` in Vercel | — |
| Leaked signing key | Stored in the database (or `LICENSE_PRIVATE_KEY`); rotate = new key + rebuild the plugins (see runbook) | Old plugins stop accepting new licenses until updated |

## 6. Deliberately not done

- **Hashing product keys in the database.** You asked to see and export every key, which requires storing them.
  The database is encrypted at rest by Neon, and only the admin can read keys.
- **Hardware security module (HSM) for the signing key.** It isn't available on this hosting plan. The key lives
  in the database or an environment variable, which is acceptable for this risk level.
- **Card payments / PCI.** Payment is InstaPay bank transfer only; no card data ever touches the site.
- **Automatic InstaPay verification.** InstaPay has no public API for merchants, so the admin confirms transfers.
  Duplicate references are blocked automatically.
- **"Uncrackable" plugin.** No client-side check is. The defences are signed, expiring, device-bound licenses,
  server-side revocation and obfuscation — enough to make cracking not worth it for a niche engineering tool.
- **Blocking all virtual machines.** Engineers legitimately run Revit in VMs; VMs are treated like any PC.
- **Customer accounts.** Customers are identified by email + key + order token. There are no passwords to leak.

## 7. Runbook for the admin

| Situation | What to do |
| --- | --- |
| Customer got a new PC / replaced the motherboard | **License keys → Manage → Reset device**. They enter the same key on the new PC. |
| Customer sees "moved between PCs too often" | Ask what changed. If legitimate, **Reset device**; if the key is being shared, **Revoke**. |
| Key leaked online | **Revoke** it and send the customer a new key (**Generate keys** → assign to their email). |
| Customer bought the same plugin twice by mistake | **Reject** the second order if it's still pending, or refund it and **Revoke** the extra key. To add it to their license instead: **Set expiry** on the old key (+1 month) and revoke the new one. |
| Payment reversed after keys were issued | **Revoke** the keys from that order (search the order ID on the keys page). |
| Customer paid you directly (not through the website) | **License keys → search the key → Manage → Renew** (+1 month or +1 year, tick "Email the customer"). |
| Customer paid a renewal but the plugin still says "ended" | Approve the order in **Orders**. The license is extended from the old end date and reaches the PC at its next check (or when they re-enter the key). |
| Lost your authenticator phone | Sign in with a **recovery code**. No codes left? Set `ADMIN_MFA_DISABLED=1` in Vercel, redeploy, sign in, turn two-step sign-in off and on again, then remove the variable. |
| Suspect the admin password leaked | **Settings → Admin password** (signs out every session) and make sure two-step sign-in is on. |
| Signing key must change | Delete the `license_keypair` row in the database (or set a new `LICENSE_PRIVATE_KEY`), download a fresh `VeylixLicense.cs` for every product, rebuild and upload the plugins, and ask customers to update. |

## 8. Settings reference

| Setting | Where | Default |
| --- | --- | --- |
| License check interval | Admin → Settings | 30 days |
| Free trial length / trials on/off | Admin → Settings | 14 days / on |
| Renewal grace | Admin → Settings | 3 days |
| Pending-payment grace | Code (`PENDING_PAYMENT_DAYS`) | 7 days |
| Hardware changes before `hw_limit` | Code (`HW_CHANGE_LIMIT`) | 3 per 30 days |
| Plugin background check | Plugin | every 6 hours when online |
| Admin lockout | Code | 5 wrong tries → 15 min per IP |
| Admin session | Code | 12 hours |
| Reminder emails | Vercel Cron (`vercel.json`) daily 06:00 UTC | 7 / 3 / 1 days before, and in grace |
| `CRON_SECRET` | Vercel env var (recommended) | — |
| `ADMIN_MFA_DISABLED` | Vercel env var (break-glass only) | unset |

## 9. Online payments (Paymob)

**Flow.** Checkout creates a pending order and a Paymob *payment intention* (amount in piasters, items incl. VAT, our own reference). The customer pays on Paymob's hosted page (card numbers never reach this site — no PCI scope). Paymob then (a) POSTs a signed callback to `/api/paymob/callback` and (b) redirects the browser to `/api/paymob/return/<order>`. Keys are issued only from an authenticated confirmation.

**What is authenticated.** Paymob's HMAC-SHA512 over the 20 documented transaction fields (order checked against Paymob's worked example in `tests/e2e/paymob-vectors.mts`), compared in constant time. Anything without a valid signature is refused (401) and logged. A signed browser redirect is accepted the same way; a missed callback is recovered by asking Paymob directly (`PAYMOB_API_KEY`) when the customer's order page polls, from the admin "Check with Paymob" button, and from the daily job.

**Money safety rules** (all covered by `tests/e2e/4-payments.mjs`, cases PM01–PM31):

| Situation | Behaviour |
| --- | --- |
| Same confirmation delivered twice / replayed | No-op (unique event key per Paymob transaction); one key, one email |
| Wrong amount or currency | No keys; payment marked `mismatch`; owner emailed |
| Second successful payment on a paid order | No keys; owner told to refund |
| Payment for an order the owner already rejected | No keys; owner told |
| Refund / void reported by Paymob | Recorded, owner emailed; keys are **not** revoked automatically |
| Declined payment | Order stays open; customer can retry or choose another method |
| Fawry / Aman code (pending) | Order waits; page explains; key issued when paid (hours or days later) |
| Callback never arrives | Recovered by inquiry (order page, admin button, daily job) |
| Paymob outage at checkout | Order kept; customer retries from the order page |
| Renewal paid online | The same key is extended from its old end date (no days lost) |
| Callback for an unknown Paymob order | Ignored and logged |
| Cross-site POST to checkout / pay / manual endpoints | 403 (Origin / Sec-Fetch-Site check) |
| Bots | Hidden field + "submitted in under a second" trap → 400; rate limits per IP and per order |
| Return address without cookie or a signed redirect | No order token is revealed (the token never goes to Paymob; it lives in an HttpOnly cookie) |

**Also new in this round.** Every admin sign-in is emailed to the owner and logged; failed sign-ins, lockouts, blocked bots, cross-site requests and suspicious payment events appear in **Admin → Security** (90 days); `/.well-known/security.txt`; `Permissions-Policy`/CORP headers; admin forms no longer wipe what you typed when a value is rejected.

**Not included (yet).** Server-side admin session list/revocation, Cloudflare Turnstile, and Paymob saved-card/subscription callbacks (renewals are one payment per month, by design).

| Setting | Where | Default |
| --- | --- | --- |
| `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` | Vercel env vars | — (online payments off) |
| `PAYMOB_API_KEY` | Vercel env var (optional) | — (no automatic recovery) |
| Integration ID per method | Admin → Settings | empty = method hidden |
| Payment recheck job | Vercel Cron `/api/cron/payments` daily 06:30 UTC | on |
