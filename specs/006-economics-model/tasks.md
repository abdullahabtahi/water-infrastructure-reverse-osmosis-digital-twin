# Tasks: Economics Model

**Feature**: 006-economics-model | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Foundational
- [x] T001 Consume the 003 deviation bus (`unit_n_delta_p_deviation`), not raw ΔP (Principle V)
- [x] T002 Small editable parameter set: energy price, pump η, recovery, permeate flow, CIP cost, downtime (FR-001)

## Phase 2: Delta-first model (US1)
- [x] T003 [US1] Extra SEC from fouling ΔP rise → daily energy penalty (measured/modeled energy basis)
- [x] T004 [US1] Cumulative penalty accrued per cycle vs one CIP cost — report the **difference** (FR-003/FR-006)
- [ ] T005 [US1] Emit explicit **break-even** day where it exists (FR-005)
- [x] T006 [US1] Honest finding + sensitivity (tariff × flow) surfaced (Constitution IV, ±20% absolutes)
- [ ] T007 [US1] measured (F–G metered) vs modeled (A–E WaterTAP) **provenance column** on each figure (FR-008)

## Phase 3: Robustness & Publish
- [ ] T008 Robust rankings + trade-off-flip flags (FR-011/FR-013)
- [ ] T009 Conversational parameter overrides + credibility/decision-grade metadata (FR-010/FR-020)
- [x] T010 Publish to `ro_forecasts.economics_tradeoff` (clustered), region-pinned
- [ ] T011 [P] pytest ≥80%: SEC formula, delta, break-even, param sensitivity

## Dependencies
- Depends on 003 (modeled energy / deviation) + 004 (fouling trajectory) + 001. Lead with deltas (FR-006).
