# Session A3 — Source ingestion (2026-08-18)

## Goal

Users add sources to a notebook and they become retrievable chunks: upload
(PDF, TXT/Markdown) + pasted text + URL, parsed → chunked → embedded →
stored, with live status in the Sources panel and a basic source viewer.
Feasibility D-2 stage 1: ingestion runs in-process via Next's `after()`,
job state lives in `sources.status` from day one.

## What was done

- **Parsers** (`src/server/ingestion/parsers.ts`; deps added via `bun add`:
  `unpdf`, `@mozilla/readability`, `linkedom`): PDF → per-page text
  (`extractText(pdf)` without `mergePages`, API verified from the installed
  README), TXT/Markdown stored as-is (line endings normalized so offsets are
  OS-stable), URL → readable article text + page title via Readability on a
  linkedom DOM. Parsers are pure (bytes/string in) — fetching and storage
  live in the pipeline, so tests use committed fixtures, no network.
  **DOCX left out**: mammoth was not "trivial" — it needs a new dependency,
  binary fixtures, and its own failure modes; nothing else in the pipeline
  blocks adding it later as one more parser branch.
- **Chunking** (`src/server/ingestion/chunking.ts`): `@langchain/`
  `textsplitters` RecursiveCharacterTextSplitter with `gpt-tokenizer` as the
  length function; ~400-token chunks, 40-token overlap (overlap materializes
  only when splits are smaller than the overlap budget — langchain
  behavior). Every chunk carries `charStart`/`charEnd` into
  `sources.content` with the invariant `content.slice(start, end) === text`
  (A5's citation raw material). PDFs are chunked per page so every chunk has
  an unambiguous `pageNumber`; `chunkPages` re-joins pages into the exact
  string the offsets index into.
- **Embeddings** (`src/server/ai/embeddings.ts`): `Embedder` interface;
  Scaleway adapter via `@ai-sdk/openai-compatible` `textEmbeddingModel` +
  `embedMany` (auto-batches, order-preserving), `providerOptions.scaleway.
  dimensions: 2000` (Matryoshka truncation per A1's decision), returned
  vector length asserted against `EMBEDDING_DIMENSIONS` before insert.
  New env declaration `SCW_GENERATIVE_APIS_EMBEDDING_MODEL` (default in
  code: `qwen3-embedding-8b`, D-4).
- **Pipeline** (`src/server/services/ingestion-service.ts`): pending →
  processing → ready/failed on `sources.status`; chunk writes atomic via
  `replaceChunks` (re-ingesting replaces); failures set a truncated (300
  chars), user-presentable `errorMessage` — never a stack. All I/O
  boundaries (db, embedder, file loader, HTML fetcher) injectable for tests.
  URL fetch has a 15 s timeout, content-type check, 10 MB cap, and a
  best-effort private-address block (see open questions).
- **Guards** (`src/server/ingestion/limits.ts`, NF-15): 20 MB/file (also
  enforced by the bucket's `file_size_limit`), 200k words/source, 50
  sources/notebook. Checked at creation (`source-service.ts`) and re-checked
  post-parse for file/url sources.
- **Storage** (feasibility D-5): new migration
  `supabase/migrations/20260818090000_sources_bucket.sql` — private
  `sources` bucket (20 MB limit) + owner-only insert/select/delete policies
  on `storage.objects`, keyed on the first path segment =
  `auth.uid()`. Uploads go browser → Storage under
  `<userId>/<uuid>/<filename>`; the server receives only the path and
  validates the prefix. Standard (non-TUS) upload — fine at our 20 MB cap.
  Ingestion downloads via the service-role key (`src/server/storage.ts`)
  because `after()` runs outside the request's cookie context; app-layer
  ownership checks gate every call.
- **UI**: Sources panel (list with type icon, processing spinner, Failed
  badge with error tooltip; delete with confirmation), add-sources dialog
  (Upload files / Website URL / Copied text — ui-research §3; drag-and-drop
  bonus not done), read-only source viewer (content, type, status/error,
  delete). New shadcn components: dialog, textarea, badge, tabs.
- **Realtime vs polling: polling.** 2.5 s interval that only runs while a
  source is pending/processing (in-process ingestion completes in seconds,
  so the window is short); the viewer polls the same way while open on a
  processing source. Rationale: Realtime `postgres_changes` needs the
  `supabase_realtime` publication plus RLS evaluation of our join-based
  sources policy inside walrus — more moving parts with a silent-failure
  mode, for no UX gain at these durations. Stage 2 (Serverless Jobs, longer
  jobs) is the right moment to revisit; nothing in the schema changes.

## Verified locally

- `bun test`: **52 pass, 0 fail** (24 pre-existing + 28 new: chunk-offset
  slice-equality incl. overlap and repeated-paragraph cases, parser
  fixtures, pipeline state transitions on PGlite with a fake embedder,
  guard limits, owner-scoping no-op).
- `bun run build` (via varlock): passes; `next.config.ts` untouched.
- **End-to-end against `mise exec -- supabase start` + real Scaleway
  embeddings** (key from `.env.local`; the two local Supabase demo keys were
  appended to `.env.local` — B1's "varlock refuses to run" gotcha is now
  gone):
  - Pasted text → `ready`, 1 chunk. URL (Wikipedia "Mesopotamia") →
    `ready`, 54 chunks, 69,806 chars, title adopted from the page. Real
    5-page-per-`file`/15-page PDF (arXiv 1706.03762) uploaded through the
    browser → Storage object under the user prefix → `ready`, 35 chunks,
    `page_number` 1–15.
  - SQL: all 90 chunks `vector_dims(embedding) = 2000`, none null; 90/90
    chunks satisfy `substring(content, char_start+1, char_end-char_start)
    = text`.
  - Status transitions observed live in the panel (pending/processing are
    brief in-process; the URL source visibly flipped provisional-title →
    page-title → no spinner via the poll).
  - Failure path in the real UI: `https://example.com/does-not-exist` →
    Failed badge, `error_message` = "the page could not be fetched
    (HTTP 404)".
  - Delete (from viewer, with confirmation): source row, its 35 chunks, and
    the storage object all removed. Browser console clean.

## Hot files touched

- `bun.lock` + `apps/webapp/package.json`: new deps `unpdf`,
  `@mozilla/readability`, `linkedom`, `@langchain/textsplitters`,
  `gpt-tokenizer` (all via `bun add`). B2 may collide on `bun.lock` —
  expected, foreman resolves.
- `.env.schema`: one new declaration (`SCW_GENERATIVE_APIS_EMBEDDING_MODEL`,
  non-sensitive, optional).
- Root `package.json`, `AGENTS.md`: untouched.

## Open questions / next sessions

- **SSRF**: the URL fetcher blocks obvious loopback/private hostnames but
  does not resolve DNS to check the target IP — a hostname pointing at a
  private address gets through. Acceptable for the prototype; a proper
  egress guard belongs to the stage-2 worker.
- The word-count re-check for oversized text happens at creation for pasted
  text but only post-parse for file/url — an oversized PDF is downloaded and
  parsed before being rejected. Fine at a 20 MB cap.
- A4 builds retrieval on the chunks table (hybrid search deliberately absent
  per A1's YAGNI note); A5 gets `charStart`/`charEnd` (+ `pageNumber`) for
  citation navigation, and may want the viewer reachable via URL param —
  it's currently dialog-state only.
- Chrome-automation quirk (not an app bug): chrome-devtools `fill` doesn't
  fire React's onChange in this setup; e2e used manual `input` event
  dispatch. A2 hit snapshot-ok/screenshot-timeout on this Wayland box too.
