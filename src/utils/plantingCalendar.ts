/**
 * Planting calendar: how safe it is to plant in each month at this farm.
 *
 * A crop planted in a month grows through the next few months, so each month is
 * judged by the average rain over that growing window, not by the planting month
 * alone. Too much rain means flood risk (worse on flood-prone farms). Too little
 * means drought risk, which only matters when the crop depends on rain (rainfed
 * lowland and upland); irrigated fields get their water from the canal.
 */

export type MonthStatus = 'safe' | 'caution' | 'danger';
export type MonthReason = 'flood' | 'drought' | 'off_season' | null;

export interface CalendarMonth {
  rainfall:    number;   // average rain in the month itself (mm)
  windowRain:  number;   // average monthly rain over the growing window (mm)
  status:      MonthStatus;
  reason:      MonthReason;
}

export interface CalendarOptions {
  ecosystem?:     string;   // farm or variety ecosystem, e.g. 'irrigated_lowland'
  floodRisk?:     string;   // latest scan: 'Low' | 'Moderate' | 'High'
  varietySeason?: string;   // variety's preferred season: 'wet' | 'dry' | 'both'
  maturityDays?:  number;
}

// Average monthly rain (mm/month) over the growing window
const FLOOD_CAUTION  = 300;
const FLOOD_DANGER   = 400;
const DROUGHT_CAUTION = 150;
const DROUGHT_DANGER  = 100;
// Flood-prone farms reach the flood thresholds sooner
const FLOOD_RISK_SHIFT: Record<string, number> = { high: 50, moderate: 25 };

const WET_MONTHS = [4, 5, 6, 7, 8, 9];   // May–Oct (0-based), the Davao del Norte wet season

const worse = (s: MonthStatus): MonthStatus => (s === 'safe' ? 'caution' : 'danger');

export function plantingCalendar(monthlyRain: number[], opts: CalendarOptions = {}): CalendarMonth[] {
  const windowMonths = Math.max(3, Math.round((opts.maturityDays ?? 115) / 30));
  const shift        = FLOOD_RISK_SHIFT[String(opts.floodRisk ?? '').toLowerCase()] ?? 0;
  const rainDependent = /rainfed|upland/.test(String(opts.ecosystem ?? '').toLowerCase());
  const season       = String(opts.varietySeason ?? '').toLowerCase();
  const wetOnly      = season.includes('wet') && !season.includes('dry');
  const dryOnly      = season.includes('dry') && !season.includes('wet');

  return monthlyRain.map((rain, i) => {
    let sum = 0;
    for (let k = 0; k < windowMonths; k++) sum += monthlyRain[(i + k) % 12] ?? 0;
    const windowRain = Math.round(sum / windowMonths);

    let status: MonthStatus = 'safe';
    let reason: MonthReason = null;
    if (windowRain > FLOOD_DANGER - shift)        { status = 'danger';  reason = 'flood'; }
    else if (windowRain > FLOOD_CAUTION - shift)  { status = 'caution'; reason = 'flood'; }
    else if (rainDependent && windowRain < DROUGHT_DANGER)  { status = 'danger';  reason = 'drought'; }
    else if (rainDependent && windowRain < DROUGHT_CAUTION) { status = 'caution'; reason = 'drought'; }

    // Planting outside the variety's season is one level riskier
    const inWet = WET_MONTHS.includes(i);
    if ((wetOnly && !inWet) || (dryOnly && inWet)) {
      status = worse(status);
      reason = reason ?? 'off_season';
    }
    return { rainfall: rain, windowRain, status, reason };
  });
}
