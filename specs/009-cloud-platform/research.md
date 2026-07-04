# Phase 0 Research: Cloud Platform & Delivery

All unknowns from the spec's Assumptions are resolved here. No `NEEDS CLARIFICATION` markers
remain — the spec's Assumptions section already pinned provider, region, and service mapping;
this file resolves the *mechanism* decisions `/speckit.plan` owns per Constitution Principle I.

## 1. IaC tool and version

- **Decision**: Terraform 1.15.7 (installed via the HashiCorp Homebrew tap — Homebrew core
  dropped the formula after HashiCorp's BSL license change), `google` provider `~> 6.x`.
- **Rationale**: User explicitly chose Terraform over plain `gcloud`/`bq` scripts for
  reproducibility and auditability (SC-008: teardown + re-run must yield an equivalent
  environment — Terraform state makes "equivalent" a diffable fact, not a manual claim).
- **Alternatives considered**: Plain `gcloud`/`bq` shell scripts only (rejected — harder to
  prove idempotency/equivalence per FR-013/FR-016 without a state file); Pulumi (rejected — no
  reason to add a second IaC ecosystem when Terraform is already installed and the team has no
  existing Pulumi investment).

## 2. Terraform state backend

- **Decision**: Two-phase bootstrap. **Phase 0 (imperative, tiny)**: a `bootstrap.sh` script
  runs a handful of `gcloud`/`gsutil` commands to (a) enable the ~4 APIs Terraform itself needs
  (`serviceusage`, `cloudresourcemanager`, `iam`, `storage`) and (b) create one GCS bucket for
  Terraform state. **Phase 1 (declarative)**: `terraform init` points at that bucket as its
  `gcs` backend; every other resource (remaining APIs, datasets, topic, IAM, secrets, budget,
  Cloud Run) is created by `terraform apply` from then on.
- **Rationale**: Terraform cannot manage a GCS backend it doesn't have credentials/a bucket for
  yet (chicken-and-egg) — a minimal imperative phase 0 is the standard resolution. Storing state
  in GCS (not local disk) makes the environment recoverable if the operator's machine is lost,
  supporting FR-016 (recreatable from documented steps).
- **Alternatives considered**: Local Terraform state (rejected — a single lost laptop would
  make the "documented, reproducible" claim false); Terraform Cloud/HCP (rejected — an extra
  hosted account and cost for a single-operator prototype with no team-coordination need).

## 3. Enabled services set (FR-002 minimality)

- **Decision**: Enable exactly: `bigquery.googleapis.com`, `run.googleapis.com`,
  `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `storage.googleapis.com`,
  `pubsub.googleapis.com`, `secretmanager.googleapis.com`, `cloudtrace.googleapis.com`,
  `logging.googleapis.com`, `monitoring.googleapis.com`, `aiplatform.googleapis.com`,
  `dataform.googleapis.com`, `billingbudgets.googleapis.com`, `cloudbilling.googleapis.com`,
  `iam.googleapis.com`, `cloudresourcemanager.googleapis.com`, `serviceusage.googleapis.com`.
- **Rationale**: Every entry maps to a concrete, currently-planned need (docs/05's table, plus
  the two billing APIs the budget resource requires and the three "Terraform needs these to
  manage anything" APIs). `dataflow.googleapis.com` and `bigquerydatatransfer.googleapis.com`
  (present in docs/05's broader list) are deliberately **excluded**: the OCWD dataset is a
  one-time, 15,624-row / ~39 MB batch load (docs/02) — a native `bq load` job is sufficient, and
  docs/02 itself lists Dataflow only as an *option* ("Dataflow (Apache Beam) **or** BQ native
  load job"). Enabling Dataflow now would violate FR-002's "no broader set than needed."
- **Alternatives considered**: Enabling the full docs/05 API list up front "to be safe"
  (rejected — directly contradicts FR-002 and SC-002's least-privilege spirit; a future feature
  that genuinely needs Dataflow can enable it then with its own justification, per the
  constitution's strong-defaults/written-justification pattern).

## 4. Secrets handling (FR-007, FR-008 HARD GATE)

- **Decision**: Terraform creates `google_secret_manager_secret` **containers only** (the named
  slot, no `secret_version`/value resource). The two secrets from docs/05 (`eia-api-key`,
  `watertap-engine-url`) are declared this way. Actual values are set out-of-band, after
  `terraform apply`, by the human running `infra/scripts/set_secret.sh <name>`, which pipes a
  value straight into `gcloud secrets versions add --data-file=-` — the value never touches a
  file, a tfvars, or Terraform state.
- **Rationale**: If a secret's value were a Terraform resource attribute, it would land in the
  `.tfstate` file — which is itself a governed artifact, not "source," but still a place a
  secret could leak if state is ever inspected or the bucket misconfigured. Keeping values
  entirely outside Terraform's data flow is the strictest reading of the HARD GATE.
- **Alternatives considered**: `google_secret_manager_secret_version` with value from a
  `sensitive` Terraform variable (rejected — `sensitive` suppresses console output but the
  value still persists in state); committing values to a gitignored `.tfvars` file (rejected —
  one `git add -f` mistake away from a real leak; out-of-band is safer by construction).

## 5. Budget and alert (FR-010)

- **Decision**: `google_billing_budget` scoped to the project, amount $50/month, threshold
  rules at 40% ($20, "warn") and 100% ($50, "cap notice" — a notification, not an enforced
  shutdown), wired to a `google_monitoring_notification_channel` (email) the operator supplies
  as a Terraform input variable.
- **Rationale**: Matches docs/05 exactly ($20 alert / $50 cap) and the constitution's ~$50/mo
  Engineering Constraint. Email is the simplest reliable channel for a single-operator
  prototype; the spec's edge case ("alert is a notification, not a hard stop") is stated
  explicitly in quickstart.md so the operator is never surprised.
- **Alternatives considered**: Pub/Sub-based budget notifications feeding an automated
  shutdown (rejected — over-engineered for a solo prototype; a hard automated shutdown also
  risks silently killing a demo mid-use, which is its own honesty problem).

## 6. Deploy-and-update path (FR-014, FR-015)

- **Decision**: A single generic script, `infra/scripts/deploy_service.sh <service-name>
  <source-dir> <service-account-email>`, wrapping `gcloud run deploy <service-name>
  --source <source-dir> --service-account <sa> --region us-central1 --min-instances 0`.
  Cloud Build performs the container build implicitly (buildpacks or a `Dockerfile` if present
  in `<source-dir>`); no separate `cloudbuild.yaml` is needed for this single-environment
  prototype.
- **Rationale**: `gcloud run deploy --source` is inherently idempotent (re-running on the same
  source updates the same named service/revision rather than creating a duplicate — satisfies
  FR-015) and requires no CI/CD platform to stand up. Features 001–008 that need a Cloud Run
  service (the physics engine, the serving API, the ADK agent) call this one script with their
  own name/path/service-account — a single, reusable contract (see
  `contracts/deploy-path-contract.md`) rather than each feature inventing its own deploy
  mechanism.
- **Alternatives considered**: A full GitHub Actions staging→production CI/CD pipeline via the
  ADK `agent-starter-pack setup-cicd` (rejected for *now* — the spec's own Assumptions rule out
  multi-environment promotion for this prototype; the `adk-deploy-guide` skill's CI/CD path
  remains available to adopt later, e.g. when Feature 007's agent needs it, without having to
  undo anything built here).

## 7. Proving the deploy path before any business-logic service exists

- **Decision**: Provision one minimal placeholder Cloud Run service, `platform-healthcheck`
  (a trivial container returning `200 {"status":"ok"}`), deployed via
  `deploy_service.sh` itself, so User Story 1/4's Independent Tests ("run the deploy path and
  confirm the application reaches a running, reachable state") are verifiable now — not
  deferred until Feature 003 or 007 ships real code.
- **Rationale**: The spec's SC-006 requires proving the deploy path end-to-end; without
  *something* to deploy, that success criterion is untestable until much later work lands,
  which would leave this feature's own acceptance criteria unverified for weeks. A trivial
  health-check service is legitimate 009 scope (it doubles as the observability smoke-test
  target for FR-019), not business logic that belongs to a later feature.
- **Alternatives considered**: Skipping the live deploy proof and treating FR-014/SC-006 as
  "will be proven when Feature 003 deploys" (rejected — defers evidence for a claim this
  feature itself makes; violates the evidence-before-claim spirit even though Principle II is
  formally scoped to twin-accuracy claims, not infra).

## 8. Test strategy for infrastructure (Principle VII analogue)

- **Decision**: Two layers. **Unit**: Terraform native tests (`terraform test`,
  `infra/tests/bootstrap.tftest.hcl`) run against `terraform plan` output — fast, offline,
  assert structural properties (e.g. "no `google_service_account_iam_member` grants
  `roles/owner` or `roles/editor`"; "exactly 6 `google_bigquery_dataset` resources exist").
  **Acceptance**: `infra/tests/verify_bootstrap.sh`, a read-only bash script using
  `gcloud`/`bq` `describe`/`list` calls, checked against the live environment, one assertion
  per Success Criterion (SC-001 through SC-010).
- **Rationale**: `terraform test` ships in Terraform ≥1.6 (no extra toolchain) and gives fast
  red→green feedback while writing `.tf` files — the direct analogue of TDD for infra. The
  bash acceptance script is the literal, automatable form of the spec's Independent Tests, and
  doubles as the reusable go/no-go check after any future teardown-and-recreate (SC-008).
- **Alternatives considered**: Terratest (rejected — adds a Go toolchain to a Python-only
  project for no functional gain at this scale); skipping automated infra tests entirely and
  relying on manual `gcloud console` inspection (rejected — violates Principle VII's spirit and
  makes SC-008's "equivalent after recreation" claim unverifiable).

## 9. IAM least-privilege mapping

- **Decision**: Four service accounts, matching docs/05 exactly:
  - `watertap-engine@` — `roles/bigquery.dataEditor` scoped to `ro_simulation` only.
  - `serving-api@` — `roles/bigquery.dataViewer` scoped to `ro_serving` + `ro_forecasts` only.
  - `adk-agent@` — `roles/bigquery.dataViewer` on all 6 datasets (it orchestrates across
    capabilities per Feature 007) + `roles/run.invoker` on `watertap-engine` only.
  - `dataform@` — `roles/bigquery.dataEditor` scoped to `ro_curated`, `ro_serving`,
    `ro_forecasts`, `ro_embeddings`.
  The human operator's day-to-day role is `roles/bigquery.jobUser` + `roles/run.developer` +
  `roles/logging.viewer` — **not** `roles/owner`/`roles/editor`; elevated Owner rights are
  used only transiently during the one-time bootstrap (the account performing `terraform
  apply` the first time), consistent with FR-006.
- **Rationale**: Directly satisfies FR-005/FR-006/SC-002 (zero service identities with
  project-wide admin roles) using dataset-level IAM conditions/bindings rather than
  project-level roles.
- **Alternatives considered**: One shared service account for all services (rejected — fails
  least-privilege outright: a compromised or buggy service would then reach every dataset).

## 10. Region and project

- **Decision**: All resources in `us-central1`; project `spatial-cat-489006-a4`
  (`abdullahabtahi21@gmail.com`, project number `903682941870`) — already authenticated and
  confirmed active in this session.
- **Rationale**: Matches docs/05's region choice (lowest cost tier, low CO₂) and the user's
  existing GCP account/project, avoiding a second project-creation step.
- **Alternatives considered**: Creating a fresh dedicated project (rejected — user explicitly
  supplied an existing project to use).
