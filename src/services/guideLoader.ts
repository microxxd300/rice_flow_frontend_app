import { apiGuides } from '@/services/apiService';
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
export function loadGuide(recId: number, language: Language): Promise<any> {
  const key = `${recId}:${language}`;
  const running = inflight.get(key);
  if (running) return running;

  const request = apiGuides.generate(recId, {
    variety:  guideVarietyId(),   // the server picks this crop's guide and names its season
    language,
  })
    .then(res => {
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
      } else if (serverDone.length > 0) {
        store.hydrateGuideSteps(Array.from(new Set([...store.completedGuideSteps, ...serverDone])));
      }
      return res.data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
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
