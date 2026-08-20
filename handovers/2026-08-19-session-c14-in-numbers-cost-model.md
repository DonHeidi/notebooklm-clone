# Session C14 — in-numbers cost model (2026-08-19)

## Goal

Roadmap lane C, session C14 (`docs/in-numbers-cost-model`): rework **Part 2**
of `product/in-numbers.md` from "stats for nerds" into a basis for pricing
and ROI (owner review, 2026-08-19). Three required changes: every cost table
ends with the same four standard rows; the invented total names go away in
favour of labeled assumption sets; and a cost-development view over user
count makes growth readable instead of something the reader assembles.
Docs-only; Part 1 (development cost) untouched except for the status header
and one framing bullet.

## What was done

- **`product/in-numbers.md` Part 2 rebuilt** around four rows that close
  every cost table, identically labeled and defined once on the page: *fixed
  cost of the system · variable cost of the system · fixed cost per user ·
  variable cost per user*. They appear on today's deployment table, on both
  assumption-set tables, and in every column of the growth view (5
  occurrences in the rendered HTML). The one table without them is the
  per-action rate card, which is explicitly labeled "a rate card, not a cost
  table" so the exemption is visible rather than smuggled.
- **Invented total names removed.** "Ceiling total" and "realistic total" are
  gone (grep-verified, page-wide and repo-wide outside `roadmap.md`, which
  quotes them in the C14 task description). The two scenarios are now
  **assumption set A (quota ceiling)** and **assumption set B (moderate
  usage)**, each opening with an inputs table — chat turns/user/day, ingestion
  rate, audio rate, users, month length, and an explicit **horizon** — and
  each resolving into the same four rows plus a "monthly total" row directly
  above them.
- **Cost-development view added**: 1 / 10 / 100 / 1,000 users at month 12
  under assumption set B, with retained sources, storage, the Supabase and
  Azure tier in force, peak requests in flight, monthly total, and the four
  standard rows per column. Followed by an explicit linear-vs-step breakdown
  (one linear component, one piecewise-linear, three step functions, two
  flat) and a "where a price has to land" paragraph giving the fixed base per
  user at each step.
- **`max_scale = 2` stated as a capacity finding**, not extrapolated into a
  fantasy bill: under set B the ceiling is not the first constraint at 1,000
  users (≈ 2.8 requests in flight at peak) but is unmeasured; under set A it
  binds at ~100 users (≈ 28 in flight), where the honest result is "a
  deployment that stops serving", not a €3,300 + $2,300 invoice.
- **All Part 2 prices re-fetched 2026-08-19.** Every previously cited price
  was **unchanged** since 2026-08-18. New figures added (all fetched
  2026-08-19): Supabase overage rates ($0.125/GB database, $0.0213/GB file
  storage, $0.09/GB egress), MAU inclusions (50,000 Free / 100,000 Pro, then
  $0.00325/MAU), compute add-on prices (Micro $10 / Small $15 / Medium $60,
  Pro includes a $10 credit), and Edge Services allowances (bandwidth
  unlimited, 100 GB cache on Starter — which is why Edge stays flat at every
  user count).
- **Appendix extended** with a 7-step reproduction of the operating model
  (unit costs → container floor → variable cost per user → standing footprint
  per source → tier-step boundaries → growth view → capacity check), so the
  growth arithmetic can be re-run without this session.

## The growth-model arithmetic (so it can be re-run)

Constants read from the merged code, not from memory: `RETRIEVAL_LIMIT = 10`
and `CHAT_HISTORY_WINDOW = 12`, `MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY = 50`
(`chat-service.ts`); `CHUNK_SIZE_TOKENS = 400`, `CHUNK_OVERLAP_TOKENS = 40`
(`chunking.ts`); `MAX_SOURCE_WORDS = 200_000`, `MAX_SOURCES_PER_NOTEBOOK =
50`, `MAX_FILE_BYTES = 20 MiB` (`limits.ts`); `MAX_NOTEBOOKS_PER_USER = 20`
(`notebook-service.ts`); `MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY = 10`
(`audio-overview-service.ts`); `TOTAL_SOURCE_CHAR_BUDGET = 24_000`
(`audio/script.ts`); `EMBEDDING_DIMENSIONS = 2000` (`db/schema.ts`);
`cpu_limit = 1000`, `memory_limit_bytes = 2_147_000_000`, `max_scale = 2`,
`webapp_min_scale` default `0` (`infrastructure/main.tf`, `variables.tf`).

1. **Unit costs.** chat turn = (6,500 × €0.15 + 300 × €0.35 + 50 × €0.10)/10⁶
   = **€0.001085**; typical ingestion = 5,000 × 4/3 × 400/360 × €0.10/10⁶ =
   **€0.00074** (7,407 tokens); audio script = (6,400 × €0.15 + 1,070 ×
   €0.35)/10⁶ = **€0.001334**; audio TTS = 5,000 × $15/10⁶ = **$0.075**.
2. **Container floor** = (2,628,000 − 200,000) × €0.00001 + (2,628,000 ×
   2.147 − 400,000) × €0.000002 = **€34.76/mo**. Second instance: same again,
   capped there by `max_scale = 2`.
3. **Variable cost per user per month.** Set B: 10 × 30 × €0.001085 +
   (2 × 52/12) × €0.00074 + 2 × €0.001334 = **€0.3346**, plus 10,000 TTS
   characters (= $0.15 on S1, $0 on F0). Set A: 1,000 × 30 × €0.001085 +
   10 × 30 × €0.001334 = **€32.95**, plus 1.5M characters = **$22.50**.
4. **Standing footprint per typical (5,000-word) source.** chunks =
   ceil(6,667 / (400 − 40)) = **19**. Bytes per chunk = row (8,008 embedding
   + ~1,600 text + ~960 tsvector + ~100 other) + indexes (~8,200 HNSW + ~400
   GIN/btree) = **19.3 KB**. Per source = 19 × 19.3 KB + 30 KB of
   `sources.content` ≈ **0.40 MB** database, plus an **assumed 1 MB** upload
   in file storage. Index sizes and the upload size are the assumptions here.
5. **Tier steps.** Supabase Free → Pro: 1 GB file storage ÷ 1 MB/source ÷
   8.7 sources per user-month = **115 user-months** (month 12 at 10 users,
   month 2 at 100, day 4 at 1,000). Azure F0 → S1: 500,000 ÷ 10,000
   characters per user-month = **exactly 50 users**, per month, not
   cumulative. Supabase overage above Pro: max(0, DB_GB − 8) × $0.125 +
   max(0, files_GB − 100) × $0.0213, ÷ N for the per-user row.
6. **Growth view** at N users, month M: sources = N × 8.7 × M; storage and
   tier from (5); fixed system = €4.99 + €34.76 + tier fees; variable system
   = €0–€34.76; fixed per user = (5) ÷ N; variable per user = (3). At M = 12:
   1 user €40.09 · 10 users €43.10 + $25 · 100 users €73.21 + $40 ·
   1,000 users €374–409 + $194–239.
7. **Capacity check** (not a cost): peak requests in flight = N ×
   turns/user/day × 0.20 × 5 s / 3600. Set B: 0.003 / 0.03 / 0.28 / 2.8. Set
   A: 2.8 at 10 users, 27.8 at 100. The 20 % peak-hour share and 5 s request
   duration are assumptions; per-request CPU has never been profiled.

Computation was a throwaway TypeScript script in the session scratchpad (not
committed); every figure above is reproducible from the steps as written.

## Findings worth keeping

- **The four-category decomposition fits every real line item** — nothing had
  to be forced into a row, and no fifth category was needed. Two placements
  are worth remembering: a *tier subscription* (Supabase Pro) is a **fixed
  cost of the system** once you are on it, with the tier change itself shown
  as a step in the growth view; and the *burst container instance* is
  **variable cost of the system** (usage-driven but not attributable to a
  user), which is why the old page's "€0–35" ambiguity in the per-user figure
  disappears.
- **Fixed cost per user is $0 up to 100 users and $0.0042 at 1,000** — a
  property of Supabase bundling storage as an allowance rather than a meter.
  The step it eventually triggers ($25 Pro) is far larger than the metered
  cost it replaces.
- **The Azure F0 → S1 step raises no fixed cost at all** — S1 is pure
  pay-per-use — so its whole effect is to convert a $0 per-user line into a
  linear $0.15/user/mo one, for *every* user, on the day user 51 generates an
  overview.
- **The chunk footprint on the old page was ~2.4× optimistic.** Its "500 MB
  holds roughly 50–60k chunks" counted the raw embedding only; with text,
  tsvector and the HNSW index a chunk is ≈ 19.3 KB, so the Free tier holds
  ≈ 26,000 chunks ≈ 1,260 typical sources — and its 1 GB of *file* storage
  (≈ 1,000 sources) binds first anyway. The page carries this as an explicit
  supersession note.
- **Edge Services never steps** in the modeled range: bandwidth is unlimited
  on every plan and Starter includes 100 GB of cache (fetched 2026-08-19).
  Worth knowing before anyone budgets for a plan upgrade.
- **The dominant term flips around 100 users.** Below that the fixed base
  dominates per-user cost; above it the marginal €0.335 + $0.15 does. That is
  the single most useful sentence on the page for a pricing decision.

## Verified

- `apps/docs` `bun run build` from the worktree: **56 pages**, exit 0;
  `dist/product/in-numbers/index.html` renders, contains the growth view and
  5 occurrences of "Fixed cost of the system" (definitions + today + set A +
  set B + growth view). This session's handover page brings the count to 57
  on the next build.
- Repo root from the worktree: `bunx varlock run -- bun test` → **154 pass,
  0 fail** (the `expected 2000 dimensions, not 3` PostgresError in the output
  is an assertion under test, not a failure); no flake occurrence this run.
  `bunx varlock run -- bun run build` → exit 0.
- Grep: no "ceiling total" / "realistic total" / "scenario" anywhere in
  `product/in-numbers.md`.
- Prices: all seven sources re-fetched 2026-08-19 (URLs in the page
  appendix); every previously cited figure unchanged, new figures listed
  above.

## Hot files

None. No new dependencies; `bun.lock` and root `package.json` untouched
(`bun install` in the worktree resolved to the committed lockfile).

## Open items / next sessions

- **Nothing in Part 2 is measured.** Both assumption sets, the 1 MB upload
  size, the 20 % peak-hour share, the 5 s request duration and the Supabase
  compute add-on are assumptions. The first session that adds telemetry
  should replace them and re-run the appendix's 7 steps.
- **The capacity ceiling needs a load test**, not more arithmetic. Until
  per-request CPU is profiled, the growth view cannot honestly be extended
  past 1,000 users, and the Supabase compute add-on stays a $15–60 range.
- **Part 1 is still a mid-session snapshot**: the C11 row measured itself
  while running and the total is a floor. Re-running the appendix's Part 1
  method would refresh it — deliberately not done here (Part 1 was out of
  scope).
- After merge: foreman dispatches `deploy-static-sites`.
