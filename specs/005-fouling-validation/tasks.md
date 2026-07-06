# Tasks: Fouling Validation & Source Attribution

**Feature**: 005-fouling-validation | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Lead-time backtest (US1)
- [x] T001 [US1] Use the 71 real CIP events as ground truth (FR-001)
- [x] T002 [US1] Per CIP: first-warning lookback on the deviation signal → lead days; robust clean anchor (window 10th pct)
- [x] T003 [US1] Report catch-rate + lead-time central tendency + spread (median, P25/P75) (FR-003/FR-004)
- [ ] T004 [US1] Pre-register threshold + sustained-warning min duration BEFORE the run (FR-005/FR-007)
- [ ] T005 [US1] Report precision / false-alarm rate + recall against the CIP catalog (FR-006)
- [ ] T006 [US1] Reconcile detected-cycle count vs CIP-label count (FR-017)
- [x] T007 [US1] Empty-frame guard (no usable window → safe zero-result, no crash)

## Phase 2: Source attribution (US2)
- [x] T008 [US2] `attribute.py` — feed-fingerprint + stage×ΔP×salt-passage symptom→cause logic
- [x] T009 [US2] Measured-vs-modeled labels; co-candidates where signals can't separate (FR-022 contract)
- [x] T010 [US2] Attribution never reweights the measured lead indicator (FR-022)
- [x] T011 [US2] Data-limit disclosures (no ion speciation / bio-vs-organic / SDI / free-Cl₂)
- [x] T012 [US2] Cited evidence base `EVIDENCE.md` (FilmTec/Hydranautics/ASTM/EPA PMF/Flemming)

## Phase 3: Honesty & Publish
- [x] T013 Exclude setpoint/temperature-confounded signals — use the normalized ΔP deviation (FR-012)
- [x] T014 Publish to `ro_simulation.fouling_attribution` (clustered), region-pinned
- [ ] T015 [P] pytest ≥80%: backtest lead-time, attribution labels, co-candidate emission
- [ ] T016 Consolidate 003 US5 source-tracing into 005 once placement confirmed (with Abdullah)

## Dependencies
- Depends on 004 (forecast) + 003 (deviation) + 001 (CIP catalog). 005 is the evidence-first gate (FR-016).
