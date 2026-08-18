# --- Custom domain: mrgnl.eu (session B4) ------------------------------------
# The domain is registered through Scaleway Domains, so its root DNS zone is
# native to the account — records are managed here directly.
#
# Host layout (feasibility F-8; Edge Services is SUBDOMAIN-ONLY, verified
# 2026-08-18 against the Edge Services docs):
#   app.mrgnl.eu   -> webapp container   (native container domain, free TLS)
#   docs.mrgnl.eu  -> docs bucket        (Edge Services pipeline, managed LE cert)
#   www.mrgnl.eu   -> marketing bucket   (Edge Services pipeline, managed LE cert)
#   mrgnl.eu       -> 301 to www         (serverless function: the one mechanism
#                                         that serves an apex with valid HTTPS —
#                                         functions accept apex hostnames via
#                                         ALIAS and auto-issue a certificate)

# --- Webapp: native container custom domain ----------------------------------
# CNAME to the container endpoint + domain binding; the platform issues the
# TLS certificate via HTTP-01 (validated within ~3 minutes of DNS resolving).

resource "scaleway_domain_record" "app" {
  dns_zone = var.domain
  name     = "app"
  type     = "CNAME"
  data     = format("%s.", trimprefix(scaleway_container.webapp.public_endpoint, "https://"))
  ttl      = 3600
}

resource "scaleway_container_domain" "app" {
  container_id = scaleway_container.webapp.id
  hostname     = "app.${var.domain}"

  depends_on = [scaleway_domain_record.app]
}

# --- Static sites: Edge Services pipelines (docs + www) -----------------------
# Starter plan (€0.99/mo, 1 pipeline included) + €4/mo for the second pipeline
# — cheapest fit for exactly 2 pipelines (Professional is €12.99/10). Owner
# approved 2026-08-18. Minimal stage chain per site:
#   dns (custom fqdn) -> tls (managed Let's Encrypt) -> backend (bucket website)

resource "scaleway_edge_services_plan" "main" {
  name = "starter"
}

locals {
  edge_sites = {
    docs = { bucket = scaleway_object_bucket.docs.name, host = "docs.${var.domain}" }
    www  = { bucket = scaleway_object_bucket.marketing.name, host = "www.${var.domain}" }
  }
}

resource "scaleway_edge_services_pipeline" "site" {
  for_each    = local.edge_sites
  name        = "${var.project_name}-${each.key}"
  description = "${each.value.host} -> bucket website ${each.value.bucket}"

  depends_on = [scaleway_edge_services_plan.main]
}

resource "scaleway_edge_services_backend_stage" "site" {
  for_each    = local.edge_sites
  pipeline_id = scaleway_edge_services_pipeline.site[each.key].id

  s3_backend_config {
    bucket_name   = each.value.bucket
    bucket_region = var.region
    is_website    = true
  }
}

resource "scaleway_edge_services_tls_stage" "site" {
  for_each            = local.edge_sites
  pipeline_id         = scaleway_edge_services_pipeline.site[each.key].id
  backend_stage_id    = scaleway_edge_services_backend_stage.site[each.key].id
  managed_certificate = true
}

resource "scaleway_edge_services_dns_stage" "site" {
  for_each     = local.edge_sites
  pipeline_id  = scaleway_edge_services_pipeline.site[each.key].id
  tls_stage_id = scaleway_edge_services_tls_stage.site[each.key].id
  fqdns        = [each.value.host]
}

resource "scaleway_edge_services_head_stage" "site" {
  for_each      = local.edge_sites
  pipeline_id   = scaleway_edge_services_pipeline.site[each.key].id
  head_stage_id = scaleway_edge_services_dns_stage.site[each.key].id
}

# NOTE (verified at apply, 2026-08-18): the docs/www CNAMEs are the one
# exception to records-in-code. When the fqdn's zone is Scaleway-managed,
# Edge Services creates and OWNS the CNAME to its pipeline endpoint itself
# (TTL 60, target <pipeline>.svc.edge.scw.cloud) — Terraform-managing a
# duplicate fails (CNAME uniqueness) and would fight the platform's
# self-management. Caveat: destroying a dns_stage deletes its CNAME, but
# recreating one via the API does NOT re-add it — re-add the record
# manually (same TTL-60 shape) and no-op PATCH the dns_stage to force
# revalidation (see the B4 handover, gotcha 6).

# --- Apex: mrgnl.eu -> 301 https://www.mrgnl.eu -------------------------------
# Edge Services cannot serve the apex; a minimal serverless function can
# (apex hostname via ALIAS, auto-issued certificate). ~€0 within free tier.

data "archive_file" "apex_redirect" {
  type        = "zip"
  source_dir  = "${path.module}/functions/apex-redirect"
  output_path = "${path.module}/.terraform/tmp/apex-redirect.zip"
}

resource "scaleway_function_namespace" "main" {
  name = var.project_name
}

resource "scaleway_function" "apex_redirect" {
  namespace_id = scaleway_function_namespace.main.id
  name         = "apex-redirect"
  runtime      = "node24"
  handler      = "handler.handle"
  privacy      = "public"
  min_scale    = 0
  max_scale    = 1
  memory_limit = 128
  http_option  = "redirected"
  zip_file     = data.archive_file.apex_redirect.output_path
  zip_hash     = data.archive_file.apex_redirect.output_sha256
  deploy       = true
}

resource "scaleway_domain_record" "apex" {
  dns_zone = var.domain
  name     = ""
  type     = "ALIAS"
  data     = format("%s.", scaleway_function.apex_redirect.domain_name)
  ttl      = 3600
}

resource "scaleway_function_domain" "apex" {
  function_id = scaleway_function.apex_redirect.id
  hostname    = var.domain

  depends_on = [scaleway_domain_record.apex]
}
