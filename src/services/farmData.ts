import { useAppStore } from '@/store/appStore';
import { apiRecommendations, apiProgress, type Farm } from '@/services/apiService';

/**
 * Load the global per-farm data (recommendation, active cycle, progress logs)
 * for a specific farm into the app store. Called after the user switches farms
 * so the dashboard, progress, and guide screens reflect the newly selected farm.
 *
 * The planting guide is intentionally left null here — it regenerates lazily
 * (via Gemini) when the Guide tab is opened, keyed off the new recommendation.
 *
 * Each fetch is independently guarded so a single failure doesn't block the rest.
 */
export async function loadFarmData(farm: Farm): Promise<void> {
  const store  = useAppStore.getState();
  const farmId = farm.id;

  // ── Latest recommendation for this farm ──────────────────────────────────
  try {
    const res  = await apiRecommendations.history(farmId);
    const recs = res.data ?? [];
    const latest = recs.length
      ? recs.reduce((max, r) => (((r as any).id ?? 0) > ((max as any).id ?? 0) ? r : max), recs[0])
      : null;
    store.setLatestRecommendation(latest);
  } catch {
    store.setLatestRecommendation(null);
  }

  // ── Active cycle + its progress logs ─────────────────────────────────────
  try {
    const res    = await apiProgress.listCycles(farmId);
    const cycles = (res.data ?? []) as any[];
    const active = cycles.find(c => c.status === 'active') ?? cycles[0] ?? null;
    store.setActiveCycle(active);

    if (active?.id) {
      try {
        const logsRes = await apiProgress.listLogs(active.id);
        store.setProgressLogs((logsRes.data ?? []) as any[]);
      } catch {
        store.setProgressLogs([]);
      }
    } else {
      store.setProgressLogs([]);
    }
  } catch {
    store.setActiveCycle(null);
    store.setProgressLogs([]);
  }
}
