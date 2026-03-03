/**
 * User settings API functions — Supabase query logic (dependency injection pattern)
 * See: supabase/migrations/001_schema.sql (user_settings table)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserSettings } from '../types/user';

export interface UserSettingsResult {
  data?: UserSettings;
  error?: Error;
}

export interface UserSettingsUpdateResult {
  error?: Error;
}

/**
 * Fetch the settings row for a user.
 * Returns null data (no error) if the user has no settings row yet.
 */
export async function getUserSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSettingsResult> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { error: new Error(error.message) };
  return { data: (data ?? undefined) as UserSettings | undefined };
}

/**
 * Upsert user settings — creates the row if it doesn't exist, updates if it does.
 * Partial updates are supported (only the provided fields are changed).
 */
export async function upsertUserSettings(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserSettingsUpdateResult> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return { error: new Error(error.message) };
  return {};
}
