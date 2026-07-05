# Quickstart: Data Foundation Validation

Run this after implementation to prove the feature works end-to-end. Assumes Feature 009's
environment is live (project `spatial-cat-489006-a4`, datasets `ro_raw`/`ro_curated` already
provisioned, empty).

## Prerequisites

- [x] `ro_raw` and `ro_curated` BigQuery datasets exist (Feature 009)
- [x] GCS bucket `spatial-cat-489006-a4-raw-data` exists (Feature 009)
- [ ] `pipeline/ingest/` Python environment set up (`pip install -r pipeline/ingest/requirements.txt`, Python 3.11)
- [ ] Dataform repository linked (`gcloud dataform repositories create` — see research.md §10; this feature's own one-time setup, not part of 009)

## 1. Load raw data

```bash
python pipeline/ingest/load_raw.py --source "dataverse_files/CSV files/" --project spatial-cat-489006-a4
```

Expected: `ro_raw.unit_readings_ae_raw` (banks A–E, 15 files × 744 rows) and
`ro_raw.unit_readings_fg_raw` (banks F–G, 6 files × 744 rows) both populated;
`SELECT COUNT(*) FROM ro_raw.unit_readings_ae_raw` + `ro_raw.unit_readings_fg_raw` = 15,624.

## 2. Run Dataform transforms

```bash
cd pipeline/dataform
dataform run --project-id spatial-cat-489006-a4
```

Expected: all Dataform assertions pass (uniqueness on `unit_readings` keys, not-null on
identity columns, CIP-count reconciliation, bounds-check rate below threshold).

## 3. Verify against every Success Criterion

```bash
./pipeline/tests/verify_data_foundation.sh
```

Expected output — one PASS line per criterion:

- **SC-001**: `SELECT COUNT(*) FROM ro_curated.unit_readings` = 15,624; distinct `(unit_id)` = 21
- **SC-002**: A single query returns a core signal (e.g. `unit_n_delta_p`) for all 21 units with no per-layout branching
- **SC-003**: For a sample unit, `dss_derived` resets within 1 day of each `cip_events` row and increments by exactly 1 otherwise
- **SC-004**: `SELECT COUNT(*) FROM ro_curated.cip_events` = the count of source `cip = 1` rows exactly (~71)
- **SC-005**: `signal_provenance` reports `energy` = `measured` for banks F–G, `not_available` for A–E; zero NULL energy rows on F–G are mistakenly reported `measured`
- **SC-006**: Zero rows anywhere present a fabricated zero/estimate where source data was NULL (spot-check: compare NULL counts in raw vs. curated for a sampled column)
- **SC-007**: Re-run steps 1–2 on unchanged source; confirm `ro_curated.*` table checksums/row-counts are identical to the first run
- **SC-008**: Run the sample cross-plant query below and confirm it answers without touching any raw CSV

```sql
-- SC-008 smoke query: steepest last-stage flux decline in current cycle, per unit
SELECT unit_id, cycle_id,
       MIN(stage_3_flux) - MAX(stage_3_flux) AS flux_decline
FROM ro_curated.unit_readings AS ur
WHERE cycle_id = (SELECT MAX(cycle_id) FROM ro_curated.unit_readings ur2 WHERE ur2.unit_id = ur.unit_id)
GROUP BY unit_id, cycle_id
ORDER BY flux_decline ASC
LIMIT 5;
```

## What this quickstart does NOT cover

- Modeling absent signals (e.g. physics-modeled energy for A–E) — Feature 003's job.
- Live/replay ingestion — Feature 002's job.
- Any accuracy claim about fouling detection — Feature 005's job, gated behind its own
  validating run (Constitution Principle II, HARD GATE).
