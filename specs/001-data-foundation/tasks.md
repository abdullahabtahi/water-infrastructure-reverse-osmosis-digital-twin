---

description: "Task list template for feature implementation"
---

# Tasks: Data Foundation

**Input**: Design documents from `/specs/001-data-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
(all present). Feature 009 (cloud platform) is live — `ro_raw`/`ro_curated` datasets and the
`spatial-cat-489006-a4-raw-data` bucket already exist, empty.

**Tests**: Included. Constitution Principle VII (Test-First Discipline) is a strong default,
and research.md §11 committed this feature to writing Dataform assertions and `pytest` cases
*before* their corresponding transform/function exists (red before green).

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md). Source data:
`dataverse_files/CSV files/` (21 files, verified). Target: BigQuery project
`spatial-cat-489006-a4`, datasets `ro_raw` / `ro_curated`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3/US4)

## Path Conventions

All paths relative to repository root, under `pipeline/` (per plan.md's Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory skeleton, dependencies, and the one-time Dataform repository link.

- [X] T001 Create the `pipeline/` directory skeleton: `pipeline/ingest/`, `pipeline/dataform/definitions/{staging,curated,assertions}/`, `pipeline/tests/`
- [X] T002 [P] Create `pipeline/ingest/requirements.txt` (`google-cloud-bigquery`, `google-cloud-storage`); confirm installable under Python 3.11
- [X] T003 [P] Confirm access to Feature 009's resources: `bq ls --project_id=spatial-cat-489006-a4` shows `ro_raw`/`ro_curated` (empty); `gcloud storage buckets describe gs://spatial-cat-489006-a4-raw-data` succeeds
- [X] T004 ~~Create the Dataform repository link~~ — SKIPPED: `gcloud dataform` command group does not exist in the installed SDK (560.0.0) in any release track (confirmed after installing beta + alpha components); the managed repository resource is unnecessary for local-CLI-only execution (research.md §10, revised)
- [X] T005 [P] Run `dataform init pipeline/dataform --default-database spatial-cat-489006-a4 --default-location us-central1` (Dataform CLI, installed via `npm install -g @dataform/cli`) — generates `workflow_settings.yaml` + `definitions/`/`includes/` per Dataform core 3.0+ convention (no `dataform.json`/`package.json` needed for this project's scope); `defaultDataset`/`defaultAssertionDataset` set to `ro_curated` (one of 009's 6 provisioned datasets, not a new `dataform`/`dataform_assertions` dataset)
- [X] T006 [P] Run `dataform init-creds pipeline/dataform` to create local `.df-credentials.json` (ADC-based BigQuery auth for the CLI); confirmed the credentials test query succeeds; already covered by Dataform's own generated `pipeline/dataform/.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Get raw data into BigQuery — every user story's curated transform reads from
`ro_raw`, so nothing downstream can be verified until this phase completes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 [P] Write `pipeline/tests/test_column_maps.py` (pytest, written first): given filenames like `orange_county_ro_A01.csv` / `orange_county_ro_F03.csv`, confirm `unit_id`/`bank_id`/`stage` parse correctly for all 21 real filenames; confirm it FAILS (module doesn't exist yet)
- [X] T008 [P] Implement `pipeline/ingest/column_maps.py` — pure functions parsing `unit_id`/`bank_id`/`stage`/layout-family (`"ae"` vs `"fg"`) from a source filename; no I/O
- [X] T009 Re-run `pipeline/tests/test_column_maps.py` — confirm all 21 filenames now PASS
- [X] T010 [P] Write `pipeline/tests/test_load_raw.py` (pytest, written first, mocked GCS/BQ clients): confirm `load_raw.py`'s upload+load step is idempotent (`WRITE_TRUNCATE` semantics) and tags every row with the 4 identity columns; confirm it FAILS (script doesn't exist yet)
- [X] T011 Implement `pipeline/ingest/load_raw.py`: read the 21 CSVs from a source directory, split by layout family using `column_maps.py`, upload to `gs://spatial-cat-489006-a4-raw-data/ocwd/`, `bq load --replace --autodetect` into `ro_raw.unit_readings_ae_raw` (banks A–E) and `ro_raw.unit_readings_fg_raw` (banks F–G), each row carrying `unit_id`/`bank_id`/`stage`/`reading_date`
- [X] T012 Re-run `pipeline/tests/test_load_raw.py` — confirm PASS
- [X] T013 Run `python pipeline/ingest/load_raw.py --source "dataverse_files/CSV files/" --project spatial-cat-489006-a4` against the real data; confirm `ro_raw.unit_readings_ae_raw` + `ro_raw.unit_readings_fg_raw` together total 15,624 rows (FR-001)
- [X] T014 Run `pipeline/ingest/load_raw.py` a second time with unchanged source; confirm row counts are identical (idempotency proof, supports FR-016/SC-007)

**Checkpoint**: Raw data is loaded and reproducible. User story work can now begin.

---

## Phase 3: User Story 1 - One queryable history across all 21 units (Priority: P1) 🎯 MVP

**Goal**: A single harmonized core table (`ro_curated.unit_readings` + `unit_energy`) that any
consumer can query across all 21 units without knowing the original per-unit layout.

**Independent Test**: Query the harmonized model for a shared core signal across all 21 units
and confirm one consistent shape, correct row count, and correct unit/bank/stage/date
attribution (quickstart.md SC-001/SC-002).

### Tests for User Story 1 (write first, confirm they FAIL before implementation)

- [X] T015 [P] [US1] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/unit_readings_shape.sqlx`): row count of `unit_readings` = 15,624; distinct `unit_id` count = 21; `(unit_id, reading_date)` is unique; run `dataform run` and confirm it FAILS (table doesn't exist yet)
- [X] T016 [P] [US1] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/no_always_empty_columns.sqlx`): for banks A–E, confirm `total_kw`, `erd_boost_pressure`, `calc_conc_cond`, `calc_2_3_cond`, `calc_conc_corr_factor` are absent from `unit_readings` (FR-005); confirm it FAILS (table doesn't exist yet)

### Implementation for User Story 1

- [X] T017 [US1] Create `pipeline/dataform/definitions/staging/stg_unit_readings_ae.sqlx` — selects the harmonized core columns (per contracts/curated-schema-contract.md) from `ro_raw.unit_readings_ae_raw`, excluding the 5 always-empty A–E columns (research.md §4)
- [X] T018 [US1] Create `pipeline/dataform/definitions/staging/stg_unit_readings_fg.sqlx` — same harmonized core columns from `ro_raw.unit_readings_fg_raw`
- [X] T019 [US1] Create `pipeline/dataform/definitions/curated/unit_readings.sqlx` — `UNION ALL` of the two staging models, producing the single harmonized `ro_curated.unit_readings` table (identity + core signals; `dss_derived`/`cycle_id`/`is_out_of_range` populated as NULL/false placeholders here, filled in by US2/US4)
- [X] T020 [US1] Create `pipeline/dataform/definitions/curated/unit_energy.sqlx` — `total_kw`/`k_wh_feed_pump`/`erd_k_w`/`amps_erd` from the F–G staging model only (banks A–E rows absent, not NULL-padded, per contracts/curated-schema-contract.md)
- [X] T021 [US1] Run `dataform run`; re-run T015/T016 assertions — confirm both now PASS
- [X] T022 [US1] Run the quickstart.md SC-002 query (a core signal across all 21 units, single query, no per-layout branching); confirm it returns 21 units' worth of data

**Checkpoint**: `ro_curated.unit_readings` + `unit_energy` exist, harmonized, verified — US1 independently complete (MVP).

---

## Phase 4: User Story 2 - Fouling framed by cleaning cycle, not membrane age (Priority: P2)

**Goal**: `dss_derived` (re-derived saw-tooth) and `cycle_id` grouping, cross-validated against
the source `dss` column rather than trusted blindly.

**Independent Test**: For any unit, confirm `dss_derived` resets within 1 day of each cleaning
event and increments by exactly 1 otherwise, and that `days_since_replacement` remains a
separate, non-resetting field (quickstart.md SC-003).

### Tests for User Story 2 (write first, confirm they FAIL before implementation)

- [X] T023 [P] [US2] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/dss_saw_tooth.sqlx`): for every unit, `dss_derived` increases by exactly 1 day-over-day except at a `cip = 1` row, where it resets; confirm it FAILS (column doesn't exist yet — still NULL from T019)
- [X] T024 [P] [US2] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/dss_matches_source.sqlx`): `dss_derived` matches the source `dss` column within a documented ±1-day boundary tolerance for >99% of rows, with mismatches surfaced (not silently dropped); confirm it FAILS

### Implementation for User Story 2

- [X] T025 [US2] Create `pipeline/dataform/definitions/curated/cleaning_cycles.sqlx` — derives `cycle_id`, `cycle_start_date`, `cycle_end_date`, `cycle_length_days` per unit from `cip` event boundaries (window functions over `reading_date` ordered per `unit_id`)
- [X] T026 [US2] Update `pipeline/dataform/definitions/curated/unit_readings.sqlx` (from T019) to compute `dss_derived` (days since the most recent prior `cip = 1` row, or since history start) and join `cycle_id` from `cleaning_cycles` — replacing the NULL placeholders (implemented self-contained via window functions directly on the unioned staging rows, with `cleaning_cycles` then summarizing FROM this table, to avoid a circular Dataform dependency)
- [X] T027 [US2] Run `dataform run`; re-run T023/T024 assertions — confirm both now PASS
- [X] T028 [US2] Run the quickstart.md SC-003 spot-check for a sample unit (e.g. `F01`) and confirm the saw-tooth visually/numerically resets at its recorded CIP dates

**Checkpoint**: `dss_derived` and `cycle_id` are correct and verified — US2 independently complete (depends on US1's `unit_readings` shell existing, T019).

---

## Phase 5: User Story 3 - Cleaning events cataloged as ground-truth labels (Priority: P2)

**Goal**: `ro_curated.cip_events` — every source CIP event captured exactly once, usable as a
validation label.

**Independent Test**: Compare the cataloged events against the source `cip` signal and confirm
an exact reconciliation, with each event carrying the cycle it closes (quickstart.md SC-004).

### Tests for User Story 3 (write first, confirm it FAILS before implementation)

- [X] T029 [P] [US3] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/cip_events_reconcile.sqlx`): `COUNT(*)` of `cip_events` equals `COUNT(*)` of source rows where `cip = 1`, exactly, with zero missed or duplicated (unit_id, cip_date) pairs; confirm it FAILS (table doesn't exist yet)

### Implementation for User Story 3

- [X] T030 [US3] Create `pipeline/dataform/definitions/curated/cip_events.sqlx` — one row per `(unit_id, reading_date)` where `cip = 1`, joined to `cleaning_cycles` (T025) to populate `cycle_id_closed`
- [X] T031 [US3] Run `dataform run`; re-run T029 assertion — confirm PASS (~71 rows across 21 units)
- [X] T032 [US3] Run the quickstart.md SC-004 check: per-unit and facility-wide CIP counts reconcile with the source `cip` signal (verified: 71 events, 21 units — exact match to repo profiling)

**Checkpoint**: `cip_events` is a trustworthy ground-truth catalog — US3 independently complete (depends on `cleaning_cycles` from US2, T025).

---

## Phase 6: User Story 4 - Honest provenance: measured vs. absent per signal (Priority: P3)

**Goal**: `signal_provenance` (static measured/not-available per unit/signal) and
`data_completeness` (per-day gap summary), plus bounds-validation flagging on `unit_readings`.

**Independent Test**: For energy (metered only on F–G), confirm `signal_provenance` reports
`measured` for F–G and `not_available` for A–E, with zero absent values presented as measured
(quickstart.md SC-005/SC-006).

### Tests for User Story 4 (write first, confirm they FAIL before implementation)

- [X] T033 [P] [US4] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/signal_provenance_energy.sqlx`): `signal_provenance` reports exactly `measured` for banks F–G and `not_available` for banks A–E on `signal_name = 'energy'`; confirm it FAILS (table doesn't exist yet)
- [X] T034 [P] [US4] Write a Dataform assertion (`pipeline/dataform/definitions/assertions/bounds_check_rate.sqlx`): the fraction of rows with `is_out_of_range = TRUE` stays below a documented threshold (e.g. 0.5%); confirm it FAILS (column doesn't exist yet)

### Implementation for User Story 4

- [X] T035 [P] [US4] Create `pipeline/dataform/definitions/curated/signal_provenance.sqlx` — static seed: `energy` → `measured` for banks F–G, `not_available` for A–E (per data-model.md; extensible for future signals)
- [X] T036 [P] [US4] Create `pipeline/dataform/definitions/curated/data_completeness.sqlx` — per `(unit_id, signal_name)` where `signal_provenance = 'measured'`, computes `non_null_count`/`total_days`/`first_gap_date`/`last_gap_date`
- [X] T037 [US4] Update `pipeline/dataform/definitions/curated/unit_readings.sqlx` (from T026) to add `is_out_of_range` — TRUE if `unit_recovery NOT BETWEEN 0 AND 1`, `ph NOT BETWEEN 0 AND 14`, or any flow/pressure/EC column is negative; row is never dropped (FR-014)
- [X] T038 [US4] Run `dataform run`; re-run T033/T034 assertions — confirm both now PASS
- [X] T039 [US4] Run the quickstart.md SC-005/SC-006 checks: energy provenance correct (verified: A–E `not_available`, F–G `measured`, 3 units each); bounds check found 0/15,624 violations — consistent with the dataset's known excellent quality, not a vacuous check (logic runs, real thresholds applied)

**Checkpoint**: Provenance, completeness, and bounds-flagging are verified — US4 independently complete (depends on US1's `unit_readings`, T019/T026).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end reproducibility proof and full quickstart validation across all stories.

- [X] T040 Write `pipeline/tests/verify_data_foundation.sh` — one check per Success Criterion (SC-001 through SC-008), run against the live curated tables
- [X] T041 Run `pipeline/tests/verify_data_foundation.sh`; confirm all 8 checks PASS
- [X] T042 [P] Re-run `load_raw.py` + `dataform run` a second full time on unchanged source; diff row counts/checksums against the first run to prove SC-007 (byte-for-byte reproducibility) — confirmed IDENTICAL (all 6 table row counts + `unit_readings`' `dss_derived` checksum matched exactly, despite a transient network timeout mid-run that BigQuery's load-job retry handled transparently)
- [X] T043 [P] Run the quickstart.md SC-008 cross-plant sample query (steepest last-stage flux decline per unit in its current cycle) and confirm it answers without opening any raw CSV (fixed a correlated-subquery aliasing bug found while running it)
- [X] T044 Update `AGENTS.md`'s "Current stage" note if Feature 001 completion changes the accurate project-status summary
- [X] T045 Commit all `pipeline/` files and any doc corrections with a conventional-commit message; confirm `git status` is clean and no secret was ever staged

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories — raw data must exist before any curated transform can be written or tested.
- **User Stories (Phase 3–6)**: All depend on Foundational (Phase 2) completion.
  - **US1** (P1) has no dependency on US2/US3/US4 and is the MVP.
  - **US2** (P2) depends on US1's `unit_readings` shell existing (T019) to extend it.
  - **US3** (P2) depends on US2's `cleaning_cycles` (T025) for `cycle_id_closed`.
  - **US4** (P3) depends on US1's `unit_readings` (T019/T026) to add `is_out_of_range`.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- Dataform assertions/pytest tests are written first and confirmed to FAIL before the
  corresponding `.sqlx` transform or Python module exists.
- Staging models before curated models.
- `dataform run` (apply) before re-running tests.
- Story's own checkpoint before moving to the next story (if working sequentially).

### Parallel Opportunities

- T002–T003, T005–T006 (Setup) run in parallel.
- T015/T016 (US1 tests), T023/T024 (US2 tests), T029 (US3 test), T033/T034 (US4 tests) can all
  be *written* in parallel once Phase 2 completes — different files, no shared dependency —
  though US2/US3/US4's *implementation* has the sequential dependencies noted above.
- T035/T036 (US4's two new curated tables) run in parallel with each other.
- T042/T043 (Polish) run in parallel.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These two test-writing tasks can start together once Phase 1 completes:
Task: "Write pipeline/tests/test_column_maps.py (pytest, confirm it fails)"
Task: "Write pipeline/tests/test_load_raw.py (pytest, mocked clients, confirm it fails)"
# Then sequentially: implement column_maps.py (T008) -> pass T007 (T009)
#                    -> implement load_raw.py (T011) -> pass T010 (T012)
#                    -> real load run (T013) -> idempotency proof (T014)
```

---

## Implementation Strategy

**MVP first**: User Story 1 (Phase 3) alone already delivers the harmonized, queryable core
across all 21 units — the substrate Features 003–007 need first. Ship US1, verify its
checkpoint, then proceed to US2/US3/US4.

**Incremental delivery order** (recommended, matching spec priority):
1. Phase 1–2 (Setup + Foundational) — raw data loaded and reproducible.
2. Phase 3 (US1) — MVP: one harmonized core table, queryable across all units.
3. Phase 4 (US2) — cycle-relative fouling feature, re-derived and cross-validated.
4. Phase 5 (US3) — CIP ground-truth catalog, reconciled exactly.
5. Phase 6 (US4) — honest provenance + completeness + bounds flagging.
6. Phase 7 — full reproducibility and quickstart proof, ready to unblock Features 003–007.

Each phase after Foundational leaves the environment in a working, checkpointed state — the
project can treat "US1 done" as enough to start Feature 003's planning if time pressure
demands it, with US2–US4 following before Feature 005's validation run needs them.
