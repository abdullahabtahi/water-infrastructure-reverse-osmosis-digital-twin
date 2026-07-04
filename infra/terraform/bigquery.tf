# Warehouse Datasets (FR-003) — 6 role-scoped datasets, empty shells. Table/schema creation
# is Feature 001's concern, not this feature's. All in us-central1 (single-region constraint).

resource "google_bigquery_dataset" "ro_raw" {
  dataset_id  = "ro_raw"
  project     = var.project_id
  location    = var.region
  description = "Verbatim source data (append-only) — banks A-E and F-G raw readings."
  labels      = { product = "oceanus", layer = "raw" }

  depends_on = [google_project_service.enabled]
}

resource "google_bigquery_dataset" "ro_curated" {
  dataset_id  = "ro_curated"
  project     = var.project_id
  location    = var.region
  description = "Cleaned, normalized, enriched data (Dataform outputs) — harmonized core."
  labels      = { product = "oceanus", layer = "curated" }

  depends_on = [google_project_service.enabled]
}

resource "google_bigquery_dataset" "ro_serving" {
  dataset_id  = "ro_serving"
  project     = var.project_id
  location    = var.region
  description = "Materialized views, pre-aggregated KPIs for the UI."
  labels      = { product = "oceanus", layer = "serving" }

  depends_on = [google_project_service.enabled]
}

resource "google_bigquery_dataset" "ro_simulation" {
  dataset_id  = "ro_simulation"
  project     = var.project_id
  location    = var.region
  description = "WaterTAP clean-membrane baseline outputs + physics deviation scores."
  labels      = { product = "oceanus", layer = "simulation" }

  depends_on = [google_project_service.enabled]
}

resource "google_bigquery_dataset" "ro_forecasts" {
  dataset_id  = "ro_forecasts"
  project     = var.project_id
  location    = var.region
  description = "AI.FORECAST outputs (production, LCOW, energy, SEC)."
  labels      = { product = "oceanus", layer = "forecasts" }

  depends_on = [google_project_service.enabled]
}

resource "google_bigquery_dataset" "ro_embeddings" {
  dataset_id  = "ro_embeddings"
  project     = var.project_id
  location    = var.region
  description = "Document/event embeddings for VECTOR_SEARCH (RAG)."
  labels      = { product = "oceanus", layer = "embeddings" }

  depends_on = [google_project_service.enabled]
}
