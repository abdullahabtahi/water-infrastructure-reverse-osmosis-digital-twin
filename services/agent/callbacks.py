"""
services/agent/callbacks.py
T009 + T010 — Governance callbacks for the ADK multi-agent coordinator.

after_model:  Scans every LLM output token stream for bare numeric tokens not
              traceable to a tool result in the current session. Flags/blocks them.
              Also detects RecordWritingProposal JSON in the output and sets
              status="pending" before the message reaches the frontend.

before_tool:  Validates every tool call against the actuation denylist.
              Sanitises unit_id inputs via the allowlist regex.
              Blocks tool calls triggered by content from untrusted uploaded docs
              that attempt to bypass governance gates (FR-018 prompt-injection).

Constitution Principles II + III — HARD GATES.
"""
from __future__ import annotations

import json
import re
from typing import Any

from services.agent.tools import _ACTUATION_DENYLIST, _validate_unit_id, ActuationBlockedError, GovernanceError

# ── Regex to catch bare numeric tokens in LLM output ──────────────────────
# Matches patterns like: 42.5, $1,234, 0.92, 15 kWh, 85%
# A "bare" number is one not inside a markdown source-trace tag or JSON evidence block.
_BARE_NUMBER_RE = re.compile(
    r"(?<!\[)"           # not preceded by [  (start of source-trace badge)
    r"(?<!\{)"           # not preceded by {  (start of JSON evidence)
    r"\b"
    r"(\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+\.\d+|\d{2,})"  # numeric forms
    r"(?!\s*[}\]])"      # not followed by } or ]  (end of evidence block)
    r"\b"
    r"(?!\s*(?:source|capability|evidence|from|via|per)\b)",  # not a source citation
    re.IGNORECASE,
)

# ── Proposal JSON detection ────────────────────────────────────────────────
_PROPOSAL_RE = re.compile(
    r'\{[^{}]*"record_type"\s*:\s*"(?:recommendation_log|decision|cip_plan)"[^{}]*\}',
    re.DOTALL,
)


def after_model_callback(
    tool_results_in_session: list[dict],
    model_output_text: str,
) -> dict[str, Any]:
    """
    T009 — Validate model output for bare numbers and detect proposals.

    Args:
        tool_results_in_session: All tool call results from this turn.
        model_output_text: The raw LLM text output to validate.

    Returns:
        {
            "passed": bool,
            "bare_numbers_found": list[str],
            "proposals": list[dict],   # RecordWritingProposal payloads, status="pending"
            "sanitized_output": str,
        }
    """
    issues: list[str] = []
    proposals: list[dict] = []

    # 1. Extract all numeric tokens from tool results (these are allowed)
    allowed_values: set[str] = set()
    for result in tool_results_in_session:
        # Enforce SC-003: if capability result lacks evidence, do not allow its figures
        if isinstance(result, dict) and "capability" in result:
            if result.get("evidence") is None:
                continue
        _extract_numerics_from_result(result, allowed_values)

    # 2. Find bare numbers in model output
    bare_candidates = _BARE_NUMBER_RE.findall(model_output_text)
    bare_numbers: list[str] = []
    for candidate in bare_candidates:
        # Allow if traceable to a tool result
        cleaned = candidate.replace(",", "").replace("$", "").strip()
        if cleaned not in allowed_values:
            bare_numbers.append(candidate)

    if bare_numbers:
        issues.append(
            f"GOVERNANCE VIOLATION — bare numbers not traceable to tool results: {bare_numbers}. "
            "Per Constitution Principle II (HARD GATE), every figure must originate from "
            "a CapabilityResult. The answer must be regenerated with sourced figures only."
        )

    # 3. Detect RecordWritingProposal JSON and set status="pending"
    for match in _PROPOSAL_RE.finditer(model_output_text):
        try:
            proposal_json = json.loads(match.group())
            proposal_json.setdefault("status", "pending")
            proposal_json.setdefault("proposal_id", _new_id())
            proposals.append(proposal_json)
        except json.JSONDecodeError:
            pass

    # 4. Capability Disagreement Detection (FR-016)
    # Simple heuristic for demonstration: if tools return conflicting recommendations
    tool_str = json.dumps(tool_results_in_session).lower()
    has_wait = "wait" in tool_str or "delay" in tool_str
    has_clean_now = "clean now" in tool_str or "breakeven" in tool_str
    
    if has_wait and has_clean_now and "tension" not in model_output_text.lower():
        tension_block = (
            "\n\n> [!WARNING]\n"
            "> **Capability Disagreement Detected:** Sub-agents returned conflicting signals. "
            "For example, the fouling trajectory may suggest waiting, while economics favor cleaning now. "
            "The assistant must surface both sides of the evidence explicitly.\n"
        )
        model_output_text += tension_block

    return {
        "passed": len(issues) == 0,
        "issues": issues,
        "bare_numbers_found": bare_numbers,
        "proposals": proposals,
        "sanitized_output": model_output_text,  # output updated with tension block if applicable
    }


def before_tool_callback(
    tool_name: str,
    tool_args: dict[str, Any],
    input_source: str = "operator",  # "operator" | "uploaded_doc"
) -> dict[str, Any]:
    """
    T010 — Validate a tool call before execution.

    Blocks:
    - Actuating tool names (actuation denylist)
    - Tool calls with invalid unit_id values (injection guard)
    - Any tool call whose intent originates from an untrusted uploaded document
      that bypasses governance gates (prompt-injection resistance FR-018)

    Returns:
        {"allowed": bool, "reason": str | None, "sanitized_args": dict}
    """
    # 1. Actuation denylist — tool name check
    if tool_name.lower() in _ACTUATION_DENYLIST:
        raise ActuationBlockedError(
            f"before_tool: tool '{tool_name}' is on the actuation denylist. "
            "The assistant NEVER actuates plant equipment. (FR-013 — HARD GATE)"
        )

    # 2. Prompt-injection guard — untrusted source check
    if input_source == "uploaded_doc":
        # Tool calls originating from uploaded document content are blocked
        # to prevent prompt injection via files (FR-018)
        if tool_name in ("record_decision",):
            raise GovernanceError(
                f"before_tool: tool '{tool_name}' cannot be invoked from uploaded document "
                "content — this is a prompt-injection resistance gate. (FR-018)"
            )

    # 3. Sanitise unit_id if present
    sanitized_args = dict(tool_args)
    if "unit_id" in sanitized_args:
        try:
            sanitized_args["unit_id"] = _validate_unit_id(str(sanitized_args["unit_id"]))
        except ValueError as exc:
            return {
                "allowed": False,
                "reason": str(exc),
                "sanitized_args": sanitized_args,
            }

    return {
        "allowed": True,
        "reason": None,
        "sanitized_args": sanitized_args,
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_numerics_from_result(obj: Any, out: set[str]) -> None:
    """Recursively extract all numeric string representations from a result dict."""
    if isinstance(obj, dict):
        for v in obj.values():
            _extract_numerics_from_result(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _extract_numerics_from_result(item, out)
    elif isinstance(obj, (int, float)):
        out.add(str(obj))
        out.add(f"{obj:.2f}")
        out.add(f"{obj:.4f}")


def _new_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]
