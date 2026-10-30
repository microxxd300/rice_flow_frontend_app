import { apiProgress } from '@/services/apiService';

/**
 * Field logs: the server's shape (log_date, issue_type, growth_stage id) and the
 * app's shape (logDate, observedIssue, growthStage name) the screens render.
 * Progress and Profile → Refresh both load logs through here.
 */

// The backend keeps its own stage list (GrowthStage.stage_no) and issue choices;
// these map the app's labels onto them so a saved log is accepted by the server.
export const STAGE_NO: Record<string, number> = {
  'Land Prep & Planting': 1, 'Early Growth': 2, 'Tillering': 3, 'Stem Elongation': 4,
  'Panicle Initiation': 5, 'Heading': 6, 'Grain Filling': 7,
};

export const ISSUE_TO_API: Record<string, string> = {
  Insect: 'pest', Disease: 'disease', Drought: 'weather', Flood: 'weather', Other: 'other',
};
export const ISSUE_FROM_API: Record<string, string> = {
  pest: 'Insect', disease: 'Disease', weather: 'Weather', nutrient: 'Nutrient', other: 'Other',
};

/** A log in the app's shape (server rows saved by older builds are not). */
export const isAppLog = (l: any): boolean =>
  !!l && typeof l.id === 'string' && typeof l.logDate === 'string';

/** Server log rows → the app's log shape. `stages` is the GrowthStage list. */
export function normalizeServerLogs(rows: any[], stages: any[]): any[] {
  const stageNoById = new Map(stages.map((g: any) => [g.id, g.stage_no]));
  return rows.map((l: any) => {
    const no = stageNoById.get(l.growth_stage);
    return {
      id:            String(l.id),
      cycleId:       String(l.farm_cycle),
      logDate:       l.log_date,
      growthStage:   Object.keys(STAGE_NO).find(k => STAGE_NO[k] === no) ?? '',
      observedIssue: ISSUE_FROM_API[l.issue_type] ?? 'None',
      severity:      String(l.severity ?? '').replace(/^./, (ch: string) => ch.toUpperCase()),
      actionTaken:   l.action_taken,
      notes:         l.observation,
    };
  });
}

/**
 * Server logs first, then local-only ones. The local copy wins for a log the server
 * also has, so Drought vs Flood (both "weather" on the server) is kept on this phone.
 */
export function mergeLogs(server: any[], existing: any[]): any[] {
  const local = existing.filter(isAppLog);
  return [
    ...server.map(n => ({ ...n, ...local.find(e => e.id === n.id) })),
    ...local.filter(e => !server.some(n => n.id === e.id)),
  ];
}

type CycleLogs = { cycle: any; stages: any[]; logs: any[] };
// Last result per farm for this app session, so the Progress tab opens with it at
// once (and refreshes quietly) instead of showing skeletons on every visit
const lastByFarm = new Map<number | undefined, CycleLogs>();

/** The farm's active (else latest) cycle, the stage list, and that cycle's logs in the app's shape. */
export async function fetchActiveCycleLogs(farmId?: number): Promise<CycleLogs> {
  const [cyclesRes, stagesRes] = await Promise.all([
    apiProgress.listCycles(farmId),
    apiProgress.growthStages().catch(() => ({ data: [] as any[] })),
  ]);
  const cycles = cyclesRes.data;
  const cycle  = cycles.find((c: any) => c.status === 'active') ?? cycles[0] ?? null;
  const rows   = cycle ? (await apiProgress.listLogs(cycle.id)).data : [];
  const result = { cycle, stages: stagesRes.data, logs: normalizeServerLogs(rows, stagesRes.data) };
  lastByFarm.set(farmId, result);
  return result;
}

/** The last fetchActiveCycleLogs result for this farm in this session, if any. */
export function cachedActiveCycleLogs(farmId?: number): CycleLogs | undefined {
  return lastByFarm.get(farmId);
}

/** Drop the remembered results, e.g. on logout so the next farmer never sees them. */
export function clearCycleLogsCache(): void {
  lastByFarm.clear();
}
