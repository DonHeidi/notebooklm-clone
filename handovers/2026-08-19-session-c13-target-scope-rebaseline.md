# Session C13 — Target-scope re-baseline (2026-08-19)

**Branch:** `docs/target-scope-rebaseline` · **Spec:** roadmap C13 (owner
review 2026-08-19 of the C12 pages)

## Goal and outcome

Two documents, two clean roles. `product/scope.md` stops carrying
implementation truth entirely — status table, evidence column and all 37
per-item status blockquotes are gone, and it reads as what it is: a
description of Gemini Notebook's functionality. `product/target-scope.md`
is now the single place status lives, re-baselined **against the v1
target** instead of against the research catalog. After the re-baseline
all 18 rows are ✅: every row's target is what its roadmap session
committed to, and every one of those commitments shipped. The page reads
like a delivered v1 because it is one. Docs-only; no product code touched.

## `product/scope.md` — removal, not redecoration

- **Status table dropped entirely** (not reduced to an id + title index).
  With Status and Evidence gone the remainder would have duplicated the
  section headings verbatim while preserving the visual shape of the
  removed machinery — an invitation to re-populate it. The headings and
  the docs page's own structure already provide the id → item index.
- **All 37 per-item status blockquotes removed**, including the ❌/⏳ ones
  and their "Deferral (2026-08-18)" lines. Adopted research text is
  byte-identical: every removed line in `git diff product/scope.md` is a
  blockquote, a table row, or the status section's own header/legend
  (verified by diffing with those patterns excluded — the residue is only
  the "## Implementation status" heading and its legend paragraph).
- **Kept:** the header role/framing blockquotes (updated where they
  described the now-removed machinery), the §8 annotation (the one place
  the reading-order clustering is explained), and NF-15's C12 pointer line
  to `in-numbers.md` (a cost-transparency pointer, not a status).
- **Added:** a dated **C13 addition** to the role blockquote recording that
  this document no longer tracks status and where status now lives —
  future readers meet the removal as a decision, not a gap.
- The §7 non-functional blockquote was rewritten: it used to explain the
  badge-tracking exception for NF-15. It now just names where the
  non-functional record lives (security register, feasibility register,
  architecture views, plus target-scope for quotas and guards).

### Badge-only facts, relocated before deletion

Everything else the badges said was already recorded in target-scope.md,
the roadmap cut list, or a handover. These were the facts that lived
**only** in a badge, and where each went:

| Fact | Relocated to |
| --- | --- |
| Auth: no SSO/OAuth, account deletion or plan association | SF-01 row's target statement (stated as the target's boundary) |
| Auth was built without an MVP marker, as the prerequisite for user-scoping | already in target-scope's "What Marginalia v1 is"; not duplicated |
| Source viewer is dialog-only / not URL-addressable | CF-04 row's known-limitation cell, linked to the A5 handover's open items |
| SF-02: no "shared" notebooks in v1 | SF-02 row's target statement |
| SF-10: audio output language is German/English | SF-10 row's target statement |
| SF-11: the full guard + quota numbers (20 MB, 200k words, 50 sources, 20 artifacts, 1 concurrent; 20 notebooks, 50 messages/day, 10 overviews/day) | SF-11 row's target statement — previously target-scope pointed at the SF-11 badge for these |
| NF-15's open cost controls (token budgets, model routing, caching, storage quotas) | target-scope's operational-envelope paragraph |
| SF-08: signed-URL artifact access, no share/public links | SF-08 row (target + limitation) |
| SF-09: in-process by decision, D-2 stage 1 | SF-09 row's target statement |

Nothing was destroyed. Facts already on the cut list (CF-02 formats,
CF-04 Source Guide, CF-08 server-side stop/regenerate, CF-09, CF-10
note→source, SF-09 queued jobs, two-speaker audio, sharing, analytics)
stayed there; SF-14's "never scheduled, conscious gap" verdict stays in
the C10 handover.

## `product/target-scope.md` — re-baselined against the target

- **Semantics stated in the intro:** status measures delivery against the
  v1 target defined in each row; the research catalog is descriptive and
  carries no status at all. Narrower-than-research scope is part of the
  target, stated in the target column, and does not degrade status.
- **New "What v1 targets" column** giving each commitment in the session
  record's words, with the roadmap session named. The research id moved
  into the capability cell as an inline link — it is traceability, not a
  first-class column. All 16 anchors re-verified against the rebuilt
  scope page's actual heading ids.
- **Seven rows renamed** so the name is the target's, not the catalog's:
  Notebook library / home screen → Notebook library · Source processing
  and knowledge indexing → Source processing and retrieval index · Source
  selection / context control → Source selection for retrieval ·
  Conversation state → Chat history (persistent, multi-turn) · Notes →
  Notes, including saved chat answers · Artifact download and management
  → Audio artifact management · Usage limits and quotas → Usage guards
  and per-user quotas.
- **Ten statuses changed 🔶 → ✅** (SF-01, CF-02, CF-04, CF-08, CF-10,
  CF-12, SF-08, SF-09, SF-10, SF-11 — every 🔶 C12 carried), each because the
  limitation that produced the 🔶 sits **outside** the target: it is
  either on the roadmap cut list or was never part of the session's goal.
  Reasoning per row is in the PR body.
- **Zero "badge" cells.** Every known-limitation cell now states the
  limitation in a clause and links the real record (A3/A4/A5/A6/D2
  handovers, SEC-7 in the security register).
- Operational envelope no longer points at the deleted SF-11 badge for
  the numbers; it points at the row above, plus in-numbers and SEC-7/-10.

## Two ambiguous targets — readings and why

1. **Audio-transcript persistence (CF-12).** Reading taken: **outside**
   D2's target → ✅ with the gap stated. D2's roadmap goal is "script
   generation from selected sources → TTS → artifact in Storage; Studio
   tile + async job status + player" — it never names persisting the
   script, and the D2 handover files the transcript under *open questions
   / next sessions*, calling it "a small follow-up". The competing
   reading is that NF-11 lists transcript availability for audio, so an
   accessibility requirement implies it; rejected because NF sections are
   research requirements and v1 never committed to WCAG 2.2 AA. The gap
   is still visible: it is the row's known limitation.
2. **Request-rate limiting (SF-11).** Reading taken: **outside** A6's
   target → ✅ with the qualification stated. A6's goal is "simple
   per-user quotas (NF-15 minimum)"; rate limiting appears in the record
   only as SEC-7, an accepted risk whose hardening trigger is "before
   public exposure", conditional on the closed signup circle. The
   competing reading — that abuse limits are one capability, so an
   unlimited request rate is a hole inside the target — is rejected on
   the session record's wording, but SEC-7 is linked from the row.

A third judgement worth flagging to the reviewer: **A6 documented that
regenerations are not counted against the daily audio quota.** That
limitation *does* sit inside the target (the quota is the commitment), so
it was the strongest 🔶 candidate on the page. It stays ✅ because the
targeted quotas shipped and are enforced, and the uncounted path remains
bounded by the 1-concurrent and 20-per-notebook caps, so the cost-control
purpose holds. It is stated in the row's limitation cell either way. If
the foreman disagrees, SF-11 is the one row to flip.

## Requirement-9 repoints

- **Inside target-scope.md** (the only live document that referenced the
  removed machinery): the operational envelope's "concrete numbers live
  in the SF-11 status badge" link, the header's "tracked with the same
  machinery … the research document's badges" framing, and the exclusions
  section's "with per-item status".
- **Swept, nothing to repoint:** `product/in-numbers.md`,
  `product/security.md`, `product/faq.md`, `product/architecture/*.md`.
  None of them links a status badge or the status table. security.md's
  scope-doc anchors (NF-07…NF-17) and SEC-7's SF-11 reference still
  resolve — headings are unchanged. architecture/index.md and
  logical.md cite `scope.md` as the *ideal* model, which is still true of
  a research catalog.
- **Flagged, not edited (apps/** is out of this session's boundary):**
  two docs-app strings now describe the research catalog wrongly.
  `apps/docs/src/pages/product/scope.astro:13` — description says "with
  per-item implementation status", which is now false. And
  `apps/docs/src/pages/index.astro:10` — the Start-page card still says
  "sorted into build phases. Phase 1 — the grounded-chat core loop — is
  the current target", which C12 already demoted. Both are one-line
  string swaps for whichever session may touch `apps/docs`.

## Verified

- `apps/docs` `bun run build` from the worktree: **55 pages** before this
  handover existed, **56** with it, exit 0 both times. Both rebuilt pages
  inspected as rendered HTML and as screenshots.
- Greps over **source and built HTML** of both pages: zero bare-word
  "badge"/"badges"; zero ⏳ (and zero ✅/🔶/❌) in scope.md; zero
  implementation-status blockquotes in scope.md; zero "cluster n"; every
  remaining "§" sits inside link text.
- Link integrity on the rebuilt target page: all 16 `scope.md#…` anchors
  match real heading ids in the rebuilt scope page; all five handover
  links resolve to built `/sessions/…` pages; `roadmap.md` → `/roadmap/`
  and `feasibility.md` → `/decisions/` resolve.
- Repo root from the worktree: `bun test` **154 pass, 0 fail** (the known
  local flake did not occur); `bunx varlock run -- bun run build` exit 0.
- `bun install` in the fresh worktree left `bun.lock` unchanged.

## Hot files

None. No new dependencies. `bun.lock`, root `package.json`, root
`AGENTS.md` untouched — AGENTS.md's product-docs block already describes
scope.md as "descriptive; its groupings carry no plan meaning", which
stays true and now also matches the absence of status.

## Open items / next sessions

- The two flagged `apps/docs` strings above (foreman call: a one-line
  pointer session, or fold into the next docs-app touch).
- The C12 handover's note that "the target table **mirrors** the research
  table's statuses by definition" is superseded by this session. Per
  correct-the-record, a dated correction blockquote was appended to that
  handover's open-items entry (annotated, not rewritten); the update
  discipline is now single-file — `target-scope.md` only.
- After merge: foreman dispatches `deploy-static-sites`.
