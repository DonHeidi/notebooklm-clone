# Roadmap — 7-day prototype

> **Status:** Adopted 2026-08-17. Living document — extend or reorder whenever
> we want; the dependency graph is the contract, not the day numbers.
> **End state:** Phase 1 core loop (sources → grounded chat → inline
> citations → source navigation → notes) **plus Audio Overview** as the
> differentiator, demoable at day 7 with the webapp deployed on Scaleway.
> **Unit of planning:** the **session** — one goal, one branch in a worktree,
> one PR, one handover note. Sessions are agent-executed, so time estimates
> are unreliable; day numbers below are loose sequencing guidance only.
> **Parallelism:** 3+ lanes at once. Review is the human bottleneck: PRs stay
> small, merged to `main` at least daily, review batched ~twice a day.

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
| A1 | `feat/domain-schema` | Phase 1 domain model as Drizzle migrations: notebooks, sources, chunks (with location metadata for citations), conversations, messages, citations, notes; `vector` extension + RLS groundwork in `supabase/migrations`; repositories per aggregate. | S-0 |
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

### Lane C — Static sites (parallel, fully independent)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| C1 | `feat/marketing-page` | Marketing site content + design (Astro). | S-0 |
| C2 | `feat/docs-site` | Docs site seeded with existing product/architecture docs. | S-0 (deploys via B2) |
| C3 | `feat/legal-pages` | Impressum (§5 DDG) + GDPR privacy page on both static sites (owner-provided data; sites are tracking-free, so the privacy statement is short), footer links. Added 2026-08-18 ahead of the sites going public via B2. | C1, C2 |
| C4 | `feat/project-history` | Per-package project history as canonical markdown in `product/history/` (one file per workspace: decisions, results, problems + resolutions, sourced from PRs/handovers/feasibility), rendered as a History section in the docs app. Added 2026-08-18. | C2, all merged sessions as source material |

### Lane D — Differentiator (joins mid-week)

| ID | Branch | Goal | Depends on |
| --- | --- | --- | --- |
| D1 | `feat/spike-tts` | TTS provider spike: EU-friendly options (Scaleway's audio models are transcription-only as far as verified). Output: provider decision behind the D-4 abstraction. | S-0 |
| D2 | `feat/audio-overview` | Single-speaker Audio Overview (CF-12 MVP tier): script generation from selected sources → TTS → artifact in Storage; Studio tile + async job status (Realtime) + player. First exercise of the generic-artifact pattern. | D1, A1, A3 |

### Day 7 — Demo prep (no new features)

Bugfixes across lanes, demo walkthrough script, final handovers, README.

## Cut list (explicitly out of the 7 days)

YouTube/Drive/audio-file ingestion · sharing & collaboration · Fast/Deep
Research (no stub UI — the search box is simply absent) · mind maps,
flashcards, quizzes, standalone reports · multi-language output · analytics ·
note→source conversion · two-speaker/interactive audio.

Everything cut remains in `product/scope.md` phases 2–5 and can be appended
here as new sessions whenever we choose.
