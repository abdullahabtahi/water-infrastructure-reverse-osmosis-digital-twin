"""Generates research/public/fouling_backtest.png from the real 71-CIP-event backtest
in services/source-tracing/data/validation_report.json. Run:
  .venv-watertap-spike/bin/python research/gen_eval_chart.py
"""
import json
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

BG, GRID, TEXT, SUBTEXT, BORDER = "#0d1117", "#21262d", "#e6edf3", "#8b949e", "#30363d"
INDIGO, SKY, AMBER, GREEN, RED = "#818cf8", "#38bdf8", "#f59e0b", "#4ade80", "#f87171"

HERE = pathlib.Path(__file__).parent
report = json.loads((HERE.parent / "services/source-tracing/data/validation_report.json").read_text())

lead = report["leading_indicator"]
alt = report["alternative_indicators"][0]

indicators = [lead["signal"], alt["signal"]]
precision = [lead["precision"], alt["precision"]]
recall = [lead["recall"], alt["recall"]]
median_lead = [lead["median_lead_days"], alt["median_lead_days"]]

fig, axes = plt.subplots(1, 2, figsize=(10, 4), facecolor=BG)

# --- Left: precision/recall grouped bars ---
ax = axes[0]
ax.set_facecolor(BG)
y = np.arange(len(indicators))
h = 0.32
ax.barh(y + h / 2, precision, height=h, color=INDIGO, label="Precision")
ax.barh(y - h / 2, recall, height=h, color=SKY, label="Recall")
ax.set_yticks(y)
ax.set_yticklabels(indicators, color=TEXT, fontsize=10)
ax.set_xlim(0, 1)
ax.set_xlabel("Score", color=SUBTEXT, fontsize=9)
ax.set_title(f"Precision / Recall vs {report['total_cip_events']} real CIP events", color=TEXT, fontsize=11, pad=10)
ax.tick_params(colors=SUBTEXT, labelsize=9)
for spine in ax.spines.values():
    spine.set_color(BORDER)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.grid(axis="x", color=GRID, linewidth=0.6)
ax.set_axisbelow(True)
leg = ax.legend(frameon=False, loc="lower right", fontsize=9)
for text in leg.get_texts():
    text.set_color(TEXT)
for i, (p, r) in enumerate(zip(precision, recall)):
    ax.text(p + 0.02, i + h / 2, f"{p:.2f}", color=TEXT, fontsize=8, va="center")
    ax.text(r + 0.02, i - h / 2, f"{r:.2f}", color=TEXT, fontsize=8, va="center")

# --- Right: median lead time ---
ax2 = axes[1]
ax2.set_facecolor(BG)
bars = ax2.barh(y, median_lead, height=0.45, color=[AMBER, SUBTEXT])
ax2.set_yticks(y)
ax2.set_yticklabels(indicators, color=TEXT, fontsize=10)
ax2.set_xlabel("Median lead time (days before CIP)", color=SUBTEXT, fontsize=9)
ax2.set_title("Early-warning lead time", color=TEXT, fontsize=11, pad=10)
ax2.tick_params(colors=SUBTEXT, labelsize=9)
for spine in ax2.spines.values():
    spine.set_color(BORDER)
ax2.spines["top"].set_visible(False)
ax2.spines["right"].set_visible(False)
ax2.grid(axis="x", color=GRID, linewidth=0.6)
ax2.set_axisbelow(True)
for i, d in enumerate(median_lead):
    ax2.text(d + 1, i, f"{d:.0f}d", color=TEXT, fontsize=9, va="center")

fig.suptitle(
    f"Fouling-onset backtest — {report['detected_cycles']} clean→CIP cycles, "
    f"{report['total_cip_events']} labeled cleaning events (real OCWD history, 2019–2021)",
    color=TEXT, fontsize=12, y=1.04,
)
fig.tight_layout()

out = HERE / "public"
out.mkdir(exist_ok=True)
fig.savefig(out / "fouling_backtest.png", dpi=160, bbox_inches="tight", facecolor=BG, edgecolor="none")
print(f"wrote {out / 'fouling_backtest.png'}")
