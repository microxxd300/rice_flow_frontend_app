import type { GuideStep } from '@/utils/guideSteps';

/**
 * Season advice for the planting guide. A rainfed field only gets water from rain, and in
 * Davao del Norte December to April is the drier part of the year (most rainfed rice there
 * is harvested July to December, PSA). So a rainfed farm whose sowing day falls in those
 * months is told to wait for steady rain before sowing. Pure, so it can be tested.
 */

// JavaScript months (0 = January): December, January to April
export const RAINFED_DRY_MONTHS = [11, 0, 1, 2, 3];

export function rainfedWaitAdvice(
  ecosystem: string | null | undefined,
  guide: any,
  step: Pick<GuideStep, 'daysAfterPlanting'> | null | undefined,
): boolean {
  if (ecosystem !== 'rainfed_lowland' || !step || step.daysAfterPlanting > 0) return false;   // after sowing: too late
  const sowing = guide?.start_date ? new Date(guide.start_date) : null;
  if (!sowing || isNaN(sowing.getTime())) return false;
  return RAINFED_DRY_MONTHS.includes(sowing.getMonth());
}
