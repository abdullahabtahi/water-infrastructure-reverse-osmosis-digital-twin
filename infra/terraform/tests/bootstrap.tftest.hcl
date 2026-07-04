# Terraform native tests (`terraform test`) for the Oceanus cloud-platform bootstrap.
#
# These run against `terraform plan` output (fast, offline, no live GCP calls) and assert
# structural properties of the configuration — the infra analogue of unit tests. Written
# FIRST per Constitution Principle VII (Test-First Discipline); confirmed to fail before the
# corresponding resources exist, then re-confirmed to pass once they're added.
#
# Run with: terraform test   (from infra/terraform/)

variables {
  project_id         = "spatial-cat-489006-a4"
  region             = "us-central1"
  billing_account_id = "000000-000000-000000" # placeholder — plan-only test, never applied
  alert_email        = "test@example.com"
}

run "exactly_17_services_enabled" {
  command = plan

  assert {
    condition     = length(google_project_service.enabled) == 17
    error_message = "Expected exactly 17 google_project_service resources (FR-002 minimality) — got a different count. If you intentionally added/removed an API, update this test and its justification in research.md §3."
  }
}

run "dataflow_and_transfer_apis_excluded" {
  command = plan

  assert {
    condition     = !contains(local.enabled_services, "dataflow.googleapis.com")
    error_message = "dataflow.googleapis.com must NOT be enabled — the OCWD batch load doesn't need it (see research.md §3). Enabling it requires a written justification first."
  }

  assert {
    condition     = !contains(local.enabled_services, "bigquerydatatransfer.googleapis.com")
    error_message = "bigquerydatatransfer.googleapis.com must NOT be enabled by default (research.md §3)."
  }
}

# --- User Story 1: reproducible bootstrap (datasets + topic) ---

run "six_datasets_all_in_region" {
  command = plan

  assert {
    condition = alltrue([
      google_bigquery_dataset.ro_raw.location == "us-central1",
      google_bigquery_dataset.ro_curated.location == "us-central1",
      google_bigquery_dataset.ro_serving.location == "us-central1",
      google_bigquery_dataset.ro_simulation.location == "us-central1",
      google_bigquery_dataset.ro_forecasts.location == "us-central1",
      google_bigquery_dataset.ro_embeddings.location == "us-central1",
    ])
    error_message = "All 6 BigQuery datasets must be in us-central1 (single-region constraint, FR-001)."
  }
}

run "ro_readings_topic_exists" {
  command = plan

  assert {
    condition     = google_pubsub_topic.ro_readings.name == "ro-readings"
    error_message = "The ro-readings Pub/Sub topic must exist for the replay harness and future live source to publish to (FR-004)."
  }
}

# --- User Story 2: least-privilege IAM ---

run "no_service_account_holds_owner_or_editor" {
  command = plan

  assert {
    condition     = google_project_iam_member.operator_bigquery_job_user.role != "roles/owner" && google_project_iam_member.operator_bigquery_job_user.role != "roles/editor"
    error_message = "operator_bigquery_job_user must not be roles/owner or roles/editor."
  }

  assert {
    condition     = google_project_iam_member.operator_run_developer.role != "roles/owner" && google_project_iam_member.operator_run_developer.role != "roles/editor"
    error_message = "operator_run_developer must not be roles/owner or roles/editor."
  }

  assert {
    condition     = google_project_iam_member.operator_logging_viewer.role != "roles/owner" && google_project_iam_member.operator_logging_viewer.role != "roles/editor"
    error_message = "operator_logging_viewer must not be roles/owner or roles/editor."
  }
}

run "service_account_bindings_are_dataset_scoped_not_project_wide" {
  command = plan

  assert {
    condition     = google_bigquery_dataset_iam_member.watertap_engine_simulation_editor.dataset_id == "ro_simulation"
    error_message = "watertap-engine@ must be scoped to the ro_simulation dataset only (FR-005), not a project-level role."
  }

  assert {
    condition = alltrue([
      for k, v in google_bigquery_dataset_iam_member.dataform_editor : contains(
        ["ro_curated", "ro_serving", "ro_forecasts", "ro_embeddings"],
        v.dataset_id
      )
    ])
    error_message = "dataform@ bindings must each be scoped to one of its 4 declared datasets, never project-wide."
  }
}

# --- User Story 3: honest cost control (budget alert) ---

run "budget_amount_and_thresholds_match_docs" {
  command = plan

  assert {
    condition     = google_billing_budget.oceanus_dev.amount[0].specified_amount[0].units == "50"
    error_message = "Budget amount must be $50/month (docs/05, Engineering Constraints)."
  }

  assert {
    condition     = length(google_billing_budget.oceanus_dev.threshold_rules) == 2
    error_message = "Expected exactly 2 threshold rules (40% warn, 100% cap-notice)."
  }
}
