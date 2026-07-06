# Fouling Source-Tracing / Mechanism Attribution — Cited Evidence Base

**Scope.** Ground, in real published standards and peer-reviewed literature, how feed-side signals
attribute an observed RO performance deviation (observed − WaterTAP clean-membrane baseline) to a
specific fouling mechanism. Available feed signals: temperature, EC (TDS proxy), pH, turbidity,
total chlorine (Cl₂), RO-feed TOC. Response: normalized ΔP, stage-wise flux, recovery, salt
rejection, days-since-CIP, CIP events.

**Verification.** FilmTec Technical Manual and Hydranautics TSB107 were fetched and text-extracted
from the primary PDFs; ASTM records confirmed via ASTM/ANSI catalog; journal DOIs via
publisher/PubMed. Compiled 2026-07-06.

---

## Pillar 1 — Fouling mechanism taxonomy
Five canonical RO fouling mechanisms: (1) inorganic **scaling** (CaCO₃, CaSO₄, BaSO₄, SrSO₄, silica),
(2) **particulate/colloidal**, (3) **biofouling**, (4) **organic** (NOM/EfOM), (5) **oxidative damage**
(polyamide attack by free chlorine — a degradation mode, not a deposit).

- Jiang, Li, Ladewig (2017), *Sci. Total Environ.* 595:567–583 — DOI 10.1016/j.scitotenv.2017.03.235
- DuPont **FilmTec RO Technical Manual**, Form 45-D01504-en Rev. 19 (Feb 2026)
- Hydranautics **TSB107.28** (Apr 2025) — verbatim foulant list

## Pillar 2 — Feed-side indicators per mechanism
- **Scaling:** LSI (`pH − pHs`, TDS < 10,000 mg/L) / S&DSI (TDS > 10,000), evaluated on **concentrate**;
  control requires concentrate LSI/S&DSI **negative**. Sulfate/silica governed by Ksp (FilmTec Table 11).
  → **ASTM D3739-19** (LSI for RO, 10–10,000 mg/L TDS). *Needs individual ions — we lack them.*
- **Particulate:** **SDI** via ASTM D4189 (0.45 µm, 30 psi); FilmTec guide SDI₁₅ ≤ 5, < 3 recommended.
  → **ASTM D4189 withdrawn 2023** (last D4189-07(2014)); we have turbidity, not SDI.
- **Biofouling:** AOC/TOC nutrient-limited biofilm. Flemming (1997) *Exp. Therm. Fluid Sci.* 14(4):382–391
  (DOI 10.1016/S0894-1777(96)00140-9); Weinrich et al. (2016) *Water Research* 101:203–213
  (DOI 10.1016/j.watres.2016.05.075); Hoek et al. (2022) *npj Clean Water* 5:45 (DOI 10.1038/s41545-022-00183-0).
- **Oxidative damage:** polyamide free-chlorine tolerance **< 0.1 ppm**; degradation **200–1,000 ppm·h**;
  signature = flux loss then **flux + salt-passage rise** (FilmTec). *total ≠ free chlorine → upper bound.*

## Pillar 3 — Symptom → cause diagnostic mapping (the backbone)
**FilmTec Table 44** and **Hydranautics TSB107.28 Table 1** (both extracted verbatim) agree:

| Fingerprint (ΔP / salt-passage / location) | Attributed cause |
|---|---|
| ΔP↑ + salt-passage↑, **TAIL** stage | **Scaling** (mineral) / silica |
| ΔP↑ **rapid**, salt slight↑, **LEAD** stage | **Particulate/colloidal** (rapid+salt↑ → metal-oxide Fe/Mn) |
| ΔP↑, salt-passage ~unchanged, any/lead | **Biofouling** |
| flux↓, little ΔP/salt change, all stages | **Organic** (NOM) |
| salt-passage/flux **UP**, ΔP **flat/↓** | **Oxidation** (Cl₂) or mechanical leak |

Also cited: ASTM D4194; Wes Byrne (Ed.), *Reverse Osmosis — A Practical Guide for Industrial Users*,
2nd Ed., Tall Oaks, 2002, Ch. 7.

## Pillar 4 — Normalization standard (what our physics residual operationalizes)
**ASTM D4516-19a** *Standard Practice for Standardizing RO Performance Data* — removes
feed-pressure/temperature/osmotic/recovery confounds so the residual reflects membrane change.
DuPont FilmTec Plant Performance Normalization Manual, Form 45-D01616-en. **Our WaterTAP
"observed − predicted" residual plays exactly D4516's role** — cite it as the standard basis.

## Pillar 5 — Source apportionment statistics (supporting layer)
Receptor models X ≈ G·F + E: **US EPA PMF 5.0** (EPA/600/R-14/108, 2014) — applies to "air, water,
sediment"; Zanotti et al. (2019) *Water Research* 159:122–134 (DOI 10.1016/j.watres.2019.04.058) PMF
for water-quality source apportionment. **Caveat:** fouling ΔP is not conserved additive mass →
heuristic apportionment, not strict CMB; use as supporting layer over the physics residual.

---

## Honest feasibility verdict (drives the prototype's confidence labels)
**Defensible attribution:** (1) **Oxidation** — matched signals (∫Cl₂ ppm·h vs 200–1,000 envelope +
the unique inverse signature: salt-passage↑ while ΔP flat/↓); nearly confirmable. (2) **Scaling vs
colloidal LOCATION split** — stage-wise flux places rise at tail (scaling) vs lead (colloidal).

**Weakly inferable (propensity only):** scaling propensity (high TDS+pH+recovery, no ion speciation),
biofouling propensity (TOC↑ + low Cl₂, but TOC can't separate bio from organic), particulate
(turbidity ≠ SDI).

**Cannot distinguish:** specific scale species; Fe/Mn vs generic colloidal; biofouling vs organic
NOM; mechanical leak vs oxidation. → report these as **propensity flags with stated data gaps**,
never confident attributions.

**Gaps to close for higher confidence:** individual ion analysis (scaling speciation), SDI
(particulate), AOC/ATP or biofilm monitor (biofouling confirmation).
