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
