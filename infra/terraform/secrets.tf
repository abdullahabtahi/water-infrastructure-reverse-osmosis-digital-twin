# Secret containers ONLY (FR-007, FR-008 HARD GATE) — deliberately no google_secret_manager_secret_version
# resource. Values are set out-of-band via scripts/set_secret.sh, piped straight into
# `gcloud secrets versions add`, and never touch a Terraform variable, tfvars file, or state.

resource "google_secret_manager_secret" "eia_api_key" {
  secret_id = "eia-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = { product = "oceanus" }

  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret" "watertap_engine_url" {
  secret_id = "watertap-engine-url"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = { product = "oceanus" }

  depends_on = [google_project_service.enabled]
}
