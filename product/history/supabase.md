# Supabase — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `supabase/` through session A3 (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/feasibility.md`.
>
> **Update (2026-08-18, session C8):** coverage extended through the full
> merged board — sessions B3 and B5 in the catch-up section below.

## What was built

- **2026-08-17 — Project init** (PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)).
  `supabase init` (config.toml only); the local stack runs via the
  mise-pinned CLI (`mise exec -- supabase start`, needs Docker).
- **2026-08-17 — The migration timeline, session A1**
  (PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)). Three
  ordered migrations in `supabase/migrations/`: enable pgvector (into the
  `extensions` schema), the generated domain schema, and RLS policies on all
  7 tables. Verified on a fresh `supabase start`: `vector(2000)` column, HNSW
  index with `vector_cosine_ops`, GIN on the generated `tsvector`, RLS
  enabled with one owner policy per table, pgvector 0.8.2.
- **2026-08-18 — Sources storage bucket, session A3**
  (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)). Additive
  migration `20260818090000_sources_bucket.sql`: a private `sources` bucket
  with a 20 MB `file_size_limit`, plus owner-only insert/select/delete
  policies on `storage.objects` keyed on the first path segment matching
  `auth.uid()` (upload paths are `<userId>/<uuid>/<filename>`).

No hosted Supabase project exists yet — everything so far runs against the
local stack; a hosted project (and real publishable keys replacing B2's
placeholders) is a B3/A-lane task
(`handovers/2026-08-18-session-b2-ci-deploy.md`).

> **Correction (2026-08-18, session C8):** no longer true — session B3
> (PR [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36))
> provisioned the hosted project the same day, and B5
> (PR [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48)) brought
> it under Terraform. See the catch-up section below.

## Decisions and why

- **Schema ownership split** (session 01, PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)).
  Drizzle owns the application tables
  (`apps/webapp/src/server/db/schema.ts`); `supabase/migrations/` is
  reserved for what Drizzle can't or shouldn't express: extensions
  (pgvector), RLS policies, storage buckets, `auth.*` triggers. This split
  survived every later session unchanged.
- **One timestamp-ordered timeline, applied by the Supabase CLI**
  (session A1, PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)).
  drizzle-kit is configured with `migrations.prefix: "supabase"` so its
  generated SQL lands directly in `supabase/migrations/` between the
  hand-written files, and everything is applied by one tool
  (`supabase migration up` / `db reset`). The alternative — a separate
  drizzle-applied directory — had an unsolvable ordering problem, see below.
- **`drizzle-kit generate`, never `push`** (feasibility **D-3**).
  `drizzle-kit push` has an open bug that regenerates HNSW indexes without
  the operator class, which Postgres rejects (drizzle-orm#5792). Generated
  SQL migrations sidestep it — and A1 checked the generated SQL by hand to
  confirm `USING hnsw (embedding vector_cosine_ops)` survived, then verified
  the same in the live database.
- **pgvector with HNSW at 2000 dimensions** (session A1, PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)).
  pgvector caps HNSW-indexable `vector` columns at 2000 dims; the chosen
  Matryoshka-trained embedding model is truncated to 2000 at request time.
  The full reasoning sits in `product/history/webapp.md` (schema decisions).
- **RLS is defense-in-depth, not the primary guard** (SEC-5 in
  `product/security.md`). The webapp connects via the transaction-mode
  pooler as `postgres`, which RLS does not bind; owner policies (keyed on
  `notebooks.owner_id = auth.uid()`, cascading to children through their FK
  chains) exist for any direct PostgREST/Realtime path. If client-side
  Realtime/PostgREST access is ever added, RLS becomes load-bearing and gets
  re-audited then.
- **Service-role storage access for ingestion** (session A3, PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
  Ingestion runs in Next's `after()`, outside the request's cookie context,
  so it downloads uploads with the service-role key — which bypasses RLS
  entirely (SEC-6). App-layer ownership checks gate every call; the browser
  only ever uploads under its own `auth.uid()` prefix, enforced by the
  storage policies.
- **Standard uploads, not TUS** (session A3). The feasibility study
  suggested TUS resumable uploads (**D-5**); at the prototype's 20 MB cap a
  standard upload is sufficient — TUS was consciously skipped.

## The local development flow

As of A3, the loop is: `mise exec -- supabase start` (fresh stack applies
all migrations in order) → schema changes via
`bunx varlock run -- bunx drizzle-kit generate --name <topic>` → apply with
`supabase migration up` or reset with `supabase db reset`. Repository tests
don't need the stack at all — they run on PGlite (in-process WASM Postgres
with pgvector) migrated with the actual generated SQL, so the migrations
themselves are what's tested.

> **Correction (2026-08-18, session A7, D-9).** Inverted since: PGlite was
> retired (it exits 99 under Bun and its cold init broke CI), and DB-backed
> tests now *default to this stack's Postgres*, creating throwaway
> `marginalia_test_*` databases on `:54322`. The
> migrated-with-the-actual-SQL property is preserved. See
> `product/feasibility.md` D-9 and `supabase/AGENTS.md`.

Local email confirmation is disabled in
`config.toml`, so signup works offline; A2 kept that file unchanged and
handles the confirmation-enabled case defensively anyway.

## Problems and how they were dealt with

- **RLS-before-tables ordering (chicken and egg).** The scaffold's original
  design had drizzle-kit applying its own `drizzle/` directory while the
  Supabase CLI applied `supabase/migrations/` — so a fresh `supabase start`
  would apply the RLS migration before any tables existed. Found in A1 while
  wiring the first real migrations; resolved by the unified timeline
  (everything in `supabase/migrations/`, one applier)
  (PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)).
- **`bunx varlock run` refused all commands while required Supabase values
  were empty.** Found in B1, which needed to run deploys before the A-lane
  had produced any Supabase values — commands ran with `.env.local` sourced
  directly as a workaround. Self-healed in A3 when the two local demo keys
  were appended to `.env.local`
  (`handovers/2026-08-17-session-b1-spike-streaming.md`,
  `handovers/2026-08-18-session-a3-ingestion.md`).
- **Local pgvector may be newer than hosted.** Local is 0.8.2; the
  feasibility risk register flags avoiding 0.8-only features (iterative
  scans) until the hosted version is confirmed. Consciously accepted;
  nothing built so far depends on 0.8 features.
- **Free-tier limits are a known ceiling** (feasibility risk register):
  500 MB database/RAM caps HNSW scale and idle projects pause after a week.
  Accepted at prototype scale; Supabase Pro is planned before demos (B3).

## Where Supabase stands

> **Update (2026-08-18, session C8):** superseded — the hosted project
> exists and is Terraform-managed. See the catch-up section that follows.

Local-only, with the schema, RLS, and storage layout that the hosted project
will inherit by replaying the same migration timeline. The open items are
hosted provisioning (B3), the Realtime question (revisited at D-2 stage 2),
and SEC-5's standing review rule that every new repository/service method
takes and applies `ownerId`.

## Catch-up: sessions B3 and B5 (appended 2026-08-18, session C8)

Written by session C8 from the session handovers and PR descriptions
(#36, #48). The Terraform/platform side of both sessions is in
`product/history/infrastructure.md`; this page carries the database and
`supabase/` side. D2 (PR
[#27](https://github.com/DonHeidi/notebooklm-clone/pull/27)) also added to
the migration timeline in between: the `artifacts` table migration, its
hand-written RLS (A1's owner-chain pattern), and the private `artifacts`
bucket (A3's owner-prefix pattern, 20 MB limit) — the feature story is in
`product/history/webapp.md`.

### What happened

- **2026-08-18 — Hosted project provisioned, session B3**
  (PR [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36)).
  Project `marginalia`, ref `ahphkkvsofqmxkqzbica`, region **eu-west-3
  (Paris)** — colocated with the fr-par container — on the **Free tier**
  (owner decision; the idle-pause trade-off and its before-demo
  operational rule are in `product/feasibility.md`). `supabase link` +
  `supabase db push` applied all 7 migrations cleanly; verification by SQL
  against the hosted DB: 8 tables all with RLS enabled, one owner policy
  per table + 6 `storage.objects` policies, HNSW + GIN indexes present,
  `sources`/`artifacts` buckets private with 20 MB limits — and
  **pgvector 0.8.2 on Postgres 17.6, identical to local**, which resolved
  the feasibility register's "local vs hosted pgvector" risk row.
- **2026-08-18 — Hosted auth config became code, session B3.** All hosted
  auth settings live in `supabase/config.toml` under `[remotes.demo]`
  (project-keyed override section) and are applied with
  `supabase config push` — **zero unrecorded dashboard clicks**. The
  effective config: email+password signup with email confirmation off
  (hosted has no SMTP; Supabase's built-in mailer is capped at 2
  emails/hour anyway), `site_url` + redirect allow-list on the public
  endpoint (moved to `https://app.mrgnl.eu` by B4), and SEC-7 auth rate
  limits (30 sign-ins/sign-ups per 5 min per IP, 150 token refreshes per
  5 min).
- **2026-08-18 — Project lifecycle under Terraform, session B5**
  (PR [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48)). The
  hosted project was imported (never recreated) into
  `infrastructure/supabase.tf` with `prevent_destroy`; the container's
  Supabase env now comes from the `supabase_apikeys` data source.

### The tool-ownership split (B5's core decision)

Authoritatively documented in `supabase/AGENTS.md`; in short — Terraform
owns project *lifecycle* (existence, org, region, name,
`legacy_api_keys_enabled`) plus API-key reads; the Supabase CLI owns
migrations, storage buckets/policies, and **all** runtime settings that
`config.toml` models, applied via `supabase config push`. The
`supabase_settings` resource was deliberately not instantiated: every
category it exposes has a `config.toml` namespace, and importing it would
put every `config push` and every `terraform apply` in a standing
double-ownership fight over the same fields ("move a category wholesale or
not at all").

What the provider (v1.10.x) **cannot** manage — permanently with the CLI
or dashboard, not a temporary gap: migrations and SQL DDL, storage buckets
and their RLS policies, typed auth config, project pause/restore, backups,
custom domains, and the database password (write-only at create,
unreadable thereafter). The full list is in the B5 handover and
`supabase/AGENTS.md`; it is also the recorded input to the open decision
on Terraform-managing the Azure Speech resources.

### Problems and how they were dealt with

- **`supabase config push` auto-confirms when it detects an agent**
  (session B3): a piped "n" did not abort the first push — treat every
  `config push` as an apply, not a preview.
- **Free tier has no backups.** Accepted by the owner with a recorded
  recovery procedure instead: recreate the project (the B3/B5 infra
  path — migrations and config are all code), sign the demo account up
  again, and run A6's idempotent `bun run seed:demo` against it
  (PR [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49),
  `product/history/webapp.md`).
- **The pooler host is `aws-1-eu-west-3…`, not `aws-0…`** — a one-character
  trap recorded in the B3 handover for anyone re-deriving the
  `DATABASE_URL`.

### Where Supabase stands (2026-08-18, after B5)

Hosted and local are the same code: one migration timeline, auth config in
`config.toml`, project lifecycle in Terraform, and a local stack whose
Postgres doubles as the test server (D-9). Open items: the Realtime
question (D-2 stage 2), SEC-5's standing review rule, the Free-tier
idle-pause before-demo check, and pruning the legacy `TF_VAR_supabase_*`
values once `seed:demo`'s hosted mode no longer reads them (foreman-2
handover).
