/**
 * Live smoke test: a member counts at most once in a listing's views and
 * contacts.
 *
 * Verifies migrations 042 (dedupe_listing_counters) and 043
 * (lock_listing_before_counting) against a real Supabase project:
 *   1. Repeat views by one member on one day add 1 to views_count, even
 *      when the calls arrive at once.
 *   2. The same member counts again on a later day.
 *   3. Repeat contacts by one member add 1 to contacts_count, ever.
 *   4. The owner's own views and contacts never count.
 *   5. An inactive listing counts nothing and records no contact.
 *   6. Members cannot read or write listing_views / listing_contacts.
 *
 * Run: npm run test:security:listing-counters
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
      title: 'Listing counters smoke test',
      description: 'Listing counters smoke test body',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to insert fixture listing: ${error?.message || 'no row'}`);
  }
  return data.id as string;
}

async function readCounts(service: SupabaseClient, listingId: string) {
  const { data, error } = await service
    .from('marketplace_listings')
    .select('views_count, contacts_count')
    .eq('id', listingId)
    .single();
  if (error || !data)
    throw new Error(`Failed to read listing ${listingId}: ${error?.message || 'no row'}`);
  return data as { views_count: number; contacts_count: number };
}

/** Fire `times` calls at once, so the dedupe is checked under concurrency, not just in sequence. */
async function call(client: SupabaseClient, fn: string, listingId: string, times: number) {
  const results = await Promise.all(
    Array.from({ length: times }, () => client.rpc(fn, { p_listing_id: listingId }))
  );
  for (const { error } of results) {
    assertCondition(!error, `${fn} should succeed: ${error?.message}`);
  }
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  let listingId: string | null = null;

  try {
    const owner = await createUser(service, 'counter-owner');
    createdUsers.push(owner.id);
    const member = await createUser(service, 'counter-member');
    createdUsers.push(member.id);
    const ownerClient = await createAuthedClient(url, anonKey, owner);
    const memberClient = await createAuthedClient(url, anonKey, member);

    listingId = await insertListing(service, owner.id);

    // 1. Repeat views on one day count once.
    await call(memberClient, 'increment_listing_views', listingId, 5);
    assertCondition(
      (await readCounts(service, listingId)).views_count === 1,
      'Five concurrent views by one member on one day should count once'
    );

    // 2. A later day counts again. Backdate the member's row to stand in for yesterday.
    const backdate = await service
      .from('listing_views')
      .update({ last_counted_on: '2000-01-01' })
      .eq('listing_id', listingId)
      .eq('viewer_id', member.id);
    assertCondition(
      !backdate.error,
      `Backdating the view should succeed: ${backdate.error?.message}`
    );
    await call(memberClient, 'increment_listing_views', listingId, 2);
    assertCondition(
      (await readCounts(service, listingId)).views_count === 2,
      'A view on a later day should count once more'
    );

    // 3. Repeat contacts count once, ever.
    await call(memberClient, 'increment_listing_contacts', listingId, 5);
    assertCondition(
      (await readCounts(service, listingId)).contacts_count === 1,
      'Five concurrent contacts by one member should count once'
    );

    // 4. The owner never counts on their own listing.
    await call(ownerClient, 'increment_listing_views', listingId, 2);
    await call(ownerClient, 'increment_listing_contacts', listingId, 2);
    const afterOwner = await readCounts(service, listingId);
    assertCondition(
      afterOwner.views_count === 2 && afterOwner.contacts_count === 1,
      `The owner's own views and contacts should not count, got ${JSON.stringify(afterOwner)}`
    );

    // 5. An inactive listing counts nothing and records no one. Clear the
    // member's markers first, so each call would count if the listing were active.
    const deactivate = await service
      .from('marketplace_listings')
      .update({ status: 'inactive' })
      .eq('id', listingId);
    assertCondition(!deactivate.error, `Deactivating should succeed: ${deactivate.error?.message}`);
    const rewind = await service
      .from('listing_views')
      .update({ last_counted_on: '2000-01-01' })
      .eq('listing_id', listingId)
      .eq('viewer_id', member.id);
    const forget = await service
      .from('listing_contacts')
      .delete()
      .eq('listing_id', listingId)
      .eq('contacter_id', member.id);
    assertCondition(
      !rewind.error && !forget.error,
      `Clearing the markers should succeed: ${rewind.error?.message ?? forget.error?.message}`
    );
    await call(memberClient, 'increment_listing_views', listingId, 2);
    await call(memberClient, 'increment_listing_contacts', listingId, 2);
    const afterInactive = await readCounts(service, listingId);
    assertCondition(
      afterInactive.views_count === 2 && afterInactive.contacts_count === 1,
      `An inactive listing should not count, got ${JSON.stringify(afterInactive)}`
    );
    const { data: markers, error: markersError } = await service
      .from('listing_contacts')
      .select('contacter_id')
      .eq('listing_id', listingId);
    assertCondition(
      !markersError && markers?.length === 0,
      `An inactive listing should record no contact, got ${markersError?.message ?? markers?.length}`
    );

    // 6. The dedupe tables are internal.
    for (const table of ['listing_views', 'listing_contacts']) {
      const read = await memberClient.from(table).select('*').limit(1);
      assertCondition(
        read.error?.code === PERMISSION_DENIED,
        `A member should not read ${table}, got ${read.error ? read.error.code : 'success'}`
      );
    }
    const forged = await memberClient.from('listing_views').delete().eq('viewer_id', member.id);
    assertCondition(
      forged.error?.code === PERMISSION_DENIED,
      `A member should not delete their listing_views row to count again, got ${forged.error ? forged.error.code : 'success'}`
    );

    console.log('PASS: listing counters smoke test verified.');
  } finally {
    if (listingId) {
      // Cascades to listing_views and listing_contacts.
      await service.from('marketplace_listings').delete().eq('id', listingId);
    }
    for (const userId of createdUsers) {
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: listing counters smoke test failed: ${message}`);
  process.exit(1);
});
