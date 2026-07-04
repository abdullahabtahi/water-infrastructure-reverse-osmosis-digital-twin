# Docker image repository — deploy_service.sh pushes built images here.

resource "google_artifact_registry_repository" "ro_digital_twin" {
  repository_id = "ro-digital-twin"
  project       = var.project_id
  location      = var.region
  format        = "DOCKER"
  description   = "Oceanus (RO Digital Twin) container images."
  labels        = { product = "oceanus" }

  depends_on = [google_project_service.enabled]
}
