import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';

/**
 * Supabase auth storage that keeps the session encrypted at rest.
 *
 * Sessions are long-lived (docs/decisions/2026-09-18-long-lived-sessions.md),
 * so the refresh token must not sit in plain AsyncStorage. Adapted from
 * Supabase's LargeSecureStore pattern for Expo: the session is too large for
 * the keychain, so a random AES-256 key lives in expo-secure-store (iOS
 * Keychain / Android Keystore) and the session, encrypted with it in CTR mode,
 * lives in AsyncStorage.
 *
 * Differences from the Supabase sample:
 * - One key per entry, created on first write, and a random 128-bit initial
 *   counter per write (stored with the ciphertext) so no keystream is reused.
 *   Each write then touches AsyncStorage only, so an app killed mid-write
 *   keeps the previous session instead of pairing a new key with old
 *   ciphertext.
 * - Operations run one at a time, so racing first writes cannot create two keys.
 * - Encrypted values carry a prefix, so a plain-text session saved by an older
 *   build is recognised and re-encrypted in place instead of being lost.
 * - On iOS the key is readable after first unlock and never leaves the device.
 *   On Android the expo-secure-store config plugin keeps it out of backups. A
 *   backup restored onto a new phone therefore holds ciphertext without its
 *   key; that session is dropped and the user signs in again.
 */

const ENCRYPTED_PREFIX = 'enc:v1:';
const KEY_BYTES = 32;
const COUNTER_BYTES = 16;

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => undefined);
  return run;
}

async function getOrCreateKey(key: string): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
  if (existing) return aesjs.utils.hex.toBytes(existing);

  const created = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(created), KEYCHAIN_OPTIONS);
  return created;
}

function encrypt(encryptionKey: Uint8Array, value: string): string {
  const counter = crypto.getRandomValues(new Uint8Array(COUNTER_BYTES));
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(counter));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  return `${ENCRYPTED_PREFIX}${aesjs.utils.hex.fromBytes(counter)}:${aesjs.utils.hex.fromBytes(encrypted)}`;
}

function decrypt(encryptionKey: Uint8Array, stored: string): string | null {
  const [counterHex, encryptedHex] = stored.slice(ENCRYPTED_PREFIX.length).split(':');
  if (!counterHex || counterHex.length !== COUNTER_BYTES * 2 || encryptedHex === undefined) {
    return null;
  }
  const cipher = new aesjs.ModeOfOperation.ctr(
    encryptionKey,
    new aesjs.Counter(aesjs.utils.hex.toBytes(counterHex))
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encryptedHex)));
}

async function writeEncrypted(key: string, value: string): Promise<void> {
  const encryptionKey = await getOrCreateKey(key);
  await AsyncStorage.setItem(key, encrypt(encryptionKey, value));
}

async function migratePlainText(key: string, value: string): Promise<void> {
  try {
    await writeEncrypted(key, value);
  } catch (error) {
    // Keep the plain-text copy so the user stays signed in; the next write retries.
    console.warn('Could not encrypt the stored session:', error);
  }
}

async function readItem(key: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(key);
  if (stored === null) return null;

  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    await migratePlainText(key, stored);
    return stored;
  }

  let keyHex: string | null;
  try {
    keyHex = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
  } catch (error) {
    // Transient (e.g. the keychain is not available yet): keep the session for
    // the next read instead of deleting it.
    console.warn('Could not read the session key:', error);
    return null;
  }

  if (!keyHex) {
    // Ciphertext without its key (a backup restored onto another device).
    await AsyncStorage.removeItem(key);
    return null;
  }

  const decrypted = decrypt(aesjs.utils.hex.toBytes(keyHex), stored);
  if (decrypted === null) console.warn('Stored session is malformed; ignoring it');
  return decrypted;
}

async function removeEntry(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
}

export const secureSessionStorage = {
  getItem: (key: string): Promise<string | null> => oneAtATime(() => readItem(key)),
  setItem: (key: string, value: string): Promise<void> => oneAtATime(() => writeEncrypted(key, value)),
  removeItem: (key: string): Promise<void> => oneAtATime(() => removeEntry(key)),
};
