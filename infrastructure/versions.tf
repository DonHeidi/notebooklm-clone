terraform {
  required_version = ">= 1.15"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.81"
    }
    # Zips the apex-redirect function sources (domain.tf).
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
  }

  # Remote state on Scaleway Object Storage (migrated in session B2; the
  # bucket is scaleway_object_bucket.tfstate in main.tf, versioning enabled).
  # The s3 backend does NOT read SCW_* variables — export the same values as
  # AWS credentials before any terraform command that touches state:
  #   AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY
  # No state locking: Scaleway has no DynamoDB equivalent and native S3
  # lockfiles are unverified here — acceptable single-operator prototype risk.
  backend "s3" {
    bucket                      = "marginalia-tfstate"
    key                         = "terraform.tfstate"
    region                      = "fr-par"
    endpoints                   = { s3 = "https://s3.fr-par.scw.cloud" }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    # Scaleway rejects the AWS SDK's newer checksum headers.
    skip_s3_checksum = true
  }
}
