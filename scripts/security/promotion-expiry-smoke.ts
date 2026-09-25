/**
 * Live smoke test: paid promotions past their end date get expired, and
 * only the service role can trigger it.
 *
 * Verifies migration 046 (expire_paid_promotions_cron) against a real
 * Supabase project:
 *   1. anon and a signed-in member are refused expire_paid_promotions().
 *   2. Called as the service role (as the hourly pg_cron job would run it),
 *      it expires an active paid promotion whose end date has passed and
 *      leaves one still running as active.
 *
 * The pg_cron job itself isn't reachable through the API; check it with
 *   SELECT jobname, schedule, active FROM cron.job;
 *
 * Run: npm run test:security:promotion-expiry
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = {
  id: string;
  email: string;
  password: string;
};

/** Postgres insufficient_privilege, which PostgREST passes through as `code`. */
const PERMISSION_DENIED = '42501';

const HOUR_MS = 60 * 60 * 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function randomToken(length = 8): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const NO_SESSION_AUTH = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
} as const;

async function createAuthedClient(
  url: string,
  anonKey: string,
  fixture: UserFixture
): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: NO_SESSION_AUTH });

  const { data, error } = await client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });

  if (error || !data.session) {
    throw new Error(
      `Failed to sign in test user ${fixture.email}: ${error?.message || 'no session'}`
    );
  }

  return createClient(url, anonKey, {
    auth: NO_SESSION_AUTH,
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  });
}

async function createUser(service: SupabaseClient, prefix: string): Promise<UserFixture> {
  const suffix = `${Date.now()}-${randomToken(6)}`;
  const email = `${prefix}.${suffix}@example.com`;
  const password = `P@ss-${randomToken(12)}`;
  const fullName = `${prefix} ${suffix}`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message || 'unknown error'}`);
  }

  const { error: profileError } = await service.from('users').insert({
    id: data.user.id,
    email,
    full_name: fullName,
    trust_level: 1,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile row for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email, password };
}

/** Insert an active listing as the service role, borrowing a real listing's metro and category. */
async function insertListing(service: SupabaseClient, ownerId: string): Promise<string> {
  const { data: template, error: templateError } = await service
    .from('marketplace_listings')
    .select('metro_area_id, category_id, listing_type')
    .limit(1)
    .single();
  if (templateError || !template) {
    throw new Error(
      `Failed to borrow listing fields: ${templateError?.message || 'no listings to borrow from'}`
    );
  }

  const { data, error } = await service
    .from('marketplace_listings')
    .insert({
      ...template,
      owner_id: ownerId,
      status: 'active',
      title: 'Promotion expiry smoke test',
      description: 'Promotion expiry smoke test body',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to insert fixture listing: ${error?.message || 'no row'}`);
  }
  return data.id as string;
}

/** An active paid promotion that started a day before `endDate`. */
async function insertPaidPromotion(
  service: SupabaseClient,
  listingId: string,
  userId: string,
  promotionType: string,
  endDate: Date
): Promise<string> {
  const { data, error } = await service
    .from('listing_promotions')
    .insert({
      listing_id: listingId,
      user_id: userId,
      promotion_type: promotionType,
      status: 'active',
      source: 'paid',
      duration_days: 1,
      daily_cost_cents: 100,
      total_cost_cents: 100,
      start_date: new Date(endDate.getTime() - 24 * HOUR_MS).toISOString(),
      end_date: endDate.toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to insert fixture promotion: ${error?.message || 'no row'}`);
  }
  return data.id as string;
}

async function readStatus(service: SupabaseClient, promotionId: string): Promise<string> {
  const { data, error } = await service
    .from('listing_promotions')
    .select('status')
    .eq('id', promotionId)
    .single();
  if (error || !data) {
    throw new Error(`Failed to read promotion ${promotionId}: ${error?.message || 'no row'}`);
  }
  return data.status as string;
}

async function expectDenied(client: SupabaseClient, role: string): Promise<void> {
  const { error } = await client.rpc('expire_paid_promotions');
  assertCondition(
    error?.code === PERMISSION_DENIED,
    `${role} should be refused expire_paid_promotions, got ${
      error ? `${error.code}: ${error.message}` : 'success'
    }`
  );
}

async function main(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const anon = createClient(url, anonKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  let listingId: string | null = null;

  try {
    // 1. No client role may run the expiry.
    await expectDenied(anon, 'anon');

    const member = await createUser(service, 'promo-expiry');
    createdUsers.push(member.id);
    const memberClient = await createAuthedClient(url, anonKey, member);
    await expectDenied(memberClient, 'authenticated');

    // 2. The service role expires the ended promotion and keeps the running one.
    listingId = await insertListing(service, member.id);
    const now = Date.now();
    const ended = await insertPaidPromotion(
      service,
      listingId,
      member.id,
      'featured_listing',
      new Date(now - HOUR_MS)
    );
    const running = await insertPaidPromotion(
      service,
      listingId,
      member.id,
      'sponsored_feed',
      new Date(now + 24 * HOUR_MS)
    );

    const { data: expiredCount, error: rpcError } = await service.rpc('expire_paid_promotions');
    assertCondition(
      !rpcError,
      `service_role should run expire_paid_promotions: ${rpcError?.message}`
    );
    // The count covers the whole table, and the hourly cron job may have
    // expired the fixture a moment earlier, so it can be 0. The statuses
    // below are the real check.
    assertCondition(
      typeof expiredCount === 'number',
      `expire_paid_promotions should return how many it expired, got ${expiredCount}`
    );

    const endedStatus = await readStatus(service, ended);
    assertCondition(
      endedStatus === 'expired',
      `The ended promotion should be expired, got ${endedStatus}`
    );
    const runningStatus = await readStatus(service, running);
    assertCondition(
      runningStatus === 'active',
      `The running promotion should stay active, got ${runningStatus}`
    );

    console.log('PASS: promotion expiry smoke test verified.');
  } finally {
    // Best-effort: every item is still attempted after an earlier failure.
    const leftovers: string[] = [];

    // Deleting the listing cascades to its promotions.
    if (listingId) {
      const { error } = await service.from('marketplace_listings').delete().eq('id', listingId);
      if (error) leftovers.push(`listing ${listingId}`);
    }
    for (const userId of createdUsers) {
      const { error: profileError } = await service.from('users').delete().eq('id', userId);
      if (profileError) leftovers.push(`users row ${userId}`);
      const { error: authError } = await service.auth.admin.deleteUser(userId);
      if (authError) leftovers.push(`auth user ${userId}`);
    }

    if (leftovers.length > 0) {
      console.error(`Cleanup failed to remove: ${leftovers.join(', ')}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: promotion expiry smoke test failed: ${message}`);
  process.exit(1);
});
