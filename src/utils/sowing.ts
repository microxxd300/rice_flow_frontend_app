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

/**
 * The earliest day a step can be logged on, as YYYY-MM-DD: a step that comes after sowing
 * cannot be done before the crop was sown (the server refuses it too, progress/serializers.py).
 * Null when there is no limit: steps up to sowing, or a crop whose sowing is not logged yet.
 */
export function earliestLogDate(
  guide: any,
  step: { key: string; daysAfterPlanting: number } | null | undefined,
  completedIds: string[],
): string | null {
  const sown = sowingStep(guide);
  if (!step || !sown || !completedIds.includes(sown.id)) return null;
  if (SOWING_KEYS.includes(step.key) || step.daysAfterPlanting <= 0) return null;
  const start = String(guide?.start_date ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null;
}

// The same limit as the server (OLDEST_SOWING_DAYS in guides/sowing.py)
export const OLDEST_SOWING_DAYS = 150;

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

/** YYYY-MM-DD from a date, in the phone's time. */
export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The date of a YYYY-MM-DD text, in the phone's time. */
export function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Nov 14" from YYYY-MM-DD, in the app language's month names. */
export function shortDate(iso: string | null | undefined, tr: any): string {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = [tr.monShortJan, tr.monShortFeb, tr.monShortMar, tr.monShortApr, tr.monShortMay, tr.monShortJun,
                  tr.monShortJul, tr.monShortAug, tr.monShortSep, tr.monShortOct, tr.monShortNov, tr.monShortDec];
  return `${months[m - 1]} ${d}`;
}

/** YYYY-MM-DD for a day `daysAgo` before today, in the phone's time. */
export function daysAgoISO(daysAgo: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
