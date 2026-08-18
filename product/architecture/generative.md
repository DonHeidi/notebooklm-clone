# Generative view — every model call, and the RAG pipeline

> **Status:** Snapshot as of **2026-08-18** (session C9). A deliberate
> extension of the 4+1 set: none of the four canonical views answers "which
> AI model is invoked where, when, triggered by what, for what purpose, and
> bounded by which guard" in one place. This page does, for every AI call in
> the product — derived from the merged code
> ([PR #24](https://github.com/DonHeidi/notebooklm-clone/pull/24) A4 chat,
> [PR #15](https://github.com/DonHeidi/notebooklm-clone/pull/15) A3
> ingestion, [PR #27](https://github.com/DonHeidi/notebooklm-clone/pull/27)
> D2 audio, [PR #49](https://github.com/DonHeidi/notebooklm-clone/pull/49)
> A6 quotas). Model ids below were read from the source files named next to
> them on this date; Scaleway rotates models on EOL cycles (D-4), so on
> drift, the named file wins.

Two external AI providers exist, both behind thin abstractions
(feasibility **D-4** for text, **D-8** for speech): **Scaleway Generative
APIs** (OpenAI-compatible; chat completions and embeddings, one shared API
key) and **Azure AI Speech** (text-to-speech; Scaleway has no TTS product —
verified in D-8). No other code path calls a model: notes, citation
navigation, playback, renames, and history rehydration are database and
storage work only.

## Model inventory

All paths are under `apps/webapp/` unless noted. Env variables are named
only — values live in `.env.local` via varlock, never in the repo.

| # | Purpose | Model (default in code) | Call sites | Trigger | Provider | Env override | Guard / quota bounding spend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Grounded / zero-source chat answer (streamed) | `mistral-small-3.2-24b-instruct-2506` (`src/server/ai/chat-model.ts`, `DEFAULT_CHAT_MODEL`) | `src/app/notebooks/[id]/chat/route.ts` (`streamText`) | User action: sending a chat message | Scaleway Generative APIs | `SCW_GENERATIVE_APIS_MODEL` (endpoint: `…_BASE_URL`, `…_KEY`) | 50 user messages / notebook / day, asserted **before** retrieval (`chat-service.ts`, `MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY`); context window 12 messages (`CHAT_HISTORY_WINDOW`); prompt capped at top-10 chunks (`RETRIEVAL_LIMIT`) |
| 2 | Audio-overview script (one completion) | same default, separate factory (`src/server/services/audio-overview-service.ts`, `createScalewayScriptLlm`, `generateText`) | `audio-overview-service.ts` → `generateAudioOverview` | Background job: `after()` from `src/app/notebooks/[id]/studio/actions.ts` (create / regenerate) | Scaleway Generative APIs | `SCW_GENERATIVE_APIS_MODEL` (same vars as row 1) | ≤ 1 concurrent generation and ≤ 20 artifacts per notebook, ≤ 10 overviews / user / day — all checked before the row is created; source material capped at 24 000 chars (`src/server/audio/script.ts`, `TOTAL_SOURCE_CHAR_BUDGET`) |
| 3 | Chunk embeddings at ingestion | `qwen3-embedding-8b`, requested at **2000 dims** (`src/server/ai/embeddings.ts`, `DEFAULT_EMBEDDING_MODEL`; `EMBEDDING_DIMENSIONS` in `src/server/db/schema.ts`) | `src/server/services/ingestion-service.ts` (`embedder.embed`, batched via `embedMany`) | Background job: `after()` from `src/app/notebooks/[id]/sources/actions.ts` on source create | Scaleway Generative APIs | `SCW_GENERATIVE_APIS_EMBEDDING_MODEL` (same endpoint vars) | 20 MB / file, 200 000 words / source (checked before chunking), 50 sources / notebook (`src/server/ingestion/limits.ts`) |
| 4 | Query embedding for retrieval | same embedder as row 3 | `src/server/services/chat-service.ts` (`prepareGrounding`) | User action: chat message with ≥ 1 source selected | Scaleway Generative APIs | `SCW_GENERATIVE_APIS_EMBEDDING_MODEL` | Gated by row 1's daily quota (asserted first); skipped entirely at zero selection |
| 5 | Speech synthesis | Azure neural voices — `de-DE-SeraphinaMultilingualNeural`, `de-DE-FlorianMultilingualNeural`, `de-DE-KatjaNeural`, `en-US-AndrewNeural`, `en-US-AvaNeural` (`src/server/audio/azure-tts.ts`, `AZURE_VOICES`; defaults per language in `voices.ts`) | `azure-tts.ts` (`synthesize`), selected by `src/server/audio/tts.ts` (`createTtsProvider`) | Background job: same audio pipeline as row 2, after the script completion | Azure AI Speech (realtime endpoint, region-scoped) | `TTS_PROVIDER`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Same caps as row 2; script constrained to 600–800 words by the prompt; billed per SSML character (`charactersBilled`) |
| 6 | Demo seeding (operator tool) | reuses rows 1 + 3 (imports the same factories) | `scripts/seed-demo.ts` (`generateText` + real `ingestSource`) | Operator action: `bun run seed:demo` (A6) | Scaleway Generative APIs | as rows 1/3 | Fixed workload: 3 curated sources, one question, ≤ 3 completion attempts; idempotent re-runs are no-ops |

Rows 1 and 2 are the **same model id** reached through two deliberately
separate factories — the chat route streams (`streamText`), the audio
pipeline wants one blocking completion (`generateText` behind the
injectable `ScriptLlm` interface), and each can be re-pointed
independently if that ever stops being true.

![UML component diagram of the generative surface: the chat route, chat service, ingestion service, and audio pipeline inside the webapp call out to Scaleway Generative APIs (chat completions and 2000-dim embeddings, one shared key) and Azure AI Speech (SSML POST, key + region); embeddings are written to and searched in pgvector, audio lands in Supabase Storage.](assets/generative-topology.svg)

*Diagram source: `product/architecture/diagrams/generative-topology.puml`.*

## The RAG pipeline, end to end

Retrieval-augmented generation here is two halves that meet at the
`chunks` table: an **ingestion-time write path** that builds the index and
a **query-time read path** that searches it. The logical view describes
the schema and the retrieval abstraction; the process view has the
sequence diagrams. This section is the model's-eye trace with the actual
tuning values.

### Ingestion (write path)

`src/server/services/ingestion-service.ts` (`ingestSource`), detached from
the request via Next's `after()` (D-2 stage 1), job state on
`sources.status`:

1. **Parse** (`src/server/ingestion/parsers.ts` — pure, no model): PDF →
   per-page text via unpdf, so chunks carry page numbers; plain
   text/markdown decoded as UTF-8; URLs fetched (SSRF-guarded, 15 s
   timeout, 10 MB cap) and reduced to article text via Readability.
2. **Guard before spend**: the 200 000-word cap is checked on the parsed
   text *before* chunking or embedding — an oversized source fails without
   a single token spent (`limits.ts`).
3. **Chunk** (`src/server/ingestion/chunking.ts`): recursive
   character splitting measured in tokens — `CHUNK_SIZE_TOKENS = 400`,
   `CHUNK_OVERLAP_TOKENS = 40`, counted with gpt-tokenizer as an
   approximation of the embedding model's tokenizer (exactness doesn't
   matter; staying far under the context window does). Every chunk keeps
   exact character offsets into `sources.content` — the invariant citation
   navigation relies on (logical view, "Invariants").
4. **Embed** (`src/server/ai/embeddings.ts`): all chunk texts in one
   `embedMany` call (the SDK batches as the model allows, order
   preserved), requesting `dimensions: 2000` — qwen3-embedding-8b natively
   outputs 4096, above pgvector's HNSW ceiling, and is Matryoshka-trained;
   the returned length is asserted before anything is stored.
5. **Store**: content + chunks written atomically
   (`source-repository.replaceChunks`); each chunk row carries its
   `vector(2000)` embedding under an HNSW cosine index and a *generated*
   `fts` tsvector column under a GIN index — the full-text index can never
   drift from the chunk text.

### Query time (read path)

The chat route (`src/app/notebooks/[id]/chat/route.ts`), in order:

1. **Auth, ownership, validation** — 401/404/400 before anything else.
2. **Quota gate** — the 50-messages/notebook/day assertion runs **before
   retrieval**, so a capped notebook answers HTTP 429 having spent nothing
   (A6; `assertChatMessageQuota`).
3. **Source selection** — the client's selected source ids are
   UUID-filtered in the route, then intersected server-side with the
   notebook's own *ready* sources inside the search query itself — foreign,
   stale, or non-ready ids are silently ignored, never trusted.
4. **Query embedding** — the question through row 4 of the inventory.
5. **Hybrid search + RRF fusion**
   (`source-repository.hybridSearchChunks`, one SQL statement): pgvector
   cosine over the HNSW index and `websearch_to_tsquery('english', …)`
   full-text, each contributing `1/(RRF_K + rank)` with `RRF_K = 50`,
   equally weighted; `CANDIDATE_POOL = 30` candidates per modality before
   fusion; final top-k `RETRIEVAL_LIMIT = 10`. These constants live in
   `source-repository.ts` / `chat-service.ts` and are **deliberately plain
   constants** — the A4 handover marks them as the tuning knobs for
   retrieval quality (NF-01), trivially changeable without schema work.
6. **Prompt assembly under SEC-3** (`src/server/ai/grounding.ts`):
   retrieved chunks enter the system prompt only inside numbered
   `<<<BEGIN SOURCE [n]>>> … <<<END SOURCE [n]>>>` blocks, chunk text
   sanitized (`<<<` → `‹‹‹`) so a source can never fake a boundary; the
   prompt pins delimited material as quoted data, never instructions, and
   the model has **no tools**. The last 12 messages of history ride along
   (`CHAT_HISTORY_WINDOW`).
7. **Streamed answer** — `streamText` deltas forwarded as they arrive;
   each first occurrence of a valid `[n]` marker emits a `data-citation`
   part mid-stream.
8. **Server-side citation mapping** — markers are validated against the
   retrieved set only (`extractCitedOrdinals`: distinct, in order of first
   appearance, only 1..k — invented markers cite nothing and are dropped),
   then persisted transactionally with the assistant message
   (`buildCitationInputs`). What persists is what the user actually saw.

## The audio-generation flow

CF-12 / SF-09, decisions D-8 (provider) and D-4 (the script LLM). The
pipeline (`audio-overview-service.ts`, `generateAudioOverview`) mirrors
ingestion — pending → `after()` → processing → … → ready/failed, status on
`artifacts.status`:

1. **Create** (user action, Studio config dialog → `studio/actions.ts`):
   validates voice, non-empty owner-scoped *ready* source selection, and
   all three caps (inventory row 2) — every rejection happens before a
   pending row exists, i.e. before any spend.
2. **Excerpt** (`src/server/audio/script.ts`, `excerptSources`): selected
   sources share a 24 000-char budget; an oversized source keeps
   deterministic start/middle/end slices — with no query there is no
   relevance signal, so sampling beats guessing.
3. **Script completion** (inventory row 2): system prompt pins the
   delimited source blocks as data (the same SEC-3 posture as chat — here
   with `<<<SOURCE n BEGIN/END>>>` markers); the user's `focusPrompt` is
   the **only** user text treated as an instruction. The model is asked
   for 600–800 words of plain spoken prose plus a `TITLE:` first line; a
   generated title never overwrites a user rename.
4. **Synthesis** (inventory row 5): one key-authenticated SSML POST to
   Azure's realtime endpoint returns the whole script's audio — the
   defining reason Azure won D-8 (every cheaper competitor needs chunking
   below its cap). Output is CBR mp3, 24 kHz / 96 kbps, so duration
   derives from byte length. Note the ordering consequence: the script
   LLM runs *before* TTS, so a misconfigured TTS provider costs one
   wasted script completion before failing.
5. **Store**: service-role upload to the private `artifacts` bucket at an
   owner-prefixed path (upsert — regeneration replaces in place);
   playback and download go through 600 s signed URLs, no model involved.

The provider seam is `TtsProvider`
(`src/server/audio/tts.ts`: `synthesize()` / `listVoices()`), selected by
`TTS_PROVIDER`. Only the `azure` adapter is implemented;
`elevenlabs` and `openai-compatible` are declared in `.env.schema` as the
D-8 escape hatches and throw until a session wires them. Voice keys are
provider-neutral (`voices.ts`); the Azure adapter maps them to Azure voice
names, so a provider swap does not invalidate stored artifact configs.

## When models are NOT called

The no-spend paths, as implemented:

- **Chat quota 429** — the daily cap is asserted before retrieval, so a
  capped notebook spends neither embedding nor completion tokens (A6;
  process view, "The grounded-chat request").
- **Zero-source mode** — with no sources selected, the embedding call and
  hybrid search are skipped entirely (`prepareGrounding` short-circuits).
  Precision matters here: the **chat model is still invoked** — with the
  zero-source system prompt mandating the general-knowledge disclosure and
  forbidding citation markers. What is saved is retrieval spend, not the
  completion.
- **Auth and validation failures** — 401 (no session), 404 (foreign or
  unknown notebook), 400 (empty/invalid message) all return before any
  model call; the audio dialog's rejections (not-ready source, caps hit,
  unknown voice) throw before a pending artifact exists.
- **Ingestion guard failures** — parse errors, the 20 MB and 200 000-word
  caps, and empty extractions all fail the source before the embedding
  call; a source deleted mid-flight makes `ingestSource` return without
  doing anything (same for a deleted artifact in the audio pipeline).
- **Everything else** — notes CRUD, citation → passage navigation
  (`findChunkLocation`), history load and rehydration, clear-chat,
  renames, deletes, playback/download signed URLs, and the source viewer
  are pure database/storage paths. The 2.5 s status polling loops hit only
  the app's own list endpoints.

One deliberate *negative* result belongs in this inventory: there is **no
reranker call**. D-4 notes Scaleway offers rerank, but retrieval quality
is currently RRF-only — a known NF-01 tuning surface, not an accident
(A4 handover, open questions).

## Provider and key topology, lifecycle notes

- **One Scaleway key serves all text AI** — chat completions and
  embeddings share `SCW_GENERATIVE_APIS_KEY` and
  `SCW_GENERATIVE_APIS_BASE_URL` (project-scoped URL, B1) through
  `@ai-sdk/openai-compatible` (D-4 / NF-16): any OpenAI-compatible
  endpoint — OpenAI, Mistral, a local Ollama — swaps in via these
  variables with no code change.
- **Azure is the one non-OpenAI-compatible surface** —
  `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`, used only inside the Azure
  adapter. The deployed region is `swedencentral` (the `.env.schema`
  default still reads `westeurope`; D-8's audition note records the
  capacity-forced move — all selection criteria held).
- **Embedding-model rotation is the expensive one.** The EOL comment in
  `embeddings.ts` is load-bearing: stored vectors are only searchable by
  queries embedded with the **same model in the same 2000-dim space**.
  When Scaleway retires `qwen3-embedding-8b`, changing
  `SCW_GENERATIVE_APIS_EMBEDDING_MODEL` silently breaks retrieval against
  every existing chunk — a rotation requires **re-embedding all stored
  chunks** (re-running ingestion), and a replacement model must support
  Matryoshka truncation to 2000 dims or the runtime assertion in
  `createScalewayEmbedder` refuses it. D-10 records the same caveat for a
  hypothetical AWS/Bedrock move.
- **Chat-model rotation is cheap by contrast** — no stored artifact
  depends on which model wrote past answers or scripts; flipping
  `SCW_GENERATIVE_APIS_MODEL` affects only future calls.
- **TTS rotation sits in between** — stored audio stays playable
  regardless, and neutral voice keys survive an adapter swap, but a new
  provider needs its adapter implemented behind `TTS_PROVIDER` first.
