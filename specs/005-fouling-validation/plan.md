# Implementation Plan: Fouling Validation & Source Attribution

**Branch**: `feature/003-source-tracing` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-fouling-validation/spec.md`

## Summary

The evidence-first validating run for the fouling signal, on the real 71-CIP ground-truth catalog.
Two outputs: (1) a **lead-time backtest** — for each actual CIP, how many days earlier did the 003
deviation cross a warning threshold — reported as a **distribution** (central tendency + spread)
with catch-rate, precision/false-alarm and recall (FR-003–FR-007); and (2) **source attribution** —
per fouling cycle, the fouling mechanism most consistent with the feed signals + FilmTec/Hydranautics
symptom→cause tables, labeled measured-vs-modeled, with co-candidates where signals can't separate,
and never reweighting the measured ranking (FR-022 + honesty contract). This is the ONLY feature that
may publish accuracy/lead-time numbers (Constitution HARD GATE II). Publishes to `ro_simulation`.

Framing (docs/08): measured onset dss≈36 vs CIP dss≈179 → a ~140-day onset→CIP **decision window**;
005 reports lead time, never "predicts the exact cleaning date" (SC-008).

## Technical Context

- **Language/deps**: Python 3.11, pandas/numpy; reads `ro_curated.unit_readings` + 003 deviation.
- **Ground truth**: 71 CIP events (Feature 001 catalog).
- **Storage**: `ro_simulation.fouling_attribution` (clustered `bank_id,unit_id`), region us-central1.
- **Evidence base**: `EVIDENCE.md` (FilmTec/Hydranautics/ASTM D4516/D3739/D4189, EPA PMF, Flemming/Hoek).

## Constitution Check

| Principle / Gate | Status |
|---|---|
| II (HARD GATE) — 005 is the validating run; accuracy/lead-time earned from history | ✅ backtest on 71 real CIPs; catch-rate/lead-time measured, not asserted |
| IV — measured (leading indicator) vs modeled (scaling corroboration) labels | ✅ attribution labels; scaling on assumed ion profile = modeled (FR-022) |
| V — leading indicator on 003 deviation; cycle-scoped | ✅ warning threshold on the confound-free signal |
| Evidence-first (FR-007 pre-registered params) | ⚠️ current thresholds are fixed but not formally pre-registered; false-positive rate not yet reported → tasks below |

## Project Structure

- `services/source-tracing/fouling_validation.py` — 71-CIP lead-time backtest + attribution driver
- `services/source-tracing/attribute.py` — feed-side fingerprint attribution (imported)
- `services/source-tracing/EVIDENCE.md` — cited standards base

## Complexity Tracking

| Deviation | Why | Mitigation |
|---|---|---|
| Thresholds not formally pre-registered (FR-007) | prototype tuned WARN_RISE/anchor | pre-register params + report precision/recall (T-006/T-007) |
| Lead time reported as median+IQR, not full distribution | prototype summary | expand to full distribution (FR-003/FR-004) |
| Source-tracing placement (from 003 US5) | scope pending Abdullah | 005 FR-022 is the natural home; confirm and consolidate |
