/**
 * Live smoke test: privileged `users` columns cannot be self-escalated.
 *
 * Verifies migration 034 (guard_user_privileged_columns) against a real
 * Supabase project:
 *   1. A signed-in user cannot set is_moderator / is_premium / trust_level on
 *      their own row via the REST API.
 *   2. Ordinary profile edits (bio) still work.
 *   3. A client-side profile INSERT with elevated flags is coerced to defaults.
 *   4. The mark_user_verified RPC promotes a confirmed user to trust_level 1.
 *
 * Run: npm run test:security:users-privilege
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = {
  id: string;
  email: string;
  password: string;
  fullName: string;
};

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

/** Creates a confirmed auth user. Profile row creation is left to the caller. */
async function createAuthUser(service: SupabaseClient, prefix: string): Promise<UserFixture> {
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

async function readPrivilegedColumns(service: SupabaseClient, userId: string) {
  const { data, error } = await service
    .from('users')
    .select('trust_level, is_moderator, is_premium, email_verified, reports_received')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to read user ${userId}: ${error?.message || 'no row'}`);
  }

  return data;
}

/** Error the 034 guard trigger raises (ERRCODE 42501 + fixed message). */
const PRIVILEGE_GUARD_ERROR_CODE = '42501';
const PRIVILEGE_GUARD_MESSAGE = 'Privileged user columns cannot be modified directly';

async function expectSelfUpdateBlocked(
  client: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
  label: string
): Promise<void> {
  const { error } = await client.from('users').update(patch).eq('id', userId).select('id');
  assertCondition(!!error, `Self-update of ${label} should be rejected, but succeeded`);
  // Any error would satisfy the check above; insist on the guard trigger specifically so
  // an unrelated failure (auth, network, RLS drift) cannot masquerade as a pass.
  assertCondition(
    error?.code === PRIVILEGE_GUARD_ERROR_CODE && error.message.includes(PRIVILEGE_GUARD_MESSAGE),
    `Self-update of ${label} was rejected for an unexpected reason: ${error?.code} ${error?.message}`
  );
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];

  try {
    // --- Fixture A: profile created server-side at trust_level 0 ---
    const userA = await createAuthUser(service, 'priv-a');
    createdUsers.push(userA.id);

    const { error: profileAError } = await service.from('users').insert({
      id: userA.id,
      email: userA.email,
      full_name: userA.fullName,
      trust_level: 0,
    });
    assertCondition(!profileAError, `Failed to create profile A: ${profileAError?.message}`);

    const clientA = await createAuthedClient(supabaseUrl, supabaseAnonKey, userA);

    // 1. Privileged self-updates must be rejected.
    await expectSelfUpdateBlocked(clientA, userA.id, { is_moderator: true }, 'is_moderator');
    await expectSelfUpdateBlocked(clientA, userA.id, { is_premium: true }, 'is_premium');
    await expectSelfUpdateBlocked(clientA, userA.id, { trust_level: 2 }, 'trust_level');
    await expectSelfUpdateBlocked(clientA, userA.id, { email_verified: true }, 'email_verified');
    await expectSelfUpdateBlocked(
      clientA,
      userA.id,
      { reports_received: 0, is_banned: true },
      'is_banned'
    );

    const afterBlocked = await readPrivilegedColumns(service, userA.id);
    assertCondition(afterBlocked.is_moderator === false, 'is_moderator must remain false');
    assertCondition(afterBlocked.is_premium === false, 'is_premium must remain false');
    assertCondition(afterBlocked.trust_level === 0, 'trust_level must remain 0');

    // 2. Ordinary profile edits still work.
    const { error: bioError } = await clientA
      .from('users')
      .update({ bio: 'smoke test bio' })
      .eq('id', userA.id)
      .select('id');
    assertCondition(!bioError, `Ordinary profile update should succeed: ${bioError?.message}`);

    // 3. The verification RPC promotes a confirmed user to trust_level 1.
    const { data: verified, error: rpcError } = await clientA.rpc('mark_user_verified');
    assertCondition(!rpcError, `mark_user_verified RPC should succeed: ${rpcError?.message}`);
    const verifiedRow = Array.isArray(verified) ? verified[0] : verified;
    assertCondition(verifiedRow?.trust_level === 1, 'RPC should promote trust_level to 1');
    assertCondition(verifiedRow?.email_verified === true, 'RPC should mark email_verified');

    const afterRpc = await readPrivilegedColumns(service, userA.id);
    assertCondition(afterRpc.trust_level === 1, 'trust_level should persist as 1 after RPC');

    // --- Fixture B: client-side profile INSERT with elevated flags is coerced ---
    const userB = await createAuthUser(service, 'priv-b');
    createdUsers.push(userB.id);
    const clientB = await createAuthedClient(supabaseUrl, supabaseAnonKey, userB);

    const { error: insertBError } = await clientB.from('users').insert({
      id: userB.id,
      email: userB.email,
      full_name: userB.fullName,
      trust_level: 2,
      is_moderator: true,
      is_premium: true,
    });
    assertCondition(
      !insertBError,
      `Client profile insert should succeed: ${insertBError?.message}`
    );

    const insertedB = await readPrivilegedColumns(service, userB.id);
    assertCondition(insertedB.trust_level === 0, 'Inserted trust_level must be coerced to 0');
    assertCondition(
      insertedB.is_moderator === false,
      'Inserted is_moderator must be coerced to false'
    );
    assertCondition(insertedB.is_premium === false, 'Inserted is_premium must be coerced to false');

    console.log('PASS: users privilege smoke test verified privileged columns are guarded.');
  } finally {
    for (const userId of createdUsers) {
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: users privilege smoke test failed: ${message}`);
  process.exit(1);
});
