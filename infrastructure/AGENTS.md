# infrastructure — agent guide

Terraform for Scaleway plus the hosted Supabase project. Providers:
`scaleway/scaleway` and `supabase/supabase` (version constraints in
`versions.tf` — when bumping, check the registry for the latest, don't guess).

## State

Remote state on the Scaleway S3-compatible backend (bucket
`marginalia-tfstate`, versioned; backend block in `versions.tf`; migrated in
session B2). The s3 backend does not read `SCW_*` variables — every state
touching command needs the same credentials exported under AWS names:

```sh
AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY \
  mise exec -- terraform <cmd>
```

There is no state locking (no DynamoDB equivalent on Scaleway) — coordinate
manually; only one person/pipeline runs apply at a time.

## Supabase provider (B5)

The hosted Supabase project (`supabase_project.marginalia`, ref
`ahphkkvsofqmxkqzbica` — the live demo DB, Free tier, **no backups**) was
**adopted by import** in B5; Terraform owns its lifecycle only. Runtime
settings stay with the Supabase CLI — see `supabase/AGENTS.md` for the
tool-ownership split.

- **Token:** the provider authenticates via `SUPABASE_ACCESS_TOKEN`, needed
  at every plan/apply since the provider refreshes the project + API keys.
  The token is **account-scoped** (controls the whole Supabase org): it
  lives only in the system keyring (written by `supabase login`) and is
  injected ephemerally per command — never write it to `.env.local`,
  tfvars, state, outputs, or Proton Pass. Retrieval that never echoes:
  `SUPABASE_ACCESS_TOKEN=$(secret-tool lookup service "Supabase CLI" username supabase)`.
- **Full command wrapper** (state creds + token + TF_VARs via varlock):

  ```sh
  bunx varlock run -- bash -c '
    export AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY
    export SUPABASE_ACCESS_TOKEN=$(secret-tool lookup service "Supabase CLI" username supabase)
    mise exec -- terraform -chdir=infrastructure <cmd>
  '
  ```

- **Import gate (standing rule):** the project resource carries
  `prevent_destroy`; a plan that proposes to **replace or destroy**
  `supabase_project.marginalia` is a bug in the config, never something to
  apply — stop and investigate (org/region/name changes force replacement).
  `database_password` is under `ignore_changes`: the API can't return it,
  rotation happens out-of-band (dashboard/CLI), and it is currently *not*
  in state (import couldn't read it; it would land there only on a
  hypothetical recreation).
- The container's Supabase URL + anon/service-role keys come from the
  `supabase_apikeys` data source (`supabase.tf`), not TF_VARs — the data
  source read persists those keys in state (same accepted class as the
  container secrets, SEC-6).

## Containers API gotchas (verified 2026-08-18)

- Endpoint family is `containers/v1` (not v1beta1); the image field is
  `image` (`registry_image` is gone); the URL field is `public_endpoint`.
- **Rollout semantics:** a PATCH that changes `image` starts a rollout by
  itself (`status` → `updating`). POST `/redeploy` is required **only** when
  the PATCH was a no-op (same image), and calling it while a rollout is in
  progress returns 4xx. (`deploy-webapp.yml` encodes this; first learned the
  hard way in the failed first dispatch, fixed in PR #19.)

## Resources

- Object-storage website buckets for `apps/docs` and `apps/marketing`,
  plus the versioned `marginalia-tfstate` bucket (S3 backend, B2).
- Registry namespace + container namespace for the webapp; the
  `scaleway_container` resource is **live** (`marginalia-webapp`, min-scale
  0) since B1/B2 — deployed via the `deploy-webapp` workflow.
  *(Corrected 2026-08-18 — this line previously claimed the resource "stays
  commented until a first image is pushed", stale since B1; found by C5's
  architecture audit.)*
- The hosted Supabase project (`supabase.tf`, imported in B5 — see the
  Supabase provider section above) + the `supabase_apikeys` data source
  feeding the container env.

## Working rules

- Run Terraform via mise: `mise exec -- terraform <cmd>`.
- Credentials come from env vars (`SCW_ACCESS_KEY`, `SCW_SECRET_KEY`,
  `SCW_DEFAULT_PROJECT_ID`) declared in the root `.env.schema` and resolved via
  varlock/Proton Pass. Never write credentials into `.tf`/`.tfvars` files.
- Always `terraform fmt` and `terraform validate` after changes.
- Never `terraform apply` (or plan against real credentials) without explicit
  confirmation from a human.
