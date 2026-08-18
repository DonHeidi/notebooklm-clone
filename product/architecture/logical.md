# Logical view — the domain model as implemented

> **Status:** Snapshot as of **2026-08-18** (session C5). Describes
> `apps/webapp/src/server/db/schema.ts` and the repository layer as merged
> ([PR #6](https://github.com/DonHeidi/notebooklm-clone/pull/6) A1,
> [PR #15](https://github.com/DonHeidi/notebooklm-clone/pull/15) A3,
> [PR #24](https://github.com/DonHeidi/notebooklm-clone/pull/24) A4).
> Sessions A5 (notes UI, citation navigation) and D2 (audio artifacts) are
> in flight and will extend this model's *usage*, not its shape.
>
> **Correction (2026-08-18, session C8):** both merged the same day — and
> D2 ([PR #27](https://github.com/DonHeidi/notebooklm-clone/pull/27)) *did*
> extend the shape: the **artifacts** table plus
> `artifact_type`/`artifact_status` enums now exist (generic artifact
> foundation, scope §3; `audio_overview` the only type so far, a replayable
> `config` jsonb, owner-chain RLS, and a private `artifacts` storage
> bucket). A5 ([PR #29](https://github.com/DonHeidi/notebooklm-clone/pull/29))
> put the notes table and citation offsets to work without schema changes,
> and A6's quotas
> ([PR #49](https://github.com/DonHeidi/notebooklm-clone/pull/49)) are
> repository count queries — also no schema change. "Not yet in the schema"
> below now reads: permissions only. Details in
> `product/history/webapp.md`.

## The notebook aggregate

Everything hangs off the notebook, which belongs to exactly one owner. The
implemented model is the Phase 1 subset of the ideal in `product/scope.md`
§10:

![UML class diagram of the notebook aggregate: notebooks (owned by auth.users via owner_id, no FK) compose sources, conversations, and notes; sources compose chunks; conversations compose messages, which compose citations; citations reference chunks; notes optionally reference messages via source_message_id with on-delete set-null.](assets/logical-domain-model.svg)

*Diagram source: `product/architecture/diagrams/logical-domain-model.puml`.*

All child tables cascade on notebook deletion (CF-01 "delete notebook
removes associated data"). Deleting a source cascades through its chunks to
the citations pointing at them — a documented Phase 1 simplification: the
`[n]` marker in the stored message text simply stops resolving
(`schema.ts`, comment on `citations.chunkId`).

Not yet in the schema, relative to scope §10: **artifacts** (D2 is building
the first one, audio) and **permissions** (sharing is SF-05, post-MVP).
The **notes** table and its repository
(`apps/webapp/src/server/repositories/note-repository.ts`, full owner-scoped
CRUD) exist since A1, but no UI or server action uses them yet — that is
A5's work, running now.

### Invariants the schema enforces

- `chunks (source_id, chunk_index)` unique — a source's chunk sequence has
  no duplicates; ingestion replaces the whole set atomically
  (`source-repository.replaceChunks`).
- `citations (message_id, ordinal)` unique — the stored ordinal **is** the
  marker number rendered in the message text (`[1]`, `[2]`, …), deliberately
  not renumbered to be consecutive, so citation chips always match the
  streamed text (`apps/webapp/src/server/ai/grounding.ts`,
  `buildCitationInputs`).
- `chunks.fts` is a generated column (`to_tsvector('english', text)`) — the
  full-text index can never drift from the chunk text.
- Chunk offsets satisfy `content.slice(charStart, charEnd) === text` against
  `sources.content` — the raw material for citation navigation (A5).
  Enforced in `apps/webapp/src/server/ingestion/chunking.ts`, verified for
  90/90 chunks in A3's end-to-end run (`handovers/2026-08-18-session-a3-ingestion.md`).

### Embeddings: `vector(2000)`

`chunks.embedding` is `vector(2000)` under an HNSW cosine index. The
embedding model (`qwen3-embedding-8b`, feasibility D-4) natively outputs
4096 dimensions — above pgvector's 2000-dim HNSW ceiling — and is
Matryoshka-trained, so embeddings are requested at 2000 dimensions and the
returned length is asserted before insert (`EMBEDDING_DIMENSIONS` in
`schema.ts`; `apps/webapp/src/server/ai/embeddings.ts`). The story behind
this choice is in `product/history/webapp.md`.

## Ownership and isolation

Notebook isolation (CF-01) is owner-scoping, enforced twice:

1. **App layer — the primary guard.** The authenticated user id (`auth.uid()`
   from the *verified* JWT — `getClaims()`, never `getSession()`;
   `apps/webapp/src/server/auth.ts`) is the `ownerId` that **every**
   repository method takes and applies. Root queries filter
   `notebooks.owner_id`; child-table writes use a correlated
   `exists(… notebooks.owner_id = ownerId)` subquery (`ownedByCaller` in
   each repository) so even single-statement UPDATE/DELETEs stay scoped.
   Cross-user access surfaces as not-found, tested in each
   `*-repository.test.ts`.
2. **RLS — defense-in-depth, not the primary guard (SEC-5,
   `product/security.md`).** The app connects through the pooler as
   `postgres`, which RLS does not bind, and the storage client uses the
   service-role key. The policies
   (`supabase/migrations/20260817170000_rls_policies.sql`: all 7 tables,
   keyed on `notebooks.owner_id = auth.uid()` through each FK chain, plus
   storage objects keyed on the path's first segment) protect any *future*
   PostgREST/Realtime path with user JWTs. If such a path is ever added,
   RLS becomes load-bearing and gets re-audited — that trigger is recorded
   in SEC-5.

## The retrieval abstraction

Retrieval is one repository method,
`source-repository.hybridSearchChunks` — a single SQL statement combining:

- **Vector search:** pgvector cosine (`<=>`) over the HNSW index.
- **Full-text search:** `websearch_to_tsquery('english', …)` against the
  generated `fts` column (GIN index).
- **Fusion:** reciprocal rank fusion, `1/(50 + rank)` per modality, equally
  weighted (Supabase's documented pattern, feasibility F-3); candidate pool
  30 per modality, final top-k 10 (constants in `source-repository.ts`).

Scoping is part of the query, not an afterthought: the `allowed_sources`
CTE joins sources→notebooks on `owner_id` **and** `notebook_id` **and**
`status = 'ready'`, then intersects with the caller-selected source ids —
foreign, stale, or non-ready ids are silently ignored, never trusted
(CF-05; tested including foreign-id injection in
`hybrid-search.test.ts`).

It is implemented as a Drizzle `sql` template rather than a database
function, so the exact production query runs in the tests and the logic
stays visible in the repository layer — the DDD trace stays intact (A4
decision, `handovers/2026-08-18-session-a4-grounded-chat.md`).

## The grounding contract (SEC-3)

Source content is untrusted input (NF-17). The contract, implemented in
`apps/webapp/src/server/ai/grounding.ts` and recorded as SEC-3 in
`product/security.md`:

- Retrieved chunks enter the prompt **only** inside delimited
  `<<<BEGIN SOURCE [n]>>> … <<<END SOURCE [n]>>>` blocks; chunk text is
  sanitized (`<<<` → `‹‹‹`) so a source can never fake a block boundary.
- The system prompt declares the quoted material to be **data, never
  instructions**; the chat model has **no tools** and no authority beyond
  emitting answer text.
- `[n]` markers in the answer are mapped server-side against the retrieved
  set only — invented markers (out of range 1..k) cite nothing and are
  dropped (`extractCitedOrdinals`).
- With zero sources selected, retrieval is skipped entirely and a separate
  system prompt mandates the general-knowledge disclosure and forbids
  citation markers (`buildZeroSourceSystemPrompt`).

Residual risk (a hostile source biasing answers *about itself*) is accepted
while sources are user-chosen; the re-review triggers (chat gains tools, or
shared notebooks) are recorded in SEC-3.
