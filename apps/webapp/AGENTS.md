<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/webapp — agent guide

Next.js (App Router, Turbopack) fullstack app — package name
`@notebooklm-clone/webapp`. TypeScript, TailwindCSS, shadcn/ui, Drizzle ORM
against the Supabase Postgres.

**Runtime split (decision D-1, `product/feasibility.md`):** the production
container runs on **Node** (official Next.js `output: "standalone"` Docker
pattern) because of open Bun-stable bugs around `next build` and streaming.
**Bun** remains the package manager, script runner, and test runner for this
workspace. Revisit when a stable Bun ships the fixes.

## Architecture (Domain Driven Design)

Every feature must be traceable along this path — keep each layer thin and
obvious:

```
app view (src/app/**/page.tsx)
  → URL path (App Router route / route handler)
    → business layer / middleware (src/server/services, src/middleware.ts)
      → repository (src/server/repositories)
        → database (src/server/db — Drizzle client + schema)
```

- **Repository pattern is mandatory**: UI code, route handlers, and server
  actions never import `db` directly — they go through a repository (see
  `src/server/repositories/notebook-repository.ts` for the shape: factory
  function taking `Database` for testability).
- Everything under `src/server/` is server-only.

## Database (Drizzle + Supabase)

- Schema lives in `src/server/db/schema.ts`; only application tables — never
  model or touch Supabase-managed schemas (`auth`, `storage`, `vault`).
- Migrations: `bunx varlock run -- bunx drizzle-kit generate --name <topic>`
  (config in `drizzle.config.ts`) writes Supabase-style timestamped SQL into
  `supabase/migrations/`, forming one ordered timeline with the hand-written
  Supabase-level migrations (extensions before the schema, RLS after — see
  `supabase/AGENTS.md`). Migrations are applied by the Supabase CLI
  (`supabase start` on a fresh stack, `supabase migration up`, or
  `supabase db reset`), not by drizzle-kit. Never use `drizzle-kit push`
  (feasibility D-3: it drops the HNSW operator class).
- `DATABASE_URL` is the pooled (transaction-mode) connection string, so the
  client is created with `prepare: false`.

## Tests

- `bun test` (Bun is the test runner; run from the repo root to sweep all
  workspaces).
- Database-backed tests (repositories, services) need a **real Postgres with
  pgvector** reachable (feasibility D-9). Default: the Supabase local
  stack's database — `mise exec -- supabase start` (requires Docker), the
  same one-command setup local development already needs. Override with
  `TEST_DATABASE_URL` (a superuser/CREATEDB connection string); CI points it
  at a plain `pgvector/pgvector:pg17` service container.
- `createTestDatabase()` (`src/server/db/create-test-database.ts`) gives
  each test file its own throwaway `marginalia_test_*` database, migrated
  with the real `supabase/migrations` timeline (including the hand-written
  pgvector migration; RLS/storage migrations are Supabase-only and skipped —
  authorization under test is the app-layer scoping). Leftover test
  databases are swept at the start of the next run; they are safe to drop at
  any time.
- History: until 2026-08-18 these tests ran on PGlite (in-process WASM
  Postgres), retired by D-9 after Bun-specific exit-99 and cold-init
  failures (`product/feasibility.md`).

## UI

- shadcn/ui components: add with `bunx shadcn@latest add <component>`
  (config in `components.json`; components land in `src/components/ui`).
- Tailwind v4 (CSS-based config in `src/app/globals.css`).

## Rules

- Deployment target is a Scaleway serverless container — **no Vercel-only
  features**; the app must work under `next start`/standalone in a container.
- Env vars go through varlock (root `.env.schema`); never read secrets from
  anywhere else, never commit values.
- Tests: `bun test` (see **Tests** above — DB-backed tests need a running
  Postgres).
- Root conventions apply: see the repository root `AGENTS.md`.
