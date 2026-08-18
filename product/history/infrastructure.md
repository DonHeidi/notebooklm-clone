# Infrastructure — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `infrastructure/` and `.github/workflows/` through PR
> [#19](https://github.com/DonHeidi/notebooklm-clone/pull/19).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/feasibility.md`,
> `product/security.md`.

## What was built

- **2026-08-17 — Terraform skeleton** (PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)).
  Scaleway provider ~> 2.81: website buckets for docs and marketing,
  registry + container namespaces, the `scaleway_container` resource
  commented out until a first image existed. Local state; the S3 backend
  block prepared but commented. `terraform validate` passing from day one.
- **2026-08-17 — First real deployment, spike S-1 / session B1**
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)). The
  `scaleway_container` went live (`marginalia-webapp`, fr-par, min-scale 0,
  1 vCPU / 2 GB), resource prefix renamed to `marginalia` (owner-confirmed
  product name) before the first apply, plus a manual image-push script.
- **2026-08-18 — CI and deploy pipelines, session B2**
  (PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)). Three
  GitHub Actions workflows: `ci.yml` on every PR (lint, typecheck,
  `bun test`, build all three apps, `terraform fmt -check` + `validate`
  without credentials), `deploy-webapp.yml` (docker build → push to the
  Scaleway registry → update the container via the Containers API → poll →
  smoke test), and `deploy-static-sites.yml` (Astro builds → `aws s3 sync`
  to the website buckets). Terraform state moved into a versioned
  `marginalia-tfstate` bucket. All three targets were deployed with owner
  approval on 2026-08-18: the webapp answers with the auth proxy's 307, the
  docs and marketing buckets serve HTTP 200.
- **2026-08-18 — Deploy fix** (PR [#19](https://github.com/DonHeidi/notebooklm-clone/pull/19)).
  First real Actions dispatch of `deploy-webapp` exposed a redeploy-call bug
  (see problems below); the workflow now skips the explicit `/redeploy` when
  the image PATCH already started a rollout.

## Decisions and why

- **Scaleway serverless confirmed — spike S-1 decided D-7**
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11),
  `product/feasibility.md` D-7). The single highest risk in the feasibility
  study was whether SSE streaming survives the Serverless Containers gateway
  — the docs cover HTTP/2, WebSockets and gRPC but never SSE. B1 ran the
  spike first, on purpose, against a real deployment. The measured evidence:
  - a server-paced 500 ms SSE ticker arrived with 499–508 ms client-side
    deltas — **no gateway buffering**;
  - an 87-event AI-SDK LLM stream arrived token-by-token over ~0.77 s with a
    clean `finish`/`[DONE]` — **no truncation**;
  - warm TTFB 87–96 ms; cold start from min-scale 0 after 25 min idle:
    **3.89 s** TTFB (407 MB image);
  - request-body probes at 512 KB / 1 / 5 / 10 / 20 MB all passed — the
    user-reported ~1 MB gateway limit **did not materialize**.

  Verdict: serverless stays; the VM fallback text in D-7 is retained for
  reference only. (D-5's storage-direct uploads also stay — for RLS and
  resumability, no longer because of a body limit.)
- **State in a versioned bucket, no locking** (session B2, PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)).
  Scaleway's S3-compatible backend has no DynamoDB-equivalent lock table;
  the accepted trade-off for a single-operator prototype is bucket
  versioning as the safety net, documented in `infrastructure/AGENTS.md`.
- **Min-scale 0 as the cost posture.** The container idles at €0 (max-scale
  2 caps the worst case); demo windows switch to min-scale 1 later (B3).
  Every infrastructure PR carries an explicit cost-delta section — a
  convention worth keeping.
- **CI never sees real Supabase values** (session B2). The webapp build in
  CI uses obviously-fake placeholder `NEXT_PUBLIC_SUPABASE_*` values;
  the corresponding repo secrets are placeholders too, because no hosted
  Supabase project exists yet (SEC-6 governs the real secrets flow —
  `gh secret set`, names only in PRs).

## Problems and how they were dealt with

- **Deprecated provider arguments on `scaleway_container`.** When B1
  uncommented the container resource, the scaffold-era arguments had been
  deprecated in provider 2.x; they were replaced with the current ones
  (`image`, `memory_limit_bytes`, `https_connections_only`,
  `public_endpoint`) before the first apply
  (`handovers/2026-08-17-session-b1-spike-streaming.md`).
- **Generative APIs 403s on the bare `/v1` URL.** The IAM key's default
  project wasn't the target project, and Scaleway's Generative APIs then
  require the project-scoped base URL
  (`https://api.scaleway.ai/<project-id>/v1`). Found in B1 when the LLM
  stream failed; fixed by passing the scoped URL as a container env var via
  Terraform (commit `bcbc258`, PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
- **A narrowly-scoped IAM key can't read the account API.** Terraform data
  sources like `scaleway_account_project` 403 under a key scoped to
  storage/registry/containers/GenerativeApis; the project ID is passed in as
  `TF_VAR_scw_project_id` instead (B1 handover).
- **Terraform state stranded in a worktree.** B1's first apply left state
  local to the session worktree — flagged in the PR as a hand-off hazard
  (worktrees get deleted), parked in the main checkout, then properly
  resolved by B2's migration. The bootstrap had a chicken-and-egg step: the
  tfstate bucket can't live in the state it stores at creation time, so it
  was created by a *targeted* apply against the still-local state, then
  `terraform init -migrate-state` moved the state into it. The obsolete
  local state file in the main checkout was flagged for the foreman to
  delete (PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)).
- **Containers API drift — in two rounds.** B2 found the current API is
  `containers/v1` (not v1beta1), the field is `image` (`registry_image` is
  gone, matching the provider deprecations B1 hit), and observed that a
  PATCH does not roll out on its own, so the workflow added an explicit
  POST `/redeploy` (commits `dd7fa6a`, `6a9eb96`). The first real Actions
  dispatch then failed at exactly that call: an image-*changing* PATCH does
  start a rollout, and `/redeploy` during it returns 4xx — the deploy had
  succeeded, only the job died before its smoke test. PR
  [#19](https://github.com/DonHeidi/notebooklm-clone/pull/19) made the
  explicit redeploy conditional on the PATCH having been a no-op.
- **`bun test` exits 99 under PGlite despite 0 failures.** Bun 1.3.14 +
  pglite 0.5.5 exit with code 99 whenever a test instantiates PGlite, even
  though all tests pass (Node exits 0). Local runs never noticed — nobody
  checks `$?` by hand; CI's exit-code check surfaced it immediately. CI now
  accepts exactly the `exit 99 && "0 fail"` signature and fails everything
  else (commit `e425a1e`); flagged as worth an upstream report
  (`handovers/2026-08-18-session-b2-ci-deploy.md`).
- **PGlite cold init can blow Bun's 5 s hook timeout on CI runners.** The
  first `new PGlite()` (WASM compile) intermittently took >5 s on a GitHub
  runner, failing a `beforeAll` as `(fail) (unnamed)`. CI runs
  `bun test --timeout 30000` (commit `89b4fad`).

  > **Resolution (2026-08-18, session A7, D-9).** Both PGlite issues above
  > are gone at the root: DB-backed tests moved to a real Postgres +
  > pgvector (local Supabase stack / CI service container), PGlite was
  > removed, and CI's exit-99 allowlist and raised timeout were reverted to
  > a plain `bun test`.
- **`workflow_dispatch` workflows aren't dispatchable until merged.** GitHub
  only indexes them from the default branch, so B2's one-time deploy ran the
  identical steps locally; the first post-merge dispatch (which then found
  the PR #19 bug) was a foreman follow-up.
- **`memory_limit_bytes` drift.** Config says 2147483648, the API stored
  2147000000, so unrestricted plans show a benign in-place update.
  Consciously left unfixed in B2 (the apply was kept strictly targeted);
  aligning the config value is a noted option.
- **The spike route was publicly reachable** (SEC-4). B1's deployed image
  exposed the unauthenticated `/api/spike-stream` on a public URL — token
  spend if the URL leaked. Accepted for days, not weeks, by the B1 PR; B2's
  deploy of current main put it behind A2's auth proxy (curl-verified 307),
  and full closure comes when A4 deletes the route
  (PRs [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13),
  [#17](https://github.com/DonHeidi/notebooklm-clone/pull/17)).

## Where infrastructure stands

Everything deployable is deployed from pipelines: webapp container plus both
static-site buckets, with CI gating every PR and state versioned in a
bucket. Open per the roadmap: B3 (hosted Supabase, demo-mode scaling, Edge
Services / custom domains), per-user rate limiting before public exposure
(SEC-7), and security headers (SEC-9).
