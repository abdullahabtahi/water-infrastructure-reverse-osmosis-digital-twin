# Tasks: Forecasting & Anomaly Detection

**Feature**: 004-forecast-anomaly | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Foundational
- [x] T001 Consume the 003 deviation bus (`common.add_deviation`), NOT raw readings (FR-007/SC-005)
- [x] T002 Cycle-aware modeling: per (unit, cycle), onset resets at CIP (FR-008–FR-010)

## Phase 2: Forecast (US1)
- [x] T003 [US1] `forecast_anomaly.py` robust linear fouling trend → projected days-to-clean
- [x] T004 [US1] Prediction band from trend residual; NaN-safe (drop NaN before fit)
- [ ] T004b [US1] Attach explicit confidence-interval bounds + named drivers per forecast (FR-002/FR-003/FR-017)
- [x] T005 [US1] `forecast_bq.sql` — BigQuery `AI.FORECAST` (TimesFM), verified on real data (production path)

## Phase 3: Anomaly (US2)
- [x] T006 [US2] Rolling-median + MAD robust z-score anomaly flags (fast deviations vs slow trend)
- [x] T007 [US2] `forecast_bq.sql` — BigQuery `AI.DETECT_ANOMALIES` (last_n_points), verified on real data
- [ ] T008 [US2] Anomaly output names WHICH signal + HOW MUCH vs baseline (FR-006) — currently count only

## Phase 4: Honesty & Publish
- [x] T009 Low-confidence when history thin (<5 pts → no forecast); propagate 003 out-of-range (FR-004/FR-013)
- [x] T010 No accuracy/lead-time claims emitted here (FR-016/SC-006) — framed as signal+band
- [x] T011 Publish to `ro_forecasts.fouling_forecast` (clustered), region-pinned
- [ ] T012 [P] pytest ≥80%: trend, days-to-clean, MAD anomaly, empty-frame guard

## Dependencies
- Depends on 003 (deviation) + 001 (readings). Production compute = `forecast_bq.sql` (Principle I).
