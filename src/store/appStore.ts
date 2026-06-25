import { create } from 'zustand';
import { Vibration } from 'react-native';
import type { UserProfile, Farm, Recommendation } from '@/services/apiService';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';

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
  setupComplete: boolean;
  setupStep: string | null;   // current setup screen, persisted for resume-on-reopen
  setupData: any;             // accumulated farmData for the current setup step
  latestRecommendation: Recommendation | null;
  latestGuide: any | null;    // Gemini-generated planting guide (app-shaped steps)
  notifications: AppNotification[];
  pendingGuideCategory: string | null;   // category for the Planting Guide screen to open
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
  setLatestRecommendation:  (rec: Recommendation | null) => void;
  setLatestGuide:           (guide: any | null) => void;
  addGuideStep:             (step: any) => void;
  addNotification:          (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead:     (id: string) => void;
  markAllNotificationsRead: () => void;
  hydrateNotifications:     (list: AppNotification[]) => void;
  setPendingGuideCategory:  (cat: string | null) => void;
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
  setupComplete:        false,
  setupStep:            null,
  setupData:            {},
  latestRecommendation: null,
  latestGuide:          null,
  notifications:        [],
  pendingGuideCategory: null,
  progressLogs:         [],
  activeCycle:          null,
  completedGuideSteps:  [],
  notificationsEnabled: true,
  weatherAlertsEnabled: true,

  setUser:                 user    => set({ user }),
  setFarms:                farms   => set({ farms }),
  setFarmsLoaded:          loaded  => set({ farmsLoaded: loaded }),
  setSetupComplete:        done    => {
    set({ setupComplete: done });
    // Persist so an unfinished setup resumes after the app is quit and reopened
    storage.setItem(STORAGE_KEYS.SETUP_COMPLETE, done).catch(() => {});
    // Once finished, clear the saved step so a future setup starts fresh
    if (done) {
      set({ setupStep: null, setupData: {} });
      storage.removeItem(STORAGE_KEYS.SETUP_PROGRESS).catch(() => {});
    }
  },
  setSetupProgress:        (step, data) => {
    set({ setupStep: step, setupData: data });
    storage.setItem(STORAGE_KEYS.SETUP_PROGRESS, { step, data }).catch(() => {});
  },
  addFarm:                 farm    => set(s => ({ farms: [...s.farms, farm] })),
  removeFarm:              id      => set(s => ({ farms: s.farms.filter(f => f.id !== id) })),
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

  setProgressLogs: (logs) => {
    set({ progressLogs: logs });
    storage.setItem(STORAGE_KEYS.PROGRESS_LOGS, logs).catch(() => {});
  },
  addProgressLog: (log) => {
    const list = [log, ...useAppStore.getState().progressLogs].slice(0, 200);
    set({ progressLogs: list });
    storage.setItem(STORAGE_KEYS.PROGRESS_LOGS, list).catch(() => {});
  },
  hydrateProgressLogs: (logs) => set({ progressLogs: logs }),
  setActiveCycle:          cycle => set({ activeCycle: cycle }),

  toggleGuideStepDone: (stepId) => {
    const current = useAppStore.getState().completedGuideSteps;
    const next = current.includes(stepId)
      ? current.filter(id => id !== stepId)
      : [...current, stepId];
    set({ completedGuideSteps: next });
    storage.setItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS, next).catch(() => {});
  },
  hydrateGuideSteps: (stepIds) => set({ completedGuideSteps: stepIds }),

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
    user: null, farms: [], farmsLoaded: false, setupComplete: false,
    setupStep: null, setupData: {},
    latestRecommendation: null, latestGuide: null,
    notifications: [], pendingGuideCategory: null,
    progressLogs: [], activeCycle: null, completedGuideSteps: [],
    notificationsEnabled: true, weatherAlertsEnabled: true,
  }),
}));
