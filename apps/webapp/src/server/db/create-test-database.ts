import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Database } from "./index";
import * as schema from "./schema";

const migrationsDir = join(
  import.meta.dir,
  "../../../../../supabase/migrations",
);

// A real Postgres server must be reachable here (decision D-9,
// product/feasibility.md — replaces the earlier PGlite setup, whose WASM
// runtime under Bun exited 99 and blew CI hook timeouts). The default is the
// Supabase local stack's database (`mise exec -- supabase start`); CI points
// this at a plain pgvector/pgvector service container instead.
const ADMIN_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:54322/postgres";

// Every test file gets its own throwaway database on that server (the moral
// equivalent of PGlite's throwaway in-process instances): bun test runs files
// in one sequential process, so a pid + counter name is collision-free, and
// parallel `bun test` invocations stay isolated by pid.
const DB_PREFIX = "marginalia_test_";
let counter = 0;
let sweptStaleDatabases = false;

// Databases are not dropped at the end of a run (the factory's callers never
// held a cleanup handle in the PGlite era either — keeping the signature is
// what makes this migration mechanical). Instead, the next run sweeps
// leftovers: a DROP without FORCE fails on databases with live connections,
// so a concurrently running suite is never pulled out from under.
async function sweepStaleDatabases(admin: postgres.Sql): Promise<void> {
  const stale = await admin<{ datname: string }[]>`
    select datname from pg_database where datname like ${`${DB_PREFIX}%`}
  `;
  for (const { datname } of stale) {
    try {
      await admin.unsafe(`drop database "${datname}"`);
    } catch {
      // In use by another run — its own next run will sweep it.
    }
  }
}

// Real Postgres (with real pgvector), one fresh database per test file,
// migrated with the actual migration timeline from supabase/migrations — so
// repository tests also validate the generated migrations. The hand-written
// pgvector migration is applied verbatim (with the `extensions` schema and
// Supabase's search_path recreated first, since only Supabase provisions
// those); Supabase-only migrations (RLS with auth.uid(), storage buckets)
// are intentionally not applied — authorization behavior under test is the
// app-layer scoping.
export async function createTestDatabase(): Promise<Database> {
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  try {
    if (!sweptStaleDatabases) {
      sweptStaleDatabases = true;
      await sweepStaleDatabases(admin);
    }
    const name = `${DB_PREFIX}${process.pid}_${counter++}`;
    await admin.unsafe(`create database "${name}"`);
    // Supabase puts extensions in their own schema on the default
    // search_path (see 20260817000000_enable_pgvector.sql); mirror that so
    // unqualified `vector(n)` and `<=>` resolve exactly as they do hosted.
    await admin.unsafe(
      `alter database "${name}" set search_path to public, extensions`,
    );

    const url = new URL(ADMIN_URL);
    url.pathname = `/${name}`;
    const client = postgres(url.toString(), {
      max: 3,
      idle_timeout: 5,
      onnotice: () => {},
    });
    await client.unsafe("create schema if not exists extensions");
    await client.unsafe(
      readFileSync(
        join(migrationsDir, "20260817000000_enable_pgvector.sql"),
        "utf8",
      ),
    );
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    for (const entry of journal.entries) {
      await client.unsafe(
        readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8"),
      );
    }
    return drizzle(client, { schema });
  } catch (error) {
    throw new Error(
      `createTestDatabase: cannot prepare a test database on ${ADMIN_URL.replace(/:[^:@/]+@/, ":***@")} — ` +
        "is a local Postgres running? Start the Supabase stack " +
        "(`mise exec -- supabase start`) or point TEST_DATABASE_URL at " +
        "another Postgres with pgvector available " +
        "(see apps/webapp/AGENTS.md, Tests).",
      { cause: error },
    );
  } finally {
    await admin.end();
  }
}
