import type { WeatherOutlook } from '@/services/apiService';
import type { GuideStep } from '@/utils/guideSteps';

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
  | 'fieldRainSoon' | 'sowRainSoon' | 'floodWatch' | 'strongWind' | 'heat' | 'dryAhead';

export interface StepWeather {
  level: 'stop' | 'caution';   // stop = do not do the step now; caution = do it with care
  code:  WeatherAdviceCode;
}

const FERTILIZER = ['fertilizer1', 'fertilizer2', 'fertilizerpi'];
const SOWING     = ['seedbed', 'transplant', 'replant'];
const FIELD_WORK = ['plow', 'leveling'];
const WATER      = ['water', 'flowering'];

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
  if (key === 'pests' && (rainSoon || outlook.wind_kph_max_12h > L.sprayWind)) {
    return { level: 'stop', code: 'noSpray' };
  }
  if (key === 'weeds' && rainSoon) return { level: 'caution', code: 'herbicideWait' };
  if (SOWING.includes(key) && outlook.rain_mm_24h >= L.veryHeavyRain24h) {
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
  if (key === 'drain' && outlook.rain_mm_48h >= L.harvestRain48h) return { level: 'caution', code: 'drainRain' };
  if (key === 'harvest' && (outlook.rain_mm_48h >= L.harvestRain48h || outlook.rain_prob_24h >= L.harvestChance24h)) {
    return { level: 'stop', code: 'harvestRain' };
  }
  if (key === 'drystore' && rainSoon) return { level: 'stop', code: 'dryRain' };
  // Any other step: weather that makes work in the field risky
  if (outlook.rain_mm_24h >= L.veryHeavyRain24h) return { level: 'caution', code: 'floodWatch' };
  if (outlook.wind_kph_max_12h >= L.strongWind) return { level: 'caution', code: 'strongWind' };
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
