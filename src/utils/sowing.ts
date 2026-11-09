import { guideDay, guideSteps } from '@/utils/guideSteps';

/**
 * "Did you sow already?" The guide plans a sowing day, but farmers rarely sow exactly
 * then. From that day on, until they answer (or log the sowing step), the Planting card,
 * Home and the 7 AM reminder ask. The server moves the plan to the answer (guides/sowing.py).
 */
export const SOWING_KEY = 'seedbed';
// Upland and rainfed farms sow directly in the field, with no seedbed
export const SOWING_KEYS = [SOWING_KEY, 'up_sow', 'rf_sow'];
export const HARVEST_KEYS = ['harvest', 'up_harvest', 'rf_harvest'];

/** The guide's sowing step, if it has one. */
export function sowingStep(guide: any) {
  return guideSteps(guide).find(st => SOWING_KEYS.includes(st.key)) ?? null;
}

/** True when the planned sowing day has come and sowing is not logged yet. */
export function sowingQuestionDue(guide: any, completedIds: string[], today: Date = new Date()): boolean {
  const step = sowingStep(guide);
  if (!step || completedIds.includes(step.id)) return false;
  return guideDay(guide, today) >= step.daysAfterPlanting;
}

// The same limit as the server (OLDEST_SOWING_DAYS in guides/sowing.py)
const OLDEST_SOWING_DAYS = 150;

/** True for a real YYYY-MM-DD date, not in the future, that the server will accept. */
export function validSowingDate(text: string, today: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const iso = text.trim();
  return iso <= daysAgoISO(0, today) && iso >= daysAgoISO(OLDEST_SOWING_DAYS, today);
}

/** YYYY-MM-DD for a day `daysAgo` before today, in the phone's time. */
export function daysAgoISO(daysAgo: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
