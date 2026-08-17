import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// The concrete driver type is an implementation detail; repositories depend
// on this alias so tests can substitute another Drizzle Postgres database
// (e.g. PGlite) without a live connection.
export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | undefined;

// Lazy so that merely importing the type (repositories, tests) never demands
// DATABASE_URL — only actually connecting does.
export function getDb(): Database {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set (run through varlock, see AGENTS.md)",
      );
    }
    // Supabase runs pgbouncer in transaction mode on the pooled connection
    // string, which does not support prepared statements.
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    db = drizzle(client, { schema });
  }
  return db;
}
