# rice-flow — Claude Code Project Instructions

## Project Identity
- **App Name:** rice-flow (GeoRice Advisor)
- **Purpose:** GIS-based mobile application for optimal rice variety recommendation and planting guidance in Philippine farmlands.
- **Target Users:** Filipino rice farmers, especially smallholder farmers in rural/agricultural settings.
- **Stack:** React Native, TypeScript, Expo, React Navigation

---

## Absolute Rules — Read Before Anything

- **Design only.** Do NOT add backend logic.
- **No API integration.** Do NOT add live API calls.
- **No database functions.** Do NOT connect to any database.
- **No authentication logic.** Auth flow is UI/static only.
- **No recommendation formulas.** Scoring is visual/static only.
- **No working map/GPS/weather functions.** Use placeholder cards.
- **Use mock data only.** All content comes from `src/data/mockData.ts`.
- **Focus on:** clean mobile UI screens, components, layout, visual hierarchy, navigation.
- **Do NOT remove** any existing module, screen, or data field.

---

## App Modules — Keep All Intact

1. **GIS Location Mapper** — farm pinning and location profiling
2. **Environmental Scanner** — soil type, rainfall, elevation, flood risk inputs
3. **Rice Variety Recommendation** — top 3 matches with suitability scores
4. **Localized Planting Guide** — planting schedule, fertilizer, pest prevention
5. **Progress Dashboard** — yield tracking, adoption monitoring, farm cycle progress

---

## System Workflow (UI Flow Reference)

```
Welcome → Login → Home Dashboard
→ Pin Farm (GIS)
→ Environmental Scan
→ Recommendation Results (Top 3 Varieties)
→ Variety Detail
→ Planting Guide
→ Farm Cycle
→ Progress Dashboard → Progress Log
→ Yield Record
→ Profile / Settings
```

---

## Core Data Areas (from ERD — UI Reference Only)

- User
- Farm
- Environmental Scan
- Rice Variety
- Variety Rule
- Recommendation
- Planting Guide
- Guide Step
- Farm Cycle
- Progress Log
- Yield Record

---

## Design Goal

Modernize the UI so it looks like a clean, high-quality 2026 mobile app while still being practical for Filipino rice farmers.

### Design Direction — Make the app feel:
- modern, minimal, soft, clean, premium
- trustworthy, nature-inspired, mobile-first
- highly readable — NOT overly corporate or futuristic
- practical for real field use

---

## Design System

### Color Palette
Use `src/theme/colors.ts`. Palette is nature-inspired:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1F6B3F` | Deep forest green — brand, CTAs |
| `primaryLight` | `#3D9D5E` | Fresh leaf green |
| `primaryLighter` | `#E8F5E9` | Soft green tint backgrounds |
| `primaryDark` | `#0F4C28` | Emphasis, dark headings |
| `secondary` | `#D4A574` | Warm earth brown |
| `secondaryLight` | `#EBD9C3` | Soft beige |
| `tertiary` / `sky` | `#87CEEB` | Serene sky blue |
| `harvestGold` | `#F9A825` | Rice harvest gold |
| `background` | `#FAFAF8` | Warm off-white |
| `surface` | `#FFFFFF` | Card surfaces |
| `surfaceAlt` | `#F5F5F3` | Soft gray surfaces |
| `text` | `#1A1A1A` | Primary text |
| `textSecondary` | `#616161` | Secondary text |
| `textTertiary` | `#9E9E9E` | Helper/muted text |

**Avoid:** neon colors, overly dark heavy UI, harsh contrasts.

### Typography — `src/theme/typography.ts`
- Display (36px/700) — Large welcoming headlines
- h1–h2 (32–28px/700) — Page/section titles
- h3–h4 (24–20px/700) — Card titles
- h5–h6 (18–16px/600) — Section headers
- body1 (16px/400) — Primary body text
- body2 (14px/400) — Secondary text
- caption (12px/400) — Helper text, labels
- button (16px/600) — CTA text

### Spacing — `src/theme/spacing.ts`
- xs: 4 | sm: 8 | md: 12 | lg: 16 | xl: 24 | 2xl: 32 | 3xl: 40 | 4xl: 48

### Border Radius — `src/theme/spacing.ts` (radius)
- Cards: `xl` (20px) to `2xl` (24px)
- Inputs: `lg` (16px)
- Chips/Pills: `full` (9999px)
- Buttons: `lg` (16px)

### Shadows — `src/theme/shadows.ts`
- Cards: `md` or `lg`
- Inputs (focused): `xs`
- Modals: `xl`

---

## Visual Style Rules

### Card Design
- Soft layered cards with `borderRadius: 20–28`
- Subtle shadows (`shadows.md` for cards, `shadows.lg` for featured)
- White or warm surface backgrounds
- Generous internal padding (`spacing.lg` to `spacing.xl`)
- Avoid harsh borders — use `borderColor: colors.borderLight`

### Buttons — CTA Style
- Primary: filled green (`colors.primary`), height 56, radius `lg`
- Secondary: outlined with `borderColor: colors.primary`
- Small: height 40, same radius
- Always use `shadows.sm` on primary buttons

### Inputs
- `borderRadius: radius.lg` (16px)
- `borderColor: colors.border`
- `minHeight: 52`
- Focused: `borderColor: colors.primary` + `shadows.xs`

### Chips & Badges
- Chips: `borderRadius: radius.full`, soft backgrounds
- Active chip: `backgroundColor: colors.primaryLighter`, `borderColor: colors.primary`
- Status badges: soft background + colored text (NOT solid dark colors)
  - success: bg `#E8F5E9`, text `#2E7D32`
  - warning: bg `#FFF3E0`, text `#E65100`
  - error: bg `#FFEBEE`, text `#C62828`
  - info: bg `#E3F2FD`, text `#1565C0`

### Section Headers
- Bold title (`typography.h5`, weight 700)
- Optional soft subtitle (`typography.body2`, `colors.textSecondary`)
- Spacing above: `spacing.xl`

---

## Screen-Specific Design Rules

### Home Dashboard
- Hero greeting section with mascot image (`assets/images/flow-mascot.png`)
- 3-column stat cards row (Total Farms, Active Cycle, Latest Yield)
- Quick action 2x3 grid with image icons
- Featured farm cycle summary card (prominent, with StatusBadge for crop stage)
- Top recommendation preview card
- Your Farms list (1 entry per farm, no duplicates)

### GIS Farm Pinning
- Large map placeholder card (min-height 300, `colors.sky + '20'` background)
- Modern search bar with GPS button (use `radius.xl` on inputs)
- Farm profile card showing all farm data fields
- Highlight/lowland badge (`StatusBadge`)
- Farm list items: `radius.xl`, selected = `borderColor: colors.primary`

### Environmental Scanner
- Group fields into section cards (Soil, Rainfall, Elevation, Flood Risk)
- Select chips use `borderRadius: radius.full`
- Completion progress card: show progress bar + percentage
- Risk badges: use soft color system (Low / Moderate / High)
- Summary panel at bottom before CTA button

### Recommendation Results
- Filter chips row (scrollable horizontal)
- "Why This Fits" card with `borderLeftWidth: 5, borderLeftColor: colors.primary`
- Top 3 variety cards — rank #1 should have gold accent (`colors.harvestGold`)
- Score display: large bold text for suitability % and RSI
- Comparison card: clean 3-column layout with variety names as headers
- Variety selector: secondary buttons for each variety

### Planting Guide
- Guide header card: `backgroundColor: colors.primary + '15'`, left accent border
- Horizontal scrollable tab pills (All / Planting / Fertilizer / Pest / Irrigation)
- Each step as a card with numbered circle badge + title + day label
- Progress bar at top showing completed steps

### Progress Dashboard
- 3 tabs: Overview / Logs / Trends
- Crop development timeline with dot markers (done=green, active=primary, pending=gray)
- Issue log cards with left border accent (`colors.warning` for issues)
- Trend charts as polished placeholder containers
- Health assessment cards with StatusBadges

### Yield Record
- Inputs styled consistently (`radius.lg`, `borderColor: colors.border`)
- Harvest summary card: gold left accent (`colors.harvestGold`)
- 3-column metrics grid (Area / Yield / RSI)
- Seasonal trend placeholder chart container
- Performance comparison card

### Profile / Settings
- Profile card: avatar circle + name + email + role
- Location info in grouped card
- Farm cards: simple list with name + location
- Notification toggles with `Switch` component
- Menu items: icon + label + arrow
- Clean dividers between sections

---

## Navigation Structure

```
Root Navigator
├── Auth Navigator
│   ├── Welcome Screen
│   └── Login Screen
└── App Navigator (Bottom Tabs)
    ├── Home Tab → HomeStack
    │   ├── HomeDashboard
    │   ├── GISFarmPinning
    │   ├── EnvironmentalScanner
    │   ├── RecommendationResults
    │   └── VarietyDetail
    ├── Guide Tab → PlantingStack
    │   └── PlantingGuide
    ├── Progress Tab → ProgressStack
    │   ├── ProgressDashboard
    │   ├── ProgressLog
    │   └── YieldRecord
    └── Profile Tab → ProfileStack
        └── Profile
```

### Bottom Tab Bar Style
- `backgroundColor: colors.white`
- `borderTopColor: colors.borderLight`, `borderTopWidth: 1`
- `height: 72`, `paddingBottom: 10`
- Active tint: `colors.primary`
- Inactive tint: `colors.textTertiary`
- Label: `fontSize: 11`, `fontWeight: '600'`
- Icon: 28×28, opacity 1.0 (active) / 0.5 (inactive)

---

## Reusable Components — `src/components/`

| Component | Purpose |
|-----------|---------|
| `AppHeader` | Screen header with logo/title/subtitle |
| `SectionTitle` | Bold section label + optional subtitle |
| `Button` | Primary/Secondary/Outline/Ghost CTA |
| `StatCard` | Metric card with label + large value + unit |
| `RecommendationCard` | Variety rank card with scores |
| `MapPreviewCard` | GIS map placeholder container |
| `FarmInfoCard` | Farm detail card (name, coords, area) |
| `GuideStepCard` | Step card with number badge + instruction |
| `YieldSummaryCard` | Harvest result summary card |
| `StatusBadge` | Soft-color badge (success/warning/error/info) |
| `InfoChip` | Label-value chip row |
| `EmptyStateCard` | Empty state placeholder |
| `Card` | Generic card wrapper |
| `ScreenWrapper` | Screen layout wrapper |

---

## Mock Data — `src/data/mockData.ts`

Always use mock data from this file. Do NOT generate hardcoded data inline in screens. Reference:
- `mockUser` — 1 user profile
- `mockFarms` — 2 farms (lowland + highland)
- `mockRecommendations` — top 3 rice varieties
- `mockPlantingGuides` — 1 guide with steps
- `mockFarmCycles` — 1 active farm cycle
- `mockProgressLogs` — several field log entries
- `mockYieldRecords` — 1 harvest record
- `mockDashboardSummary` — summary stats for home

---

## DO NOT Remove These Data Fields

- suitability score
- RSI score
- top 3 variety recommendation view
- flood risk display
- rainfall display
- soil profile view
- planting schedule section
- fertilizer plan section
- pest prevention section
- progress dashboard
- yield record summary
- farm cycle summary

---

## File Paths Reference

```
src/
├── app/
│   ├── App.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Bottom tab + stack navigators
│   │   ├── AuthNavigator.tsx
│   │   └── RootNavigator.tsx
├── assets/
│   ├── images/flow-mascot.png
│   └── icons/                  # Action icons for quick actions
├── components/                 # All reusable UI components
├── data/mockData.ts            # All mock content
├── screens/                    # All screen files
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   ├── components.ts
│   └── index.ts
└── types/
```

---

## Accessibility & UX Rules

- Minimum touch target: 44×44px
- All form labels clearly visible above inputs
- Short, plain-language text (farmer-friendly)
- High contrast text on all backgrounds
- Avoid dense/crowded layouts — use generous spacing
- `ScrollView` with `showsVerticalScrollIndicator={false}` on all screens
- `SafeAreaView` as root container
- Bottom tab height 72px for easy thumb reach

---

## Capstone Presentation Notes

- The app must demonstrate the full workflow from farm pinning to yield recording
- All 5 modules must be visually accessible from the Home Dashboard
- Score and recommendation data must be clearly visible and readable
- The design should look polished and professional in a capstone demo context
- Static/mock content is intentional — the focus is on UI/UX quality
