import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Wrapper around AsyncStorage for type-safe access to stored data
 */
class StorageService {
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting storage item ${key}:`, error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting storage item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing storage item ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  async multiGet(keys: string[]): Promise<Map<string, unknown>> {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result = new Map<string, unknown>();

      values.forEach(([key, value]) => {
        if (value) {
          result.set(key, JSON.parse(value));
        }
      });

      return result;
    } catch (error) {
      console.error('Error in multiGet:', error);
      return new Map();
    }
  }
}

export const storage = new StorageService();
