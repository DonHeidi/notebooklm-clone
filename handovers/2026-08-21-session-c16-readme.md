# Session C16 — README as the repo's front door (2026-08-21)

## Goal

Roadmap lane C, session C16 (`docs/readme`): replace the day-0 README stub
(411 bytes — a layout list and a pointer to `AGENTS.md`, saying nothing about
what was built and linking neither the live app nor the docs site) with the
artifact a cold reader meets first. Owner-requested 2026-08-21, the last docs
session before demo prep. Docs-only; no product code touched.

The reader the file is written for: an engineer or hiring manager landing on
the public GitHub repo with 60–90 seconds to decide whether to look further.
Three jobs in this order — what the product is and where to try it; what the
seven days delivered versus what was deliberately cut; how it was built and
reviewed.

## What was done

`README.md` rewritten (13 → 177 lines). Sections, in order:

1. **Product first.** Name, what it does in one paragraph, the three live
   links (`app.` / `docs.` / `www.mrgnl.eu`), and the non-affiliation notice
   the public pages already carry. Then **three screenshots of the real UI**,
   reused in place from `handovers/assets/` (session A6's verification
   record): the workspace with a grounded answer and a citation chip as a
   full-width hero, then a two-column table pairing the citation → highlighted
   passage flow with a saved note whose citations still work. Reused by
   reference rather than copied — the files stay the record they already are,
   and the caption says so.
2. **How it works** — ingest → retrieve → answer → audio, with the concrete
   mechanism at each step (per-page PDF parsing, 400-token chunks carrying
   character offsets, hybrid pgvector + full-text search fused with RRF,
   delimited-block prompting with no tools, server-side citation mapping,
   offsets as what makes navigation exact). Ends with a pointer to the
   generative view and the 4+1 views for depth, plus a one-line stack
   statement.
3. **Built in seven days — and what was cut** — a two-row delivered/cut
   pairing linking `product/target-scope.md` and the roadmap's cut-list
   anchor, plus the security register framed as part of what makes the scope
   credible.
4. **How it was built** — the session model (one goal, written brief, branch
   in a worktree, PR, independent review, handover), the foreman/owner split,
   an explicit attribution sentence (*"The code, the documentation and this
   README were AI-generated. The direction, the decisions and the reviews were
   not."*), and then the record that makes it checkable: 31 session notes, 3
   foreman notes, 80 merged PRs, dated owner attributions per roadmap row,
   shipping PR per target-scope row. Three worked examples (C9, C14/C15,
   review catching defects) — each verified against its record before being
   cited, see the traceability table below.
5. **Run it yourself** — the verified quickstart (below).
6. **Repository map** — a compact eight-row table replacing the stub's bullet
   list, one line each, `AGENTS.md` included as the conventions pointer.

Nothing another document owns is restated. Every scope, cost, architecture,
security and history fact is a link.

## Verification

### The quickstart was executed, not transcribed

Run from a clean `docs/readme` worktree.

| Step | Result |
| --- | --- |
| `bun install` | `1645 packages installed [1.56s]`, `bun.lock` unchanged (`git status` clean) |
| `mise exec -- supabase start` | Stack already up from a previous session; `mise exec -- supabase status` confirms API `:54321`, DB `:54322`, CLI `2.114.0` |
| `bunx varlock run -- bun test` | **154 pass, 0 fail, 408 expect() calls**, 19 files (the `expected 2000 dimensions, not 3` PostgresError in the output is an assertion under test) |
| `bunx varlock run -- bun run dev:webapp` | `▲ Next.js 16.3.1 (Turbopack)`, `✓ Ready in 456ms`; `GET /` → 307 → `/login`; `/login` serves `<title>Log in — Marginalia</title>` |
| `bunx varlock run -- bun run build` | exit 0, all three workspaces |

**The two-values claim was tested, not assumed.** The README states that a
local run needs exactly two values in `.env.local` — the anon key and
service-role key printed by `supabase start` — because every other required
variable has a local default in the committed `.env.schema`. To verify it, the
worktree's `.env.local` symlink was moved aside and replaced with a file
containing only those two variables:

- `bunx varlock run -- bun test` → **154 pass, 0 fail** (varlock satisfied, no
  missing-required error)
- `bunx varlock run -- bun run dev:webapp` → `✓ Ready in 392ms`; `GET /` → 307
  → `/login`, `/signup` serves `<title>Sign up — Marginalia</title>`

The symlink was then restored (`git status` clean). This is what licenses the
README's "verified end to end on a fresh worktree with exactly those two
values" and its honest boundary: signup/login/notebooks run; anything calling
a model needs provider credentials the reader brings themselves.

### Render and link check

- Rendered through GitHub's own renderer (`gh api -X POST /markdown -f
  mode=gfm`): **3 tables**, **3 `<img>` elements** with the relative
  `handovers/assets/…` sources intact, exit 0.
- All 23 in-repo link targets resolved by `test -e` against the worktree —
  every one OK, no misses. External links: `app./docs./www.mrgnl.eu` all
  return HTTP 200, the PR-35 link and `mise.jdx.dev` are real.
- The one deep anchor (`product/roadmap.md#cut-list-explicitly-out-of-the-7-days`)
  was verified by rendering `roadmap.md` through the same API and reading back
  `id="user-content-cut-list-explicitly-out-of-the-7-days"` — not guessed from
  the heading text.
- Docs site: handovers are a rendered collection
  (`apps/docs/src/content.config.ts` globs `../../handovers/*.md`), so this
  note adds a page — **`deploy-static-sites` is needed after merge.**

### Process claims → the record each is traceable to

| Claim in the README | Record |
| --- | --- |
| One goal, written brief, worktree branch, PR, independent review, handover per session | `AGENTS.md` §Methodology; `product/history/process.md` "The working model" |
| Foreman writes briefs and reviews; owner proposes, decides, is the quality gate | `handovers/2026-08-18-foreman-handover.md` §Role protocol; `product/history/process.md` "The owner stays in the loop at decision points, not keystrokes" |
| 31 session notes, 3 foreman notes | `ls handovers/*.md` → 33 files today, 30 `*session*` + 3 `*foreman*`; this note makes 31 |
| 80 merged pull requests | `gh pr list --state merged --limit 200` → 80 (numbers 1–80, none closed unmerged). First counted at 79; `main` moved during this session when #80 landed the C17 roadmap row, which is exactly the drift the README's "so far" phrasing accounts for. |
| Roadmap rows carry dated owner attributions | `product/roadmap.md` rows B5, C9–C16 ("owner-approved", "owner-requested", "owner decision", "owner review", each dated) |
| Target-scope rows name the shipping PR | `product/target-scope.md` "Shipped in" column, all 18 rows |
| Generative view exists because the owner asked which models ran where | `product/roadmap.md` C9: "owner-requested 2026-08-18, split out of C8"; `handovers/2026-08-19-foreman-2-addendum.md` §C9 |
| Cost page rejected as "stats for nerds", then as not-readable | `product/roadmap.md` C14 (quotes it verbatim, owner review 2026-08-19) and C15 (owner review 2026-08-20); `handovers/2026-08-20-session-c15-in-numbers-readability.md` |
| It now states a cost per user per month | `product/in-numbers.md` Part 2 summary blocks; C15 handover §2 ("€4.31 at ten moderate users…") |
| Cross-lane lint break found by an unrelated session, fixed in its own PR | `handovers/2026-08-18-session-a7-test-postgres.md` §⚠️ + its A6 update blockquote; `product/history/process.md` "A cross-lane lint break gated CI for half a wave"; `gh pr view 35` → *fix(webapp): resolve studio lint errors breaking main CI* [MERGED] |
| C14 corrected a per-chunk storage figure ~2.4× optimistic | `handovers/2026-08-19-session-c14-in-numbers-cost-model.md` §Findings ("~2.4× optimistic", 19.3 KB); correction blockquote at `handovers/2026-08-18-session-c11-in-numbers.md:103` |
| Scope table re-baselined because it was underselling a finished product | `product/roadmap.md` C13: "owner review 2026-08-19: the C12 table misrepresents a delivered product as half-implemented" |
| Every product session merged inside the first two days | `handovers/2026-08-18-foreman-2-handover.md` §Board: "All roadmap sessions are merged: S-0, A1–A7, B1–B5, C1–C7, D1–D2 (49 PRs)", dated 2026-08-18 = day 2 |
| 154 tests | This session's own runs (above) and the C14/C15 handovers |
| Stack line (Next.js/Node, Bun, Supabase+pgvector, Scaleway container + Terraform, Azure Speech, Astro) | `product/architecture/generative.md` model inventory; `product/feasibility.md` D-1/D-4/D-8/D-10; root `AGENTS.md` §Layout |

No claim in the README is sourced from memory or inference.

## Finding worth keeping — the intermittent test flake, now localized

Open item 1 of `handovers/2026-08-19-foreman-2-addendum.md` ("1 test fails in
roughly 2 of 3 fresh-worktree `bun test` runs, then passes; failing runs also
showed a truncated count 150/154") reproduced here and can now be **named**:

```
apps/webapp/src/server/repositories/artifact-repository.test.ts:
(fail) (unnamed) [5000.36ms]
  ^ a beforeEach/afterEach hook timed out for this test.
```

Four consecutive runs in this worktree: **154/154 pass · 149/1 fail ·
149/1 fail · 149/1 fail**. The truncated total is explained — the hook timeout
aborts the remaining tests in that one file, which is why the count drops to
150 rather than a test failing outright. The 5000.00ms figure is Bun's default
hook timeout, so the hook is *hanging*, not erroring — the likely candidate is
`createTestDatabase()` waiting on the local Supabase Postgres (`:54322`),
which is also why CI's dedicated `pgvector/pgvector:pg17` service container has
never reproduced it.

Not investigated further — out of scope for a docs session, and it is already
on the demo-prep list. But the next session that picks it up starts from a
named file and a named mechanism instead of "a test somewhere". The README
carries it as a stated known flake so a reviewer who hits it is not surprised,
with CI named as the authoritative signal.

## Boundaries

Kept. Touched: `README.md` (rewritten) and this handover. Nothing under
`product/**`, `apps/**`, `infrastructure/**`, `supabase/**`, `.github/**`, or
any `AGENTS.md`. Screenshots reused by relative path from `handovers/assets/`
— nothing copied, nothing edited. No new dependencies; `bun.lock` and
`package.json` untouched.

## Open items / next sessions

- **No `product/**` claim was found to be false**, so correct-the-record
  triggered nothing. Two things a future session may want to revisit, neither
  a defect: `product/history/process.md`'s closing section is a snapshot as of
  2026-08-18 and does not cover C9–C16, and its "51 PRs" count is dated to
  that day (79 now). Both are correctly dated snapshots, not stale claims.
- **The README's counts will drift** — 31/3 handover notes, 80 PRs, 154 tests.
  They drifted *during this session*: `main` gained #80 (the C17 roadmap row)
  between the first count and the PR, so the README now says "as this was
  written" and "80 merged so far" rather than asserting a standing total. All
  three are cheap to re-check (`ls handovers/*.md`, `gh pr list --state
  merged`, `bun test`), which is the point — each is a checkable figure, not a
  claim about magnitude.
- **C17 (`docs/parameter-rationale`) depends on this session** and was added
  to the roadmap while it ran. Nothing here blocks it; the README links the
  generative view, which C17 extends.
- **The intermittent flake** above is now localized but unfixed; it is item 1
  of the demo-prep list.
- After merge: foreman dispatches `deploy-static-sites` (this note is a new
  docs-site page).
