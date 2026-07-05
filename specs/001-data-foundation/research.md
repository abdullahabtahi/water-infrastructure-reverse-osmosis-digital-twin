# Phase 0 Research: Data Foundation

All spec Assumptions already pin the source facts (21 units, 15,624 rows, two layouts, 71 CIP
events). This file resolves the *mechanism* decisions `/speckit.plan` owns per Constitution
Principle I. No `NEEDS CLARIFICATION` markers remain.

## 1. Ingestion mechanism: Python loader + `bq load`, not Dataflow

- **Decision**: A single idempotent Python script (`pipeline/ingest/load_raw.py`) reads the 21
  CSVs, tags each row with `unit_id`/`bank_id`/`stage`/`reading_date` derived from the filename,
  splits rows into the two layout families, uploads to
  `gs://spatial-cat-489006-a4-raw-data/ocwd/`, then runs `bq load --replace` (`WRITE_TRUNCATE`)
  into `ro_raw.unit_readings_ae_raw` (128-col family) and `ro_raw.unit_readings_fg_raw`
  (117-col family).
- **Rationale**: 15,624 rows / ~39 MB is a trivial one-time batch load. Feature 009's
  research.md §3 already excluded Dataflow from the enabled-services set for exactly this
  reason. `WRITE_TRUNCATE` makes re-running the loader trivially idempotent (FR-016, SC-007) —
  no dedup/merge logic needed for a static historical source.
- **Alternatives considered**: Dataflow/Apache Beam (rejected — no throughput or streaming
  need, adds an unused API surface); Dataform's own `declarations` + external table over GCS
  (rejected — native `bq load` is simpler and the two layouts' `bq load --autodetect` schemas
  are stable and known, so a managed native table is preferable to a perpetual external-table
  dependency on GCS file presence).

## 2. Raw-layer split: two physical tables, not one polymorphic table

- **Decision**: `ro_raw.unit_readings_ae_raw` (128 columns + 4 identity columns) and
  `ro_raw.unit_readings_fg_raw` (117 columns + 4 identity columns) — verbatim source columns,
  unmodified values, append-only in spirit (though loaded via truncate-replace since this is a
  static one-time historical backfill, not a live append stream).
- **Rationale**: The two layouts are genuinely different shapes (verified directly from the
  CSV headers: A01 has `stage_2_flow`/`x1st_pass_dp`/`kva`/`stage_N_bucket_flow`, absent on
  F01; F01 has `k_wh_feed_pump`/`erd_k_w`/`amps_erd`/`stage_N_d_p`, absent on A01). Forcing one
  polymorphic table would mean ~40 always-NULL columns depending on bank, which obscures rather
  than clarifies provenance. Two raw tables preserve the source faithfully (FR-001); the
  Dataform staging layer is where they converge onto one harmonized shape (FR-002).
- **Alternatives considered**: One raw table with a superset of all ~140 unique columns
  (rejected — misrepresents which columns a given bank's instrumentation actually produces,
  and complicates the "exclude entirely-empty source columns" requirement, FR-005).

## 3. Harmonized core schema — concrete column set

- **Decision**: `ro_curated.unit_readings` carries: `unit_id`, `bank_id`, `stage`,
  `reading_date` (keys); `temp_c`, `unit_recovery`, `unit_dp`, `unit_n_delta_p` (normalized ΔP —
  primary fouling indicator per repo profiling), `stage_1_flux`/`stage_2_flux`/`stage_3_flux`;
  `perm_ec`, `ec` (feed conductivity), `conc_ec`, `percent_ec_removal`; `ph`, `turb`, `cl2_tot`;
  `rof_toc_avg` (feed TOC), `rop_toc_avg` (permeate TOC), `percent_toc_removal`; `cip` (event
  flag, relayed from source); `dss_derived` (re-derived, see §5); `days_since_replacement`
  (membrane age, relayed verbatim — already monotonic in source).
- **Rationale**: This is exactly docs/02-data-pipeline.md's already-designed harmonized core,
  cross-checked against the two real headers pulled directly from the CSVs during this
  planning session — every listed source column name is confirmed present (verbatim) in at
  least one layout under the same name (e.g. `stage_1_flux`, `unit_recovery`, `unit_n_delta_p`,
  `rof_toc_avg` appear identically in both A01 and F01 headers).
- **Alternatives considered**: Reproducing all ~140 raw columns in curated (rejected — spec
  Assumptions explicitly scope harmonization to "the model-ready subset, not all 128/117
  columns"); renaming columns to new project-specific names (rejected — keeping source names
  verbatim minimizes translation errors and keeps curated traceable to raw).

## 4. Always-empty column exclusion (FR-005)

- **Decision**: `total_kw`, `erd_boost_pressure`, `calc_conc_cond`, `calc_2_3_cond`,
  `calc_conc_corr_factor` are excluded from `ro_curated.unit_readings` for banks A–E (they are
  present as columns in the raw A–E layout but 100% NULL for every A–E row — confirmed via
  repo profiling memory). `total_kw` (and the other energy columns) ARE included for banks F–G
  in `ro_curated.unit_energy`, where they are populated.
- **Rationale**: A column that is structurally present but always NULL for a bank-group is
  exactly the "empty placeholder passed off as a real signal" FR-005 forbids.
- **Alternatives considered**: Keeping the columns in curated as always-NULL for A–E (rejected
  — violates FR-005 literally; a consumer querying `total_kw` for an A–E unit should get "not
  available," not a NULL that's indistinguishable from a genuine sensor gap).

## 5. Re-deriving `dss` and cleaning cycles from first principles

- **Decision**: A Dataform SQL transform computes, per `unit_id` ordered by `reading_date`: a
  cycle number (incrementing at each `cip = 1` row) and `dss_derived` = days since the most
  recent prior `cip = 1` row (or since history start, for the first cycle) using
  `DATE_DIFF`/window functions — NOT a copy of the source `dss` column. An assertion then
  compares `dss_derived` to the source `dss` and flags (does not silently swallow) any
  systematic mismatch beyond a documented ±1-day boundary tolerance.
- **Rationale**: Spec Assumptions explicitly require this ("derives/validates it from first
  principles... rather than trusting the raw column blindly, to guarantee the saw-tooth and
  cycle grouping are correct") — the source `dss` is useful as a cross-check, not as the sole
  source of truth.
- **Alternatives considered**: Trusting source `dss` directly (rejected — spec explicitly rules
  this out); inferring cycles purely from `dss` resets without also anchoring to `cip` (rejected
  — `cip` is the authoritative event; `dss` is a derived quantity that should agree with it, not
  substitute for it).

## 6. CIP event catalog and cycle reconciliation

- **Decision**: `ro_curated.cip_events` = one row per `unit_id` + `reading_date` where the
  source `cip` flag is 1 (~71 rows across 21 units, matching repo profiling). Each row also
  carries `cycle_id_closed` — the cycle number (from §5) that this event closes.
  `ro_curated.cleaning_cycles` = one row per `unit_id` × cycle, with `cycle_start_date`,
  `cycle_end_date` (next CIP date, or the history's last date for an open final cycle),
  `cycle_length_days`.
- **Rationale**: Directly implements FR-009–FR-011 and the Cleaning Cycle / Cleaning Event Key
  Entities. Carrying `cycle_id_closed` on the event row is what makes an event "usable as a
  ground-truth label for the cycle it closes" (FR-011) without a downstream join guess.
- **Alternatives considered**: Deriving cycles purely from `dss` resets with no explicit
  `cip_events` table (rejected — the spec requires cataloging CIP events as a first-class,
  independently queryable label set, FR-009).

## 7. Signal provenance — static per-unit lookup, not per-row

- **Decision**: `ro_curated.signal_provenance` is a small static table:
  `(unit_id, signal_name, provenance)` where `provenance ∈ {'measured', 'not_available'}`,
  populated once from the known layout-family mapping (e.g. `energy` → `measured` for banks
  F–G, `not_available` for A–E). This is distinct from `data_completeness` (§8), which handles
  per-day gaps within a signal a unit does support.
- **Rationale**: The spec's Signal Provenance Key Entity is explicitly "per-unit, per-signal" —
  a structural fact about what a unit's instrumentation can produce, not a per-row runtime
  computation. A static table is the honest, minimal representation.
- **Alternatives considered**: Encoding provenance as a boolean column per signal per row in
  `unit_readings` (rejected — duplicates the same static fact 744 times per unit for no
  benefit, and conflates "never measured" with "measured but missing today").

## 8. Data completeness (per-day gaps) — separate from provenance

- **Decision**: `ro_curated.data_completeness` is a summary table:
  `(unit_id, signal_name, non_null_count, total_days, first_gap_date, last_gap_date)` computed
  per supported signal per unit, refreshed on every Dataform run. Within `unit_readings` itself,
  a missing daily reading for a signal the unit *does* support is represented as a genuine SQL
  `NULL` (not a sentinel), which is exactly what FR-013 requires.
- **Rationale**: Satisfies FR-015 ("data-completeness signals available") as a queryable
  summary rather than forcing every consumer to compute gap statistics themselves.
- **Alternatives considered**: No summary table, leaving gap-detection to each consumer
  (rejected — FR-015 explicitly requires completeness signals to be *available*, not merely
  theoretically derivable).

## 9. Bounds validation (FR-014) — flag, don't drop

- **Decision**: A `flags` Dataform assertion layer checks physically implausible values
  (`unit_recovery NOT BETWEEN 0 AND 1`, `ph NOT BETWEEN 0 AND 14`, negative flow/pressure/EC
  values) and raises an assertion failure if the out-of-range row rate exceeds a documented
  threshold (e.g. >0.5% of rows) — the source row itself is still loaded into curated with an
  `is_out_of_range` boolean flag per checked column, never silently dropped or corrected.
- **Rationale**: FR-014 says "flag or reject... rather than passing through as if trustworthy"
  — flagging (not deleting) preserves the raw historical record while making implausible values
  visibly distinguishable, which downstream features can choose to exclude.
- **Alternatives considered**: Silently dropping out-of-range rows (rejected — loses history
  and violates FR-001's "preserving every original reading"); silently clipping values to
  bounds (rejected — that is exactly the kind of fabrication FR-013 forbids).

## 10. Dataform execution mode — local CLI only, no managed repository resource

- **Decision**: Run Dataform entirely via the open-source local CLI (`npm install -g @dataform/cli`,
  `dataform run`/`dataform test` against BigQuery using Application Default Credentials) rather
  than provisioning a GCP-managed Dataform *repository* resource (the git-linked, Cloud-Console-
  schedulable resource `gcloud dataform repositories create` / `google_dataform_repository`
  would create).
- **Rationale**: Discovered hands-on during implementation — the installed `gcloud` SDK
  (560.0.0) has no `dataform` command group in any release track (stable/beta/alpha), and the
  managed repository resource is only needed for git-linked/scheduled cloud-orchestrated runs,
  which this single-operator prototype doesn't need. The local CLI runs the exact same
  `workflow_settings.yaml` + `definitions/` project directly against BigQuery, which is
  simpler and unblocks implementation immediately.
- **Alternatives considered**: `gcloud alpha dataform repositories create` (rejected — command
  group does not exist in this SDK build, confirmed after installing both beta and alpha
  components); a small feature-owned Terraform config declaring `google_dataform_repository`
  (rejected for now — adds a second small Terraform state for a resource this prototype does
  not need; can be added later if scheduled/Console-triggered runs become a requirement).

## 11. Test strategy (Principle VII analogue for a data pipeline)

- **Decision**: Three layers. **Unit**: `pytest` on `pipeline/ingest/column_maps.py` (pure
  filename → unit/bank/stage parsing, no I/O) and `load_raw.py`'s idempotency behavior (mocked
  GCS/BQ clients). **Assertion**: Dataform assertions (uniqueness, not-null, range,
  cip/cycle-reconciliation) written before each transform, red before the transform exists.
  **Acceptance**: `pipeline/tests/verify_data_foundation.sh`, one check per Success Criterion
  (SC-001…SC-008), run against the live curated tables after a full load+transform.
- **Rationale**: Mirrors the three-tier pattern already established for Feature 009
  (`terraform test` / `verify_bootstrap.sh`), applied to a data pipeline instead of infra.
- **Alternatives considered**: Dataform assertions only, no acceptance script (rejected — the
  spec's Success Criteria are end-to-end claims like "a new analyst can answer a cross-plant
  question," which needs a runnable proof beyond per-table assertions).
