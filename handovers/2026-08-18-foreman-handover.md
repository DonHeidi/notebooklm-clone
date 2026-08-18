# Foreman handover (2026-08-18, end of day 2)

> For the next foreman session. The role, conventions, and project state are
> on record (root `AGENTS.md`, `product/roadmap.md`, the auto-memory files) —
> this document carries what those don't: the live board, open decisions, and
> the operational craft learned in the first foreman session. Read
> `product/roadmap.md` and `product/security.md` §Process before acting.

## Role protocol (summary — details in memory + AGENTS.md)

- The **owner launches worker sessions**; the foreman writes paste-ready
  briefs (goal, requirements, HARD path boundaries, hot-file rules,
  definition of done incl. PR + handover + "do not merge"), reviews landed
  PRs, and merges **feature PRs only on the owner's explicit word**.
  Trivial docs PRs (roadmap rows, record corrections, this document's
  class) the foreman merges directly, transparently reported.
- **Review = independent verification**, never trust the PR text: run the
  tests and builds yourself, curl deployed endpoints, check diffs against
  the brief's boundaries, spot-check cited PR numbers/claims. Review order
  when several land: critical path (A) → platform (B) → docs (C).
- **Lane A wins conflicts**; cross-lane `bun.lock` conflicts resolve by
  taking main's lockfile and re-running the branch's `bun add`s.
- **Correct-the-record** (root AGENTS.md) is enforced in every review; the
  security register's §Process lists the standing per-PR checks (SEC-1/3/5/6).
- After merging anything under `product/`: **dispatch
  `deploy-static-sites`** — the docs site renders those files.

## Board (all merged unless noted)

- Sessions S-0, A1–A5, A7, B1–B4, C1–C7, D1–D2 (45 PRs). Product live:
  **https://app.mrgnl.eu** (also www./docs. + apex-redirect; old default
  endpoints still serve). Repo is **public**.
- **Remaining: A6** (`feat/demo-polish` — empty states, error handling,
  NF-15 quotas, seeded demo notebook; the seed doubles as demo-day opening
  state and the data-recovery story). Brief NOT yet written — author it
  fresh against merged main, per the established template; boundaries:
  apps/webapp + handovers, no infra.
- **Open decision: B5** (`feat/supabase-terraform`) — manage the hosted
  Supabase project via the official `supabase/supabase` TF provider
  (verified v1.10.1: project/settings/apikey resources). Would collapse
  the teardown/redeploy flow; owner hasn't decided. Related: D2's open
  question about TF-managing the Azure Speech resource (same pattern).
- **Day-7 demo prep** after A6; ~4 days of buffer remain.

## Owner's before-demo checklist (from B3/B4)

1. Supabase Free tier pauses after ~1 week idle — restore in dashboard
   (or upgrade to Pro for the window).
2. Optional warm container: `terraform apply -var webapp_min_scale=1`
   (~€35/mo while on; default 0 = ~4 s cold start).
3. Demo account credential is in Proton Pass (the vault item named after
   the old container URL — password set, username empty; the account
   email is in the B3 handover's E2E record).

## Known limitations on record (do not re-litigate; cite instead)

- Chat stop is client-side only (A4 — Next proxy swallows aborts;
  documented in route + handover).
- Source viewer is dialog-state only (A3/A5 open point).
- Audio transcript not persisted (NF-11, D2 open point).
- Notes render unresolvable `[n]` markers inert (A5, designed).
- SSRF guard is hostname-level, pre-redirect only (SEC-1, accepted).
- No rate limiting beyond guards (SEC-7) and no data backups on Free
  tier (owner-accepted; A6 seed script is the recovery story).

## Foreman craft (hard-won, not in any repo doc)

1. **Never run cleanup with cwd inside the worktree being removed** —
   several chains broke on "Unable to read current working directory".
   `cd` to the repo root first; verify with a follow-up command.
2. **`gh pr checks` can serve stale "pending"** — verify with
   `gh run view <run-id> --json status,conclusion` before waiting on it.
3. GitHub API 503 windows happen — merge via short background retry
   loops checking state each pass (evening of day 1 took 4 attempts).
4. Mergeability lags after pushes: retry `gh pr merge` for ~a minute
   before diagnosing.
5. After merging main into a feature worktree: `bun install` (lockfile
   moved) and `rm -rf apps/webapp/.next` (stale route types break
   typecheck) before build verification.
6. Fresh worktrees need the env symlink: `ln -sf ../../.env.local .env.local`
   at the worktree root; varlock refuses all commands while required
   values are missing.
7. Worktree hygiene: worker sessions leave their worktrees behind —
   prune after merge (`git worktree list` occasionally; two stale ones
   were found days later).
8. DNS negative caches can make freshly-created records look broken —
   verify via DoH (`cloudflare-dns.com/dns-query`) before declaring a
   deploy failed (B4's docs. host).
9. Terraform state lives in the S3 backend (bucket `marginalia-tfstate`);
   the backend needs SCW keys as `AWS_ACCESS_KEY_ID/SECRET` (see
   infrastructure/AGENTS.md). Never let a worktree hold the only state.
10. Secrets never appear in output: verify vault contents by field NAMES
    and hash comparisons only (`pass-cli item view --output json` piped
    through a name-extractor; see .env.schema provenance block).
11. Worker-session usage stats live in
    `~/.claude/projects/-home-donheidi-code-notebooklm-clone/*.jsonl` —
    label sessions by grepping for "executing session" in the first 200KB.
12. Keep the foreman lean: this session died of context weight. Batch
    merges, don't re-read what memory already holds, and write the next
    handover before ~150 turns.

## Costs (API-equivalent, informational — owner is on subscription)

~$300 total through day 2 across ~20 sessions; foreman ≈ 40%. Running
infra: €4.99/mo Edge Services + ~€0 everything else (Free Supabase,
min-scale 0, F0 Azure).
