# ============================================
# Terraform - Main Configuration
# ============================================
# Infraestructura GCP para Social Mimic

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Backend remoto para estado compartido
  # Descomentar después de crear el bucket manualmente
  # backend "gcs" {
  #   bucket = "social-mimic-terraform-state"
  #   prefix = "terraform/state"
  # }
}

# ============================================
# Provider Configuration
# ============================================
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ============================================
# Local Values
# ============================================
locals {
  environment = var.environment
  
  labels = {
    project     = "social-mimic"
    environment = var.environment
    managed_by  = "terraform"
  }

  # Service names
  api_service_name = "social-mimic-api${var.environment == "prod" ? "" : "-${var.environment}"}"
}

# ============================================
# Enable Required APIs
# ============================================
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

# ============================================
# Artifact Registry Repository
# ============================================
resource "google_artifact_registry_repository" "docker" {
  provider = google-beta

  location      = var.region
  repository_id = "social-mimic"
  description   = "Docker images for Social Mimic"
  format        = "DOCKER"

  labels = local.labels

  depends_on = [google_project_service.required_apis]
}

# ============================================
# Secret Manager - Secrets
# ============================================
resource "google_secret_manager_secret" "groq_api_key" {
  secret_id = "groq-api-key"
  
  labels = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret" "supabase_url" {
  secret_id = "supabase-url"
  
  labels = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret" "supabase_anon_key" {
  secret_id = "supabase-anon-key"
  
  labels = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

# ============================================
# Service Account for Cloud Run
# ============================================
resource "google_service_account" "cloud_run" {
  account_id   = "social-mimic-cloudrun"
  display_name = "Social Mimic Cloud Run Service Account"
  description  = "Service account for Social Mimic API on Cloud Run"
}

# Grant access to secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_groq" {
  secret_id = google_secret_manager_secret.groq_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_supabase_url" {
  secret_id = google_secret_manager_secret.supabase_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_supabase_key" {
  secret_id = google_secret_manager_secret.supabase_anon_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ============================================
# Cloud Run Service
# ============================================
resource "google_cloud_run_v2_service" "api" {
  name     = local.api_service_name
  location = var.region

  labels = local.labels

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.environment == "prod" ? 1 : 0
      max_instance_count = var.environment == "prod" ? 10 : 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/social-mimic/social-mimic-api:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.environment == "prod" ? "2" : "1"
          memory = var.environment == "prod" ? "1Gi" : "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : var.environment
      }

      env {
        name  = "LOG_LEVEL"
        value = var.environment == "prod" ? "info" : "debug"
      }

      env {
        name = "GROQ_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.groq_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SUPABASE_ANON_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_anon_key.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.required_apis,
    google_artifact_registry_repository.docker,
  ]
}

# Allow unauthenticated access (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Workload Identity for GitHub Actions
# ============================================
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Identity pool for GitHub Actions CI/CD"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_condition = "assertion.repository_owner == '${var.github_owner}'"
}

# Service Account for GitHub Actions
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deploy"
  description  = "Service account for GitHub Actions deployments"
}

# Grant necessary roles to GitHub Actions SA
resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Allow GitHub to impersonate the service account
resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_owner}/${var.github_repo}"
}
