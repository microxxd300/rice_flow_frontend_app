import Constants from 'expo-constants';

// @ts-ignore - process is available in Node but not typed in Expo
const processEnv = typeof process !== 'undefined' ? process.env : {};

export const ENV = {
  apiUrl: processEnv.EXPO_PUBLIC_API_URL || 'https://doing-haven-requisite.ngrok-free.dev/api',
  environment: (processEnv.EXPO_PUBLIC_ENV || 'development') as
    | 'development'
    | 'staging'
    | 'production',
  isDevelopment: processEnv.EXPO_PUBLIC_ENV === 'development',
  isProduction: processEnv.EXPO_PUBLIC_ENV === 'production',
} as const;

export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
