import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerDeviceToken } from '@nepally/shared';

/**
 * True when the app runs inside Expo Go, where remote (push) notifications are
 * unsupported as of SDK 53. Push registration is skipped in this environment to
 * avoid noisy, non-actionable expo-notifications warnings; it works in a
 * development or standalone build.
 * @see https://docs.expo.dev/develop/development-builds/introduction/
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Requests push notification permission and registers the Expo push token
 * with the Nepally backend via the shared registerDeviceToken API.
 *
 * Returns true if registration succeeded, false if running in Expo Go,
 * permission was denied, or registration failed.
 */
export async function registerForPushNotificationsAsync(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Remote push is not available in Expo Go; bail out before touching the
  // expo-notifications push APIs so the library's unsupported-feature warnings
  // are not emitted during local development.
  if (isExpoGo) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  let tokenData: Notifications.ExpoPushToken;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync();
  } catch {
    return false;
  }

  const result = await registerDeviceToken(supabase, userId, tokenData.data, 'expo');
  return !result.error;
}

/**
 * Configure how push notifications are handled while the app is in the foreground.
 * Call once at app startup (e.g. in App.tsx).
 */
export function configureForegroundNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
