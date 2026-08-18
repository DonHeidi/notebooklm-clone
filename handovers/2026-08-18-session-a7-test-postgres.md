# Session A7 — `chore/test-postgres` (D-9: real Postgres for DB-backed tests)

**Date:** 2026-08-18 · **PR:** [#33](https://github.com/DonHeidi/notebooklm-clone/pull/33) · **Spec:** `product/feasibility.md` D-9

## Goal and outcome

Implement D-9: retire PGlite (exit-99 under Bun, cold-WASM-init CI flakes,
found by B2) and run database-backed tests against a real Postgres with real
pgvector, locally and in CI, removing both INTERIM CI workarounds.

**Done.** 143/143 tests green (18 files), exit code 0, on both backends; zero
test files edited; PGlite dependencies removed; CI runs plain `bun test`
against a `pgvector/pgvector:pg17` service container.

## The choices D-9 left open, and how they were resolved

1. **Plain pgvector image vs `supabase start` stack → both, each where it's
   strongest.** Locally tests default to the Supabase stack's Postgres on
   `:54322` (`supabase start` is already the required local-dev setup — zero
   new commands, closest to hosted; verified the non-superuser `postgres`
   role can CREATE DATABASE and install pgvector 0.8.2). CI provisions
   `pgvector/pgvector:pg17` as a service container: measured 12.1 s pull
   (~150 MB compressed) + 3.8 s to `pg_isready`, vs ~8 GB / 13 containers
   for the Supabase stack on an uncached runner. Same factory code either
   way; `TEST_DATABASE_URL` overrides the server.
2. **Isolation → one throwaway database per test file**
   (`marginalia_test_<pid>_<n>`; bun runs files sequentially in one process,
   pid separates parallel invocations). Leftovers are swept at the start of
   the next run with plain `DROP DATABASE` (no FORCE — an in-use database
   from a concurrent run is skipped, not killed). Verified: 11 leftovers
   from a full run were all swept by the next run.
3. **Fidelity improved, not just preserved:** the factory now applies the
   hand-written `enable_pgvector` migration verbatim (recreating the
   `extensions` schema + Supabase's `search_path` first), then the Drizzle
   journal — PGlite had installed the extension into `public`. RLS/storage
   migrations stay intentionally unapplied (app-layer authz under test),
   unchanged.

## Verification evidence

- `bun test` vs Supabase stack: **143 pass, 0 fail, exit 0**, 6.4 s.
- `TEST_DATABASE_URL=…54329… bun test` vs the CI image: **143 pass, 0 fail,
  exit 0**, 5.8 s.
- `bun run build` green, `tsc --noEmit` green.
- Real-engine payoff already visible: pgvector itself rejects the
  wrong-dimensionality write in `ingestion-service.test.ts` (`expected 2000
  dimensions, not 3` — that error in test output is an intentional
  error-path test, not a failure).

## ⚠️ Open item for the foreman: pre-existing lint failure gates green CI

Main's CI has been red at the **Lint** step since the #28/#29 merges
(before this session): 2 × `react-hooks/set-state-in-effect` in
`src/components/studio/audio-overview-dialog.tsx:53` and
`src/components/studio/studio-panel.tsx:178`, plus one unused
eslint-disable warning. Reproduced on a clean `main` checkout. Components
are hard out-of-bounds for A7, so PR #33's CI stops at Lint and the Test
step never executes there — the proof of the restored exit-code contract is
the two local full-suite runs above. Once lint is fixed (owning lane, or a
two-line foreman-authorized fix), re-run CI on #33 to see the Test step
green with the service container. **No workaround was reintroduced.**

## Boundary deviations (all flagged in the PR)

- `apps/webapp/package.json` + `bun.lock`: removal of the two PGlite
  dev-deps (no additions).
- Correct-the-record edits outside the listed files:
  `product/architecture/development.md` (living doc, updated in place),
  `product/history/{supabase,infrastructure}.md` and handovers A1/B2
  (dated annotation blockquotes) — all described the PGlite era as current.
- `TEST_DATABASE_URL` is read with a safe default but **not** declared in
  `.env.schema` (file out of boundary); consider adding it as optional.

## Gotchas for future sessions

- Test databases (`marginalia_test_*`) linger on the local Supabase Postgres
  between runs by design; any `bun test` sweeps them, and they're safe to
  drop manually. `supabase db reset` doesn't remove them.
- The factory needs a role with CREATEDB on the target server; both default
  backends satisfy this.
- If Docker/`supabase start` isn't running, DB-backed tests fail fast with
  an actionable error naming the one-command fix; pure-logic tests are
  unaffected.
