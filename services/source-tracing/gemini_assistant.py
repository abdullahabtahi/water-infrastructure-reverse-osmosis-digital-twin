#!/usr/bin/env python3
"""
Spec 007 — Gemini assistant CLI (thin wrapper over assistant.py).

The Gemini backend, guardrail, evidence composition and deterministic fallback all live in
`assistant.py` now — this file is just the command-line front door for A/B testing prompt
variants against real module outputs. Keeping one implementation avoids the two files drifting
(they previously disagreed on the `anomalies` column).

    python gemini_assistant.py --variant explainable --unit D02
    python gemini_assistant.py --ask "Clean now or wait on B03?"
"""
from __future__ import annotations
import argparse
import assistant as a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", choices=list(a.PROMPTS), default="explainable")
    ap.add_argument("--unit", default=None, help="single unit; default = top-3 urgent")
    ap.add_argument("--ask", default=None, help="free-form operator question")
    args = ap.parse_args()

    fc = a.latest_per_unit(a._load("forecasts.csv"))
    att = a._load("attributions.csv")
    econ = a.latest_per_unit(a._load("economics.csv"))
    if fc.empty:
        raise SystemExit("run the pipeline first (run_all.py) to generate module outputs")

    _, backend = a._client()
    print("=" * 70)
    print(f"SPEC 007 — GEMINI ASSISTANT  ·  variant='{args.variant}'  ·  backend: {backend}")
    print("=" * 70)

    if args.ask:
        res = a.answer(args.ask, fc, att, econ, unit=args.unit, variant=args.variant)
        print(f"\nQ: {args.ask}   [{res['mode']} · {res['backend']}]")
        print(res["answer"])
        return

    units = ([args.unit] if args.unit else
             fc[fc["days_to_clean"].notna()].sort_values("days_to_clean")["unit_id"].head(3).tolist())
    for u in units:
        res = a.answer(None, fc, att, econ, unit=u, variant=args.variant)
        print(f"\n── Unit {u} ──   [{res['mode']} · {res['backend']}]")
        print(res["answer"])


if __name__ == "__main__":
    main()
