# Credentials come from the environment (SCW_ACCESS_KEY, SCW_SECRET_KEY,
# SCW_DEFAULT_PROJECT_ID) — resolved via varlock, never written to disk here.
provider "scaleway" {
  region = var.region
  zone   = var.zone
}
