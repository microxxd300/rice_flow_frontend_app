import { SOWING_KEYS, sowingStep } from '@/utils/sowing';

/**
 * How early a farmer can log a guide step before its planned day, by the kind of work.
 * Close to the plan it just logs; earlier, the app asks "Did you really do it today?";
 * much earlier, it is refused, since the crop stage, the admin counts and the yield data
 * would all be wrong. Work before sowing, and sowing itself, can be logged any time.
 *
 * The numbers are defaults from how the booklets time each step, for the validator to check.
 */
export interface EarlyWindow {
  ok:  number;   // logging up to this many days early is normal
  ask: number;   // up to this many days early asks the farmer to confirm; more is refused
}

export const EARLY_WINDOWS: Record<'fertilizer' | 'weeding' | 'check' | 'drain' | 'harvest', EarlyWindow> = {
  fertilizer: { ok: 3, ask: 7 },    // timing changes the yield: too early is wasted
  weeding:    { ok: 5, ask: 14 },
  check:      { ok: 7, ask: 21 },   // pests, leaf color chart, water, seedling count: done again and again
  drain:      { ok: 3, ask: 10 },
  harvest:    { ok: 7, ask: 14 },   // harvesting early means unripe grain
};

// Each list has the irrigated (PalayCheck) steps, then the rainfed (rf_) and upland (up_) ones.
// Transplanting is timed like fertilizer: the seedlings' age matters.
const KIND: Record<string, keyof typeof EARLY_WINDOWS> = {
  fertilizer1: 'fertilizer', fertilizer2: 'fertilizer', fertilizerpi: 'fertilizer',
  transplant: 'fertilizer', replant: 'fertilizer',
  rf_top: 'fertilizer', up_fert: 'fertilizer', up_fertpi: 'fertilizer',
  weeds: 'weeding', leveling: 'weeding', rf_weeds: 'weeding', up_weed1: 'weeding', up_weed2: 'weeding',
  drain: 'drain', rf_drain: 'drain',
  harvest: 'harvest', drystore: 'harvest', rf_harvest: 'harvest', up_harvest: 'harvest', up_store: 'harvest',
};

export const earlyWindow = (key: string): EarlyWindow => EARLY_WINDOWS[KIND[key] ?? 'check'];

export interface EarlyCheck {
  level:    'ok' | 'ask' | 'block';
  planned:  string | null;   // the step's planned day, YYYY-MM-DD
  earliest: string | null;   // the first day it can be logged on
  days:     number;          // how many days before the planned day
}

const dayNumber = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
const isoOf = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);

/** Whether a step can be logged on `logDate` (YYYY-MM-DD), given how early that is. */
export function earlyLogCheck(
  guide: any,
  step: { key: string; daysAfterPlanting: number } | null | undefined,
  completedIds: string[],
  logDate: string,
): EarlyCheck {
  const fine: EarlyCheck = { level: 'ok', planned: null, earliest: null, days: 0 };
  const start = String(guide?.start_date ?? '').slice(0, 10);
  if (!step || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return fine;
  // Before sowing, and sowing itself, can be done any time
  if (SOWING_KEYS.includes(step.key) || step.daysAfterPlanting <= 0) return fine;
  // Not sown yet: the plan's dates are only a guess (the app asks to confirm the sowing day instead)
  const sown = sowingStep(guide);
  if (sown && !completedIds.includes(sown.id)) return fine;
  const plannedDay = dayNumber(start) + step.daysAfterPlanting;
  const days = plannedDay - dayNumber(logDate);
  const w = earlyWindow(step.key);
  const level = days <= w.ok ? 'ok' : days <= w.ask ? 'ask' : 'block';
  return { level, planned: isoOf(plannedDay), earliest: isoOf(plannedDay - w.ask), days };
}
