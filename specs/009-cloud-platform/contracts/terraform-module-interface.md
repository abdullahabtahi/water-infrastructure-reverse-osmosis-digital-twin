# Contract: Terraform Root Module Interface

`infra/terraform/` is the interface the operator (and, later, CI) invokes. This contract
defines its inputs and outputs so it can be planned/applied without reading the module internals.

## Inputs (`variables.tf`)

| Variable | Type | Required | Notes |
|---|---|---|---|
| `project_id` | string | yes | `spatial-cat-489006-a4` for this deployment. |
| `region` | string | yes | Default `us-central1`; changing it violates the single-region constraint (Engineering Constraints) unless justified in writing. |
| `billing_account_id` | string | yes | Needed only for the `google_billing_budget` resource; not a secret, but supplied via `-var` / `TF_VAR_billing_account_id` at apply time, never hardcoded in a committed file. |
| `alert_email` | string | yes | Recipient for the budget notification channel and Cloud Monitoring alerts. |
| `environment` | string | no (default `dev`) | Reserved for a future multi-environment split; out of scope per spec Assumptions, kept as a variable so it isn't a breaking change later. |

Real values live in `infra/environments/dev.tfvars`, which is **gitignored**. A committed
`dev.tfvars.example` documents the shape with placeholder values only.

## Outputs (`outputs.tf`)

| Output | Description | Consumed by |
|---|---|---|
| `bigquery_dataset_ids` | Map of the 6 dataset IDs | Feature 001 ingest/Dataform config |
| `pubsub_topic_id` | `ro-readings` full resource ID | Feature 002 replay harness, future live connector |
| `service_account_emails` | Map of the 4 service account emails | Features 003, 004/006, 007, 001 (Dataform) |
| `artifact_registry_repo` | Docker repo URL | `deploy_service.sh` (image push target) |
| `secret_ids` | Map of the 2 secret container IDs (no values) | `set_secret.sh`, future services reading secrets at runtime |

Note: there is no `healthcheck_url` Terraform output — Cloud Run **services** (including the
`platform-healthcheck` placeholder) are owned exclusively by `deploy_service.sh`, never declared
as a `google_cloud_run_v2_service` Terraform resource, to avoid Terraform/`gcloud` ownership
drift. Obtain a deployed service's URL with:
```bash
gcloud run services describe <service-name> --region us-central1 --format='value(status.url)'
```

## Invocation contract

```bash
cd infra/terraform
terraform init -backend-config="bucket=<state-bucket-from-phase-0>"
terraform plan  -var-file=../environments/dev.tfvars -var="billing_account_id=<id>"
terraform apply -var-file=../environments/dev.tfvars -var="billing_account_id=<id>"
```

Re-running `plan`/`apply` on an unchanged configuration MUST show zero planned changes
(idempotency, FR-013). A partial `apply` failure MUST be resumable by re-running `apply` — no
manual `terraform state rm`/import should be required for the resources this module defines.
