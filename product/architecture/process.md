# Process view — runtime dynamics

> **Status:** Snapshot as of **2026-08-18** (session C5). Describes the
> merged runtime paths: grounded chat
> ([PR #24](https://github.com/DonHeidi/notebooklm-clone/pull/24) A4),
> ingestion ([PR #15](https://github.com/DonHeidi/notebooklm-clone/pull/15)
> A3), auth/session ([PR #10](https://github.com/DonHeidi/notebooklm-clone/pull/10)
> A2). D2 (audio overview) is adding a second async pipeline in flight —
> not covered here.
>
> **Correction (2026-08-18, session C8):** D2 merged the same day
> ([PR #27](https://github.com/DonHeidi/notebooklm-clone/pull/27)). Its
> pipeline deliberately mirrors the ingestion sequence below — pending →
> `after()` → processing → script LLM → TTS → service-role upload → ready,
> failures → failed with a user-safe message, the same 2.5 s polling —
> with guards of ≤1 concurrent generation and ≤20 artifacts per notebook;
> record in `product/history/webapp.md`. A6
> ([PR #49](https://github.com/DonHeidi/notebooklm-clone/pull/49)) also
> added one step to the grounded-chat request: a per-notebook daily quota
> is asserted **before** retrieval, so a capped notebook answers HTTP 429
> without any token spend.

## The grounded-chat request

The product's defining loop (CF-05/06/07), end to end
(`apps/webapp/src/app/notebooks/[id]/chat/route.ts`):

![UML sequence diagram of the grounded-chat request: browser POSTs to the chat route through proxy.ts (JWT verify/refresh); the route validates auth, ownership, and input; prepareGrounding either skips retrieval (zero sources) or embeds the question and runs hybridSearchChunks in one scoped SQL statement; the user message persists; streamText streams token deltas and data-citation parts to the browser over SSE; on finish the assistant message and citations persist transactionally.](assets/process-grounded-chat.svg)

*Diagram source: `product/architecture/diagrams/process-grounded-chat.puml`.*

What gets persisted is **what the user actually saw** — full or
stopped-early — so a reload matches the transcript.

*The model's-eye version of this sequence — which models are called at
each step, with the retrieval tuning values and the no-spend paths — is in
the [generative view](../architecture/generative.md) (added 2026-08-18, session C9).*

**Documented stop/abort limitation** (A4 gotcha, verified with
instrumentation; comment in the route): behind the Next proxy, a mid-stream
client disconnect does **not** fire `request.signal` promptly. The UI-level
stop always works, but server-side generation then runs to completion
(~one answer of token spend) and the *full* answer persists, while the
stopped client shows the truncated view until reload. An explicit
client→server abort beacon was judged out of MVP proportion
(`handovers/2026-08-18-session-a4-grounded-chat.md`).

Conversation state is deliberately minimal (CF-08 MVP): one conversation
per notebook, created on first message; clear-chat deletes it and the next
message starts fresh (`chat-service.ts`). History sent to the model is the
client-supplied message list, windowed server-side — server-side
reconstruction was considered and deferred (A4 handover, open questions).

## The ingestion pipeline

Feasibility **D-2 stage 1**: parse → chunk → embed runs **in-process** in
the Next container, detached from the request via Next's `after()`. Job
state is the `sources.status` column from day one — no queue, no worker
(yet; stage 2 moves the same code into a Scaleway Serverless Job without
touching schema or UI).

![UML sequence diagram of the ingestion pipeline: the browser uploads the file directly to Supabase Storage, then calls the server action, which creates a pending source row and returns immediately while after() detaches ingestSource; the pipeline sets status processing, downloads via the service-role client, parses, applies the size guards, chunks with exact offsets, embeds in batches, writes content and chunks atomically, and sets status ready — any failure sets status failed with a user-readable message; the browser polls the source list every 2.5 seconds only while a source is pending or processing.](assets/process-ingestion.svg)

*Diagram source: `product/architecture/diagrams/process-ingestion.puml`. The
2.5 s polling (over Realtime) is an A3 decision — fewer moving parts at
in-process durations; revisit at stage 2.*

## Session refresh (proxy)

`apps/webapp/src/proxy.ts` (Next 16's renamed middleware) runs on every
non-static request and does exactly two things:

1. **Token refresh:** `supabase.auth.getClaims()` cryptographically
   verifies the JWT and refreshes it when close to expiry; rotated cookies
   are written onto both the current request and the response.
2. **Optimistic redirects** via the pure `redirectTarget()`
   (`src/lib/auth/route-access.ts`): unauthenticated → `/login`,
   authenticated on auth screens → `/`.

The proxy is **never** the authority — every page, action, and route
handler re-validates via `requireUser()` / `getAuthenticatedUser()`
(`src/server/auth.ts`), so a matcher change cannot open a hole.

## Concurrency realities

- **In-process `after()`** ties ingestion to the container's lifecycle: it
  shares CPU/memory with request handling, and a crash mid-parse affects
  that one source (status stays `processing`/flips `failed` — SEC-2 records
  the parser-bomb exposure and names D-2 stage 2 as the structural fix).
- **Scale-to-zero:** the container runs `min_scale = 0`, `max_scale = 2`
  (`infrastructure/main.tf`); cold start measured at 3.89 s TTFB (spike
  S-1, `product/feasibility.md` risk register). Two instances can run —
  nothing in the current paths assumes a single process (job state is in
  Postgres, sessions in cookies), but there is no cross-instance
  coordination either: the same source *could* be re-ingested concurrently
  in principle; `replaceChunks` keeps the outcome consistent.
- **Guard limits, not rate limits:** the ≤N guards (20 MB, 200k words, 50
  sources) cap size, not request *rate* — an authenticated user can hammer
  embedding/chat token spend. Known and accepted as SEC-7; per-user rate
  limits are a before-public-exposure item.
- **One conversation per notebook** means concurrent chat requests to the
  same notebook interleave messages into one history — acceptable
  single-user behavior (CF-08 MVP).
