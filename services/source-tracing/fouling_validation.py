#!/usr/bin/env python3
"""
Spec 005 — Fouling Validation & Source Attribution (prototype).

Two evidence-first outputs on the real CIP ground-truth catalog:
  1. LEAD-TIME BACKTEST — for each actual CIP cleaning event, how many days earlier did the
     003 fouling signal (normalized ΔP) cross a warning threshold? Reports catch-rate and
     median lead time — the signal is *earned* from history, never asserted.
  2. SOURCE ATTRIBUTION — per fouling cycle, the mechanism attribution (imported from
     attribute.py), labeled measured-derived vs modeled and with co-candidates when the
     signals cannot separate mechanisms (honesty contract, see EVIDENCE.md).

Honesty (005 FR-022): attribution corroborates *why*; it never reweights the measured lead
indicator. Scaling speciation / bio-vs-organic remain data-limited (stated, not hidden).
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from common import load_readings, DATA
from attribute import percentile_ranks, attribute_cycle

SIGNAL = "unit_n_delta_p"
WARN_RISE = 3.0          # ΔP rise over clean anchor counted as a fouling warning
MAX_LOOKBACK = 120       # days before a CIP we search for the first warning


def cip_events(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["cip"]][["unit_id", "reading_date"]].drop_duplicates()


def lead_time_for_event(unit_df: pd.DataFrame, cip_date) -> dict | None:
    win = unit_df[(unit_df["reading_date"] < cip_date) &
                  (unit_df["reading_date"] >= cip_date - pd.Timedelta(days=MAX_LOOKBACK))]
    win = win.sort_values("reading_date")
    if len(win) < 5:
        return None
    # robust clean reference: the 120-day window may start mid-fouling, so anchoring on the
    # first 5 readings would miss slow events. Use the window's 10th percentile (clean floor).
    anchor = win[SIGNAL].quantile(0.10)
    warned = win[win[SIGNAL] >= anchor + WARN_RISE]
    if warned.empty:
        return {"caught": False, "lead_days": None}
    first_warn = warned["reading_date"].iloc[0]
    return {"caught": True, "lead_days": (cip_date - first_warn).days}


def backtest(df: pd.DataFrame) -> dict:
    events = cip_events(df)
    rows = []
    for _, ev in events.iterrows():
        udf = df[df["unit_id"] == ev["unit_id"]]
        r = lead_time_for_event(udf, ev["reading_date"])
        if r:
            rows.append(r)
    res = pd.DataFrame(rows)
    if res.empty:
        return {"cip_events_tested": 0, "catch_rate_pct": 0, "median_lead_days": None,
                "p25_lead_days": None, "p75_lead_days": None}
    caught = res[res["caught"]]
    return {
        "cip_events_tested": len(res),
        "catch_rate_pct": round(100 * len(caught) / len(res), 1) if len(res) else 0,
        "median_lead_days": float(caught["lead_days"].median()) if len(caught) else None,
        "p25_lead_days": float(caught["lead_days"].quantile(0.25)) if len(caught) else None,
        "p75_lead_days": float(caught["lead_days"].quantile(0.75)) if len(caught) else None,
    }


def attributions(df: pd.DataFrame) -> pd.DataFrame:
    ranked = percentile_ranks(df)
    rows = [a for _, cyc in ranked.groupby(["unit_id", "cycle_id"])
            if (a := attribute_cycle(cyc))]
    return pd.DataFrame(rows)


def main():
    df = load_readings()
    bt = backtest(df)
    att = attributions(df)
    fouled = att[att["attributed_mechanism"] != "no-significant-fouling"]
    att.to_csv(DATA / "attributions.csv", index=False)

    print("=" * 68)
    print("SPEC 005 — FOULING VALIDATION (evidence-first backtest)")
    print("=" * 68)
    print(f"  CIP events tested   : {bt['cip_events_tested']}")
    print(f"  catch rate          : {bt['catch_rate_pct']}%  "
          f"(signal crossed warning before the actual cleaning)")
    print(f"  median lead time    : {bt['median_lead_days']} days  "
          f"[P25 {bt['p25_lead_days']} – P75 {bt['p75_lead_days']}]")
    print(f"\n  SOURCE ATTRIBUTION  : {len(fouled)} significant-fouling cycles")
    print("  mechanism mix (measured-derived; co-candidates where data can't separate):")
    for m, n in fouled["attributed_mechanism"].value_counts().items():
        print(f"      {m:<24} {n}")
    print("\n  DATA-LIMIT DISCLOSURES (honesty contract):")
    print("      • scaling species not identified — no individual ions in feed")
    print("      • biofouling vs organic not separable — no microbial/AOC signal")
    print("      • turbidity is an SDI proxy, not ASTM D4189 SDI")
    print(f"\nsaved → {DATA/'attributions.csv'}")


if __name__ == "__main__":
    main()
