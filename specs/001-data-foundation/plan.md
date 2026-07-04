# Implementation Plan: Data Foundation

**Branch**: `001-data-foundation` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-data-foundation/spec.md`

## Summary

Ingest the 21-unit OCWD BWRO history (15,624 daily rows, 2019-01-01 → 2021-01-13, two source
layouts: 128-col banks A–E / 117-col banks F–G) into the BigQuery datasets Feature 009
provisioned (`ro_raw`, `ro_curated`), harmonize both layouts onto one ~40-column core schema,
re-derive the days-since-cleaning saw-tooth and cleaning-cycle grouping from first principles
(cross-validated against the source `dss`/`cip` columns rather than trusted blindly), catalog
the ≈71 CIP events as a ground-truth label table, and publish an explicit per-unit/per-signal
measured-vs-not-available provenance table. Technical approach: a one-time idempotent Python
loader (CSV → GCS → `bq load`, `WRITE_TRUNCATE`) lands the two raw layouts verbatim plus 4
identity columns, then a Dataform project (staging → curated) performs all harmonization,
cycle/CIP derivation, provenance, and bounds-validation as versioned, assertion-tested SQL —
per Constitution Principle I (BigQuery-as-AI-compute) and Principle VII (test-first, Dataform
assertions as the red→green mechanism for a data pipeline).

## Technical Context

**Language/Version**: Python 3.11 (one-time bulk loader only) + SQL (Dataform/BigQuery
Standard SQL for all harmonization/derivation — no general-purpose code in the transform path).

**Primary Dependencies**: `google-cloud-bigquery`, `google-cloud-storage` (loader script);
Dataform (GCP-native transform framework, `dataform.googleapis.com` already enabled by Feature
009); `bq`/`gcloud` CLI.

**Storage**: BigQuery datasets `ro_raw` and `ro_curated` (both provisioned, empty, by Feature
009 in `spatial-cat-489006-a4`/`us-central1`); GCS bucket `spatial-cat-489006-a4-raw-data`
(provisioned by 009) as the CSV landing zone before `bq load`.

**Testing**: Dataform assertions (uniqueness, not-null, accepted-range) as the primary
correctness gate, written before their corresponding transform per Principle VII; `pytest` for
the Python loader (idempotency, identity-tagging correctness, row-count fidelity); a bash
acceptance script exercising every Success Criterion (SC-001…SC-008) against the live tables.

**Target Platform**: BigQuery, `us-central1`, project `spatial-cat-489006-a4` — no serverless
compute of its own; the loader runs as a one-off local/Cloud Run Job invocation, not a
standing service.

**Project Type**: Data pipeline (ELT) — load + transform only; no API surface or UI.

**Performance Goals**: N/A at this scale (15,624 rows, ~40 MB) — correctness and reproducibility
dominate, not throughput.

**Constraints**: Zero fabricated values (FR-013) — every absence must be explicit NULL/flag,
never a substituted zero or estimate; raw tables are append-only/immutable once loaded
(FR-001); every derived feature must be reproducible byte-for-byte on re-run (FR-016, SC-007);
physically-implausible readings must be flagged, never silently passed through (FR-014).

**Scale/Scope**: 21 units, 15,624 raw rows split across 2 raw tables (banks A–E 128-col, banks
F–G 117-col), 1 harmonized curated table (~40 cols), 1 energy table, 1 CIP-event catalog
(~71 rows), 1 cleaning-cycle table, 1 signal-provenance table, 1 data-completeness summary.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. BigQuery-as-AI-Compute | ✅ PASS | All harmonization, cycle derivation, and validation are Dataform/BigQuery SQL — no external ETL engine (Dataflow deliberately excluded per Feature 009's research.md §3, since this is a one-time small batch load). |
| II. Evidence Over Assertion | ✅ PASS | This feature makes no accuracy/performance claim — it is a data-fidelity layer. Its own correctness is evidenced by Dataform assertions + the acceptance script, not asserted. |
| III. Advise-Only, HITL (HARD GATE) | ✅ N/A | No agent, no actuation surface here. |
| IV. Measured vs. Modeled Honesty | ✅ PASS | FR-012/FR-013 and the Signal Provenance entity are a direct implementation of this principle — energy measured-on-F–G / not-available-on-A–E is the canonical example, marked explicitly, never modeled here (modeling absent signals is explicitly deferred to Feature 003, per spec Assumptions). |
| V. Physics-Grounded Fidelity | ✅ PASS (grounds it) | Provides the `dss` cycle-relative feature (re-derived, not blindly trusted) that Principle V's fouling-by-cycle-not-age requirement depends on. |
| VI. Honest Twin Maturity | ✅ N/A | This is the bulk-historical load; the live-replay event path is Feature 002. |
| VII. Test-First Discipline | ✅ PASS (by design) | Dataform assertions and loader `pytest` tests are written before/alongside each transform, red before the transform exists — the data-pipeline analogue of TDD. |
| Engineering Constraints | ✅ PASS | Python 3.11 loader; no secrets needed (BigQuery/GCS access via the `dataform@` service account Feature 009 already scoped); small, focused files. |

No violations. Complexity Tracking table is not applicable (empty by design).

*Post-Phase-1 re-check: unchanged — Phase 1 design (data-model.md, contracts/, quickstart.md)
introduces no new external dependency or compute engine beyond what this table already covers.
Still PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/001-data-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output — loader/Dataform/reproducibility/validation decisions
├── data-model.md         # Phase 1 output — table schemas for every Key Entity in spec.md
├── quickstart.md         # Phase 1 output — runnable validation guide (load → transform → verify)
├── contracts/             # Phase 1 output
│   ├── curated-schema-contract.md   # unit_readings + unit_energy column contract (shared input to 003-007)
│   └── data-quality-contract.md     # cip_events, cleaning_cycles, signal_provenance, data_completeness, bounds
└── tasks.md               # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
pipeline/
├── ingest/
│   ├── load_raw.py           # CSV -> GCS -> bq load (WRITE_TRUNCATE, idempotent) into ro_raw.*
│   ├── column_maps.py         # unit_id/bank_id/stage identity extraction from filename (pure functions)
│   └── requirements.txt        # google-cloud-bigquery, google-cloud-storage (Python 3.11)
├── dataform/
│   ├── dataform.json            # Dataform project config (warehouse=bigquery, default schema=ro_curated)
│   ├── definitions/
│   │   ├── staging/               # raw -> curated harmonization (unit_readings, unit_energy)
│   │   ├── curated/                 # cip_events, cleaning_cycles, signal_provenance, data_completeness
│   │   └── assertions/                # uniqueness/not-null/range/reconciliation checks (written first)
│   └── package.json
└── tests/
    ├── test_load_raw.py               # pytest: idempotency, identity tagging, row-count fidelity
    └── verify_data_foundation.sh        # bash acceptance script — checks live tables against SC-001..SC-008
```

**Structure Decision**: A new top-level `pipeline/` directory, parallel to `infra/` (Feature
009) and future `services/` (Features 003/007/008) — this feature has no application service,
so it doesn't belong under `services/`; it is the ELT layer that Features 003–007 read from.

## Complexity Tracking

*No Constitution Check violations — table intentionally left empty.*
