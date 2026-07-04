variable "project_id" {
  description = "The GCP project ID this environment is provisioned in."
  type        = string
}

variable "region" {
  description = "Single region for all resources (Engineering Constraints: us-central1)."
  type        = string
  default     = "us-central1"
}

variable "billing_account_id" {
  description = <<-EOT
    Billing account ID for the budget resource. Not a secret, but deliberately never
    stored in a committed file — pass via -var or TF_VAR_billing_account_id at apply time.
  EOT
  type        = string
}

variable "alert_email" {
  description = "Recipient for the budget notification channel and monitoring alerts."
  type        = string
}

variable "environment" {
  description = "Environment name (reserved for future multi-environment support; out of scope now)."
  type        = string
  default     = "dev"
}
