# Session C10 — Scope ↔ roadmap reconciliation (2026-08-18)

## Goal

A reader holding `product/scope.md` and `product/roadmap.md` can no longer
find a contradiction: scope.md presents itself as the **research catalog**
of Gemini Notebook's functionality (owner decision 2026-08-18) with an
accurate per-item mapping to what the prototype delivered; roadmap.md is
visibly the authoritative plan; root AGENTS.md points at the right
document; every badge citation resolves to a real record. C7's precedent
holds throughout: adopted scope text untouched — annotations, badges and
dated blockquotes do all the work.

## What was done

### Framing (requirement 1)

- **Document-role blockquote** added under scope.md's provenance header:
  scope.md is the research catalog, roadmap.md the authoritative plan, the
  shipped 7-day prototype the delivered goal, "MVP:" markers are
  research-time recommendations. It explicitly supersedes the provenance
  note's "treat §8 as the working roadmap" sentence (which stays in place,
  annotated rather than rewritten).
- **§8 annotation**: the phase table is marked as the research-era sketch,
  superseded by the roadmap. The annotation names the three divergent
  "Phase 1" formulations (9-item table row, 7-element characteristic
  experience, roadmap's 5-element end state) and declares the roadmap
  authoritative. The previously implicit CF/SF-id mapping behind each
  phase row is now explicit (Phase 1 = CF-01…CF-08 + CF-10; Phase 2 =
  CF-11, CF-12 single-speaker, CF-19, CF-10 improved, SF-03, SF-05/06,
  SF-10; Phase 3 = CF-13…CF-17; Phase 4 = CF-12 advanced tiers + CF-18;
  Phase 5 = CF-20…CF-22), with the note that SF-01/02/04/07–09/11–14 were
  never phase-mapped — which is why SF-14 had no phase.
- **Audio Overview timing** stated once: research phase 2 / "once that
  foundation works" / inside the 7-day end state are the same decision
  seen from different dates; the roadmap wording holds. Recorded in the §8
  annotation and as a dated note in roadmap.md's header blockquote.
- **Root AGENTS.md** (the one allowed change): the intro no longer labels
  the 7-element chain "Phase 1 (Core MVP)"; it now names scope.md as the
  research catalog and roadmap.md as the authoritative plan, with the
  chain correctly called the characteristic experience plus Audio Overview
  as differentiator.

### Demotions (requirement 2) — all owner-decided 2026-08-18 deferrals

Each never-built "MVP:"-marked capability gained a dated **Deferral**
line in its badge blockquote:

- **CF-04** — auto source summary (Source Guide): deferred, now on the cut
  list.
- **CF-08** — server-side stop + regenerate: deferred, on the cut list;
  stop is client-side only, citing the A4 handover's known-behavior record
  (`handovers/2026-08-18-session-a4-grounded-chat.md`, "Gotchas" §1).
- **CF-09** — chat configuration: never scheduled; deferral recorded on
  the cut list; MVP marker demoted.
- **CF-10** — note→source conversion: stays deferred (was already on the
  cut list at adoption); MVP marker covers the shipped note loop only.
- **CF-11** — generic reports: no roadmap session ever scheduled reports;
  MVP marker demoted.
- **SF-09** — queued/recoverable job infrastructure: deferred, on the cut
  list; prototype runs feasibility D-2 stage 1 in-process by decision.

Built-beyond-plan side: SF-01's badge now records that auth had no MVP
marker and was built as the prerequisite for everything user-scoped;
CF-12's pull-forward is the recorded Audio Overview decision above (SF-08
and SF-10 badges already carried their reality — untouched).

### Badge/citation integrity (requirement 3)

- **Legend reworded**: ⏳ is now "future candidate (sits in a §8 research
  phase; no roadmap session)"; ❌ is "not in the prototype — cut or never
  planned; each ❌ badge cites where that is recorded (roadmap cut list,
  scope §9, or the item's own applicability condition)". This makes SF-07
  (§9) and SF-12 (own condition) legal ❌s without re-badging.
- **CF-09**: table evidence "not shipped" → "cut list (recorded
  2026-08-18)"; resolves against the new cut-list entry.
- **CF-02**: badge's cut-list citation now true — the missing formats were
  added to the cut list.
- **SF-06**: cut list now says "sharing & collaboration (incl. public
  notebooks — SF-06)", so the existing citation resolves.
- **SF-14**: re-badged ⏳→❌ "Not planned" — in no research phase, no
  session, no cut-list entry; recorded as a conscious gap, not a dropped
  commitment. Table row updated to match.
- **Stale header**: status now reads "through session A6, #49" (verified:
  A6 = #49 is the last webapp-affecting merge; #48/B5 is import-only
  Terraform; #50+ are docs-only), with C7's original B3/#36 snapshot noted.
- **NF badge policy**: resolved by keeping NF-15's badge and amending the
  pre-§7 note to name it as the one deliberate exception (least churn;
  deleting A6's shipped-quota record would lose information).
- ⏳ badges and "remains phase n scope" clauses reworded to "research
  phase n" so no annotation implies a live phase plan.

### Roadmap side (requirement 4)

- Header blockquote: dated note — roadmap is authoritative, scope is the
  catalog, Audio Overview deliberately pulled forward as differentiator.
- Cut list: dated 2026-08-18 extension paragraph adding chat configuration
  (CF-09), ingestion formats beyond PDF/TXT/MD/pasted/URL (CF-02), Source
  Guide (CF-04), server-side stop + regenerate (CF-08), queued job
  infrastructure (SF-09); "sharing & collaboration" extended with
  "(incl. public notebooks — SF-06)".
- Spot-check correction to the session brief's map: **note→source
  conversion was already on the cut list** (roadmap.md, since adoption) —
  no new entry needed; CF-10's citation was accurate all along.

## Verification

- **Citation sweep** (requirement 5): `grep -n -i "cut list\|roadmap"
  product/scope.md` — all 16 table/badge "cut list" citations resolve
  against the updated cut list; no reference to a cut that doesn't exist;
  SF-07/SF-12 cite §9/own-condition per the new legend; SF-14 correctly
  claims *absence* of a cut-list entry.
- **Adopted-text integrity**: every `-` line in `git diff product/scope.md`
  is a C7-era annotation/header/table line; zero adopted scope text
  changed.
- `apps/docs` `bun run build`: 49 pages, exit 0; rendered
  `/product/scope/` contains all 6 Deferral annotations, the role
  blockquote, and `roadmap.md` links rewritten to `/roadmap/`.
- Repo-wide `bun test`: 154 pass, 0 fail. Repo-wide `bun run build`:
  exit 0.
- Gotcha confirmed again: varlock no-ops/errors from worktree subdirs —
  wrapped commands run from the worktree root after
  `ln -sf ../../.env.local .env.local`.

## Open points

- `product/faq.md` was out of scope for edits, but was checked: line 73
  ("Why are some NotebookLM features missing?") calls the target
  "**Phase 1** — the grounded-chat core loop plus Audio Overview". Content
  is right, label is the demoted research-phase name; a one-word follow-up
  ("the prototype end state" instead of "Phase 1") would finish the job.
  Flagged in the PR per the session boundary, not edited.
- The C9 (generative view) and C11 (in-numbers) sessions run in parallel
  on disjoint paths; no coordination was needed and none was done.
- The status snapshot now reads "through A6 (#49)". The C7 open point
  stands: whichever session next ships or cuts a CF/SF item must update
  the badges and table in the same change.
