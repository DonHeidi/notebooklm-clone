# Credentials come from the environment (SCW_ACCESS_KEY, SCW_SECRET_KEY,
# SCW_DEFAULT_PROJECT_ID) — resolved via varlock, never written to disk here.
provider "scaleway" {
  region = var.region
  zone   = var.zone
}

# Authenticates via SUPABASE_ACCESS_TOKEN from the environment. The token is
# ACCOUNT-scoped (it controls the whole Supabase org, not just this project):
# it is injected ephemerally at plan/apply time from the system keyring (see
# AGENTS.md) and must never be written to tfvars, .env.local persisted values,
# state, or Proton Pass.
provider "supabase" {}
