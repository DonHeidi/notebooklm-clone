# Session A1 — Phase 1 domain schema (2026-08-17)

## Goal

The Phase 1 domain model as code: Drizzle schema, generated SQL migrations,
RLS, and repositories for notebooks, sources, chunks, conversations,
messages, citations, and notes. Replaces the scaffold's placeholder
`notebooks` example table/repository.

## What was done

- `apps/webapp/src/server/db/schema.ts`: 7 tables + 3 enums. Chunks carry
  the full citation location metadata (CF-07): source id, chunk index, text,
  char start/end offsets, nullable page number and section heading, a
  `vector(2000)` embedding, and a stored generated `tsvector` column
  (`to_tsvector('english', text)`) for the full-text half of hybrid search.
  Citations link message → chunk with a 1-based ordinal and the quoted
  excerpt. Notes optionally reference the message they were saved from
  (`on delete set null`), so save-as-note keeps citations reachable (CF-10).
- Migration pipeline reworked into **one timestamp-ordered timeline in
  `supabase/migrations/`** applied by the Supabase CLI:
  1. `20260817000000_enable_pgvector.sql` (hand-written; extension into the
     `extensions` schema),
  2. `20260817163034_domain_schema.sql` (drizzle-kit `generate` with
     `migrations.prefix: "supabase"`; drizzle's journal in
     `supabase/migrations/meta/`),
  3. `20260817170000_rls_policies.sql` (hand-written; RLS enable + owner
     policies on all 7 tables, keyed on `notebooks.owner_id = auth.uid()`
     and cascading to children via their FK chain).
  This kills the chicken-and-egg problem of a separate drizzle-kit-applied
  directory (RLS referencing tables that `supabase start` hadn't created).
  `drizzle-kit push` is never used (feasibility D-3).
- Repositories per aggregate (factory functions taking `Database`):
  `notebook-repository` (create/rename/delete/find — CF-01),
  `source-repository` (create/list/find/update/delete + `replaceChunks` for
  ingestion/reprocessing), `conversation-repository` (create/list/find/
  delete + `appendMessage` with citations in a transaction + `listMessages`
  with citations), `note-repository` (CRUD incl. `sourceMessageId`).
  Every method takes the owner id and scopes by it (app-layer authz; RLS is
  defense-in-depth because the app connects via the pooler as `postgres`).
  Missing and foreign rows both surface as `NotFoundError` — no existence
  leaks.
- `db/index.ts`: lazy `getDb()` so importing the `Database` type (tests,
  repositories) doesn't demand `DATABASE_URL`.
- Tests: 17 bun tests across 4 files run against **PGlite** (in-process WASM
  Postgres with pgvector) migrated with the actual generated SQL — so tests
  validate the migrations, the generated tsvector, cascades, and the
  owner-scoping of every method, with no live database.

## Decisions

- **Embedding dimension 2000** (`vector(2000)`). Verified from Scaleway's
  docs: `qwen3-embedding-8b` (D-4) natively outputs 4096 dims, above
  pgvector's 2000-dim HNSW ceiling for `vector` (halfvec would cap at 4000 —
  still too small). The model is Matryoshka-trained (32–4096 configurable),
  and Scaleway's FAQ explicitly recommends requesting `2,000` dimensions for
  pgvector hnsw/ivfflat. Ingestion (A3) must pass `dimensions: 2000` on the
  embeddings call. Constant exported as `EMBEDDING_DIMENSIONS`.
- tsvector uses the `english` config — fine for the demo corpus; revisit for
  multilingual sources (e.g. `simple`, or per-source language).
- Deleting a source cascades chunks → cascades citations pointing at them;
  the citation marker in old messages simply stops resolving. Phase 1
  simplification, noted in the schema.
- HNSW operator class verified in the generated SQL **and** in the live DB:
  `USING hnsw (embedding vector_cosine_ops)`.

## Verified locally

- `bun test`: 17 pass, 0 fail.
- Fresh `mise exec -- supabase start`: all three migrations applied in
  order; psql confirms 7 tables, `vector(2000)`, generated `fts`, HNSW +
  GIN + unique indexes, RLS enabled with one owner policy per table,
  pgvector 0.8.2 in `extensions`.

## Open questions / next sessions

- A2 wires `@supabase/ssr` auth; repositories already take the owner id, so
  route handlers just pass `auth.uid()` through.
- A3/A4: hybrid search (RRF function or query) is deliberately absent from
  the source repository (YAGNI) — add retrieval with A4 alongside the chat
  route.
- Local pgvector is 0.8.x; avoid 0.8-only features until hosted version is
  confirmed (feasibility risk register).
