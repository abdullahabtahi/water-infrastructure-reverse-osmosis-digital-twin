# Cloud Storage buckets — raw source data, Dataform workspace, and build/model artifacts.
# Object contents are later features' concern; this feature creates the buckets only.

resource "google_storage_bucket" "raw_data" {
  name                        = "${var.project_id}-raw-data"
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  labels                      = { product = "oceanus", purpose = "raw-data" }

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.enabled]
}

resource "google_storage_bucket" "dataform" {
  name                        = "${var.project_id}-dataform"
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  labels                      = { product = "oceanus", purpose = "dataform" }

  depends_on = [google_project_service.enabled]
}

resource "google_storage_bucket" "artifacts" {
  name                        = "${var.project_id}-artifacts"
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  labels                      = { product = "oceanus", purpose = "artifacts" }

  depends_on = [google_project_service.enabled]
}
