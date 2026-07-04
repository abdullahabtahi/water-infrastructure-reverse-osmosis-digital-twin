# Managed Service Set (FR-002) — deliberately minimal. Every entry maps to a concrete,
# currently-planned need (research.md §3). Notably EXCLUDED: dataflow.googleapis.com and
# bigquerydatatransfer.googleapis.com — the OCWD dataset is a one-time ~39MB/15,624-row batch
# load; a native `bq load` job is sufficient (docs/02-data-pipeline.md lists Dataflow only as
# an option, not a requirement). Enabling either now would violate FR-002's minimality gate.

locals {
  enabled_services = [
    "bigquery.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudtrace.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "aiplatform.googleapis.com",
    "dataform.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbilling.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each = toset(local.enabled_services)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
