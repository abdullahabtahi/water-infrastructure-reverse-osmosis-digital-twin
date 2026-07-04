---

description: "Task list template for feature implementation"
---

# Tasks: Cloud Platform & Delivery ("Oceanus")

**Input**: Design documents from `/specs/009-cloud-platform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
(all present)

**Tests**: Included. Constitution Principle VII (Test-First Discipline) is a strong default
for this project, and `research.md` §8 committed this feature to writing `.tftest.hcl`
assertions and `verify_bootstrap.sh` checks *before* the resources they check exist (red
before green) — the infra analogue of TDD.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) so each can be
implemented and independently verified. Target GCP project: `spatial-cat-489006-a4`
(`abdullahabtahi21@gmail.com`, region `us-central1`). Product name **Oceanus** is applied as a
resource label where Terraform supports labels (BigQuery datasets, GCS buckets) — the GCP
project ID, GitHub repo name, and spec folder names are unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3/US4)

## Path Conventions

All paths are relative to the repository root, under `infra/` (per plan.md's Project
Structure) — no `src/`/`backend/` split; this feature ships no application code.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and lay out the directory skeleton every later phase fills in.

- [X] T001 Create the `infra/` directory skeleton: `infra/terraform/`, `infra/environments/`, `infra/scripts/`, `infra/tests/`
- [X] T002 [P] Confirm billing is enabled on `spatial-cat-489006-a4` (`gcloud billing projects describe spatial-cat-489006-a4`); if not enabled, link a billing account before continuing (blocks everything downstream — not a task to skip)
- [X] T003 [P] Create `infra/environments/dev.tfvars.example` (placeholder `project_id`, `region`, `alert_email`; real `dev.tfvars` stays gitignored per the existing `.gitignore`)
- [X] T004 [P] Create `infra/README.md` — short orientation note: this is the Oceanus cloud-platform bootstrap (Feature 009), points to `specs/009-cloud-platform/quickstart.md` as the authoritative runbook

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Terraform cannot exist without its own state backend, and no dataset/topic/IAM
resource can exist before its API is enabled. This phase MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Write `infra/scripts/bootstrap.sh --phase0`: enable `serviceusage`, `cloudresourcemanager`, `iam`, `storage` APIs and create the GCS state bucket `gs://spatial-cat-489006-a4-tfstate` (versioned, `us-central1`, uniform bucket-level access); must no-op safely if the bucket already exists (FR-013)
- [X] T006 Run `infra/scripts/bootstrap.sh --phase0` against `spatial-cat-489006-a4`; confirm the state bucket exists (`gcloud storage buckets describe gs://spatial-cat-489006-a4-tfstate`)
- [X] T007 Create `infra/terraform/main.tf` — `google` provider (`~> 6.x`) pinned to `spatial-cat-489006-a4`/`us-central1`, and the `gcs` backend block (bucket name from T006)
- [X] T008 Create `infra/terraform/variables.tf` — `project_id`, `region` (default `us-central1`), `billing_account_id`, `alert_email`, `environment` (default `dev`), per `contracts/terraform-module-interface.md`
- [X] T009 Create `infra/terraform/outputs.tf` — skeleton output blocks for `bigquery_dataset_ids`, `pubsub_topic_id`, `service_account_emails`, `artifact_registry_repo`, `secret_ids` (no `healthcheck_url` — see contract note on Cloud Run ownership)
- [X] T010 Create `infra/terraform/apis.tf` — all 17 `google_project_service` resources from `research.md` §3 (excludes `dataflow.googleapis.com`, `bigquerydatatransfer.googleapis.com` by design)
- [X] T011 Run `terraform init -backend-config="bucket=spatial-cat-489006-a4-tfstate"` in `infra/terraform/`; confirm success
- [X] T012 [P] Write `infra/terraform/tests/bootstrap.tftest.hcl` skeleton with a first assertion — exactly 17 `google_project_service` resources planned; run `terraform test`, confirm it currently FAILS (no `terraform apply` has run yet — expected red)

**Checkpoint**: Terraform is initialized and can plan against the live project. User story work can now begin.

---

## Phase 3: User Story 1 - Reproducible one-time environment bootstrap (Priority: P1) 🎯 MVP

**Goal**: Datasets, event topic, storage, and registry exist and are recreatable from documented steps.

**Independent Test**: Run `quickstart.md` steps 1–4 against a clean state; confirm the 6
datasets, `ro-readings` topic, 3 buckets, and Artifact Registry repo all exist and match the
checklist, with zero undocumented manual steps.

### Tests for User Story 1 (write first, confirm they FAIL before implementation)

- [X] T013 [P] [US1] Add assertions to `infra/terraform/tests/bootstrap.tftest.hcl`: exactly 6 `google_bigquery_dataset` resources, each `location = "us-central1"`
- [X] T014 [P] [US1] Add assertion to `infra/terraform/tests/bootstrap.tftest.hcl`: the `ro-readings` `google_pubsub_topic` resource exists
- [X] T015 [P] [US1] Write `infra/tests/verify_bootstrap.sh` skeleton with SC-001 checks (project exists, 6 datasets exist, topic exists, 3 buckets exist, registry exists); run it now and confirm it FAILS (nothing provisioned yet)

### Implementation for User Story 1

- [X] T016 [P] [US1] Create `infra/terraform/bigquery.tf` — 6 datasets (`ro_raw`, `ro_curated`, `ro_serving`, `ro_simulation`, `ro_forecasts`, `ro_embeddings`), each labeled `product = "oceanus"`
- [X] T017 [P] [US1] Create `infra/terraform/pubsub.tf` — `ro-readings` topic + a dead-letter subscription placeholder
- [X] T018 [P] [US1] Create `infra/terraform/storage.tf` — 3 buckets (`{project}-raw-data`, `{project}-dataform`, `{project}-artifacts`)
- [X] T019 [P] [US1] Create `infra/terraform/artifact_registry.tf` — `ro-digital-twin` Docker repo in `us-central1`
- [X] T020 [US1] Run `terraform plan` then `terraform apply` (T016–T019 resources only) against `spatial-cat-489006-a4`; resolve any errors (depends on T016–T019)
- [X] T021 [US1] Re-run `terraform test` — confirm the T013/T014 assertions now PASS
- [X] T022 [US1] Re-run `infra/tests/verify_bootstrap.sh` — confirm the T015 checks now PASS
- [X] T023 [US1] Extend `infra/scripts/bootstrap.sh` to a full orchestration: phase 0 (T005) + `terraform init/plan/apply` in one idempotent entry point, so `quickstart.md` steps 1–4 are a single command for a fresh operator
- [X] T024 [US1] Run `infra/scripts/bootstrap.sh` twice in a row; confirm the second run's `terraform plan` shows zero changes (idempotency, FR-013)

**Checkpoint**: Datasets, topic, storage, and registry are reproducible from documented steps — US1 independently complete.

---

## Phase 4: User Story 2 - Secure-by-default access and secrets (Priority: P1)

**Goal**: Every service identity is least-privilege; no secret ever lives in source or state.

**Independent Test**: Inspect each of the 4 service accounts' roles (none project-wide
owner/editor); scan the repo and its history for secrets (zero found); confirm a service
started with a missing secret fails fast.

### Tests for User Story 2 (write first, confirm they FAIL before implementation)

- [X] T025 [P] [US2] Add assertion to `infra/terraform/tests/bootstrap.tftest.hcl`: no IAM binding in the plan grants `roles/owner` or `roles/editor` to any `google_service_account`
- [X] T026 [P] [US2] Add assertion to `infra/terraform/tests/bootstrap.tftest.hcl`: each of the 4 service accounts' bindings reference a specific dataset/service resource ID, never the bare project
- [X] T027 [P] [US2] Add checks to `infra/tests/verify_bootstrap.sh`: live IAM-policy audit (SC-002) and a repository secret-scan (SC-003 — grep for common credential patterns across tracked files and `git log -p`); run now and confirm FAIL (no `iam.tf`/`secrets.tf` yet)

### Implementation for User Story 2

- [X] T028 [US2] Create `infra/terraform/iam.tf` — 4 service accounts (`watertap-engine@`, `serving-api@`, `adk-agent@`, `dataform@`) with bindings exactly matching `contracts/iam-role-matrix.md`
- [X] T029 [US2] Append operator bindings to `infra/terraform/iam.tf` — `roles/bigquery.jobUser`, `roles/run.developer`, `roles/logging.viewer` for `abdullahabtahi21@gmail.com` (day-to-day; no standing `roles/owner` encoded here)
- [X] T030 [P] [US2] Create `infra/terraform/secrets.tf` — 2 `google_secret_manager_secret` containers (`eia-api-key`, `watertap-engine-url`), deliberately no `secret_version` resource
- [X] T031 [P] [US2] Write `infra/scripts/set_secret.sh` — pipes stdin directly into `gcloud secrets versions add --data-file=-`; the value must never be written to disk or echoed
- [X] T032 [US2] Run `terraform apply` (T028–T030 resources); resolve any errors (depends on T028, T029, T030)
- [X] T033 [US2] Re-run `terraform test` and `infra/tests/verify_bootstrap.sh` IAM/secret checks — confirm PASS
- [X] T034 [US2] Add a note to `contracts/iam-role-matrix.md` confirming FR-018 (untrusted-content isolation) is structurally satisfied: `adk-agent@` holds only `bigquery.dataViewer` (read) + a single scoped `run.invoker` — no write/invoke-privileged role exists that untrusted RAG content could ever reach

**Checkpoint**: Least-privilege IAM and secret containers are verified — US2 independently complete, no dependency on US1's completion (can run in parallel once Phase 2 is done).

---

## Phase 5: User Story 3 - Honest cost control: scale-to-zero and a budget alert (Priority: P1)

**Goal**: A budget alert exists and fires before the cap; the environment is cheap by default.

**Independent Test**: Confirm the budget + notification channel exist with the documented
thresholds; confirm no traffic means no running compute (verified against whatever Cloud Run
service exists once US4 deploys one — see Dependencies note below).

### Tests for User Story 3 (write first, confirm they FAIL before implementation)

- [X] T035 [P] [US3] Add assertion to `infra/terraform/tests/bootstrap.tftest.hcl`: `google_billing_budget` amount = $50, `threshold_rules` = [40%, 100%]
- [X] T036 [P] [US3] Add check to `infra/tests/verify_bootstrap.sh`: budget + notification channel exist and match documented thresholds (SC-005); run now and confirm FAIL (no `budget.tf` yet)

### Implementation for User Story 3

- [X] T037 [US3] Create `infra/terraform/budget.tf` — `google_billing_budget` ($50/mo, 40%/100% threshold rules) + `google_monitoring_notification_channel` (email, from the `alert_email` variable)
- [X] T038 [US3] Run `terraform apply` (T037); resolve any errors (depends on T037, requires `billing_account_id` variable value)
- [X] T039 [US3] Re-run `terraform test` and `infra/tests/verify_bootstrap.sh` budget checks — confirm PASS
- [X] T040 [US3] Confirm `quickstart.md`'s "Cost posture" section figures ($20 warn / $50 cap, notification-only, no hard stop) match what was actually applied in T037 — fix either the doc or the config if they've drifted

**Checkpoint**: Budget alert verified independently of US1/US2/US4 (the budget itself has no dependency on any deployed service).

---

## Phase 6: User Story 4 - Automated deploy and update path (Priority: P2)

**Goal**: A generic, idempotent deploy script that Features 001–008 will reuse, proven now
against a placeholder service.

**Independent Test**: From a clean checkout, run the deploy path and confirm a running,
reachable service; run it again on the same version and confirm no duplication or drift.

### Tests for User Story 4 (write first, confirm it FAILS before implementation)

- [X] T041 [P] [US4] Add a check to `infra/tests/verify_bootstrap.sh`: HTTP GET to the `platform-healthcheck` URL returns 200 (SC-006); run now and confirm FAIL (service not deployed yet)

### Implementation for User Story 4

- [X] T042 [US4] Write `infra/scripts/deploy_service.sh <service-name> <source-dir> <service-account-email>` \u2014 wraps `gcloud run deploy <service-name> --source <source-dir> --service-account <sa> --region us-central1 --min-instances 0`; never accepts a secret value as an argument (only `--set-secrets` references), per `contracts/deploy-path-contract.md`
- [X] T043 [P] [US4] Create the minimal placeholder source `services/platform-healthcheck/` (trivial container/buildpack app returning `200 {"status":"ok"}`)
- [X] T044 [US4] Run `infra/scripts/deploy_service.sh platform-healthcheck services/platform-healthcheck/ serving-api@spatial-cat-489006-a4.iam.gserviceaccount.com`; confirm the service is reachable (depends on T042, T043, and `serving-api@` existing from T028)
- [X] T045 [US4] Re-run the identical `deploy_service.sh` command; confirm it updates the same service/revision rather than creating a duplicate (idempotency, FR-015)
- [X] T046 [US4] Re-run `infra/tests/verify_bootstrap.sh` — confirm the T041 healthcheck check now PASSes
- [X] T047 [US4] Update `quickstart.md` step 7 (already drafted) to reflect the actual deployed URL retrieval command (`gcloud run services describe ... --format='value(status.url)'`) and confirm it matches what T044 produced

**Checkpoint**: Deploy path proven end-to-end against a real (if trivial) service — US4 complete. Note: US3's "no traffic → scale-to-zero" half of its Independent Test is only *fully* demonstrable once this phase deploys a real Cloud Run service — the budget-alert half of US3 (T035–T040) has no such dependency and is independently verifiable earlier.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final reproducibility proof and documentation consistency across all stories.

- [X] T048 Run the full `infra/tests/verify_bootstrap.sh` suite end-to-end; confirm SC-001 through SC-010 all PASS (SC-001\u2013SC-006 concretely verified live: 15/15 checks pass; SC-007 demonstrated by T045's revision increment; SC-009/SC-010 are structurally deferred to the consuming features 001\u2013008, which don't exist yet to exercise them)
- [X] T049 [P] Run `terraform destroy` then re-run `infra/scripts/bootstrap.sh` + redeploy `platform-healthcheck`; confirm the recreated environment is equivalent (SC-008) — the literal teardown-and-recreate proof
- [X] T050 [P] Update `AGENTS.md` if any concrete resource name, dataset, or script path introduced here diverges from what it currently states (per Development Workflow: docs/AGENTS.md stay consistent with implementation)
- [X] T051 Commit all `infra/` files and updated `specs/009-cloud-platform/*.md` corrections with a conventional-commit message; confirm `git status` is clean and no secret was ever staged

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (needs billing confirmed, T002). BLOCKS all user stories — Terraform must be initialized before any resource can be planned.
- **User Stories (Phase 3–6)**: All depend on Foundational (Phase 2) completion.
  - **US1, US2, US3** (all P1) have no dependency on each other and can proceed in parallel.
  - **US4** (P2) depends on US2's `serving-api@` service account existing (T028) before T044 can run.
- **Polish (Phase 7)**: Depends on all four user stories being complete (T049's teardown/recreate proof exercises every resource type).

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3/US4.
- **US2 (P1)**: No dependency on US1/US3/US4.
- **US3 (P1)**: Budget half is independent; the "hosted services scale to zero" half of its Independent Test is only fully provable once US4 deploys a real service (soft dependency, not a blocking one — the budget resource itself needs nothing from US4).
- **US4 (P2)**: Depends on US2 (needs `serving-api@` to exist as the placeholder's runtime identity).

### Within Each User Story

- Tests are written first and confirmed to FAIL before the corresponding implementation task runs.
- Terraform resource files before `terraform apply`.
- `apply` before test re-runs.
- Story's own checkpoint before moving to the next story (if working sequentially).

### Parallel Opportunities

- All Setup tasks marked [P] (T002–T004) run in parallel.
- T013–T015 (US1 tests) run in parallel with each other, and with T025–T027 (US2 tests) and T035–T036 (US3 tests) once Phase 2 is done — different files, no shared dependency.
- T016–T019 (US1 resource files) run in parallel with each other.
- T030–T031 (US2 secrets file + script) run in parallel.
- Once Phase 2 (Foundational) completes, US1, US2, and US3 can be staffed and executed fully in parallel; only US4 must wait on US2's T028.

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# After Phase 2 (Foundational) is complete, these four can be worked simultaneously:
Task: "Create infra/terraform/bigquery.tf — 6 datasets, product=oceanus label"
Task: "Create infra/terraform/pubsub.tf — ro-readings topic + dead-letter subscription"
Task: "Create infra/terraform/storage.tf — 3 buckets"
Task: "Create infra/terraform/artifact_registry.tf — ro-digital-twin docker repo"
# Then sequentially: terraform apply (T020) → re-run tests (T021, T022) → wrap in bootstrap.sh (T023) → idempotency proof (T024)
```

---

## Implementation Strategy

**MVP first**: User Story 1 (Phase 3) alone already delivers the reproducible-bootstrap
promise for data/eventing/storage — the substrate Features 001 and 002 need first. Ship US1,
verify its checkpoint, then decide whether to parallelize US2/US3 or continue sequentially.

**Incremental delivery order** (recommended, matching spec priority):
1. Phase 1–2 (Setup + Foundational) — unblocks everything.
2. Phase 3 (US1) — MVP: datasets, topic, storage, registry exist and are reproducible.
3. Phase 4 (US2) — security hardening: least-privilege IAM + secret containers.
4. Phase 5 (US3) — cost control: budget alert live before any real spend accrues.
5. Phase 6 (US4) — deploy path proven, ready for Features 003/007/008 to reuse.
6. Phase 7 — final reproducibility proof (teardown/recreate) and documentation sync.

Every phase after Foundational leaves the environment in a working, checkpointed state — this
feature can be declared "done enough to unblock 001" after Phase 3 alone if time pressure
demands it, with Phases 4–6 following before any feature that actually needs secrets, a
deployed service, or cost governance goes live.
