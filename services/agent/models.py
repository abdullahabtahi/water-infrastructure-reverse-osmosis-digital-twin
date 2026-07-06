"""
services/agent/models.py
T008 — Typed entity definitions for the AI Assistant (Feature 007).

Maps exactly to specs/007-ai-assistant/data-model.md.
Every quantitative figure surfaced by the assistant MUST be wrapped in a
CapabilityResult with a non-None Evidence object — bare values are un-surfaceable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal


# ── Evidence types (typed union per capability) ────────────────────────────

@dataclass
class ForecastEvidence:
    """Proof-of-belief for a forecast figure."""
    confidence_interval: tuple[float, float]   # (lower, upper) e.g. (0.82, 0.96)
    drivers: list[str]                          # e.g. ["dss_rising", "flux_decline"]


@dataclass
class AnomalyEvidence:
    """Proof-of-belief for an anomaly detection result."""
    deviating_signal: str       # e.g. "ndp_normalized"
    magnitude_vs_baseline: float  # deviation magnitude (signed)


@dataclass
class FoulingEvidence:
    """Proof-of-belief for a fouling score."""
    feature_attribution: dict[str, float]  # signal → attribution weight


@dataclass
class EconomicsEvidence:
    """Proof-of-belief for an economics figure."""
    label: Literal["measured", "modeled"]   # metered (F/G) vs WaterTAP (A–E)
    assumptions: dict[str, Any]              # e.g. {"power_tariff_usd_kwh": 0.12}


@dataclass
class DeviationEvidence:
    """Proof-of-belief for a physics deviation figure."""
    baseline_value: float
    actual_value: float
    delta_pct: float


@dataclass
class ValidationEvidence:
    """Proof-of-belief for a validated accuracy figure."""
    validated: bool
    validation_basis: str   # "plant-data" | "bench" | "literature" | "vendor" | "assumed"
    mape: float | None      # None if not yet validated


Evidence = (
    ForecastEvidence
    | AnomalyEvidence
    | FoulingEvidence
    | EconomicsEvidence
    | DeviationEvidence
    | ValidationEvidence
)


# ── Core entities ─────────────────────────────────────────────────────────

@dataclass
class CapabilityResult:
    """
    The output consumed from an upstream twin capability.
    A figure MUST be wrapped here with non-None evidence to be surfaceable (FR-006/FR-008).
    An evidence-less result is treated as un-surfaceable by the governance callback.
    """
    capability: Literal[
        "deviation", "forecast", "anomaly", "fouling", "validation", "economics"
    ]
    unit_id: str
    value: Any                                          # the primary figure
    evidence: Evidence | None                           # None → un-surfaceable
    provenance: Literal["measured", "modeled"]
    credibility: Literal["high", "medium", "low", "none"] = "none"
    produced_at_date: date | None = None
    range_exceeded: bool = False
    explanation: str | None = None


@dataclass
class SourceTrace:
    """Link from a figure in the answer back to its CapabilityResult."""
    figure_text: str          # exact text of the figure as it appears in the answer
    capability: str           # which capability produced it
    unit_id: str
    evidence_summary: str     # one-liner of the attached evidence
    evidence_payload: dict | None = None  # Full evidence dict for UI rendering


@dataclass
class RecordWritingProposal:
    """
    A proposed write action — MUST NOT be executed without explicit human approval.
    The HITL chip sets status = "approved" before record_decision tool fires.
    """
    proposal_id: str
    record_type: Literal["recommendation_log", "decision", "cip_plan"]
    payload: dict
    status: Literal["pending", "approved", "dismissed"] = "pending"
    approved_at: datetime | None = None


@dataclass
class GroundedAnswer:
    """The assistant's full response with traceability metadata."""
    session_id: str
    question_ref: str
    answer_text: str
    sourced_figures: list[SourceTrace] = field(default_factory=list)
    is_honest_non_answer: bool = False
    capabilities_invoked: list[str] = field(default_factory=list)
    proposal: RecordWritingProposal | None = None


@dataclass
class MemoryBankFact:
    """
    Long-term facts persisted across sessions (cross-session Memory Bank).
    Raw conversation transcripts are NEVER stored here (per Q5 clarification).
    """
    fact_type: Literal[
        "operator_preference", "plant_fact", "cost_override",
        "baseline_calibration", "incident"
    ]
    key: str                            # stable identifier
    value: Any                          # the stored value
    unit_id: str | None                 # scoped to a unit if applicable
    written_at: datetime = field(default_factory=datetime.utcnow)
    written_by: Literal["operator_confirmed", "agent_inferred"] = "operator_confirmed"


@dataclass
class OperatorQuestion:
    """The input to the assistant — a plain-language operator query."""
    session_id: str
    question_text: str
    referenced_unit_id: str | None
    replay_clock_date: date
    timestamp: datetime = field(default_factory=datetime.utcnow)
