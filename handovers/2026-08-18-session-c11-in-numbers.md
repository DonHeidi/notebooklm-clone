# Session C11 — Marginalia in numbers (2026-08-18)

## Goal

Roadmap lane C, session C11 (`docs/in-numbers`): a public
`product/in-numbers.md` answering two questions with dated, source-cited
numbers — (1) what did AI-agent development of this prototype cost in
API-equivalent inference spend, per session/lane and total, computed from
the session transcripts' usage records; (2) what does operating it cost
today, and what would 10 users cost per month, derived from the code's
actual constants at freshly fetched provider prices. Docs-only; no product
code changed.

## What was done

- **`product/in-numbers.md`** (NEW). Development half: per-session table
  (28 transcripts), lane subtotals, grand total **≈ $854.12 API-equivalent /
  ~622M processed tokens**, all on `claude-fable-5`, priced at the
  published rates fetched 2026-08-18 ($10 in / $12.50 5m-write / $20
  1h-write / $1 read / $50 out per MTok). Ops half: the current fixed bill
  (**€4.99/mo** — Edge Services Starter + 1 extra pipeline; everything else
  Free-tier/scale-to-zero at ~€0), the demo-mode derivation (min_scale=1 ≈
  €34.8/mo from fetched serverless prices × the container's TF sizing,
  matching the recorded ~€35), and a two-scenario 10-user model: (a) quota
  ceiling ≈ **€350 + $250/mo** (the A6 quotas' hard upper bound), (b) a
  labeled realistic assumption (10 msgs/user/day, 2 sources/week, 2
  overviews/user/mo) ≈ **€8.4/mo** — inference (~€3.4) is smaller than the
  Edge Services subscription. Non-inference ceilings noted: Supabase Free
  1 GB storage binds first (SEC-10; one user's caps allow 20 GB), Pro
  $25/mo as the forced step, Azure F0's 0.5M chars/mo caps audio 30× below
  app quotas, closed-signup caveat stated. Honesty rails throughout: every
  figure is computed / fetched (URL + 2026-08-18 date + "prices change") /
  labeled assumption; aggregates only, no transcript content anywhere.
- **Docs app registration** (the only `apps/docs` touches):
  `src/pages/product/in-numbers.astro` (same `DocPage` pattern as
  `scope.astro`), one nav item in the Product group (`src/nav.ts`), and one
  fixed rule in `src/canonical-links.mjs` mapping `in-numbers.md` →
  `/product/in-numbers/` so future canonical links resolve (C12 plans an
  NF-15 → in-numbers pointer).
- **Correct-the-record**: dated correction blockquote appended to
  `handovers/2026-08-18-foreman-handover.md` — its informal "~$300 through
  day 2" is superseded by the computed ≈ $854 (≈ $700 at that estimate's
  own cutoff); its "foreman ≈ 40%" share held (40.1% computed).

## Method (so the page can be refreshed)

Reproduced in the page's appendix; operationally: throwaway scripts in the
session scratchpad (NOT committed) globbed
`~/.claude/projects/-home-donheidi-code-notebooklm-clone/*.jsonl`, kept
`type == "assistant"` lines with `message.usage`, **deduplicated by
`message.id`** (usage repeats on one line per content block), skipped
`<synthetic>`, summed uncached input / `cache_creation.ephemeral_{5m,1h}`
/ cache-read / output tokens per model id per file, and priced at the
fetched rates (5m write = 1.25× input, 1h = 2×, read = 0.1×). Labels came
from `executing session <ID>` in each file's first 200 KB; the two
unlabeled files are the foreman sessions (identified by timestamp spans
matching the foreman handovers — file boundaries at exactly 18:00 day 2).
`server_tool_use.web_search_requests` summed to zero, so no search charges.
Ops prices: Anthropic pricing page, Scaleway model-as-a-service / serverless
/ network pages, Supabase pricing, Azure pricing page (F0 allowance) and
the Azure Retail Prices API for the S1 neural-TTS $/char in `swedencentral`
(the public pricing page renders prices via JS and shows "$-" to fetchers —
the Retail Prices API is the reliable published source).

## Findings worth keeping

- **One transcript carries both B3 and B4** — those roadmap sessions ran as
  a single physical session (the B4 brief appears mid-file); reported as one
  row. Check whole files, not just heads, when a session seems missing.
- The two recorded false starts (B1, D2) cost **$3.77 combined**.
- **Cache reads are 72% of dev spend**; uncached the same work ≈ $6,700.
- The **C11 row measures itself mid-session** (it was ~$17 at computation
  time) and undercounts; the total is a floor. Re-running the appendix
  method after this merge refreshes it.

## Verified

- `apps/docs` `bun run build` from the worktree: **52 pages** (was 50 on
  main: +`/product/in-numbers/` +this handover's session page), exit 0;
  `/product/in-numbers/` in `dist/`, nav entry rendered; in-page
  canonical links rewritten (`/architecture/generative/`,
  `/architecture/physical/`, `/roadmap/`). External-request grep over
  `dist/`: no external `<script>`/`<link>`; the new page's external URLs
  are pricing-source anchors only.
- Repo root from the worktree: `bun test` **154 pass, 0 fail** (no flake
  occurrence this run); `bunx varlock run -- bun run build` exit 0.

## Hot files

None — no new dependencies; `bun.lock`, root `package.json` untouched.

## Open items / next sessions

- The page is a **dated snapshot**: prices change, and the C11/total rows
  grow once this session ends — refresh via the appendix method (foreman
  review is expected to re-run the tally on a sample transcript anyway).
- C12 (`docs/scope-split`) plans an NF-15 → in-numbers pointer; the
  canonical-links rule for `in-numbers.md` is already in place for it.
- If a future session adds users/telemetry, scenario (b)'s assumptions
  (N=10 msgs/day etc.) should be replaced with measured rates.
- After merge: foreman dispatches `deploy-static-sites`.
