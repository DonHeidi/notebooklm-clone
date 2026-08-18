# infrastructure — agent guide

Terraform for Scaleway. Provider: `scaleway/scaleway` (version constraint in
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
