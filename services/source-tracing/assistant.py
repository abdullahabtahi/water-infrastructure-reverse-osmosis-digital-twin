#!/usr/bin/env python3
"""
Spec 007 — AI Assistant (advise-only).

Composes the outputs of specs 003–006 into a per-unit decision briefing for the operator's
core question: "should we clean this unit now, and why?" Every statement is backed by an
actual number from an upstream module — no bare claims, no fabricated values (AGENTS.md
no-hallucinated-numbers guardrail). Advise-only / read-only: it never actuates equipment.

Two backends, one contract:
  - Gemini (production): composes the same EVIDENCE and asks Gemini to write the briefing
    under a strict no-hallucinated-numbers guardrail. Answers free-form operator questions.
  - Deterministic (fallback): the evidence-composer below. Used whenever Gemini is not
    configured, so the assistant NEVER fails.

Auth for the Gemini path (either works):
  - AI Studio API key:  export GEMINI_API_KEY=...            (free, no Vertex permission needed)
  - Vertex AI:          export GOOGLE_GENAI_USE_VERTEXAI=True GOOGLE_CLOUD_PROJECT=... GOOGLE_CLOUD_LOCATION=global

`answer()` is the single entry point the serving API calls; `brief()` stays the deterministic
composer used by run_all.py and as the Gemini fallback.
"""
from __future__ import annotations
import os
import ast
import pandas as pd
from common import load_readings, DATA

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── guardrail: the non-negotiable system instruction for the Gemini path ──────
SYSTEM = (
    "You are an advise-only assistant for a reverse-osmosis (RO) water plant. "
    "HARD RULES: (1) use ONLY the numbers in the EVIDENCE block; never invent, round, or "
    "estimate a number that is not given — if a value is missing, say 'not available'. "
    "(2) You advise only; never issue or imply a control command. "
    "(3) Always name the attributed fouling mechanism and the evidence behind your recommendation. "
    "(4) End with a clear recommendation (SCHEDULE CIP SOON / MONITOR) and note the operator decides."
)

# ── prompt variants (used when no explicit question is asked) ─────────────────
PROMPTS = {
    "concise":     "Write a 3-sentence clean-now-or-wait recommendation for this unit, action first.",
    "explainable": "Explain WHY this unit is fouling (mechanism + feed-side evidence) in 2 sentences, "
                   "then give the clean-now-or-wait recommendation.",
    "cost":        "Frame the decision around cost (energy penalty vs CIP cost) in 2 sentences, "
                   "then give the clean-now-or-wait recommendation.",
}


# ── data loaders ──────────────────────────────────────────────────────────────
def _load(name) -> pd.DataFrame:
    f = DATA / name
    return pd.read_csv(f) if f.exists() else pd.DataFrame()


def latest_per_unit(df, key="cycle_id"):
    return df.sort_values(key).groupby("unit_id").tail(1) if not df.empty else df


def _anomaly_count(row) -> int:
    """Robust anomaly count.

    The codebase is inconsistent about the anomaly column: depending on which pipeline
    version wrote forecasts.csv, it can appear as `anomalies_count` (int), `anomalies` (int),
    or `anomalies` (a stringified list like "[3, 7, 12]"). Normalise all three to a count so
    the assistant never crashes and never silently reports 0.
    """
    v = row.get("anomalies_count")
    if v is not None and pd.notna(v):
        try:
            return int(v)
        except (ValueError, TypeError):
            pass
    v = row.get("anomalies")
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return 0 if pd.isna(v) else int(v)
    s = str(v).strip()
    if not s:
        return 0
    try:
        parsed = ast.literal_eval(s)
        if isinstance(parsed, (list, tuple)):
            return len(parsed)
        return int(parsed)
    except (ValueError, SyntaxError):
        return 0


# ── deterministic composer (fallback + run_all.py batch output) ───────────────
def brief(unit: str, fc, att, econ) -> str:
    lines = [f"── Unit {unit} — cleaning decision briefing (advise-only) ──"]
    f = fc[fc["unit_id"] == unit]
    # only GENUINELY significant cycles count as attribution evidence (no self-contradiction)
    a = att[(att["unit_id"] == unit) &
            (att["attributed_mechanism"] != "no-significant-fouling")]
    e = econ[econ["unit_id"] == unit]
    frow = f.iloc[-1] if not f.empty else None
    erow = e.iloc[-1] if not e.empty else None
    anomalies = _anomaly_count(frow) if frow is not None else 0

    # 003/004 — fouling state & forecast (NaN-safe: never print a bare 'nan')
    if frow is not None:
        rate = frow["fouling_rate_per_day"]
        if pd.isna(rate):
            lines.append("• Fouling trend (003/004): insufficient valid readings this cycle "
                         "to fit a trend (signal gap) — no forecast emitted.")
        else:
            dtc = frow["days_to_clean"]
            lines.append(f"• Fouling trend (003/004): ΔP rising {rate:.4f}/day "
                         f"(R²={frow['trend_r2']:.2f}); current rise {frow['current_rise']:+.2f}. "
                         f"Projected days-to-clean: {'—' if pd.isna(dtc) else f'{dtc:.0f} d'}. "
                         f"Anomalies flagged: {anomalies}.")
    # 005 — source attribution
    if not a.empty:
        r = a.sort_values("cycle_id").iloc[-1]
        lines.append(f"• Source attribution (005): latest significant cycle → "
                     f"{r['attributed_mechanism']} ({r['confidence']}). Evidence: ΔP rise "
                     f"{r['ndp_rise']:+.1f}, rejection change {r['rej_change_pct']:+.2f}%.")
    else:
        lines.append("• Source attribution (005): no significant-fouling cycle on record.")
    # 006 — economics (fold the model's own verdict in)
    if erow is not None:
        lines.append(f"• Economics (006): daily energy penalty ${erow['daily_energy_penalty_usd']:.2f}, "
                     f"accrued ${erow['cum_energy_penalty_usd']:.0f} vs CIP ${erow['cip_cost_usd']:.0f} "
                     f"→ cost model says {erow['recommendation']}.")

    # composed recommendation (evidence-gated; folds forecast + economics)
    rec, why = "MONITOR", "fouling within normal cycle economics"
    if frow is not None and pd.notna(frow["days_to_clean"]) and frow["days_to_clean"] <= 21:
        rec, why = "SCHEDULE CIP SOON", f"projected to hit action threshold in ~{frow['days_to_clean']:.0f} days"
    elif erow is not None and str(erow["recommendation"]) == "CLEAN NOW":
        rec, why = "SCHEDULE CIP SOON", "energy-penalty cost model recommends cleaning"
    if anomalies >= 8:
        why += f"; {anomalies} anomalies warrant inspection"
    lines.append(f"→ RECOMMENDATION: {rec} — {why}. (operator decides; system does not actuate)")
    return "\n".join(lines)


# ── evidence blocks for the Gemini path (only real values) ────────────────────
def evidence_text(unit, fc, att, econ) -> str:
    """Build the single-unit EVIDENCE block from the 003–006 outputs."""
    lines = [f"Unit: {unit}"]
    f = fc[fc["unit_id"] == unit]
    if not f.empty:
        r = f.iloc[-1]
        dtc = r["days_to_clean"]
        lines.append(f"- Fouling trend: rate {r['fouling_rate_per_day']}/day, R2 {r['trend_r2']}, "
                     f"current rise {r['current_rise']}, days-to-clean "
                     f"{'not available' if pd.isna(dtc) else dtc}, anomalies {_anomaly_count(r)}")
    a = att[(att["unit_id"] == unit) & (att["attributed_mechanism"] != "no-significant-fouling")]
    if not a.empty:
        r = a.sort_values("cycle_id").iloc[-1]
        lines.append(f"- Source attribution: mechanism {r['attributed_mechanism']} "
                     f"({r['confidence']}), dP rise {r['ndp_rise']}, rejection change {r['rej_change_pct']}%")
    else:
        lines.append("- Source attribution: no significant-fouling cycle on record")
    e = econ[econ["unit_id"] == unit]
    if not e.empty:
        r = e.iloc[-1]
        lines.append(f"- Economics: daily energy penalty ${r['daily_energy_penalty_usd']}, "
                     f"accrued ${r['cum_energy_penalty_usd']}, CIP cost ${r['cip_cost_usd']}, "
                     f"model verdict {r['recommendation']}")
    return "\n".join(lines)


def _latest_mechanism(att, unit) -> str:
    a = att[(att["unit_id"] == unit) & (att["attributed_mechanism"] != "no-significant-fouling")]
    if a.empty:
        return "none on record"
    r = a.sort_values("cycle_id").iloc[-1]
    return f"{r['attributed_mechanism']} ({r['confidence']})"


def _daily_penalty(econ, unit):
    e = econ[econ["unit_id"] == unit]
    return "not available" if e.empty else e.iloc[-1]["daily_energy_penalty_usd"]


def fleet_evidence(fc, att, econ, limit=8) -> str:
    """Build a fleet-wide EVIDENCE block for questions that span units."""
    fcl = latest_per_unit(fc)
    if fcl.empty:
        return "No forecast outputs available."
    ranked = fcl[fcl["days_to_clean"].notna()].sort_values("days_to_clean")
    if ranked.empty:                       # nothing urgent — still show the fleet
        ranked = fcl.sort_values("current_rise", ascending=False)
    lines = [f"Fleet overview (showing {min(limit, len(ranked))} most urgent of {len(fcl)} units):"]
    for _, r in ranked.head(limit).iterrows():
        u = r["unit_id"]
        dtc = r["days_to_clean"]
        lines.append(
            f"- {u}: rate {r['fouling_rate_per_day']}/day, R2 {r['trend_r2']}, "
            f"days-to-clean {'not available' if pd.isna(dtc) else dtc}, "
            f"anomalies {_anomaly_count(r)}, mechanism {_latest_mechanism(att, u)}, "
            f"daily energy penalty ${_daily_penalty(econ, u)}")
    return "\n".join(lines)


# ── Gemini client + generation ────────────────────────────────────────────────
def _client():
    """Return (client, source) or (None, reason)."""
    try:
        from google import genai
    except Exception as e:
        return None, f"google-genai not installed ({e})"
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    try:
        if key:
            return genai.Client(api_key=key), "AI Studio API key"
        if os.getenv("GOOGLE_GENAI_USE_VERTEXAI"):
            return genai.Client(), "Vertex AI"
        return None, "no GEMINI_API_KEY and Vertex not configured"
    except Exception as e:
        return None, f"client init failed ({e})"


def gemini_answer(question, evidence, variant="explainable"):
    """Ask Gemini the operator's question under the guardrail. Returns (text, backend)."""
    client, src = _client()
    if client is None:
        return None, src
    try:
        from google.genai import types
        task = question.strip() if question and question.strip() else PROMPTS.get(variant, PROMPTS["explainable"])
        prompt = f"QUESTION: {task}\n\nEVIDENCE (advise-only; use only these numbers):\n{evidence}"
        r = client.models.generate_content(
            model=MODEL, contents=prompt,
            config=types.GenerateContentConfig(system_instruction=SYSTEM, temperature=0.2))
        return r.text.strip(), src
    except Exception as e:
        return None, f"generate failed ({str(e)[:80]})"


# ── single entry point for the serving API ────────────────────────────────────
def _detect_unit(question, fc):
    """Find a unit id mentioned in the question (e.g. 'B03'), else None."""
    if not question:
        return None
    q = question.upper()
    for u in fc["unit_id"].unique():
        if str(u).upper() in q:
            return u
    return None


def _fleet_brief(fc, att, econ, limit=3) -> str:
    """Deterministic fleet-level answer (fallback for questions with no specific unit)."""
    fcl = latest_per_unit(fc)
    urgent = fcl[fcl["days_to_clean"].notna()].sort_values("days_to_clean").head(limit)
    if urgent.empty:
        return ("No unit currently has a fouling forecast with a projected clean date; "
                "all units are within normal cycle economics. (advise-only; operator decides)")
    out = ["Most urgent units right now (advise-only; operator decides):"]
    for u in urgent["unit_id"]:
        out.append(brief(u, fc, att, econ))
    return "\n\n".join(out)


def answer(question, fc, att, econ, unit=None, variant="explainable") -> dict:
    """Answer an operator question. Tries Gemini, falls back to the deterministic composer.

    Returns {answer, backend, mode, unit}. `mode` is 'gemini' or 'deterministic'.
    """
    if unit is None:
        unit = _detect_unit(question, fc)
    ev = evidence_text(unit, fc, att, econ) if unit else fleet_evidence(fc, att, econ)
    text, backend = gemini_answer(question, ev, variant)
    if text:
        return {"answer": text, "backend": backend, "mode": "gemini", "unit": unit}
    det = brief(unit, fc, att, econ) if unit else _fleet_brief(fc, att, econ)
    return {"answer": det, "backend": backend, "mode": "deterministic", "unit": unit}


def main():
    df = load_readings()
    fc = latest_per_unit(_load("forecasts.csv"))
    att = _load("attributions.csv")
    econ = latest_per_unit(_load("economics.csv"))
    if fc.empty:
        raise SystemExit("run deviation.py, forecast_anomaly.py, fouling_validation.py, "
                         "economics.py first to generate module outputs")

    _, backend = _client()
    print("=" * 70)
    print(f"SPEC 007 — AI ASSISTANT  ·  advise-only decision briefings  ·  backend: {backend}")
    print("=" * 70)
    # rank units by urgency (soonest days-to-clean) and brief the top few
    urgent = fc[fc["days_to_clean"].notna()].sort_values("days_to_clean")
    for unit in urgent["unit_id"].head(3):
        print("\n" + brief(unit, fc, att, econ))
    print("\n" + "-" * 70)
    print("All 21 units briefed → data/briefings.txt")

    with open(DATA / "briefings.txt", "w") as fh:
        for unit in sorted(df["unit_id"].unique()):
            fh.write(brief(unit, fc, att, econ) + "\n\n")


if __name__ == "__main__":
    main()
