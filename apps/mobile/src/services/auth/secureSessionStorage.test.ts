import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// The polyfill needs a native module; Node already provides crypto.getRandomValues.
jest.mock('react-native-get-random-values', () => ({}));

const mockSecureStore = new Map<string, string>();
const mockGetItemAsync = jest.fn(async (key: string) => mockSecureStore.get(key) ?? null);

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  getItemAsync: (key: string) => mockGetItemAsync(key),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureSessionStorage } from './secureSessionStorage';

const STORAGE_KEY = 'sb-project-auth-token';
const SESSION = JSON.stringify({
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value',
  user: { id: 'user-1', email: 'test@nepally.us' },
});

describe('secureSessionStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSecureStore.clear();
    mockGetItemAsync.mockImplementation(async (key: string) => mockSecureStore.get(key) ?? null);
    await AsyncStorage.clear();
  });

  it('returns what was stored', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('never writes the session to AsyncStorage in plain text', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('refresh-token-value');
    expect(raw).not.toContain('access-token-value');
  });

  it('keeps the encryption key in the device keychain, readable after first unlock only on this device', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
    );
  });

  it('keeps one device key but never reuses a keystream', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
    const firstCiphertext = await AsyncStorage.getItem(STORAGE_KEY);

    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).not.toBe(firstCiphertext);
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('leaves the previous session readable when a write fails halfway', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('App killed mid-write'));

    await expect(secureSessionStorage.setItem(STORAGE_KEY, '{"newer":true}')).rejects.toThrow();

    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('creates a single key when two first writes race', async () => {
    const newer = '{"newer":true}';

    await Promise.all([
      secureSessionStorage.setItem(STORAGE_KEY, SESSION),
      secureSessionStorage.setItem(STORAGE_KEY, newer),
    ]);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(newer);
  });

  it('returns null when nothing is stored', async () => {
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
  });

  it('moves a plain-text session saved by an older build into encrypted storage', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, SESSION);

    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toContain('refresh-token-value');
    expect(mockSecureStore.has(STORAGE_KEY)).toBe(true);
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('drops a session whose key is gone, e.g. a backup restored onto a new phone', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
    mockSecureStore.clear();

    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the stored session when the keychain cannot be read right now', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);
    mockGetItemAsync.mockRejectedValueOnce(new Error('Keychain unavailable'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Could not read the session key:', expect.any(Error));
    warn.mockRestore();

    // Still readable once the keychain is available again.
    await expect(secureSessionStorage.getItem(STORAGE_KEY)).resolves.toBe(SESSION);
  });

  it('removes both the encrypted session and its key', async () => {
    await secureSessionStorage.setItem(STORAGE_KEY, SESSION);

    await secureSessionStorage.removeItem(STORAGE_KEY);

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mockSecureStore.has(STORAGE_KEY)).toBe(false);
  });
});
