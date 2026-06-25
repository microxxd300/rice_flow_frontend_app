export const ROUTES = {
  ROOT: '/' as const,
  // Auth stack
  LOGIN: '/login' as const,
  REGISTER: '/register' as const,
  // App stack
  HOME: '/home' as const,
  HOME_DETAIL: (id: string) => `/home/${id}` as const,
  PROFILE: '/profile' as const,
} as const;
