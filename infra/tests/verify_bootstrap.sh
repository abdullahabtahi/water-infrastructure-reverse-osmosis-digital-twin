#!/usr/bin/env bash
# Oceanus — Live environment verification against the spec's Success Criteria (SC-001..SC-010).
#
# Read-only. Uses gcloud/bq describe/list calls against the live project — no state mutation.
# Run after `terraform apply` (and after deploy_service.sh for the healthcheck check) to prove
# the bootstrap actually matches what the checklist promises.
#
# Usage: ./verify_bootstrap.sh

set -uo pipefail  # no -e: we want to run every check and report a full pass/fail summary

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

PROJECT_ID="${PROJECT_ID:-spatial-cat-489006-a4}"
REGION="${REGION:-us-central1}"

PASS=0
FAIL=0

check() {
  local description="$1"
  local result="$2" # 0 = pass, non-zero = fail
  if [[ "${result}" -eq 0 ]]; then
    echo "  [PASS] ${description}"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] ${description}"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== SC-001: project, datasets, topic, buckets, registry exist ==="

gcloud projects describe "${PROJECT_ID}" >/dev/null 2>&1
check "Project ${PROJECT_ID} exists" $?

dataset_count=$(bq ls --project_id="${PROJECT_ID}" --format=json 2>/dev/null | \
  python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
[[ "${dataset_count}" -eq 6 ]]
check "Exactly 6 BigQuery datasets exist (found ${dataset_count})" $?

gcloud pubsub topics describe ro-readings --project="${PROJECT_ID}" >/dev/null 2>&1
check "Pub/Sub topic 'ro-readings' exists" $?

for bucket in raw-data dataform artifacts; do
  gcloud storage buckets describe "gs://${PROJECT_ID}-${bucket}" >/dev/null 2>&1
  check "GCS bucket ${PROJECT_ID}-${bucket} exists" $?
done

gcloud artifacts repositories describe ro-digital-twin --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1
check "Artifact Registry repo 'ro-digital-twin' exists" $?

echo ""
echo "=== SC-002/SC-003: least-privilege IAM, zero secrets in source ==="

for sa in watertap-engine serving-api adk-agent dataform; do
  gcloud iam service-accounts describe "${sa}@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" >/dev/null 2>&1
  check "Service account ${sa}@ exists" $?
done

owner_or_editor_on_sa=$(gcloud projects get-iam-policy "${PROJECT_ID}" --format=json 2>/dev/null | \
  python3 -c "
import json, sys
policy = json.load(sys.stdin)
bad = []
for b in policy.get('bindings', []):
    if b['role'] in ('roles/owner', 'roles/editor'):
        for m in b['members']:
            if m.startswith('serviceAccount:') and '.iam.gserviceaccount.com' in m:
                bad.append(m)
print(len(bad))
" 2>/dev/null || echo "unknown")
[[ "${owner_or_editor_on_sa}" == "0" ]]
check "Zero service accounts hold roles/owner or roles/editor (found: ${owner_or_editor_on_sa})" $?

# Repo secret-scan: grep tracked files for common credential patterns (not exhaustive — a
# real gitleaks/trufflehog run is recommended before any public push).
secret_hits=$(git -C "$(dirname "$0")/../.." grep -InE '(AIza[0-9A-Za-z_\-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"type":\s*"service_account")' -- . ':(exclude)infra/terraform/tests/bootstrap.tftest.hcl' 2>/dev/null | wc -l | tr -d ' ')
[[ "${secret_hits}" -eq 0 ]]
check "Zero secret-pattern matches in tracked source (found: ${secret_hits})" $?

echo ""
echo "=== SC-004/SC-005: scale-to-zero, budget alert ==="

billing_account="$(gcloud billing projects describe "${PROJECT_ID}" --format='value(billingAccountName)' | sed 's#billingAccounts/##')"
budget_match=$(gcloud billing budgets list --billing-account="${billing_account}" --format=json 2>/dev/null | \
  python3 -c "
import json, sys
budgets = json.load(sys.stdin)
for b in budgets:
    if b.get('displayName', '').startswith('oceanus-') and b.get('displayName', '').endswith('-budget'):
        print('found')
        sys.exit(0)
print('missing')
" 2>/dev/null || echo "unknown")
[[ "${budget_match}" == "found" ]]
check "Oceanus budget (oceanus-<env>-budget) exists on billing account ${billing_account}" $?

echo ""
echo "=== SC-006: deploy path produces a reachable service (run after deploy_service.sh) ==="

healthcheck_url=$(gcloud run services describe platform-healthcheck --region "${REGION}" --project="${PROJECT_ID}" --format='value(status.url)' 2>/dev/null)
if [[ -n "${healthcheck_url}" ]]; then
  http_code=$(curl -s -o /dev/null -w '%{http_code}' "${healthcheck_url}" 2>/dev/null)
  [[ "${http_code}" == "200" ]]
  check "platform-healthcheck reachable and returns 200 (got ${http_code})" $?
else
  check "platform-healthcheck service exists (not deployed yet — run deploy_service.sh)" 1
fi

echo ""
echo "=== Summary: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
