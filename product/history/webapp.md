# Webapp — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `apps/webapp` through session A3 (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/feasibility.md`.
>
> **Update (2026-08-18, session C8):** coverage extended through the full
> merged board — sessions A4, D2, A5, A7, and A6 in the catch-up section
> below. (The per-session appending C4 asked for did not happen; C8 is the
> batch, see `product/history/process.md`.)

## What was built

- **2026-08-17 — Scaffold** (PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)).
  create-next-app (App Router, TypeScript, Tailwind v4, Turbopack, src dir),
  shadcn/ui initialized, Drizzle ORM + postgres-js, and a DDD skeleton under
  `src/server/` with a placeholder `notebooks` table and repository.
- **2026-08-17 — Domain schema and repositories, session A1**
  (PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)). The full
  Phase 1 domain model: 7 tables (notebooks, sources, chunks, conversations,
  messages, citations, notes), generated SQL migrations, and owner-scoped
  repositories per aggregate. Chunks carry citation location metadata — char
  start/end offsets, nullable page number, a `vector(2000)` embedding, and a
  generated `tsvector` column for the full-text half of future hybrid search.
  17 tests against PGlite (in-process Postgres + pgvector) migrated with the
  actual generated SQL.
- **2026-08-17 — Auth, notebook library, workspace shell, session A2**
  (PR [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10)).
  Email+password auth via `@supabase/ssr`, `/login` + `/signup`, the notebook
  library as the authenticated home (instant create, inline rename, delete
  with confirmation), and the three-column workspace shell
  (Sources | Chat | Studio) at `/notebooks/[id]` for later sessions to fill.
  24 tests total.
- **2026-08-17 — Production Dockerfile, session B1**
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)). The SSE
  spike left two keepers in this workspace: the production Dockerfile
  (Bun installs dependencies, `next build` and runtime on `node:24-slim`,
  standalone output) and `output: "standalone"` +
  `outputFileTracingRoot` in `next.config.ts` (required in a monorepo). The
  throwaway `/api/spike-stream` route also lives here until A4 deletes it
  (SEC-4 in `product/security.md`).
- **2026-08-18 — Source ingestion, session A3**
  (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)). Users add
  sources (file upload, website URL, pasted text) and they become
  retrievable, citation-ready chunks: parse → chunk → embed → store, with
  live status in the Sources panel and a read-only source viewer. 52 tests;
  verified end-to-end against local Supabase with real Scaleway embeddings
  (90 chunks across pasted text, a Wikipedia article, and a 15-page arXiv
  PDF — all embeddings 2000-dim, all offsets slice-exact).

## Decisions and why

- **Node, not Bun, runs the production container** (feasibility **D-1**,
  decided with the owner 2026-08-17). Bun 1.3 has acknowledged bugs on
  exactly our path: `next build` segfaults (oven-sh/bun#36866), ~670 MB idle
  RSS for the standalone server vs ~80 MB on Node (oven-sh/bun#34389), and
  open streaming issues — and streaming chat is the core feature. Bun stays
  as package manager, script runner, and test runner.
- **Embedding dimension `vector(2000)`** (PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)).
  The chosen embedding model `qwen3-embedding-8b` (**D-4**) natively outputs
  4096 dimensions — above pgvector's 2000-dim HNSW ceiling for `vector`
  columns and even above `halfvec`'s 4000. The model is Matryoshka-trained
  (32–4096 configurable via the API's `dimensions` parameter), and Scaleway's
  FAQ explicitly recommends 2000 dimensions with pgvector indexes. So the
  column is `vector(2000)` and every embedding call passes
  `dimensions: 2000`; the constant is exported as `EMBEDDING_DIMENSIONS` and
  the returned vector length is asserted before insert (A3).
- **One migration timeline, applied by the Supabase CLI** (PR [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6)).
  Drizzle *generates* SQL (never `push`, **D-3** — `drizzle-kit push`
  regenerates HNSW indexes without the operator class) into
  `supabase/migrations/` with Supabase-style timestamps, forming one ordered
  timeline with the hand-written extension/RLS/storage migrations. Details in
  `product/history/supabase.md`.
- **Auth: the proxy is convenience, the server-side check is authoritative**
  (PR [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10)). Token
  refresh and optimistic redirects live in `src/proxy.ts` — Next 16 renamed
  `middleware.ts` to `proxy.ts`, verified against the bundled Next docs. But
  every authenticated page and server action calls `requireUser()`, which
  validates the JWT via `auth.getClaims()` (never `getSession()`), because
  the Next docs warn that a matcher change can silently drop proxy coverage.
  The verified `sub` claim is the `ownerId` handed to every repository call;
  the client never supplies an owner id.
- **Authorization is app-layer first; RLS is defense-in-depth** (PRs
  [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6),
  [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10); SEC-5). The
  app connects via the pooler as `postgres`, which RLS does not bind, so
  every repository method takes the owner id and scopes its queries by it.
  Missing and foreign rows both surface as `NotFoundError` — no existence
  leaks (a second user gets a 404 on the first user's notebook URL, verified
  in A2's click-through).
- **Ingestion runs in-process for now** (**D-2** stage 1, PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
  Parse → chunk → embed runs via Next's `after()`, with job state in the
  `sources.status` column from day one, so promoting the same worker code to
  Scaleway Serverless Jobs (stage 2) later changes neither schema nor UI.
- **Parser choices** (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
  PDF via `unpdf` — `extractText(pdf)` *without* `mergePages` gives per-page
  text, so pages are chunked independently and every chunk carries an
  unambiguous `pageNumber`. URL via `@mozilla/readability` on a `linkedom`
  DOM. TXT/Markdown stored as-is with only line endings normalized, so
  offsets are OS-stable. Parsers are pure (bytes/string in), so tests use
  committed fixtures and never touch the network. DOCX was consciously left
  out: mammoth was not a trivial drop-in (new dependency, binary fixtures,
  its own failure modes); it slots in later as one more parser branch.
- **The offset invariant** (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
  Every chunk satisfies `content.slice(charStart, charEnd) === chunk.text`
  — tested (including overlap and repeated-text cases) and SQL-verified
  (90/90 chunks in the e2e run). This is the raw material A5's
  citation-to-passage navigation stands on.
- **Polling, not Realtime, for ingestion status** (PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)).
  A 2.5 s poll that only runs while a source is pending/processing.
  In-process ingestion finishes in seconds, so the window is short; Realtime
  `postgres_changes` would need the `supabase_realtime` publication *plus*
  RLS evaluation of the join-based sources policy inside walrus — more
  moving parts with a silent-failure mode, for no UX gain at these
  durations. Revisit at D-2 stage 2 when jobs get long.
- **Uploads go browser → Supabase Storage, never through the container**
  (**D-5**, PR [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15)):
  the server receives only the storage path and validates the owner prefix.
  Kept even after spike S-1 disproved the rumored ~1 MB body limit — the
  path stays for resumability and RLS, not because of a limit.

## Problems and how they were dealt with

- **Bun 1.3 isolated installs break Next standalone tracing.** The
  `node_modules/.bun` symlink store loses `@swc/helpers` in the traced
  output. Found in B1 when the Docker image was verified locally before
  deploy; resolved by `bun install --linker=hoisted` in the Dockerfile
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
- **Next 16 renamed `middleware.ts` to `proxy.ts`.** Found in A2 by
  verifying against the Next docs bundled in `node_modules` rather than
  memory; the auth refresh went into `src/proxy.ts` with the exported
  `proxy` function (PR [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10)).
- **The shadcn CLI had changed its flags out from under memory.** During
  the scaffold (session 01, PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)),
  `bunx shadcn@latest init --yes --base-color neutral` failed with
  `unknown option '--base-color'` — the current CLI had moved from
  per-option flags to a preset system. Found by the immediate CLI error on
  first invocation; resolved by inspecting `init --help` and switching to
  `init --yes --defaults` (the base-nova preset, which carries
  `baseColor: neutral` in the generated `components.json`). This is the
  CLI-flag flavor of the repo's "never pin from memory" rule: generator
  flags are verified against `--help` at run time, not recalled from
  training data. (Source: foreman session record, recorded via PR
  [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22) — see
  "Correcting the record" in `product/history/process.md`.)
- **The scaffold's shadcn/ui is the Base UI flavor, not Radix.** Noted in
  A2: composition uses `render={...}` props, not radix-style `asChild` —
  components added later must follow that idiom
  (`handovers/2026-08-17-session-a2-auth-library.md`).
- **SSRF via URL sources is only partially guarded** (SEC-1). The fetcher
  blocks loopback/private/link-local hostnames but doesn't resolve DNS and
  checks only the original hostname while redirects are followed. Found and
  documented in the A3 session itself; consciously accepted for the
  prototype (authenticated users only, no privileged network neighbors) with
  the hardening trigger recorded in `product/security.md`.
- **Oversized files are rejected only after parsing** (SEC-2). The 20 MB cap
  is enforced at upload, but word-count limits run post-parse — a crafted
  PDF can spike CPU in-process. Accepted; the structural fix is D-2 stage 2
  (parsing in a disposable job container).
- **Test-runner quirks under Bun + PGlite** surfaced when CI first ran the
  suite with an exit-code check — exit code 99 despite 0 failures, and cold
  WASM init blowing the 5 s hook timeout on CI runners. The story lives in
  `product/history/infrastructure.md` (CI section); A-lane sessions should
  know both exist
  (`handovers/2026-08-18-session-b2-ci-deploy.md`).
- **Browser-automation friction during verification, not app bugs:**
  `take_screenshot` times out on this Wayland setup (A2, A3 — click-throughs
  documented in prose instead), and chrome-devtools `fill` doesn't fire
  React's `onChange` (A3 dispatched manual `input` events).

## Where the webapp stands

> **Update (2026-08-18, session C8):** superseded — everything "next" below
> shipped the same day. See the catch-up section that follows.

Sources can be added and become embedded, citation-ready chunks; auth and
ownership are enforced end-to-end. Next per the roadmap: A4 grounded chat
with retrieval and streamed citations (must honor the SEC-3 prompt-injection
contract and delete the spike route, closing SEC-4), then A5
citations-to-passage navigation and notes.

## Catch-up: sessions A4, D2, A5, A7, A6 (appended 2026-08-18, session C8)

Written by session C8 from the session handovers and PR descriptions
(#24, #27, #29, #33, #35, #49). The snapshot above is unchanged; with this
section the page covers the full merged board. Sessions appear in merge
order.

### What was built

- **2026-08-18 — Grounded chat with inline citations, session A4**
  (PR [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24)). The
  product's defining loop (CF-05/06/07/08): hybrid retrieval
  (pgvector cosine over the HNSW index + full-text on the generated
  `tsvector`, fused with reciprocal rank fusion in **one** SQL statement),
  a streaming chat route that emits a typed `data-citation` part at each
  first occurrence of a valid `[n]` marker, transactional persistence of
  the assistant message + citations, one conversation per notebook with a
  12-message context window, clear-chat, a zero-source mode (retrieval
  skipped, general-knowledge disclosure mandated), source-selection
  checkboxes in the Sources panel, and citation chips carrying
  `data-chunk-id` for A5. The B1 spike route was deleted — SEC-4 closed.
  80 tests.
- **2026-08-18 — Audio Overview, session D2**
  (PR [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27)). CF-12
  MVP on the **generic artifacts foundation** (scope §3): an `artifacts`
  table + `artifact_type`/`artifact_status` enums with `audio_overview` as
  the first type and a replayable `config` jsonb
  (language/voice/focusPrompt/sourceIds), an owner-scoped artifact
  repository, a `TtsProvider` interface (D-8) with an Azure adapter that is
  one key-authed SSML POST via plain fetch, SEC-3-delimited script
  generation with a 24k-char source budget, and an async pipeline
  mirroring A3's stage 1 (pending → `after()` → processing → script LLM →
  TTS → service-role upload → ready; ≤1 concurrent generation, ≤20
  artifacts per notebook). Studio panel: config dialog, 2.5 s polling,
  rename/delete/regenerate/download, playback via 600 s signed URLs.
  E2E with real Azure: a 3:59 German episode in 16.8 s, a 2:25 English one
  in 9.3 s. 88 tests.
- **2026-08-18 — Citation → passage navigation and notes, session A5**
  (PR [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29)). CF-07
  interactions 1–4 and CF-10 MVP: every chip click resolves **server-side**
  (`findChunkLocation`, owner-scoped) and the viewer opens with the cited
  passage `<mark>`-highlighted and scrolled into view — the A3 offset
  invariant carried through 1:1. A `NotebookBridge` React context wires
  chips, viewer, and notes across the server-rendered Studio boundary.
  Dangling citations (deleted source, cleared chat) degrade to inert
  chips. "Save to note" persists an assistant answer as a note with its
  citations still navigable, idempotently; manual notes get a list, a
  view/edit dialog, and delete-with-confirmation. 107 tests; the E2E
  SQL-verified highlight ≡ chunk ≡ offsets through unicode content.
- **2026-08-18 — DB-backed tests on real Postgres, session A7**
  (PR [#33](https://github.com/DonHeidi/notebooklm-clone/pull/33),
  feasibility D-9). PGlite and its two dev-dependencies left the
  workspace: `create-test-database.ts` now provisions one throwaway
  database per test file (`marginalia_test_<pid>_<n>`, swept on the next
  run) on a **real Postgres with real pgvector** — locally the
  `supabase start` stack's Postgres on `:54322` by default, in CI a
  `pgvector/pgvector:pg17` service container, `TEST_DATABASE_URL`
  overrides. Fidelity improved: the hand-written `enable_pgvector`
  migration is applied verbatim (PGlite had installed the extension into
  `public`). 143/143 tests green on both backends with **zero test files
  edited**; the story of the CI workarounds this removed is in
  `product/history/infrastructure.md`.
- **2026-08-18 — Demo polish, session A6**
  (PR [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49)).
  Designed empty states for every screen (library, sources, chat with
  example-question chips, studio, notes, note dialog, plus the A5-deferred
  viewer state for citations landing on a still-processing source);
  app-level error surfaces (`error.tsx`, `global-error.tsx`,
  `not-found.tsx`, `loading.tsx` skeletons) and visible row-level failure
  text; per-user quotas (SF-11 / NF-15 minimum): 20 notebooks per user,
  50 chat messages per notebook per day (asserted **before** retrieval, so
  a capped notebook spends no tokens; surfaced as an HTTP 429 whose body
  text lands verbatim in the chat banner), 10 audio overviews per user per
  day; and `bun run seed:demo`. 154 tests.

### Decisions and why

- **Retrieval is a Drizzle SQL template, not a database function**
  (session A4, PR [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24)).
  The test factory applies only the migration timeline, so a SQL function
  would be invisible to the DB-backed tests; as a template the *exact
  production query* runs in tests, and the logic stays in the repository
  layer (DDD trace intact).
- **Citation ordinals are the marker numbers as rendered** (session A4).
  The model's `[n]` markers are deduplicated but deliberately **not**
  renumbered to consecutive — a consecutive rewrite would mislabel every
  chip after the streamed text already showed the original numbers.
  Invented markers (a `[7]` with 3 chunks) cite nothing and are dropped.
- **Retrieval runs before the stream opens** (session A4), so provider
  failures surface as a plain 502 with readable text instead of a broken
  stream.
- **No Azure SDK** (session D2, PR [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27)).
  The adapter is one plain-fetch SSML POST to the realtime endpoint; the
  SDK would be a heavy dependency for a single call. CBR mp3 output means
  duration derives from byte length.
- **Deterministic source truncation for the audio script** (session D2).
  With no query there is no relevance signal to justify chunk sampling, so
  oversized sources contribute start/middle/end slices of a per-source
  budget — reproducible input for regeneration.
- **Voices were auditioned, not assumed** (session D2). The owner picked
  `de-DE-SeraphinaMultilingualNeural` and `en-US-AndrewNeural` from five
  real F0 generations and accepted Azure standard-neural quality — no
  ElevenLabs escalation; DragonHD stays the upgrade path. The Azure region
  became `swedencentral` after Azure refused new customers in
  `westeurope` — the deviation from D-8's pin preserves every property the
  region was chosen for (EU processing, standard + HD German voices);
  recorded in `product/feasibility.md` D-8.
- **Citation offsets never come from the client** (session A5, PR
  [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29)). Chips
  carry only `data-chunk-id`; resolution is a fresh owner-scoped server
  query on every click, and every degraded case (unknown id, cascaded
  chunk, foreign owner) uniformly yields `null` → an inert chip, never an
  error.
- **Notes render every unresolved `[n]` marker as an inert chip**
  (session A5). Clear-chat sets `source_message_id` to null, leaving no
  way to distinguish orphaned citations from hand-typed markers — so both
  render as "source removed". A hand-typed `[7]` in a manual note becomes
  an inert chip; documented cosmetic trade-off.
- **Quotas without schema changes** (session A6, PR
  [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49)). Constants
  live in the owning services, enforcement is repository count queries,
  and the day window is the current UTC calendar day. The accepted
  limitation: audio **re**generations are not counted against the daily
  cap (that would need a generation-event log, i.e. a migration); they
  stay bounded by the 1-concurrent and 20-per-notebook guards.
- **The demo seed runs through the service layer, not `supabase/seed.sql`**
  (session A6). Embeddings cannot be generated from SQL, so
  `seed:demo` calls the real pipeline (create → `ingestSource` →
  grounding + generation → persist with citations → save-as-note) and its
  chunks, embeddings, and citations are real. It is idempotent (the
  notebook title is the marker; every step re-checks) — which makes it
  simultaneously the demo opening state **and the data-recovery
  procedure** for the backup-less Free-tier database. No toast library was
  added anywhere: the existing inline-banner/ActionResult idiom covered
  every surfacing case.

### Problems and how they were dealt with

- **Stop aborts the UI, not (reliably) the server** (session A4). Verified
  with instrumentation: behind the Next proxy a mid-stream client abort
  reaches the handler only at teardown, so generation completes (~one
  answer of token spend) and the full answer persists while the stopped
  client shows the truncated view until reload. Documented in the route;
  an explicit client→server abort beacon was judged out of MVP proportion.
- **`convertToModelMessages` is async in ai@7** — the type error only
  surfaces in `next build` (A4 gotcha, recorded for future sessions).
- **Main's CI went red at Lint after the #27–#29 merge wave**: two
  `react-hooks/set-state-in-effect` findings in D2's studio components
  gated every later PR (A7's #33 stopped at Lint with its Test step never
  executing). Fixed by the dedicated PR
  [#35](https://github.com/DonHeidi/notebooklm-clone/pull/35)
  (`fix/studio-lint`); A6, whose brief still carried the fix as a
  requirement, verified it was already done and annotated the A7 handover
  instead of re-fixing — correct the record, not just the code.
- **The seed script's resumability proved itself on a real failure**
  (session A6): the first hosted run hit a transient provider timeout at
  the chat step; the re-run skipped the already-ready sources and
  completed. Recorded in the A6 handover as the recovery-procedure
  evidence.
- **Automation quirks, not app bugs**, kept accumulating in the E2E notes:
  tooltip-covered first clicks on citation chips (A5), PNG screenshots
  timing out on Wayland — JPEG works (A5), shadcn Tabs unmounting inactive
  content (A6). Each is recorded in its handover for the next session's
  benefit.

### Where the webapp stands (2026-08-18, after A6)

The full Phase 1 loop is shipped and deployed at `https://app.mrgnl.eu`:
sources → retrieval → grounded chat → inline citations → passage
navigation → notes, plus the Audio Overview artifact, per-user quotas, and
a seeded demo notebook that doubles as the recovery procedure. 154 tests
pass. Open per the handovers: URL-addressable source viewer (A3/A5),
transcript persistence for audio (NF-11, D2), request-rate limiting
(SEC-7 — quotas bound daily volume, not burst rate), and counting audio
regenerations against the daily cap.
