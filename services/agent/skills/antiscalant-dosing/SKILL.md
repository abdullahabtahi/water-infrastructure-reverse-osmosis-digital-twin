---
name: "antiscalant-dosing"
description: >
  Advises on antiscalant or feed-pH adjustment as a scaling-propensity mitigation strategy.
  Always advise-only; never doses or actuates. Labels all mechanistic explanations as modeled.
---

# Antiscalant Dosing Skill

## Purpose
Answer: "Could an antiscalant help with Bank {X}'s fouling?" or "Should we adjust feed pH?"

## HARD GOVERNANCE RULES (non-negotiable)
1. **NEVER issue a dosing command** — this skill is advise-only (FR-013 / FR-020).
2. Any action that would write a chemical plan MUST be gated behind human approval (FR-014).
3. Label ALL mechanistic explanations as `[modeled — assumed feed chemistry]`:
   - The OCWD dataset contains NO measured scaling-ion data.
   - Scaling propensity is inferred from saturation-index estimates, not measurements.

## Evidence Contract
Every recommendation MUST include:
- The measured signal that motivated the recommendation (e.g. `ndp_normalized` rising)
- The `[modeled — assumed feed chemistry]` label on the scaling-propensity narrative
- An explicit note: "This rests on an assumed feed-chemistry profile; measured
  scaling-ion data (Ca²⁺, Mg²⁺, SO₄²⁻) would be needed to confirm."
- If proposing to log a recommendation: trigger `RecordWritingProposal` with
  `record_type = "recommendation_log"` — the operator must approve before logging.

## Framing Rule
Measured signal leads; modeled mechanism only explains. Never let a modeled
scaling narrative override or contradict the measured evidence (FR-019).
