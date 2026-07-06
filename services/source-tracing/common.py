"""Shared data loading for the RO twin backend prototype (specs 003–007)."""
from __future__ import annotations
import pathlib
import pandas as pd

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data"
CSV = DATA / "readings.csv"


def load_readings() -> pd.DataFrame:
    if not CSV.exists():
        raise SystemExit(f"missing {CSV} — run the bq extract first (see README)")
    df = pd.read_csv(CSV, parse_dates=["reading_date"])
    df["cip"] = df["cip"].astype(str).str.lower().eq("true")
    # salt passage (%) is the fouling-relevant inverse of EC removal
    df["salt_passage"] = 100.0 - df["percent_ec_removal"] * 100.0
    return df.sort_values(["unit_id", "reading_date"]).reset_index(drop=True)


# ── the 003 confound-free deviation = the single shared bus (spec 004 FR-007 / SC-005) ──
CLEAN_DAYS = 10   # first N days of a cleaning cycle define the freshly-cleaned anchor (matches deviation.py)


def clean_anchor(cyc: pd.DataFrame, col: str) -> float | None:
    """Expected clean-membrane value for a cycle = mean over its freshly-cleaned start.
    ONE definition, shared by 003/004/005/006 so every 'rise over clean' number reconciles."""
    early = cyc[cyc["days_since_replacement"] <= cyc["days_since_replacement"].min() + CLEAN_DAYS]
    vals = early[col].dropna()
    return float(vals.mean()) if len(vals) >= 3 else None


def add_deviation(df: pd.DataFrame, col: str = "unit_n_delta_p") -> pd.DataFrame:
    """Attach the 003 deviation (value − clean anchor) per (unit, cycle). Downstream features
    (004 forecast, 006 economics) consume `<col>_deviation`, never the raw reading."""
    df = df.copy()
    anchors = {(u, c): clean_anchor(cyc, col) for (u, c), cyc in df.groupby(["unit_id", "cycle_id"])}
    keys = list(zip(df["unit_id"], df["cycle_id"]))
    df[f"{col}_anchor"] = [anchors.get(k) for k in keys]
    df[f"{col}_deviation"] = df[col] - df[f"{col}_anchor"]
    return df
