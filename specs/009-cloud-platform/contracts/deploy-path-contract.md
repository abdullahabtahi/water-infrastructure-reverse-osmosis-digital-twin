# Contract: Deploy Path (for Features 001–008)

Any feature that ships a Cloud Run service (currently: Feature 003's physics engine, Feature
007's agent/serving surface, Feature 008's backend-for-frontend) deploys it through this one
script — not a bespoke deploy mechanism per feature.

## Calling convention

```bash
infra/scripts/deploy_service.sh <service-name> <source-dir> <service-account-email>
```

| Argument | Example | Notes |
|---|---|---|
| `service-name` | `watertap-engine` | Must match the Cloud Run service name the consuming feature's plan declares. |
| `source-dir` | `services/watertap-engine/` | Must contain either a `Dockerfile` or be buildpack-compatible (a `requirements.txt`/`pyproject.toml` for Python). |
| `service-account-email` | `watertap-engine@<project>.iam.gserviceaccount.com` | Must already exist — created by this feature's `iam.tf` or a follow-up Terraform change that extends the IAM Role Matrix contract. |

## What the script guarantees

- **Idempotent** (FR-015): re-running with the same `service-name`/`source-dir` updates the
  existing Cloud Run revision; it never creates a duplicate service.
- **Scale-to-zero by default** (FR-009): always passes `--min-instances 0` unless a future
  feature's plan explicitly overrides it with a written justification (Engineering Constraints).
- **Region-pinned**: always deploys to `us-central1` — no per-call region override.
- **No secret material as a flag**: the script never accepts a secret value as an argument;
  services that need a secret read it from Secret Manager at runtime (FR-007), and the script
  only wires the **reference** (`--set-secrets`), never a literal value.

## What a consuming feature's plan must supply

1. A service account already present in `contracts/iam-role-matrix.md` (or a Terraform change
   extending it, reviewed in the same PR).
2. A `source-dir` that builds cleanly via Cloud Build (Dockerfile or buildpacks).
3. Confirmation the service needs no broader IAM role than the matrix already grants — if it
   does, that's a Terraform change to `iam.tf`, not a flag on this script.

## Proof this contract works today

`platform-healthcheck` (this feature, 009) is deployed via this exact script and command
shape, before any of Features 001–008 have code — see `data-model.md`'s Placeholder Cloud Run
Service entry and `research.md` §7.
