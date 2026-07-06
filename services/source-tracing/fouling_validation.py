#!/usr/bin/env python3
"""
Spec 005 — Fouling Validation & Source Attribution.

Validates the early warning logic against ground-truth CIP events using
pre-registered horizons and threshold durations. Dynamically ranks candidate
signals to find the strongest leading indicator, computes precision/recall,
evaluates the physics baseline error, and outputs the results for UI consumption.
"""
from __future__ import annotations
import json
import numpy as np
import pandas as pd
from common import load_readings, DATA, clean_anchor
from attribute import percentile_ranks, attribute_cycle

# FR-005/FR-007 Pre-registered constraints
MIN_SUSTAINED_WARNING_DAYS = 3
HORIZON_DAYS = 90
WARN_THRESHOLDS = {
    "unit_n_delta_p": 3.0,
    "salt_passage": 0.5,
}

def cip_events(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["unit_id", "cycle_id", "reading_date"])
    return df[df["cip"] == True][["unit_id", "cycle_id", "reading_date"]].drop_duplicates()

def evaluate_signal(df: pd.DataFrame, signal: str, warn_rise: float) -> dict:
    tps, fps, fns = 0, 0, 0
    lead_days = []
    
    events = cip_events(df)
    
    for (u, c), cyc in df.groupby(["unit_id", "cycle_id"]):
        cyc = cyc.sort_values("reading_date")
        anchor = clean_anchor(cyc, signal)
        if anchor is None:
            continue
            
        is_warning = cyc[signal] >= anchor + warn_rise
        sustained = is_warning.rolling(MIN_SUSTAINED_WARNING_DAYS).sum() >= MIN_SUSTAINED_WARNING_DAYS
        warn_dates = cyc.loc[sustained, "reading_date"]
        
        cip_in_cycle = events[(events["unit_id"] == u) & (events["cycle_id"] == c)]
        has_cip = not cip_in_cycle.empty
        
        if warn_dates.empty:
            if has_cip:
                fns += 1
            continue
            
        first_warn = warn_dates.iloc[0]
        
        if has_cip:
            cip_date = cip_in_cycle.iloc[0]["reading_date"]
            lead = (cip_date - first_warn).days
            if 0 <= lead <= HORIZON_DAYS:
                tps += 1
                lead_days.append(lead)
            elif lead > HORIZON_DAYS:
                fps += 1
                fns += 1  # Missed the actual CIP window
        else:
            fps += 1

    precision = tps / (tps + fps) if (tps + fps) > 0 else 0.0
    recall = tps / (tps + fns) if (tps + fns) > 0 else 0.0
    
    return {
        "signal": signal,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "tps": tps,
        "fps": fps,
        "fns": fns,
        "median_lead_days": float(np.median(lead_days)) if lead_days else None,
        "p25_lead_days": float(np.percentile(lead_days, 25)) if lead_days else None,
        "p75_lead_days": float(np.percentile(lead_days, 75)) if lead_days else None,
        "score": (precision + recall) / 2.0
    }

def compute_baseline_error(df: pd.DataFrame) -> float:
    """FR-008/009: Error between clean anchor and actual clean readings."""
    errors = []
    for (u, c), cyc in df.groupby(["unit_id", "cycle_id"]):
        anchor = clean_anchor(cyc, "unit_n_delta_p")
        if anchor is None: continue
        early = cyc[cyc["days_since_replacement"] <= cyc["days_since_replacement"].min() + 10]
        actuals = early["unit_n_delta_p"].dropna()
        if not actuals.empty:
            err = (actuals - anchor).abs().mean()
            errors.append(err)
    return float(np.mean(errors)) if errors else 0.0

def attributions(df: pd.DataFrame) -> pd.DataFrame:
    ranked = percentile_ranks(df)
    rows = [a for _, cyc in ranked.groupby(["unit_id", "cycle_id"])
            if (a := attribute_cycle(cyc))]
    return pd.DataFrame(rows)

def main():
    df = load_readings()
    events = cip_events(df)
    
    # Dynamically rank candidate signals (FR-010/FR-011)
    results = [evaluate_signal(df, sig, rise) for sig, rise in WARN_THRESHOLDS.items()]
    results.sort(key=lambda x: x["score"], reverse=True)
    best_signal = results[0]
    
    baseline_error = compute_baseline_error(df)
    
    att = attributions(df)
    fouled = att[att["attributed_mechanism"] != "no-significant-fouling"]
    att.to_csv(DATA / "attributions.csv", index=False)
    
    mechanism_mix = fouled["attributed_mechanism"].value_counts().to_dict()
    
    report = {
        "pre_registered_params": {
            "horizon_days": HORIZON_DAYS,
            "min_sustained_warning_days": MIN_SUSTAINED_WARNING_DAYS
        },
        "total_cip_events": len(events),
        "detected_cycles": len(att),
        "baseline_error": round(baseline_error, 3),
        "leading_indicator": best_signal,
        "alternative_indicators": results[1:],
        "mechanism_mix": mechanism_mix,
        "data_limits": [
            "scaling species not identified — no individual ions in feed",
            "biofouling vs organic not separable — no microbial/AOC signal",
            "turbidity is an SDI proxy, not ASTM D4189 SDI"
        ]
    }
    
    with open(DATA / "validation_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("=" * 68)
    print("SPEC 005 — FOULING VALIDATION & SOURCE ATTRIBUTION")
    print("=" * 68)
    print(f"  Best Signal         : {best_signal['signal']} (score: {best_signal['score']:.2f})")
    print(f"  CIP events          : {len(events)}")
    print(f"  True Positives      : {best_signal['tps']}")
    print(f"  Precision           : {best_signal['precision'] * 100:.1f}%")
    print(f"  Recall              : {best_signal['recall'] * 100:.1f}%")
    print(f"  Median Lead Time    : {best_signal['median_lead_days']} days")
    print(f"  Baseline Error      : {baseline_error:.3f}")
    print(f"\n  SOURCE ATTRIBUTION  : {len(fouled)} significant-fouling cycles")
    for m, n in mechanism_mix.items():
        print(f"      {m:<24} {n}")
    print(f"\nsaved → {DATA/'validation_report.json'}")

if __name__ == "__main__":
    main()
