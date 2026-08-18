# Session A4 — Grounded chat with inline citations (2026-08-18)

## Goal

The product's defining loop (CF-05/06/07/08): select sources → ask →
retrieval restricted to the selection → streamed answer with inline
citations that persist. Plus deletion of the B1 spike route (SEC-4).

## What was done

- **Retrieval** (`source-repository.hybridSearchChunks`): hybrid search as
  one SQL statement — pgvector cosine over the HNSW index + full-text on
  the generated `fts` column (`websearch_to_tsquery('english', …)`), fused
  with reciprocal rank fusion (`1/(50+rank)` per modality, equal weights;
  candidate pool 30 per modality, final top-k 10). **Drizzle sql template,
  not a database function**: `create-test-database.ts` applies only the
  drizzle-journal migrations, so a SQL function would be invisible to the
  PGlite tests; as a template the *exact production query* runs in tests,
  and the logic stays in the repository layer (DDD trace intact). Scoping:
  `assertNotebookOwnership` first, then the query joins
  sources→notebooks with `owner_id`/`notebook_id`/`status='ready'` and
  intersects with the caller-selected ids — foreign, stale, or non-ready
  ids are silently ignored, never trusted.
- **Grounding + citations** (`src/server/ai/grounding.ts`, pure):
  chunks become numbered `<<<BEGIN SOURCE [n] — title (page/section)>>>`
  blocks; chunk text is sanitized (`<<<` → `‹‹‹`) so a source can never
  fake a block boundary. `[n]` markers are extracted (distinct, in order
  of first appearance, only 1..k) and mapped to chunk ids; **ordinal =
  the marker number as rendered** — deduping satisfies the unique
  (message, ordinal) constraint, and deliberately NOT renumbering to
  consecutive keeps chips aligned with the streamed text (a consecutive
  rewrite would mislabel every chip after the fact). Invented markers
  ([7] with 3 chunks) cite nothing and are dropped.
- **Chat route** (`POST /notebooks/[id]/chat`): verified-JWT auth (401),
  owner-scoped notebook check (404), input validation (400s with readable
  text). Retrieval runs before the stream opens so provider failures are
  a plain 502 with a readable message. `streamText` against Scaleway
  (model/base-URL/key from env, project-scoped URL per B1) streams into a
  `createUIMessageStream`: text deltas forwarded as they arrive, and each
  first occurrence of a valid `[n]` emits a `data-citation` part
  (ordinal, chunkId, sourceId, sourceTitle, pageNumber, section). On
  finish the assistant message + citations persist transactionally via
  `appendMessage`. The user message persists before streaming.
- **Conversation state (CF-08 MVP)**: one conversation per notebook,
  created on first message; history (with citation context joined in
  `listMessages`) loads on workspace open and rehydrates into the same
  UI-message shape the stream produces, so chips render identically
  live and after reload. Context window: last 12 messages (constant
  `CHAT_HISTORY_WINDOW`). Clear-chat deletes the conversation
  (owner-scoped; messages/citations cascade). Regenerate: skipped.
- **Zero-source mode** (ui-research §4): no selection → retrieval is
  skipped entirely and the system prompt mandates the general-knowledge
  disclosure + add-sources redirect, forbids citation markers. Counter
  shows "0 sources".
- **UI**: `NotebookWorkspace` (client) owns the selection state; Sources
  panel rows gained checkboxes (ready sources only; default all-ready
  selected; newly-ready sources auto-select once; deliberate unchecks are
  never overridden by the poll). Chat panel: streamed rendering via a
  deliberately tiny markdown-ish renderer (paragraphs, bold, lists —
  exactly what the prompt requests), inline citation chips with
  title/location tooltips and `data-chunk-id` on the chip for A5's
  chip→viewer navigation, live "N sources" counter, stop button while
  streaming, clear-chat with confirmation, readable error banner. The
  Studio placeholder stays server-rendered in `page.tsx` and is passed
  through as children — D2's area untouched.
- **SEC-4 closed**: `src/app/api/spike-stream/**` deleted;
  `product/security.md` row moved to Closed. SEC-3 row updated from
  "None yet" to the implemented contract (see PR for the compliance
  statement).

## Verified locally

- `bun test`: **80 pass, 0 fail** (52 pre-existing + 28 new: RRF fusion,
  selection/ownership/ready scoping incl. foreign-id injection, prompt
  delimiting incl. hostile-delimiter chunk, marker extraction edge cases
  (dedupe, invented, `[0]`, trailing partial marker), citation mapping,
  zero-source path, conversation lifecycle + clear + stranger authz,
  persist/load round-trip with citation context).
- `bun run build` (varlock, worktree root): passes; `next.config.ts` and
  `Dockerfile` untouched. Lint clean.
- **E2E against `supabase start` + real Scaleway** (dev server, browser):
  - Grounded exchange: "What writing system developed in Mesopotamia…?"
    → streamed markdown answer citing [1]/[7]; SQL shows citations rows
    with ordinal + quote resolving to real Mesopotamia chunks.
  - Selection restriction: only "River valley notes" selected (counter
    "1 source"), drainage question → answer cites **only** that source;
    SQL confirms the unselected Mesopotamia source is not cited.
  - Zero-source: all unchecked ("0 sources") → Hanging Gardens answered
    from general knowledge **with the explicit disclosure**, no chips,
    no citation rows.
  - Reload: full history rehydrates with chips (titles correct); chip
    `data-chunk-id`s match the citations table exactly; tooltip shows
    source title.
  - Clear chat: confirm dialog → conversations/messages/citations all 0
    in SQL, empty state shown.
  - Route guards by direct fetch: unauthenticated 307→login (handler
    itself 401s), foreign notebook 404, empty/invalid body 400 — all
    readable text, no stacks. Browser console clean (a pre-existing
    Base UI `nativeButton` error on the back-button was fixed in
    passing).

## Gotchas / known behavior

1. **Stop aborts the UI, not (reliably) the server.** Verified with
   instrumentation: behind the Next proxy, a mid-stream client abort
   fires neither `request.signal` nor response-stream cancellation in
   the handler; the signal arrives only at teardown. `streamText` gets
   `abortSignal: request.signal`, so server-side abort works wherever
   the platform delivers it — where it doesn't, generation completes
   (~one answer of token spend) and the **full** answer persists, while
   the stopped client keeps the truncated view until reload. Documented
   in the route; an explicit client→server abort beacon (per-request
   AbortController registry) was judged out of MVP proportion.
2. `convertToModelMessages` is **async** in ai@7 (returns a Promise) —
   easy to miss, the type error only surfaces in `next build`.
3. The model (mistral-small-3.2) occasionally emits `###` headings
   despite the no-headings instruction; the renderer shows the `###`
   literally. Cosmetic; tighten the prompt or strip in the renderer if
   it bothers demos.
4. Citation relevance is model-limited: markers are structurally correct
   (always resolve to a retrieved chunk of a selected source), but the
   model sometimes picks a weakly-related chunk number. NF-01 quality
   work, not a pipeline bug.

## Hot files touched

- `bun.lock` + `apps/webapp/package.json`: `@ai-sdk/react` (via
  `bun add`); shadcn added `checkbox` + `tooltip` components. Expect the
  foretold bun.lock collision with D2 — foreman resolves.
- `.env.schema`: **untouched** (all needed vars existed since B1/A3).
- Root `package.json`, `AGENTS.md`: untouched.

## Open questions / next sessions

- **A5**: chips carry `data-chunk-id`/`data-source-id`; citations keep
  `charStart`/`charEnd` via their chunk — wire chip → viewer scroll.
  The viewer is still dialog-state-only (A3's note stands).
- Retrieval quality: tsvector config is `english` (A1 decision) — fine
  for the demo corpus; revisit with multilingual sources. RRF constants
  (50 / pool 30 / k 10) are in `source-repository.ts`, trivially tunable.
- SEC-7 (no rate limiting) now applies to chat token spend — flagged for
  B3/demo hardening.
- History sent to the model is the client-supplied UIMessage list
  (windowed server-side); server-side reconstruction from the DB would
  be stricter but adds a read per message — revisit if history
  tampering ever matters (answers are already constrained to retrieved
  chunks).
