import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@/constants/api';

/**
 * Auth tokens live in the device keychain/keystore (expo-secure-store), not in
 * AsyncStorage, which is unencrypted. SecureStore has no web implementation, so
 * web builds fall back to AsyncStorage.
 *
 * Tokens saved by older app versions in AsyncStorage are moved over on first read,
 * so updating the app does not log anyone out.
 */

// SecureStore keys may only contain letters, digits, '.', '-' and '_'
const SECURE_KEYS = {
  access: 'rice_flow.access_token',
  refresh: 'rice_flow.refresh_token',
} as const;

const LEGACY_KEYS = {
  access: STORAGE_KEYS.ACCESS_TOKEN,
  refresh: STORAGE_KEYS.REFRESH_TOKEN,
} as const;

type TokenKind = keyof typeof SECURE_KEYS;

const useSecureStore = Platform.OS !== 'web';

async function readLegacy(kind: TokenKind): Promise<string | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEYS[kind]);
  return raw ? (JSON.parse(raw) as string) : null;
}

async function read(kind: TokenKind): Promise<string | null> {
  if (!useSecureStore) return readLegacy(kind);

  const value = await SecureStore.getItemAsync(SECURE_KEYS[kind]);
  if (value) return value;

  // One-time move from AsyncStorage (older app versions)
  const legacy = await readLegacy(kind);
  if (legacy) {
    await SecureStore.setItemAsync(SECURE_KEYS[kind], legacy);
    await AsyncStorage.removeItem(LEGACY_KEYS[kind]);
  }
  return legacy;
}

async function write(kind: TokenKind, value: string): Promise<void> {
  if (useSecureStore) await SecureStore.setItemAsync(SECURE_KEYS[kind], value);
  else await AsyncStorage.setItem(LEGACY_KEYS[kind], JSON.stringify(value));
}

export const tokenStorage = {
  getAccessToken: () => read('access'),
  getRefreshToken: () => read('refresh'),

  async setTokens(access: string, refresh?: string): Promise<void> {
    await write('access', access);
    if (refresh) await write('refresh', refresh);
  },

  async clear(): Promise<void> {
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(SECURE_KEYS.access);
      await SecureStore.deleteItemAsync(SECURE_KEYS.refresh);
    }
    await AsyncStorage.removeItem(LEGACY_KEYS.access);
    await AsyncStorage.removeItem(LEGACY_KEYS.refresh);
  },
};
