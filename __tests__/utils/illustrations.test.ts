import {
  growthStages, icons, stageImage, stepIcon, weather, weatherIcon, isNightHour, panaboHour, farmPhoto,
} from '@/assets/illustrations';

describe('illustrations', () => {
  it('has a picture for each of the 10 server growth stages, in order', () => {
    expect(growthStages).toHaveLength(10);
    expect(stageImage(1)).toBe(growthStages[0].image);
    expect(stageImage(10)).toBe(growthStages[9].image);
  });

  it('has no picture outside stages 1..10', () => {
    expect(stageImage(0)).toBeNull();
    expect(stageImage(11)).toBeNull();
    expect(stageImage(null)).toBeNull();
  });

  it("gives each PalayCheck step kind its icon, planting otherwise", () => {
    expect(stepIcon('pest_prevention')).toBe(icons.pest);
    expect(stepIcon('harvesting')).toBe(icons.harvest);
    expect(stepIcon('fertilizer')).toBe(icons.fertilizer);
    expect(stepIcon('irrigation')).toBe(icons.irrigation);
    expect(stepIcon('something_new')).toBe(icons.planting);
  });
});


describe('weatherIcon', () => {
  it('shows the sun by day and the moon at night for clear skies', () => {
    expect(weatherIcon(0, 12)).toBe(weather.clear_day);
    expect(weatherIcon(0, 21)).toBe(weather.clear_night);
    expect(weatherIcon(1, 5)).toBe(weather.mostly_clear_night);
    expect(weatherIcon(2, 6)).toBe(weather.partly_cloudy_day);
  });

  it('keeps clouds, rain and storms the same day and night', () => {
    expect(weatherIcon(3, 23)).toBe(weather.cloudy);
    expect(weatherIcon(45, 9)).toBe(weather.fog);
    expect(weatherIcon(53, 9)).toBe(weather.drizzle);
    expect(weatherIcon(63, 22)).toBe(weather.rain);
    expect(weatherIcon(80, 9)).toBe(weather.rain);
    expect(weatherIcon(65, 9)).toBe(weather.heavy_rain);
    expect(weatherIcon(82, 9)).toBe(weather.heavy_rain);
    expect(weatherIcon(95, 9)).toBe(weather.thunder);
  });

  it('counts 6 PM to 6 AM as night in Panabo time', () => {
    expect(isNightHour(18)).toBe(true);
    expect(isNightHour(5)).toBe(true);
    expect(isNightHour(6)).toBe(false);
    expect(panaboHour(new Date(Date.UTC(2026, 10, 5, 10, 30)))).toBe(18);   // 10:30 UTC = 6:30 PM
    expect(panaboHour(new Date(Date.UTC(2026, 10, 5, 20, 0)))).toBe(4);     // 8 PM UTC = 4 AM next day
  });
});

describe('farmPhoto', () => {
  it('always gives a farm the same photo', () => {
    expect(farmPhoto(50)).toBe(farmPhoto(50));
    expect(farmPhoto(1)).toBe(farmPhoto(7));
    expect(farmPhoto(1)).not.toBe(farmPhoto(2));
  });
});
