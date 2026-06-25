import { QueryClient } from '@tanstack/react-query';

/**
 * Configure TanStack Query (React Query) client
 * Provides global cache management and data fetching
 */
export const reactQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});
