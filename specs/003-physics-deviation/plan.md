# Implementation Plan: Physics Deviation Engine (+ Source-Tracing)

**Branch**: `feature/003-source-tracing` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md) · [DRAFT-source-tracing-addendum.md](DRAFT-source-tracing-addendum.md)

**Input**: Feature specification from `specs/003-physics-deviation/spec.md`

## Summary

Give every operating reading a physics-grounded, confound-free health signal: the deviation of
the actual reading from the expected clean-membrane value under the same cycle position. Two
fidelity paths (FR-010/FR-011): an **analytical clean-cycle-anchor** path that covers 100% of
readings (deviation of normalized ΔP, salt passage, recovery from the freshly-cleaned start of
each cleaning cycle — `unit_n_delta_p` is already temperature-normalized, the D4516-aligned
confound-free quantity), and a **high-fidelity WaterTAP `ReverseOsmosis0D` + `NaClParameterBlock`
BWRO baseline** (solves `optimal` with BWRO scaling factors) that produces the clean-membrane
reference and degrades gracefully to the analytical path when the solver is unavailable. Layered
on top: a **source-tracing / fouling-mechanism attribution** capability that maps a deviation to
the feed-side mechanism (scaling / particulate / biofouling / organic / oxidation) most consistent
with the concurrent feed signals (EC, pH, turbidity, chlorine, TOC) and the FilmTec/Hydranautics
symptom→cause tables, at mechanism resolution only, with honest data-limit disclosures.

Technical approach: pure-Python analysis modules (services/source-tracing/) read the harmonized
history from `ro_curated.unit_readings` (Feature 001) and publish per-reading deviations to the
**`ro_simulation`** dataset (Feature 009 provisioned it as "WaterTAP baseline + physics deviation
scores"). The deviation is the shared confound-free bus that Features 004/005/006 consume.

## Technical Context

- **Language**: Python 3.11 only (WaterTAP supports 3.9–3.12; not 3.13+). Constitution engineering constraint.
- **Key deps**: `watertap==1.6.0`, `idaes-pse==2.12.0`, `pyomo==6.10.1`, `watertap-solvers==24.12.9`, `pandas`, `numpy`; BigQuery via `bq` CLI.
- **Solver**: Ipopt 3.4.2, obtained via `idaes get-extensions` into `~/.idaes/bin`. **NOTE (doc-vs-reality):** the constitution/`docs/03` say "bundled, never run get-extensions" — verified TRUE only for a **conda** install; a **pip/uv** install of `watertap-solvers` ships no binary (`~/.idaes/bin` empty), so `get-extensions` IS required. Recorded as a documented deviation; fix the docs to say "conda bundles it; pip needs get-extensions."
- **Storage / routing**: read `ro_curated.unit_readings`; write deviations to **`ro_simulation`** (per `bigquery.tf` / `specs/009/data-model.md`), partitioned `DATE(reading_date)`, clustered `(bank_id, unit_id, stage)`. Region `us-central1` (pin `--location`).
- **Target**: prototype runs locally; production home = WaterTAP Cloud Run service (`watertap-engine@` SA has `dataEditor` on `ro_simulation`). BigQuery-as-AI-compute is honored — the physics solve is separate compute writing baseline surfaces (Constitution Principle I).
- **Testing**: pytest; ≥80% coverage target (constitution). Reproducibility (FR-016) is directly testable.
- **Scale**: 15,624 readings × 21 units × ~92 cleaning cycles; 46,872 deviation records at 3 metrics.

## Constitution Check

| Principle / Gate | Status |
|---|---|
| I — BigQuery is primary AI compute; physics solve is separate compute | ✅ deviation is analysis over BQ data; WaterTAP writes baseline surfaces, not an ML pipeline |
| II — Evidence before claim; **no accuracy/lead-time claims here** | ✅ 003 emits the signal + provenance only; precision/lead-time deferred to 005 (SC-008) |
| IV — measured (F–G metered) vs modeled (A–E WaterTAP) labels; lead with deltas | ✅ provenance + fidelity on every record; energy deviation only where measured actual exists |
| V — detection on WaterTAP-clean-baseline delta; `dss` saw-tooth resets at CIP, never absolute age | ✅ clean anchor = freshly-cleaned cycle start; cycle-position, not membrane age |
| III (HARD GATE) — advise-only, read-only, never actuate | ✅ produces interpretations only |
| Secrets (HARD GATE) | ✅ no secrets in source; `bq` uses ADC |
| Whole-unit resolution, no element localization (FR-012) | ✅ enforced |

## Project Structure

### Documentation (this feature)
- `spec.md` (to fold in source-tracing from the DRAFT addendum), `plan.md` (this), `tasks.md` (next), `DRAFT-source-tracing-addendum.md`, `checklists/`.

### Source Code (repository root)
- `services/source-tracing/deviation.py` — 003 core (analytical + WaterTAP high-fidelity)
- `services/source-tracing/attribute.py` — source-tracing fingerprint attribution
- `services/source-tracing/common.py` — shared BigQuery/CSV loader
- `services/source-tracing/EVIDENCE.md` — cited standards base (FilmTec/Hydranautics/ASTM/EPA PMF)
- `services/source-tracing/deploy_serving.sh` — publish outputs to BigQuery (to be re-routed to `ro_simulation`)

## Integration decisions (from full-repo recon, 2026-07-06)

1. **Dataset routing (correction):** publish 003 deviations to **`ro_simulation`**, not `ro_serving`. `ro_serving` is Dataform-written UI KPI views (only `dataform@` has write). Drop the mis-placed `ro_serving.st_*` tables created during prototyping.
2. **003 is the shared bus:** 004/005/006 MUST consume the 003 deviation (004 FR-007 / SC-005), not recompute their own clean anchor from raw readings. Unify the clean-anchor definition here.
3. **Partition/cluster + `--location=us-central1`** on all published tables (docs/02, docs/05 convention).
4. **Onset→CIP framing (docs/08):** measured onset dss≈36 vs CIP dss≈179 (~140-day decision window); 003 is the signal, 005 owns lead-time framing.

## Complexity Tracking

| Deviation | Why | Mitigation |
|---|---|---|
| Offline Python twin alongside the sanctioned compute | fast prototyping without cloud round-trips | mark twin explicitly; production = Cloud Run + `ro_simulation` |
| `idaes get-extensions` contradicts the docs | docs assume conda; we used pip | documented above; fix docs |
| source-tracing lives in 003, but 003 spec defers cause-attribution downstream | Abdullah chat said "fold into 003"; branch is 003 | flagged for Abdullah — may relocate attribution to **005** (extends 005 FR-022); 003 stays pure deviation if so |
