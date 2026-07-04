#!/usr/bin/env bash
# Oceanus — Generic Cloud Run deploy path (FR-014, FR-015).
#
# The single, reusable script every Cloud Run service (Feature 003's physics engine, Feature
# 007's agent, Feature 008's serving API, and this feature's own platform-healthcheck proof)
# deploys through. See specs/009-cloud-platform/contracts/deploy-path-contract.md for the
# calling convention this script guarantees.
#
# Cloud Run *services* are owned exclusively by this script (gcloud), never by Terraform, to
# avoid Terraform/gcloud fighting over the same resource.
#
# Usage:
#   ./deploy_service.sh <service-name> <source-dir> <service-account-email> [invoker-sa-email] [-- extra gcloud flags...]
#
# The optional 4th argument grants that service account roles/run.invoker on the deployed
# service (e.g. adk-agent@ needing to invoke watertap-engine) — set here, not in Terraform,
# since the service itself isn't a Terraform resource. Pass "" (empty string) for the 4th
# argument if you have no invoker to grant but do want to pass extra flags after "--". Anything
# after "--" is passed straight through to `gcloud run deploy` (e.g. `-- --allow-unauthenticated`
# for a public service — the default is IAM-required unless you pass that flag explicitly, per
# least-privilege).

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-spatial-cat-489006-a4}"
REGION="${REGION:-us-central1}"

SERVICE_NAME="${1:?Usage: $0 <service-name> <source-dir> <service-account-email> [invoker-sa-email] [-- extra flags]}"
SOURCE_DIR="${2:?Usage: $0 <service-name> <source-dir> <service-account-email> [invoker-sa-email] [-- extra flags]}"
SERVICE_ACCOUNT="${3:?Usage: $0 <service-name> <source-dir> <service-account-email> [invoker-sa-email] [-- extra flags]}"
INVOKER_SA=""
EXTRA_FLAGS=()

if [[ $# -ge 4 && "${4}" != "--" ]]; then
  INVOKER_SA="${4}"
  shift 4
elif [[ $# -ge 4 ]]; then
  shift 3
else
  shift $#
fi

if [[ "${1:-}" == "--" ]]; then
  shift
  EXTRA_FLAGS=("$@")
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Error: source directory '${SOURCE_DIR}' does not exist." >&2
  exit 1
fi

echo "==> Deploying '${SERVICE_NAME}' from ${SOURCE_DIR} (scale-to-zero, region ${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --source="${SOURCE_DIR}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --min-instances=0 \
  --quiet \
  "${EXTRA_FLAGS[@]}"

if [[ -n "${INVOKER_SA}" ]]; then
  echo "==> Granting roles/run.invoker on '${SERVICE_NAME}' to ${INVOKER_SA}..."
  gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --member="serviceAccount:${INVOKER_SA}" \
    --role="roles/run.invoker" \
    --quiet
fi

url=$(gcloud run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')
echo "==> Deployed: ${url}"
