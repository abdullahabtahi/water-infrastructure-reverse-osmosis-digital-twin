# Data Model: Feature 007 — Diagnostic AI Assistant

**Feature**: 007-ai-assistant | **Date**: 2026-07-06

---

## Entities

### 1. `OperatorQuestion`
The input to the assistant — a plain-language query from the operator.

| Field | Type | Description |
|---|---|---|
| `session_id` | `str` | Agent Runtime session ID — links to the conversation context |
| `question_text` | `str` | The raw operator question |
| `referenced_unit_id` | `str \| None` | Unit/bank extracted from context or question (e.g. "F-03") |
| `replay_clock_date` | `date` | Replay clock at question time — "now" for this question |
| `timestamp` | `datetime` | Wall-clock time of submission |

---

### 2. `CapabilityResult`
The output consumed from an upstream twin capability. Every quantitative figure must be wrapped in one of these — it is never surfaced bare.

| Field | Type | Description |
|---|---|---|
| `capability` | `Literal["deviation", "forecast", "anomaly", "fouling", "validation", "economics"]` | Source capability |
| `unit_id` | `str` | Which unit this result belongs to |
| `value` | `Any` | The primary figure (float, str, dict) |
| `evidence` | `Evidence` | Type-specific proof-of-belief (see below) |
| `provenance` | `Literal["measured", "modeled"]` | Measured (F/G metered) vs modeled (A–E WaterTAP) |
| `credibility` | `Literal["high", "medium", "low", "none"]` | Validation basis confidence |
| `produced_at_date` | `date` | Replay clock date of the upstream result |

---

### 3. `Evidence` (typed union)
Proof-of-belief, specific to the capability type. A `CapabilityResult` without its `Evidence` is **un-surfaceable** (FR-008).

| Evidence Type | Fields | Capability |
|---|---|---|
| `ForecastEvidence` | `confidence_interval: tuple[float, float]`, `drivers: list[str]` | `forecast` |
| `AnomalyEvidence` | `deviating_signal: str`, `magnitude_vs_baseline: float` | `anomaly` |
| `FoulingEvidence` | `feature_attribution: dict[str, float]` | `fouling` |
| `EconomicsEvidence` | `label: Literal["measured", "modeled"]`, `assumptions: dict[str, Any]` | `economics` |
| `DeviationEvidence` | `baseline_value: float`, `actual_value: float`, `delta_pct: float` | `deviation` |
| `ValidationEvidence` | `validated: bool`, `validation_basis: str`, `mape: float \| None` | `validation` |

---

### 4. `GroundedAnswer`
The assistant's response — coherent, traceable, with every figure backed by a `CapabilityResult`.

| Field | Type | Description |
|---|---|---|
| `session_id` | `str` | Matches the originating question's session |
| `question_ref` | `str` | Reference to the question (for traceability) |
| `answer_text` | `str` | Full natural-language answer |
| `sourced_figures` | `list[SourceTrace]` | Every figure in the answer with its source trace |
| `is_honest_non_answer` | `bool` | `True` if the assistant correctly said "I don't know" |
| `capabilities_invoked` | `list[str]` | Which capabilities were called to construct this answer |
| `proposal` | `RecordWritingProposal \| None` | Present if the answer includes a propose-to-record |

---

### 5. `SourceTrace`
The link from a quantitative figure in the answer back to its `CapabilityResult`.

| Field | Type | Description |
|---|---|---|
| `figure_text` | `str` | Exact text of the figure as it appears in the answer |
| `capability` | `str` | Which capability produced it |
| `unit_id` | `str` | Which unit |
| `evidence_summary` | `str` | Human-readable one-liner of the attached evidence |

---

### 6. `RecordWritingProposal`
A proposed write action — held pending explicit human approval (never auto-executed).

| Field | Type | Description |
|---|---|---|
| `proposal_id` | `str` | Unique ID for this proposal (used by HITL chip) |
| `record_type` | `Literal["recommendation_log", "decision", "cip_plan"]` | What would be written |
| `payload` | `dict` | The data that would be written to BigQuery on approval |
| `status` | `Literal["pending", "approved", "dismissed"]` | Set by operator action via the inline HITL chip |
| `approved_at` | `datetime \| None` | Wall-clock time of approval (if approved) |

---

### 7. `MemoryBankFact` (cross-session)
Long-term facts persisted across sessions. Raw transcripts are never stored here.

| Field | Type | Description |
|---|---|---|
| `fact_type` | `Literal["operator_preference", "plant_fact", "cost_override", "baseline_calibration", "incident"]` | Category |
| `key` | `str` | Stable identifier (e.g. `"power_tariff_usd_kwh"`, `"bank_c_normal_flux"`) |
| `value` | `Any` | The stored value |
| `unit_id` | `str \| None` | Scoped to a unit if applicable |
| `written_at` | `datetime` | When this fact was confirmed and stored |
| `written_by` | `Literal["operator_confirmed", "agent_inferred"]` | Provenance of the fact |

---

## BigQuery Table Map

| Table | Dataset | Description |
|---|---|---|
| `kpi_daily` | `ro_curated` | Daily KPIs per unit — source for `query_bigquery` |
| `unit_readings` | `ro_curated` | Raw readings — deviation + anomaly queries |
| `fouling_scores` | `ro_curated` | Pre-computed fouling scores with attribution |
| `economics_tradeoff` | `ro_forecasts` | Break-even and delta economics |
| `decision_log` | `ro_serving` | Approved decisions written by `record_decision` tool |
| `agent_memory` | `ro_serving` | Memory Bank facts (cross-session persistence) |
| `doc_embeddings` | `ro_embeddings` | RAG document chunk embeddings |
| `event_embeddings` | `ro_embeddings` | Historical event embeddings for similarity lookup |

---

## State Transitions — `RecordWritingProposal`

```
[PROPOSED] → (operator taps Approve) → [APPROVED] → record_decision tool fires → BigQuery write
           → (operator taps Dismiss) → [DISMISSED] → no write, no state change
           → (session ends without action) → [DISMISSED] → no write
```
