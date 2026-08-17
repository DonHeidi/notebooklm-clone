# supabase — agent guide

Supabase provides auth/user management, Postgres, pgvector (RAG), and storage.
Initialized with the Supabase CLI (pinned via mise: `mise exec -- supabase`).

## Local development

- `mise exec -- supabase start` runs the full local stack (requires Docker).
- Local defaults match the root `.env.schema` (API on `:54321`, Postgres on
  `:54322`).

## Schema ownership (convention)

- **Application tables** are owned by Drizzle in
  `apps/webapp/src/server/db/schema.ts`; migrations are generated with
  drizzle-kit **into `supabase/migrations/`** (Supabase-style timestamps,
  see `apps/webapp/AGENTS.md`) and applied by the Supabase CLI together with
  the hand-written ones, in one timestamp-ordered timeline. `meta/` is
  drizzle-kit's journal — commit it, never edit it.
- **Hand-written migrations** cover Supabase-level concerns Drizzle does not
  model: enabling extensions (e.g. `vector`, timestamped before the first
  schema migration), RLS policies (timestamped after the tables they cover),
  storage buckets, triggers on `auth.*`.
- Never modify Supabase-managed schemas (`auth`, `storage`, `vault`) from
  Drizzle.

## Rules

- Keys and connection strings come from varlock/Proton Pass — never commit
  them. The service-role key is server-only.
- `config.toml` is committed; review changes to it like code.
