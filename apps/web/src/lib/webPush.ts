/**
 * Web Push subscription management.
 * Uses the Web Push API (service worker + VAPID) to register browser push.
 *
 * Environment variable required:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY — VAPID public key (base64url encoded)
 *   Generate a key pair with: npx web-push generate-vapid-keys
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerDeviceToken, removeDeviceToken } from '@nepally/shared';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData, (c) => c.charCodeAt(0)));
}

/**
 * Register this browser for Web Push notifications.
 * 1. Registers the service worker at /sw.js
 * 2. Requests notification permission
 * 3. Subscribes to push with VAPID key
 * 4. Stores the subscription in the device_tokens table
 *
 * Returns false if push is not supported, permission denied, or VAPID key missing.
 */
export async function requestWebPushPermission(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[webPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push disabled');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh ?? '';
  const auth = json.keys?.auth ?? '';

  await registerDeviceToken(supabase, userId, subscription.endpoint, 'web_push', {
    endpoint: subscription.endpoint,
    p256dh,
    auth_key: auth,
  });

  return true;
}

/**
 * Unsubscribe from Web Push and remove the token from the DB.
 */
export async function unsubscribeWebPush(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await removeDeviceToken(supabase, userId, endpoint);
}
