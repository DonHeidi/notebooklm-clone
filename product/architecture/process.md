# Process view — runtime dynamics

> **Status:** Snapshot as of **2026-08-18** (session C5). Describes the
> merged runtime paths: grounded chat
> ([PR #24](https://github.com/DonHeidi/notebooklm-clone/pull/24) A4),
> ingestion ([PR #15](https://github.com/DonHeidi/notebooklm-clone/pull/15)
> A3), auth/session ([PR #10](https://github.com/DonHeidi/notebooklm-clone/pull/10)
> A2). D2 (audio overview) is adding a second async pipeline in flight —
> not covered here.

## The grounded-chat request

The product's defining loop (CF-05/06/07), end to end
(`apps/webapp/src/app/notebooks/[id]/chat/route.ts`):

```
browser ── POST /notebooks/[id]/chat  {messages, selectedSourceIds}
   │
   ▼
proxy.ts            refresh session (getClaims), optimistic redirect only
   ▼
route handler       verified JWT?          ──no──► 401
                    owner's notebook?      ──no──► 404
                    valid last user msg?   ──no──► 400
   ▼
prepareGrounding    BEFORE the stream opens, so provider failures
 (chat-service.ts)  are a readable 502, not a broken stream:
                      0 sources selected ──► zero-source prompt, skip retrieval
                      else: embed(question) ──► hybridSearchChunks (top 10)
                            ──► delimited system prompt (SEC-3)
   ▼
persist user message
   ▼
streamText          Scaleway Generative APIs (D-4), last 12 messages
   │                (CHAT_HISTORY_WINDOW) as context, no tools
   ▼
UIMessage stream    text-delta parts as tokens arrive (SSE)
   │                + one data-citation part at the FIRST occurrence
   │                  of each valid [n] marker in the accumulated text
   ▼
on finish           persist assistant message + citations
                    transactionally (appendMessage)
```

What gets persisted is **what the user actually saw** — full or
stopped-early — so a reload matches the transcript.

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

```
add-source dialog (file upload goes browser ──► Supabase Storage first, D-5;
   │               the action receives only the storage path)
   ▼
server action (sources/actions.ts)  requireUser() ──► create source row
   │                                (status: pending) ──► return immediately
   └─ after() ───► ingestSource()   (ingestion-service.ts, never throws)
                      │  status: processing
                      ▼
                   extract    file: Storage download (service-role client —
                      │       after() runs outside the request's cookie
                      │       context; app-layer ownership checks gate it)
                      │       ──► PDF (unpdf, per-page) | UTF-8 text
                      │       url: SSRF-guarded fetch (SEC-1) ──► Readability
                      │       text: stored content as-is
                      ▼
                   guards     20 MB/file · 200k words/source (post-parse)
                      ▼       · 50 sources/notebook (limits.ts, NF-15)
                   chunk      ~400-token chunks, 40 overlap, exact char
                      ▼       offsets; PDFs chunked per page (chunking.ts)
                   embed      batched, order-preserving; 2000 dims asserted
                      ▼       (embeddings.ts)
                   persist    content + replaceChunks (atomic) ──►
                              status: ready
                   on error   status: failed + truncated user-readable
                              errorMessage (no stacks)

browser ◄── 2.5 s poll of the source list, ONLY while a source is
            pending/processing (A3 decision: polling over Realtime —
            fewer moving parts at in-process durations; revisit at stage 2)
```

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
