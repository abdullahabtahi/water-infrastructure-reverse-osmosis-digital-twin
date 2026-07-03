# 💧 RO Digital Twin — Water Infrastructure

> **A cloud-native digital twin for Municipal/Industrial Brackish Water Reverse Osmosis (BWRO) facilities** — unifying operational data, physics-based simulation, AI diagnostics, and economics into a single GCP-native platform.

## 🎥 What is Reverse Osmosis?

[![Watch: How Reverse Osmosis Works](https://img.youtube.com/vi/MC6Qrr58SmA/0.jpg)](https://www.youtube.com/watch?v=MC6Qrr58SmA)

> *Click the thumbnail above to watch a primer on how Reverse Osmosis works — a great starting point before diving into the codebase.*

---

## 🌊 The Problem

Reverse Osmosis (RO) is the dominant technology for treating brackish and seawater into clean, usable water. In a BWRO facility, high-pressure pumps force feedwater through semi-permeable membranes to remove dissolved salts and contaminants. The challenge: **membranes foul and scale over time** — mineral deposits clog the membrane surface, reducing water throughput (flux) and spiking energy costs. Operators today rely on manual schedules and lagging indicators to decide when to chemically clean a membrane unit (a CIP event), often cleaning too early (wasted resources) or too late (irreversible damage). At scale across 7 banks and 21 membrane units running 24/7, this guesswork translates directly to millions in avoidable operational cost and risk of supply disruption.

## 🏗️ What We're Building

This project builds a **digital twin** — a live software replica of a real BWRO plant — using the Orange County Water District (OCWD) historical dataset (21 units, 15,624 daily rows, 71 CIP events, 2019–2021) as both training ground and replay engine. The architecture runs entirely on GCP: raw sensor data flows through Cloud Storage and Pub/Sub into **BigQuery, which acts as both the data warehouse and the primary AI compute layer** — running forecasting (`AI.FORECAST`), anomaly detection (`AI.DETECT_ANOMALIES`), and NL summarization in-place via SQL. A **WaterTAP physics engine** (Python/Pyomo, Cloud Run) provides first-principles simulation for what-if scenarios and fills in energy gaps that sensors don't capture. An **ADK 2.0 diagnostics agent** (Gemini Flash on Vertex AI Agent Runtime) ties it all together — answering operator questions, surfacing fouling alerts with evidence, and recommending CIP timing — all in an advise-only, no-hallucination-allowed governance mode.

## 🗂️ Where to Start

| Doc | What it covers |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Full architecture, system diagram, key decisions |
| [`docs/01-problem-domain.md`](docs/01-problem-domain.md) | Pain points, economics, use cases |
| [`docs/07-implementation-plan.md`](docs/07-implementation-plan.md) | Phased build plan |
| [`docs/03-physics-engine.md`](docs/03-physics-engine.md) | WaterTAP integration & spike results |
| [`docs/04-ai-agent.md`](docs/04-ai-agent.md) | ADK agent, Memory Bank, RAG, tools |
| [`AGENTS.md`](AGENTS.md) | Agent coding conventions & gotchas |
| [`spike_watertap.py`](spike_watertap.py) | Only runnable code today — WaterTAP validation spike |

> **Current status:** Planning complete. Architecture designed. Only the WaterTAP spike is runnable — the rest lives as design briefs in `docs/`. Read the docs as source of truth.
