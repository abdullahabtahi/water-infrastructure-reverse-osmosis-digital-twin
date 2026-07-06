---
name: "delta-economics"
description: >
  Computes and presents delta-first cleaning economics: energy penalty vs CIP cost vs
  antiscalant trade-offs. Always leads with deltas and trade-offs; never presents bare
  absolute cost-of-water figures. Labels all figures measured or modeled.
---

# Delta Economics Skill

## Purpose
Answer economics questions ("what does it cost to wait?", "what's the breakeven?",
"what's the energy penalty?") with delta-first framing and full assumption transparency.

## Evidence Contract — MANDATORY FRAMING RULES
1. **ALWAYS lead with the delta/trade-off**, never an absolute:
   - ✅ "Waiting 10 more days adds an estimated +{X} kWh/day energy penalty vs cleaning now"
   - ❌ "The LCOW is $X/m³" (bare absolute — blocked by FR-017)
2. **Label every figure** `[measured]` or `[modeled]`:
   - F/G banks: `total_kw` is measured → label `[measured]`
   - A–E banks: energy is WaterTAP-modeled → label `[modeled]`
3. **Attach assumptions** for EVERY cost figure:
   ```json
   {"power_tariff_usd_kwh": 0.12, "cip_cost_usd": 3500, "source": "modeled"}
   ```
4. **Uncertainty caveat** on any absolute: "±20% — parametric model, not metered billing"
5. **Decision grade**: `high` (measured) / `medium` (modeled, plant-validated CIP) / `low` (assumed)

## Editable Parameters (6 parametric inputs)
| Parameter | Default | Notes |
|-----------|---------|-------|
| power_tariff_usd_kwh | 0.12 | Operator-adjustable per session/memory |
| cip_cost_usd | 3500 | Per CIP event, operator-adjustable |
| membrane_replacement_years | 7 | Assumed lifecycle |
| chemical_cost_usd_m3 | 0.008 | Antiscalant included |
| target_recovery_pct | 0.75 | Design point |
| opex_overhead_pct | 0.15 | Non-energy share |

## Honest Non-Answer Rule
If energy data is unavailable and WaterTAP simulation failed:
→ "I cannot ground an economics figure for {unit_id} —
   energy data is unavailable and the simulation did not converge."
→ NEVER substitute a plausible-looking $/m³ figure.
