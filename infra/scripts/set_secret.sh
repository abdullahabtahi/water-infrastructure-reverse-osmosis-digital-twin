#!/usr/bin/env bash
# Oceanus — Set a Secret Manager secret value (FR-007, FR-008 HARD GATE).
#
# The value is piped directly from stdin into `gcloud secrets versions add` — it is never
# written to disk, never logged, and never appears as a command-line argument (which would
# leak into shell history / process listings).
#
# Usage:
#   ./set_secret.sh <secret-id>
#   Then paste the value and press Ctrl-D (EOF) — nothing is echoed back.
#
# Example:
#   ./set_secret.sh eia-api-key

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-spatial-cat-489006-a4}"
SECRET_ID="${1:?Usage: $0 <secret-id>}"

if ! gcloud secrets describe "${SECRET_ID}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Error: secret container '${SECRET_ID}' does not exist in ${PROJECT_ID}." >&2
  echo "Create it in infra/terraform/secrets.tf and apply first." >&2
  exit 1
fi

echo "Paste the value for '${SECRET_ID}', then press Ctrl-D (nothing will be echoed):"
gcloud secrets versions add "${SECRET_ID}" --project="${PROJECT_ID}" --data-file=- >/dev/null

echo "Secret version added for '${SECRET_ID}'. Value was never written to disk."
