// RiceFlow's illustrations (cut from the ChatGPT sheets): growth stages and step icons.
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

// Empty-state pictures (no_farm, no_logs, no_harvest, no_guide, ai_chat, offline) come later
// with the D_empty sheet.
