import type { WeatherOutlook } from '@/services/apiService';
import type { GuideStep } from '@/utils/guideSteps';
import { HARVEST_KEYS } from '@/utils/sowing';

/**
 * What the weather means for a PalayCheck step: hold the fertilizer before heavy rain,
 * do not spray in rain or wind, harvest before rain, and so on. The Planting card,
 * Home's Upcoming Tasks, the log form, the bell and the 7 AM reminders all ask this,
 * so they warn together. Pure, so it can be tested without a phone.
 */

// Thresholds in one place, for the validator to check. Rain in mm, chance in %, wind in km/h.
export const WEATHER_LIMITS = {
  heavyRain24h:     20,   // a heavy-rain day: fertilizer washes off, water gets too deep
  veryHeavyRain24h: 40,   // seeds and young seedlings can wash away, field work stops
  rainSoonChance:   60,   // rain likely within 6 hours
  rainSoonMm:       1,
  harvestRain48h:   10,   // enough rain in 2 days to wet cut or drying palay
  harvestChance24h: 70,
  sprayWind:        15,   // spray drifts off the field in stronger wind
  strongWind:       40,   // field work is unsafe, young plants can lodge
  heatC:            35,   // heat stress for people and for flowering rice
  dryRain48h:       1,    // less than this in 2 days, with a low chance, counts as no rain coming
  dryChance48h:     30,
};
// Only steps due within this many days get weather advice (the forecast looks 2 days ahead)
export const WEATHER_DUE_WITHIN_DAYS = 2;
// The step the farmer should do next can be started early, so it is warned about sooner
export const WEATHER_CURRENT_WITHIN_DAYS = 7;
// An older forecast (phone offline) is not used for advice
export const FORECAST_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type WeatherAdviceCode =
  | 'fertilizerHeavyRain' | 'fertilizerRainSoon' | 'noSpray' | 'herbicideWait'
  | 'sowHeavyRain' | 'fieldHeavyRain' | 'waterHeavyRain' | 'drainRain'
  | 'harvestRain' | 'dryRain'
  | 'fieldRainSoon' | 'sowRainSoon' | 'floodWatch' | 'strongWind' | 'rainSoon' | 'heat' | 'dryAhead';

export interface StepWeather {
  level: 'stop' | 'caution';   // stop = do not do the step now; caution = do it with care
  code:  WeatherAdviceCode;
}

// Each list has the irrigated (PalayCheck) steps, then the rainfed (rf_) and upland (up_) ones
const FERTILIZER = ['fertilizer1', 'fertilizer2', 'fertilizerpi', 'rf_basal', 'rf_top', 'up_organic', 'up_fert', 'up_fertpi'];
const SOWING     = ['seedbed', 'transplant', 'replant'];
// Direct-seeded farms want rain after sowing, so only very heavy rain holds it
const DIRECT_SOWING = ['rf_sow', 'up_sow'];
const FIELD_WORK = ['plow', 'leveling', 'rf_land', 'up_land'];
const WATER      = ['water', 'flowering'];
const PESTS      = ['pests', 'rf_pests', 'up_pests'];
const WEEDS      = ['weeds', 'rf_weeds', 'up_weed1', 'up_weed2'];
const DRAIN      = ['drain', 'rf_drain'];
const DRYING     = ['drystore', 'up_store'];

/**
 * The guide day to judge a step by. A step the farmer is logging as done is being done
 * today, whatever day the guide planned it for, so it counts as due today.
 */
export const adviceDay = (
  step: Pick<GuideStep, 'daysAfterPlanting'> | null | undefined,
  guideToday: number,
  doingNow = false,
): number => (doingNow && step ? Math.max(guideToday, step.daysAfterPlanting) : guideToday);

/**
 * Home's Upcoming Tasks and the guide warn about the farmer's next step, when it is near,
 * as if it were done today: rain or night now matters to the work they are about to do.
 */
export const warnAsToday = (
  step: Pick<GuideStep, 'id' | 'daysAfterPlanting'> | null | undefined,
  currentId: string | null | undefined,
  guideToday: number,
): boolean => !!step && !!currentId && step.id === currentId
  && step.daysAfterPlanting <= guideToday + WEATHER_CURRENT_WITHIN_DAYS;

export function stepWeather(
  step: Pick<GuideStep, 'key' | 'daysAfterPlanting'> | null | undefined,
  outlook: WeatherOutlook | null | undefined,
  guideToday: number,
  isCurrent = false,
): StepWeather | null {
  if (!step || !outlook) return null;
  if (step.daysAfterPlanting > guideToday + (isCurrent ? WEATHER_CURRENT_WITHIN_DAYS : WEATHER_DUE_WITHIN_DAYS)) return null;
  const L = WEATHER_LIMITS;
  const rainSoon = outlook.rain_prob_6h >= L.rainSoonChance || outlook.rain_mm_6h >= L.rainSoonMm;
  const key = step.key;

  if (FERTILIZER.includes(key)) {
    if (outlook.rain_mm_24h >= L.heavyRain24h) return { level: 'stop', code: 'fertilizerHeavyRain' };
    if (rainSoon) return { level: 'caution', code: 'fertilizerRainSoon' };
  }
  if (PESTS.includes(key) && (rainSoon || outlook.wind_kph_max_12h > L.sprayWind)) {
    return { level: 'stop', code: 'noSpray' };
  }
  if (WEEDS.includes(key) && rainSoon) return { level: 'caution', code: 'herbicideWait' };
  if ((SOWING.includes(key) || DIRECT_SOWING.includes(key)) && outlook.rain_mm_24h >= L.veryHeavyRain24h) {
    return { level: 'caution', code: 'sowHeavyRain' };
  }
  if (SOWING.includes(key) && rainSoon) return { level: 'caution', code: 'sowRainSoon' };
  if (FIELD_WORK.includes(key) && outlook.rain_mm_24h >= L.veryHeavyRain24h) {
    return { level: 'caution', code: 'fieldHeavyRain' };
  }
  if (FIELD_WORK.includes(key) && (rainSoon || outlook.rain_mm_24h >= L.heavyRain24h)) {
    return { level: 'caution', code: 'fieldRainSoon' };
  }
  if (WATER.includes(key) && outlook.rain_mm_24h >= L.heavyRain24h) {
    return { level: 'caution', code: 'waterHeavyRain' };
  }
  if (DRAIN.includes(key) && outlook.rain_mm_48h >= L.harvestRain48h) return { level: 'caution', code: 'drainRain' };
  if (HARVEST_KEYS.includes(key) && (outlook.rain_mm_48h >= L.harvestRain48h || outlook.rain_prob_24h >= L.harvestChance24h)) {
    return { level: 'stop', code: 'harvestRain' };
  }
  if (DRYING.includes(key) && rainSoon) return { level: 'stop', code: 'dryRain' };
  // Any other step: weather that makes work in the field risky
  if (outlook.rain_mm_24h >= L.veryHeavyRain24h) return { level: 'caution', code: 'floodWatch' };
  if (outlook.wind_kph_max_12h >= L.strongWind) return { level: 'caution', code: 'strongWind' };
  if (rainSoon) return { level: 'caution', code: 'rainSoon' };
  if ((outlook.temp_c_max_24h ?? 0) >= L.heatC) return { level: 'caution', code: 'heat' };
  if (WATER.includes(key) && outlook.rain_mm_48h < L.dryRain48h && outlook.rain_prob_48h < L.dryChance48h) {
    return { level: 'caution', code: 'dryAhead' };
  }
  return null;
}

/** The forecast's outlook if it is for this farm and recent enough, else null. */
export function usableOutlook(
  forecast: { key: string; at: number; data: { outlook?: WeatherOutlook } } | null,
  farmKey: string,
  now: number = Date.now(),
): WeatherOutlook | null {
  if (!forecast || forecast.key !== farmKey || now - forecast.at > FORECAST_MAX_AGE_MS) return null;
  return forecast.data.outlook ?? null;
}

/** The translation key of an advice's text (translations.ts, wxAdvice…). */
export const ADVICE_TEXT: Record<WeatherAdviceCode, string> = {
  fertilizerHeavyRain: 'wxAdviceFertHeavy',
  fertilizerRainSoon:  'wxAdviceFertSoon',
  noSpray:             'wxAdviceNoSpray',
  herbicideWait:       'wxAdviceHerbicide',
  sowHeavyRain:        'wxAdviceSow',
  fieldHeavyRain:      'wxAdviceField',
  waterHeavyRain:      'wxAdviceWater',
  drainRain:           'wxAdviceDrain',
  harvestRain:         'wxAdviceHarvest',
  dryRain:             'wxAdviceDry',
  fieldRainSoon:       'wxAdviceFieldSoon',
  sowRainSoon:         'wxAdviceSowSoon',
  floodWatch:          'wxAdviceFlood',
  strongWind:          'wxAdviceWind',
  rainSoon:            'wxAdviceRainSoon',
  heat:                'wxAdviceHeat',
  dryAhead:            'wxAdviceDryAhead',
};

/** The icon for a warning. */
export const adviceIcon = (code: string): 'moon-outline' | 'sunny-outline' | 'flag-outline' | 'water-outline' | 'rainy-outline' =>
  code === 'nightWork' ? 'moon-outline'
    : code === 'heat' ? 'sunny-outline'
    : code === 'strongWind' ? 'flag-outline'
    : code === 'dryAhead' ? 'water-outline'
    : 'rainy-outline';
