# supabase — agent guide

Supabase provides auth/user management, Postgres, pgvector (RAG), and storage.
Initialized with the Supabase CLI (pinned via mise: `mise exec -- supabase`).

## Tool ownership: Terraform vs Supabase CLI (B5)

The hosted project (`ahphkkvsofqmxkqzbica`) is managed by two tools with a
hard boundary at the resource level:

- **Terraform** (`infrastructure/supabase.tf`, adopted by import in B5) owns
  the project **lifecycle**: existence, org, region, name, API-key mode
  (`legacy_api_keys_enabled`), and reading the API keys
  (`supabase_apikeys` data source → container env). It carries
  `prevent_destroy`; a plan that wants to replace/destroy the project is
  never applied (Free tier, no backups).
- **Supabase CLI** owns everything else, exactly as before B5: migrations
  (`supabase db push`), storage buckets/policies (via migrations), and all
  runtime settings modeled by `config.toml` — auth (incl. the
  `[remotes.demo]` overrides), api, storage, network restrictions, SSL
  enforcement — applied with `supabase config push`.
- The provider's `supabase_settings` resource is **deliberately not
  instantiated**: every settings category it exposes (api, auth, database,
  network, pooler, storage, ssl_enforcement) has a `config.toml`
  namespace, so importing it would put every `config push` and every
  `terraform apply` in a standing double-ownership fight over the same
  fields. If Terraform ever needs a settings category, move that category's
  ownership wholesale (delete it from `config.toml` remotes in the same
  change) — never split a category across both tools.
- The provider cannot manage migrations, storage policies, or general auth
  config at all (v1.10.x surface: project, settings, apikey, branch,
  edge_function, third_party_auth) — the CLI side of the split is not
  optional.

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
