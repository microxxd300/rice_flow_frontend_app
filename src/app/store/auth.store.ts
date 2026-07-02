import { create } from 'zustand';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { authLogin, authRegister, apiFarms } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';

/**
 * Restore the user's last-selected farm after the farms list loads.
 * Reads the persisted id; if it's missing or no longer exists, defaults to the
 * first farm. Keeps the "current farm" stable across app restarts.
 */
async function restoreSelectedFarm(farms: any[]): Promise<void> {
  let savedId: number | null = null;
  try { savedId = await storage.getItem<number>(STORAGE_KEYS.SELECTED_FARM); } catch {}
  const valid = savedId != null && farms.some(f => f.id === savedId);
  useAppStore.getState().hydrateSelectedFarm(valid ? savedId : (farms[0]?.id ?? null));
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    password2: string;
    first_name: string;
    last_name: string;
    barangay: string;
    municipality: string;
    province: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

/**
 * Decide whether the user still needs to finish the setup flow, and load it into
 * the app store. The flag is persisted, so an unfinished setup resumes after the
 * app is quit and reopened. First time (no stored value): a user who already has
 * farms is treated as set up; a brand-new user with no farms still needs setup.
 */
async function establishSetupFlag(farmCount: number): Promise<void> {
  let complete = await storage.getItem<boolean>(STORAGE_KEYS.SETUP_COMPLETE);
  if (complete === null) {
    complete = farmCount > 0;
    await storage.setItem(STORAGE_KEYS.SETUP_COMPLETE, complete);
  }
  useAppStore.getState().setSetupComplete(complete);

  // If setup is unfinished, restore the exact step + data so the user resumes there
  if (!complete) {
    const progress = await storage.getItem<{ step: string; data: any }>(STORAGE_KEYS.SETUP_PROGRESS);
    if (progress?.step) {
      useAppStore.setState({ setupStep: progress.step, setupData: progress.data ?? {} });
    }
  }

  // Restore the in-app notifications so they survive an app restart
  const stored = await storage.getItem<any[]>(STORAGE_KEYS.NOTIFICATIONS);
  if (Array.isArray(stored)) {
    useAppStore.getState().hydrateNotifications(stored);
  }

  // Restore the farmer's saved progress logs
  const storedLogs = await storage.getItem<any[]>(STORAGE_KEYS.PROGRESS_LOGS);
  if (Array.isArray(storedLogs)) {
    useAppStore.getState().hydrateProgressLogs(storedLogs);
  }

  // Restore the last recommendation + Gemini-generated guide so the Planting tab
  // shows real content (not mock) after restart, and auto-refresh has a recId.
  const storedRec = await storage.getItem<any>(STORAGE_KEYS.LATEST_REC);
  if (storedRec) useAppStore.setState({ latestRecommendation: storedRec });
  const storedGuide = await storage.getItem<any>(STORAGE_KEYS.LATEST_GUIDE);
  if (storedGuide) useAppStore.setState({ latestGuide: storedGuide });

  // Restore the farmer's "I did this step" checks so the Gabay card reflects reality
  const storedSteps = await storage.getItem<string[]>(STORAGE_KEYS.COMPLETED_GUIDE_STEPS);
  if (Array.isArray(storedSteps)) {
    useAppStore.getState().hydrateGuideSteps(storedSteps);
  }

  // Restore notification preferences (gate the bell + haptic)
  const notifOn   = await storage.getItem<boolean>(STORAGE_KEYS.NOTIF_ENABLED);
  const weatherOn = await storage.getItem<boolean>(STORAGE_KEYS.WEATHER_ALERTS);
  useAppStore.getState().hydrateNotifSettings(
    notifOn   == null ? true : !!notifOn,
    weatherOn == null ? true : !!weatherOn,
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,

  setUser: user => set({ user }),
  setIsAuthenticated: value => set({ isAuthenticated: value }),
  setIsLoading: value => set({ isLoading: value }),

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authLogin({ email, password });
      const { user: profile, access_token, refresh_token } = res.data;

      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      // Guard against legacy accounts where last_name == first_name (old register
      // bug). Don't display "Juan Juan" — only join when the parts actually differ.
      const fn = (profile.first_name ?? '').trim();
      const ln = (profile.last_name  ?? '').trim();
      const fullName = ln && ln !== fn ? `${fn} ${ln}` : fn;
      const storeUser: User = {
        id: String(profile.id),
        email: profile.email,
        name: fullName,
      };

      await storage.setItem(STORAGE_KEYS.USER, storeUser);
      useAppStore.getState().setUser(profile);

      // Pre-load farms into global store
      let farmCount = 0;
      try {
        const farmsRes = await apiFarms.list();
        useAppStore.getState().setFarms(farmsRes.data);
        await restoreSelectedFarm(farmsRes.data);
        farmCount = farmsRes.data.length;
      } catch {}
      await establishSetupFlag(farmCount);
      useAppStore.getState().setFarmsLoaded(true);

      set({ user: storeUser, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      await authRegister(data);
      set({ isLoading: false });
      // After register, caller navigates to Login — no auto-login here
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER);
      await storage.removeItem(STORAGE_KEYS.SETUP_COMPLETE);
      await storage.removeItem(STORAGE_KEYS.SETUP_PROGRESS);
      await storage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      await storage.removeItem(STORAGE_KEYS.PROGRESS_LOGS);
      await storage.removeItem(STORAGE_KEYS.LATEST_REC);
      await storage.removeItem(STORAGE_KEYS.LATEST_GUIDE);
      await storage.removeItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS);
      await storage.removeItem(STORAGE_KEYS.NOTIF_ENABLED);
      await storage.removeItem(STORAGE_KEYS.WEATHER_ALERTS);
      await storage.removeItem(STORAGE_KEYS.PROFILE_OVERRIDES);
      useAppStore.getState().reset();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  initializeAuth: async () => {
    try {
      const token = await storage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        set({ isAuthenticated: false, user: null, isLoading: false });
        return;
      }
      const savedUser = await storage.getItem<User>(STORAGE_KEYS.USER);
      if (savedUser) {
        // Dedupe legacy "Juan Juan" names baked into older AsyncStorage records
        // so existing accounts stop displaying the doubled form without re-login.
        const cleanName = (() => {
          const parts = (savedUser.name ?? '').trim().split(/\s+/).filter(Boolean);
          const uniq: string[] = [];
          for (const w of parts) if (uniq[uniq.length - 1]?.toLowerCase() !== w.toLowerCase()) uniq.push(w);
          return uniq.join(' ');
        })();
        const cleanUser = cleanName === savedUser.name ? savedUser : { ...savedUser, name: cleanName };
        if (cleanName !== savedUser.name) {
          await storage.setItem(STORAGE_KEYS.USER, cleanUser);
        }
        // Set authenticated immediately so app doesn't block on farms fetch
        set({ user: cleanUser, isAuthenticated: true, isLoading: false });
        // Load farms in background, decide setup state, then mark loaded —
        // RootNavigator waits for farmsLoaded, so the setup flag is ready by then
        apiFarms.list()
          .then(async res => {
            useAppStore.getState().setFarms(res.data);
            await restoreSelectedFarm(res.data);
            return res.data.length;
          })
          .catch(() => 0)
          .then(count => establishSetupFlag(count))
          .finally(() => useAppStore.getState().setFarmsLoaded(true));
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
}));
