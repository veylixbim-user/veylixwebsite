/** Idempotent schema. Each statement runs on first use in every environment. */
export const SCHEMA_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    tagline_en text NOT NULL DEFAULT '',
    tagline_ar text NOT NULL DEFAULT '',
    description_en text NOT NULL DEFAULT '',
    description_ar text NOT NULL DEFAULT '',
    features_en text NOT NULL DEFAULT '',
    features_ar text NOT NULL DEFAULT '',
    version text NOT NULL DEFAULT '',
    revit_versions text NOT NULL DEFAULT '',
    price_monthly integer,
    price_yearly integer,
    images jsonb NOT NULL DEFAULT '[]'::jsonb,
    file_url text,
    file_name text,
    file_size bigint,
    art text,
    published boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Columns added after the first release.
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS art text`,
  `CREATE TABLE IF NOT EXISTS license_keys (
    id serial PRIMARY KEY,
    key text NOT NULL UNIQUE,
    product_id text REFERENCES products(id) ON DELETE SET NULL,
    revoked boolean NOT NULL DEFAULT false,
    assigned_to text,
    note text,
    order_id text,
    device_id text,
    device_name text,
    activated_at timestamptz,
    last_check_at timestamptz,
    expires_at timestamptz,
    activation_days integer,
    trial boolean NOT NULL DEFAULT false,
    trial_days integer,
    downloads integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS license_keys_product_idx ON license_keys (product_id)`,
  `CREATE INDEX IF NOT EXISTS license_keys_device_idx ON license_keys (device_id)`,
  // Hardware fingerprint (hashed signals), hardware-change limiter and renewal reminders.
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS device_components text`,
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS hw_changes integer NOT NULL DEFAULT 0`,
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS hw_window_start timestamptz`,
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS hw_window_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS reminder_stage integer NOT NULL DEFAULT 0`,
  `ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS reminder_for timestamptz`,
  `CREATE INDEX IF NOT EXISTS license_keys_assigned_idx ON license_keys (lower(assigned_to))`,
  `CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    access_token text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    method text NOT NULL,
    payment_ref text NOT NULL DEFAULT '',
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    company text,
    tax_id text,
    address text,
    renew_key text,
    items jsonb NOT NULL,
    subtotal_cents integer NOT NULL,
    vat_cents integer NOT NULL,
    total_cents integer NOT NULL,
    vat_rate numeric NOT NULL DEFAULT 0,
    license_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
    invoice_number text,
    admin_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_payref_idx ON orders (upper(regexp_replace(payment_ref, '[^A-Za-z0-9]', '', 'g')))`,
  `CREATE INDEX IF NOT EXISTS orders_renew_idx ON orders (renew_key) WHERE renew_key IS NOT NULL`,
  // Online payments (Paymob): when the order was paid, and the page language to send the customer back to.
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS locale text`,
  // One row per online payment attempt. provider_order_id (Paymob's order id) is covered by Paymob's HMAC
  // signature, so callbacks are matched on it — never on fields an attacker could edit.
  `CREATE TABLE IF NOT EXISTS payments (
    id serial PRIMARY KEY,
    order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider text NOT NULL,
    special_reference text NOT NULL UNIQUE,
    intention_id text,
    provider_order_id text,
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'EGP',
    status text NOT NULL DEFAULT 'created',
    transaction_id text,
    method text,
    detail text,
    checked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_idx ON payments (provider, provider_order_id) WHERE provider_order_id IS NOT NULL`,
  // Every callback we act on, keyed by the provider's transaction id + outcome: a replayed or duplicated
  // callback hits the unique constraint and changes nothing.
  `CREATE TABLE IF NOT EXISTS payment_events (
    id serial PRIMARY KEY,
    provider text NOT NULL,
    event_key text NOT NULL,
    payment_id integer,
    source text NOT NULL,
    outcome text NOT NULL,
    detail text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, event_key)
  )`,
  // Admin sign-in sessions (server-side, so they can be listed and revoked one by one).
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    ip text,
    user_agent text,
    revoked boolean NOT NULL DEFAULT false
  )`,
  // Security events: sign-ins, lockouts, rejected payment callbacks, blocked bots, CSP reports.
  `CREATE TABLE IF NOT EXISTS security_events (
    id serial PRIMARY KEY,
    kind text NOT NULL,
    detail text,
    ip text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS security_events_created_idx ON security_events (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip text PRIMARY KEY,
    failures integer NOT NULL DEFAULT 0,
    first_failure_at timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    bucket text PRIMARY KEY,
    count integer NOT NULL DEFAULT 0,
    window_start timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id serial PRIMARY KEY,
    topic text NOT NULL DEFAULT 'support',
    name text NOT NULL,
    email text NOT NULL,
    company text,
    seats text,
    body text NOT NULL DEFAULT '',
    locale text,
    handled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    email text PRIMARY KEY,
    locale text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id serial PRIMARY KEY,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    kind text NOT NULL DEFAULT 'manual',
    status text NOT NULL,
    error text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS email_log_to_idx ON email_log (lower(to_email))`,
  `CREATE TABLE IF NOT EXISTS activity (
    id serial PRIMARY KEY,
    kind text NOT NULL,
    key_id integer,
    product_id text,
    detail text,
    ip text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
];
