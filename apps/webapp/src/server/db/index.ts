import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (run through varlock, see AGENTS.md)");
}

// Supabase runs pgbouncer in transaction mode on the pooled connection
// string, which does not support prepared statements.
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
export type Database = typeof db;
