# Quickstart: GCP Bootstrap Checklist (FR-012)

This is the ordered, copy-pasteable procedure that takes an empty environment to a fully
provisioned one. Follow it top to bottom. It is safe to re-run from any step (FR-013) — the
scripts and Terraform config check for existing resources before creating them.

**Target**: project `spatial-cat-489006-a4`, account `abdullahabtahi21@gmail.com`, region
`us-central1`. Both are already authenticated in this environment (verified 2026-07-04).

## 0. Prerequisites (already satisfied in this session)

- [x] `gcloud` CLI installed and authenticated as `abdullahabtahi21@gmail.com`
- [x] `bq` CLI installed
- [x] Terraform 1.15.7 installed (`brew install hashicorp/tap/terraform`)
- [x] Application Default Credentials refreshed, quota project = `spatial-cat-489006-a4`
- [ ] Billing enabled on `spatial-cat-489006-a4` — **confirm before continuing**:
  ```bash
  gcloud billing projects describe spatial-cat-489006-a4 --format="value(billingAccountName,billingEnabled)"
  ```
  If `billingEnabled` is `False`, link a billing account first:
  ```bash
  gcloud billing accounts list
  gcloud billing projects link spatial-cat-489006-a4 --billing-account=<BILLING_ACCOUNT_ID>
  ```

## 1. Phase 0 — imperative bootstrap (creates the Terraform state bucket)

```bash
cd infra/scripts
./bootstrap.sh --phase0
```

This enables the 4 APIs Terraform itself needs
(`serviceusage`, `cloudresourcemanager`, `iam`, `storage`) and creates the state bucket
`gs://spatial-cat-489006-a4-tfstate` (versioned, `us-central1`, uniform bucket-level access).
Safe to re-run — `gsutil` bucket creation no-ops if the bucket already exists and is owned by
this project.

## 2. Copy the tfvars template and fill in real values

```bash
cp infra/environments/dev.tfvars.example infra/environments/dev.tfvars
# edit dev.tfvars: project_id, region, alert_email
```

`dev.tfvars` is gitignored — it is never committed. `billing_account_id` is **not** put in
this file; it's passed at apply time (see step 4) so it's easy to omit from any file entirely.

## 3. Terraform init

```bash
cd infra/terraform
terraform init -backend-config="bucket=spatial-cat-489006-a4-tfstate"
```

## 4. Review the plan, then apply

```bash
terraform plan  -var-file=../environments/dev.tfvars -var="billing_account_id=<YOUR_BILLING_ACCOUNT_ID>"
terraform apply -var-file=../environments/dev.tfvars -var="billing_account_id=<YOUR_BILLING_ACCOUNT_ID>"
```

Review the plan output before typing `yes`. This creates, in order: the remaining ~12 APIs,
6 BigQuery datasets, the `ro-readings` Pub/Sub topic, 3 GCS buckets, the Artifact Registry
repo, 4 service accounts with their least-privilege bindings, 2 Secret Manager containers
(empty), the billing budget + notification channel, and the `platform-healthcheck` Cloud Run
placeholder.

## 5. Set secret values (out-of-band — never in a file)

```bash
./infra/scripts/set_secret.sh eia-api-key
# paste the value when prompted, press Ctrl-D — nothing is written to disk
./infra/scripts/set_secret.sh watertap-engine-url
```

## 6. Verify the environment matches every Success Criterion

```bash
./infra/tests/verify_bootstrap.sh
```

Expected: PASS on SC-001 through SC-010 (project exists; exactly 6 datasets; `ro-readings`
topic exists; 4 service accounts each hold only their scoped roles, zero project-wide
owner/editor grants; zero secrets found in source/state scan; healthcheck service reachable
and returns 200; budget + notification channel exist).

## 7. Deploy and smoke-test the placeholder service (proves the deploy path, US4)

```bash
./infra/scripts/deploy_service.sh platform-healthcheck services/platform-healthcheck/ serving-api@spatial-cat-489006-a4.iam.gserviceaccount.com "" -- --allow-unauthenticated
curl -s "$(gcloud run services describe platform-healthcheck --region us-central1 --format='value(status.url)')"
# expect: {"status": "ok"}
```

Note: `deploy_service.sh` defaults to IAM-required (least-privilege); the healthcheck passes
`-- --allow-unauthenticated` because it's a public smoke-test endpoint, not a real capability —
Features 003/007's real services should omit that flag unless they genuinely need public access.

Note: Cloud Run **services** are intentionally not declared as Terraform resources — they are
owned exclusively by `deploy_service.sh` (`gcloud run deploy`) so Terraform and `gcloud` never
fight over the same resource. Terraform's job ends at the service *accounts* the service runs as.

## Cost posture (honest, per FR-020)

- **Idle cost**: ≈ $0 — every Cloud Run service has `min-instances=0`; BigQuery/Pub/Sub/GCS
  incur only storage cost on ~39 MB of eventual data (cents/month).
- **Budget alert**: $20/month warning (40%), $50/month cap notice (100%) — **both are
  notifications**, not an automated shutdown. If you ignore the alert, spend keeps
  accumulating; there is no hard stop configured.
- **Expected prototype spend**: $0–15/month (docs/05), likely $0 under GCP free-trial credit.

## Tearing down (to prove reproducibility, SC-008)

```bash
cd infra/terraform
terraform destroy -var-file=../environments/dev.tfvars -var="billing_account_id=<id>"
# then re-run steps 3-6 — the recreated environment should verify identically
```

## What this checklist does NOT do

- It does not create BigQuery **tables** inside the 6 datasets (Feature 001's job).
- It does not deploy the physics engine, agent, or UI (Features 003/007/008's job, via
  `infra/scripts/deploy_service.sh` — see `contracts/deploy-path-contract.md`).
- It does not set up multi-environment (staging/prod) CI/CD — explicitly out of scope for this
  single-environment prototype (spec Assumptions).
