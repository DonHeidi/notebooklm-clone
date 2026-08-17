# infrastructure — agent guide

Terraform for Scaleway. Provider: `scaleway/scaleway` (version constraint in
`versions.tf` — when bumping, check the registry for the latest, don't guess).

## State

Local state for now (`terraform.tfstate`, gitignored). Planned migration to the
Scaleway S3-compatible backend once the environment exists — the backend block
is prepared (commented) in `versions.tf`; migrate with
`terraform init -migrate-state`.

## Resources

- Object-storage website buckets for `apps/docs` and `apps/marketing`.
- Registry namespace + container namespace for the webapp; the
  `scaleway_container` resource stays commented until a first image is pushed.

## Working rules

- Run Terraform via mise: `mise exec -- terraform <cmd>`.
- Credentials come from env vars (`SCW_ACCESS_KEY`, `SCW_SECRET_KEY`,
  `SCW_DEFAULT_PROJECT_ID`) declared in the root `.env.schema` and resolved via
  varlock/Proton Pass. Never write credentials into `.tf`/`.tfvars` files.
- Always `terraform fmt` and `terraform validate` after changes.
- Never `terraform apply` (or plan against real credentials) without explicit
  confirmation from a human.
