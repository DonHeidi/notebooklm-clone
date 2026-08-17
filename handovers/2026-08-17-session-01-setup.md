# Session 01 — Monorepo setup (2026-08-17)

## Goal

Initialize the repository and scaffold the full monorepo skeleton so feature
work can start.

## What was done

- Git repo initialized on `main`; this session's work on branch
  `chore/setup-monorepo` (worktree `.worktrees/chore-setup-monorepo`).
- Bun workspaces (`apps/*`, `packages/*`); root scripts for dev/build/test.
- `mise.toml` pinning bun 1.3.14, terraform 1.15.8, supabase CLI 2.114.0.
- `apps/webapp`: create-next-app (App Router, TS, Tailwind v4, Turbopack,
  src-dir, bun), shadcn/ui initialized (base-nova preset, neutral), Drizzle ORM
  + postgres-js + drizzle-kit. DDD skeleton under `src/server/` (db client,
  schema with example `notebooks` table, example repository).
- `apps/docs` + `apps/marketing`: create-astro (minimal template) +
  `astro add tailwind`.
- `supabase/`: `supabase init` (config.toml only; local stack not started —
  needs Docker).
- `infrastructure/`: Terraform skeleton for Scaleway (provider ~> 2.81, latest
  from registry): website buckets for docs/marketing, registry + container
  namespaces, `scaleway_container` commented until a first image exists. Local
  state; S3 backend block prepared but commented. `terraform validate` passes.
- varlock `.env.schema` at root (Supabase + Scaleway vars; secrets marked
  sensitive). Values come from Proton Pass via pass-cli — none committed.
- Nested AGENTS.md files (root, webapp, docs, marketing, infrastructure,
  supabase); root `CLAUDE.md` references `@AGENTS.md`.

## Decisions

- Schema ownership split: Drizzle owns application tables
  (`apps/webapp/src/server/db/schema.ts`); `supabase/migrations/` is reserved
  for extensions (pgvector), RLS, storage buckets, `auth.*` triggers.
- `DATABASE_URL` targets the transaction-mode pooler → postgres-js client uses
  `prepare: false`.
- Repositories are factory functions taking the `Database` handle, so they can
  be tested against a stub without a live DB.

## Open / next

- Product scope definition (in progress, parallel to this).
- `supabase start` + first Drizzle migration + pgvector enablement migration.
- No tests yet — `bun test` runner is wired but there is nothing meaningful to
  test in a pure scaffold; first business logic should arrive with tests.
- CI, Dockerfile for the webapp container, S3 state migration, bucket deploy
  pipeline for docs/marketing.
- No git remote configured yet; PR flow starts once one exists.
