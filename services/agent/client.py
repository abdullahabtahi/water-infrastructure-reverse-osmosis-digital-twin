"""
services/agent/client.py
T002 — Gen AI SDK client initialisation (gemini-api skill pattern).

Uses google-genai SDK with Application Default Credentials + enterprise mode.
Never hard-code credentials — all config via environment variables.

Environment variables required:
  GOOGLE_CLOUD_PROJECT   e.g. spatial-cat-489006-a4
  GOOGLE_CLOUD_LOCATION  e.g. global  (use 'global' to prevent 404 routing errors)
  GOOGLE_GENAI_USE_ENTERPRISE=true

Do NOT use legacy SDKs: google-cloud-aiplatform, google-generativeai, @google-cloud/vertexai.
"""
from __future__ import annotations

import os
from google import genai  # google-genai SDK (not google-cloud-aiplatform)

# ── Environment validation ──────────────────────────────────────────────────
_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "spatial-cat-489006-a4")
_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")

# Must be set to 'true' for Gemini Enterprise Agent Platform
os.environ.setdefault("GOOGLE_GENAI_USE_ENTERPRISE", "true")


def get_client() -> genai.Client:
    """Return a fully configured Gemini Enterprise Gen AI client.

    Picks up ADC credentials automatically. Call once and reuse.
    GOOGLE_CLOUD_LOCATION defaults to 'global' — the Agent Platform global
    endpoint provides automatic regional routing and avoids 404s.
    """
    return genai.Client(
        enterprise=True,
        project=_PROJECT,
        location=_LOCATION,
    )


# Module-level singleton — import this in agent.py and tools.py
client = get_client()

# ── Model aliases (per gemini-api skill + AGENTS.md) ───────────────────────
# Use these constants everywhere — never hard-code model strings.
MODEL_FLASH = "gemini-3.5-flash"          # default: coordinator, DataAnalyst, Economics, Document
MODEL_PRO   = "gemini-3.1-pro-preview"    # complex multi-step reasoning: Simulation sub-agent only
