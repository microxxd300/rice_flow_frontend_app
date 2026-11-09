import { useAppStore } from '@/store/appStore';
import { apiRecommendations, type Farm } from '@/services/apiService';
import { fetchActiveCycleLogs, mergeLogs } from '@/utils/progressLogs';

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
  // A slower answer must not land on a farm the farmer has switched to since
  const stillSelected = () => useAppStore.getState().selectedFarmId === farmId;

  // ── Latest recommendation for this farm ──────────────────────────────────
  try {
    const res  = await apiRecommendations.history(farmId);
    const recs = res.data ?? [];
    const latest = recs.length
      ? recs.reduce((max, r) => (((r as any).id ?? 0) > ((max as any).id ?? 0) ? r : max), recs[0])
      : null;
    if (stillSelected()) store.setLatestRecommendation(latest);
  } catch {
    if (stillSelected()) store.setLatestRecommendation(null);
  }

  // ── Active cycle + its progress logs ─────────────────────────────────────
  // Through the Progress screen's loader: the store only accepts logs in the app's shape,
  // so raw server rows would empty the list
  try {
    const { cycle, logs } = await fetchActiveCycleLogs(farmId);
    if (!stillSelected()) return;
    store.setActiveCycle(cycle);
    store.setProgressLogs(mergeLogs(logs, useAppStore.getState().progressLogs, cycle?.id));
  } catch {
    // Offline: the farm stays empty until the Progress screen loads it
  }
}
