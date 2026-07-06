#!/bin/bash
# speckit-taskstoissues for Feature 008 — Visual Operations Twin (UI)
# Creates 70 GitHub issues from tasks.md
# Repo: abdullahabtahi/water-infrastructure-reverse-osmosis-digital-twin

REPO="Oceanus-Lab/water-infrastructure-reverse-osmosis-digital-twin"
FEATURE="008-visual-twin-ui"

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" 2>&1
  sleep 0.3
}

BODY_SETUP="**Feature**: $FEATURE | **Phase**: Setup\n\nPart of the speckit-tasks plan for Feature 008 — Visual Operations Twin (UI).\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_FOUNDATION="**Feature**: $FEATURE | **Phase**: Foundational\n\n⚠️ CRITICAL: Must complete before any user story work begins.\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US1="**Feature**: $FEATURE | **Phase**: US1 — Spatial Plant Health View (P1 MVP)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US2="**Feature**: $FEATURE | **Phase**: US2 — Data-to-Visual Contract (P1)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US3="**Feature**: $FEATURE | **Phase**: US3 — Hover Summary + Click Inspection (P1)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US4="**Feature**: $FEATURE | **Phase**: US4 — AI Assistant Panel (P1)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US5="**Feature**: $FEATURE | **Phase**: US5 — Replay Clock & Timeline (P1)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_US6="**Feature**: $FEATURE | **Phase**: US6 — Evidence-First Figures (P1)\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"
BODY_POLISH="**Feature**: $FEATURE | **Phase**: Polish & Cross-Cutting\n\nSee: \`specs/008-visual-twin-ui/tasks.md\`"

echo "=== Phase 1: Setup ==="
create_issue "T001: Initialize Next.js 15 app in services/frontend/" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T002: Install and configure shadcn/ui v2 with New York style" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T003: Install Manrope font via next/font/google in app/layout.tsx" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T004: Configure Tailwind v4 design tokens in app/globals.css" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T005: Install shadcn components: badge card sheet tooltip slider tabs skeleton alert separator button" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T006: Install Recharts for chart components" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T007: Install Zustand for global replay state" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T008: Create root app layout with Manrope font and NavHeader slot" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T009: Set up route structure for /twin /simulation /industry /cloud-data" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"
create_issue "T010: Create .env.local.example with NEXT_PUBLIC_AGENT_ENDPOINT=" "$BODY_SETUP" "feature:008-visual-twin-ui,phase:setup,frontend"

echo "=== Phase 2: Foundational ==="
create_issue "T011: Create TypeScript interfaces in lib/types/index.ts (UnitHealth, ReplayState, AlertItem, etc.)" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T012: Implement scoreToStatus() utility in lib/utils/health.ts" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T013: Create mock fleet stub lib/data/mock-fleet.ts with all 21 OCWD units at 3 waypoints" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T014: Create mock timeline stub lib/data/mock-timeline.ts with OCWD date range" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T015: Create mock inspection stub lib/data/mock-inspection.ts with per-unit UnitInspection data" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T016: Create mock alerts stub lib/data/mock-alerts.ts" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T017: Create API shim stubs lib/api/fleet.ts timeline.ts inspection.ts alerts.ts" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T018: Create Zustand replay store lib/store/replay-store.ts with ReplayState" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T019: Build NavHeader component with 4 shadcn Tabs and accent indicator" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"
create_issue "T020: Build StatusBadge component consuming scoreToStatus() with evidence source label" "$BODY_FOUNDATION" "feature:008-visual-twin-ui,phase:foundational,frontend"

echo "=== Phase 3: US1 — Scene ==="
create_issue "T021: Build PlantScene container with ro-plant.png backdrop and equipment strip" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T022: Build EquipmentSprite component with image StatusBadge overlay and event handlers" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T023: Create Tier-2 SpritePlaceholder component with dashed border and StatusBadge" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T024: Compose equipment strip in PlantScene with 4 Tier-1 and 4 Tier-2 sprites" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T025: Wire PlantScene to mock fleet data — 21 units with correct scoreToStatus() colors" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T026: Apply scroll-entry animation to PlantScene and equipment strip" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T027: Add hover lift micro-animation to EquipmentSprite (scale + shadow)" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T028: Compose app/twin/page.tsx with ReplayClock TimelineScrubber PlantScene and chart cards" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"
create_issue "T029: Add ARIA labels to all EquipmentSprite instances" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1,accessibility"
create_issue "T030: Build stub /simulation /industry /cloud-data pages with Not-yet-available Alert" "$BODY_US1" "feature:008-visual-twin-ui,user-story:US1,frontend,P1"

echo "=== Phase 4: US2 — Contract ==="
create_issue "T031: Build FleetGrid component — 7x3 Recharts heatmap colored by scoreToStatus()" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1"
create_issue "T032: Add per-cell tooltip to FleetGrid showing unit ID score status and scoreSource" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1"
create_issue "T033: Build AlertsFeed component with severity-colored borders and evidence string" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1"
create_issue "T034: Build FleetSummaryPanel as default inspection panel state (Q2-A)" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1"
create_issue "T035: Enforce scoreToStatus() as single import in StatusBadge FleetGrid AlertsFeed FleetSummaryPanel" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1"
create_issue "T036: Write unit tests for scoreToStatus() with boundary values 0 32 33 65 66 100 null" "$BODY_US2" "feature:008-visual-twin-ui,user-story:US2,frontend,P1,test"

echo "=== Phase 5: US3 — Hover/Click ==="
create_issue "T037: Build HoverSummaryCard using shadcn Tooltip — KPI summary without navigation" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T038: Wrap EquipmentSprite with HoverSummaryCard tooltip trigger" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T039: Build InspectionPanel with right-column and Sheet variants" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T040: Build EvidenceFigure component — value with source badge never bare number" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T041: Build UnitDetailSection using EvidenceFigure for all metrics" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T042: Build FluxTrendChart Recharts LineChart with baseline and CIP event markers" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T043: Wire EquipmentSprite click to Zustand store — InspectionPanel clears on unit switch (FR-009)" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"
create_issue "T044: Apply staggered reveal animation to InspectionPanel content blocks" "$BODY_US3" "feature:008-visual-twin-ui,user-story:US3,frontend,P1"

echo "=== Phase 6: US4 — AI Assistant ==="
create_issue "T045: Build AIAssistantPanel with message list input BackendStatus — compatible with Gemini Agent Enterprise Runtime and A2UI" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T046: Build BackendStatus banner using shadcn Alert — stub/connected states from env var" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T047: Define AgentMessage type in lib/types/index.ts — compatible with SSE and A2UI streaming shape" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T048: Implement useAgentSession hook — stub mode when env var empty, SSE when set" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T049: Wire unit context into AIAssistantPanel — inject pre-scope message on mount (FR-010)" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T050: Display evidence and sourceTrace fields in assistant messages — honest non-answers verbatim (FR-011)" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"
create_issue "T051: Add Ask AI CTA button to InspectionPanel opening AIAssistantPanel" "$BODY_US4" "feature:008-visual-twin-ui,user-story:US4,frontend,P1,ai-agent"

echo "=== Phase 7: US5 — Replay ==="
create_issue "T052: Build ReplayClock component — date display with prominent REPLAY badge never LIVE (FR-012)" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay"
create_issue "T053: Build TimelineScrubber using shadcn Slider over OCWD date range 2019-01-01 to 2021-01-13" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay"
create_issue "T054: Wire TimelineScrubber to Zustand store to fleet API to PlantScene re-render" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay"
create_issue "T055: Add play/pause button to ReplayBar composing ReplayClock and TimelineScrubber" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay"
create_issue "T056: FR-014 audit — replace now/current/live/real-time wording with replay-accurate phrasing" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay,compliance"
create_issue "T057: Handle FR-019 — null score renders StatusBadge unknown state never defaults to green" "$BODY_US5" "feature:008-visual-twin-ui,user-story:US5,frontend,P1,replay,compliance"

echo "=== Phase 8: US6 — Evidence ==="
create_issue "T058: Audit all number displays — replace any raw span number with EvidenceFigure" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"
create_issue "T059: Build BreakevenChart with crossover line and modeled assumptions caption" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"
create_issue "T060: Build ForecastPlaceholder — greyed chart with not-yet-validated overlay (FR-017)" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"
create_issue "T061: Implement EvidenceFigure not-yet-validated state — no numeric value shown (FR-017 FR-018)" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"
create_issue "T062: Add economics caveat banner to InspectionPanel — modeled ±20% label per Principle IV" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"
create_issue "T063: Compose 3 chart cards in twin/page.tsx — FleetGrid FluxTrendChart BreakevenChart" "$BODY_US6" "feature:008-visual-twin-ui,user-story:US6,frontend,P1,evidence"

echo "=== Phase 9: Polish ==="
create_issue "T064: FR-020 — test 7 simultaneous alert units in FleetGrid and AlertsFeed for legibility" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,frontend,compliance"
create_issue "T065: Responsive layout — InspectionPanel as Sheet below 1280px right-column above" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,frontend"
create_issue "T066: Accessibility audit — role=button aria-labels focus rings on all interactive elements" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,frontend,accessibility"
create_issue "T067: FR compliance sweep FR-001 to FR-020 at 3 waypoints — document in checklists/fr-compliance.md" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,frontend,compliance"
create_issue "T068: Update docs/10-frontend-visual-twin.md — equipment strip layout and NEXT_PUBLIC_AGENT_ENDPOINT" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,documentation"
create_issue "T069: Write specs/008-visual-twin-ui/quickstart.md — prerequisites npm run dev 3 manual test scenarios" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,documentation"
create_issue "T070: Verify npm run build — zero TypeScript strict errors before feature complete" "$BODY_POLISH" "feature:008-visual-twin-ui,phase:polish,frontend"

echo "=== DONE: 70 issues created ==="
