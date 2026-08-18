# Session C8 — History/architecture catch-up (2026-08-18)

## Goal

Bring `product/history/` and `product/architecture/` current with the
fully merged board (roadmap row C8, PR
[#51](https://github.com/DonHeidi/notebooklm-clone/pull/51)): every
history file and architecture view accurate, in C4's established method,
with every claim traceable to a handover or PR. Docs-only — no code or
behavior changes, with one owner-requested exception (below).

## The gap was larger than briefed

The brief's gap map (foreman-verified) said `webapp.md` covered through
A5 and `infrastructure.md`/`supabase.md` through B3. Spot-checking against
`git log` showed the history pages had only ever been written by C4 (plus
A7's D-9 annotations and C6's process addendum): **webapp.md stopped at
A3** (missing A4, A5, A6, A7, D2), **infrastructure.md at PR #19**
(missing B3, B4, B5), and **supabase.md at A3** — still claiming "no
hosted Supabase project exists yet" while the product ran on one. All of
those sessions are covered now; the discrepancy is flagged here per
correct-the-record (the map, not the files, was wrong).

## What was done

- **`product/history/webapp.md`** — catch-up section for A4 (#24), D2
  (#27), A5 (#29), A7 (#33/#35), A6 (#49): the grounded-chat loop, the
  generic-artifact/audio pipeline, citation navigation + notes, the D-9
  test migration's workspace effect, quotas + seed script. Dated
  supersession note on the old "where it stands".
- **`product/history/infrastructure.md`** — catch-up for B3 (#36), B4
  (#45), B5 (#48): env-wiring split, custom domain + the six Edge
  Services gotchas, import-only Supabase adoption + the
  `supabase_settings` deviate-and-flag decision.
- **`product/history/supabase.md`** — dated correction on the
  no-hosted-project claim; catch-up for B3 (provisioning, config-as-code,
  hosted verification) and B5 (tool-ownership split, what the provider
  cannot manage), plus a pointer to D2's migrations.
- **`product/history/docs.md`** — catch-up for C5 (#28), C6 (#34), C7
  (#41), and C8 itself (incl. the sidebar change below).
- **`product/history/process.md`** — the second wave: the cross-lane lint
  break (#33 gated, #35 fixed, A6 corrected the record), B5's
  deviate-and-flag, the foreman hand-off (context death → successor
  handover, craft items 13–16: varlock's silent worktree-subdir no-op,
  `config push` auto-confirm, security.md adjacent-row conflicts,
  worktree hygiene), the D1 → D2 spike-to-implementation story, and the
  finding that C4's per-session appending contract needed this batch
  session — with the recommendation that the review checklist enforce it.
- **`product/architecture/physical.md`** — Terraform section extended for
  B4/B5 (three providers; import-only project with `prevent_destroy`;
  SEC-6 state nuance: DB password NOT in state, apikeys-read keys ARE;
  keyring-only `SUPABASE_ACCESS_TOKEN` at every plan); dated update under
  *Hosted Supabase (B3)* (apikeys-fed env, prunable legacy TF_VARs, the
  seed-script recovery procedure).
- **`product/architecture/development.md`** — updated in place (living
  view, A7 precedent, changes listed in the status callout): test count
  80 → 154, PGlite dev-dependency rows removed with a dated correction
  note, `hashicorp/archive` + `supabase/supabase` provider rows added,
  monorepo-tree line for `infrastructure/`.
- **Other views (now-false claims only, one dated blockquote each):**
  `logical.md` (D2 *did* extend the schema shape — artifacts table;
  "not yet in schema" now = permissions only), `process.md` (D2's second
  pipeline merged; A6's pre-retrieval quota step), `scenarios.md`
  (chip → viewer shipped; B3 re-ran the trace hosted), `index.md`
  (board-complete pointer).
- **`apps/docs/src/layouts/Base.astro`** — the one code change,
  owner-requested mid-session: the sticky sidebar nav is now
  independently scrollable (`max-h-[calc(100vh-5rem)] overflow-y-auto
  overscroll-contain`) instead of forcing a full-page scroll to reach
  lower nav entries.

## Verified

- `bun run build` for `apps/docs` from the worktree: passes; new
  history/architecture content confirmed present in `dist/` (grep for the
  catch-up headings).
- Repo-wide `bun test` and `bun run build`: green (counts in the PR).
- External-request grep over `dist/`: unchanged — content anchors only.

## Hot files

None — no dependencies added, `bun.lock`/root `package.json`/root
`AGENTS.md` untouched.

## Open items / next sessions

- The PR number for C8's own entry in `product/history/docs.md` is cited
  via this handover (C4 precedent: its PR number was added by a follow-up
  commit once known).
- The appending-contract finding (process.md): consider adding "history
  pages appended?" to the foreman's per-PR review checklist.
- `product/history/marketing.md` gained one dated update (no
  marketing-lane session ran, but B4 moved the site to `www.mrgnl.eu` and
  the webapp went public — its "where it stands" said otherwise).
- After merge: foreman dispatches `deploy-static-sites`.
