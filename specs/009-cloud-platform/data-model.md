# Data Model: Cloud Platform & Delivery

This feature provisions infrastructure, not application data — so the "entities" below are
**cloud resources**, each with its defining attributes, the requirement it satisfies, and its
relationships to other resources. This is the resource inventory the Terraform root module
(`infra/terraform/`) implements.

## Cloud Project

| Attribute | Value |
|---|---|
| `project_id` | `spatial-cat-489006-a4` |
| `project_number` | `903682941870` |
| `region` (all resources) | `us-central1` |
| Owning account | `abdullahabtahi21@gmail.com` |

Satisfies: FR-001. Relationships: parent of every resource below.

## Managed Service Set (enabled APIs)

An ordered list of `google_project_service` resources (see research.md §3 for the full
17-entry list and rationale). Satisfies: FR-002. Relationships: must be enabled before the
resource that depends on it can be created (Terraform's implicit dependency graph handles
ordering via `depends_on`).

## Warehouse Dataset (× 6)

| `dataset_id` | Role | Written by (future) | Read by (future) |
|---|---|---|---|
| `ro_raw` | Verbatim source, append-only | Feature 001 ingest | Feature 001 transforms |
| `ro_curated` | Cleaned/normalized/enriched | Feature 001 (Dataform) | Features 003–006 |
| `ro_serving` | Materialized KPIs for UI | Feature 001 (Dataform) | Feature 008 UI |
| `ro_simulation` | WaterTAP baselines + deviations | Feature 003 | Features 004, 005 |
| `ro_forecasts` | `AI.FORECAST` outputs | Feature 004 | Features 006, 007 |
| `ro_embeddings` | Document/event embeddings | Feature 007 (RAG) | Feature 007 |

All partitioned by `DATE(reading_date)` and clustered by `(bank_id, unit_id, stage)` once
tables land (Feature 001's concern — this feature creates the empty dataset shells only).
Satisfies: FR-003. Relationships: each is the IAM-scoping unit for exactly one or more service
accounts (see IAM Role Matrix contract).

## Event Topic

| Attribute | Value |
|---|---|
| `topic_id` | `ro-readings` |
| Publishers (future) | Feature 002's replay harness; later, a live SCADA/OPC-UA/MQTT connector |
| Subscribers (future) | A BigQuery streaming-insert subscription into `ro_raw` |

Satisfies: FR-004. Relationships: the single seam Principle VI's "swap one connector, nothing
downstream changes" design depends on — created now, before either publisher exists.

## Service Identity (× 4)

| `account_id` | Roles | Scoped to |
|---|---|---|
| `watertap-engine@` | `roles/bigquery.dataEditor` | `ro_simulation` |
| `serving-api@` | `roles/bigquery.dataViewer` | `ro_serving`, `ro_forecasts` |
| `adk-agent@` | `roles/bigquery.dataViewer`, `roles/run.invoker` (on `watertap-engine` only) | all 6 datasets (read); 1 Cloud Run service (invoke) |
| `dataform@` | `roles/bigquery.dataEditor` | `ro_curated`, `ro_serving`, `ro_forecasts`, `ro_embeddings` |

Satisfies: FR-005. Relationships: each binds to specific Warehouse Datasets and, for
`adk-agent@`, to the `watertap-engine` Cloud Run service — never to the project as a whole.

## Operator Access Grant

| Attribute | Value |
|---|---|
| Principal | `abdullahabtahi21@gmail.com` |
| Day-to-day roles | `roles/bigquery.jobUser`, `roles/run.developer`, `roles/logging.viewer` |
| Bootstrap-only role | `roles/owner` (used transiently for the first `terraform apply`; not a standing grant this feature encodes) |

Satisfies: FR-006. Relationships: distinct from Service Identities — this is the human's
own grant, scoped for operate/inspect, not administer.

## Secret (× 2 containers, no values)

| `secret_id` | Used by (future) | Value source |
|---|---|---|
| `eia-api-key` | Feature 001 data pipeline | Set out-of-band via `set_secret.sh` |
| `watertap-engine-url` | Feature 007 agent | Set out-of-band via `set_secret.sh` |

Satisfies: FR-007, FR-008 (HARD GATE). Relationships: containers only; no
`google_secret_manager_secret_version` resource exists in Terraform (research.md §4).

## Budget & Alert

| Attribute | Value |
|---|---|
| Amount | $50/month |
| Warn threshold | 40% ($20) |
| Cap-notice threshold | 100% ($50) |
| Notification channel | Email (operator-supplied Terraform input) |
| Enforcement | Notification only — **no automated hard stop** |

Satisfies: FR-010, FR-020 (honest cost-posture documentation). Relationships: scoped to the
Cloud Project as a whole (billing budgets are billing-account/project scoped, not per-resource).

## Bootstrap Checklist

The ordered, copy-pasteable procedure in `quickstart.md` — phase 0 (imperative) then phase 1
(`terraform apply`). Satisfies: FR-012, FR-013, FR-016. Relationships: the human-facing
artifact that produces every resource above, in dependency order.

## Deploy Path

`infra/scripts/deploy_service.sh <service-name> <source-dir> <service-account-email>` —
satisfies FR-014, FR-015. Relationships: consumed by every future Cloud Run service Features
001–008 introduce (see `contracts/deploy-path-contract.md`); proven now against the
`platform-healthcheck` placeholder service.

## Placeholder Cloud Run Service (proof artifact)

| Attribute | Value |
|---|---|
| `service_name` | `platform-healthcheck` |
| Image | Trivial container, returns `200 {"status":"ok"}` |
| `min_instances` | 0 |
| `service_account` | `serving-api@` (least-privilege reuse; it needs no elevated role for a health check) |

Satisfies: SC-001, SC-006 (independently testable proof the deploy path works before any
business-logic service exists — research.md §7). Not a permanent product surface; may be
decommissioned once a real service proves the same path in Feature 003/007/008.
