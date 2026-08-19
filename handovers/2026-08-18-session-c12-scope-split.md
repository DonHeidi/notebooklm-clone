# Session C12 — Research/plan scope split (2026-08-18)

## Goal

Roadmap lane C, session C12 (`docs/scope-split`), executing the owner
decision of 2026-08-18: the research phases in `product/scope.md` were
arbitrary clustering from the research phase — the only plan-phase that
ever existed is the 7-day prototype. The document set splits accordingly:
`scope.md` becomes purely the **research document** (retitled in place,
filename kept so recorded citations stay true), and a new
**`product/target-scope.md`** defines the **targeted version** (Marginalia
v1, the shipped prototype end state), tracked with the same badge/status
machinery. Docs-only; no product code changed.

## What was done

- **`product/scope.md` → research document, in place.** H1 retitled to
  "Research catalog — Gemini Notebook functionality" (a dated line in the
  status blockquote records the original title; the adopted inner heading
  at §1 and all adopted research text are byte-untouched — verified via
  `git diff`: every removed line is C7/C10 annotation or table machinery).
  The C10 document-role blockquote gained a dated **C12 addition**: the
  phase groupings were arbitrary reading-order clustering, never a plan;
  the one plan-phase is the 7-day prototype; the targeted version is
  target-scope.md; the file keeps its path and CF/SF ids so recorded
  citations (handovers, PR bodies, the security register's scope-doc
  anchors) keep resolving. The §8 annotation blockquote gained the same
  dated addition. Badge language demoted throughout: the legend's ⏳ is now
  "catalogued only (§8 reading-order cluster; in no plan)"; every
  "research phase n" in table cells and badges is now "§8 cluster n
  (reading order only)"; every "remains research-phase-n scope" is now
  "stays catalogued here (§8 cluster n, reading order only); not planned —
  target-scope.md records what is".
- **NF-15 / SF-11 pointers (folded-in C11 amendment):** NF-15's badge
  gained a dated pointer line to `in-numbers.md` as the cost-transparency
  record; SF-11's badge gained the one-line equivalent ("What these limits
  cost to operate…") — it read naturally, so it went in.
- **`product/target-scope.md` (NEW).** Structure: what Marginalia v1 *is*
  (the roadmap end state plus the two built prerequisites, auth and
  quotas); an 18-row item table — each row with the research CF/SF id
  (linked to the item's section/badge in the research document) or
  **prototype-only** (demo polish #49; the deployed environment
  #13/#36/#45/#48), status mirroring the research document's table,
  shipping PRs, and for every 🔶 the known-limitation record as a link
  (the item's status badge by default; deeper records where they exist:
  CF-08 → the A4 handover "Gotchas" §1, CF-12 → the D2 handover's
  transcript gap, SF-11 → SEC-7). Operational-envelope section links the
  SF-11 badge and the in-numbers page instead of restating numbers
  (single source per fact), and names the closed-signup-circle condition
  (SEC-10). Exclusions section points at the roadmap cut list.
- **Cross-document consistency (requirement 3).** roadmap.md's cut-list
  closing line now uses research-document phrasing and names
  target-scope.md. faq.md's "the scope's phases 2–5" → "catalogued in the
  research document". Root AGENTS.md's product-docs block (the one allowed
  AGENTS.md change) now names all three documents with their roles; the
  characteristic-experience sentence kept verbatim. The phase sweep then
  surfaced two further strays **inside the allowed file set**, both fixed
  as consistency lines: roadmap.md's header "**End state:** Phase 1 core
  loop (…)" → "the core loop (…)" (the parenthetical already spells the
  loop out), and the A1 row's "Phase 1 domain model" → "Core-loop domain
  model".
- **Docs app** (nav registration + one correct-the-record):
  `src/pages/product/target-scope.astro` (DocPage pattern), a "Target
  scope" nav item beside the scope entry (relabeled "Research catalog"),
  and a fixed canonical-links rule `target-scope.md` →
  `/product/target-scope/` (checked: the existing `scope.md` regex does
  NOT match `target-scope.md`). Beyond strict nav registration, one
  correct-the-record edit: `scope.astro`'s page title/description still
  said "Product scope … sorted into build phases" — now the research
  catalog phrasing. Called out in the PR.

## Phase-sweep verdict (requirement 3)

`grep -rn -i phase` over `product/*.md`, `product/architecture/*.md`, and
all AGENTS.md files, after the edits:

- **scope.md** — remaining mentions are adopted research text (§8 table,
  the "Phase 1" conclusion sentence) or dated annotations that name the
  sketch as research ("research-era phase sketch", "reading-order
  clustering from the research phase"). Clean.
- **roadmap.md** — "Audio Overview sits in research phase 2 of scope §8"
  (header) and the C10/C12 row texts describe the research sketch
  explicitly. Clean.
- **FLAGGED, not fixed (hard boundary — faq.md allowed "the one phrase"
  only): `product/faq.md:77`** — "The smallest product that genuinely
  captures NotebookLM is Phase 1, and that is what is built." The first
  half quotes the research conclusion (scope §8 adopted text), but "and
  that is what is built" attaches plan meaning to the demoted label.
  One-sentence follow-up for the foreman: e.g. "…is the research
  catalog's core cluster — and that is what was built as the prototype
  end state."
- **Out-of-scope files, verified not false:** `feasibility.md` (5×),
  `ui-research.md` (3×), `architecture/logical.md` (2×),
  `architecture/development.md` (3×) use "Phase 1"/"Phase 5" as the
  then-current names of research clusters in dated documents; the claims
  they carry remain true. Cosmetic candidates for whichever session next
  touches those files; no stale-claim bug found, so nothing edited.
- **security.md** — verified out-of-scope file: its "Scope-doc anchors:
  NF-07 … NF-17" note still resolves (filename and NF sections
  unchanged); its SF-11 reference in SEC-7 still resolves. Nothing false.

## Verified

- `apps/docs` `bun run build` from the worktree: **53 pages** (was 52;
  +`/product/target-scope/`; this handover adds a 54th on re-build), exit
  0. Both pages carry the new `<title>`/H1. All 17 target-scope →
  research-catalog links resolve against the built HTML's actual heading
  ids (`#cf-01--notebook-management` form — checked id-by-id, not
  assumed), handover links rewritten to `/sessions/…`, `target-scope.md`
  links in scope/roadmap rewritten to `/product/target-scope/`.
  External-asset grep over `dist/`: only the pre-existing canonical-URL
  link tag; no external scripts/styles.
- Repo root from the worktree: `bun test` **154 pass, 0 fail** (no flake
  occurrence this run); `bunx varlock run -- bun run build` exit 0
  (run from the worktree root per the craft-13 varlock rule).
- Adopted-text integrity: every `-` line in `git diff product/scope.md`
  is annotation/legend/table machinery; zero adopted research text
  changed.

## Hot files

Root `AGENTS.md` — the product-docs block only; exact diff quoted in the
PR. No new dependencies; `bun.lock`, root `package.json` untouched.

## Open items / next sessions

- **faq.md:77** ("…is Phase 1, and that is what is built") — flagged
  stray, one-phrase foreman follow-up (see sweep verdict above).
- The target table **mirrors** the research table's statuses by
  definition; the C7/C10 update discipline now spans both files —
  whichever session ships or cuts a delivered item updates the research
  badges **and** the target table in the same change (stated in
  target-scope.md's header).
- After merge: foreman dispatches `deploy-static-sites`.
