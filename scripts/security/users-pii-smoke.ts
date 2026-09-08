/**
 * Live smoke test: `users` PII is not readable through the REST API.
 *
 * Verifies migration 036 (column-level SELECT on public.users + get_my_profile)
 * against a real Supabase project:
 *   1. The anon key cannot read email / phone / zip_code, nor `select('*')`.
 *   2. A signed-in user cannot read another member's PII columns either.
 *   3. Public-profile columns remain readable by anon and authenticated.
 *   4. The owner reads their own full row (email, phone, zip_code) through the
 *      get_my_profile RPC; anon cannot call it.
 *   5. Ordinary profile writes still work, and the post-write read-back path
 *      (update without RETURNING, then RPC) returns the full row.
 *
 * Run: npm run test:security:users-pii
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = {
  id: string;
  email: string;
  password: string;
  fullName: string;
};

/** Mirrors PUBLIC_USER_COLUMNS in packages/shared/src/constants/users.ts. */
const PUBLIC_COLUMNS =
  'id, full_name, profile_photo, bio, hometown_district, college, years_in_us, languages, ' +
  'follower_count, following_count, metro_area_id, trust_level, is_premium, is_moderator, ' +
  'is_banned, posts_count, helpful_votes_received, created_at, updated_at, last_active_at';

const PII_COLUMNS = ['email', 'phone', 'zip_code', 'ban_reason', 'reports_received'];

/** Postgres insufficient_privilege — what a column-grant violation surfaces as. */
const PERMISSION_DENIED_CODE = '42501';

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

async function createFixtureUser(
  service: SupabaseClient,
  prefix: string,
  profile: { phone: string; zipCode: string }
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
    phone: profile.phone,
    zip_code: profile.zipCode,
    trust_level: 1,
  });

  if (profileError) {
    throw new Error(`Failed to create profile for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email, password, fullName };
}

async function expectColumnRead(
  client: SupabaseClient,
  userId: string,
  columns: string,
  label: string,
  expectDenied: boolean
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.from('users').select(columns).eq('id', userId).maybeSingle();

  if (expectDenied) {
    assertCondition(!!error, `${label}: reading "${columns}" should be denied, but succeeded`);
    // Insist on the privilege error so an unrelated failure cannot masquerade as a pass.
    assertCondition(
      error?.code === PERMISSION_DENIED_CODE,
      `${label}: reading "${columns}" was rejected for an unexpected reason: ${error?.code} ${error?.message}`
    );
    return null;
  }

  assertCondition(!error, `${label}: reading "${columns}" should succeed: ${error?.message}`);
  return (data as Record<string, unknown> | null) ?? null;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: NO_SESSION_AUTH });
  const anon = createClient(supabaseUrl, supabaseAnonKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];

  try {
    const target = await createFixtureUser(service, 'pii-target', {
      phone: '+15550100',
      zipCode: '75001',
    });
    const viewer = await createFixtureUser(service, 'pii-viewer', {
      phone: '+15550199',
      zipCode: '75002',
    });
    createdUsers.push(target.id, viewer.id);

    const viewerClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, viewer);
    const targetClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, target);

    // 1. anon: PII columns and select(*) are denied; public columns work.
    for (const column of PII_COLUMNS) {
      await expectColumnRead(anon, target.id, column, 'anon', true);
    }
    await expectColumnRead(anon, target.id, '*', 'anon', true);
    const anonPublic = await expectColumnRead(anon, target.id, PUBLIC_COLUMNS, 'anon', false);
    assertCondition(anonPublic?.full_name === target.fullName, 'anon should read public full_name');

    // 2. another signed-in user: same restrictions.
    for (const column of PII_COLUMNS) {
      await expectColumnRead(viewerClient, target.id, column, 'viewer', true);
    }
    await expectColumnRead(viewerClient, target.id, '*', 'viewer', true);
    // Filtering on a withheld column must not work as an oracle either.
    const { error: filterError } = await viewerClient
      .from('users')
      .select('id')
      .eq('zip_code', '75001');
    assertCondition(
      filterError?.code === PERMISSION_DENIED_CODE,
      `viewer: filtering on zip_code should be denied: ${filterError?.code} ${filterError?.message}`
    );

    // 3. public columns remain readable for authenticated users.
    const viewerPublic = await expectColumnRead(viewerClient, target.id, PUBLIC_COLUMNS, 'viewer', false);
    assertCondition(viewerPublic?.trust_level === 1, 'viewer should read public trust_level');

    // 4. own full row via RPC; anon cannot call it.
    const { data: ownRow, error: ownError } = await targetClient.rpc('get_my_profile').maybeSingle();
    assertCondition(!ownError, `get_my_profile should succeed for the owner: ${ownError?.message}`);
    const own = ownRow as Record<string, unknown> | null;
    assertCondition(own?.email === target.email, 'get_my_profile should return the owner email');
    assertCondition(own?.phone === '+15550100', 'get_my_profile should return the owner phone');
    assertCondition(own?.zip_code === '75001', 'get_my_profile should return the owner zip_code');

    const { data: viewerOwn } = await viewerClient.rpc('get_my_profile').maybeSingle();
    assertCondition(
      (viewerOwn as Record<string, unknown> | null)?.id === viewer.id,
      'get_my_profile must return the caller, never another user'
    );

    const { error: anonRpcError } = await anon.rpc('get_my_profile').maybeSingle();
    assertCondition(!!anonRpcError, 'anon must not be able to call get_my_profile');

    // 5. writes: update without RETURNING succeeds; RETURNING * is denied; RPC read-back works.
    const { error: updateError } = await targetClient
      .from('users')
      .update({ bio: 'pii smoke bio' })
      .eq('id', target.id);
    assertCondition(!updateError, `Own profile update should succeed: ${updateError?.message}`);

    const { error: returningError } = await targetClient
      .from('users')
      .update({ bio: 'pii smoke bio 2' })
      .eq('id', target.id)
      .select()
      .single();
    assertCondition(
      returningError?.code === PERMISSION_DENIED_CODE,
      `update ... RETURNING * should be denied by the column grant: ${returningError?.code} ${returningError?.message}`
    );

    const { data: afterWrite } = await targetClient.rpc('get_my_profile').maybeSingle();
    assertCondition(
      (afterWrite as Record<string, unknown> | null)?.bio === 'pii smoke bio',
      'RPC read-back should reflect the successful update and not the denied one'
    );

    console.log('PASS: users PII smoke test verified column-level read restrictions.');
  } finally {
    for (const userId of createdUsers) {
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: users PII smoke test failed: ${message}`);
  process.exit(1);
});
