"""
Spec 007 — AI assistant tests (synthetic data, no server / no Gemini).

Covers: (1) regression for the anomalies column bug (assistant.py read `anomalies_count`
which the committed forecasts.csv doesn't have → always reported 0), (2) the robust
anomaly-count normaliser across the three shapes the pipeline has emitted, (3) the `answer()`
entry point's deterministic fallback + unit detection + advise-only honesty invariant.
"""
import numpy as np
import pandas as pd
import pytest

import assistant


# ── synthetic 003–006 outputs ─────────────────────────────────────
def _fc(unit="B03", cycle=1, rate=0.05, r2=0.6, rise=5.0, dtc=10.0, anomalies=3):
    return pd.DataFrame([{
        "unit_id": unit, "bank_id": unit[0], "cycle_id": cycle,
        "fouling_rate_per_day": rate, "trend_r2": r2, "current_rise": rise,
        "days_to_clean": dtc, "forecast_band_days": 2.0, "anomalies": anomalies,
    }])


def _att(unit="B03", cycle=1, mech="organic", conf="propensity"):
    return pd.DataFrame([{
        "unit_id": unit, "bank_id": unit[0], "stage": 1, "cycle_id": cycle, "days": 200,
        "ndp_rise": 6.3, "rej_change_pct": 0.86,
        "attributed_mechanism": mech, "confidence": conf,
    }])


def _econ(unit="B03", cycle=1, rec="WAIT"):
    return pd.DataFrame([{
        "unit_id": unit, "bank_id": unit[0], "cycle_id": cycle,
        "daily_energy_penalty_usd": 0.63, "cum_energy_penalty_usd": 19.0,
        "cip_cost_usd": 5000.0, "recommendation": rec,
    }])


# ── (1) anomaly count is robust to every shape the pipeline emits ──
@pytest.mark.parametrize("value,expected", [
    (13, 13),                 # int (current committed forecasts.csv)
    ("[3, 7, 12]", 3),        # stringified list (forecast_anomaly.py str(anom_list))
    ("[]", 0),                # empty stringified list
    (np.int64(4), 4),         # numpy int from pandas
    (float("nan"), 0),        # missing
])
def test_anomaly_count_normalises_every_shape(value, expected):
    assert assistant._anomaly_count(pd.Series({"anomalies": value})) == expected


def test_anomaly_count_prefers_count_column():
    row = pd.Series({"anomalies_count": 5, "anomalies": "[1]"})
    assert assistant._anomaly_count(row) == 5


# ── (2) regression: the deterministic brief must report the REAL count ─
def test_brief_reports_real_anomaly_count_not_zero():
    """Before the fix, brief() read a non-existent `anomalies_count` and always printed 0."""
    out = assistant.brief("B03", _fc(anomalies=9), _att(), _econ())
    assert "Anomalies flagged: 9" in out
    assert "9 anomalies warrant inspection" in out  # >=8 branch fires


# ── (3) answer(): deterministic fallback, unit detection, honesty ──
def test_answer_detects_unit_from_question():
    res = assistant.answer("Clean now or wait on B03?", _fc(), _att(), _econ())
    assert res["unit"] == "B03"
    assert res["mode"] == "deterministic"          # no Gemini configured in tests
    assert "advise-only" in res["answer"].lower() or "operator decides" in res["answer"].lower()


def test_answer_fleet_question_without_unit():
    res = assistant.answer("Which unit is fouling fastest?", _fc(), _att(), _econ())
    assert res["unit"] is None
    assert "B03" in res["answer"]                    # the only (and most urgent) unit


def test_answer_empty_question_does_not_crash():
    res = assistant.answer("", _fc(), _att(), _econ())
    assert res["mode"] == "deterministic"
    assert isinstance(res["answer"], str) and res["answer"]


def test_answer_never_actuates():
    """Advise-only invariant: the assistant must never imply a control command."""
    res = assistant.answer("Should I clean B03?", _fc(dtc=0.0), _att(), _econ())
    assert "operator decides" in res["answer"].lower()
