# Physical view — deployment topology

> **Status:** Snapshot as of **2026-08-18** (session C5). Describes
> `infrastructure/*.tf`, `apps/webapp/Dockerfile`, and the deploy workflows
> as merged ([PR #11](https://github.com/DonHeidi/notebooklm-clone/pull/11)
> B1, [PR #13](https://github.com/DonHeidi/notebooklm-clone/pull/13) B2,
> [PR #19](https://github.com/DonHeidi/notebooklm-clone/pull/19)).
> **Not yet real:** hosted Supabase (B3 pending — the webapp's data plane
> runs against the *local* Supabase stack today) and Azure Speech (D-8
> decided, wiring is D2's in-flight work).
>
> **Update (2026-08-18, session B3):** both of the above are now real — see
> *Hosted Supabase (B3)* at the end of this document.

> **Extended 2026-08-18** (session C6): "Platform choice" section added,
> referencing decision D-10.

## Platform choice

The target company works with AWS; running on Scaleway is a deliberate,
owner-decided deviation — more cost-effective, less organisational
overhead, and every building block on this page is deliberately
interchangeable (the same Docker image, S3-compatible storage driven by
`aws s3 sync`, an s3 Terraform backend, the D-4 provider abstraction).
The decision, a per-building-block AWS interchange map verified against
the code and workflows, and its honest caveats are recorded as **D-10**
in `product/feasibility.md`.


## Topology

![UML deployment diagram: users reach the Scaleway serverless container (Next.js standalone on Node 24) and the object-storage website buckets over HTTPS, and upload files directly to Supabase Storage; the container talks to Supabase (auth, pooled SQL, storage), the Scaleway Generative APIs, and — pending D2 — Azure AI Speech; GitHub Actions pushes images to the registry and syncs the static-site buckets; the tfstate bucket is Terraform's S3 backend.](assets/physical-topology.svg)

*Diagram source: `product/architecture/diagrams/physical-topology.puml`.*

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

![UML component diagram of the secrets flow: the committed .env.schema declares every variable; Proton Pass is the store, resolved by developers into the untracked .env.local (validated by varlock) and injected into GitHub Actions secrets for CI, which feed NEXT_PUBLIC build args into the client bundle and API tokens into the container's secret environment variables.](assets/physical-secrets-flow.svg)

*Diagram source: `product/architecture/diagrams/physical-secrets-flow.puml`.
When B3 points the container at a hosted Supabase project, its server keys
join the container's secret environment variables.*

The schema also already declares the D2 surface (`TTS_PROVIDER`,
`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` — D-8), ahead of the in-flight
wiring.

## Hosted Supabase (B3, 2026-08-18)

The webapp's data plane is hosted since session B3: Supabase project
`marginalia` (ref `ahphkkvsofqmxkqzbica`, **eu-west-3 / Paris** — colocated
with the fr-par container; **Free tier**, owner decision — the idle-pause
trade-off is recorded in `product/feasibility.md`). The full
`supabase/migrations` timeline is applied (8 tables + RLS, HNSW + FTS
indexes, `sources`/`artifacts` buckets; pgvector 0.8.2, identical to local).
Hosted auth config is code: the `[remotes.demo]` section of
`supabase/config.toml`, pushed with `supabase config push` (email+password
signup on, email confirmation off for the demo, site URL = the container
endpoint). The container now receives `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`,
`AZURE_SPEECH_REGION`, `TTS_PROVIDER` as plain env and
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (transaction pooler, port 6543,
`prepare: false`), `AZURE_SPEECH_KEY`, `SCW_GENERATIVE_APIS_KEY` as secret
env, all via Terraform; `min_scale` is the `webapp_min_scale` tfvar
(0 idle / 1 for demo windows).
