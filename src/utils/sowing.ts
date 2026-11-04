import { guideDay, guideSteps } from '@/utils/guideSteps';

/**
 * "Did you sow already?" The guide plans a sowing day, but farmers rarely sow exactly
 * then. From that day on, until they answer (or log the sowing step), the Planting card,
 * Home and the 7 AM reminder ask. The server moves the plan to the answer (guides/sowing.py).
 */
export const SOWING_KEY = 'seedbed';

/** The guide's sowing step, if it has one. */
export function sowingStep(guide: any) {
  return guideSteps(guide).find(st => st.key === SOWING_KEY) ?? null;
}

/** True when the planned sowing day has come and sowing is not logged yet. */
export function sowingQuestionDue(guide: any, completedIds: string[], today: Date = new Date()): boolean {
  const step = sowingStep(guide);
  if (!step || completedIds.includes(step.id)) return false;
  return guideDay(guide, today) >= step.daysAfterPlanting;
}

/** YYYY-MM-DD for a day `daysAgo` before today, in the phone's time. */
export function daysAgoISO(daysAgo: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
