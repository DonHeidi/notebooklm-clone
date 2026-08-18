# Infrastructure — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `infrastructure/` and `.github/workflows/` through PR
> [#19](https://github.com/DonHeidi/notebooklm-clone/pull/19).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/feasibility.md`,
> `product/security.md`.
>
> **Update (2026-08-18, session C8):** coverage extended through the full
> merged board — sessions B3, B4, and B5 in the catch-up section below.

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

> **Update (2026-08-18, session C8):** superseded — B3, B4, and B5 all
> landed the same day. See the catch-up section that follows.

Everything deployable is deployed from pipelines: webapp container plus both
static-site buckets, with CI gating every PR and state versioned in a
bucket. Open per the roadmap: B3 (hosted Supabase, demo-mode scaling, Edge
Services / custom domains), per-user rate limiting before public exposure
(SEC-7), and security headers (SEC-9).

## Catch-up: sessions B3, B4, B5 (appended 2026-08-18, session C8)

Written by session C8 from the session handovers and PR descriptions
(#36, #45, #48). The snapshot above is unchanged; with this section the
page covers the full merged board. The hosted-database side of B3 and B5
is told in `product/history/supabase.md`; this page carries the
Terraform/platform side.

### What was built

- **2026-08-18 — Demo environment, session B3**
  (PR [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36)). The
  deployed product became functional end to end: a hosted Supabase project
  (`marginalia`, eu-west-3) behind the existing container, with the env
  wiring split by binding time — build-time `NEXT_PUBLIC_*` values flow as
  Docker build args from GitHub secrets (B2's placeholders replaced via
  `gh secret set`, piped, never echoed), runtime values flow through
  Terraform as plain and `secret_environment_variables` sourced from
  `.env.local` as `TF_VAR_*` at apply time. `DATABASE_URL` uses the
  transaction pooler (port 6543; the app already sets `prepare: false`).
  A `webapp_min_scale` tfvar (default 0) makes demo warm-up an explicit
  `-var webapp_min_scale=1` (~€35/mo while on). B2's
  `memory_limit_bytes` drift gotcha was closed by aligning the config to
  the API's stored value. Verified by a full headless E2E on the public
  URL: signup → PDF + URL ingestion → grounded chat with citations →
  citation click-through → save-to-note → a 4:10 audio overview generated
  in 15 s → auth guards (foreign notebook 404).
- **2026-08-18 — Custom domain `mrgnl.eu`, session B4**
  (PR [#45](https://github.com/DonHeidi/notebooklm-clone/pull/45)). The
  product on its own domain with HTTPS everywhere, DNS in code
  (`infrastructure/domain.tf`): `app.` via the native
  `scaleway_container_domain` (platform-issued Let's Encrypt cert, no
  pipeline needed), `docs.`/`www.` via Edge Services pipelines
  (bucket-website backends, managed certs), and the apex as a true 301 to
  `https://www.mrgnl.eu` through a ~10-line serverless function bound via
  ALIAS — because Edge Services is subdomain-only. All previous default
  endpoints keep serving. Supabase auth `site_url` moved to
  `https://app.mrgnl.eu` with the old endpoint kept on the allow-list.
- **2026-08-18 — Hosted Supabase under Terraform, session B5**
  (PR [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48)). The
  live hosted project was adopted by the official `supabase/supabase`
  provider **by import only** — the first plan needed no settings
  alignment (`1 to import, 0 to add, 0 to change, 0 to destroy`), and the
  post-adoption gate was `terraform plan -detailed-exitcode` → exit 0.
  The resource carries `prevent_destroy = true` and the import block stays
  in `supabase.tf` as a permanent record; `infrastructure/AGENTS.md` now
  states that a plan proposing replace/destroy on the project is a config
  bug, never something to apply. The container's Supabase env is fed from
  the `supabase_apikeys` data source instead of hand-copied `TF_VAR`s,
  deleting a manual copy step and three vault fields.

### Decisions and why

- **Supabase Free tier — owner decision** (session B3, PR
  [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36)): $0 against
  the recorded trade-off that idle projects pause after ~1 week; the
  operational rule (check/restore, or upgrade to Pro for the demo window)
  went into `product/feasibility.md`. Region eu-west-3 (Paris) for
  colocation with the fr-par container.
- **Registrar Scaleway; Edge Services Starter plan** (session B4, owner
  decisions, PR [#45](https://github.com/DonHeidi/notebooklm-clone/pull/45)):
  the root zone is native (no delegation step), and Starter + one extra
  pipeline (€4.99/mo) beats Professional (€12.99/10 pipelines) at our
  count of exactly two. The webapp deliberately uses the free native
  container-domain path so it consumes no pipeline.
- **Apex via a redirect function, not a pipeline** (session B4). Edge
  Services is subdomain-only — feasibility F-8's claim was re-verified
  against current docs rather than assumed (no correction needed).
  Functions accept apex hostnames via ALIAS and auto-issue a certificate,
  so the apex gets a real HTTPS 301 with the path preserved.
- **The docs/www CNAMEs are the one exception to DNS-in-Terraform**
  (session B4): Edge Services creates and owns them for Scaleway-managed
  zones, and a Terraform-managed duplicate fails on CNAME uniqueness —
  documented as the exception in `domain.tf`.
- **`supabase_settings` deliberately not instantiated** (session B5, PR
  [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48)). Everything
  configured on the hosted project is auth config, owned as code by
  `supabase/config.toml` + `supabase config push` since B3; every category
  the settings resource exposes has a `config.toml` namespace, so
  importing it would put every `config push` and every `terraform apply`
  in a standing double-ownership fight. The split is drawn at the resource
  boundary (Terraform: project lifecycle + API-key reads; CLI: everything
  `config.toml` models) — a flagged deviation from the brief's letter in
  service of its no-double-ownership intent, accepted in review. The rule
  on record: move a category wholesale or not at all
  (`supabase/AGENTS.md`).
- **The hosted DB password stays out of Terraform state** (session B5).
  Import cannot read it and `ignore_changes = [database_password]` keeps
  it that way; rotation is out-of-band. The `supabase_apikeys` read does
  put the anon + service-role keys in state — the same accepted class as
  B3's `secret_environment_variables` (SEC-6, the only register row B5
  touched). The account token (`SUPABASE_ACCESS_TOKEN`) is keyring-only
  with ephemeral per-command injection, and the provider requires it at
  **every** plan/apply.

### Problems and how they were dealt with

- **`supabase config push` auto-confirms when it detects an agent**
  (session B3): a piped "n" did not abort the first push. Every
  `config push` is an apply, not a preview — recorded in the handover for
  whoever runs it next.
- **First-time Edge Services applies race** (session B4): creating two
  DNS stages in parallel failed one of them (`404 edge_api_key not
  Found`), and the race left a TLS stage in Terraform state that the
  platform had deleted — breaking the docs pipeline until a
  `state rm` + rebuild. Compounding it: stage DELETEs return a bare 500
  while another stage still references them, head-stage drift is invisible
  to `terraform plan` (the platform's `pipeline_missing_head_stage` never
  surfaces there — check the pipeline's `errors[]` via the API), and
  destroying a dns_stage deletes its auto-managed CNAME **without
  recreating it on rebuild** (manual re-add + a no-op PATCH forced
  revalidation). The `www` pipeline, created in one clean serial pass, hit
  none of this — hence the recorded recommendation: `-parallelism=1` for
  first-time Edge Services applies. Six numbered gotchas in the B4
  handover.
- **Scaleway node functions are ESM-only** (session B4): the runtime wraps
  sources as modules, so `module.exports` imports fail with an HTTP 500 —
  the apex redirect uses `export const handle`.
- **A sensitivity mark alone planned a container update** (session B5):
  wiring the provider-sensitive anon key into plain
  `environment_variables` planned an update with byte-identical
  before/after values (only `after_sensitive` changed, verified via plan
  JSON). Fixed with `nonsensitive()` — the anon key is publishable by
  design (SEC-6), already inlined in the client bundle.
- **`legacy_api_keys_enabled` must be explicit** (session B5): the live
  app uses the anon/service-role JWT keys; the attribute is deprecated
  upstream and a null config could have planned disabling them.

### Where infrastructure stands (2026-08-18, after B5)

Two providers (`scaleway/scaleway`, `supabase/supabase`) manage everything
from the container and buckets to the hosted database project and the
`mrgnl.eu` domain; deploys remain workflow-dispatched pipelines, and the
plan gate on the imported project is exit-0 clean. Running cost:
€4.99/mo Edge Services, everything else ~€0 idle. Open: request-rate
limiting (SEC-7), security headers (SEC-9 — Edge Services now concretely
exposes header policies for docs/www), and the undecided D2 analog of B5
(Terraform-managing the Azure Speech resources; B5's provider-limits list
is the recorded decision input).
