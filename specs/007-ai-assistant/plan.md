# Implementation Plan: AI Assistant (Feature 007)

**Branch**: `feature/007-ai-assistant` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

---

## Summary

An **advise-only, read-only** Diagnostic AI Assistant that lets operators ask plain-language questions about the RO plant and get grounded, evidence-backed answers by orchestrating the twin's existing capabilities (003 deviation, 004 forecast/anomaly, 005 fouling attribution, 006 economics). Every quantitative figure originates from an upstream capability result and is presented with its type-specific evidence. The assistant never actuates equipment; any record-write is gated behind an explicit human approval chip in the chat UI.

**Architecture**: ADK 2.0 multi-agent (Coordinator + 4 `task`-mode specialists) deployed on Gemini Enterprise Agent Runtime. Chat surface delivered as a globally-accessible embedded panel using `a2ui` React components + Agent Runtime SSE streaming. Prototype path (`assistant.py`) is the deterministic evidence-composer already partially built; production path is the ADK port (T010).

---

## Constitution Check

| Principle / HARD GATE | Status | Notes |
|---|---|---|
| **III — Advise-only, NEVER actuate (HARD GATE)** | ✅ | Prototype only advises; `record_decision` write tool is HITL-gated with inline Approve/Dismiss chip |
| **II — Evidence over assertion, no hallucinated numbers (HARD GATE)** | ✅ | Every figure must be a `CapabilityResult` with `Evidence`; bare numbers blocked by `after_model` callback in ADK |
| **II — No unvalidated accuracy claims (HARD GATE)** | ✅ | FR-011 enforced; validation evidence from Feature 005 gates accuracy assertions |
| **IV — Measured vs. modeled labeling** | ✅ | Provenance propagated from `CapabilityResult.provenance`; economics relayed delta-first with assumptions |
| **VI — Honest twin maturity** | ✅ | "Now" = replay clock; never implies live plant connection |
| **I — BigQuery as AI compute (Principle I)** | ✅ | `query_bigquery` MCP tool calls `AI.FORECAST`, `AI.DETECT_ANOMALIES`; no custom ML pipeline |
| **Security — No secrets in source** | ✅ | GCP credentials via env vars / Secret Manager; BQ access via authorized views |

---

## Technical Context

| Item | Value |
|---|---|
| Language | Python 3.11 (agent backend), TypeScript/React (frontend panel) |
| Agent framework | **ADK 2.0** (`google-adk`) |
| Runtime | **Gemini Enterprise Agent Runtime** (Agent Engine, serverless) |
| Models | `gemini-3-flash-preview` (coordinator), `gemini-3-pro-preview` (complex multi-step) |
| Streaming | `RunConfig(streaming_mode=StreamingMode.SSE)` |
| Frontend chat | `@a2ui/react` + `@a2ui/web_core` embedded panel (Next.js) |
| HITL approval | a2ui `Button` component with `action.event` → `record_decision` tool |
| Memory | Agent Runtime managed Sessions (in-flight) + Memory Bank facts (cross-session) |
| Context caching | `ContextCacheConfig(min_tokens=2048, ttl_seconds=600, cache_intervals=5)` |
| Semantic caching | Custom: embed question → `VECTOR_SEARCH` Q→A cache (cosine_sim > 0.92), bypass for time-sensitive |
| Tool transport | **BigQuery MCP server** for `query_bigquery`, `detect_anomaly`, `search_docs` |
| GCP project | `spatial-cat-489006-a4`, region `us-central1` |
| Latency gates | < 5 s P95 (single-cap Q&A), < 15 s P95 (multi-cap/simulation), < 1 s P95 (cache hit) |

---

## Agent Architecture

```
Operator ──text──► [Semantic Cache] ──miss──► [Coordinator Agent: ro_assistant]
                       ↑ hit                    │ request_task_*
                       │                        ▼
                   Q→A cache           ┌─────────────────────┐
                                       │  Sub-Agents (task)  │
                                       │  DataAnalyst        │ ← query_bigquery, detect_anomaly
                                       │  Simulation         │ ← simulate_watertap
                                       │  Economics          │ ← query_bigquery, run_calculation
                                       │  Document           │ ← search_docs
                                       └─────────────────────┘
                                                │
                                       [record_decision ⚠️ HITL-gated]
                                                │
                                          BigQuery (decision_log)
```

**Skills per specialist** (SKILL.md via SkillToolset):
- DataAnalyst → `fouling-diagnosis`, `recovery-optimization`, `antiscalant-dosing`
- Simulation → `clean-now-or-wait`
- Economics → `delta-economics`
- Document → `compliance-check`

---

## Frontend Layout — Three-Panel Responsive

On `/twin` with assistant open:

```
┌──────────────────────────────────────────────────────────────┐
│  PlantScene (shrunk ~1fr)  │  Inspector  │  Assistant Panel  │
│  (scales down, stays       │  (320px)    │  (360px)          │
│  visible & interactive)    │             │                   │
└──────────────────────────────────────────────────────────────┘
```

CSS grid transition (`grid-template-columns` animated). Panel accessible globally via floating trigger button in `layout.tsx` — Zustand `assistant-store.ts` controls open/close state.

---

## Proposed Changes

---

### Backend — ADK Agent (`services/agent/`)

#### [NEW] `services/agent/__init__.py`
Empty init — makes `services/agent/` an ADK app package.

#### [NEW] `services/agent/agent.py`
Main ADK multi-agent definition:
- `Coordinator` root agent (mode=chat, model=gemini-3-flash-preview)
- 4 sub-agents: `DataAnalyst`, `Simulation`, `Economics`, `Document` (mode=task)
- `App` with `ContextCacheConfig`
- Anti-hallucination `after_model` callback: blocks/flags any numeric figure not traced to a tool result

#### [NEW] `services/agent/tools.py`
Tool definitions:
- `query_bigquery(sql: str) -> dict` — BigQuery MCP server wrapper
- `simulate_watertap(unit_id, params) -> dict` — calls `POST /predict` on WaterTAP Cloud Run
- `detect_anomaly(unit_id, signal, date_range) -> dict` — `AI.DETECT_ANOMALIES`
- `search_docs(query: str) -> list[dict]` — `VECTOR_SEARCH` on `ro_embeddings.doc_embeddings`
- `run_calculation(code: str) -> dict` — Code Execution sandbox
- `record_decision(proposal_id, payload) -> dict` ⚠️ HITL-gated write

#### [NEW] `services/agent/skills/`
SKILL.md files for each domain:
- `fouling-diagnosis/SKILL.md`
- `clean-now-or-wait/SKILL.md`
- `delta-economics/SKILL.md`
- `recovery-optimization/SKILL.md`
- `antiscalant-dosing/SKILL.md`
- `compliance-check/SKILL.md`

#### [NEW] `services/agent/callbacks.py`
`after_model` governance callback — enforces no-bare-number gate and HITL proposal detection.

---

### Prototype — `services/source-tracing/`

#### [MODIFY] `services/source-tracing/assistant.py`
- Add `propose_to_record()` function stub gated by explicit human confirmation (T008)
- Add prompt-injection resistance: sanitize `unit_id` and question inputs before forwarding to capability functions (T009)
- Improve NaN-safety for edge cases

#### [NEW] `services/source-tracing/tests/test_assistant.py`
Pytest suite (T013 ≥80%):
- Briefing composition correctness
- NaN-safety (no bare "nan" printed)
- No-bare-number guard (each figure maps to a known capability output)
- Honest non-answer for missing unit/period
- Propose-to-record: no write without approval flag

---

### Frontend — Next.js (`services/frontend/`)

#### [NEW] `services/frontend/lib/store/assistant-store.ts`
Zustand store:
- `isOpen: boolean` — panel open state
- `sessionId: string | null` — current Agent Runtime session
- `messages: Message[]` — in-session chat history
- `toggle()`, `open()`, `close()`, `addMessage()`, `setSessionId()`

#### [NEW] `services/frontend/components/assistant/assistant-panel.tsx`
Main panel component:
- Slide-in from right, accessible from all routes
- Uses `@a2ui/react` `<A2UISurface>` + `useA2UI()` hook
- SSE stream from `/api/agent/stream` (Next.js API route)
- Renders HITL approval chip (a2ui `Button` pair) when `RecordWritingProposal` detected

#### [NEW] `services/frontend/components/assistant/assistant-trigger.tsx`
Floating trigger button (fixed position, visible on all routes) — toggles `assistant-store`.

#### [NEW] `services/frontend/components/assistant/hitl-chip.tsx`
Inline Approve/Dismiss component rendered inside message bubbles for `RecordWritingProposal` responses.

#### [MODIFY] `services/frontend/app/layout.tsx`
- Import `AssistantPanel` and `AssistantTrigger` — render globally outside page content

#### [MODIFY] `services/frontend/app/twin/page.tsx`
- Wrap in a CSS grid layout that responds to `assistant-store.isOpen`
- Three-panel state: `grid-template-columns: 1fr 320px 360px` (plant shrinks, inspector + assistant coexist)
- Smooth CSS transition on panel open/close

#### [NEW] `services/frontend/app/api/agent/stream/route.ts`
Next.js API route — proxies SSE stream from Agent Runtime to the browser:
- POST body → Agent Runtime session message
- Returns SSE stream; translates Agent Runtime events to a2ui `updateComponents` messages

#### [NEW] `services/frontend/lib/api/agent.ts`
`startAgentSession()`, `sendMessage()`, `streamResponse()` — wraps Agent Runtime Interactions API calls.

---

### Infrastructure

#### [NEW] `services/agent/requirements.txt`
`google-adk>=2.0.0`, `google-cloud-bigquery`, `vertexai`

#### [MODIFY] `services/agent/Dockerfile` (if exists, else [NEW])
Cloud Run image for Agent Runtime deployment.

---

## Verification Plan

### Automated Tests
```bash
# Prototype tests
cd services/source-tracing
pytest tests/test_assistant.py -v --tb=short

# Frontend TypeScript checks
cd services/frontend
npx tsc --noEmit

# ADK eval (after T010 port)
adk eval services/agent/ --eval_set specs/007-ai-assistant/eval/golden_qa.json
```

### Manual Verification
1. Run Scenario 1 from `quickstart.md` — prototype briefing output
2. Run Scenario 4 — frontend three-panel layout smoke test
3. Run Scenario 5 — honest non-answer check
4. Verify latency gates via Cloud Trace after ADK deployment (SC-010/SC-011)

---

## Open Items (Deferred to Tasks)

| Item | Task | Notes |
|---|---|---|
| Prompt-injection resistance | T009 | ADK `after_model` callback; sanitize before tool dispatch |
| Golden eval dataset (≥50 pairs) | T012 | Covers fouling/energy/economics/memory-recall/RAG |
| BigQuery MCP server setup | Pre-req | `GOOGLE_CLOUD_PROJECT` + authorized views |
| Semantic cache implementation | T010 | `VECTOR_SEARCH` on `ro_embeddings.qa_cache` |
| Memory Bank write triggers | T010 | Persist confirmed cost overrides + plant facts |
