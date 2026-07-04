# Implementation Plan: Cloud Platform & Delivery

**Branch**: `009-cloud-platform` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-cloud-platform/spec.md`

## Summary

Provision the single, secure, low-cost, reproducible GCP foundation every other feature deploys
onto — one project (`spatial-cat-489006-a4`, region `us-central1`), the minimal set of managed
services, 6 role-scoped BigQuery datasets, the `ro-readings` Pub/Sub topic, 4 least-privilege
service identities, Secret Manager containers (values set out-of-band, never in source/state),
Artifact Registry, a scale-to-zero Cloud Run posture, and a $20-warn/$50-cap budget alert.
Technical approach: a two-phase bootstrap — a tiny imperative `gcloud`/`gsutil` phase 0 (enable
the APIs Terraform itself needs, create the Terraform-state GCS bucket) followed by a Terraform
root module (phase 1) that declares everything else idempotently. A generic `deploy_service.sh`
script (parameterized by service name/source path/service-account) gives Features 001–008 a
single, reusable deploy path, proven now against a minimal `platform-healthcheck` Cloud Run
placeholder so the path is independently testable before any business-logic service exists.

## Technical Context

**Language/Version**: HCL (Terraform 1.15.7) + Bash (bootstrap/deploy/verify scripts); no
application language in scope — this feature ships no Python.

**Primary Dependencies**: Terraform `google` provider (~> 6.x), `gcloud` CLI (v560.0.0), `bq`
CLI (v2.1.29), GitHub CLI (`gh`, already used for this repo).

**Storage**: Google Cloud Storage (Terraform-state bucket + raw-data/dataform/artifacts
buckets — buckets only; object contents are Feature 001's concern) and BigQuery (6 empty
datasets; table/schema creation is Feature 001's concern, not this feature's).

**Testing**: Terraform native tests (`terraform test`, `.tftest.hcl`, plan-time assertions —
e.g. "no service account has `roles/owner`") written and red before the resources exist, plus a
bash acceptance script (`infra/tests/verify_bootstrap.sh`) that exercises the live environment
against every Success Criterion (SC-001…SC-010) via read-only `gcloud`/`bq` describe/list calls.

**Target Platform**: GCP project `spatial-cat-489006-a4`, region `us-central1`, single `dev`
environment (per spec Assumptions — multi-environment promotion is explicitly out of scope).

**Project Type**: Infrastructure-as-code / platform bootstrap (not an application). This
feature's "source code" is Terraform + shell, not a deployable service.

**Performance Goals**: N/A for infra provisioning itself. The provisioned Cloud Run posture
accepts cold-start latency from min-instances=0 (an explicit, accepted prototype trade-off
per spec Assumptions).

**Constraints**: Idle compute cost ≈ $0 (scale-to-zero everywhere); budget alert at $20/mo
warn, $50/mo cap (docs/05); single region for all resources (no cross-region drift); zero
secrets in source, committed config, or Terraform state; every service identity scoped to
least privilege (no project-wide `roles/owner`/`roles/editor` on any service account);
bootstrap and deploy paths MUST be idempotent/resumable (FR-013, FR-015).

**Scale/Scope**: 1 project, 1 region, ~16 enabled APIs, 6 BigQuery datasets (empty), 1 Pub/Sub
topic, 3 GCS buckets, 4 service accounts, 1 Artifact Registry repo, 1 budget + 1 notification
channel, 1 placeholder Cloud Run health-check service to prove the deploy path.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. BigQuery-as-AI-Compute | ✅ N/A (enables) | This feature only creates empty datasets; no AI/ML pipeline is introduced here. It is the substrate Principle I depends on later — not itself a compute decision. |
| II. Evidence Over Assertion | ✅ N/A | No numeric/accuracy claims are made by infra provisioning. |
| III. Advise-Only, HITL (HARD GATE) | ✅ PASS | Infrastructure provisioning does not actuate plant equipment; N/A by nature of this feature. |
| IV. Measured vs. Modeled Honesty | ✅ N/A | No cost/performance figures surfaced to an operator here (the $20/$50 budget is a platform control, not a twin output). |
| V. Physics-Grounded Fidelity | ✅ N/A | No physics modeling in this feature. |
| VI. Honest Twin Maturity | ✅ PASS | The `ro-readings` Pub/Sub topic is created now specifically so the replay harness (002) and a future live source publish to the *same* channel — directly upholds the "live-ready, single connector swap" design. |
| VII. Test-First Discipline | ✅ PASS (by design) | `.tftest.hcl` unit tests and `verify_bootstrap.sh` acceptance tests are written first (Phase 1 design output) and MUST fail against an empty project before any `terraform apply` — the infra analogue of red→green. |
| Engineering Constraints | ✅ PASS | Region `us-central1`; budget ~$50/mo; least-privilege service accounts (FR-005); no secrets in source/state (FR-008, HARD GATE) — secret *containers* only via Terraform, values set out-of-band via `gcloud secrets versions add`, never written to a file. |

No violations. Complexity Tracking table is not applicable (empty by design).

*Post-Phase-1 re-check: unchanged — the Phase 1 design (data-model.md, contracts/, quickstart.md)
introduces no new dependency, service, or scope beyond what this table already covers. Still PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/009-cloud-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output — IaC/backend/secrets/deploy-path decisions
├── data-model.md         # Phase 1 output — resource inventory (project, datasets, topic, SAs, secrets, budget)
├── quickstart.md         # Phase 1 output — the FR-012 copy-pasteable bootstrap checklist
├── contracts/             # Phase 1 output
│   ├── terraform-module-interface.md   # root module inputs/outputs
│   ├── iam-role-matrix.md              # service account × role × dataset scope
│   └── deploy-path-contract.md         # calling convention for Features 001–008
└── tasks.md               # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
infra/
├── terraform/
│   ├── main.tf                 # provider + GCS backend config
│   ├── variables.tf            # project_id, billing_account_id, region, alert_email, environment
│   ├── outputs.tf               # dataset ids, topic name, SA emails, registry url, healthcheck url
│   ├── apis.tf                  # google_project_service (the enabled-services set, FR-002)
│   ├── bigquery.tf              # 6 google_bigquery_dataset resources (FR-003)
│   ├── pubsub.tf                 # ro-readings topic (+ dead-letter subscription) (FR-004)
│   ├── storage.tf                 # raw-data / dataform / artifacts buckets
│   ├── artifact_registry.tf        # ro-digital-twin docker repo
│   ├── iam.tf                       # 4 service accounts + least-privilege bindings (FR-005, FR-006)
│   ├── secrets.tf                    # secret containers only, no versions/values (FR-007, FR-008)
│   └── budget.tf                      # billing budget + monitoring notification channel (FR-010)
# NOTE: no cloud_run.tf — Cloud Run *services* are owned exclusively by scripts/deploy_service.sh
# (imperative `gcloud run deploy`), never declared as a google_cloud_run_v2_service Terraform
# resource, to avoid Terraform/gcloud fighting over the same resource (drift). Terraform's
# iam.tf still declares the service accounts a deployed service will run as.
├── environments/
│   └── dev.tfvars.example               # template; real dev.tfvars is gitignored (never committed)
├── scripts/
│   ├── bootstrap.sh                      # phase 0 (imperative) + terraform init/plan/apply orchestration
│   ├── deploy_service.sh                  # generic build+publish+rollout path for 001–008 (FR-014, FR-015)
│   └── set_secret.sh                       # human-run helper: gcloud secrets versions add (value never on disk)
└── tests/
    ├── bootstrap.tftest.hcl                # Terraform native unit tests (written first, red before resources exist)
    └── verify_bootstrap.sh                  # bash acceptance script — checks live env against every SC-00x
```

**Structure Decision**: A single top-level `infra/` directory holds all Terraform, scripts, and
infra tests, kept separate from future application code (`src/`, `services/`, etc. that
Features 001–008 will add). This is Option 1 (single project) in spirit, scoped to
infrastructure rather than application code, because this feature has no application layer of
its own — its "product" is the environment and the reusable deploy path.

## Complexity Tracking

*No Constitution Check violations — table intentionally left empty.*
