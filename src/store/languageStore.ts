import { create } from 'zustand';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import type { Language } from '@/i18n/translations';

/**
 * Language is stored PER USER, not per device.
 *
 * A single device is often shared (a barangay demo, a family phone), so a
 * device-wide key meant the first farmer's choice leaked into every account
 * that logged in afterwards — a brand-new user would open the app in Filipino
 * without ever having picked it. Keying on the user id gives each account its
 * own preference: a returning farmer keeps Bisaya, while a newly registered
 * account has no saved value and falls through to DEFAULT_LANGUAGE.
 */
const DEFAULT_LANGUAGE: Language = 'en';

const LEGACY_KEY = 'app_language';                       // device-wide, pre per-user
const keyFor = (userId: string) => `app_language:${userId}`;

const VALID: Language[] = ['fil', 'en', 'ceb'];
const isValid = (v: any): v is Language => VALID.includes(v);

/** Read the signed-in user's id straight from storage. Reading it here (rather
 *  than from the auth store) keeps this independent of provider mount order —
 *  loadLanguage can run before auth finishes initialising. */
async function currentUserId(): Promise<string | null> {
  const user = await storage.getItem<{ id?: string | number }>(STORAGE_KEYS.USER);
  const id = user?.id;
  return id === undefined || id === null ? null : String(id);
}

interface LanguageState {
  language: Language;
  setLanguage:   (lang: Language) => Promise<void>;
  loadLanguage:  () => Promise<void>;
  resetLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,

  setLanguage: async (lang) => {
    set({ language: lang });
    const userId = await currentUserId();
    // Signed out (e.g. picking a language on the auth screens): keep the choice
    // in memory only, so it can't bleed into the next account on this device.
    if (userId) await storage.setItem(keyFor(userId), lang);
  },

  /** Load the signed-in user's saved language. Call after login so the new
   *  session picks up that account's preference instead of the previous one's. */
  loadLanguage: async () => {
    // Drop the old device-wide key so a previous user's choice can never be
    // inherited. Everyone resets to English once; per-user takes over after.
    try { await storage.removeItem(LEGACY_KEY); } catch {}

    const userId = await currentUserId();
    if (!userId) {
      set({ language: DEFAULT_LANGUAGE });
      return;
    }
    const saved = await storage.getItem<Language>(keyFor(userId));
    // No saved value = new account → English.
    set({ language: isValid(saved) ? saved : DEFAULT_LANGUAGE });
  },

  /** Logout: drop back to the default in memory. The user's own key stays on
   *  disk, so their language is restored when they log back in. */
  resetLanguage: () => set({ language: DEFAULT_LANGUAGE }),
}));
