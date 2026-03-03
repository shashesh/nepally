/**
 * send-push-notification — Supabase Edge Function
 *
 * TODO: Deploy and wire to DB triggers (notify_new_message, notify_new_comment, notify_new_like)
 * TODO: Set the following Supabase secrets before deploying:
 *   supabase secrets set VAPID_PRIVATE_KEY=<your-vapid-private-key>
 *   supabase secrets set VAPID_SUBJECT=mailto:<your-email>
 *   supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-access-token>  (optional, for enhanced delivery)
 *
 * VAPID keys can be generated with:
 *   npx web-push generate-vapid-keys
 * Store NEXT_PUBLIC_VAPID_PUBLIC_KEY in apps/web/.env.local for the browser subscription.
 *
 * Invocation payload:
 * {
 *   userId: string;       — recipient user ID
 *   title: string;        — notification title
 *   body: string;         — notification body text
 *   data?: object;        — arbitrary data attached to the notification
 *   url?: string;         — deep link / web URL to open on tap
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
}

interface DeviceTokenRow {
  token: string;
  platform: 'expo' | 'web_push';
  endpoint?: string;
  p256dh?: string;
  auth_key?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { userId, title, body, data = {}, url = '/' } = payload;
  if (!userId || !title || !body) {
    return new Response('Missing required fields: userId, title, body', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch all device tokens for this user
  const { data: tokens, error: tokensError } = await supabase
    .from('device_tokens')
    .select('token, platform, endpoint, p256dh, auth_key')
    .eq('user_id', userId);

  if (tokensError) {
    console.error('Failed to fetch device tokens:', tokensError.message);
    return new Response('Failed to fetch device tokens', { status: 500 });
  }

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expoTokens = (tokens as DeviceTokenRow[]).filter((t) => t.platform === 'expo');
  const webTokens = (tokens as DeviceTokenRow[]).filter((t) => t.platform === 'web_push');

  const results = await Promise.allSettled([
    sendExpoNotifications(expoTokens, title, body, data, url),
    sendWebPushNotifications(webTokens, title, body, url),
  ]);

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason);

  if (errors.length > 0) {
    console.error('Some push deliveries failed:', errors);
  }

  return new Response(
    JSON.stringify({ sent: tokens.length, errors: errors.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// ---------------------------------------------------------------------------
// Expo Push Notifications
// https://docs.expo.dev/push-notifications/sending-notifications/
// ---------------------------------------------------------------------------
async function sendExpoNotifications(
  tokens: DeviceTokenRow[],
  title: string,
  body: string,
  data: Record<string, unknown>,
  url: string
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: { ...data, url },
    sound: 'default',
    channelId: 'default',
  }));

  // TODO: Add EXPO_ACCESS_TOKEN header for enhanced delivery rate limits
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Web Push (VAPID)
// Requires VAPID_PRIVATE_KEY + VAPID_SUBJECT env secrets.
// The full VAPID signing implementation requires a crypto library —
// swap the placeholder below with e.g. https://deno.land/x/web_push
// ---------------------------------------------------------------------------
async function sendWebPushNotifications(
  tokens: DeviceTokenRow[],
  title: string,
  body: string,
  url: string
): Promise<void> {
  if (tokens.length === 0) return;

  // TODO: Replace with a proper VAPID-signed web push implementation.
  // Example using deno web-push:
  //   import { sendNotification, setVapidDetails } from 'https://deno.land/x/web_push/mod.ts';
  //   setVapidDetails(
  //     Deno.env.get('VAPID_SUBJECT')!,
  //     Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
  //     Deno.env.get('VAPID_PRIVATE_KEY')!
  //   );
  //   for (const t of tokens) {
  //     await sendNotification(
  //       { endpoint: t.endpoint!, keys: { p256dh: t.p256dh!, auth: t.auth_key! } },
  //       JSON.stringify({ title, body, url })
  //     );
  //   }
  console.log(`[web-push] TODO: send to ${tokens.length} web subscribers — title: "${title}"`);
}
