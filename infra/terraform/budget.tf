# Budget & Alert (FR-010) — $50/month, 40% warn + 100% cap-notice thresholds. Notification
# only — there is NO automated hard stop (see quickstart.md's honest cost-posture section).

resource "google_monitoring_notification_channel" "budget_email" {
  project      = var.project_id
  display_name = "Oceanus budget alert email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

resource "google_billing_budget" "oceanus_dev" {
  billing_account = var.billing_account_id
  display_name    = "oceanus-${var.environment}-budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "50"
    }
  }

  threshold_rules {
    threshold_percent = 0.4 # $20 — "warn"
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0 # $50 — "cap-notice" (notification only, no automated shutdown)
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.budget_email.id]
    disable_default_iam_recipients   = false
  }
}
