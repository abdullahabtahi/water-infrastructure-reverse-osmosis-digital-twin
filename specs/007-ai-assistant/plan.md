# Implementation Plan: AI Assistant

**Branch**: `feature/003-source-tracing` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-ai-assistant/spec.md`

## Summary

An **advise-only, read-only** assistant that routes to and composes the 003–006 capabilities into a
per-unit decision briefing for the operator's core question ("should we clean this unit now, and
why?"). Every figure is sourced from an actual capability result with its type-specific evidence
(deviation + provenance / forecast + band / attribution + evidence / economics measured-vs-modeled);
**no bare or invented numbers** — it says "not yet validated / I don't know" rather than fabricate
(FR-006/FR-008/FR-010/SC-004). It never actuates equipment and any record-write is gated behind
explicit human approval (Constitution HARD GATE III; FR-013/FR-014), and it resists prompt injection
(FR-018).

Production home (docs/04): an ADK multi-agent on the Gemini Enterprise Agent Runtime (Orchestrator +
DataAnalyst/Simulation/Economics specialists), with the 003–006 modules exposed as tools/skills —
optionally as Google Agent Skills (per the collaboration idea). `assistant.py` is the deterministic
evidence-composer prototype of that contract.

## Technical Context

- **Language/deps**: Python 3.11, pandas (prototype); production = ADK 2.0 + Gemini Flash on Agent Runtime, reading `ro_serving`/`ro_simulation`/`ro_forecasts`.
- **Inputs**: 003 deviations, 004 forecasts, 005 attributions, 006 economics.
- **Model rules (AGENTS.md)**: new agents use `gemini-3-flash-preview` / `gemini-3-pro-preview`; a 404 is usually a `GOOGLE_CLOUD_LOCATION` issue.

## Constitution Check

| Principle / Gate | Status |
|---|---|
| III (HARD GATE) — advise-only, read-only, never actuate; record-writes human-gated | ✅ prototype only advises; no write path |
| II — every figure evidence-sourced; no bare/invented numbers | ✅ briefing composes upstream numbers; NaN-safe (no "nan"); no-significant handled |
| II — no unvalidated accuracy claims (FR-011) | ✅ lead-time framed as from-history; no fabricated precision |
| — prompt-injection resistance (FR-018) | ⚠️ prototype is deterministic (no free-form LLM yet); applies when moved to ADK |

## Project Structure

- `services/source-tracing/assistant.py` — advise-only briefings composing 003–006 with evidence
- Production: `docs/04-ai-agent.md` ADK multi-agent (not finalized — free to modify per Abdullah)

## Complexity Tracking

| Deviation | Why | Mitigation |
|---|---|---|
| Prototype is a deterministic composer, not an LLM agent | fast + fully controllable, no hallucination risk | production = ADK on Agent Runtime; tools = 003–006 (optionally Google Agent Skills) |
| Record-to-propose + human-approval gate not implemented | prototype advises only | add propose-to-record with a HARD human-approval gate (FR-013/FR-014) |
| Prompt-injection defense N/A in prototype | no free-form input | add when free-form NL + tool orchestration lands (FR-018) |
