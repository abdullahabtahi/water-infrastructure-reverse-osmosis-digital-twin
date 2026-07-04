# Oceanus — Cloud Platform Bootstrap

This is the cloud-platform bootstrap for **Oceanus** (the RO Digital Twin product), Feature
009. It provisions the single, secure, low-cost, reproducible GCP foundation every other
feature (001–008) deploys onto.

**The authoritative runbook is [specs/009-cloud-platform/quickstart.md](../specs/009-cloud-platform/quickstart.md).**
Start there. This directory holds the Terraform and scripts that runbook invokes.

## Layout

```
infra/
├── terraform/    # Declarative: project services, BigQuery datasets, Pub/Sub topic,
│                 # storage buckets, Artifact Registry, IAM, secret containers, budget.
│                 # Does NOT declare Cloud Run services — see scripts/deploy_service.sh.
├── environments/ # dev.tfvars (gitignored) from dev.tfvars.example
├── scripts/      # bootstrap.sh (phase 0 + terraform orchestration), deploy_service.sh
│                 # (the one deploy path every Cloud Run service uses), set_secret.sh
└── tests/        # bootstrap.tftest.hcl (terraform test) + verify_bootstrap.sh (live checks)
```

## Design notes worth knowing before touching this

- **Cloud Run services are owned by `deploy_service.sh` (`gcloud run deploy`), never by
  Terraform** — this avoids Terraform and `gcloud` fighting over the same resource. Terraform
  stops at the service *accounts* a deployed service runs as.
- **No secret values live in Terraform.** `secrets.tf` creates empty Secret Manager
  containers only; `set_secret.sh` pipes a value straight into `gcloud secrets versions add`,
  never touching a file.
- Full rationale for every decision here: [specs/009-cloud-platform/research.md](../specs/009-cloud-platform/research.md).
