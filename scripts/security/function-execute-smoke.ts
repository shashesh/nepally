/**
 * Live smoke test: only the roles that need a function can execute it.
 *
 * Verifies migration 041 (restrict_function_execute) against a real Supabase
 * project:
 *   1. anon cannot call the listing counters, the soft-delete RPCs, or the
 *      helpers no client uses.
 *   2. anon and members can still call the RLS policy helpers (is_moderator,
 *      is_conversation_participant, is_conversation_creator), and read the
 *      tables whose policies call them.
 *   3. A signed-in user can call the RPCs the apps use, but not the unused
 *      helpers.
 *   4. Triggers still fire for a signed-in user: liking a post bumps
 *      posts.likes_count.
 *
 * Run: npm run test:security:functions
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

/** Any well-formed uuid: the RPCs must be reachable, not find a row. */
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

type RpcCall = { fn: string; args: Record<string, unknown> };

/** RPCs the apps call signed in; anon must be refused, authenticated let through. */
const SIGNED_IN_RPCS: RpcCall[] = [
  { fn: 'increment_listing_views', args: { p_listing_id: MISSING_ID } },
  { fn: 'increment_listing_contacts', args: { p_listing_id: MISSING_ID } },
  { fn: 'soft_delete_event', args: { p_event_id: MISSING_ID } },
  { fn: 'soft_delete_own_comment', args: { p_comment_id: MISSING_ID } },
];

/** Helpers that RLS policies call as the querying role; anon and members must keep them. */
const POLICY_HELPER_RPCS: RpcCall[] = [
  { fn: 'is_moderator', args: {} },
  { fn: 'is_conversation_participant', args: { conv_id: MISSING_ID, uid: MISSING_ID } },
  { fn: 'is_conversation_creator', args: { conv_id: MISSING_ID, uid: MISSING_ID } },
];

/** Helpers only the database itself uses; every client role must be refused. */
const INTERNAL_RPCS: RpcCall[] = [
  { fn: 'has_user_liked_post', args: { p_post_id: MISSING_ID, p_user_id: MISSING_ID } },
  { fn: 'get_post_like_count', args: { p_post_id: MISSING_ID } },
  { fn: 'get_post_comment_count', args: { p_post_id: MISSING_ID } },
  { fn: 'get_metro_by_zip', args: { zip: '75001' } },
];

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

async function expectDenied(client: SupabaseClient, role: string, { fn, args }: RpcCall) {
  const { error } = await client.rpc(fn, args);
  assertCondition(
    error?.code === PERMISSION_DENIED,
    `${role} should be refused ${fn}, got ${error ? `${error.code}: ${error.message}` : 'success'}`
  );
}

async function expectAllowed(client: SupabaseClient, role: string, { fn, args }: RpcCall) {
  const { error } = await client.rpc(fn, args);
  assertCondition(
    error?.code !== PERMISSION_DENIED,
    `${role} should be allowed ${fn}: ${error?.message}`
  );
}

/** Every policy helper answers, and the tables whose policies call them stay readable. */
async function expectPolicyHelpersWork(client: SupabaseClient, role: string) {
  for (const call of POLICY_HELPER_RPCS) {
    const { data, error } = await client.rpc(call.fn, call.args);
    assertCondition(
      !error && data === false,
      `${role} should get false from ${call.fn}: ${error?.message}`
    );
  }
  for (const table of ['posts', 'conversation_participants']) {
    const { error } = await client.from(table).select('*').limit(1);
    assertCondition(!error, `${role} reads of ${table} should still work: ${error?.message}`);
  }
}

/** Insert an active post as the service role, borrowing a real post's location. */
async function insertPost(service: SupabaseClient, authorId: string): Promise<string> {
  const { data: location, error: locationError } = await service
    .from('posts')
    .select('metro_area_id, location_zip_code, location_city, location_state')
    .limit(1)
    .single();
  if (locationError || !location) {
    throw new Error(`Failed to pick a fixture location: ${locationError?.message || 'no posts'}`);
  }

  const { data, error } = await service
    .from('posts')
    .insert({
      author_id: authorId,
      title: 'Function execute smoke test',
      description: 'Function execute smoke test body',
      status: 'active',
      photos: [],
      is_global: false,
      ...location,
    })
    .select('id')
    .single();
  if (error || !data)
    throw new Error(`Failed to insert fixture post: ${error?.message || 'no row'}`);
  return data.id as string;
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const anon = createClient(url, anonKey, { auth: NO_SESSION_AUTH });

  // 1–2. anon: refused everywhere except the policy helpers.
  for (const call of [...SIGNED_IN_RPCS, ...INTERNAL_RPCS]) {
    await expectDenied(anon, 'anon', call);
  }
  await expectPolicyHelpersWork(anon, 'anon');

  const createdUsers: string[] = [];
  let postId: string | null = null;

  try {
    const member = await createUser(service, 'fn-exec');
    createdUsers.push(member.id);
    const memberClient = await createAuthedClient(url, anonKey, member);

    // 3. Signed in: the apps' RPCs work, the internal helpers don't.
    for (const call of SIGNED_IN_RPCS) {
      await expectAllowed(memberClient, 'authenticated', call);
    }
    for (const call of INTERNAL_RPCS) {
      await expectDenied(memberClient, 'authenticated', call);
    }
    await expectPolicyHelpersWork(memberClient, 'authenticated');

    // 4. Triggers fire although the member holds no EXECUTE on them.
    postId = await insertPost(service, member.id);
    const like = await memberClient
      .from('post_likes')
      .insert({ post_id: postId, user_id: member.id });
    assertCondition(!like.error, `Liking a post should succeed: ${like.error?.message}`);
    const { data: post, error: postError } = await service
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single();
    assertCondition(
      !postError && post?.likes_count === 1,
      `The like trigger should bump likes_count to 1, got ${post?.likes_count}`
    );

    console.log('PASS: function execute smoke test verified.');
  } finally {
    if (postId) {
      await service.from('post_likes').delete().eq('post_id', postId);
      await service.from('posts').delete().eq('id', postId);
    }
    for (const userId of createdUsers) {
      await service.from('notifications').delete().eq('user_id', userId);
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: function execute smoke test failed: ${message}`);
  process.exit(1);
});
