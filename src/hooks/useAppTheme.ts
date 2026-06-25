import { useAuthStore } from '@/app/store/auth.store';
import { useTheme } from '@/theme';

/**
 * Hook to use app theme
 */
export const useAppTheme = () => useTheme();

/**
 * Re-export common hooks for convenience
 */
export const useAppAuth = () => {
  const { isAuthenticated, user } = useAuthStore();
  return { isAuthenticated, user };
};
