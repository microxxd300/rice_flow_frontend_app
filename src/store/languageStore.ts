import { create } from 'zustand';
import { storage } from '@/services/storage';
import type { Language } from '@/i18n/translations';

const STORAGE_KEY = 'app_language';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  setLanguage: async (lang) => {
    set({ language: lang });
    await storage.setItem(STORAGE_KEY, lang);
  },

  loadLanguage: async () => {
    const saved = await storage.getItem<Language>(STORAGE_KEY);
    if (saved && ['fil', 'en', 'ceb'].includes(saved)) {
      set({ language: saved });
    }
  },
}));
