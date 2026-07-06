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
- [x] T005: Emit explicit break-even day where it exists (FR-005)
- [x] T006 [US1] Honest finding + sensitivity (tariff × flow) surfaced (Constitution IV, ±20% absolutes)
- [x] T007: Embed a `provenance` column on each figure, marking it as "measured" (for bank_id F, G) or "modeled" (A–E) to satisfy the AI governance rule (FR-008)

## Phase 3: Robustness & Publish
- [x] T008: Emit explicit flags indicating when the system has crossed a trade-off boundary (FR-006)
- [x] T009: Accept dynamic `params` map for overrides, outputting `credibility` (FR-010)
- [x] T010 Publish to `ro_forecasts.economics_tradeoff` (clustered), region-pinned
- [x] T011: Write unit test validating that missing or `NAN` inputs correctly output `credibility="none"` (FR-011)/FR-013)

## Dependencies
- Depends on 003 (modeled energy / deviation) + 004 (fouling trajectory) + 001. Lead with deltas (FR-006).
