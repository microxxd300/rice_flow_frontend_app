import { useLanguageStore } from '@/store/languageStore';
import { storage } from '@/services/storage';

jest.mock('@/services/storage', () => ({
  storage: { getItem: jest.fn(), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) },
}));

const getItem = storage.getItem as jest.Mock;
// storage.getItem(USER) then storage.getItem(language key)
const signedIn = (saved: string | null) =>
  getItem.mockImplementation(async (key: string) => (key.startsWith('app_language:') ? saved : { id: 7 }));

describe('loadLanguage', () => {
  beforeEach(() => { jest.clearAllMocks(); useLanguageStore.getState().resetLanguage(); });

  it("a new account keeps the language picked on the welcome screen, and saves it", async () => {
    signedIn(null);
    await useLanguageStore.getState().setLanguage('ceb');   // picked while signed out
    await useLanguageStore.getState().loadLanguage();
    expect(useLanguageStore.getState().language).toBe('ceb');
    expect(storage.setItem).toHaveBeenCalledWith('app_language:7', 'ceb');
  });

  it('a language picked on the welcome screen wins at login, and is saved', async () => {
    getItem.mockResolvedValue(null);                         // signed out
    await useLanguageStore.getState().setLanguage('ceb');
    signedIn('fil');
    await useLanguageStore.getState().loadLanguage();
    expect(useLanguageStore.getState().language).toBe('ceb');
    expect(storage.setItem).toHaveBeenCalledWith('app_language:7', 'ceb');
  });

  it("with no pick on the welcome screen, the account's saved language is used", async () => {
    signedIn('fil');
    await useLanguageStore.getState().loadLanguage();
    expect(useLanguageStore.getState().language).toBe('fil');
  });

  it('a new account with nothing picked is in English', async () => {
    signedIn(null);
    await useLanguageStore.getState().loadLanguage();
    expect(useLanguageStore.getState().language).toBe('en');
  });
});
