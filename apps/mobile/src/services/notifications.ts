import type * as ExpoNotifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerDeviceToken } from '@nepally/shared';

/**
 * True when the app runs inside Expo Go, where remote (push) notifications are
 * unsupported as of SDK 53. Push registration is skipped in this environment
 * because importing expo-notifications throws in Expo Go on Android (SDK 55+);
 * it works in a development or standalone build.
 * @see https://docs.expo.dev/develop/development-builds/introduction/
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Loads expo-notifications on first use. Never import it at module scope:
 * the package registers a push-token listener as an import side effect, and
 * since SDK 55 that throws in Expo Go on Android, crashing the app at startup.
 * Callers must check `isExpoGo` first.
 */
function loadNotifications(): typeof ExpoNotifications {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

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
  // Remote push is not available in Expo Go, and importing expo-notifications
  // there throws on Android (SDK 55+); bail out before loading the module.
  if (isExpoGo) {
    return false;
  }

  const Notifications = loadNotifications();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  let tokenData: ExpoNotifications.ExpoPushToken;
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
  // Importing expo-notifications throws in Expo Go on Android (SDK 55+), so
  // the module must not even be loaded there.
  if (isExpoGo) {
    return;
  }

  const Notifications = loadNotifications();
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
