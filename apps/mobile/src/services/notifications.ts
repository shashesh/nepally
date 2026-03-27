import * as Notifications from 'expo-notifications';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerDeviceToken } from '@nepally/shared';

/**
 * Requests push notification permission and registers the Expo push token
 * with the Nepally backend via the shared registerDeviceToken API.
 *
 * Returns true if registration succeeded, false if permission was denied
 * or registration failed.
 */
export async function registerForPushNotificationsAsync(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
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
