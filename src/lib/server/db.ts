import "server-only";
import { SCHEMA_SQL } from "./schema";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

interface Driver extends Queryable {
  kind: "postgres" | "pglite";
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Database is not configured. Add a Postgres database (DATABASE_URL) in your hosting settings.");
    this.name = "DatabaseNotConfiguredError";
  }
}

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

/**
 * Production uses any Postgres via DATABASE_URL (e.g. Neon from the Vercel Storage tab).
 * Local development falls back to an embedded Postgres (PGlite) stored in .data/pglite.
 * On Vercel without DATABASE_URL there is no persistent disk, so we refuse instead of losing data.
 */
export function isDatabaseConfigured() {
  if (databaseUrl()) return true;
  if (process.env.VERCEL) return false;
  // PGlite is single-process: skip it while `next build` renders pages in parallel workers.
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

type GlobalWithDb = typeof globalThis & { __veylixDb?: Promise<Driver>; __veylixSchema?: Promise<void> };
const g = globalThis as GlobalWithDb;

async function createPostgresDriver(url: string): Promise<Driver> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max: 5,
    prepare: false, // compatible with pgbouncer / Neon pooled connections
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  const wrap = (runner: typeof sql): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await runner.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
  });
  return {
    kind: "postgres",
    ...wrap(sql),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>) {
      return (await sql.begin((tx) => fn(wrap(tx as unknown as typeof sql)))) as T;
    },
  };
}

async function createPGliteDriver(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdir } = await import("node:fs/promises");
  const dir = process.env.PGLITE_DIR || ".data/pglite";
  await mkdir(dir, { recursive: true });
  const db = await PGlite.create(dir);
  type PgliteLike = { query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }> };
  const wrap = (runner: PgliteLike): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      const res = await runner.query<T>(text, params);
      return res.rows;
    },
  });
  return {
    kind: "pglite",
    ...wrap(db as unknown as PgliteLike),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>) {
      return db.transaction((tx) => fn(wrap(tx as unknown as PgliteLike)));
    },
  };
}

async function driver(): Promise<Driver> {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (!g.__veylixDb) {
    const url = databaseUrl();
    g.__veylixDb = (url ? createPostgresDriver(url) : createPGliteDriver()).catch((err) => {
      g.__veylixDb = undefined;
      throw err;
    });
  }
  const d = await g.__veylixDb;
  if (!g.__veylixSchema) {
    g.__veylixSchema = d
      .transaction(async (tx) => {
        // Serialize schema setup across concurrent serverless instances.
        await tx.query("SELECT pg_advisory_xact_lock(724801)");
        for (const statement of SCHEMA_SQL) await tx.query(statement);
      })
      .catch((err) => {
        g.__veylixSchema = undefined;
        throw err;
      });
  }
  await g.__veylixSchema;
  return d;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await driver()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  return (await driver()).transaction(fn);
}
