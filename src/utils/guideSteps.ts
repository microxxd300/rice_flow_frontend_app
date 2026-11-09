/**
 * The PalayCheck planting guide, one step at a time. The Planting card, Home's Upcoming
 * Tasks and Progress' Next Tasks all read the current step from here, so they always agree:
 * the current step is the first one not yet done, in guide order. A step is done when the
 * farmer logs it (the log carries the step id; see ProgressDashboardScreen).
 */
export interface GuideStep {
  id:                string;
  key:               string;
  keyCheck:          number | null;
  title:             string;
  instruction:       string;
  explanation:       string;
  reference:         string;     // e.g. "PalayCheck 2022, pp. 35-38"
  referenceUrl:      string;
  daysAfterPlanting: number;     // from sowing (day 0)
  category:          string;
}

/** The guide's steps in order, in the app's shape. */
export function guideSteps(guide: any): GuideStep[] {
  const raw: any[] = Array.isArray(guide?.steps) ? guide.steps : [];
  return raw
    .map((st, i) => ({
      id:                String(st.id ?? `step_${i + 1}`),
      key:               String(st.key ?? ''),
      keyCheck:          st.keyCheck ?? null,
      title:             String(st.title ?? '').trim(),
      instruction:       String(st.instruction ?? st.description ?? '').trim(),
      explanation:       String(st.explanation ?? '').trim(),
      reference:         String(st.reference ?? ''),
      referenceUrl:      String(st.referenceUrl ?? ''),
      daysAfterPlanting: Number(st.daysAfterPlanting ?? 0) || 0,
      category:          String(st.category ?? 'planting'),
      order:             Number(st.stepNumber ?? i + 1),
    }))
    .sort((a, b) => a.daysAfterPlanting - b.daysAfterPlanting || a.order - b.order)
    .map(({ order: _order, ...st }) => st);
}

/** Where the farmer is: the current step, the ones after it, and the counts. */
export function guideProgress(steps: GuideStep[], completedIds: Iterable<string>) {
  const done = new Set(completedIds);
  const pending = steps.filter(s => !done.has(s.id));
  return {
    current: pending[0] ?? null,
    next:    pending.slice(1),
    done:    steps.length - pending.length,
    total:   steps.length,
  };
}

// The growth stage each step belongs to, as on the server (progress/stages.py, guides/direct_seeded.py).
// Preparation before sowing has no stage.
const STEP_STAGE: Record<string, number> = {
  seedbed: 1, leveling: 2, transplant: 2, replant: 2,
  fertilizer1: 3, lcc: 3, water: 3, weeds: 3, pests: 3, fertilizer2: 3,
  fertilizerpi: 4, flowering: 6, drain: 8, harvest: 9, drystore: 10,
  up_sow: 1, rf_sow: 1,
  up_weed1: 3, up_fert: 3, up_stand: 3, up_weed2: 3, up_water: 3, up_pests: 3,
  rf_water: 3, rf_weeds: 3, rf_top: 3, rf_pests: 3, rf_lcc: 3,
  up_fertpi: 4, rf_drain: 8, up_harvest: 9, rf_harvest: 9, up_store: 10,
};

/**
 * The growth stage the guide has reached: the furthest logged step, first stage at the least.
 * Some stages have no step (Booting, Grain Filling), so the crop's age moves through those,
 * but never past the next step still to log. Null with no guide.
 */
export function guideStageNo(steps: GuideStep[], completedIds: Iterable<string>, ageStage?: number | null): number | null {
  if (steps.length === 0) return null;
  const done = new Set(completedIds);
  const stageOf = (st: GuideStep) => STEP_STAGE[st.key] ?? 0;
  const reached = Math.max(1, ...steps.filter(st => done.has(st.id)).map(stageOf));
  const next = Math.min(...steps.filter(st => !done.has(st.id) && stageOf(st) > reached).map(stageOf));   // Infinity when none is left
  return Math.max(reached, Math.min(ageStage ?? 0, next - 1));
}

/** Today's day of the guide (0 = the guide's start date). */
export function guideDay(guide: any, today: Date = new Date()): number {
  const start = guide?.start_date ? new Date(guide.start_date) : null;
  if (!start || isNaN(start.getTime())) return 0;
  const a = new Date(today);
  a.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.floor((a.getTime() - start.getTime()) / 86400000);
}
