---
name: "recovery-optimization"
description: >
  Recommends recovery rate adjustments for a unit or bank based on current flux,
  NDP, and feed pressure signals. Returns evidence-backed advice with measured/modeled labels.
---

# Recovery Optimization Skill

## Purpose
Answer: "Should I adjust recovery on unit {X}?" or "What's the optimal recovery target?"

## Evidence Contract
Every recommendation MUST include:
- Current `recovery_pct` — from `ro_curated.unit_readings`
- `target_recovery_pct` — from parametric model or BigQuery forecast
- `ndp_normalized` at current vs target recovery — from DataAnalyst
- `provenance` label: `measured` (F/G with `total_kw`) or `modeled` (A–E, WaterTAP)
- Any assumption override in effect (from MemoryBankFact if operator provided one)

## Honest Non-Answer Rule
If recovery is out of the supported model range (< 60% or > 90%):
→ Flag the limit: "This range is outside the validated WaterTAP model bounds —
   I cannot extrapolate a figure."
→ NEVER silently project beyond the validated range.

## Note on Feed Chemistry
The OCWD dataset carries NO scaling-ion measurements (Ca²⁺, Mg²⁺, SO₄²⁻).
If scaling propensity is invoked, label the mechanism as `[modeled — assumed feed chemistry]`
and note: "This rests on an assumed feed-chemistry profile; measured scaling-ion data
would improve confidence."
