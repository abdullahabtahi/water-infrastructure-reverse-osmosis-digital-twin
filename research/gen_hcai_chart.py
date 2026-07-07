"""Generates research/public/hcai_position.png — Shneiderman's Human-Centered AI 2x2,
positioning this project's governance model (advise-only, hard gates on writes/actuation).
Run: .venv-watertap-spike/bin/python research/gen_hcai_chart.py
"""
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BG, GRID, TEXT, SUBTEXT, BORDER = "#0d1117", "#21262d", "#e6edf3", "#8b949e", "#30363d"
INDIGO, GREEN, RED, AMBER = "#818cf8", "#4ade80", "#f87171", "#f59e0b"

fig, ax = plt.subplots(figsize=(6.4, 6.4), facecolor=BG)
ax.set_facecolor(BG)

# Quadrant shading: x = human control, y = automation
ax.fill_between([0, 0.5], 0, 0.5, color=RED, alpha=0.10)      # low ctrl, low auto
ax.fill_between([0.5, 1], 0, 0.5, color=AMBER, alpha=0.10)    # high ctrl, low auto
ax.fill_between([0, 0.5], 0.5, 1, color=AMBER, alpha=0.14)    # low ctrl, high auto (excessive automation risk)
ax.fill_between([0.5, 1], 0.5, 1, color=GREEN, alpha=0.14)    # high ctrl, high auto (HCAI target)

ax.axvline(0.5, color=BORDER, linewidth=1)
ax.axhline(0.5, color=BORDER, linewidth=1)

# Reference points
ax.scatter([0.15], [0.85], s=90, color=RED, zorder=5)
ax.annotate("fully autonomous\nplant control\n(not this project)", (0.15, 0.85), xytext=(0.17, 0.93),
            color=SUBTEXT, fontsize=8.5, ha="left")

ax.scatter([0.85], [0.15], s=90, color=SUBTEXT, zorder=5)
ax.annotate("manual dashboards\nno AI assistance", (0.85, 0.15), xytext=(0.55, 0.06),
            color=SUBTEXT, fontsize=8.5, ha="left")

# This project
ax.scatter([0.82], [0.8], s=170, color=INDIGO, zorder=6, edgecolors=TEXT, linewidths=1.2)
ax.annotate("Oceanus\nadvise-only, evidence-cited,\nhuman-approved writes", (0.82, 0.8), xytext=(0.75, 0.60),
            color=TEXT, fontsize=9.5, fontweight="bold", ha="center")

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.set_xlabel("Human control", color=SUBTEXT, fontsize=10)
ax.set_ylabel("Automation", color=SUBTEXT, fontsize=10)
ax.set_xticks([])
ax.set_yticks([])
for spine in ax.spines.values():
    spine.set_color(BORDER)
ax.set_title("Shneiderman's Human-Centered AI framework", color=TEXT, fontsize=12, pad=14)
ax.text(0.75, 0.97, "HCAI target zone", color=GREEN, fontsize=9, ha="center", fontweight="bold")

fig.tight_layout()
out = pathlib.Path(__file__).parent / "public"
out.mkdir(exist_ok=True)
fig.savefig(out / "hcai_position.png", dpi=160, bbox_inches="tight", facecolor=BG, edgecolor="none")
print(f"wrote {out / 'hcai_position.png'}")
