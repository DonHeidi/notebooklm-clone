# Session B5 — Hosted Supabase under Terraform (2026-08-18)

## Goal

`feat/supabase-terraform`: bring the EXISTING hosted Supabase project
(ref `ahphkkvsofqmxkqzbica` — live demo DB, Free tier, no backups) under
the official `supabase/supabase` Terraform provider by **import only**, so
environment lifecycle collapses into the existing Terraform flow.

## What landed

- **Provider:** `supabase/supabase` `~> 1.10` (registry-resolved 1.10.1 at
  init; lock file updated). Auth via `SUPABASE_ACCESS_TOKEN` only.
- **Import (the prime-directive gate):** `supabase_project.marginalia`
  adopted via an import block. The very first plan already showed the
  strictest possible result — **no settings alignment was needed at all**:

  ```
  # supabase_project.marginalia will be imported
  Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
  Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
  ```

  Post-adoption `terraform plan -detailed-exitcode` → **exit 0, "No
  changes."** The resource carries `prevent_destroy = true`; the import
  block stays in `supabase.tf` as a permanent record (idempotent once the
  resource is in state).
- **API-key wiring (evaluated → implemented):** container env now reads
  `NEXT_PUBLIC_SUPABASE_URL` (derived from the project ref),
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from the
  `supabase_apikeys` data source instead of hand-copied TF_VARs. Reasoning:
  the provider makes the token mandatory at every plan anyway (it refreshes
  the project), so the data source costs nothing extra and deletes a manual
  copy step + three vault fields. The plan stayed byte-identical (see
  gotcha 1). `TF_VAR_supabase_url/_anon_key/_service_role_key` are legacy
  (annotated in `.env.schema`; safe to prune from `.env.local` and the
  vault). `TF_VAR_database_url` remains a var — the pooler URL embeds the
  DB password, which Terraform cannot read (below).
- **Settings-as-code decision — `supabase_settings` deliberately NOT
  instantiated.** Everything actually configured on the hosted project
  today is auth config, owned by `supabase/config.toml` `[remotes.demo]` +
  `supabase config push` (B3). Every category the settings resource exposes
  (api, auth, database, network, pooler, storage, ssl_enforcement) has a
  `config.toml` namespace, so importing the resource would put every
  `config push` and every `terraform apply` in a standing double-ownership
  fight. The split is drawn at the resource boundary instead — Terraform:
  project lifecycle + API-key reads; CLI: migrations, storage policies, and
  all `config.toml`-modeled settings — documented in `supabase/AGENTS.md`.
  This deviates from the brief's letter ("manage supabase_settings for what
  is actually configured today") in service of its no-double-ownership
  requirement; flagged for foreman review in the PR.
- **Secrets:** the hosted **DB password is NOT in Terraform state** —
  import cannot read it and `ignore_changes = [database_password]` keeps it
  that way (it would land in state only if the project were ever
  recreated; rotation is out-of-band). New state residents instead: the
  `supabase_apikeys` read (anon + service-role keys — same accepted class
  as B3's container secrets; the service-role key was already in state).
  The account token stays keyring-only with ephemeral per-command
  injection. SEC-6 mitigation column updated accordingly (only row
  touched). Outputs re-checked: 4, all non-sensitive endpoints.
- **`.env.schema`:** `TF_VAR_supabase_db_password=${SUPABASE_DB_PASSWORD}`
  and `TF_VAR_azure_speech_key=${AZURE_SPEECH_KEY}` now derive via varlock
  `${VAR}` expansion (verified working, incl. forward references) — B3 had
  declared `TF_VAR_azure_speech_key` but `.env.local` never carried it, so
  applies silently depended on a manual mapping; corrected on record here.

## Gotchas for future sessions

1. **A sensitivity-mark change alone plans a container update.** Wiring the
   provider-sensitive `anon_key` into plain `environment_variables` planned
   an `update` on `scaleway_container.webapp` with **byte-identical
   before/after values** (verified via plan JSON) — only `after_sensitive`
   changed. Fix: `nonsensitive()` on the anon key (public by design,
   SEC-6), which restored a true no-op. Terraform ≥1.7 makes
   `nonsensitive()` a no-op rather than an error if the value ever stops
   being marked.
2. `legacy_api_keys_enabled = true` must be explicit: the live app uses the
   anon/service-role JWT keys; the attribute is deprecated upstream
   (validate warns) but config-null could plan disabling them.
3. The provider needs `SUPABASE_ACCESS_TOKEN` for **every** plan/apply now.
   Keyring retrieval that never echoes:
   `secret-tool lookup service "Supabase CLI" username supabase` (full
   wrapper in `infrastructure/AGENTS.md`).
4. Org slug + region for the resource were grounded via a read-only
   Management API GET before writing config (a wrong `organization_id`
   would have planned a **replace** — prime-directive territory).

## What the provider still cannot manage (input for the D2 Azure analog)

v1.10.1 surface: resources `project`, `settings`, `apikey`, `branch`,
`edge_function`, `third_party_auth`; data sources `apikeys`, `pooler`.
Not covered — stays with the Supabase CLI forever (not a temporary gap):

- migrations / any SQL DDL
- storage buckets + storage RLS policies (live in migrations here)
- auth providers/rate limits/redirect URLs as *typed* config (only as an
  opaque settings JSON, which is why config.toml keeps them)
- project pause/restore (the Free-tier pause before demo still needs the
  dashboard), backups, custom domains, log drains
- the database password (write-only at create; unreadable thereafter)

Relevance to D2: TF-managing the Azure Speech resource would be the same
pattern (import-only adoption of a live resource, secrets write-only, a
CLI/portal keeping part of the surface). B5's outcome suggests it is
workable but only worth it if the plan gate lands this clean; the
decision remains open and is not implemented here.

## Verification evidence

- `terraform fmt -check`: clean; `validate`: success (one upstream
  deprecation warning on `legacy_api_keys_enabled`, expected).
- Import apply: `1 imported, 0 added, 0 changed, 0 destroyed`.
- Final `terraform plan -detailed-exitcode` (documented wrapper, schema-
  derived TF_VARs): **exit 0 — "No changes. Your infrastructure matches
  the configuration."**
- No secret values printed anywhere in the session; plans were inspected
  via a names-only JSON summarizer; vault/keyring checked by field names.
