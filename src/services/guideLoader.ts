import { apiGuides } from '@/services/apiService';
import { useAppStore, guideVarietyId } from '@/store/appStore';
import type { Language } from '@/i18n/translations';

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

  const state = useAppStore.getState();
  const request = apiGuides.generate(recId, {
    variety:  guideVarietyId(),
    season:   (state.latestGuide as any)?.season ?? 'Wet Season',
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

/** True when the farmer has a guide on the phone that is in another language. */
export function guideNeedsTranslation(language: Language): boolean {
  const guide = useAppStore.getState().latestGuide as any;
  return !!guide?.steps?.length && !!guide.language && guide.language !== language;
}
