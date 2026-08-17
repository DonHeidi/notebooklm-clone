import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "./index";
import * as schema from "./schema";

const migrationsDir = join(
  import.meta.dir,
  "../../../../../supabase/migrations",
);

// In-process Postgres (PGlite) with pgvector, migrated with the actual
// Drizzle-generated SQL — so repository tests also validate the generated
// migrations, without a live database. Supabase-only migrations (extension
// schema placement, RLS with auth.uid()) are intentionally not applied;
// authorization behavior under test is the app-layer scoping.
export async function createTestDatabase(): Promise<Database> {
  const client = new PGlite({ extensions: { vector } });
  await client.exec("create extension if not exists vector;");
  const journal = JSON.parse(
    readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  for (const entry of journal.entries) {
    await client.exec(
      readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8"),
    );
  }
  // Runtime-compatible: repositories only use the dialect-independent
  // Drizzle query API.
  return drizzle(client, { schema }) as unknown as Database;
}
