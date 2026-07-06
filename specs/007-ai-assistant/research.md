# Research: Feature 007 — Diagnostic AI Assistant

**Date**: 2026-07-06 | **Sources**: Context7 (ADK docs, a2ui docs), docs/04-ai-agent.md, existing code

---

## Decision 1: ADK 2.0 Multi-Agent Topology

**Chosen**: Coordinator + 4 in-process `task`-mode sub-agents (DataAnalyst, Simulation, Document, Economics) on Agent Runtime.

**Rationale**:
- ADK 2.0 `sub_agents` with `mode="task"` run in isolated session branches and auto-return via `complete_task` — ideal for the parallel capability calls this assistant needs.
- Single Agent Runtime deployment = one trace plane, one governance plugin, lowest latency.
- Coordinator uses `mode="chat"` (default root agent); specialists use `mode="task"`.

**Code pattern** (from ADK docs):
```python
from google.adk import Agent

data_analyst = Agent(name="data_analyst", mode="task", tools=[query_bigquery, detect_anomaly])
simulation   = Agent(name="simulation",   mode="task", tools=[simulate_watertap])
economics    = Agent(name="economics",    mode="task", tools=[query_bigquery, run_calculation])
document     = Agent(name="document",     mode="task", tools=[search_docs])

coordinator = Agent(
    name="ro_assistant",
    sub_agents=[data_analyst, simulation, economics, document],
    # ADK auto-injects: request_task_data_analyst, request_task_simulation, ...
)
```

**Alternatives considered**: Single flat agent (rejected — no context isolation, hard to govern); A2A standalone services (deferred — scale-later if WaterTAP needs independent scaling).

---

## Decision 2: Streaming — SSE via RunConfig

**Chosen**: `RunConfig(streaming_mode=StreamingMode.SSE)` on Agent Runtime.

**Rationale**: Agent Runtime natively supports SSE streaming. The coordinator returns streaming events to the Next.js frontend via Server-Sent Events, enabling progressive token rendering in the chat panel without WebSocket complexity.

```python
from google.adk.agents.run_config import RunConfig, StreamingMode
config = RunConfig(streaming_mode=StreamingMode.SSE, max_llm_calls=200)
```

**Alternatives considered**: REST (non-streaming — bad UX for long answers); WebSocket (overkill; SSE is one-way server→client which is all we need).

---

## Decision 3: Chat UI — a2ui React Integration

**Chosen**: `@a2ui/react` + `@a2ui/web_core` embedded as a global slide-in panel in the Next.js app.

**Rationale**:
- a2ui v1.0 protocol sends streaming JSON objects (`createSurface`, `updateComponents`, `updateDataModel`) over SSE — maps directly to Agent Runtime SSE output.
- `<A2UISurface>` component + `useA2UI()` hook handle progressive rendering.
- HITL approval chip is an a2ui `Button` component with `action.event` wired to `record_decision` tool call — no custom modal code needed.
- Transport: SSE + JSON-RPC (a2ui supports both; SSE fits Agent Runtime output).

**Key a2ui pattern for approval chip**:
```jsonl
{"updateComponents": {"surfaceId": "hitl_proposal", "components": [
  {"id": "approve_btn", "component": "Button", "child": "approve_label",
   "variant": "primary", "action": {"event": {"name": "approveDecision", "context": {"proposalId": "..."}}}},
  {"id": "dismiss_btn", "component": "Button", "child": "dismiss_label",
   "variant": "secondary", "action": {"event": {"name": "dismissDecision"}}}
]}}
```

**Alternatives considered**: Custom React chat (more code, no approval-gate primitives); Dedicated `/chat` page (rejected per Q1 clarification).

---

## Decision 4: Context Caching

**Chosen**: Native ADK `ContextCacheConfig` for the static prefix (system prompt + skill L1 catalog).

```python
app = App(
    name='ro_assistant',
    root_agent=coordinator,
    context_cache_config=ContextCacheConfig(min_tokens=2048, ttl_seconds=600, cache_intervals=5),
)
```

Semantic cache (custom) sits in front of the coordinator: embed question → `VECTOR_SEARCH` Q→A cache → return if cosine_sim > 0.92. Time-sensitive questions bypass it (no stale plant state served).

---

## Decision 5: Memory Bank — Session vs. Cross-Session

**Chosen** (per Q5 clarification): Session = Agent Runtime managed session (in-flight only). Cross-session = Memory Bank facts only (operator preferences, plant facts, cost overrides). No raw transcript storage.

**Alternatives considered**: Firestore transcript log (rejected — unnecessary storage cost and privacy surface for MVP); 7-day rolling history (deferred).

---

## Decision 6: Model Names

Per AGENTS.md rule: `gemini-3-flash-preview` (coordinator default), route to `gemini-3-pro-preview` for complex multi-capability orchestration. Never rename existing agents. 404 = likely `GOOGLE_CLOUD_LOCATION` issue → set to `global`.

---

## Decision 7: Frontend Layout — Three-Panel Responsive

On `/twin`, when assistant panel opens: CSS grid shrinks the `PlantScene` column proportionally (does not hide it), maintaining all three panels visible: plant-scene (reduced), inspector, assistant. Implemented via CSS `grid-template-columns` with animated transition.

```css
/* three-panel state */
.twin-layout[data-assistant="open"] {
  grid-template-columns: 1fr 320px 360px; /* plant shrinks, inspector + assistant fixed */
}
```

Global availability: assistant panel state stored in Zustand (existing `useReplayStore` pattern), accessible from any route via a floating trigger button.

---

## Unresolved / Deferred

- **T009 Prompt-injection resistance**: ADK `after_model` callback validates every numeric/economic output traces to a tool result — implementation detail for tasks phase.
- **T012 Golden eval dataset (≥50 pairs)**: Effort item for the eval phase; not blocking architecture.
- **BigQuery MCP server setup**: Needs `GOOGLE_CLOUD_PROJECT` + authorized views configured; prerequisite for production, not prototype.
