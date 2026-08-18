# --- Terraform state bucket ---------------------------------------------------
# Bootstrap chicken-and-egg (B2): this bucket stores the very state that tracks
# it. It was created with `terraform apply` while the state was still local,
# then the state was migrated into it (`terraform init -migrate-state`, see
# versions.tf). From then on the bucket is tracked by the state it stores —
# fine as long as it is never destroyed (versioning below is the safety net).

resource "scaleway_object_bucket" "tfstate" {
  name = "${var.project_name}-tfstate"

  versioning {
    enabled = true
  }
}

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
  name         = "${var.project_name}-webapp"
  namespace_id = scaleway_container_namespace.main.id
  image        = "${scaleway_registry_namespace.main.endpoint}/webapp:${var.webapp_image_tag}"
  port         = 3000
  cpu_limit    = 1000
  # The API rounds 2 GiB (2147483648) down to 2147000000; using the stored
  # value keeps plans drift-free (B2 gotcha 5).
  memory_limit_bytes     = 2147000000
  min_scale              = var.webapp_min_scale # 0 idle / 1 for demo windows (B3)
  max_scale              = 2
  timeout                = 300
  https_connections_only = true

  # NEXT_PUBLIC_* are inlined into the client bundle at image build time (see
  # deploy-webapp.yml build args); they are also set here for server-side
  # reads. Both are publishable values (SEC-6): access is enforced by RLS,
  # not by hiding the anon key. Since B5 the Supabase URL + keys come from
  # the imported project / apikeys data source (supabase.tf) instead of
  # hand-copied TF_VARs.
  environment_variables = {
    SCW_GENERATIVE_APIS_BASE_URL = "https://api.scaleway.ai/${var.scw_project_id}/v1"
    NEXT_PUBLIC_SUPABASE_URL     = local.supabase_url
    # nonsensitive(): the provider marks all API keys sensitive, but the anon
    # key is public by design and already inlined in the client bundle;
    # keeping the mark off also keeps this a plan-level no-op (a sensitivity
    # change alone plans a same-value container update).
    NEXT_PUBLIC_SUPABASE_ANON_KEY = nonsensitive(data.supabase_apikeys.marginalia.anon_key)
    AZURE_SPEECH_REGION           = var.azure_speech_region
    TTS_PROVIDER                  = var.tts_provider
  }

  secret_environment_variables = {
    SCW_GENERATIVE_APIS_KEY   = var.generative_apis_key
    SUPABASE_SERVICE_ROLE_KEY = data.supabase_apikeys.marginalia.service_role_key
    DATABASE_URL              = var.database_url
    AZURE_SPEECH_KEY          = var.azure_speech_key
  }
}
