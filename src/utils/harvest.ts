/**
 * A harvest the DA way: dry palay at 14% moisture (the DA/PSA and NFA basis), in sacks
 * (cavans) of 50 kg, over the area actually harvested. Each recorded harvest also trains
 * the yield model as one DA-style row (backend predictions/services.py), so the numbers
 * must be right. Pure, so it can be tested.
 */
export const DRY_MOISTURE   = 14;   // %
export const FRESH_MOISTURE = 22;   // % for palay straight from the field (20-25%)
export const CAVAN_KG       = 50;
// Most farms in Davao del Norte get 3-7 t/ha; outside this a number is likely mistyped
export const USUAL_YIELD    = { low: 1, high: 12 };

export interface HarvestFigures {
  totalKg:   number;   // as weighed
  dryKg:     number;   // at 14% moisture
  tHa:       number;   // dry t/ha over the area harvested
  cavansHa:  number;   // dry 50-kg cavans per hectare
  unusual:   boolean;  // outside the usual range: ask the farmer to check
}

export function harvestFigures(sacks: number, kgPerSack: number, areaHa: number, moisture: number): HarvestFigures | null {
  if (!(sacks > 0) || !(kgPerSack > 0) || !(areaHa > 0)) return null;
  const totalKg = sacks * kgPerSack;
  const dryKg   = totalKg * (100 - moisture) / (100 - DRY_MOISTURE);
  const tHa     = dryKg / 1000 / areaHa;
  return {
    totalKg:  Math.round(totalKg),
    dryKg:    Math.round(dryKg),
    tHa:      Math.round(tHa * 100) / 100,
    cavansHa: Math.round(dryKg / CAVAN_KG / areaHa),
    unusual:  tHa < USUAL_YIELD.low || tHa > USUAL_YIELD.high,
  };
}
