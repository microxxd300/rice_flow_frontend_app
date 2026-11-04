// RiceFlow's illustrations (cut from the ChatGPT sheets): growth stages, step icons, empty screens,
// weather icons and the farm tiles' photos.
import type { ImageSourcePropType } from 'react-native';

/** Index 0..9 = stage 1..10 (seed → post-harvest). */
export const growthStages: { key: string; label: string; image: ImageSourcePropType }[] = [
  { key: 'seed',               label: 'Seed',               image: require('./growth/stage_01.png') },
  { key: 'seedling',           label: 'Seedling',           image: require('./growth/stage_02.png') },
  { key: 'tillering',          label: 'Tillering',          image: require('./growth/stage_03.png') },
  { key: 'stem_elongation',    label: 'Stem elongation',    image: require('./growth/stage_04.png') },
  { key: 'panicle_initiation', label: 'Panicle initiation', image: require('./growth/stage_05.png') },
  { key: 'heading',            label: 'Heading',            image: require('./growth/stage_06.png') },
  { key: 'grain_filling',      label: 'Grain filling',      image: require('./growth/stage_07.png') },
  { key: 'ripening',           label: 'Ripening',           image: require('./growth/stage_08.png') },
  { key: 'harvest',            label: 'Harvest',            image: require('./growth/stage_09.png') },
  { key: 'post_harvest',       label: 'Post-harvest',       image: require('./growth/stage_10.png') },
];

export const icons = {
  planting:   require('./icons/planting.png'),
  fertilizer: require('./icons/fertilizer.png'),
  pest:       require('./icons/pest.png'),
  irrigation: require('./icons/irrigation.png'),
  harvest:    require('./icons/harvest.png'),
  farm:       require('./icons/farm.png'),
  gps:        require('./icons/gps.png'),
  varieties:  require('./icons/varieties.png'),
  guide:      require('./icons/guide.png'),
} satisfies Record<string, ImageSourcePropType>;

/** The picture for a server growth stage (stage_no 1..10); none outside that range. */
export function stageImage(stageNo?: number | null): ImageSourcePropType | null {
  return stageNo != null && stageNo >= 1 && stageNo <= growthStages.length ? growthStages[stageNo - 1].image : null;
}

/** A PalayCheck step's kind (planting, fertilizer, pest_prevention, irrigation, harvesting) → its icon. */
export function stepIcon(category?: string | null): ImageSourcePropType {
  switch (category) {
    case 'fertilizer':      return icons.fertilizer;
    case 'pest_prevention': return icons.pest;
    case 'irrigation':      return icons.irrigation;
    case 'harvesting':      return icons.harvest;
    default:                return icons.planting;
  }
}

/** The pictures for screens with nothing on them yet. */
export const empty = {
  no_farm:    require('./empty/no_farm.png'),
  no_logs:    require('./empty/no_logs.png'),
  no_harvest: require('./empty/no_harvest.png'),
  no_guide:   require('./empty/no_guide.png'),
  ai_chat:    require('./empty/ai_chat.png'),
  offline:    require('./empty/offline.png'),
} satisfies Record<string, ImageSourcePropType>;

export const weather = {
  clear_day:           require('./weather/clear_day.png'),
  clear_night:         require('./weather/clear_night.png'),
  mostly_sunny:        require('./weather/mostly_sunny.png'),
  mostly_clear_night:  require('./weather/mostly_clear_night.png'),
  partly_cloudy_day:   require('./weather/partly_cloudy_day.png'),
  partly_cloudy_night: require('./weather/partly_cloudy_night.png'),
  cloudy:              require('./weather/cloudy.png'),
  fog:                 require('./weather/fog.png'),
  drizzle:             require('./weather/drizzle.png'),
  rain:                require('./weather/rain.png'),
  heavy_rain:          require('./weather/heavy_rain.png'),
  thunder:             require('./weather/thunder.png'),
} satisfies Record<string, ImageSourcePropType>;

/** Night in Panabo: 6 PM to 6 AM. */
export const isNightHour = (hour: number): boolean => hour >= 18 || hour < 6;

/** The hour (0..23) in Panabo, UTC+8 all year, whatever the phone's own time zone. */
export const panaboHour = (d: Date = new Date()): number => (d.getUTCHours() + 8) % 24;

/**
 * The weather picture for a WMO weather code (Open-Meteo) at an hour of the day in
 * Panabo: the sun by day, the moon from 6 PM to 6 AM for clear and partly cloudy skies.
 */
export function weatherIcon(code: number | null | undefined, hour: number): ImageSourcePropType {
  const night = isNightHour(hour);
  if (code === 0)                     return night ? weather.clear_night : weather.clear_day;
  if (code === 1)                     return night ? weather.mostly_clear_night : weather.mostly_sunny;
  if (code === 2)                     return night ? weather.partly_cloudy_night : weather.partly_cloudy_day;
  if (code === 3)                     return weather.cloudy;
  if (code === 45 || code === 48)     return weather.fog;
  if (code != null && code >= 51 && code <= 57) return weather.drizzle;
  if (code === 65 || code === 67 || code === 82) return weather.heavy_rain;
  if (code != null && code >= 61 && code <= 81) return weather.rain;
  if (code != null && code >= 95)     return weather.thunder;
  return night ? weather.partly_cloudy_night : weather.partly_cloudy_day;
}

const FARM_PHOTOS: ImageSourcePropType[] = [
  require('./farms/farm_1.jpg'), require('./farms/farm_2.jpg'), require('./farms/farm_3.jpg'),
  require('./farms/farm_4.jpg'), require('./farms/farm_5.jpg'), require('./farms/farm_6.jpg'),
];

/** A rice-field photo for a farm's tile, decoration only (not the farm itself); a farm keeps its photo. */
export function farmPhoto(farmId: number): ImageSourcePropType {
  return FARM_PHOTOS[Math.abs(Math.trunc(farmId)) % FARM_PHOTOS.length];
}
