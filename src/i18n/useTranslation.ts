import { useLanguageStore } from '@/store/languageStore';
import { translations } from './translations';

export function useTranslation() {
  const language = useLanguageStore(s => s.language);
  return translations[language];
}
