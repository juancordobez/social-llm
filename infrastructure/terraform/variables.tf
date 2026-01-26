# ============================================
# Terraform Variables
# ============================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "github_owner" {
  description = "GitHub repository owner (username or org)"
  type        = string
  default     = "juancordobez"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "social-llm"
}
