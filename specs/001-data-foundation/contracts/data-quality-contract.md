# Contract: Data Quality Surfaces

The ground-truth labels and honesty surfaces every validation/economics/assistant feature
depends on.

## `ro_curated.cip_events` — the ONLY sanctioned ground-truth maintenance label source

| Column | Type | Notes |
|---|---|---|
| `unit_id` | STRING | |
| `cip_date` | DATE | |
| `cycle_id_closed` | INT64 | |

**Contract**: Feature 005 (Fouling Validation) treats this table, and only this table, as the
ground-truth label set for its backtest. Row count MUST reconcile exactly with the source
`cip = 1` count (~71) — reconciliation is enforced by a Dataform assertion, not asserted after
the fact.

## `ro_curated.cleaning_cycles`

| Column | Type | Notes |
|---|---|---|
| `unit_id`, `cycle_id` | STRING, INT64 | |
| `cycle_start_date`, `cycle_end_date` | DATE | `cycle_end_date` NULL for an open (unfinished) final cycle |
| `cycle_length_days` | INT64 | NULL for an open cycle |

**Contract**: `cycle_id` on this table matches `cycle_id` on `ro_curated.unit_readings` exactly
— a join must never produce an orphaned reading or an empty cycle.

## `ro_curated.signal_provenance` — the measured-vs-modeled source of truth (Principle IV)

| Column | Type | Notes |
|---|---|---|
| `unit_id` | STRING | |
| `signal_name` | STRING | Currently: `"energy"` (extensible) |
| `provenance` | STRING | `'measured'` \| `'not_available'` — no third value |

**Contract**: Any feature that surfaces a measured/modeled label to a user (006 Economics, 007
Assistant) MUST read this table for the "measured" half of the label — never infer provenance
from a NULL check alone (a NULL can mean "not available" or "measured but missing this day";
only this table disambiguates the former).

## `ro_curated.data_completeness`

| Column | Type | Notes |
|---|---|---|
| `unit_id`, `signal_name` | STRING, STRING | Only for signals `signal_provenance` marks `'measured'` for this unit |
| `non_null_count`, `total_days` | INT64 | |
| `first_gap_date`, `last_gap_date` | DATE, nullable | |

**Contract**: This is advisory/informational only — no downstream feature should block on it,
but any feature computing a statistic over a signal with <95% completeness for a unit SHOULD
surface that as a confidence caveat (ties into Constitution Principle II, evidence-with-value).

## Bounds-validation contract (`is_out_of_range`)

| Checked column | Valid range |
|---|---|
| `unit_recovery` | 0–1 |
| `ph` | 0–14 |
| `turb`, `cl2_tot`, flow/pressure/EC columns | ≥ 0 |

**Contract**: A row failing any check has `is_out_of_range = TRUE` and remains in
`unit_readings` (never dropped, per FR-001/FR-014). Downstream features MAY filter on this
flag; none may silently ignore it while presenting the row's other values as fully trustworthy.
