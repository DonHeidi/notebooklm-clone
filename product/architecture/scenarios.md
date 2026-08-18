# Scenarios — the +1 view

> **Status:** Snapshot as of **2026-08-18** (session C5). Four concrete use
> cases that exercise the other four views. Every trace below **actually
> ran**: the evidence is the end-to-end verification records in
> `handovers/2026-08-18-session-a3-ingestion.md` (A3,
> [PR #15](https://github.com/DonHeidi/notebooklm-clone/pull/15)) and
> `handovers/2026-08-18-session-a4-grounded-chat.md` (A4,
> [PR #24](https://github.com/DonHeidi/notebooklm-clone/pull/24)), run
> against a local Supabase stack and the real Scaleway Generative APIs.

## S1 — Add a PDF and watch it become chunks

*What A3 verified:* the 15-page arXiv paper 1706.03762 ("Attention Is All
You Need"), uploaded through the browser.

```
add-sources dialog ──► browser uploads the PDF DIRECTLY to Supabase
                       Storage under <userId>/<uuid>/<filename>  (D-5)
        │
        ▼
addFileSourceAction    requireUser() → 20 MB / 50-source guards →
                       source row (status: pending) → returns at once,
                       after() detaches ingestSource()
        │
        ▼
pipeline               processing → download (service-role) → unpdf
                       per-page parse → per-page chunking → batched
                       embeddings (2000 dims) → replaceChunks → ready
        │
        ▼
sources panel          2.5 s poll shows the spinner, then the Ready state
```

**Recorded outcome:** status `ready`, **35 chunks** with `page_number`
1–15; across the session's whole corpus, 90/90 chunks satisfied
`vector_dims(embedding) = 2000` and the offset invariant
`substring(content, char_start+1, char_end−char_start) = text`. The
failure path was exercised too: a 404 URL produced a Failed badge with
`error_message` "the page could not be fetched (HTTP 404)".

**Views exercised:** process (the ingestion pipeline and polling), logical
(sources→chunks, offset invariant), physical (direct-to-Storage upload,
embeddings API), development (the same pipeline runs in tests with injected
fakes).

## S2 — Ask a grounded question and follow a citation

*What A4 verified:* "What writing system developed in Mesopotamia…?"
against an ingested Wikipedia source.

```
select sources ──► POST /notebooks/[id]/chat
        │
        ▼
retrieval          embed(question) → hybridSearchChunks (HNSW + fts,
                   RRF-fused, restricted to the selected ready sources)
        │
        ▼
streamText         answer streams token-by-token (SSE); at the first
                   "[1]" a data-citation part streams alongside, and the
                   chip renders with title/location tooltip
        │
        ▼
persistence        assistant message + citations rows (ordinal, quote)
                   in one transaction
```

**Recorded outcome:** a streamed markdown answer citing `[1]`/`[7]`; SQL
showed citations rows whose ordinal and quote resolved to real Mesopotamia
chunks. **Selection restriction** held: with only "River valley notes"
selected (counter "1 source"), the answer cited *only* that source — SQL
confirmed the unselected source was never cited. After a reload, the full
history rehydrated with chips whose `data-chunk-id`s matched the citations
table exactly. (Chip → viewer scroll navigation is A5's in-flight work; the
chips already carry the chunk/source ids for it.)

**Views exercised:** logical (retrieval abstraction, citation invariants,
grounding contract), process (the whole request sequence), physical (SSE
through the platform, Generative APIs), development (RRF and marker
extraction are unit-tested modules).

## S3 — Sign up and log in

*What A2/A4 and the deploy smoke test verify.*

```
/signup form ──► signUp server action ──► supabase.auth.signUp
        │            (cookies written by @supabase/ssr)
        ▼
redirect to /  (library page; requireUser() re-validates)
        │
   … later requests …
        ▼
proxy.ts       getClaims() verifies + refreshes the JWT, rotates
               cookies; unauthenticated hits on protected paths
               redirect to /login (optimistic only — every action and
               route re-checks via requireUser())
```

**Recorded outcome:** A4's route-guard checks by direct fetch:
unauthenticated → 307 to login (the chat handler itself returns 401), a
foreign notebook → 404, invalid body → 400 — all readable text, no stacks.
The deploy workflow's smoke test encodes the same contract: anonymous
`GET /` on the production container must return **307**
(`.github/workflows/deploy-webapp.yml`).

**Views exercised:** process (proxy refresh flow), logical (ownerId as the
scoping key), physical (auth behavior is the deploy's health check),
development (route-access rules are a pure, tested module).

## S4 — Ask with zero sources selected

*What A4 verified:* all sources unchecked ("0 sources"), a question about
the Hanging Gardens.

```
POST /chat  {selectedSourceIds: []}
        ▼
prepareGrounding    retrieval SKIPPED entirely — no embedding call,
                    no search; zero-source system prompt instead
        ▼
streamed answer     general knowledge, WITH the mandated disclosure
                    ("this reply comes from general knowledge, not your
                    sources…"), citation markers forbidden
```

**Recorded outcome:** the answer carried the explicit disclosure, rendered
no chips, and created **no citation rows** — the grounded/ungrounded
boundary (NF-01's "clear behaviour when evidence cannot be found") is
visible to the user, not silent.

**Views exercised:** logical (the zero-source branch of the grounding
contract), process (the skipped-retrieval path), development
(`buildZeroSourceSystemPrompt` and the empty-selection path are
unit-tested).
