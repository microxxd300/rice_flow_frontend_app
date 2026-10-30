import { create } from 'zustand';
import { Vibration } from 'react-native';
import type { UserProfile, Farm, Recommendation } from '@/services/apiService';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { isAppLog } from '@/utils/progressLogs';

export interface AppNotification {
  id:        string;
  title:     string;
  body:      string;
  category?: string;          // optional Planting Guide category to deep-link to
  icon?:     string;          // Ionicons name (default chosen by category)
  createdAt: number;          // ms epoch
  read:      boolean;
}

interface AppState {
  user: UserProfile | null;
  farms: Farm[];
  farmsLoaded: boolean;
  selectedFarmId: number | null;   // the farm the app is currently showing
  setupComplete: boolean;
  setupStep: string | null;   // current setup screen, persisted for resume-on-reopen
  setupData: any;             // accumulated farmData for the current setup step
  latestRecommendation: Recommendation | null;
  latestGuide: any | null;    // Gemini-generated planting guide (app-shaped steps)
  notifications: AppNotification[];
  pendingGuideCategory: string | null;   // category for the Planting Guide screen to open
  entryTab: string | null;   // tab to open when setup finishes (kept here: the navigator remounts)
  pickedVariety: { recId: number; varietyId: number } | null;   // set the moment the farmer taps a variety
  progressLogs: any[];
  activeCycle: any | null;
  completedGuideSteps: string[];   // step IDs marked done by farmer in PlantingGuide
  notificationsEnabled: boolean;
  weatherAlertsEnabled: boolean;

  setUser:                  (user: UserProfile | null) => void;
  setFarms:                 (farms: Farm[]) => void;
  setFarmsLoaded:           (loaded: boolean) => void;
  setSetupComplete:         (done: boolean) => void;
  setSetupProgress:         (step: string, data: any) => void;
  addFarm:                  (farm: Farm) => void;
  removeFarm:               (id: number) => void;
  selectFarm:               (id: number) => void;   // switch farm: clears per-farm data so it reloads
  hydrateSelectedFarm:      (id: number | null) => void;
  setLatestRecommendation:  (rec: Recommendation | null) => void;
  setLatestGuide:           (guide: any | null) => void;
  addGuideStep:             (step: any) => void;
  addNotification:          (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead:     (id: string) => void;
  markAllNotificationsRead: () => void;
  hydrateNotifications:     (list: AppNotification[]) => void;
  setPendingGuideCategory:  (cat: string | null) => void;
  setEntryTab:              (tab: string | null) => void;
  setPickedVariety:         (pick: { recId: number; varietyId: number } | null) => void;
  setProgressLogs:          (logs: any[]) => void;
  addProgressLog:           (log: any) => void;
  hydrateProgressLogs:      (logs: any[]) => void;
  setActiveCycle:           (cycle: any | null) => void;
  toggleGuideStepDone:      (stepId: string) => void;
  hydrateGuideSteps:        (stepIds: string[]) => void;
  setNotificationsEnabled:  (on: boolean) => void;
  setWeatherAlertsEnabled:  (on: boolean) => void;
  hydrateNotifSettings:     (notif: boolean, weather: boolean) => void;
  reset:                    () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user:                 null,
  farms:                [],
  farmsLoaded:          false,
  selectedFarmId:       null,
  setupComplete:        false,
  setupStep:            null,
  setupData:            {},
  latestRecommendation: null,
  latestGuide:          null,
  notifications:        [],
  pendingGuideCategory: null,
  entryTab:             null,
  pickedVariety:        null,
  progressLogs:         [],
  activeCycle:          null,
  completedGuideSteps:  [],
  notificationsEnabled: true,
  weatherAlertsEnabled: true,

  setUser:                 user    => set({ user }),
  setFarms:                farms   => {
    // Dedupe by id defensively — a duplicate farm would collide React list keys.
    const seen = new Set<number>();
    const unique = (farms ?? []).filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    set({ farms: unique });
  },
  setFarmsLoaded:          loaded  => set({ farmsLoaded: loaded }),
  setSetupComplete:        done    => {
    // Flip memory and clear the resume point in ONE update, before any async
    // work. A half-applied state (complete, but a saved step still present) is
    // what let a late background read bounce the user back into setup.
    if (done) {
      set({ setupComplete: true, setupStep: null, setupData: {} });
      storage.removeItem(STORAGE_KEYS.SETUP_PROGRESS).catch(() => {});
    } else {
      set({ setupComplete: false });
    }
    // Persist so an unfinished setup resumes after the app is quit and reopened
    storage.setItem(STORAGE_KEYS.SETUP_COMPLETE, done).catch(() => {});
  },
  setSetupProgress:        (step, data) => {
    // Once setup is finished, stop recording resume points. Setup screens write
    // their step on mount, and they briefly remount while the navigator tree
    // swaps over to the app — without this guard that write re-arms the setup
    // flow and the user gets thrown back to the step they just left.
    if (useAppStore.getState().setupComplete) return;
    set({ setupStep: step, setupData: data });
    storage.setItem(STORAGE_KEYS.SETUP_PROGRESS, { step, data }).catch(() => {});
  },
  addFarm:                 farm    => {
    // Auto-select a newly added farm so the app immediately shows it.
    // Replace an existing entry with the same id instead of appending a
    // duplicate (the backend dedup guard can return an already-known farm).
    set(s => {
      const others = s.farms.filter(f => f.id !== farm.id);
      return { farms: [...others, farm], selectedFarmId: farm.id };
    });
    storage.setItem(STORAGE_KEYS.SELECTED_FARM, farm.id).catch(() => {});
  },
  removeFarm:              id      => {
    set(s => {
      const farms = s.farms.filter(f => f.id !== id);
      // If the removed farm was selected, fall back to the first remaining farm.
      const selectedFarmId = s.selectedFarmId === id
        ? (farms[0]?.id ?? null)
        : s.selectedFarmId;
      return { farms, selectedFarmId };
    });
    storage.setItem(STORAGE_KEYS.SELECTED_FARM, useAppStore.getState().selectedFarmId).catch(() => {});
  },
  selectFarm: (id) => {
    const state = useAppStore.getState();
    if (state.selectedFarmId === id) return;   // no-op if already selected
    // Switch farm: clear the previous farm's per-farm data so screens reload
    // fresh for the newly selected farm (and don't briefly show stale data).
    set({
      selectedFarmId:       id,
      latestRecommendation: null,
      latestGuide:          null,
      activeCycle:          null,
      progressLogs:         [],
      completedGuideSteps:  [],
    });
    storage.setItem(STORAGE_KEYS.SELECTED_FARM, id).catch(() => {});
    storage.removeItem(STORAGE_KEYS.LATEST_REC).catch(() => {});
    storage.removeItem(STORAGE_KEYS.LATEST_GUIDE).catch(() => {});
    storage.removeItem(STORAGE_KEYS.PROGRESS_LOGS).catch(() => {});
    storage.removeItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS).catch(() => {});
  },
  hydrateSelectedFarm: (id) => set({ selectedFarmId: id }),
  setLatestRecommendation: (rec) => {
    set({ latestRecommendation: rec });
    storage.setItem(STORAGE_KEYS.LATEST_REC, rec).catch(() => {});
  },
  setLatestGuide: (guide) => {
    set({ latestGuide: guide });
    storage.setItem(STORAGE_KEYS.LATEST_GUIDE, guide).catch(() => {});
  },
  addGuideStep: (step) => {
    const state = useAppStore.getState();
    const guide = state.latestGuide;
    if (!guide || !step) return;
    const existing = Array.isArray(guide.steps) ? guide.steps : [];
    // Dedupe by id so retries don't double-insert
    if (existing.some((s: any) => String(s.id) === String(step.id))) return;
    const merged = [...existing, step].sort(
      (a: any, b: any) => (a.daysAfterPlanting ?? 0) - (b.daysAfterPlanting ?? 0),
    );
    const next = { ...guide, steps: merged };
    set({ latestGuide: next });
    storage.setItem(STORAGE_KEYS.LATEST_GUIDE, next).catch(() => {});
  },

  addNotification: (n) => {
    const state = useAppStore.getState();
    // Respect the farmer's notification preferences (set from Profile)
    if (!state.notificationsEnabled) return;
    // Weather-alert notifications (irrigation/flood category) can be muted separately
    if (!state.weatherAlertsEnabled && n.category === 'irrigation') return;

    const next: AppNotification = {
      id:        `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      read:      false,
      ...n,
    };
    // Keep only the 3 most recent so the bell panel stays compact
    const list = [next, ...state.notifications].slice(0, 3);
    set({ notifications: list });
    storage.setItem(STORAGE_KEYS.NOTIFICATIONS, list).catch(() => {});
    try { Vibration.vibrate(50); } catch {}   // short haptic buzz
  },

  markNotificationRead: (id) => {
    const list = useAppStore.getState().notifications.map(n => n.id === id ? { ...n, read: true } : n);
    set({ notifications: list });
    storage.setItem(STORAGE_KEYS.NOTIFICATIONS, list).catch(() => {});
  },

  markAllNotificationsRead: () => {
    const list = useAppStore.getState().notifications.map(n => ({ ...n, read: true }));
    set({ notifications: list });
    storage.setItem(STORAGE_KEYS.NOTIFICATIONS, list).catch(() => {});
  },

  hydrateNotifications: (list) => set({ notifications: list.slice(0, 3) }),

  setPendingGuideCategory: (cat) => set({ pendingGuideCategory: cat }),
  setEntryTab: (tab) => set({ entryTab: tab }),
  setPickedVariety: (pick) => set({ pickedVariety: pick }),

  setProgressLogs: (logs) => {
    // Only logs in the app's shape; raw server rows rendered as blank rows with duplicate keys
    const clean = logs.filter(isAppLog);
    set({ progressLogs: clean });
    storage.setItem(STORAGE_KEYS.PROGRESS_LOGS, clean).catch(() => {});
  },
  addProgressLog: (log) => {
    const list = [log, ...useAppStore.getState().progressLogs].slice(0, 200);
    set({ progressLogs: list });
    storage.setItem(STORAGE_KEYS.PROGRESS_LOGS, list).catch(() => {});
  },
  hydrateProgressLogs: (logs) => set({ progressLogs: logs.filter(isAppLog) }),
  setActiveCycle:          cycle => set({ activeCycle: cycle }),

  toggleGuideStepDone: (stepId) => {
    const current = useAppStore.getState().completedGuideSteps;
    const next = current.includes(stepId)
      ? current.filter(id => id !== stepId)
      : [...current, stepId];
    set({ completedGuideSteps: next });
    storage.setItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS, next).catch(() => {});
  },
  hydrateGuideSteps: (stepIds) => {
    set({ completedGuideSteps: stepIds });
    storage.setItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS, stepIds).catch(() => {});
  },

  setNotificationsEnabled: (on) => {
    set({ notificationsEnabled: on });
    storage.setItem(STORAGE_KEYS.NOTIF_ENABLED, on).catch(() => {});
  },
  setWeatherAlertsEnabled: (on) => {
    set({ weatherAlertsEnabled: on });
    storage.setItem(STORAGE_KEYS.WEATHER_ALERTS, on).catch(() => {});
  },
  hydrateNotifSettings: (notif, weather) => set({
    notificationsEnabled: notif,
    weatherAlertsEnabled: weather,
  }),

  reset: () => set({
    user: null, farms: [], farmsLoaded: false, selectedFarmId: null, setupComplete: false,
    setupStep: null, setupData: {},
    latestRecommendation: null, latestGuide: null,
    notifications: [], pendingGuideCategory: null, entryTab: null, pickedVariety: null,
    progressLogs: [], activeCycle: null, completedGuideSteps: [],
    notificationsEnabled: true, weatherAlertsEnabled: true,
  }),
}));

/**
 * The variety the guide is for, sent with guide requests so a refresh keeps the variety
 * the farmer picked ("Use this instead") instead of switching back to the top-ranked one:
 * the pick just made for this recommendation, else the variety of this farm's guide.
 * Undefined when neither applies; the server then uses the farm's earlier pick.
 */
export function guideVarietyId(): number | undefined {
  const { latestGuide, latestRecommendation: rec, pickedVariety } = useAppStore.getState();
  if (!rec) return undefined;
  if (pickedVariety?.recId === rec.id) return pickedVariety.varietyId;
  // The previous farm's guide can still be on screen right after a new scan
  if (latestGuide?.farm !== rec.farm) return undefined;
  const id = latestGuide?.variety;
  return rec.results?.some(r => r.variety.id === id) ? id : undefined;
}
