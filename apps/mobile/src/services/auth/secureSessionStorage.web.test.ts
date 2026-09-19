import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// The web build must never load the native-only keychain module.
jest.mock('expo-secure-store', () => {
  throw new Error('expo-secure-store is native-only');
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureSessionStorage } from './secureSessionStorage.web';

const STORAGE_KEY = 'sb-project-auth-token';
const SESSION = JSON.stringify({ access_token: 'a', refresh_token: 'r' });

describe('secureSessionStorage (web)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists the session in browser storage, like the web app', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(SESSION);
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('returns null when nothing is stored', async () => {
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
  });

  it('removes the session', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    await secureSessionStorage.removeItem(STORAGE_KEY);

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
