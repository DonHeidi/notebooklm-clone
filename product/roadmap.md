# Roadmap — 7-day prototype

> **Status:** Adopted 2026-08-17. Living document — extend or reorder whenever
> we want; the dependency graph is the contract, not the day numbers.
> **End state:** the core loop (sources → grounded chat → inline
> citations → source navigation → notes) **plus Audio Overview** as the
> differentiator, demoable at day 7 with the webapp deployed on Scaleway.
> **Unit of planning:** the **session** — one goal, one branch in a worktree,
> one PR, one handover note. Sessions are agent-executed, so time estimates
> are unreliable; day numbers below are loose sequencing guidance only.
> **Parallelism:** 3+ lanes at once. Review is the human bottleneck: PRs stay
> small, merged to `main` at least daily, review batched ~twice a day.
> **Note (2026-08-18):** this roadmap is the authoritative plan;
> `product/scope.md` is the research catalog it draws from. Audio Overview
> sits in research phase 2 of scope §8 — pulling it into the 7-day end
> state was a deliberate decision: it is the prototype's differentiator
> (sessions D1/D2).

## Ground rules

1. **Lane A is the critical path and always wins.** Side lanes rebase onto
   `main` after A merges; A never waits on a side lane.
2. **Merge daily.** A session that can't merge within a day is too big —
   split it.
3. **Day 7 is buffer.** Bugfixes, demo script, handovers. Anything unmerged
   by day-7 morning is cut, not rushed.
4. Each session follows repo conventions (AGENTS.md): branch
   `<type>/<topic>`, conventional commits, handover in `handovers/`.

## Session graph

```text
S-0 ──► A1 ──► A2 ──► A3 ──► A4 ──► A5 ──► A6 ─┐
  │      │            │                        ├─► Day 7: demo prep
  ├─► B1 ┴─► B2 ─────────────────────► B3 ─────┤
  ├─► C1 ──► C2 ───────────────────────────────┤
  └──────────► D1 ──► D2 (needs A1+A3) ────────┘
```

## Sessions

### S-0 — Repo unblocking *(first, ~day 0)*

Create the GitHub remote; merge the four existing stacked branches as PRs in
order (`chore/setup-monorepo` → `docs/product-scope` →
`docs/feasibility-study` → `docs/ui-research`, then this roadmap). Parallel
lanes need a shared `main`. **Blocks everything.**

### Lane A — Core product (sequential)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| A1 | `feat/domain-schema` | Core-loop domain model as Drizzle migrations: notebooks, sources, chunks (with location metadata for citations), conversations, messages, citations, notes; `vector` extension + RLS groundwork in `supabase/migrations`; repositories per aggregate. | S-0 |
| A2 | `feat/auth-library` | `@supabase/ssr` auth, RLS policies, notebook library screen (create/rename/delete/open — CF-01, SF-02). | A1 |
| A3 | `feat/ingestion` | Upload (TUS → Supabase Storage) + pasted text + URL sources; parse→chunk→embed **in-process** (feasibility D-2 stage 1); sources panel with Realtime status; basic source viewer. Formats: PDF, TXT/MD, URL (DOCX only if mammoth drops in trivially). | A1 (A2 for RLS wiring) |
| A4 | `feat/grounded-chat` | Hybrid-search retrieval (RRF), streaming chat (AI SDK, SSE), source-selection checkboxes + "N sources" counter, citations as streamed data parts, zero-source disclosure mode (ui-research §4). | A3 |
| A5 | `feat/citations-notes` | Citation chips → source viewer navigates to the cited passage (CF-07 interaction); save-response-as-note with citations preserved; note editor. | A4 |
| A7 | `chore/test-postgres` | Implement feasibility **D-9**: migrate DB-backed tests from PGlite to a real Postgres (pgvector) container; remove the two INTERIM CI workarounds marked in `ci.yml` (exit-99 tolerance, extended hook timeout). Added 2026-08-18; scheduled after A5, **before A6** so the test infra settles before the polish pass. | A5 (D-9 decision) |
| A6 | `feat/demo-polish` | Empty states, error handling, simple per-user quotas (NF-15 minimum), seeded demo notebook. | A5, A7 |

### Lane B — Platform (parallel)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| B1 | `feat/spike-streaming` | Feasibility spike S-1: Node standalone Dockerfile, Terraform apply, deployed container, SSE verdict → **decides D-7** (serverless vs VM). Runs day 1 on purpose — highest risk lands first. | S-0 |
| B2 | `feat/ci-deploy` | CI (lint, test, build), webapp deploy pipeline on the D-7 outcome, Terraform state → S3 backend, bucket deploy for static sites. | B1 |
| B3 | `feat/demo-env` | Supabase Pro, demo-mode scaling (min-scale 1 or VM), Edge Services/custom domains only if time allows. | B2 |
| B4 | `feat/custom-domain` | Custom domain `mrgnl.eu` (owner-registered at Scaleway): DNS zone in Terraform, Edge Services pipelines for docs/www (subdomain-only constraint), container domain for app.mrgnl.eu, apex redirect, Supabase auth URL updates. Added 2026-08-18. | B3; owner registers the domain first |
| B5 | `feat/supabase-terraform` | Hosted Supabase project under Terraform via the official `supabase/supabase` provider (registry-verified v1.10.1: project/settings/apikey resources): **import-only** adoption of the existing project, `prevent_destroy`, zero-diff plan gate before any apply; settings/API keys as code; tool-ownership split vs the Supabase CLI documented (migrations, storage policies, auth config stay CLI-owned). Collapses teardown/redeploy into the Terraform flow. Owner-approved 2026-08-18. | B3, B4 |

### Lane C — Static sites (parallel, fully independent)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| C1 | `feat/marketing-page` | Marketing site content + design (Astro). | S-0 |
| C2 | `feat/docs-site` | Docs site seeded with existing product/architecture docs. | S-0 (deploys via B2) |
| C3 | `feat/legal-pages` | Impressum (§5 DDG) + GDPR privacy page on both static sites (owner-provided data; sites are tracking-free, so the privacy statement is short), footer links. Added 2026-08-18 ahead of the sites going public via B2. | C1, C2 |
| C4 | `feat/project-history` | Per-package project history as canonical markdown in `product/history/` (one file per workspace: decisions, results, problems + resolutions, sourced from PRs/handovers/feasibility), rendered as a History section in the docs app. Added 2026-08-18. | C2, all merged sessions as source material |
| C5 | `feat/architecture-views` | 4+1 architectural view model (Kruchten) as canonical docs in `product/architecture/` (logical, process, development, physical views + scenarios), rendered by the docs app. Added 2026-08-18. | C2; describes state incl. A4 |
| C6 | `docs/architecture-rationale` | Dependency overview + per-dependency rationale in the development view; platform rationale as feasibility **D-10** (owner decision: Scaleway over the company's AWS — cost + lower organisational overhead — with an AWS interchange map showing provider-swap migration), referenced from the physical view; plus a FAQ (`product/faq.md`) in the docs Start section answering anticipated reviewer questions with links into the deep docs. Added 2026-08-18, FAQ added same day. | C5 |
| C7 | `docs/scope-status` | Implementation-status annotations on `product/scope.md`: dated badge per CF/SF item (in current version / partial / planned / cut, with shipping PR) + summary table at top; adopted scope text itself unchanged. Added 2026-08-18. | B3 merged (status reflects the deployed version) |
| C8 | `docs/history-latest` | Bring `product/history/*` current through the fully-merged board — per-file gaps: webapp (A6, A7, D2), infrastructure (B4, B5), supabase (B5), docs (C5–C7), process (A4–A6, B3–B5, C5, C7, D2) — and update the architecture views (physical, development) for B5's Supabase-under-Terraform. Sourced from handovers/PR record, same method as C4/C5. Added 2026-08-18. | C4–C6; all sessions merged (they are) |
| C9 | `docs/generative-view` | New **generative view** in the architecture docs (owner-requested 2026-08-18, split out of C8 which was already running): model inventory (which model, where, when, triggered by what, for what — chat, embeddings, TTS), the RAG pipeline end-to-end, audio flow, when models are NOT called, provider/key topology — derived from code, not memory. | C8 merged (C8 owns `product/architecture/**` while it runs) |
| C10 | `docs/scope-reconciliation` | Reconcile scope vs roadmap (owner decision 2026-08-18): `product/scope.md` is the **research catalog** of Gemini Notebook's functionality — descriptive reference, not commitments; this roadmap is the authoritative goal. Map every CF/SF item honestly to done / partial / cut / not-planned against the shipped prototype; demote "MVP:" markers to research-time recommendations via dated annotation; fix the badge/legend/cut-list inconsistencies and the four conflicting Phase-1 definitions (scope §8 vs scope "characteristic experience" vs root AGENTS.md vs this file). | C7 (extends its status pass); independent of C8/C9 paths |
| C11 | `docs/in-numbers` | "In numbers" page (owner-requested 2026-08-18): **development cost** — API-equivalent inference spend of the agent sessions that built the product, computed from the session transcripts' per-turn usage records (aggregates only, never content) at current published API prices — and **ops cost** — running infra spend plus a modeled 10-user inference bill derived from the code's actual constants (retrieval k, history window, quotas) at current provider prices. Canonical `product/in-numbers.md`, rendered by the docs app; every price fetched + dated, never from memory. | C2 (renders via docs); can run parallel with C9/C10 — only touch-point is the docs nav |
| C12 | `docs/scope-split` | Research/plan split (owner decision 2026-08-18): the research phases in `scope.md` were arbitrary clustering — the only real phase is the 7-day prototype. `scope.md` becomes purely the **research document** (retitled in place; filename kept so recorded citations stay true; phase groupings marked as reading-order clusters with no plan meaning). New **`product/target-scope.md`** defines the targeted version (the prototype end state) tracked with the same badge/status machinery — one document describes the researched original, the other commits to a target. Folds in: NF-15 → in-numbers pointer, FAQ "phases 2–5" phrasing. | C10, C11 merged (nav + scope.md hand-offs) |
| C13 | `docs/target-scope-rebaseline` | Target-scope rework (owner review 2026-08-19): the C12 table misrepresents a delivered product as half-implemented — statuses were mirrored from the research catalog. Re-baseline **against the target** (a limitation flags 🔶 only if it sits inside the target definition — e.g. email+password auth IS the target → ✅ with limitation noted); each row states what the target actually is; the "badge" shorthand replaced with stated limitations or real links. *(Row text corrected 2026-08-19 — an earlier version added a "complete the row set" scope from a foreman misreading of the owner's review.)* | C12 |

### Lane D — Differentiator (joins mid-week)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| D1 | `feat/spike-tts` | TTS provider spike: EU-friendly options (Scaleway's audio models are transcription-only as far as verified). Output: provider decision behind the D-4 abstraction. | S-0 |
| D2 | `feat/audio-overview` | Single-speaker Audio Overview (CF-12 MVP tier): script generation from selected sources → TTS → artifact in Storage; Studio tile + async job status (Realtime) + player. First exercise of the generic-artifact pattern. | D1, A1, A3 |

### Day 7 — Demo prep (no new features)

Bugfixes across lanes, demo walkthrough script, final handovers, README.

## Cut list (explicitly out of the 7 days)

YouTube/Drive/audio-file ingestion · sharing & collaboration (incl. public
notebooks — SF-06) · Fast/Deep Research (no stub UI — the search box is
simply absent) · mind maps, flashcards, quizzes, standalone reports ·
multi-language output · analytics · note→source conversion ·
two-speaker/interactive audio.

Added 2026-08-18 (C10 scope reconciliation — deferrals that were decided in
practice but never recorded here): chat configuration (CF-09 — custom
instructions, preset modes, response length) · ingestion formats beyond
PDF/TXT/Markdown/pasted text/URL (DOCX, CSV, PowerPoint, EPUB, images,
Google Workspace imports — CF-02) · auto-generated source summaries /
Source Guide (CF-04) · server-side stop + regenerate response (CF-08) ·
queued, recoverable job infrastructure (SF-09 — the prototype runs
feasibility D-2 stage 1 in-process instead).

Everything cut remains catalogued in the research document
(`product/scope.md` — its §8 groupings are reading-order clusters, not a
plan) and can be appended here as new sessions whenever we choose; the
targeted version this cut list protects is `product/target-scope.md`.
