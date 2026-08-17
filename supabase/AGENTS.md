# supabase — agent guide

Supabase provides auth/user management, Postgres, pgvector (RAG), and storage.
Initialized with the Supabase CLI (pinned via mise: `mise exec -- supabase`).

## Local development

- `mise exec -- supabase start` runs the full local stack (requires Docker).
- Local defaults match the root `.env.schema` (API on `:54321`, Postgres on
  `:54322`).

## Schema ownership (convention)

- **Application tables** are owned by Drizzle in
  `apps/webapp/src/server/db/schema.ts`; migrations are generated and applied
  with drizzle-kit (see `apps/webapp/AGENTS.md`).
- **`supabase/migrations/`** is reserved for Supabase-level concerns Drizzle
  does not model: enabling extensions (e.g. `vector`), RLS policies, storage
  buckets, triggers on `auth.*`.
- Never modify Supabase-managed schemas (`auth`, `storage`, `vault`) from
  Drizzle.

## Rules

- Keys and connection strings come from varlock/Proton Pass — never commit
  them. The service-role key is server-only.
- `config.toml` is committed; review changes to it like code.
