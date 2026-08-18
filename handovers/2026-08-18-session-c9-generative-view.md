# Session C9 — Generative view (2026-08-18)

## Goal

Roadmap lane C, session C9 (`docs/generative-view`): a new
`product/architecture/generative.md` — a deliberate extension of the C5
4+1 view set — answering what no canonical view did: which AI model is
invoked where, triggered by what, for what purpose, bounded by which
guard/quota, including the complete RAG pipeline. Docs-only; no code or
behavior changed.

## What was done

- **`product/architecture/generative.md`** (NEW), written code-first: every
  model id, constant, and flow was read from the merged source this session
  (`src/server/ai/*`, `src/server/audio/*`, the chat/ingestion/audio
  services, the chat route, `source-repository.hybridSearchChunks`,
  `limits.ts`, `quota.ts`, `scripts/seed-demo.ts`, `.env.schema`), then
  cross-checked against D-4/D-8/D-10 and the A4/A6/D1/D2 handovers.
  Contents:
  - **Model inventory table** — six rows (grounded chat, audio script,
    ingestion embeddings, query embedding, TTS, the seed script), each with
    purpose · default model id · call sites · trigger (user action vs
    background job vs operator) · provider · env override names · the
    guard/quota bounding its spend. Ids carry the file + constant they were
    read from so future drift is checkable (D-4 EOL caveat stated in the
    status note).
  - **RAG pipeline end to end** — write path (parse → guard-before-spend →
    chunk 400/40 tokens with offset invariant → `embedMany` at 2000 dims →
    HNSW + generated fts) and read path (auth → quota gate → UUID-filtered
    selection → query embed → hybrid search with `RRF_K = 50`,
    `CANDIDATE_POOL = 30`, top-10 → SEC-3 prompt assembly → streamed
    `data-citation` parts → server-side marker validation and transactional
    persistence), with the A4 note that the constants are deliberate tuning
    knobs.
  - **Audio flow** — create-time guards before any spend, the 24k-char
    deterministic excerpting, script completion (SEC-3 posture, focusPrompt
    as the only user instruction), one-SSML-POST Azure synthesis (the
    defining D-8 reason), CBR-mp3 duration derivation, the
    script-before-TTS ordering consequence, and the `TtsProvider` seam with
    its unimplemented escape hatches.
  - **When models are NOT called** — quota 429 before retrieval, the
    zero-source path stated *precisely* (it skips embedding + retrieval but
    **does** still invoke the chat model with the disclosure prompt — the
    common misreading is called out), auth/validation failures, ingestion
    guard failures, and the all-DB paths; plus the deliberate negative:
    **no reranker call** exists (D-4 offers one; NF-01 tuning surface).
  - **Provider/key topology + lifecycle** — one Scaleway key for all text
    AI, Azure as the one non-OpenAI-compatible surface (region
    `swedencentral` vs the schema's `westeurope` default, per the D-8
    audition note), and the load-bearing embedding-EOL implication: rotating
    `qwen3-embedding-8b` requires **re-embedding every stored chunk** and a
    Matryoshka-capable successor (the runtime dimension assertion refuses
    anything else); chat-model rotation is cheap by contrast.
- **Diagram**: `diagrams/generative-topology.puml` → committed
  `assets/generative-topology.svg` via the C5 `render.sh` pipeline
  (official PlantUML container). Component view: the four calling
  components → the two Scaleway models + Azure + pgvector/Storage, with
  env-var names on the provider nodes. C5's wide-diagram lesson applied:
  hidden layout edges brought it from 1598 px to 1438 px. Only W3C
  namespace URLs inside (verified); re-rendering left all seven existing
  SVGs byte-identical.
- **Integration**: index.md gained a dated C9 update note, the table row
  ("Generative (extension)"), and the heading "How the five pages map" →
  "How the pages map" (count claim, corrected in place); `logical.md` (after
  "The retrieval abstraction") and `process.md` (grounded-chat section)
  each gained a one-line dated cross-reference — links only, no rewrites.
- **Docs app**: one `architecturePages` entry in `apps/docs/src/nav.ts`
  (the C5 handover names this as the required touch for a new view). No
  other app changes: the C6 canonical-link rewriter already maps
  `architecture/<id>.md` generically — the cross-links use the
  `../architecture/generative.md` form so they resolve both on GitHub and
  through the rewriter (a bare same-directory `generative.md` link would
  NOT be rewritten — gotcha for future same-directory links).

## Verified

- `apps/docs` `bun run build`: **48 pages** (was 47), exit 0;
  `/architecture/generative/` present in `dist/`, nav entry rendered,
  cross-links rewritten to `/architecture/generative/` in built HTML.
  External-request grep over `dist/`: unchanged (only content anchors).
- Repo root from the worktree: `bun test` **154 pass, 0 fail**;
  `bunx varlock run -- bun run build` exit 0 — proof the docs change
  touched no behavior.
- Screenshot: `handovers/assets/2026-08-18-c9-generative.png` (1440px,
  full page against the built dist).

## Hot files

None — no new dependencies; `bun.lock`, root `package.json` untouched.

## Stale claims found in read-only files (flagged, not fixed — boundaries)

- **PGlite comments in webapp code** (D-9 retired PGlite for real
  Postgres, but the comments survive): `chat-service.ts` ("testable
  against PGlite with a fake embedder"), `ingestion-service.ts` ("tests
  run the real pipeline against PGlite"), `source-repository.ts` (two:
  "PGlite tests exercise the exact production query" above
  `hybridSearchChunks`, and "the PGlite driver used in tests" on the
  execute-result normalization). Correct-the-record candidates for the
  foreman or the next webapp session — `apps/webapp` was read-only here.
- **`physical-topology.puml`/`.svg`** still draws "Azure … westeurope …
  PENDING — D2 in flight" and "Supabase — LOCAL stack today, hosted
  project pending B3". The physical page's dated update notes correct
  both in prose (B3/C8 convention), but the *diagram* predates them; a
  future session touching the physical view should re-render it. In this
  view's own diagram the current truth (swedencentral, live) is drawn.

## Open items / next sessions

- The generative view inherits the C5 contract: sessions that change the
  generative surface (a reranker, TTS provider swap, model rotation,
  D-2 stage 2 moving ingestion out of process) should update it in the
  same PR.
- After merge: foreman dispatches `deploy-static-sites`.
