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

# The container itself is added once a first image is pushed to the registry;
# until then there is nothing to deploy.
#
# resource "scaleway_container" "webapp" {
#   name           = "${var.project_name}-webapp"
#   namespace_id   = scaleway_container_namespace.main.id
#   registry_image = "${scaleway_registry_namespace.main.endpoint}/webapp:latest"
#   port           = 3000
#   min_scale      = 0
#   max_scale      = 2
# }
