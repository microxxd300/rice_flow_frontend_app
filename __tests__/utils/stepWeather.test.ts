import { stepWeather, usableOutlook, FORECAST_MAX_AGE_MS, ADVICE_TEXT } from '@/utils/stepWeather';
import { translations } from '@/i18n/translations';

const DRY = {
  rain_mm_6h: 0, rain_prob_6h: 10, rain_mm_24h: 0, rain_prob_24h: 10,
  rain_mm_48h: 0, rain_prob_48h: 10, wind_kph_max_12h: 5,
};
const step = (key: string, day = 0) => ({ key, daysAfterPlanting: day });

describe('stepWeather', () => {
  it('says nothing on a dry, calm day', () => {
    for (const key of ['fertilizer1', 'pests', 'harvest', 'drystore', 'transplant']) {
      expect(stepWeather(step(key), DRY, 0)).toBeNull();
    }
  });

  it('holds the fertilizer before heavy rain, and waits out rain that is close', () => {
    expect(stepWeather(step('fertilizer1'), { ...DRY, rain_mm_24h: 25 }, 0))
      .toEqual({ level: 'stop', code: 'fertilizerHeavyRain' });
    expect(stepWeather(step('fertilizerpi'), { ...DRY, rain_prob_6h: 80 }, 0))
      .toEqual({ level: 'caution', code: 'fertilizerRainSoon' });
  });

  it('does not spray in rain or strong wind', () => {
    expect(stepWeather(step('pests'), { ...DRY, wind_kph_max_12h: 20 }, 0)?.code).toBe('noSpray');
    expect(stepWeather(step('pests'), { ...DRY, rain_mm_6h: 3 }, 0)?.code).toBe('noSpray');
  });

  it('harvests and dries before the rain', () => {
    expect(stepWeather(step('harvest'), { ...DRY, rain_mm_48h: 12 }, 0)?.level).toBe('stop');
    expect(stepWeather(step('drystore'), { ...DRY, rain_prob_6h: 70 }, 0)?.code).toBe('dryRain');
  });

  it('only warns about steps that are due within the forecast', () => {
    const storm = { ...DRY, rain_mm_24h: 60, rain_prob_6h: 90 };
    expect(stepWeather(step('fertilizer1', 30), storm, 20)).toBeNull();    // 10 days away
    expect(stepWeather(step('fertilizer1', 22), storm, 20)).not.toBeNull(); // in 2 days
    expect(stepWeather(step('fertilizer1', 10), storm, 20)).not.toBeNull(); // overdue
  });

  it('has the words for every advice in every language', () => {
    for (const lang of ['en', 'fil', 'ceb'] as const) {
      for (const key of Object.values(ADVICE_TEXT)) {
        expect((translations[lang] as any)[key]).toBeTruthy();
      }
    }
  });
});

describe('usableOutlook', () => {
  const forecast = { key: '7.3,125.6', at: 1_000_000, data: { outlook: DRY } };
  it('uses a recent forecast for the same farm only', () => {
    expect(usableOutlook(forecast, '7.3,125.6', 1_000_000 + 60_000)).toBe(DRY);
    expect(usableOutlook(forecast, '7.4,125.6', 1_000_000)).toBeNull();
    expect(usableOutlook(forecast, '7.3,125.6', 1_000_000 + FORECAST_MAX_AGE_MS + 1)).toBeNull();
  });
});
