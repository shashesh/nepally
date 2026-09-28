/**
 * Live smoke test: listing reports are counted, and 100 of them remove the
 * listing for good.
 *
 * Verifies migration 047 (report_auto_hide_threshold) against a real
 * Supabase project:
 *   0. A listing the owner creates starts at reports_count 0, whatever it sends.
 *   1. A Trust Level 0 member cannot report a listing (reports INSERT policy).
 *   2. A report bumps marketplace_listings.reports_count and the owner's
 *      users.reports_received; the listing stays active.
 *   2b. A report filed already closed is rejected and doesn't count.
 *   3. The owner cannot reset reports_count.
 *   4. The 100th report removes the listing, even when the owner has
 *      deactivated it first. The count is seeded to stay within three
 *      reporters.
 *   5. The owner cannot move a removed listing back to active or inactive.
 *   6. The service role (the dashboard) can restore it.
 *
 * Run: npm run test:security:listing-reports
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

async function createUser(
  service: SupabaseClient,
  prefix: string,
  trustLevel: number
): Promise<UserFixture> {
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
    trust_level: trustLevel,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile row for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email, password };
}

/** A real listing's metro, category and type, so fixtures satisfy the foreign keys. */
async function borrowListingFields(service: SupabaseClient) {
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
  return template;
}

/** Insert an active listing as the service role. */
async function insertListing(service: SupabaseClient, ownerId: string): Promise<string> {
  const template = await borrowListingFields(service);

  const { data, error } = await service
    .from('marketplace_listings')
    .insert({
      ...template,
      owner_id: ownerId,
      status: 'active',
      title: 'Listing reports smoke test',
      description: 'Listing reports smoke test body',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to insert fixture listing: ${error?.message || 'no row'}`);
  }
  return data.id as string;
}

async function readListing(service: SupabaseClient, listingId: string) {
  const { data, error } = await service
    .from('marketplace_listings')
    .select('status, reports_count')
    .eq('id', listingId)
    .single();
  if (error || !data)
    throw new Error(`Failed to read listing ${listingId}: ${error?.message || 'no row'}`);
  return data as { status: string; reports_count: number };
}

async function readReportsReceived(service: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await service
    .from('users')
    .select('reports_received')
    .eq('id', userId)
    .single();
  if (error || !data)
    throw new Error(`Failed to read user ${userId}: ${error?.message || 'no row'}`);
  return data.reports_received as number;
}

function report(client: SupabaseClient, reporterId: string, listingId: string) {
  return client
    .from('reports')
    .insert({
      reported_by: reporterId,
      target_type: 'listing',
      target_id: listingId,
      reason: 'Scam',
    })
    .select('id')
    .single();
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  let listingId: string | null = null;
  let forgedListingId: string | null = null;

  try {
    const owner = await createUser(service, 'lr-owner', 1);
    createdUsers.push(owner.id);
    const newcomer = await createUser(service, 'lr-newcomer', 0);
    createdUsers.push(newcomer.id);
    const reporters: UserFixture[] = [];
    for (const prefix of ['lr-rep1', 'lr-rep2', 'lr-rep3']) {
      const reporter = await createUser(service, prefix, 1);
      createdUsers.push(reporter.id);
      reporters.push(reporter);
    }

    const ownerClient = await createAuthedClient(url, anonKey, owner);
    const newcomerClient = await createAuthedClient(url, anonKey, newcomer);
    const reporterClients = await Promise.all(
      reporters.map((reporter) => createAuthedClient(url, anonKey, reporter))
    );

    listingId = await insertListing(service, owner.id);

    // 0. A listing the owner creates starts with no reports, whatever count they send.
    const forged = await ownerClient
      .from('marketplace_listings')
      .insert({
        ...(await borrowListingFields(service)),
        owner_id: owner.id,
        status: 'active',
        title: 'Forged count listing',
        description: 'Forged count listing body',
        reports_count: -1000,
      })
      .select('id')
      .single();
    assertCondition(
      !forged.error,
      `The owner's listing insert should succeed: ${forged.error?.message}`
    );
    forgedListingId = forged.data!.id as string;
    assertCondition(
      (await readListing(service, forgedListingId)).reports_count === 0,
      'A client-created listing should start with reports_count 0, not the forged value'
    );

    // 1. Level 0 cannot report.
    const newcomerReport = await report(newcomerClient, newcomer.id, listingId);
    assertCondition(
      !!newcomerReport.error,
      'A Trust Level 0 member should not be able to report a listing'
    );
    assertCondition(
      (await readListing(service, listingId)).reports_count === 0,
      'A rejected report should not count'
    );

    // 2. A report counts on the listing and on its owner.
    const first = await report(reporterClients[0], reporters[0].id, listingId);
    assertCondition(!first.error, `The first report should succeed: ${first.error?.message}`);
    const afterFirst = await readListing(service, listingId);
    assertCondition(
      afterFirst.reports_count === 1 && afterFirst.status === 'active',
      `One report should count once and leave the listing active, got ${JSON.stringify(afterFirst)}`
    );
    assertCondition(
      (await readReportsReceived(service, owner.id)) === 1,
      "The owner's reports_received should be 1"
    );

    // 2b. A report cannot be filed already closed: a closed row would escape the
    // one-open-report-per-reporter index and let one account count 100 times.
    const filedClosed = await reporterClients[1]
      .from('reports')
      .insert({
        reported_by: reporters[1].id,
        target_type: 'listing',
        target_id: listingId,
        reason: 'Scam',
        status: 'dismissed',
      })
      .select('id')
      .single();
    assertCondition(!!filedClosed.error, 'A report filed as dismissed should be rejected');
    assertCondition(
      (await readListing(service, listingId)).reports_count === 1,
      'A rejected closed report should not count'
    );

    // 3. The owner cannot reset the counter.
    const reset = await ownerClient
      .from('marketplace_listings')
      .update({ reports_count: 0 })
      .eq('id', listingId)
      .select('id');
    assertCondition(
      reset.error?.code === PERMISSION_DENIED,
      `The owner should not reset reports_count, got ${reset.error ? reset.error.code : 'success'}`
    );
    assertCondition(
      (await readListing(service, listingId)).reports_count === 1,
      'reports_count should still be 1 after the reset attempt'
    );

    // 4. Stand in for 97 more reporters, then reach 100 on a deactivated listing.
    const seed = await service
      .from('marketplace_listings')
      .update({ reports_count: 98 })
      .eq('id', listingId);
    assertCondition(!seed.error, `Seeding reports_count should succeed: ${seed.error?.message}`);

    const second = await report(reporterClients[1], reporters[1].id, listingId);
    assertCondition(!second.error, `The second report should succeed: ${second.error?.message}`);
    const after99 = await readListing(service, listingId);
    assertCondition(
      after99.reports_count === 99 && after99.status === 'active',
      `99 reports should leave the listing active, got ${JSON.stringify(after99)}`
    );

    const deactivate = await ownerClient
      .from('marketplace_listings')
      .update({ status: 'inactive' })
      .eq('id', listingId)
      .select('id');
    assertCondition(
      !deactivate.error,
      `The owner should still deactivate their listing: ${deactivate.error?.message}`
    );

    const third = await report(reporterClients[2], reporters[2].id, listingId);
    assertCondition(!third.error, `The third report should succeed: ${third.error?.message}`);
    const after100 = await readListing(service, listingId);
    assertCondition(
      after100.reports_count === 100 && after100.status === 'removed',
      `The 100th report should remove a deactivated listing, got ${JSON.stringify(after100)}`
    );
    assertCondition(
      (await readReportsReceived(service, owner.id)) === 3,
      "The owner's reports_received should be 3"
    );

    // 5. The owner cannot bring it back. The update may be rejected by the
    // guard or match no row under RLS; either way the listing stays removed.
    for (const status of ['active', 'inactive']) {
      const restore = await ownerClient
        .from('marketplace_listings')
        .update({ status })
        .eq('id', listingId)
        .select('id');
      assertCondition(
        !restore.error || restore.error.code === PERMISSION_DENIED,
        `An owner restore to ${status} should fail with ${PERMISSION_DENIED}, got ${restore.error?.code}`
      );
      assertCondition(
        (await readListing(service, listingId)).status === 'removed',
        `The owner should not move a removed listing to ${status}`
      );
    }

    // 6. The service role (the dashboard) can restore it.
    const restored = await service
      .from('marketplace_listings')
      .update({ status: 'active' })
      .eq('id', listingId);
    assertCondition(
      !restored.error,
      `The service role should restore it: ${restored.error?.message}`
    );
    assertCondition(
      (await readListing(service, listingId)).status === 'active',
      'The restored listing should be active'
    );

    console.log('PASS: listing reports smoke test verified.');
  } finally {
    if (listingId) {
      await service.from('reports').delete().eq('target_id', listingId);
      await service.from('marketplace_listings').delete().eq('id', listingId);
    }
    if (forgedListingId) {
      await service.from('marketplace_listings').delete().eq('id', forgedListingId);
    }
    for (const userId of createdUsers) {
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: listing reports smoke test failed: ${message}`);
  process.exit(1);
});
