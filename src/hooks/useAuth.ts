import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store';

/**
 * Hook to use auth state and actions
 */
export const useAuth = () => {
  const authStore = useAuthStore();

  return {
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    isLoading: authStore.isLoading,
    login: useCallback(
      (email: string, password: string) =>
        authStore.login(email, password),
      [authStore]
    ),
    register: useCallback(
      (email: string, password: string, name: string) =>
        authStore.register(email, password, name),
      [authStore]
    ),
    logout: useCallback(() => authStore.logout(), [authStore]),
    setUser: authStore.setUser,
  };
};
