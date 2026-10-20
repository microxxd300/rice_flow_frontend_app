import Constants from 'expo-constants';

// Expo only inlines env vars written literally as process.env.EXPO_PUBLIC_*,
// so read them directly (an alias like `const env = process.env` is never filled in).
export const ENV = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://doing-haven-requisite.ngrok-free.dev/api',
  environment: (process.env.EXPO_PUBLIC_ENV || 'development') as
    | 'development'
    | 'staging'
    | 'production',
  isDevelopment: process.env.EXPO_PUBLIC_ENV === 'development',
  isProduction: process.env.EXPO_PUBLIC_ENV === 'production',
} as const;

export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
