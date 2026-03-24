/**
 * send-push-notification — Supabase Edge Function
 *
 * Required Supabase secrets:
 *   supabase secrets set VAPID_PRIVATE_KEY=<your-vapid-private-key>
 *   supabase secrets set VAPID_PUBLIC_KEY=<your-vapid-public-key>
 *   supabase secrets set VAPID_SUBJECT=mailto:<your-email>
 *   supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-access-token>  (optional, for higher Expo rate limits)
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
import webpush from 'npm:web-push@3.6.7';

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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function buildExpoHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  return headers;
}

let vapidConfigured = false;

function ensureWebPushConfigured(): void {
  if (vapidConfigured) return;

  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    throw new Error(
      'Missing VAPID configuration. Expected VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.'
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  vapidConfigured = true;
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

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: buildExpoHeaders(),
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Web Push (VAPID)
// Uses VAPID details from environment variables and sends one notification per
// browser subscription endpoint.
// ---------------------------------------------------------------------------
async function sendWebPushNotifications(
  tokens: DeviceTokenRow[],
  title: string,
  body: string,
  url: string
): Promise<void> {
  if (tokens.length === 0) return;

  ensureWebPushConfigured();

  const payload = JSON.stringify({ title, body, url });

  for (const token of tokens) {
    if (!token.endpoint || !token.p256dh || !token.auth_key) {
      console.warn('[web-push] Skipping token with incomplete subscription keys');
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: token.endpoint,
          keys: {
            p256dh: token.p256dh,
            auth: token.auth_key,
          },
        },
        payload,
        {
          TTL: 60,
        }
      );
    } catch (err) {
      console.warn('[web-push] Failed for endpoint:', token.endpoint, err);
    }
  }
}
