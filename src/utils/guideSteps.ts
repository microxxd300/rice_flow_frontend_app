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

/** Today's day of the guide (0 = the guide's start date). */
export function guideDay(guide: any, today: Date = new Date()): number {
  const start = guide?.start_date ? new Date(guide.start_date) : null;
  if (!start || isNaN(start.getTime())) return 0;
  const a = new Date(today);
  a.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.floor((a.getTime() - start.getTime()) / 86400000);
}
