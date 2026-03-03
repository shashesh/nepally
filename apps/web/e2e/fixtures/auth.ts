import type { Page } from '@playwright/test';
import { makeFakeSession, MOCK_USER_ID, MOCK_USER_EMAIL } from './mock-data';

/** localStorage key used by the Supabase JS client for this project */
export const DEFAULT_SUPABASE_STORAGE_KEY = 'sb-tlusiongalvszftnzpoq-auth-token';

function getSupabaseStorageKeys(): string[] {
  const keys = new Set<string>([DEFAULT_SUPABASE_STORAGE_KEY]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
      if (projectRef) {
        keys.add(`sb-${projectRef}-auth-token`);
      }
    } catch {
      // Ignore malformed env values in tests
    }
  }

  return Array.from(keys);
}

/**
 * Injects a fake Supabase auth session into localStorage BEFORE React hydrates.
 * Call this before `page.goto()` so the app boots as authenticated.
 */
export async function injectAuthSession(
  page: Page,
  userId = MOCK_USER_ID,
  email = MOCK_USER_EMAIL,
): Promise<void> {
  const session = makeFakeSession(userId, email);
  const storageKeys = getSupabaseStorageKeys();
  await page.addInitScript(
    ({ keys, value }: { keys: string[]; value: string }) => {
      keys.forEach((key) => {
        window.localStorage.setItem(key, value);
      });
    },
    { keys: storageKeys, value: JSON.stringify(session) },
  );
}
