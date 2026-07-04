# Service Identities (FR-005, FR-006) — 4 least-privilege service accounts + operator access.
# Matches contracts/iam-role-matrix.md exactly. NOTE: Cloud Run `roles/run.invoker` bindings
# (adk-agent@ -> watertap-engine, serving-api@ -> platform-healthcheck) are NOT declared here —
# those Cloud Run services are owned by scripts/deploy_service.sh (gcloud), not Terraform, so
# their IAM bindings are set imperatively by that same script at deploy time (see
# contracts/deploy-path-contract.md) to avoid referencing a resource Terraform doesn't manage.

resource "google_service_account" "watertap_engine" {
  account_id   = "watertap-engine"
  project      = var.project_id
  display_name = "Oceanus WaterTAP Physics Engine (Feature 003)"
}

resource "google_service_account" "serving_api" {
  account_id   = "serving-api"
  project      = var.project_id
  display_name = "Oceanus Serving API (Feature 008)"
}

resource "google_service_account" "adk_agent" {
  account_id   = "adk-agent"
  project      = var.project_id
  display_name = "Oceanus Diagnostic ADK Agent (Feature 007)"
}

resource "google_service_account" "dataform" {
  account_id   = "dataform"
  project      = var.project_id
  display_name = "Oceanus Dataform Transforms (Feature 001)"
}

# --- watertap-engine@: bigquery.dataEditor on ro_simulation only ---
resource "google_bigquery_dataset_iam_member" "watertap_engine_simulation_editor" {
  dataset_id = google_bigquery_dataset.ro_simulation.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.watertap_engine.email}"
}

# --- serving-api@: bigquery.dataViewer on ro_serving + ro_forecasts ---
resource "google_bigquery_dataset_iam_member" "serving_api_serving_viewer" {
  dataset_id = google_bigquery_dataset.ro_serving.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.serving_api.email}"
}

resource "google_bigquery_dataset_iam_member" "serving_api_forecasts_viewer" {
  dataset_id = google_bigquery_dataset.ro_forecasts.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.serving_api.email}"
}

# --- adk-agent@: bigquery.dataViewer on all 6 datasets (cross-capability orchestration) ---
resource "google_bigquery_dataset_iam_member" "adk_agent_viewer" {
  for_each = {
    raw        = google_bigquery_dataset.ro_raw.dataset_id
    curated    = google_bigquery_dataset.ro_curated.dataset_id
    serving    = google_bigquery_dataset.ro_serving.dataset_id
    simulation = google_bigquery_dataset.ro_simulation.dataset_id
    forecasts  = google_bigquery_dataset.ro_forecasts.dataset_id
    embeddings = google_bigquery_dataset.ro_embeddings.dataset_id
  }

  dataset_id = each.value
  project    = var.project_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.adk_agent.email}"
}

# --- dataform@: bigquery.dataEditor on ro_curated, ro_serving, ro_forecasts, ro_embeddings ---
resource "google_bigquery_dataset_iam_member" "dataform_editor" {
  for_each = {
    curated    = google_bigquery_dataset.ro_curated.dataset_id
    serving    = google_bigquery_dataset.ro_serving.dataset_id
    forecasts  = google_bigquery_dataset.ro_forecasts.dataset_id
    embeddings = google_bigquery_dataset.ro_embeddings.dataset_id
  }

  dataset_id = each.value
  project    = var.project_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.dataform.email}"
}

# --- Operator (human) day-to-day access — deliberately NOT roles/owner or roles/editor ---
resource "google_project_iam_member" "operator_bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "user:abdullahabtahi21@gmail.com"
}

resource "google_project_iam_member" "operator_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "user:abdullahabtahi21@gmail.com"
}

resource "google_project_iam_member" "operator_logging_viewer" {
  project = var.project_id
  role    = "roles/logging.viewer"
  member  = "user:abdullahabtahi21@gmail.com"
}
