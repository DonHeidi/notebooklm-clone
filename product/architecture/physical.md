# Physical view — deployment topology

> **Status:** Snapshot as of **2026-08-18** (session C5). Describes
> `infrastructure/*.tf`, `apps/webapp/Dockerfile`, and the deploy workflows
> as merged ([PR #11](https://github.com/DonHeidi/notebooklm-clone/pull/11)
> B1, [PR #13](https://github.com/DonHeidi/notebooklm-clone/pull/13) B2,
> [PR #19](https://github.com/DonHeidi/notebooklm-clone/pull/19)).
> **Not yet real:** hosted Supabase (B3 pending — the webapp's data plane
> runs against the *local* Supabase stack today) and Azure Speech (D-8
> decided, wiring is D2's in-flight work).

## Topology

```
                         users / browser
                     │                    │
            HTTPS    │                    │  HTTPS (default bucket
                     ▼                    ▼   website endpoints)
     ┌───────────────────────────┐   ┌──────────────────────────────┐
     │ Scaleway Serverless        │   │ Scaleway Object Storage      │
     │ Container  fr-par          │   │   marginalia-docs (website)  │
     │  marginalia-webapp         │   │   marginalia-marketing (")   │
     │  Node 24 standalone (D-1)  │   │   marginalia-tfstate         │
     │  1 vCPU / 2 GB, port 3000  │   │     (versioned; S3 backend   │
     │  min 0 / max 2, HTTPS only │   │      for terraform state)    │
     │  SSE verified (D-7 / S-1)  │   └──────────────────────────────┘
     └────────┬──────────┬────────┘
              │          │            ┌──────────────────────────────┐
              │          └──────────► │ Scaleway Generative APIs     │
   image pull │  chat + embeddings    │  api.scaleway.ai/<project>/v1│
              │  (OpenAI-compatible,  │  (D-4; EU, zero retention)   │
              │   D-4)                └──────────────────────────────┘
   ┌──────────┴───────────┐
   │ Scaleway Registry    │           ┌──────────────────────────────┐
   │  rg.fr-par…/         │           │ Supabase                     │
   │  marginalia/webapp   │           │  auth (JWT/cookie sessions)  │
   └──────────────────────┘           │  Postgres + pgvector (HNSW)  │
                                      │  Storage (sources bucket,    │
   ┌──────────────────────┐           │   RLS, direct browser        │
   │ Azure AI Speech      │           │   uploads — D-5)             │
   │  westeurope (D-8)    │           │  LOCAL stack today;          │
   │  PENDING — D2 wiring │           │  hosted project = B3 pending │
   └──────────────────────┘           └──────────────────────────────┘
```

Key verified properties:

- **Node, not Bun, runs production** (D-1): the Dockerfile
  (`apps/webapp/Dockerfile`) uses Bun only to install dependencies
  (hoisted linker — Bun 1.3's isolated store breaks Next's standalone file
  tracing); `next build` and the runtime are Node 24, official
  `output: "standalone"` pattern.
- **SSE streams through the serverless gateway** unbuffered and
  untruncated — spike S-1 measured it against a real deployment (D-7,
  `product/feasibility.md`); cold start from zero: 3.89 s TTFB, warm
  ~0.1 s. The container runs `min_scale = 0` today; demo mode raises it
  (B3).
- **Uploads bypass the container** (D-5): browser → Supabase Storage
  directly, under `<userId>/…` paths guarded by storage RLS; the app only
  ever receives the object path.

## Terraform

`infrastructure/` (provider `scaleway/scaleway`) manages: the tfstate
bucket (versioned; a bootstrap chicken-and-egg documented in `main.tf` —
it stores the state that tracks it), the two website buckets, the registry
namespace, the container namespace, and the `scaleway_container` webapp
resource. State lives on the Scaleway S3-compatible backend (B2); the
backend reads AWS-named credentials, and there is **no state locking** —
one person/pipeline applies at a time (`infrastructure/AGENTS.md`).

## Deploy workflows (both manual `workflow_dispatch` for the prototype)

**`deploy-webapp.yml`** — builds the Docker image, pushes an immutable
`:sha-<12>` tag plus a moving `:latest`, then PATCHes the container's
`image` via the Containers API. Rollout semantics learned the hard way
([PR #19](https://github.com/DonHeidi/notebooklm-clone/pull/19)): an
image-changing PATCH starts the rollout itself; `/redeploy` is only for
no-op PATCHes and 4xxs during a rollout. Waits for `ready`, then smoke
tests — expecting **HTTP 307**, because anonymous requests must redirect
to `/login` (the auth proxy is part of the deploy contract).

**`deploy-static-sites.yml`** — builds `apps/docs` and `apps/marketing`,
`aws s3 sync --delete --acl public-read` to the website buckets. Sites are
served from the default bucket-website endpoints (HTTPS included); Edge
Services / custom domains are B3.

## Secrets flow

Declared once, resolved per environment; values never committed
(SEC-6, `product/security.md`):

```
.env.schema (committed — declares every variable, marks sensitivity)
    │
    ├── developers: Proton Pass ──pass-cli──► untracked .env.local
    │               (all commands via `bunx varlock run --`)
    │
    ├── CI/deploys: GitHub Actions secrets (set via `gh secret set`,
    │               never echoed) ──► build args / API tokens
    │               NEXT_PUBLIC_* are build-time and inlined into the
    │               client bundle (publishable, not secret)
    │
    └── runtime:    scaleway_container secret_environment_variables
                    (SCW_GENERATIVE_APIS_KEY; Supabase server keys join
                     when B3 points the container at a hosted project)
```

The schema also already declares the D2 surface (`TTS_PROVIDER`,
`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` — D-8), ahead of the in-flight
wiring.
