# Data Model: Data Foundation

Concrete table schemas for every Key Entity in [spec.md](./spec.md), grounded in the actual
CSV headers inspected during planning (both A01/128-col and F01/117-col layouts) and the
verified dataset facts in repo memory (`/memories/repo/ocwd-dataset-facts.md`).

## Operating Unit (identity, not a standalone table — carried on every row)

| Field | Type | Notes |
|---|---|---|
| `unit_id` | STRING | e.g. `"A01"`, `"F03"` — parsed from source filename |
| `bank_id` | STRING | `"A"`…`"G"` |
| `stage` | INT64 | `1`, `2`, or `3` |

## `ro_raw.unit_readings_ae_raw` (banks A–E, verbatim + identity)

128 source columns (verbatim names/values, unmodified) + `unit_id`, `bank_id`, `stage`,
`reading_date` (parsed from source `date`). Append-only in spirit; loaded via `WRITE_TRUNCATE`
since this is a one-time static historical backfill (§1 research.md).

## `ro_raw.unit_readings_fg_raw` (banks F–G, verbatim + identity)

117 source columns (verbatim names/values, unmodified) + the same 4 identity columns.

## `ro_curated.unit_readings` (harmonized core — Daily Reading entity)

| Column | Type | Source | Notes |
|---|---|---|---|
| `unit_id`, `bank_id`, `stage`, `reading_date` | STRING/STRING/INT64/DATE | identity | Partition by `reading_date`, cluster by `(bank_id, unit_id, stage)` |
| `temp_c` | FLOAT64 | direct | |
| `unit_recovery` | FLOAT64 | direct | Range-checked 0–1 (§9 research.md); note: profiling shows this is often a *controlled setpoint*, not a fouling signal — carried here as a fact, not flagged specially |
| `unit_dp`, `unit_n_delta_p` | FLOAT64 | direct | Normalized ΔP — primary fouling indicator |
| `stage_1_flux`, `stage_2_flux`, `stage_3_flux` | FLOAT64 | direct | Per-stage flux; `stage_3_flux` is the strongest fouling signal per repo profiling (d=-0.93) |
| `perm_ec`, `ec` (feed), `conc_ec`, `percent_ec_removal` | FLOAT64 | direct | Salt rejection proxy |
| `ph`, `turb`, `cl2_tot` | FLOAT64 | direct | Feed-water quality |
| `rof_toc_avg` (feed), `rop_toc_avg` (permeate), `percent_toc_removal` | FLOAT64 | direct | Organic fouling driver |
| `cip` | BOOL | direct (relayed) | Event label, 0/1 in source |
| `dss_derived` | INT64 | **re-derived**, not copied | Days-since-cleaning saw-tooth (research.md §5) |
| `days_since_replacement` | INT64 | direct | Membrane age — monotonic, distinct from `dss_derived` |
| `cycle_id` | INT64 | derived | FK to `cleaning_cycles`; every row belongs to exactly one cycle |
| `is_out_of_range` | BOOL | derived | TRUE if any bounds-checked column failed validation (research.md §9) — row is still present, never dropped |

## `ro_curated.unit_energy` (Daily Reading's energy component — separate table)

| Column | Type | Notes |
|---|---|---|
| `unit_id`, `reading_date` | STRING, DATE | keys |
| `total_kw`, `k_wh_feed_pump`, `erd_k_w`, `amps_erd` | FLOAT64, nullable | Populated (measured) ONLY for banks F–G; NULL and marked `not_available` via `signal_provenance` for A–E — no modeled stand-in here (deferred to Feature 003) |

## `ro_curated.cip_events` (Cleaning Event entity)

| Column | Type | Notes |
|---|---|---|
| `unit_id` | STRING | |
| `cip_date` | DATE | The recorded cleaning date |
| `cycle_id_closed` | INT64 | The cycle number this event closes — makes the row directly usable as a validation label (FR-011) |

~71 rows across 21 units (verified in repo profiling). Reconciled 1:1 against source `cip = 1`
rows (FR-010) — an assertion checks the count matches exactly.

## `ro_curated.cleaning_cycles` (Cleaning Cycle entity)

| Column | Type | Notes |
|---|---|---|
| `unit_id`, `cycle_id` | STRING, INT64 | keys |
| `cycle_start_date` | DATE | Day after the prior CIP (or history start for the first cycle) |
| `cycle_end_date` | DATE | The CIP date that closes this cycle (NULL/history-end for an open final cycle) |
| `cycle_length_days` | INT64 | `cycle_end_date - cycle_start_date` (NULL if open) |

## `ro_curated.signal_provenance` (Signal Provenance entity)

| Column | Type | Notes |
|---|---|---|
| `unit_id` | STRING | |
| `signal_name` | STRING | e.g. `"energy"`, `"turbidity"` |
| `provenance` | STRING | `'measured'` or `'not_available'` — static per unit, never per-row |

Small, static table (21 units × handful of signals). The canonical row: `energy` = `measured`
for banks F–G, `not_available` for A–E.

## `ro_curated.data_completeness` (supports FR-015, distinct from provenance)

| Column | Type | Notes |
|---|---|---|
| `unit_id`, `signal_name` | STRING, STRING | Only for signals the unit *does* support (per `signal_provenance`) |
| `non_null_count`, `total_days` | INT64 | Populated-vs-total for this unit/signal |
| `first_gap_date`, `last_gap_date` | DATE, nullable | First/last date with a missing (NULL) reading for this signal |

## Entity relationship summary

```
unit_readings_{ae,fg}_raw  --(Dataform staging)-->  unit_readings + unit_energy
                                                            |
                                                            +--> cip_events --closes--> cleaning_cycles
                                                            |
                                                            +--> signal_provenance (static)
                                                            +--> data_completeness (derived summary)
```
