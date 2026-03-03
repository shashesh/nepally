/**
 * Device token API functions — Supabase query logic (dependency injection pattern)
 * See: supabase/migrations/001_schema.sql (device_tokens table)
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type DeviceTokenPlatform = 'expo' | 'web_push';

export interface WebPushData {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export interface DeviceTokenResult {
  error?: Error;
}

/**
 * Register (upsert) a device token for push notification delivery.
 * For web push, pass `webPushData` with the browser subscription details.
 */
export async function registerDeviceToken(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  platform: DeviceTokenPlatform,
  webPushData?: WebPushData
): Promise<DeviceTokenResult> {
  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      last_used_at: new Date().toISOString(),
      ...(webPushData ?? {}),
    },
    { onConflict: 'user_id,token' }
  );

  if (error) return { error: new Error(error.message) };
  return {};
}

/**
 * Remove a device token (e.g., on sign-out or push permission revocation).
 */
export async function removeDeviceToken(
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<DeviceTokenResult> {
  const { error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) return { error: new Error(error.message) };
  return {};
}
