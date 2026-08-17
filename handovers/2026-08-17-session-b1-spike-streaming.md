# Session B1 — Spike S-1: SSE streaming on Scaleway Serverless Containers (2026-08-17)

## Goal

Feasibility spike S-1 (`feat/spike-streaming`): deploy a minimal streaming
skeleton to a real Scaleway Serverless Container and decide **D-7**
(serverless vs VM fallback) with actual measurements.

## Verdict

**Serverless confirmed. The VM fallback (D-7) is not needed.**
`product/feasibility.md` updated: F-2 ✅, D-7 decided, SSE + body-limit risk
rows resolved.

## Measurements (container `marginalia-webapp`, fr-par, min-scale 0, 1 vCPU/2 GB)

| Test | Result |
| --- | --- |
| SSE ticker (server-paced 500 ms, 10 events) | Client arrival deltas 499–508 ms — **no gateway buffering**, event-by-event delivery |
| LLM stream (AI SDK `toUIMessageStreamResponse`, mistral-small-3.2) | 87 SSE events arrive incrementally over ~0.77 s; clean `finish` + `[DONE]` — **no truncation** |
| Warm TTFB (GET info route, ×3) | 87–96 ms |
| Warm LLM stream | TTFB 100 ms (headers immediate), 2.22 s total for a ~100-line generation (17 KB SSE) |
| Cold start (min-scale 0, 25 min idle, 407 MB image) | TTFB **3.89 s**, HTTP 200 (vs ~0.09 s warm) |
| Body limit probes (POST, echo size) | 512 KB / 1 MB / 5 MB / 10 MB / 20 MB — **all HTTP 200, full body received**. The user-reported ~1 MB limit did not materialize |

## What was done

- **Throwaway route** `apps/webapp/src/app/api/spike-stream/route.ts` (delete
  after A4 exists): SSE ticker mode, LLM stream via
  `@ai-sdk/openai-compatible` against Scaleway Generative APIs, body-probe
  mode. AI SDK 7 (`ai@7.0.66`).
- **Keeper Dockerfile** `apps/webapp/Dockerfile` (B2 reuses): Bun installs
  deps, `next build` + runtime on `node:24-slim`, standalone output,
  non-root. Verified locally before deploy. Companion
  `Dockerfile.dockerignore` (BuildKit per-Dockerfile ignore); build context
  is the repo root.
- **`next.config.ts`**: `output: "standalone"` + `outputFileTracingRoot`
  (repo root — required in a monorepo).
- **Terraform**: `scaleway_container` completed (deprecated args replaced:
  `image`, `memory_limit_bytes`, `https_connections_only`,
  `public_endpoint`); resource prefix renamed to **`marginalia`**
  (product name, owner-confirmed) before first apply; manual push script
  `infrastructure/scripts/push-webapp.sh`. First apply performed — state is
  **local** in the worktree (`.worktrees/feat-spike-streaming/infrastructure/`);
  migrate to the S3 backend in B2 before the worktree is deleted, or move
  `terraform.tfstate` to the main checkout when this branch merges.
- **Secrets**: resolved from Proton Pass (vault `marginalia`, item
  `scaleway-api-key`) via `pass-cli inject` into untracked `.env.local`,
  symlinked into the worktree. New schema declarations:
  `SCW_GENERATIVE_APIS_KEY`, `SCW_GENERATIVE_APIS_MODEL`,
  `SCW_GENERATIVE_APIS_BASE_URL`, `TF_VAR_generative_apis_key`,
  `TF_VAR_scw_project_id`.

## Gotchas found (worth remembering)

1. **Bun 1.3 isolated installs break Next standalone tracing** — the
   `node_modules/.bun` symlink store loses `@swc/helpers` in the traced
   output. Dockerfile uses `bun install --linker=hoisted`.
2. **Generative APIs needs the project-scoped URL**
   (`https://api.scaleway.ai/<project-id>/v1`) when the IAM key's default
   project isn't the target project — bare `/v1` returns 403. The container
   gets `SCW_GENERATIVE_APIS_BASE_URL` from Terraform.
3. **`bunx varlock run` currently refuses to run anything** because the two
   required Supabase values are empty in `.env.local`. Deploy commands were
   run with `.env.local` sourced directly. Once A-lane fills the Supabase
   values, `varlock run` works as documented.
4. IAM key scoped to Object Storage/Registry/Containers/GenerativeApis
   **cannot read the account API** — Terraform data sources like
   `scaleway_account_project` would 403; the project ID is passed as
   `TF_VAR_scw_project_id` instead.

## Cost left running

- Container `marginalia-webapp` at **min-scale 0**: €0 idle, per-request
  within free tier if hit. `max_scale = 2` caps worst case.
- Registry image (~400 MB): ~€0.01/mo. Buckets: empty, €0.
- The spike route is **unauthenticated** on a public URL; token spend is
  possible if the URL leaks. Fine for days, not weeks — B2 should gate or
  delete it.

## Next (B2)

CI (lint/test/build), deploy pipeline reusing this Dockerfile + push script,
Terraform state → S3 backend, bucket deploys for docs/marketing, delete or
protect the spike route.
