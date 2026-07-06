# Plan: Feature 008 — Visual Operations Twin (UI)

**Spec:** `specs/008-visual-twin-ui/spec.md`  
**Doc brief:** `docs/10-frontend-visual-twin.md`  
**Branch:** `008-visual-twin-ui`  
**Status:** Approved — proceeding to `speckit-tasks` then `speckit-taskstoissues`

## User Decisions (Resolved)

| Q | Decision |
|---|---|
| Q1 — Equipment layout | **B** — Equipment strip below the `ro-plant.png` scene (matches Figma reference) |
| Q2 — Default panel state | **A** — Fleet health summary (total alerts, bank distribution) shown when no unit is selected |
| Q3 — AI assistant stub | **A** — Show input UI with "Connecting to diagnostics backend…" state, wired for Gemini Agent Enterprise Runtime / A2UI compatibility |
| Q4 — File renames | **Yes** — `hp-feed-pump.png.png` → `hp-feed-pump.png`, `CIP skid.png` → `cip-skid.png` |

---

## Background & Framing

The Visual Operations Twin is the user-facing cockpit for the OCWD BWRO digital twin. It is a **frontend-only deliverable at this stage** — the backend (Features 002–007) is being built in parallel by a collaborator and is not yet in this codebase. Every upstream data dependency is therefore **stubbed with typed, realistic mock data** today, and replaced with real API calls when the backend integration spec lands.

The frontend lives at `services/frontend` (a standalone Next.js 15 app). It does **not** share a process with the backend. The serving model is: Next.js App Router → API routes (proxying to Cloud Run later) → BigQuery serving views (stub today).

---

## Design System Tokens (locked before implementation)

| Token | Value | Notes |
|---|---|---|
| Font | `Manrope` (Google Fonts) | Variable font, weights 400/500/600/700 |
| Canvas | `#F7F6F3` | Warm off-white page background |
| Surface | `#FFFFFF` | Card background |
| Border | `1px solid #EAEAEA` | All card/divider borders |
| Off-Black | `#111111` | Primary text |
| Mid-Gray | `#787774` | Secondary / meta text |
| Accent | `#1465C4` | Primary brand blue |
| Accent hover | `#1050A0` | Button hover state |
| Status Healthy | `#22C55E` | Score < 33 |
| Status Watch | `#F59E0B` | 33 ≤ score < 66 |
| Status Alert | `#EF4444` | Score ≥ 66 |
| Status Unknown | `#A1A1AA` | No data for this moment |
| Radius | `8px` cards, `4px` badges | Crisp — not pill |
| Shadow | `0 1px 4px rgba(0,0,0,0.04)` | Barely visible |

**Motion Dials:** Creativity 5 / Density 5 / Motion Intensity 4  
Subtle mount animations (`translateY(10px) + opacity:0` → `600ms cubic-bezier(0.16,1,0.3,1)`), hover lift on sprites, replay clock number morph, status badge color transition `400ms`.

---

## Architecture Decisions

### Framework & Location
- **Next.js 15** (App Router, TypeScript strict)
- Location: `services/frontend/`
- Styling: **Tailwind CSS v4** (custom tokens above) + **shadcn/ui v2**
- Scene: CSS absolute-positioned sprites over isometric backdrop (no WebGL/Canvas)

### Data Access (stub-first, swap-ready)
```
services/frontend/
  lib/
    types/             ← TypeScript interfaces (contracts)
    data/
      mock-fleet.ts    ← 21-unit stub health scores
      mock-timeline.ts ← replay date range + 3 snapshot waypoints
      mock-inspection.ts ← per-unit detail stub
      mock-alerts.ts   ← active alerts stub
    api/
      fleet.ts         ← will proxy to BQ serving view
      timeline.ts
      inspection.ts
      alerts.ts
```

### Routing (4 tabs)
```
/twin         → Digital Twin scene (primary — fully implemented)
/simulation   → Physical Simulation (stub layout)
/industry     → Industry Engine (stub layout)
/cloud-data   → Cloud Data explorer (stub layout)
```

---

## Component Inventory

### shadcn/ui Components to Install
`Badge`, `Card` + sub-parts, `Sheet`, `Tooltip`, `Slider`, `Tabs`, `Skeleton`, `Alert`, `Separator`, `Button`

### AI Assistant Compatibility (Q3-A)
The `AIAssistantPanel` stub is architected for drop-in connection to:
- **Gemini Agent Enterprise Runtime** (ADK 2.0, Feature 007): REST/SSE via Cloud Run endpoint
- **A2UI** (Agent-to-UI protocol): if adopted, the panel's message contract is identical — a streaming `{ role, content, evidence?, sourceTrace? }` shape that both transports satisfy

The stub renders the full chat UI shell (input, send button, message list area) with a `BackendStatus` banner showing "Connecting to diagnostics backend…" The connection URL is read from `NEXT_PUBLIC_AGENT_ENDPOINT` env var — empty in dev (stub mode), populated in cloud deployment.

### Custom Domain Components
| Component | File | Description |
|---|---|---|
| `PlantScene` | `components/plant/PlantScene.tsx` | 2.5D scene container, isometric layout |
| `EquipmentSprite` | `components/plant/EquipmentSprite.tsx` | Image + status overlay + interactions |
| `StatusBadge` | `components/plant/StatusBadge.tsx` | Color + label from `scoreToStatus()` |
| `HoverSummaryCard` | `components/plant/HoverSummaryCard.tsx` | Quick KPI summary on hover |
| `InspectionPanel` | `components/inspection/InspectionPanel.tsx` | Right-panel / Sheet with unit detail |
| `EvidenceFigure` | `components/inspection/EvidenceFigure.tsx` | Value + evidence label, never bare |
| `AIAssistantPanel` | `components/assistant/AIAssistantPanel.tsx` | Stub chat panel (pre-scoped) |
| `ReplayClock` | `components/timeline/ReplayClock.tsx` | Always visible, labeled "REPLAY" |
| `TimelineScrubber` | `components/timeline/TimelineScrubber.tsx` | Slider over OCWD date range |
| `FleetGrid` | `components/charts/FleetGrid.tsx` | 7×3 heatmap (Recharts) |
| `FluxTrendChart` | `components/inspection/FluxTrendChart.tsx` | Stage-3 flux vs baseline |
| `BreakevenChart` | `components/charts/BreakevenChart.tsx` | Clean-now-or-wait crossover |
| `NavHeader` | `components/layout/NavHeader.tsx` | 4-tab top navigation |
| `AlertsFeed` | `components/alerts/AlertsFeed.tsx` | Active alerts list + severity |

---

## TypeScript Data Contracts

### `UnitHealth` (drives all visual state)
```typescript
interface UnitHealth {
  unitId: string;        // "bank_f_stage_01"
  bankId: string;        // "A"|"B"|"C"|"D"|"E"|"F"|"G"
  stage: 1 | 2 | 3;
  score: number | null;  // 0–100; null = unknown
  status: "healthy" | "watch" | "alert" | "unknown";
  scoreSource: "measured" | "modeled";
  dss: number;           // days since last CIP
  replayDate: string;    // ISO — "as of"
}
```

### `scoreToStatus()` — single source of truth
```typescript
function scoreToStatus(score: number | null): UnitHealth["status"] {
  if (score === null) return "unknown";
  if (score < 33)    return "healthy";
  if (score < 66)    return "watch";
  return "alert";
}
// Boundary: score=33 → "watch", score=66 → "alert". Deterministic everywhere.
```

### `UnitHoverSummary` (hover card)
```typescript
interface UnitHoverSummary extends UnitHealth {
  stage3FluxPct: number;   // % below clean baseline
  recoveryPct: number;     // vs 85% setpoint
  lastCipDate: string;
  stage3FluxSource: "measured" | "modeled";
}
```

### `UnitInspection` (inspection panel)
```typescript
interface UnitInspection {
  unitId: string;
  replayDate: string;
  health: UnitHealth;
  trends: FluxTrendPoint[];
  alerts: AlertItem[];
  economics: EconomicsBlock | null;  // null while Feature 006 not connected
}

interface EconomicsBlock {
  energyPenaltyDollarDay: number;
  cipCostDollar: number;
  breakevenDays: number;
  label: "measured" | "modeled";
  assumptions: string[];
  uncertaintyCaveat: string;
}
```

### `ReplayState` (global context)
```typescript
interface ReplayState {
  currentDate: string;
  minDate: "2019-01-01";
  maxDate: "2021-01-13";
  isPlaying: boolean;
  label: "REPLAY";   // hardcoded — never "LIVE"
}
```

---

## Backend Stub Strategy

Stubs are seeded from real OCWD facts (21 units, 7 banks, 3 stages, date range 2019–2021). Three waypoints cover key scenarios:
- **2020-01-15** — fleet largely healthy
- **2020-06-15** — Bank F degrading (alert), others watch/healthy
- **2020-11-01** — multiple units alerting (edge case: many alerts)

All stubs export the same interfaces the real API layer will satisfy. Swap = one-file change per domain.

**Honesty rule for stubs:** Any stub figure that violates FR-015 (bare number without evidence) is replaced with a "Data source not yet connected" empty state. No fabricated numbers presented as real.

---

## Asset Inventory

### Tier 1 — Ready
| Asset | Path | Notes |
|---|---|---|
| Plant overview | `public/assets/equipment/ro-plant.png` | Main scene background |
| RO Membrane Rack | `public/assets/equipment/ro-membrane-rack.png` | Color TBD by user |
| HP Feed Pump | `public/assets/equipment/hp-feed-pump.png.png` | Will rename to `hp-feed-pump.png` |
| CIP Skid | `public/assets/equipment/CIP skid.png` | Will normalize filename |
| ERD | `public/assets/equipment/erd.png` | Ready |

### Tier 2 — Placeholder divs (dashed border + icon)
`antiscalant-skid`, `media-filter`, `permeate-tank`, `brine-outfall`

---

## Scene Layout

Based on Figma prototype (2-column: scene left + panel right) + Alibaba Digital Twin reference:

```
┌──────────────────────────────────────────────────────────────┐
│  NAV: Digital Twin | Physical Simulation | Industry Engine | Cloud Data  │
├──────────────────────────────────────────────────────────────┤
│  REPLAY BAR: ◄◄  2020-06-15  [REPLAY]  ►  ────────────────  │
├──────────────────────────────────┬───────────────────────────┤
│                                  │                           │
│   PLANT SCENE (left ~65%)        │  INSPECTION PANEL (~35%) │
│   ┌──────────────────────────┐   │  [Select a unit to       │
│   │  ro-plant.png backdrop   │   │   inspect]               │
│   │  + equipment strip below │   │                          │
│   └──────────────────────────┘   │  OR (after click):       │
│                                  │  • Unit detail            │
│   EQUIPMENT STRIP:               │  • Trends + evidence     │
│   [Mem Rack][HP Pump][CIP][ERD]  │  • AI Assistant (stub)   │
│    (each with status badge)      │                          │
├──────────────────────────────────┴───────────────────────────┤
│  CHART CARDS (3 expandable):                                  │
│  [Fleet Fouling Grid 7×3] [Stage-3 Flux] [Break-Even]        │
└──────────────────────────────────────────────────────────────┘
```

On viewport < 1280px: inspection panel becomes a shadcn `Sheet` (slide-in from right).

---

## What Is Buildable Now vs. Blocked on Backend

| Feature | Buildable Now | Blocked On |
|---|---|---|
| Scene rendering + sprites | ✅ | — |
| Status badges + health colors | ✅ | — |
| Hover KPI cards | ✅ | — |
| Timeline scrubber + replay clock | ✅ | — |
| Fleet fouling grid (7×3) | ✅ | — |
| Stage-3 flux chart | ✅ | — |
| Break-even chart | ✅ | — |
| Alerts feed | ✅ | — |
| Inspection panel layout | ✅ | — |
| AI assistant panel (stub) | ✅ stub | Feature 007 (ADK) |
| LCOW economics figures | ✅ "not yet validated" | Feature 006 |
| Forecast charts | ✅ placeholder | Feature 004 |
| Real health scores | ❌ | Feature 003 |
| Live replay stream | ❌ | Feature 002 |
| Real ADK agent responses | ❌ | Feature 007 |

---

## Phased Implementation Plan

### Phase A — Foundation
1. Scaffold `services/frontend` (Next.js 15, TS strict, Tailwind v4, shadcn init)
2. Install Manrope font, set design token CSS vars
3. Set up routing + `NavHeader` + root layout
4. Create all TypeScript contracts (`lib/types/`)
5. Create all mock stubs (`lib/data/mock-*.ts`)
6. Implement `scoreToStatus()` utility + unit tests

### Phase B — Plant Scene
1. Build `PlantScene` (fixed-aspect container)
2. Build `EquipmentSprite` (image + status badge overlay + handlers)
3. Place Tier 1 sprites in equipment strip with status badges
4. Place Tier 2 sprites as placeholder divs
5. Build `HoverCard` (Tooltip-based KPI summary)
6. Wire all 21 units to mock fleet data

### Phase C — Timeline & Replay
1. Build `ReplayClock` (always "REPLAY", never "LIVE")
2. Build `TimelineScrubber` (Slider over OCWD range)
3. Wire scrubber → fleet state → scene re-render (React Context)
4. FR-012 compliance check at all states

### Phase D — Inspection & Evidence
1. Build `InspectionPanel` (column + Sheet variants)
2. Build `EvidenceFigure` ("not yet validated" state)
3. Wire click → open panel scoped to that unit
4. FR-009 compliance: switching units clears stale content
5. Build `AIAssistantPanel` stub

### Phase E — Charts
1. `FleetGrid` (7×3 heatmap, Recharts, same `scoreToStatus()` colors)
2. `FluxChart` (line + CIP event markers)
3. `BreakevenChart` (crossover line)
4. `AlertsFeed`

### Phase F — Polish & Stub Pages
1. Apply minimalist-ui motion (scroll entry, hover lift, badge transitions)
2. Build `/simulation`, `/industry`, `/cloud-data` stub layouts
3. Accessibility: ARIA labels on scene elements
4. Final FR compliance sweep (FR-004, FR-015, FR-019, FR-020)

---

## Decisions Resolved ✅

All open questions answered by user. See the Decisions table at the top of this document.

---

## Constitution Check

| Principle | Check |
|---|---|
| BigQuery as primary AI compute | ✅ No custom ML — charts from BQ serving views (stub today) |
| Evidence over assertion / no bare numbers | ✅ `EvidenceFigure` enforces FR-015/FR-018 |
| Measured-vs-modeled honesty | ✅ `scoreSource` on every figure |
| Honest twin maturity | ✅ Clock always "REPLAY", FR-012/FR-014 enforced |
| Advise-only | ✅ Assistant is read-only, no plant actuation |
| No hallucinated numbers | ✅ Stubs labeled as stubs; unvalidated = "not yet validated" |

---

## Verification Plan

### Automated
- TypeScript strict build
- `scoreToStatus()` unit tests: boundary values 32/33/65/66
- Storybook stories for `StatusBadge`, `EvidenceFigure`, `HoverCard`

### Manual
1. Scene renders all 21 units, none as a table (FR-001)
2. Move scrubber → colors update deterministically (FR-006)
3. Bank F score=72 → alert everywhere color appears (FR-004, SC-002)
4. Click unit → inspection panel opens for that unit (FR-008)
5. Switch unit → no stale content (FR-009, SC-004)
6. Clock always shows "REPLAY" across all states (FR-012, SC-006)
7. No bare figures visible anywhere (FR-015, SC-008)
8. Unknown unit (no data) → distinct non-green state (FR-019)
