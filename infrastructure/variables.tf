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
  default     = "notebooklm-clone"
}
