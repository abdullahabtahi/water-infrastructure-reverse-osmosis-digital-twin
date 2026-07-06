---
name: "clean-now-or-wait"
description: >
  Recommends whether to CIP (clean-in-place) a unit now or wait, based on fouling trajectory,
  physics deviation, and cleaning economics. Returns a composite recommendation with evidence
  from all three contributing capabilities.
---

# Clean Now or Wait Skill

## Purpose
Answer "Should I clean unit {X} now or wait?" by synthesizing three evidence streams:
1. **Fouling trajectory** — current dss, fouling_score trend (DataAnalyst)
2. **Physics deviation** — simulated vs actual flux/NDP (Simulation sub-agent)
3. **Economics** — energy penalty today vs CIP cost vs projected penalty growth (Economics)

## Evidence Contract
The answer MUST include ALL of the following:
- **Fouling trajectory**: current `fouling_score`, `dss`, trend direction
- **Physics deviation**: `flux_deviation_pct` baseline vs actual (ForecastEvidence with CI)
- **Economics**: energy penalty delta ($/day if wait), CIP cost, breakeven point
  - Label ALL economics figures `measured` (F/G) or `modeled` (A–E, WaterTAP-derived)
  - Lead with delta: "Waiting 7 more days costs an estimated +{X}% energy penalty vs cleaning now"
  - Attach: `{"power_tariff_usd_kwh": X, "cip_cost_usd": Y, "source": "modeled | measured"}`

## Capability Disagreement Rule
If trajectory says "wait" but economics says "clean now" (or vice versa):
→ Surface the tension explicitly with each side's evidence — do NOT pick one silently.
→ Example: "The fouling trajectory suggests {X} days remain, but the economics show
  the breakeven is {Y} days — these signals disagree; here is each side's evidence: ..."

## Honest Non-Answer Rule
If WaterTAP simulation returns `value=None` or economics have no grounded figure:
→ "I cannot ground a clean-now-vs-wait recommendation for {unit_id} —
   {reason: missing data / unvalidated / out of range}."

## Decision Grade
Every recommendation carries a decision grade from Economics:
- `high`: backed by measured energy data (F/G banks)
- `medium`: modeled energy, plant-validated CIP cost
- `low`: fully modeled (A–E energy + assumed CIP cost)
