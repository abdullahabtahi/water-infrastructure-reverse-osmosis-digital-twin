# Tasks: AI Assistant

**Feature**: 007-ai-assistant | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Compose capabilities (US1)
- [x] T001 [US1] Route to & compose 003 deviation, 004 forecast, 005 attribution, 006 economics per unit (FR-003/FR-004)
- [x] T002 [US1] Every figure sourced from a capability result with its evidence (FR-006/FR-007)
- [x] T003 [US1] No bare/invented numbers — NaN-safe (no "nan" printed), "no significant fouling" handled, "insufficient data" said (FR-008/FR-010/SC-004)
- [x] T004 [US1] Fold 006 economics verdict into the composed recommendation
- [x] T005 [US1] Rank units by urgency; briefing per unit → `data/briefings.txt`

## Phase 2: Governance (HARD GATES)
- [x] T006 Advise-only, read-only — no actuation, no equipment command (Principle III / FR-013/FR-014)
- [x] T007 No unvalidated accuracy claims; lead-time framed as measured-from-history (FR-011)
- [ ] T008 Propose-to-record path behind an explicit human-approval gate (FR-014)
- [ ] T009 Prompt-injection resistance (applies when moved to free-form ADK) (FR-018)

## Phase 3: Production path (ADK)
- [ ] T010 Port to ADK 2.0 multi-agent on Gemini Agent Runtime (docs/04); expose 003–006 as tools/skills
- [ ] T011 [P] Optionally wrap tools as Google Agent Skills (github.com/google/skills) the agent composes
- [ ] T012 [P] Golden Q&A eval set (≥50 pairs) + ADK eval loop (Memory Bank recall, diagnostic accuracy)
- [ ] T013 [P] pytest ≥80%: briefing composition, NaN-safety, no-bare-number guard

## Dependencies
- Depends on 001, 003, 004, 005, 006 (composes them all). Capstone; architecture in docs/04 not finalized.
