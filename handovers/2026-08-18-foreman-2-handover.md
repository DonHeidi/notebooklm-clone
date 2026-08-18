# Foreman handover — foreman-2 (2026-08-18, later day 2)

> Successor note to `handovers/2026-08-18-foreman-handover.md`. Read that one
> first — role protocol, review discipline, and craft items 1–12 all still
> hold. This note carries only what changed during the foreman-2 session.

## Board

- **All roadmap sessions are merged**: S-0, A1–A7, B1–B5, C1–C7, D1–D2
  (49 PRs). Remaining work is **day-7 demo prep only** (bugfixes, demo
  walkthrough script, README, final handovers). ~4 days of buffer.
- **A6 (#49) merged** — designed empty states across all screens; app-level
  `error/global-error/not-found/loading` pages; row-level errors visible
  (was tooltip-only); per-user quotas (20 notebooks/user, 50 chat
  messages/notebook/day, 10 audio overviews/user/day —
  `apps/webapp/src/server/services/quota.ts`, enforced via owner-scoped
  repository counts, chat 429s **before** retrieval spend); seed script
  `bun run seed:demo` (webapp workspace; `SEED_TARGET=local|hosted`;
  idempotent + resumable — it recovered from a real provider timeout during
  its own hosted verification). Test suite now 154 tests / 19 files.
- **B5 (#48) merged** — hosted Supabase project imported under Terraform
  (`infrastructure/supabase.tf`: import block kept, `prevent_destroy`,
  `ignore_changes = [database_password]`; the DB password is NOT in state).
  Container Supabase env now fed from the `supabase_apikeys` data source.
  Tool-ownership split in `supabase/AGENTS.md` (`supabase_settings`
  deliberately not instantiated — "move a category wholesale or not at
  all"). `SUPABASE_ACCESS_TOKEN` (account-scoped, keyring-only) is now
  required at **every** plan/apply — full wrapper in
  `infrastructure/AGENTS.md`. Foreman-2 independently verified
  `terraform plan -detailed-exitcode` → exit 0 against live state.
- The **B5 decision** was owner-approved 2026-08-18 (roadmap row via #47).
  The **D2 Azure-Speech TF analog decision remains OPEN** — B5's handover
  ("what the provider still cannot manage") is the decision input.
- The lint failure A7 flagged was already fixed by **#35** before A6 ran;
  main's CI has been green since — the A7 handover is annotated.
- **Deploys this session:** `deploy-static-sites` dispatched after the
  `product/**` merges; `deploy-webapp` is **workflow_dispatch-only** (by
  design, prototype phase) and was dispatched for A6. Both verified green
  by foreman-2; if you are reading this in a fresh session, trust that
  record — don't redeploy without a reason.

## Owner's before-demo checklist — addition

Items 1–3 in the previous handover still stand (Free-tier pause, optional
warm container, demo credential in Proton Pass). New:

4. Seed the chosen demo account:
   `SEED_TARGET=hosted SEED_DEMO_USER_EMAIL=<account email> bunx varlock run -- bun run seed:demo`
   (run in `apps/webapp`; details + evidence in the A6 handover). This also
   remains the standing data-recovery procedure — the Free tier has no
   backups.

## Open threads

- **Do not prune the legacy `TF_VAR_supabase_url/_anon_key/_service_role_key`
  values** from `.env.local` or the vault yet: B5 made them unnecessary for
  Terraform, but A6's `seed:demo` hosted mode still reads them (remap at the
  top of `apps/webapp/scripts/seed-demo.ts`). The `.env.schema` annotation
  was corrected on the B5 branch pre-merge. Prunable once the seed script
  sources hosted values another way.
- Quota limitation on record (A6 PR): audio **re**generations don't count
  against the daily cap (needs a generation-event log → migration); bounded
  by the 1-concurrent + 20-per-notebook guards.
- The known-limitations index in the previous handover is otherwise current.

## Craft additions (continue the numbering)

13. **varlock silently no-ops with exit 0 from a worktree SUBDIR** (e.g.
    `apps/webapp`): it prints "No .env files found", the wrapped command
    never runs, and nothing fails. Run from the worktree root (where the
    `.env.local` symlink lives) and confirm the output shows the command
    actually ran. A "green" verification can be a verification that never
    happened.
14. Adjacent-row edits in `product/security.md`'s table DO merge-conflict
    (A6×B5 both landed one row). Resolution is mechanical — keep each PR's
    own row — but verify the kept SEC-n lines afterwards by content, not by
    count.
15. `gh pr merge --delete-branch` fails when a worktree holds the branch;
    remove the worktree first or skip the flag and clean up after.
16. Worker sessions again left their worktrees behind (`feat-demo-polish`,
    `feat-supabase-terraform` — pruned this session). Check
    `git worktree list` after every merge batch (reconfirms craft item 7).

## Costs

Not re-tallied this session; craft item 11 (session `.jsonl` files) is the
way to compute them if the owner asks.
