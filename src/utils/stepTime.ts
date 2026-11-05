import type { GuideStep } from '@/utils/guideSteps';
import { ADVICE_TEXT, type StepWeather, type WeatherAdviceCode } from '@/utils/stepWeather';

// RiceFlow serves farms in Panabo City, so the phone's local time is the farm's time.
// This is a safety reminder, not an agronomic limit: farmers may still record work
// that they already completed or work that genuinely has to happen at night.
export const FIELD_WORK_START_HOUR = 6;
export const FIELD_WORK_END_HOUR = 18;

const OUTDOOR_FIELD_STEPS = new Set([
  'plow', 'seedbed', 'leveling', 'transplant', 'replant',
  'fertilizer1', 'lcc', 'water', 'weeds', 'pests',
  'fertilizer2', 'fertilizerpi', 'flowering', 'drain',
  'harvest', 'drystore',
]);

export type TimeAdviceCode = 'nightWork';

export interface StepTimeAdvice {
  level: 'caution';
  code: TimeAdviceCode;
}

export type StepAdvice = StepWeather | StepTimeAdvice;

/** Warn only for outdoor work that is due now or overdue, never for a future task. */
export function stepTimeAdvice(
  step: Pick<GuideStep, 'key' | 'daysAfterPlanting'> | null | undefined,
  guideToday: number,
  now: Date = new Date(),
): StepTimeAdvice | null {
  if (!step || step.daysAfterPlanting > guideToday || !OUTDOOR_FIELD_STEPS.has(step.key)) return null;
  const hour = now.getHours();
  if (hour >= FIELD_WORK_END_HOUR || hour < FIELD_WORK_START_HOUR) {
    return { level: 'caution', code: 'nightWork' };
  }
  return null;
}

export const STEP_ADVICE_TEXT: Record<WeatherAdviceCode | TimeAdviceCode, string> = {
  ...ADVICE_TEXT,
  nightWork: 'wxAdviceNightWork',
};
