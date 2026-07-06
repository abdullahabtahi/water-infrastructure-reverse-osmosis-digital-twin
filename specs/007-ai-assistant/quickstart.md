# Quickstart: Feature 007 — Diagnostic AI Assistant

**Feature**: 007-ai-assistant | **Date**: 2026-07-06

---

## Prerequisites

1. **Upstream modules built** — run all of 003–006 to generate CSV outputs in `services/source-tracing/data/`:
   ```bash
   cd services/source-tracing
   source ../../.venv-watertap-spike/bin/activate
   python run_all.py
   ```
2. **Serving API running** (port 8000):
   ```bash
   cd services/serving-api
   ../../.venv-watertap-spike/bin/uvicorn main:app --reload --port 8000
   ```
3. **Frontend dev server running** (port 3000):
   ```bash
   cd services/frontend
   npm run dev
   ```
4. **GCP (production path only)**: `GOOGLE_CLOUD_PROJECT=spatial-cat-489006-a4`, `GOOGLE_CLOUD_LOCATION=us-central1`, ADK Agent Runtime provisioned.

---

## Scenario 1: Prototype — Run the Evidence Composer

Validates T001–T005 (capability composition, no bare numbers, honest non-answers).

```bash
cd services/source-tracing
source ../../.venv-watertap-spike/bin/activate
python assistant.py
```

**Expected output**: Briefings for the 3 most urgent units + `data/briefings.txt`. Each brief must contain:
- `• Fouling trend (003/004):` with a sourced figure or explicit "insufficient data"
- `• Source attribution (005):` with mechanism + confidence or "no significant-fouling cycle"
- `• Economics (006):` with dollar figures and `→ RECOMMENDATION: ...`
- `→ RECOMMENDATION:` ending with `(operator decides; system does not actuate)`

**No-bare-number check**: `grep "nan" data/briefings.txt` should return nothing.

---

## Scenario 2: Prototype — Inspect the Governance Gates

Validates T006 (advise-only, no actuation):

```bash
python -c "
from assistant import brief
import pandas as pd
# assistant.brief() must never import or call any actuation/write path
import inspect, assistant
src = inspect.getsource(assistant)
assert 'record_decision' not in src or '# gated' in src, 'FAIL: write path detected in prototype'
print('PASS: no actuation path in prototype')
"
```

---

## Scenario 3: ADK Agent — Local Run (Production Path)

Validates T010 (ADK 2.0 multi-agent, streaming).

```bash
# Install ADK and agents-cli
pip install google-adk
uvx google-agents-cli setup

# Scaffold the agent
cd services/agent
agents-cli scaffold ro-assistant

# Run locally
adk run agent/ --input "Why is Bank F's energy climbing?"
```

**Expected**: Streaming SSE response from coordinator, invoking DataAnalyst sub-agent, returning a grounded answer with a sourced ΔP/energy figure.

---

## Scenario 4: Frontend Chat Panel — UI Smoke Test

Validates the embedded panel UX (Q1 clarification: panel accessible from all pages, plant-scene scales down on `/twin`).

1. Open `http://localhost:3000/twin`
2. Click the assistant trigger button (floating, bottom-right corner)
3. **Verify**: Inspector panel remains visible; plant-scene scales down (does not disappear) to share horizontal space
4. Type: `"What is the current state of unit C01?"`
5. **Verify**: Streaming response renders progressively; every figure shows its provenance tag (measured/modeled)
6. If the assistant proposes to log a recommendation, **verify**: inline Approve/Dismiss chip appears in the message bubble (not a modal)

---

## Scenario 5: Honest Non-Answer Check

Validates T003 / SC-004 (say "I don't know", never invent).

```bash
python -c "
from assistant import brief, _load, latest_per_unit
import pandas as pd

# Ask about a unit with no data
fc_empty = pd.DataFrame()
att_empty = pd.DataFrame()
econ_empty = pd.DataFrame()
result = brief('Z99', fc_empty, att_empty, econ_empty)
print(result)
assert 'insufficient' in result.lower() or 'no data' in result.lower() or 'I don' in result, 'FAIL: invented a figure for missing unit'
print('PASS: honest non-answer for missing unit')
"
```

---

## Scenario 6: Latency Gate Check (Production — SC-010/SC-011)

Run via `adk eval` after ADK port (T010):

```bash
adk eval agent/ --eval_set specs/007-ai-assistant/eval/golden_qa.json
```

**Acceptance gates**:
- P95 latency for single-capability questions: **< 5 s**
- P95 latency for multi-capability/simulation questions: **< 15 s**
- P95 latency for semantic-cache hits: **< 1 s**

Latency visible in **Cloud Trace** (`ro_assistant` span) and `adk eval` trace output.

---

## Key Files

| Path | Role |
|---|---|
| `services/source-tracing/assistant.py` | Prototype evidence-composer (T001–T007) |
| `services/agent/` | ADK multi-agent scaffold (T010, created by `agents-cli scaffold`) |
| `services/frontend/components/assistant/` | a2ui chat panel + HITL chip (frontend) |
| `services/frontend/lib/store/assistant-store.ts` | Global panel open/close state (Zustand) |
| `specs/007-ai-assistant/data-model.md` | Entity definitions and BQ table map |
| `specs/007-ai-assistant/research.md` | Architecture decisions and ADK/a2ui patterns |
| `docs/04-ai-agent.md` | Full architecture brief (stack, topology, skills, governance) |
