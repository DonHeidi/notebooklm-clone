# supabase — agent guide

Supabase provides auth/user management, Postgres, pgvector (RAG), and storage.
Initialized with the Supabase CLI (pinned via mise: `mise exec -- supabase`).

## Local development

- `mise exec -- supabase start` runs the full local stack (requires Docker).
- Local defaults match the root `.env.schema` (API on `:54321`, Postgres on
  `:54322`).
- The webapp's database-backed tests default to this stack's Postgres
  (feasibility D-9, since 2026-08-18): `createTestDatabase()` creates
  throwaway `marginalia_test_*` databases on `:54322` and applies the
  migration timeline itself. They are swept on the next test run and safe
  to drop; `supabase db reset` does not touch them. Override the server
  with `TEST_DATABASE_URL` (CI uses a plain `pgvector/pgvector` container).

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
