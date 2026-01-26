# ============================================
# Terraform Outputs
# ============================================

output "cloud_run_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

output "github_actions_service_account" {
  description = "GitHub Actions service account email"
  value       = google_service_account.github_actions.email
}

output "workload_identity_provider" {
  description = "Workload Identity Provider for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github.name
}

# Outputs for GitHub Secrets (copy these to repo secrets)
output "github_secrets_config" {
  description = "Configuration values to add as GitHub repository secrets"
  value = {
    GCP_PROJECT_ID                  = var.project_id
    GCP_SERVICE_ACCOUNT             = google_service_account.github_actions.email
    GCP_WORKLOAD_IDENTITY_PROVIDER  = google_iam_workload_identity_pool_provider.github.name
  }
}
