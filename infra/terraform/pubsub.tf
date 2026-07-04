# Event Topic (FR-004) — the seam that lets the replay harness (Feature 002) and a future
# live SCADA/OPC-UA/MQTT connector publish to the same channel with no downstream change
# (Constitution Principle VI: honest twin maturity, live-ready architecture).

resource "google_pubsub_topic" "ro_readings" {
  name    = "ro-readings"
  project = var.project_id
  labels  = { product = "oceanus" }

  depends_on = [google_project_service.enabled]
}

# Dead-letter topic + subscription placeholder — messages that fail the eventual BigQuery
# streaming-insert subscription (Feature 001's concern to create) land here instead of being
# silently dropped.
resource "google_pubsub_topic" "ro_readings_dlq" {
  name    = "ro-readings-dlq"
  project = var.project_id
  labels  = { product = "oceanus", purpose = "dead-letter" }

  depends_on = [google_project_service.enabled]
}

resource "google_pubsub_subscription" "ro_readings_dlq_sub" {
  name    = "ro-readings-dlq-sub"
  project = var.project_id
  topic   = google_pubsub_topic.ro_readings_dlq.id

  message_retention_duration = "604800s" # 7 days
}
