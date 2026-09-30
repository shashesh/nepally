/**
 * Live smoke test: account deletion requests, hiding and restore.
 *
 * Verifies migrations 048 and 050 against a real Supabase project:
 *   1. amr_signed_in_within accepts a recent sign-in and rejects stale, empty
 *      and malformed amr claims (this is the check request_account_deletion
 *      runs on the caller's JWT).
 *   2. A member cannot set deletion_scheduled_for directly (034 guard).
 *   3. request_account_deletion, right after signing in, schedules deletion
 *      29 days out (050), returns the same date when repeated, and removes the
 *      member's device tokens.
 *   4. While deletion is pending, another member cannot see the profile,
 *      post, comment, like, follows, listing, event or RSVP, nor the
 *      listing through marketplace_listings_view or the member through
 *      user_helper_scores. A signed-out visitor loses the profile, post,
 *      comment, like and helper score too. A moderator still sees all of it.
 *      The member themself still sees everything except follow edges, which
 *      are hidden when either end is pending. A private-RSVP event's RSVP
 *      stays hidden from the viewer and the moderator throughout: the
 *      pending check never widens the original rule.
 *   5. cancel_account_deletion makes everything visible again.
 *   6. Once the date has passed, cancel_account_deletion raises
 *      deletion_in_progress and keeps the date (050), so a restore can't race
 *      the purge.
 *   7. Without a user JWT (service role), request and cancel raise
 *      not_authenticated.
 *   8. A member creating their own profile row can't set
 *      deletion_scheduled_for: the 034 guard's INSERT branch nulls it.
 *
 * Run: npm run test:security:account-deletion
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = { id: string; email: string; password: string };

type ContentFixtures = {
  postId: string;
  commentId: string;
  listingId: string;
  eventId: string;
  /** An event with rsvp_visibility 'private', organised by the owner, who RSVPs to it. */
  privateEventId: string;
};

const GRACE_DAYS = 29;
const REAUTH_MAX_AGE_SECONDS = 600;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Slack for clock drift between this machine and the database. Well under a day. */
const SCHEDULE_TOLERANCE_MS = 10 * 60 * 1000;
/**
 * How far step 6 moves the date into the past: enough that cancel is refused,
 * and well inside the purge's one-hour margin (050), so a real hourly purge on
 * staging can't take this account mid-test.
 */
const JUST_PAST_MS = 5 * 60 * 1000;
const DELETION_IN_PROGRESS = 'deletion_in_progress';
const NOT_AUTHENTICATED = 'not_authenticated';

/** Error the 034 guard trigger raises (ERRCODE 42501 + fixed message). */
const PRIVILEGE_GUARD_ERROR_CODE = '42501';
const PRIVILEGE_GUARD_MESSAGE = 'Privileged user columns cannot be modified directly';

const NO_SESSION_AUTH = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
} as const;

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

/** An auth user with no profile row yet, like a member between sign-up and onboarding. */
async function createAuthUser(
  service: SupabaseClient,
  prefix: string
): Promise<UserFixture & { fullName: string }> {
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
  return { id: data.user.id, email, password, fullName };
}

async function createUser(
  service: SupabaseClient,
  prefix: string,
  isModerator = false
): Promise<UserFixture> {
  const { fullName, ...fixture } = await createAuthUser(service, prefix);

  const { error: profileError } = await service.from('users').insert({
    id: fixture.id,
    email: fixture.email,
    full_name: fullName,
    trust_level: 1,
    is_moderator: isModerator,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(fixture.id);
    throw new Error(`Failed to create profile row for ${fixture.email}: ${profileError.message}`);
  }

  return fixture;
}

async function signIn(url: string, anonKey: string, fixture: UserFixture): Promise<SupabaseClient> {
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
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

/** Copies columns from any existing row, so fixtures satisfy this project's enums and FKs. */
async function borrow(
  service: SupabaseClient,
  table: string,
  columns: string
): Promise<Record<string, unknown>> {
  const { data, error } = await service.from(table).select(columns).limit(1).single();
  if (error || !data) {
    throw new Error(`Failed to borrow a ${table} row: ${error?.message || 'none on this project'}`);
  }
  return data as unknown as Record<string, unknown>;
}

async function insertRow(
  service: SupabaseClient,
  table: string,
  row: Record<string, unknown>
): Promise<string> {
  const { data, error } = await service.from(table).insert(row).select('id').single();
  if (error || !data) {
    throw new Error(`Failed to insert fixture ${table}: ${error?.message || 'no row'}`);
  }
  return data.id as string;
}

async function insertLink(
  service: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const { error } = await service.from(table).insert(rows);
  assertCondition(!error, `Failed to insert fixture ${table}: ${error?.message}`);
}

/** The owner's post, comment, like, both follow edges, listing, event and RSVP. */
async function seedContent(
  service: SupabaseClient,
  owner: UserFixture,
  other: UserFixture
): Promise<ContentFixtures> {
  const location = await borrow(
    service,
    'posts',
    'metro_area_id, location_zip_code, location_city, location_state'
  );
  const postId = await insertRow(service, 'posts', {
    author_id: owner.id,
    title: 'Account deletion smoke test',
    description: 'Account deletion smoke test body',
    status: 'active',
    photos: [],
    is_global: false,
    ...location,
  });
  const commentId = await insertRow(service, 'post_comments', {
    post_id: postId,
    author_id: owner.id,
    content: 'Account deletion smoke test comment',
  });
  await insertLink(service, 'post_likes', [{ post_id: postId, user_id: owner.id }]);
  await insertLink(service, 'user_follows', [
    { follower_id: owner.id, followee_id: other.id },
    { follower_id: other.id, followee_id: owner.id },
  ]);

  const listingShape = await borrow(
    service,
    'marketplace_listings',
    'metro_area_id, category_id, listing_type'
  );
  const listingId = await insertRow(service, 'marketplace_listings', {
    owner_id: owner.id,
    title: 'Account deletion smoke test listing',
    description: 'Account deletion smoke test listing body',
    status: 'active',
    ...listingShape,
  });

  const eventShape = await borrow(service, 'events', 'metro_area_id, event_type');
  const eventId = await insertRow(service, 'events', {
    organizer_id: owner.id,
    title: 'Account deletion smoke test event',
    description: 'Account deletion smoke test event body',
    location_name: 'Smoke Test Hall',
    start_date: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    ...eventShape,
  });
  await insertLink(service, 'event_rsvps', [{ event_id: eventId, user_id: owner.id }]);

  const privateEventId = await insertRow(service, 'events', {
    organizer_id: owner.id,
    title: 'Account deletion smoke test private event',
    description: 'Account deletion smoke test private event body',
    location_name: 'Smoke Test Hall',
    start_date: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    rsvp_visibility: 'private',
    ...eventShape,
  });
  await insertLink(service, 'event_rsvps', [{ event_id: privateEventId, user_id: owner.id }]);

  return { postId, commentId, listingId, eventId, privateEventId };
}

/** Rows returned, failing loudly on an error so a denied read can't pass as "0 visible". */
async function count(
  label: string,
  query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<number> {
  const { data, error } = await query;
  assertCondition(!error, `Reading ${label} failed: ${error?.message}`);
  return data?.length ?? 0;
}

/**
 * What a signed-out visitor can read of the owner: the tables and view that
 * anon reads (public profile and post pages). Listings are signed-in only.
 */
async function publicCounts(
  client: SupabaseClient,
  ownerId: string,
  fixtures: ContentFixtures
): Promise<Record<string, number>> {
  return {
    profile: await count('users', client.from('users').select('id').eq('id', ownerId)),
    post: await count('posts', client.from('posts').select('id').eq('id', fixtures.postId)),
    comment: await count(
      'post_comments',
      client.from('post_comments').select('id').eq('id', fixtures.commentId)
    ),
    like: await count(
      'post_likes',
      client
        .from('post_likes')
        .select('post_id')
        .eq('post_id', fixtures.postId)
        .eq('user_id', ownerId)
    ),
    helperScore: await count(
      'user_helper_scores',
      client.from('user_helper_scores').select('user_id').eq('user_id', ownerId)
    ),
  };
}

const PUBLIC_VISIBLE = { profile: 1, post: 1, comment: 1, like: 1, helperScore: 1 };
const PUBLIC_NONE = { profile: 0, post: 0, comment: 0, like: 0, helperScore: 0 };

/** How many of the owner's rows each table and view shows the given signed-in client. */
async function visibleCounts(
  client: SupabaseClient,
  ownerId: string,
  fixtures: ContentFixtures
): Promise<Record<string, number>> {
  return {
    profile: await count('users', client.from('users').select('id').eq('id', ownerId)),
    post: await count('posts', client.from('posts').select('id').eq('id', fixtures.postId)),
    comment: await count(
      'post_comments',
      client.from('post_comments').select('id').eq('id', fixtures.commentId)
    ),
    like: await count(
      'post_likes',
      client
        .from('post_likes')
        .select('post_id')
        .eq('post_id', fixtures.postId)
        .eq('user_id', ownerId)
    ),
    follows: await count(
      'user_follows',
      client
        .from('user_follows')
        .select('follower_id')
        .or(`follower_id.eq.${ownerId},followee_id.eq.${ownerId}`)
    ),
    listing: await count(
      'marketplace_listings',
      client.from('marketplace_listings').select('id').eq('id', fixtures.listingId)
    ),
    event: await count('events', client.from('events').select('id').eq('id', fixtures.eventId)),
    rsvp: await count(
      'event_rsvps',
      client.from('event_rsvps').select('event_id').eq('event_id', fixtures.eventId)
    ),
    privateRsvp: await count(
      'event_rsvps (private event)',
      client.from('event_rsvps').select('event_id').eq('event_id', fixtures.privateEventId)
    ),
    listingView: await count(
      'marketplace_listings_view',
      client.from('marketplace_listings_view').select('id').eq('id', fixtures.listingId)
    ),
    helperScore: await count(
      'user_helper_scores',
      client.from('user_helper_scores').select('user_id').eq('user_id', ownerId)
    ),
  };
}

/**
 * What an ordinary member, or a moderator, sees of an active owner. The
 * private-RSVP event's RSVP is 0: only its organiser and the RSVP's member
 * may see it, and neither the pending check nor the moderator exception
 * may widen that.
 */
const ALL_VISIBLE = {
  profile: 1,
  post: 1,
  comment: 1,
  like: 1,
  follows: 2,
  listing: 1,
  event: 1,
  rsvp: 1,
  privateRsvp: 0,
  listingView: 1,
  helperScore: 1,
};

const NONE_VISIBLE = {
  profile: 0,
  post: 0,
  comment: 0,
  like: 0,
  follows: 0,
  listing: 0,
  event: 0,
  rsvp: 0,
  privateRsvp: 0,
  listingView: 0,
  helperScore: 0,
};

function expectCounts(
  actual: Record<string, number>,
  expected: Record<string, number>,
  who: string
) {
  for (const [key, value] of Object.entries(expected)) {
    assertCondition(
      actual[key] === value,
      `${who} should see ${value} ${key} row(s), saw ${actual[key]}`
    );
  }
}

async function checkAmrHelper(service: SupabaseClient): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cases: { label: string; amr: unknown; expected: boolean }[] = [
    {
      label: 'fresh password sign-in',
      amr: [{ method: 'password', timestamp: nowSeconds - 5 }],
      expected: true,
    },
    {
      label: 'stale sign-in',
      amr: [{ method: 'password', timestamp: nowSeconds - 3600 }],
      expected: false,
    },
    {
      label: 'stale password, fresh oauth',
      amr: [
        { method: 'oauth', timestamp: nowSeconds - 5 },
        { method: 'password', timestamp: nowSeconds - 3600 },
      ],
      expected: true,
    },
    { label: 'empty amr', amr: [], expected: false },
    { label: 'missing amr', amr: null, expected: false },
    { label: 'amr not an array', amr: { method: 'password' }, expected: false },
    {
      label: 'string timestamp',
      amr: [{ method: 'password', timestamp: String(nowSeconds) }],
      expected: false,
    },
  ];

  for (const { label, amr, expected } of cases) {
    const { data, error } = await service.rpc('amr_signed_in_within', {
      p_amr: amr,
      p_max_age_seconds: REAUTH_MAX_AGE_SECONDS,
    });
    assertCondition(!error, `amr_signed_in_within (${label}) failed: ${error?.message}`);
    assertCondition(
      data === expected,
      `amr_signed_in_within (${label}) should be ${expected}, got ${data}`
    );
  }
}

async function main(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];

  try {
    // 1. The sign-in recency check.
    await checkAmrHelper(service);

    const owner = await createUser(service, 'del-owner');
    createdUsers.push(owner.id);
    const viewer = await createUser(service, 'del-viewer');
    createdUsers.push(viewer.id);
    const moderator = await createUser(service, 'del-mod', true);
    createdUsers.push(moderator.id);

    const fixtures = await seedContent(service, owner, viewer);
    await insertLink(service, 'device_tokens', [
      { user_id: owner.id, token: `ExponentPushToken[smoke-${randomToken(10)}]`, platform: 'expo' },
    ]);

    const ownerClient = await signIn(url, anonKey, owner);
    const viewerClient = await signIn(url, anonKey, viewer);
    const moderatorClient = await signIn(url, anonKey, moderator);
    const anonClient = createClient(url, anonKey, { auth: NO_SESSION_AUTH });

    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      ALL_VISIBLE,
      'viewer before'
    );
    expectCounts(
      await publicCounts(anonClient, owner.id, fixtures),
      PUBLIC_VISIBLE,
      'signed-out visitor before'
    );

    // 2. The column can't be written directly.
    const { error: directError } = await ownerClient
      .from('users')
      .update({ deletion_scheduled_for: new Date().toISOString() })
      .eq('id', owner.id)
      .select('id');
    assertCondition(
      directError?.code === PRIVILEGE_GUARD_ERROR_CODE &&
        directError.message.includes(PRIVILEGE_GUARD_MESSAGE),
      `Direct update of deletion_scheduled_for should hit the guard, got ${directError?.code} ${directError?.message}`
    );

    // 3. Request right after signing in.
    const before = Date.now();
    const { data: scheduled, error: requestError } = await ownerClient.rpc(
      'request_account_deletion'
    );
    assertCondition(
      !requestError,
      `request_account_deletion should succeed: ${requestError?.message}`
    );
    const scheduledMs = new Date(scheduled as string).getTime();
    const expectedMs = before + GRACE_DAYS * DAY_MS;
    assertCondition(
      Math.abs(scheduledMs - expectedMs) < SCHEDULE_TOLERANCE_MS,
      `Deletion should be scheduled ${GRACE_DAYS} days out, got ${scheduled}`
    );

    const { data: again, error: againError } = await ownerClient.rpc('request_account_deletion');
    assertCondition(!againError, `A repeated request should succeed: ${againError?.message}`);
    assertCondition(
      new Date(again as string).getTime() === scheduledMs,
      `A repeated request should return the same date, got ${again}`
    );

    const { data: tokens, error: tokensError } = await service
      .from('device_tokens')
      .select('id')
      .eq('user_id', owner.id);
    assertCondition(!tokensError, `Reading device tokens failed: ${tokensError?.message}`);
    assertCondition((tokens ?? []).length === 0, 'The request should remove every device token');

    // 4. Hidden from members, visible to moderators and the owner.
    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      NONE_VISIBLE,
      'viewer while pending'
    );
    expectCounts(
      await publicCounts(anonClient, owner.id, fixtures),
      PUBLIC_NONE,
      'signed-out visitor while pending'
    );
    expectCounts(
      await visibleCounts(moderatorClient, owner.id, fixtures),
      ALL_VISIBLE,
      'moderator while pending'
    );
    const ownerView = await visibleCounts(ownerClient, owner.id, fixtures);
    expectCounts(ownerView, { ...ALL_VISIBLE, follows: 0, privateRsvp: 1 }, 'owner while pending');

    const { data: ownProfile, error: ownProfileError } = await ownerClient
      .rpc('get_my_profile')
      .maybeSingle();
    assertCondition(!ownProfileError, `get_my_profile failed: ${ownProfileError?.message}`);
    assertCondition(
      (ownProfile as { deletion_scheduled_for: string | null } | null)?.deletion_scheduled_for,
      'get_my_profile should return deletion_scheduled_for while pending'
    );

    // 5. Restore.
    const { error: cancelError } = await ownerClient.rpc('cancel_account_deletion');
    assertCondition(
      !cancelError,
      `cancel_account_deletion should succeed: ${cancelError?.message}`
    );
    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      ALL_VISIBLE,
      'viewer after restore'
    );
    expectCounts(
      await publicCounts(anonClient, owner.id, fixtures),
      PUBLIC_VISIBLE,
      'signed-out visitor after restore'
    );

    // 6. Restore closes once the date has passed.
    const { error: secondRequestError } = await ownerClient.rpc('request_account_deletion');
    assertCondition(
      !secondRequestError,
      `A second request should succeed: ${secondRequestError?.message}`
    );
    const pastDate = new Date(Date.now() - JUST_PAST_MS).toISOString();
    const { error: backdateError } = await service
      .from('users')
      .update({ deletion_scheduled_for: pastDate })
      .eq('id', owner.id);
    assertCondition(
      !backdateError,
      `Moving the date into the past failed: ${backdateError?.message}`
    );

    const { error: lateCancelError } = await ownerClient.rpc('cancel_account_deletion');
    assertCondition(
      lateCancelError?.message === DELETION_IN_PROGRESS,
      `A cancel after the date should raise ${DELETION_IN_PROGRESS}, got ${lateCancelError?.message ?? 'success'}`
    );
    const { data: afterLateCancel, error: afterLateCancelError } = await service
      .from('users')
      .select('deletion_scheduled_for')
      .eq('id', owner.id)
      .single();
    if (afterLateCancelError || !afterLateCancel) {
      throw new Error(`Reading the date back failed: ${afterLateCancelError?.message || 'no row'}`);
    }
    assertCondition(
      new Date(afterLateCancel.deletion_scheduled_for as string).getTime() ===
        new Date(pastDate).getTime(),
      `A refused cancel should keep the date, got ${afterLateCancel.deletion_scheduled_for}`
    );

    // 7. No user JWT: the service role holds EXECUTE but has no auth.uid().
    for (const fn of ['request_account_deletion', 'cancel_account_deletion']) {
      const { error: noUserError } = await service.rpc(fn);
      assertCondition(
        noUserError?.message === NOT_AUTHENTICATED,
        `${fn} without a user should raise ${NOT_AUTHENTICATED}, got ${noUserError?.message ?? 'success'}`
      );
    }

    // 8. A member creating their own profile can't pick a deletion date.
    const signup = await createAuthUser(service, 'del-signup');
    createdUsers.push(signup.id);
    const signupClient = await signIn(url, anonKey, signup);
    const { error: signupInsertError } = await signupClient.from('users').insert({
      id: signup.id,
      email: signup.email,
      full_name: signup.fullName,
      deletion_scheduled_for: new Date(Date.now() - DAY_MS).toISOString(),
    });
    assertCondition(
      !signupInsertError,
      `A member should be able to create their own profile: ${signupInsertError?.message}`
    );
    const { data: signupRow, error: signupRowError } = await service
      .from('users')
      .select('deletion_scheduled_for')
      .eq('id', signup.id)
      .single();
    if (signupRowError || !signupRow) {
      throw new Error(`Reading the new profile failed: ${signupRowError?.message || 'no row'}`);
    }
    assertCondition(
      signupRow.deletion_scheduled_for === null,
      `The guard should null deletion_scheduled_for on insert, got ${signupRow.deletion_scheduled_for}`
    );

    console.log('PASS: account deletion smoke test verified.');
  } finally {
    // Deleting the auth user cascades to the profile and every fixture row.
    for (const userId of createdUsers) {
      const { error } = await service.auth.admin.deleteUser(userId);
      if (error) console.error(`Cleanup failed for ${userId}: ${error.message}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
