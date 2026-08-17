# Feasibility study — NotebookLM clone prototype

> **Status:** Adopted 2026-08-17.
> **Question:** Can the declared stack (Bun monorepo, Next.js webapp, Supabase
> BaaS, Scaleway infrastructure, Astro static sites) deliver the Phase 1 scope
> in `product/scope.md` as a working prototype — and where are the gaps?
> **Method:** Three parallel research passes over primary sources (official
> docs, GitHub issue trackers, registries) on 2026-08-17, covering (a) the
> Scaleway platform, (b) Supabase's RAG building blocks, (c) the
> Bun/Next.js/parsing toolchain. Findings below cite the pass they came from;
> anything not verifiable from primary sources is marked as a spike.

## Verdict

**Feasible.** Every Phase 1 capability maps to an officially documented
pattern on the chosen stack. Two decisions change from the original
parameters, and four things need spike-level verification before feature work
relies on them. No blocker was found.

| # | Area | Verdict |
| - | --- | --- |
| F-1 | Next.js webapp self-hosted in a container | ✅ Feasible — with **Node, not Bun, as production runtime** (decided) |
| F-2 | Streaming chat (SSE) through Scaleway Serverless Containers | ⚠️ Likely, **undocumented — spike S-1** |
| F-3 | RAG layer: pgvector + hybrid search on Supabase, via Drizzle | ✅ Feasible, documented end-to-end |
| F-4 | Document ingestion (PDF/DOCX/web) under Bun | ✅ Feasible (unpdf, mammoth, linkedom + readability) |
| F-5 | Background jobs for ingestion/artifacts | ✅ Feasible — staged: in-process → Scaleway Serverless Jobs |
| F-6 | Auth + file storage (Supabase) | ✅ Feasible, mature (`@supabase/ssr`, TUS uploads, RLS) |
| F-7 | LLM + embeddings provider | ✅ Feasible — Scaleway Generative APIs (OpenAI-compatible, EU) |
| F-8 | Static sites on bucket websites | ✅ Feasible; custom-domain HTTPS needs Edge Services |
| F-9 | Terraform coverage of all of the above | ✅ Complete in provider 2.81 |
| F-10 | Bun as monorepo/test/tooling runtime | ✅ Feasible (with minor test-runner caveats) |

## Decisions

### D-1 — Node.js runs the Next.js production container; Bun stays everywhere else

**Decided with the project owner, 2026-08-17.**

Bun 1.3.14 (current stable, our pin) has two acknowledged, fixed-only-in-canary
bugs that hit exactly our path: `next build` can segfault (napi
use-after-free in next-swc, [oven-sh/bun#36866]), and the Next standalone
server idles at ~670 MB RSS vs ~80 MB on Node ([oven-sh/bun#34389], fix
targeted at the next stable). There is additionally an open
streaming-truncation issue behind nginx-class proxies ([oven-sh/bun#19789])
and an open AI-SDK-streaming failure specific to Bun production builds
([oven-sh/bun#25630]) — and streaming chat is our core feature.

Meanwhile Next.js 16 explicitly supports all features self-hosted in Docker
(`output: "standalone"`, official `with-docker` example on `node:24-slim`,
`sharp` for image optimization), and nothing in Next 16 is Vercel-only.

**Consequence:** webapp Dockerfile uses the official Node-based standalone
pattern. Bun remains package manager, script runner, test runner, and the
runtime for non-Next workloads (ingestion workers). Revisit when a stable Bun
ships the memory/segfault fixes.

### D-2 — Document parsing runs in our own processes, not Supabase Edge Functions

Edge Functions cap at 2 s CPU / 256 MB and have documented npm-package
failures for PDF work. Parsing (CPU-bound, memory-hungry) therefore runs in
code we control — the Next.js container or a Serverless Jobs worker (see
F-5). Edge Functions remain an option for pure-I/O steps only.

### D-3 — Drizzle migrations via `drizzle-kit generate`, never `push`

`drizzle-kit push` has an open bug that regenerates HNSW indexes without the
operator class, which Postgres rejects ([drizzle-orm#5792]). Generated SQL
migrations (already our convention) sidestep it. The `vector` extension is
enabled in `supabase/migrations/` (Drizzle does not create extensions).

### D-4 — Scaleway Generative APIs as default model provider, behind an OpenAI-compatible abstraction

`https://api.scaleway.ai/v1` is OpenAI-compatible (chat + streaming +
embeddings + rerank), Paris-hosted with zero retention and no training on
prompts, has a 1M-token free tier, and keeps the infrastructure single-vendor.
Embeddings: `qwen3-embedding-8b` (32k ctx) or `bge-multilingual-gemma2`.
Consumed through the AI SDK's `@ai-sdk/openai-compatible` provider, which
satisfies NF-16: any OpenAI-compatible endpoint (OpenAI, Mistral, Ollama
locally) swaps in via config. Caveat: Scaleway rotates models on ~3–12-month
EOL cycles — pin loosely, expect model-name churn.

### D-5 — File uploads go directly to Supabase Storage, never through the container

Scaleway containers have an undocumented request-body limit (user reports
suggest ~1 MB nginx default). Irrelevant if uploads use Supabase Storage's
documented path: TUS resumable uploads (recommended > 6 MB, 50 MB/file free
tier, 500 GB paid) with RLS policies keyed on `auth.uid()`. The webapp only
ever receives the storage path, then enqueues ingestion.

### D-6 — No agent framework (eve, LangChain, …) for Phase 1

Phase 1's "agentic" surface — grounded chat with tool calls that start async
jobs and stream citations — is fully covered by AI SDK 7 core
(`streamText` + tools + custom `data-*` message parts for citations).
Vercel's eve (June 2026) targets standalone durable backend agents and
assumes a long-running host and Vercel-default deployment; adopting it now
adds an orchestration-layer lock-in exactly where NF-16 says to stay thin,
for no Phase 1 gain. Revisit for Phase 5 (Deep Research, code execution),
where durable execution/sandboxes/approvals genuinely apply.

## Architecture (resulting shape)

```text
Browser ── Next.js (Node container, Scaleway Serverless Containers, min-scale 1)
   │            │  AI SDK 7: streamText + tools + data-part citations (SSE)
   │            ├─ repositories ── Drizzle ── Supabase Postgres (+ pgvector HNSW,
   │            │                              tsvector, RRF hybrid_search fn)
   │            ├─ @supabase/ssr auth (cookie sessions, proxy.ts refresh)
   │            └─ Jobs API ──► Scaleway Serverless Job (Bun worker image)
   │                               parse (unpdf/mammoth/readability)
   │                               → chunk → embed (Scaleway /embeddings)
   │                               → write chunks+vectors, update job status
   ├─ uploads ──► Supabase Storage (TUS, RLS)          ▲
   └─ job/artifact status ◄── Supabase Realtime ───────┘
docs + marketing ──► bucket websites (HTTPS on default endpoint;
                     Edge Services only when custom domains are wanted)
```

**Ingestion is staged deliberately** (prototype-first): stage 1 runs parse →
chunk → embed in-process in the Next container (`after()`; fine at min-scale 1
with the 60-minute request ceiling and small documents), with job state in
Postgres from day one. Stage 2 moves the same worker code into a Serverless
Job (24 h cap, 6 vCPU/16 GB, started per document via the Jobs API, cron for
retries/cleanup) without touching the schema or the UI, which observes job
state via Realtime either way. This matches the chat↔panel eventing pattern
observed in the real product (`product/ui-research.md` §4).

## Risk register

| Risk | Severity | Status / mitigation |
| --- | --- | --- |
| SSE streaming through Scaleway's container gateway unverified (docs cover HTTP/2, WebSockets, gRPC — never SSE; a gateway sits in front) | **High** — core feature | **Spike S-1.** Fallbacks: WebSocket transport (documented as supported), or another container host for the webapp only |
| Request-body limit on containers (~1 MB, user-reported) | Medium | Designed around (D-5); S-1 confirms |
| PDF parsing library behavior (unpdf per-page positions API, mammoth under Bun) | Medium | **Spike S-2**; alternatives ranked: pdfjs-dist legacy build, pdf2json |
| Cold starts at min-scale 0 (no published numbers; image size dependent) | Low for demo | min-scale 1 (~€34–37/mo at 1 vCPU/2 GB) during demo windows; scale-to-zero otherwise |
| Supabase free-tier: 500 MB DB / 500 MB RAM caps HNSW scale; project pauses after 1 week idle | Medium | Prototype scale (≤ tens of thousands of 1536-dim vectors) fits; Pro ($25/mo) before demos; consider `halfvec` |
| Supabase Queues (pgmq) GA label unconfirmed | Low | Launched 2024-12, dashboard-integrated; acceptable for prototype |
| Generative-APIs model EOL rotation; org-level rate limits need payment method on file | Low | Loose model pinning behind D-4 abstraction; register payment method |
| `bun test` lacks `--filter`/globs; `mock.module` scoping bugs | Low | Root `bun test` sweeps workspaces; avoid module-mock-heavy test design |
| Local pgvector version may differ from hosted (0.8 features: iterative scans) | Low | Check `extversion` in S-2; avoid 0.8-only features initially |

## Spike plan (ordered, one session each)

1. **S-1 — Streaming walking skeleton** (`feat/spike-streaming`): minimal AI
   SDK chat route in the webapp, Node standalone Dockerfile, deploy to a
   Serverless Container via Terraform, verify SSE end-to-end (no truncation,
   no buffering), measure cold start, probe body limit. *Kills or confirms
   the single high risk.*
2. **S-2 — Ingestion + retrieval core** (`feat/spike-ingestion`): local
   Supabase; upload PDF → unpdf parse with page positions → chunk
   (@langchain/textsplitters + gpt-tokenizer) → Scaleway embeddings →
   pgvector via Drizzle (generated migrations, HNSW + tsvector) → Supabase's
   `hybrid_search` RRF function → top-k chunks with source locations.
   *Proves the knowledge layer and the citation raw material.*
3. **S-3 — Grounded chat with citations** (`feat/spike-citations`): wire S-2
   retrieval into the chat route; stream answer + `data-citation` parts;
   render citation chips that resolve to chunk locations. *Proves the
   defining feature (CF-07).*
4. **S-4 — Auth + async job status** (`feat/spike-auth-jobs`):
   `@supabase/ssr` login, RLS on all tables/storage, ingestion status via
   Realtime into the sources panel. *Completes the walking skeleton of the
   product loop.*

After S-1…S-4, Phase 1 feature work proceeds on a de-risked stack; promotion
of ingestion to Serverless Jobs happens when document size demands it.

## Prototype running costs (rough)

| Item | Cost |
| --- | --- |
| Scaleway container, min-scale 0 + free tier | ~€0 (cold starts) |
| Scaleway container, min-scale 1, 1 vCPU/2 GB (demo mode) | ~€34–37/mo |
| Supabase Free → Pro when demoing | $0 → $25/mo |
| Scaleway Generative APIs | 1M tokens free, then e.g. €0.15/€0.35 per M (mistral-small) |
| Bucket websites (default endpoints, HTTPS included) | ~€0 |
| Edge Services (only for custom domains) | ~€1–13/mo |
| **Total** | **~€0–5/mo idle · ~€65–80/mo demo-ready** |

[oven-sh/bun#36866]: https://github.com/oven-sh/bun/issues/36866
[oven-sh/bun#34389]: https://github.com/oven-sh/bun/issues/34389
[oven-sh/bun#19789]: https://github.com/oven-sh/bun/issues/19789
[oven-sh/bun#25630]: https://github.com/oven-sh/bun/issues/25630
[drizzle-orm#5792]: https://github.com/drizzle-team/drizzle-orm/issues/5792
