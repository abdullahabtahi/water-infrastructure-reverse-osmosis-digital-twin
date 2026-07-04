# Contract: IAM Role Matrix

The authoritative least-privilege mapping. Any future feature that needs a new service
identity or an additional role MUST extend this table (in the same pull request as the
Terraform change) rather than widen an existing entry — an over-broad grant on an existing
identity is an edge case this spec explicitly rejects (spec Edge Cases: "Over-broad role
requested by a later feature").

| Service Account | Role | Scope | Justification | Used by |
|---|---|---|---|---|
| `watertap-engine@<project>.iam.gserviceaccount.com` | `roles/bigquery.dataEditor` | `ro_simulation` dataset only | Writes clean-membrane baselines and deviation scores | Feature 003 |
| `serving-api@<project>.iam.gserviceaccount.com` | `roles/bigquery.dataViewer` | `ro_serving`, `ro_forecasts` datasets | Read-only API backing the UI | Feature 008 |
| `serving-api@<project>.iam.gserviceaccount.com` | `roles/run.invoker` (self, for `platform-healthcheck`) | `platform-healthcheck` Cloud Run service | Reused to run the proof-of-deploy-path placeholder | This feature (009) |
| `adk-agent@<project>.iam.gserviceaccount.com` | `roles/bigquery.dataViewer` | All 6 datasets | Cross-capability orchestration needs read access to every layer | Feature 007 |
| `adk-agent@<project>.iam.gserviceaccount.com` | `roles/run.invoker` | `watertap-engine` Cloud Run service only | Agent calls the physics engine as a tool | Feature 007 |
| `dataform@<project>.iam.gserviceaccount.com` | `roles/bigquery.dataEditor` | `ro_curated`, `ro_serving`, `ro_forecasts`, `ro_embeddings` | Runs transforms across these 4 layers | Feature 001 |
| `abdullahabtahi21@gmail.com` (human) | `roles/bigquery.jobUser` | Project | Run ad-hoc/interactive queries | Operator, day-to-day |
| `abdullahabtahi21@gmail.com` (human) | `roles/run.developer` | Project | Deploy/inspect Cloud Run services | Operator, day-to-day |
| `abdullahabtahi21@gmail.com` (human) | `roles/logging.viewer` | Project | Inspect logs without broader access | Operator, day-to-day |
| `abdullahabtahi21@gmail.com` (human) | `roles/owner` | Project | **Bootstrap only** — the first `terraform apply` that creates IAM itself | One-time setup, not a standing grant this feature encodes as policy |

## Hard rule

**Zero rows in this table may read `roles/owner` or `roles/editor` for a *service account*.**
`infra/tests/bootstrap.tftest.hcl` asserts this structurally (SC-002); `verify_bootstrap.sh`
re-asserts it against the live IAM policy.
