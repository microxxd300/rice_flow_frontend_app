import { apiGuides, apiRecommendations } from '@/services/apiService';
import { useAppStore, guideVarietyId } from '@/store/appStore';
import type { Language } from '@/i18n/translations';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';

// One request per recommendation + language at a time. The language switch in
// Profile and the Planting screen can both ask for the same guide; the second
// caller waits for the first request instead of sending another.
const inflight = new Map<string, Promise<any>>();

/**
 * Load the PalayCheck planting guide for a recommendation in a language and put it in the
 * store. The steps are saved on the server; the language only changes their wording.
 */
export function loadGuide(recId: number, language: Language, stillWanted?: () => boolean): Promise<any> {
  const key = `${recId}:${language}`;
  const running = inflight.get(key);
  if (running) return running;

  const request = apiGuides.generate(recId, {
    variety:  guideVarietyId(),   // the server picks this crop's guide and names its season
    language,
  })
    .then(res => {
      if (stillWanted && !stillWanted()) return res.data;
      const store = useAppStore.getState();
      store.setLatestGuide(res.data);
      // Restore check-offs from the server rows (survives reinstall / other devices).
      const serverDone = ((res.data?.steps ?? []) as any[])
        .filter(st => st.is_completed)
        .map(st => String(st.id));
      // A rebuilt guide (new PalayCheck plan) has brand-new step rows, so the
      // locally-stored ids are stale — the server is authoritative and we
      // replace. A SAVED guide is the same rows, so union keeps a step
      // logged just before this response.
      if ((res.data as any)?.source !== 'SAVED') {
        store.hydrateGuideSteps(serverDone);
        // A new guide moves the crop to its sowing day: reload it, or Home shows the old day
        void refreshCycle();
      } else if (serverDone.length > 0) {
        store.hydrateGuideSteps(Array.from(new Set([...store.completedGuideSteps, ...serverDone])));
      }
      return res.data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

/**
 * After a login or reinstall only the farm comes back. Load its latest recommendation and
 * guide, so tasks, the sowing question, reminders and Progress work before Guide is opened.
 */
export async function restoreGuide(farmId: number, language: Language): Promise<void> {
  const stillWanted = () => useAppStore.getState().selectedFarmId === farmId;
  let recId = useAppStore.getState().latestRecommendation?.id;
  if (!recId) {
    const recs: any[] = (await apiRecommendations.history(farmId)).data ?? [];
    if (!recs.length || !stillWanted()) return;
    const latest = recs.reduce((max, r) => ((r.id ?? 0) > (max.id ?? 0) ? r : max), recs[0]);
    useAppStore.getState().setLatestRecommendation(latest);
    recId = latest.id;
  }
  await loadGuide(recId as number, language, stillWanted);
}

/** Reload the farm's crop cycle into the store: its stage and dates follow the guide. */
export async function refreshCycle(): Promise<void> {
  const farmId = useAppStore.getState().selectedFarmId ?? undefined;
  try {
    const { cycle } = await fetchActiveCycleLogs(farmId);
    if (cycle) useAppStore.getState().setActiveCycle(cycle);
  } catch { /* Progress reloads it when opened */ }
}

/**
 * The farmer's answer to "Did you sow already?": sown on `date` (YYYY-MM-DD, default
 * today) or not yet. The server moves the plan and the crop cycle to the answer; the
 * guide it sends back replaces the one on the phone, steps done included.
 */
export async function answerSowing(sown: boolean, date: string | undefined, language: Language): Promise<any> {
  const guide = useAppStore.getState().latestGuide as any;
  if (!guide?.id) throw new Error('No planting guide yet');
  const res = await apiGuides.sowing(Number(guide.id), { sown, date, language });
  const store = useAppStore.getState();
  store.setLatestGuide(res.data);
  store.hydrateGuideSteps(((res.data?.steps ?? []) as any[]).filter(st => st.is_completed).map(st => String(st.id)));
  await refreshCycle();
  return res.data;
}

/** True when the farmer has a guide on the phone that is in another language. */
export function guideNeedsTranslation(language: Language): boolean {
  const guide = useAppStore.getState().latestGuide as any;
  return !!guide?.steps?.length && !!guide.language && guide.language !== language;
}
