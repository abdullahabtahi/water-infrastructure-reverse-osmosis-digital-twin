---
name: "fouling-diagnosis"
description: >
  Diagnoses membrane fouling for a given RO unit using operational signals from BigQuery.
  Returns a FoulingEvidence object (feature attribution) alongside the fouling severity score.
  Follows Constitution Principle II — every score must carry its feature attribution.
---

# Fouling Diagnosis Skill

## Purpose
Determine the fouling state of a specific RO unit and explain *why* based on measured signals.

## Evidence Contract
Every answer from this skill MUST include:
- `fouling_score` (0–1, higher = worse) — from `ro_curated.fouling_scores`
- `feature_attribution`: dict mapping signal → contribution weight (e.g. `{"dss": 0.41, "flux_decline_pct": 0.33, "ndp_norm": 0.26}`)
- `dss` (days since cleaning, saw-tooth) — NEVER use raw membrane age
- `provenance`: "plant-data" for measured signals, "modeled" for WaterTAP-derived

## Key Signals (BWRO 21-unit schema)
| Signal | Banks | Meaning |
|--------|-------|---------|
| `flux_normalized` | A–G | Normalized water flux — primary fouling indicator |
| `ndp_normalized`  | A–G | Normalized differential pressure |
| `dss`             | A–G | Days since last CIP — saw-tooth feature; DO NOT use monotonic age |
| `total_kw`        | F–G only | Measured energy; A–E must be WaterTAP-modeled |

## SQL Template
```sql
SELECT
  unit_id, date, fouling_score, dss,
  flux_normalized, ndp_normalized
FROM `{PROJECT}.ro_curated.fouling_scores`
WHERE unit_id = '{unit_id}'
  AND date BETWEEN '{start}' AND '{end}'
ORDER BY date DESC
LIMIT 30
```

## Honest Non-Answer Rule
If `fouling_score IS NULL` or `dss IS NULL` for the requested unit/period:
→ Return: "I don't know — fouling score is not available for {unit_id} in this period."
→ NEVER substitute a plausible-looking number.
