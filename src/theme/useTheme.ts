import { useCallback } from 'react';
import { theme, Theme } from './index';

export const useTheme = (): Theme => {
  // Hook could be extended in the future for dark mode support
  return theme;
};

/**
 * Helper hook to use individual theme values
 * Useful to avoid re-renders from full theme object changes
 */
export const useThemeValue = <K extends keyof Theme>(key: K) => {
  return useCallback(() => theme[key], []);
};
