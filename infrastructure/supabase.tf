# --- Hosted Supabase project (adopted by import in B5 — never recreate) -------
# The live demo database. Adopted into state via the import block below;
# Terraform owns the project's LIFECYCLE only (existence, org, region, name,
# API-key mode). Runtime settings are owned by the Supabase CLI through
# supabase/config.toml (`supabase config push`) — see supabase/AGENTS.md for
# the full tool-ownership split. A plan that proposes to replace or destroy
# this resource must never be applied: the project is a Free-tier instance
# with no backups.

import {
  to = supabase_project.marginalia
  id = "ahphkkvsofqmxkqzbica"
}

resource "supabase_project" "marginalia" {
  # Organization slug (DonHeidi's Org) — an identifier, not a credential;
  # already on public record in the B3 handover.
  organization_id = "lvnsbuzfnbnigvuswtsl"
  name            = var.project_name
  # Paris — colocated with the fr-par Scaleway container (B3 decision).
  region            = "eu-west-3"
  database_password = var.supabase_db_password

  # The deployed webapp authenticates with the anon/service-role JWT keys
  # (B3 wiring); disabling this would break the live app.
  legacy_api_keys_enabled = true

  lifecycle {
    # Prime directive (B5): the hosted project is the live demo DB with no
    # backups. Any plan that wants to replace/destroy it is a bug — stop.
    prevent_destroy = true
    # The Management API never returns the password, so Terraform cannot
    # diff it; managing it post-import would plan a perpetual in-place
    # update. Password rotation happens out-of-band (dashboard/CLI); the
    # variable is only consumed if the project is ever (re)created.
    ignore_changes = [database_password]
  }
}

# API keys read from the Management API at plan time — the container env in
# main.tf is fed from here, so the hosted keys never need to be hand-copied
# into .env.local as TF_VARs (B5; previously TF_VAR_supabase_url/_anon_key/
# _service_role_key). All attributes are provider-marked sensitive.
data "supabase_apikeys" "marginalia" {
  project_ref = supabase_project.marginalia.id
}

locals {
  supabase_url = "https://${supabase_project.marginalia.id}.supabase.co"
}
