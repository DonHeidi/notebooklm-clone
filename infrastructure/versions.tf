terraform {
  required_version = ">= 1.15"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.81"
    }
  }

  # State is local for now. Once the Scaleway environment exists, migrate to
  # the S3-compatible backend (`terraform init -migrate-state`):
  #
  # backend "s3" {
  #   bucket                      = "notebooklm-clone-tfstate"
  #   key                         = "terraform.tfstate"
  #   region                      = "fr-par"
  #   endpoints                   = { s3 = "https://s3.fr-par.scw.cloud" }
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  # }
}
