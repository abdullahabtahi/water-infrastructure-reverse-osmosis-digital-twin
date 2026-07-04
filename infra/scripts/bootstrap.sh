#!/usr/bin/env bash
# Oceanus — Cloud Platform Bootstrap Orchestrator (Feature 009)
#
# Usage:
#   ./bootstrap.sh --phase0                 Enable the APIs Terraform itself needs and
#                                            create the Terraform state bucket. Idempotent.
#   ./bootstrap.sh                          Full orchestration: phase0 + terraform init/plan/apply.
#
# Requires: PROJECT_ID env var (or edit the default below), gcloud + terraform installed
# and authenticated. See specs/009-cloud-platform/quickstart.md for the full walkthrough.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-spatial-cat-489006-a4}"
REGION="${REGION:-us-central1}"
STATE_BUCKET="${STATE_BUCKET:-${PROJECT_ID}-tfstate}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "${SCRIPT_DIR}/../terraform" && pwd)"

phase0() {
  echo "==> [phase0] Enabling Terraform-bootstrap APIs on ${PROJECT_ID}..."
  gcloud services enable \
    serviceusage.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    storage.googleapis.com \
    --project="${PROJECT_ID}"

  echo "==> [phase0] Ensuring Terraform state bucket gs://${STATE_BUCKET} exists..."
  if gcloud storage buckets describe "gs://${STATE_BUCKET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "    Bucket already exists — no-op (idempotent)."
  else
    gcloud storage buckets create "gs://${STATE_BUCKET}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --uniform-bucket-level-access
    gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning
    echo "    Bucket created and versioned."
  fi
}

terraform_apply() {
  echo "==> [terraform] init (backend bucket: ${STATE_BUCKET})..."
  (cd "${TERRAFORM_DIR}" && terraform init -input=false -backend-config="bucket=${STATE_BUCKET}")

  echo "==> [terraform] plan..."
  (cd "${TERRAFORM_DIR}" && terraform plan -input=false \
    -var-file="${SCRIPT_DIR}/../environments/dev.tfvars" \
    -var="billing_account_id=${TF_VAR_billing_account_id:?Set TF_VAR_billing_account_id before running}")

  echo "==> [terraform] apply (review the plan above before confirming)..."
  (cd "${TERRAFORM_DIR}" && terraform apply -input=false \
    -var-file="${SCRIPT_DIR}/../environments/dev.tfvars" \
    -var="billing_account_id=${TF_VAR_billing_account_id:?Set TF_VAR_billing_account_id before running}")
}

case "${1:-}" in
  --phase0)
    phase0
    ;;
  "")
    phase0
    terraform_apply
    ;;
  *)
    echo "Unknown argument: ${1}" >&2
    echo "Usage: $0 [--phase0]" >&2
    exit 1
    ;;
esac

echo "==> Done."
