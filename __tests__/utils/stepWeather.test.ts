import { adviceDay, stepWeather, usableOutlook, warnAsToday, FORECAST_MAX_AGE_MS, ADVICE_TEXT } from '@/utils/stepWeather';
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

describe('weather warnings for every kind of weather', () => {
  it('says not to plow while it rains, even if the rain is light', () => {
    expect(stepWeather(step('plow'), { ...DRY, rain_prob_6h: 80 }, 0)?.code).toBe('fieldRainSoon');
  });

  it('warns about the next step sooner than about later ones', () => {
    const raining = { ...DRY, rain_prob_6h: 80 };
    expect(stepWeather(step('plow', 3), raining, 0, true)?.code).toBe('fieldRainSoon');
    expect(stepWeather(step('plow', 3), raining, 0, false)).toBeNull();
    expect(stepWeather(step('plow', 8), raining, 0, true)).toBeNull();
  });

  it('warns about flood risk, strong wind and heat', () => {
    expect(stepWeather(step('lcc'), { ...DRY, rain_mm_24h: 45 }, 0)?.code).toBe('floodWatch');
    expect(stepWeather(step('lcc'), { ...DRY, wind_kph_max_12h: 45 }, 0)?.code).toBe('strongWind');
    expect(stepWeather(step('lcc'), { ...DRY, temp_c_max_24h: 36 }, 0)?.code).toBe('heat');
  });

  it('warns when a watering step has no rain coming', () => {
    expect(stepWeather(step('water'), DRY, 0)?.code).toBe('dryAhead');
  });

  it('has text for every warning in every language', () => {
    for (const language of Object.values(translations) as any[]) {
      for (const key of Object.values(ADVICE_TEXT)) expect(language[key]).toBeTruthy();
    }
  });
});

describe('rainfed and upland steps', () => {
  const raining = { ...DRY, rain_prob_6h: 80 };

  it('get the same advice as the irrigated step of their kind', () => {
    expect(stepWeather(step('rf_top'), { ...DRY, rain_mm_24h: 25 }, 0))
      .toEqual({ level: 'stop', code: 'fertilizerHeavyRain' });
    expect(stepWeather(step('up_fert'), raining, 0)?.code).toBe('fertilizerRainSoon');
    expect(stepWeather(step('rf_land'), raining, 0)?.code).toBe('fieldRainSoon');
    expect(stepWeather(step('up_pests'), { ...DRY, wind_kph_max_12h: 20 }, 0)?.code).toBe('noSpray');
    expect(stepWeather(step('rf_weeds'), raining, 0)?.code).toBe('herbicideWait');
    expect(stepWeather(step('rf_drain'), { ...DRY, rain_mm_48h: 12 }, 0)?.code).toBe('drainRain');
    expect(stepWeather(step('rf_harvest'), { ...DRY, rain_mm_48h: 12 }, 0)?.level).toBe('stop');
    expect(stepWeather(step('up_store'), raining, 0)?.code).toBe('dryRain');
  });

  it('hold direct sowing only for very heavy rain', () => {
    expect(stepWeather(step('rf_sow'), { ...DRY, rain_mm_24h: 45 }, 0)?.code).toBe('sowHeavyRain');
    expect(stepWeather(step('up_sow'), raining, 0)?.code).toBe('rainSoon');
  });
});

describe('rain on any step', () => {
  const raining = { ...DRY, rain_prob_6h: 80 };

  it('cautions every step when it is raining or about to', () => {
    for (const key of ['seeds', 'lcc', 'water', 'rf_seeds', 'rf_prep', 'rf_water', 'rf_lcc', 'up_stand']) {
      expect(stepWeather(step(key), raining, 0)).toEqual({ level: 'caution', code: 'rainSoon' });
    }
  });

  it('comes after flood and strong wind, and before heat', () => {
    expect(stepWeather(step('lcc'), { ...raining, rain_mm_24h: 45 }, 0)?.code).toBe('floodWatch');
    expect(stepWeather(step('lcc'), { ...raining, wind_kph_max_12h: 45 }, 0)?.code).toBe('strongWind');
    expect(stepWeather(step('lcc'), { ...raining, temp_c_max_24h: 36 }, 0)?.code).toBe('rainSoon');
  });
});

describe('a step the farmer is logging as done', () => {
  const raining = { ...DRY, rain_prob_6h: 80 };
  const later = step('rf_top', 25);   // planned 25 days after sowing; today is day 0

  it('is judged as due today, however far ahead the guide planned it', () => {
    expect(stepWeather(later, raining, adviceDay(later, 0), true)).toBeNull();
    expect(stepWeather(later, raining, adviceDay(later, 0, true), true)?.code).toBe('fertilizerRainSoon');
  });

  it('keeps today for a step that is already due', () => {
    expect(adviceDay(step('rf_seeds', -10), 0, true)).toBe(0);
    expect(adviceDay(null, 4, true)).toBe(4);
  });
});

describe('warnAsToday', () => {
  const next = { id: '7', daysAfterPlanting: -7 };   // land preparation, 7 days before sowing

  it("warns about the farmer's next step when it is within a week", () => {
    expect(warnAsToday(next, '7', -9)).toBe(true);     // 2 days away
    expect(warnAsToday(next, '7', -14)).toBe(true);    // 7 days away
    expect(warnAsToday(next, '7', -15)).toBe(false);   // 8 days away
  });

  it('leaves the later steps alone', () => {
    expect(warnAsToday(next, '6', -9)).toBe(false);
    expect(warnAsToday(next, null, -9)).toBe(false);
    expect(warnAsToday(null, '7', -9)).toBe(false);
  });
});
