import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Web build of the auth session storage (Metro picks this file for
 * `expo start --web`). Browsers have no keychain for expo-secure-store, so the
 * session lives in browser storage (AsyncStorage is localStorage on web), the
 * same place supabase-js and apps/web keep it. Native builds use the encrypted
 * adapter in secureSessionStorage.ts.
 */
export const secureSessionStorage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
