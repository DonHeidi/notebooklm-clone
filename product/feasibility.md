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
| F-2 | Streaming chat (SSE) through Scaleway Serverless Containers | ✅ **Confirmed by spike S-1 (2026-08-17)** — token-by-token, no buffering, no truncation |
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

### D-7 — SSE fallback: a plain Scaleway Instance, decided by spike S-1

**DECIDED 2026-08-17 by spike S-1: serverless confirmed — the VM fallback is
not needed.** Measured against a real deployment (`feat/spike-streaming`,
container `marginalia-webapp`, fr-par, min-scale 0): SSE streams through the
gateway unbuffered and untruncated (server-paced 500 ms ticker arrived with
±10 ms client-side deltas; an 87-event AI-SDK LLM stream arrived
token-by-token with a clean `finish`/`[DONE]`), warm TTFB ~90–100 ms, and
request bodies up to 20 MB passed — the rumored ~1 MB gateway limit did not
materialize (D-5's storage-direct upload path stays, for TUS resumability
and RLS, not because of a body limit). Cold-start figure: see the risk
register row below. The fallback text below is retained for reference only.

If S-1 had shown SSE breaking (or
buffering badly) through the Serverless Containers gateway, the webapp would
have moved to a small Scaleway Instance running the *same* Docker image behind
Caddy/Traefik for TLS (`scaleway_instance_server`, Terraformable). A VM has
no gateway in the streaming path, no cold starts, no body limits, and at
DEV1/PLAY2 class (~€10/mo, verify at switch time) costs less than the
serverless container at min-scale 1. The price is operational: OS patching,
TLS, a deploy step, no autoscaling — acceptable for a prototype. Explicitly
rejected: keeping the container and adding a separate SSE relay server on a
VM — splitting the app across two runtimes adds an auth-forwarding hop and
buys nothing over hosting the whole webapp on the instance.

### D-8 — TTS provider: Azure AI Speech, behind a thin `synthesize()` abstraction

**Decided 2026-08-17 (spike D1).** Method: doc-only comparison of ten
providers against current official documentation, all fetched 2026-08-17
(no TTS API key was resolvable in the spike environment, so no hosted
provider was exercised by a real call; the self-host fallback *was*
verified by a real local generation — see below). Criteria were
re-weighted by the project owner during the session: **feature fit
(API shape, quality, cost) ahead of data-residency**, with EU posture
still recorded. Use case: single-speaker Audio Overview (CF-12 MVP tier),
~700-word script (≈ 4,500 chars ≈ 5 min audio), German and English,
generated async (SF-09). Full comparison table in the D1 PR description.

**Scaleway has no TTS product** — verified against the Generative APIs
supported-models page and a grep of the `scaleway/docs-content` repo
(2026-08-17): audio models are transcription-only (`whisper-large-v3`;
`voxtral-small` EOL 2026-08-01). The Audio Overview therefore cannot stay
single-vendor; D-4's abstraction principle extends to speech synthesis.

**Chosen: Azure AI Speech** (standard neural voices first; DragonHD German
voices as an optional quality step). Why, against the criteria:

- *API shape:* the only competitively priced API that takes the whole
  script in **one call** (10-minute-audio cap per request) and returns raw
  audio bytes from a single key-authenticated POST with an SSML body — the
  thinnest wrapper in the field (OpenAI caps at 4,096 chars, Google at
  5,000 *bytes* — German umlauts push a 4,500-char script over it —
  Deepgram at 2,000 chars, Mistral at ~300 words; all need chunking +
  concatenation). Full SSML prosody control on standard voices. A GA batch
  synthesis API returns word-level timings (free transcript-sync later).
- *Cost:* $0.0675 per generation standard ($15/1M chars, price read from
  the Azure Retail Prices API), $0.099 with DragonHD ($22/1M). Free tier
  (F0) is 0.5M chars/month ≈ **111 five-minute generations — the entire
  prototype phase costs $0** (F0 lacks the batch API; the realtime
  endpoint suffices for our lengths).
- *Voice quality:* German is one of only 8 locales with dedicated
  fine-tuned DragonHD voices (`de-DE-Seraphina/Florian`, GA) plus 15
  standard neural voices; en-US is Azure's flagship locale (30+ HD voices,
  podcast-optimized variants). Caveat: quality judged from docs/samples
  catalog only — **audition before wiring** (risk row below).
- *EU:* documented in-region processing ("Azure Speech doesn't store or
  process your data outside the region of your resource"); standard
  voices available in Germany West Central; DragonHD needs West Europe or
  Sweden Central. Pin `westeurope`.
- *Latency:* documented < 300 ms to audio start on the realtime endpoint;
  a 5-minute script streams back well inside our async budget.

**Runner-up: ElevenLabs** (`eleven_multilingual_v2`) — the voice-quality
leader (its model family holds multiple top-10 TTS-Arena slots), German
first-class, one call (10k-char limit), trivial API. Loses on cost
(~$0.74–0.82 per generation via subscription credits ≈ **10× Azure**),
free tier of ~2 episodes/month without commercial license, and
Enterprise-only EU residency. This is the quality upgrade path if Azure
narration underwhelms in listening tests.

Also evaluated: **Mistral Voxtral TTS** (launched 2026-03; EU-native,
$0.072/generation, German+English, streaming — the closest D-4-spirit
option, penalized by ~300-word request chunking, base64-JSON responses,
and product newness); OpenAI `gpt-4o-mini-tts` (~$0.07, voices "optimized
for English", EU residency approval-gated); Deepgram Aura-2 (EU endpoint
GA 2026-01, $0.135, but 2,000-char chunks and no prosody control);
Amazon Polly generative ($0.135 in Frankfurt, drags in SigV4/AWS SDK);
Google Cloud TTS (Chirp 3 HD $0.135, OAuth2 token flow + byte-cap
chunking); Cartesia Sonic (no documented EU hosting below Enterprise).

**Self-host cost floor — verified by real generation in this spike
(2026-08-17):** Piper (`piper1-gpl`, GPL-3 code, CC0 voices) rendered a
~700-word script in **13.2 s on a 16-core CPU** (~17× realtime;
`de_DE-thorsten-medium` → 3:42 audio / 9.8 MB WAV,
`en_US-lessac-medium` → 3:45 / 9.9 MB). Runs on a ~€15/mo instance;
quality is a clear tier below hosted options. The higher-quality
commercially-safe self-host is Chatterbox Multilingual v3 (MIT, 23
languages incl. German, OpenAI-compatible server, needs an ~8 GB GPU —
Scaleway L4 €0.79/h on-demand). Kokoro is ruled out solely by its
continued lack of German; XTTS-v2, Fish/OpenAudio and Mistral's open
Voxtral weights are all non-commercial licenses.

**Interface shape for D2** (function-signature level; satisfies
NF-16/D-4's thin-abstraction rule — Azure is not OpenAI-compatible, but
the custom surface is one function, and an `openai-compatible` adapter
covers OpenAI and the self-host servers as the escape hatch):

```ts
interface TtsProvider {
  synthesize(req: {
    script: string;              // plain text, ≤ ~1,000 words
    language: "de" | "en";
    voice?: string;              // provider-neutral key, mapped per adapter
    format?: "mp3" | "wav";      // default mp3
  }): Promise<{
    audio: Uint8Array;           // D2 uploads to Supabase Storage
    mimeType: string;
    charactersBilled: number;
  }>;
  listVoices(language: "de" | "en"): Promise<{ key: string; label: string }[]>;
}
```

Selected via `TTS_PROVIDER` (see `.env.schema`); D2 composes: script
generation (D-4 LLM) → `synthesize()` → Storage upload → artifact row +
Realtime status (SF-09). Chunking, if a script ever exceeds one request,
lives *inside* the adapter, not in the pipeline.

> **Audition note (2026-08-18, session D2).** Voices auditioned by the
> project owner with real F0-tier generations (~30 s identical script per
> language, realtime endpoint): `de-DE-Seraphina/FlorianMultilingualNeural`,
> `de-DE-KatjaNeural`, `en-US-AndrewNeural`, `en-US-AvaNeural`. **Verdict:
> Azure standard neural quality accepted for the MVP; defaults are
> `de-DE-SeraphinaMultilingualNeural` (German) and `en-US-AndrewNeural`
> (English).** No ElevenLabs escalation; DragonHD stays the optional
> upgrade. One correction to this decision's parameters: **the Speech
> resource lives in `swedencentral`, not `westeurope`** — Azure declined
> new customers in West Europe at provisioning time
> (`RequestDisallowedByAzure`); Sweden Central is the other EU region with
> DragonHD German voices, so all selection criteria hold. All five
> audition voices confirmed GA there.

### D-9 — Database-backed tests run against real Postgres in a local container, replacing PGlite

**Decided with the project owner, 2026-08-18. Not yet implemented — until it
lands, the interim CI workarounds below stay in place.**

The webapp's repository and ingestion-pipeline tests currently run against
PGlite (`@electric-sql/pglite`, in-process WASM Postgres, built in A1's
`createTestDatabase()`, extended by A3). B2's CI surfaced two
Bun-runtime-specific problems with that setup, both reproduced minimally and
verified against Node on 2026-08-18 (Bun 1.3.14 + pglite 0.5.5, both current):

1. **Exit code 99 despite passing tests.** Any process that instantiates a
   PGlite client exits with code 99 under Bun — plain `bun run` as well as
   `bun test` with a `0 fail` summary; closing the client makes no
   difference; the identical code exits 0 under Node. Local runs never
   noticed (nobody checks `$?` of a green-looking run by hand); CI failed on
   it immediately.
2. **Cold-init flakiness.** The first `new PGlite()` (WASM compile)
   intermittently exceeds Bun's default 5 s per-test/hook timeout on GitHub
   runners, failing a test file's `beforeAll` as `(fail) (unnamed)` —
   nondeterministic across runs on identical code.

Interim workarounds live in `.github/workflows/ci.yml`: the test step accepts
exactly the `exit 99` + `0 fail` signature (every other nonzero exit still
fails) and runs `bun test --timeout 30000`. Both are masking tape, and the
exit-99 allowlist in particular means a hypothetical failure mode that sets
exit 99 without failing a test would slip through.

**Decision:** database-backed tests move to a **real Postgres (with pgvector)
running in a local container**, applying the same `supabase/migrations`
timeline that `createTestDatabase()` applies today. This removes the whole
WASM-under-Bun quirk class instead of patching around it, and tests the real
engine — including real pgvector rather than the PGlite port, which matters
before S-2/A4 lean on HNSW + RRF behavior. The trade-offs accepted: tests
need Docker (or `supabase start`) available, per-test-file isolation needs a
scheme (template database, schema-per-file, or transaction rollback) instead
of PGlite's cheap throwaway instances, and CI needs a Postgres service
container.

Implementation notes for whichever session picks this up (test infra is
A-lane's surface): the choice between a plain `pgvector/pgvector` image and
the already-pinned Supabase CLI stack (`supabase start`, whose Postgres ships
pgvector and matches hosted Supabase closest) is left to that session — the
repo already pins `supabase` in `mise.toml`, which weighs in favor of the
Supabase stack. On completion, remove both CI workarounds
(the exit-99 guard and the raised timeout) and delete this paragraph's
"not yet implemented" marker.

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
| SSE streaming through Scaleway's container gateway unverified (docs cover HTTP/2, WebSockets, gRPC — never SSE; a gateway sits in front) | ~~High~~ **Resolved** | **S-1 verified 2026-08-17**: unbuffered, untruncated, token-by-token (500 ms server ticker → ±10 ms arrival deltas; 87-event LLM stream, warm TTFB ~0.1 s). D-7 decided: serverless stays |
| Request-body limit on containers (~1 MB, user-reported) | ~~Medium~~ **Resolved** | **S-1 probed 2026-08-17**: 512 KB–20 MB all pass (HTTP 200, full body received). D-5 stays for TUS resumability + RLS, not because of a limit |
| PDF parsing library behavior (unpdf per-page positions API, mammoth under Bun) | Medium | **Spike S-2**; alternatives ranked: pdfjs-dist legacy build, pdf2json |
| Cold starts at min-scale 0 (no published numbers; image size dependent) | Low for demo | **S-1 measured 2026-08-17: 3.89 s TTFB** from zero (407 MB Node standalone image; ~0.09 s warm). min-scale 1 (~€34–37/mo at 1 vCPU/2 GB) during demo windows; scale-to-zero otherwise |
| Supabase free-tier: 500 MB DB / 500 MB RAM caps HNSW scale; project pauses after 1 week idle | Medium | Prototype scale (≤ tens of thousands of 1536-dim vectors) fits; Pro ($25/mo) before demos; consider `halfvec` |
| Supabase Queues (pgmq) GA label unconfirmed | Low | Launched 2024-12, dashboard-integrated; acceptable for prototype |
| Generative-APIs model EOL rotation; org-level rate limits need payment method on file | Low | Loose model pinning behind D-4 abstraction; register payment method |
| `bun test` lacks `--filter`/globs; `mock.module` scoping bugs | Low | Root `bun test` sweeps workspaces; avoid module-mock-heavy test design |
| PGlite under Bun: exit 99 with 0 failures; cold WASM init blows the 5 s hook timeout on CI runners (found in B2) | Medium | **D-9 decided 2026-08-18**: move DB-backed tests to real Postgres in a local container. Interim: CI allowlists the exact exit-99 signature and runs `--timeout 30000` — both removed when D-9 lands |
| Local pgvector version may differ from hosted (0.8 features: iterative scans) | Low | Check `extversion` in S-2; avoid 0.8-only features initially |
| Azure TTS (D-8) chosen on docs only — German/English voice quality never auditioned (no API key in spike D1) | Medium | First step of D2: create an F0 key, audition `de-DE-Seraphina/Florian/Katja` + en-US candidates before wiring the pipeline; runner-up ElevenLabs and self-host fallback stand ready behind the `TtsProvider` interface |
| Azure DragonHD voices unavailable in Germany West Central (West Europe / Sweden Central only); voice catalog churns | Low | Standard neural voices suffice for MVP and exist in all three EU regions; pin `westeurope`; churn absorbed by the D-8 abstraction |

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
