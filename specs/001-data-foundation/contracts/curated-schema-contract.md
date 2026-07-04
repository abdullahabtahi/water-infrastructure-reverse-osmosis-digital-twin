# Contract: Curated Schema (shared input to Features 003–007)

This is the most important contract in the project — every downstream feature (003 Physics
Deviation, 004 Forecast/Anomaly, 005 Fouling Validation, 006 Economics, 007 AI Assistant) reads
`ro_curated.unit_readings` and `ro_curated.unit_energy` as their **shared input**. A breaking
change here ripples to all five. Any change MUST be reviewed against this contract before
merging.

## `ro_curated.unit_readings`

| Column | Type | Nullable | Stability |
|---|---|---|---|
| `unit_id` | STRING | No | Stable key |
| `bank_id` | STRING | No | Stable key |
| `stage` | INT64 | No | Stable key |
| `reading_date` | DATE | No | Stable key; partition column |
| `temp_c` | FLOAT64 | Yes (genuine gap) | Stable |
| `unit_recovery` | FLOAT64 | Yes | Stable; range 0–1 when present, see `is_out_of_range` |
| `unit_dp` | FLOAT64 | Yes | Stable |
| `unit_n_delta_p` | FLOAT64 | Yes | Stable — primary confound-normalized fouling input for Feature 003 |
| `stage_1_flux`, `stage_2_flux`, `stage_3_flux` | FLOAT64 | Yes | Stable — `stage_3_flux` is the strongest fouling signal (Feature 005 depends on this exact column) |
| `perm_ec`, `ec`, `conc_ec`, `percent_ec_removal` | FLOAT64 | Yes | Stable |
| `ph`, `turb`, `cl2_tot` | FLOAT64 | Yes | Stable |
| `rof_toc_avg`, `rop_toc_avg`, `percent_toc_removal` | FLOAT64 | Yes | Stable |
| `cip` | BOOL | No (defaults false) | Stable |
| `dss_derived` | INT64 | No | Stable — THE cycle-relative fouling feature; downstream features MUST use this, never absolute `days_since_replacement`, per Constitution Principle V |
| `days_since_replacement` | INT64 | Yes | Stable — membrane age, monotonic |
| `cycle_id` | INT64 | No | Stable FK to `cleaning_cycles` |
| `is_out_of_range` | BOOL | No (defaults false) | Stable — downstream features SHOULD exclude or specially handle rows where this is TRUE |

**Row count contract**: exactly 15,624 rows (21 units × 744 days) once loaded — any deviation
is a loader or source-data regression, not an expected variation.

## `ro_curated.unit_energy`

| Column | Type | Nullable | Stability |
|---|---|---|---|
| `unit_id` | STRING | No | Stable key |
| `reading_date` | DATE | No | Stable key |
| `total_kw`, `k_wh_feed_pump`, `erd_k_w`, `amps_erd` | FLOAT64 | Yes — NULL for banks A–E (not-available, see `signal_provenance`), populated for F–G | Stable; Feature 003 supplies the modeled A–E stand-in in its OWN table (`ro_simulation`), never by mutating this one |

## Compatibility rule

Adding a nullable column here is non-breaking. Renaming, retyping, or removing any column
above — or changing `dss_derived`'s semantics — requires updating this contract AND notifying
every downstream feature's spec Dependencies section in the same change.
