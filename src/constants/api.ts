/**
 * API-related constants
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@rice_flow/access_token',
  REFRESH_TOKEN: '@rice_flow/refresh_token',
  USER: '@rice_flow/user',
  THEME: '@rice_flow/theme',
  SETUP_COMPLETE: '@rice_flow/setup_complete',
  SETUP_PROGRESS: '@rice_flow/setup_progress',
  NOTIFICATIONS:  '@rice_flow/notifications',
  PROGRESS_LOGS:  '@rice_flow/progress_logs',
  LATEST_REC:     '@rice_flow/latest_recommendation',
  LATEST_GUIDE:   '@rice_flow/latest_guide',
  COMPLETED_GUIDE_STEPS: '@rice_flow/completed_guide_steps',
  NOTIF_ENABLED:         '@rice_flow/notifications_enabled',
  WEATHER_ALERTS:        '@rice_flow/weather_alerts_enabled',
  PROFILE_OVERRIDES:     '@rice_flow/profile_overrides',
} as const;

export const QUERY_KEYS = {
  AUTH: ['auth'] as const,
  AUTH_ME: ['auth', 'me'] as const,
  HOME_ITEMS: ['home', 'items'] as const,
  HOME_ITEM: (id: string) => ['home', 'item', id] as const,
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
} as const;
