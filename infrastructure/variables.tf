variable "region" {
  type        = string
  description = "Scaleway region"
  default     = "fr-par"
}

variable "zone" {
  type        = string
  description = "Scaleway zone"
  default     = "fr-par-1"
}

variable "project_name" {
  type        = string
  description = "Prefix for all resource names"
  default     = "marginalia"
}

variable "webapp_image_tag" {
  type        = string
  description = "Tag of the webapp image in the registry namespace"
  default     = "latest"
}

variable "scw_project_id" {
  type        = string
  description = "Target Scaleway project ID (also used to build the project-scoped Generative APIs URL). Set via TF_VAR_scw_project_id."
}

variable "generative_apis_key" {
  type        = string
  description = "Scaleway Generative APIs key (IAM secret key). Set via TF_VAR_generative_apis_key from varlock — never in files."
  sensitive   = true
}
