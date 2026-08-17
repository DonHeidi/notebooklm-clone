# --- Static sites: docs + marketing (object storage website buckets) --------

resource "scaleway_object_bucket" "docs" {
  name = "${var.project_name}-docs"
}

resource "scaleway_object_bucket_website_configuration" "docs" {
  bucket = scaleway_object_bucket.docs.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "scaleway_object_bucket" "marketing" {
  name = "${var.project_name}-marketing"
}

resource "scaleway_object_bucket_website_configuration" "marketing" {
  bucket = scaleway_object_bucket.marketing.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# --- Webapp: container registry + serverless container -----------------------

resource "scaleway_registry_namespace" "main" {
  name      = var.project_name
  is_public = false
}

resource "scaleway_container_namespace" "main" {
  name = var.project_name
}

# Image push (until B2 wires CI): build + push with
# `bunx varlock run -- ./infrastructure/scripts/push-webapp.sh <tag>`
# then `terraform apply -var webapp_image_tag=<tag>`.
resource "scaleway_container" "webapp" {
  name                   = "${var.project_name}-webapp"
  namespace_id           = scaleway_container_namespace.main.id
  image                  = "${scaleway_registry_namespace.main.endpoint}/webapp:${var.webapp_image_tag}"
  port                   = 3000
  cpu_limit              = 1000
  memory_limit_bytes     = 2 * 1024 * 1024 * 1024
  min_scale              = 0 # spike S-1 measures cold starts; demo mode (B3) raises this
  max_scale              = 2
  timeout                = 300
  https_connections_only = true

  environment_variables = {
    SCW_GENERATIVE_APIS_BASE_URL = "https://api.scaleway.ai/${var.scw_project_id}/v1"
  }

  secret_environment_variables = {
    SCW_GENERATIVE_APIS_KEY = var.generative_apis_key
  }
}
