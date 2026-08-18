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

variable "webapp_min_scale" {
  type        = number
  description = "Container min-scale. 0 = scale-to-zero (~€0 idle, ~4 s cold start); 1 = always warm (~€35/mo). Flip to 1 for demo windows: -var webapp_min_scale=1."
  default     = 0
}

variable "supabase_url" {
  type        = string
  description = "Hosted Supabase project URL (https://<ref>.supabase.co). Publishable."
}

variable "supabase_anon_key" {
  type        = string
  description = "Supabase anon/publishable key — safe to expose to browsers (RLS enforces access); kept out of the repo anyway. Set via TF_VAR_supabase_anon_key."
}

variable "supabase_service_role_key" {
  type        = string
  description = "Supabase service-role key — bypasses RLS, server only. Set via TF_VAR_supabase_service_role_key from .env.local — never in files."
  sensitive   = true
}

variable "database_url" {
  type        = string
  description = "Pooled Postgres connection string (Supabase transaction pooler, port 6543; app uses prepare:false). Contains the DB password. Set via TF_VAR_database_url."
  sensitive   = true
}

variable "azure_speech_key" {
  type        = string
  description = "Azure AI Speech resource key (TTS, feasibility D-8). Set via TF_VAR_azure_speech_key."
  sensitive   = true
}

variable "azure_speech_region" {
  type        = string
  description = "Azure region of the Speech resource (D-8: swedencentral)."
  default     = "swedencentral"
}

variable "tts_provider" {
  type        = string
  description = "TtsProvider adapter the webapp uses (see .env.schema)."
  default     = "azure"
}
