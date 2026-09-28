# End-to-end tests

Plain Node scripts that drive a **production build** against a **real Postgres** database, the same code
path the live site uses on Vercel + Neon. They cover every licensing, checkout, renewal, reminder, email,
admin-security and two-step sign-in case listed in [`docs/SECURITY-AND-LICENSING.md`](../../docs/SECURITY-AND-LICENSING.md)
(the case IDs such as `L06` or `R04` match).

## Run

Requirements: Node 20+, a throw-away Postgres database, Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`).

```bash
export DATABASE_URL=postgres://postgres@127.0.0.1:5432/veylix_test   # empty database
export ADMIN_PASSWORD=test-admin-pass-123 CRON_SECRET=cron-test-secret
mkdir -p tests/e2e/.out

# 1. fake mail server (every email the site sends is written to tests/e2e/.out/mail.jsonl)
node tests/e2e/fake-smtp.mjs tests/e2e/.out/mail.jsonl &

# 2. production build + server, sending mail through the fake server via the Gmail code path
npx next build
GMAIL_APP_PASSWORD="test test test test" SMTP_HOST=127.0.0.1 SMTP_PORT=2525 npx next start -p 3000 &

# 3. tests (NODE_PATH lets the scripts find a globally installed playwright)
NODE_PATH=$(npm root -g) node tests/e2e/1-setup.cjs     # admin security, products, keys, settings
NODE_PATH=$(npm root -g) node tests/e2e/2-cases.mjs     # 80 licensing / checkout / renewal / email / MFA cases
```

Run them on an empty database: the cases build on each other (keys bound in one case are reused later).

## Plugin ↔ server consistency

`hardware-vectors.mts` writes 3,000+ hardware comparisons made by the website's rule; `HardwareHarness.cs`
checks that the Revit plugin's C# rule gives identical answers and that its SMBIOS parser works:

```bash
node --experimental-strip-types tests/e2e/hardware-vectors.mts        # writes vectors.tsv
# render VeylixLicense.cs from the admin panel (Products → Download VeylixLicense.cs), then with Mono:
mcs -r:System.Windows.Forms.dll -r:System.Drawing.dll -r:System.Core.dll -out:h.exe VeylixLicense.cs tests/e2e/HardwareHarness.cs && mono h.exe
```
