/**
 * "Day 34 of 115" on Home: the crop's age from its planting (sowing) day and the season's
 * length up to the expected harvest. Dates are the
 * server's YYYY-MM-DD, read in the phone's time. Pure, so it can be tested.
 */
export interface CropDays {
  day:   number;          // 1 on the sowing day; 0 or less before it
  daysAfterSowing: number;   // what the farmer sees: 0 on the sowing day, as on the guide
  total: number | null;   // sowing to expected harvest, when the harvest date is known
  share: number;          // 0..1 of the season gone, for the progress bar
}

const DAY_MS = 24 * 60 * 60 * 1000;

function localDay(iso: string | null | undefined): number | null {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

export function cropDays(plantingDate?: string | null, harvestDate?: string | null, today: Date = new Date()): CropDays | null {
  const start = localDay(plantingDate);
  if (start == null) return null;
  const now   = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const day   = Math.round((now - start) / DAY_MS) + 1;
  const end   = localDay(harvestDate);
  const total = end != null && end > start ? Math.round((end - start) / DAY_MS) : null;
  const share = total ? Math.min(1, Math.max(0, day / total)) : 0;
  return { day, daysAfterSowing: day - 1, total, share };
}
