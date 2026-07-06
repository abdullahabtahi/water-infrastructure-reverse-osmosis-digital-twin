import pandas as pd
import numpy as np
import pytest
from fouling_validation import evaluate_signal, compute_baseline_error, cip_events

def mock_data():
    dates = pd.date_range("2020-01-01", periods=150, freq="D")
    df = pd.DataFrame({
        "unit_id": "unit_1",
        "cycle_id": "cycle_1",
        "reading_date": dates,
        "days_since_replacement": np.arange(150),
        "unit_n_delta_p": np.random.normal(1.0, 0.1, 150),
        "salt_passage": np.random.normal(0.5, 0.05, 150),
        "cip": False
    })
    return df

def test_empty_frame():
    df = pd.DataFrame(columns=["unit_id", "cycle_id", "reading_date", "days_since_replacement", "unit_n_delta_p", "salt_passage", "cip"])
    res = evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["tps"] == 0
    assert res["fps"] == 0
    assert res["fns"] == 0

def test_baseline_error():
    df = mock_data()
    df.loc[0:15, "unit_n_delta_p"] = 1.0
    err = compute_baseline_error(df)
    assert isinstance(err, float)
    assert err >= 0.0

def test_evaluate_signal_true_positive():
    df = mock_data()
    # Add a clean anchor
    df.loc[0:15, "unit_n_delta_p"] = 1.0
    # Add a sustained warning starting at day 50
    df.loc[50:60, "unit_n_delta_p"] = 5.0 
    # Add a CIP event at day 100
    df.loc[100, "cip"] = True
    
    res = evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["tps"] == 1
    assert res["fps"] == 0
    assert res["fns"] == 0
    assert res["median_lead_days"] == 48.0

def test_main(monkeypatch, tmp_path):
    from fouling_validation import main
    # Mock DATA path so it writes to temp dir
    import common
    import fouling_validation
    monkeypatch.setattr(fouling_validation, "DATA", tmp_path)
    
    # Mock load_readings
    def mock_load():
        df = mock_data()
        df.loc[0:15, "unit_n_delta_p"] = 1.0
        df.loc[50:60, "unit_n_delta_p"] = 5.0
        df.loc[100, "cip"] = True
        return df
    monkeypatch.setattr(fouling_validation, "load_readings", mock_load)
    
    # Mock attributions
    monkeypatch.setattr(fouling_validation, "attributions", lambda df: pd.DataFrame([{"unit_id": "unit_1", "cycle_id": "cycle_1", "attributed_mechanism": "scaling"}]))
    
    main()
    
    assert (tmp_path / "validation_report.json").exists()
    assert (tmp_path / "attributions.csv").exists()

def test_evaluate_signal_false_positive():
    df = mock_data()
    df.loc[0:15, "unit_n_delta_p"] = 1.0
    # Warning at day 20, but no CIP
    df.loc[20:30, "unit_n_delta_p"] = 5.0
    
    res = evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["tps"] == 0
    assert res["fps"] == 1
    assert res["fns"] == 0

def test_evaluate_signal_false_negative():
    df = mock_data()
    df.loc[0:15, "unit_n_delta_p"] = 1.0
    # No warning, but a CIP happens
    df.loc[100, "cip"] = True
    
    res = evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["tps"] == 0
    assert res["fps"] == 0
    assert res["fns"] == 1

def test_evaluate_signal_too_early_warning():
    df = mock_data()
    df.loc[0:15, "unit_n_delta_p"] = 1.0
    # Warning at day 20, CIP at day 120 (lead = 100 days > HORIZON_DAYS 90)
    df.loc[20:30, "unit_n_delta_p"] = 5.0
    df.loc[120, "cip"] = True
    
    res = evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["fps"] == 1
    assert res["fns"] == 1
    assert res["tps"] == 0
