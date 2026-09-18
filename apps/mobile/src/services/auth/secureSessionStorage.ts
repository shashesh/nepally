import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';

/**
 * Supabase auth storage that keeps the session encrypted at rest.
 *
 * Sessions are long-lived (docs/decisions/2026-09-18-long-lived-sessions.md),
 * so the refresh token must not sit in plain AsyncStorage. Adapted from
 * Supabase's LargeSecureStore pattern for Expo: the session is too large for
 * the keychain, so a random AES-256 key lives in expo-secure-store (iOS
 * Keychain / Android Keystore) and the session, encrypted with it, lives in
 * AsyncStorage.
 *
 * Differences from the Supabase sample:
 * - AES-256-GCM (@noble/ciphers, audited) instead of unauthenticated AES-CTR,
 *   so a tampered or corrupted record fails to decrypt instead of returning
 *   altered data. Every write uses a random 96-bit nonce.
 * - One key per entry, created on first write. Each write then touches
 *   AsyncStorage only, so an app killed mid-write keeps the previous session.
 * - Operations run one at a time, so racing first writes cannot create two keys.
 * - UTF-8 conversion handles 4-byte characters (emoji). The sample's aes-js
 *   decoder corrupts them, which breaks the session JSON.
 * - A plain-text session saved by an older build is re-encrypted in place.
 * - On iOS the key is readable after first unlock and never leaves the device.
 *   On Android the expo-secure-store config plugin keeps it out of backups. A
 *   backup restored onto a new phone therefore holds ciphertext without its
 *   key; that session is dropped and the user signs in again.
 */

const ENCRYPTED_PREFIX = 'enc:v1:';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const KEY_HEX_PATTERN = /^[0-9a-f]{64}$/;

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => undefined);
  return run;
}

// Hermes has no TextDecoder, so convert through percent-encoding, which every
// JS engine supports. decodeURIComponent throws on invalid UTF-8.
function utf8ToBytes(text: string): Uint8Array {
  const escaped = encodeURIComponent(text);
  const bytes: number[] = [];
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === '%') {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(escaped.charCodeAt(i));
    }
  }
  return Uint8Array.from(bytes);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let escaped = '';
  for (const byte of bytes) escaped += `%${byte.toString(16).padStart(2, '0')}`;
  return decodeURIComponent(escaped);
}

async function getOrCreateKey(key: string): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
  if (existing && KEY_HEX_PATTERN.test(existing)) return hexToBytes(existing);

  // No key yet, or a malformed one that could never decrypt anything.
  const created = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  await SecureStore.setItemAsync(key, bytesToHex(created), KEYCHAIN_OPTIONS);
  return created;
}

function encrypt(encryptionKey: Uint8Array, value: string): string {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const sealed = gcm(encryptionKey, nonce).encrypt(utf8ToBytes(value));
  return `${ENCRYPTED_PREFIX}${bytesToHex(nonce)}:${bytesToHex(sealed)}`;
}

// Throws when the record is malformed, tampered with, or sealed under another key.
function decrypt(encryptionKey: Uint8Array, stored: string): string {
  const [nonceHex, sealedHex] = stored.slice(ENCRYPTED_PREFIX.length).split(':');
  if (nonceHex?.length !== NONCE_BYTES * 2 || !sealedHex) {
    throw new Error('Malformed session record');
  }
  return bytesToUtf8(gcm(encryptionKey, hexToBytes(nonceHex)).decrypt(hexToBytes(sealedHex)));
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

  try {
    return decrypt(hexToBytes(keyHex), stored);
  } catch (error) {
    console.warn('Stored session could not be decrypted; ignoring it:', error);
    return null;
  }
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
