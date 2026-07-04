output "bigquery_dataset_ids" {
  description = "The 6 harmonized-layer BigQuery dataset IDs."
  value = {
    raw        = google_bigquery_dataset.ro_raw.dataset_id
    curated    = google_bigquery_dataset.ro_curated.dataset_id
    serving    = google_bigquery_dataset.ro_serving.dataset_id
    simulation = google_bigquery_dataset.ro_simulation.dataset_id
    forecasts  = google_bigquery_dataset.ro_forecasts.dataset_id
    embeddings = google_bigquery_dataset.ro_embeddings.dataset_id
  }
}

output "pubsub_topic_id" {
  description = "The ro-readings Pub/Sub topic (replay harness + future live source publish here)."
  value       = google_pubsub_topic.ro_readings.id
}

output "service_account_emails" {
  description = "The 4 least-privilege service account emails."
  value = {
    watertap_engine = google_service_account.watertap_engine.email
    serving_api     = google_service_account.serving_api.email
    adk_agent       = google_service_account.adk_agent.email
    dataform        = google_service_account.dataform.email
  }
}

output "artifact_registry_repo" {
  description = "The Docker Artifact Registry repo URL (deploy_service.sh push target)."
  value       = google_artifact_registry_repository.ro_digital_twin.name
}

output "secret_ids" {
  description = "The 2 Secret Manager container IDs (no values — set out-of-band via set_secret.sh)."
  value = {
    eia_api_key         = google_secret_manager_secret.eia_api_key.secret_id
    watertap_engine_url = google_secret_manager_secret.watertap_engine_url.secret_id
  }
}

# Deliberately no "healthcheck_url" output — Cloud Run *services* are owned exclusively by
# infra/scripts/deploy_service.sh (gcloud), never declared as a Terraform resource, to avoid
# Terraform/gcloud ownership drift. See contracts/terraform-module-interface.md.
