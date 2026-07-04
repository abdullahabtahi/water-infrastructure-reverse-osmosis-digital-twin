terraform {
  required_version = ">= 1.15"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    # bucket is supplied at `terraform init -backend-config="bucket=..."` time
    # (see infra/scripts/bootstrap.sh and specs/009-cloud-platform/quickstart.md)
    prefix = "oceanus/dev"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # billingbudgets.googleapis.com (and some other billing-account-scoped APIs) don't infer a
  # quota project from ADC automatically — without this, google_billing_budget fails with
  # "requires a quota project" even though `gcloud auth application-default login` set one.
  user_project_override = true
  billing_project       = var.project_id
}
