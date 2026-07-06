# Implementation Plan: Economics Model

**Branch**: `feature/003-source-tracing` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-economics-model/spec.md`

## Summary

A parametric, **delta-first** cost model for the "clean now vs. wait" decision. As a membrane fouls,
the 003 deviation (normalized ΔP rise) forces extra pump energy to hold the recovery setpoint — the
daily money penalty. A CIP costs chemicals + labor + downtime. The model reports the **difference**
(cost of waiting vs cost of cleaning) over a horizon and the **break-even** point, leading with
deltas, never absolute LCOW (absolutes ±20%, deltas robust — Constitution IV / FR-006). Energy is
labeled **measured** on the metered banks (F–G) vs **modeled** on A–E (WaterTAP). Consumes the 003
deviation bus + 004 fouling trajectory. Publishes to `ro_forecasts`.

Honest finding on this dataset: peak per-cycle energy penalty ≪ one CIP → at BWRO parameters,
fouling energy alone does not justify CIP; cleaning is driven by ΔP limits & water quality. Value =
avoiding ΔP damage / quality excursions; sensitivity scales with tariff and permeate flow.

## Technical Context

- **Language/deps**: Python 3.11, pandas/numpy.
- **Inputs**: 003 deviation bus (`unit_n_delta_p_deviation`); 6 editable params (energy price, pump η, recovery, permeate flow, CIP cost, downtime).
- **Storage**: `ro_forecasts.economics_tradeoff` (clustered `bank_id,unit_id`), region us-central1.

## Constitution Check

| Principle / Gate | Status |
|---|---|
| IV — lead with deltas, not absolute LCOW; measured vs modeled energy | ✅ daily/cum penalty deltas; ⚠️ measured/modeled label column = task |
| V — consumes 003 deviation, cycle-scoped | ✅ via `add_deviation` bus |
| II — no unvalidated claims; honest finding stated | ✅ finding + sensitivity disclosed |

## Project Structure

- `services/source-tracing/economics.py` — parametric clean-now-vs-wait, delta-first

## Complexity Tracking

| Deviation | Why | Mitigation |
|---|---|---|
| measured/modeled energy label not yet a column | prototype focused on deltas | add provenance column for A–E modeled vs F–G measured (FR-008) |
| break-even point not explicitly emitted | prototype reports penalty vs CIP | add break-even + trade-off-flip flags (FR-005/FR-013) |
| no conversational override / credibility grade yet | batch prototype | add param overrides + decision-grade metadata (FR-010/FR-020) |
