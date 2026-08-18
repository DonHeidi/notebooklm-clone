# Session B2 — CI + deploy pipelines + Terraform state to S3 (2026-08-18)

## Goal

CI on every PR, deploy pipelines for the webapp and both static sites, and
Terraform state moved off local disk (`feat/ci-deploy`, PR #13).

## What was done

- **`.github/workflows/ci.yml`** — pull_request + push to main. Bun/Terraform
  installed via `jdx/mise-action@v4` from `mise.toml`. Steps: `bun install
  --frozen-lockfile` → webapp eslint → webapp typecheck (`next typegen` +
  `tsc --noEmit`) → `bun test` → build all three apps; second job runs
  `terraform fmt -check` + `terraform validate` (`init -backend=false`, no
  credentials). The webapp build uses obviously-fake placeholder
  `NEXT_PUBLIC_SUPABASE_*` values via workflow env (build-time only).
- **`.github/workflows/deploy-webapp.yml`** (workflow_dispatch) — docker build
  from B1's Dockerfile → push `:sha-<12>` + `:latest` to
  `rg.fr-par.scw.cloud/marginalia` → Containers v1 API: PATCH `image`, POST
  `redeploy`, poll until `ready` → smoke test expects HTTP 307 (auth proxy).
- **`.github/workflows/deploy-static-sites.yml`** (workflow_dispatch) — build
  docs + marketing, `aws s3 sync --delete --acl public-read` to the website
  buckets via `https://s3.fr-par.scw.cloud`.
- **`apps/webapp/Dockerfile`** — new build args
  `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` (A2 made them build-time-required;
  they're publishable values inlined into the client bundle).
- **Terraform** — new `scaleway_object_bucket.tfstate` (`marginalia-tfstate`,
  versioning enabled); s3 backend block enabled in `versions.tf` (with
  `skip_s3_checksum` for Scaleway); state migrated (see below);
  `infrastructure/AGENTS.md` state section rewritten.

## State migration (bootstrap)

The state bucket cannot live in the state it stores at creation time. Order
used: bucket created via `terraform apply -target=scaleway_object_bucket.tfstate`
against the still-local state → backend block enabled →
`terraform init -migrate-state` → local tfstate deleted in the worktree.
From then on the bucket is tracked by the state it stores (never destroy it;
versioning is the safety net). The s3 backend needs the Scaleway keys as
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (docs in `infrastructure/AGENTS.md`).
**The old `infrastructure/terraform.tfstate` in the main checkout is obsolete**
— foreman deletes it (outside this worktree).

Outcome (2026-08-18): targeted plan showed exactly `1 to add, 0 to change,
0 to destroy`; applied; `terraform init -migrate-state` succeeded;
`terraform state list` reads all 8 resources from the backend;
`aws s3api get-bucket-versioning` → `Enabled`; local tfstate deleted here.

## Deployed (approved by owner, 2026-08-18)

- **Webapp** — image `rg.fr-par.scw.cloud/marginalia/webapp:sha-dd7fa6ae2056`
  (+ `:latest`, same digest `de1409c9b943`, 409 MB), container updated via
  Containers v1 API, `ready` in ~20 s. Smoke test (A2's auth proxy — the
  once-public spike route is now behind auth):

  ```
  GET /                 HTTP 307 -> .../login  (TTFB 0.31 s)
  GET /api/spike-stream HTTP 307 -> .../login  (TTFB 0.09 s)
  ```

  URL: https://marginalia6bb21b06-marginalia-webapp.functions.fnc.fr-par.scw.cloud
- **Docs** — https://marginalia-docs.s3-website.fr-par.scw.cloud (HTTP 200)
- **Marketing** — https://marginalia-marketing.s3-website.fr-par.scw.cloud (HTTP 200)

The one-time deploy ran the workflow steps locally (see gotcha 4); the image
was built from this branch, whose app content is identical to main + the
Dockerfile build args (main's Dockerfile alone no longer builds since A2 —
the build args commit is required).

## Gotchas found

1. **PGlite + Bun exit-99 quirk**: `bun test` exits with code 99 despite `0
   fail` whenever a test instantiates PGlite (repro: trivial test, open →
   query → close; Node exits 0, Bun 1.3.14 + pglite 0.5.5 exits 99; closing
   the client changes nothing). Local runs never noticed because nobody
   checks `$?` by hand. CI accepts exactly the `exit 99 && "0 fail"`
   signature and fails everything else. Worth an upstream report; A-lane
   should know it exists.
2. **PGlite cold init can blow bun's 5 s hook timeout on CI runners** — the
   first `new PGlite()` (WASM compile) intermittently took >5 s on a GitHub
   runner, failing a repository test file's `beforeAll` as `(fail) (unnamed)`.
   CI runs `bun test --timeout 30000`; A-lane may want the same locally on
   slow machines.
3. **Containers API is `containers/v1` now** (not v1beta1): field is `image`
   (`registry_image` is gone, matching the provider deprecations B1 hit) and
   a PATCH does **not** roll out on its own — POST `/redeploy` is required.
   > **Correction (2026-08-18, foreman, PR #19):** wrong for image changes —
   > an image-changing PATCH **does** start a rollout (`status: updating`),
   > and calling `/redeploy` during that rollout returns 4xx (this failed the
   > first Actions dispatch). `/redeploy` is needed only when the PATCH was a
   > no-op (same image). Authoritative rules: `infrastructure/AGENTS.md` §
   > Containers API gotchas.
4. **Deploy workflows are not dispatchable until merged** — GitHub only
   indexes `workflow_dispatch` workflows from the default branch. The
   one-time deploy of this session ran the identical steps locally; first
   post-merge dispatch of both workflows is a good foreman follow-up.
5. **`memory_limit_bytes` drift**: config says `2 * 1024^3` (2147483648) but
   the API stored 2147000000, so unrestricted plans show a benign in-place
   container update. Not fixed here (kept the apply strictly targeted);
   consider aligning the config value to 2147000000.

## Secrets created (names only, `gh secret set`)

`SCW_ACCESS_KEY`, `SCW_SECRET_KEY` (from Proton Pass via local `.env.local`);
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**placeholders**
— no hosted Supabase exists yet; replace in B3/A-lane when one does).

## Cost delta

tfstate bucket (KBs, versioned) ~€0; site buckets now hold built assets ~€0;
container unchanged at min-scale 0 / max 2. No new always-on resources.

## Next (B3)

Supabase Pro + real `NEXT_PUBLIC_SUPABASE_*` secrets, demo-mode min-scale 1,
Edge Services/custom domains, optional auto-deploy on main.
