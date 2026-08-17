import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (run through varlock, see AGENTS.md)");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  // Generated migrations land in supabase/migrations with Supabase-style
  // timestamp names, so extensions (before) and RLS policies (after) form a
  // single ordered timeline applied by the Supabase CLI. Never `push` (D-3).
  out: "../../supabase/migrations",
  dialect: "postgresql",
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
