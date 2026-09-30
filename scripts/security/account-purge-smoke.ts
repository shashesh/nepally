/**
 * Live smoke test: the purge-deleted-accounts edge function (migration 049).
 *
 * Against a real Supabase project where 048 to 051 are applied, the function
 * is deployed and its secret is set:
 *   1. A POST without the right x-purge-secret is refused (401).
 *   2. A member uploads an avatar and a post photo, requests deletion, and
 *      has the purge date moved into the past. After a POST with the secret,
 *      the auth user, the profile row and both storage objects are gone.
 *   3. A second pending member whose date is still in the future is left
 *      alone.
 *   4. The due member's comment on the second member's post stops counting:
 *      that post's comments_count drops back (migration 051).
 *
 * This runs a REAL purge: every account whose date has passed is deleted,
 * not only this test's.
 *
 * Run: npm run test:security:account-purge
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *      ACCOUNT_PURGE_SECRET
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = { id: string; email: string; password: string };

const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Projects this check may run against. It deletes every due account, so a
 * production ref must never be added. Staging: nusa-staging.
 */
const PURGE_ALLOWED_PROJECT_REFS = ['tlusiongalvszftnzpoq'];

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

/** `abcd` for `https://abcd.supabase.co`; anything else (a custom domain) is refused. */
function projectRef(url: string): string {
  return new URL(url).hostname.split('.')[0];
}

async function createUser(service: SupabaseClient, prefix: string): Promise<UserFixture> {
  const suffix = `${Date.now()}-${randomToken(6)}`;
  const email = `${prefix}.${suffix}@example.com`;
  const password = `P@ss-${randomToken(12)}`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${prefix} ${suffix}` },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message || 'unknown error'}`);
  }

  const { error: profileError } = await service.from('users').insert({
    id: data.user.id,
    email,
    full_name: `${prefix} ${suffix}`,
    trust_level: 1,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile row for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email, password };
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

async function upload(client: SupabaseClient, bucket: string, path: string): Promise<void> {
  const { error } = await client.storage
    .from(bucket)
    .upload(path, FAKE_JPEG, { contentType: 'image/jpeg' });
  assertCondition(!error, `Upload to ${bucket}/${path} failed: ${error?.message}`);
}

async function requestDeletion(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc('request_account_deletion');
  assertCondition(!error, `request_account_deletion failed: ${error?.message}`);
}

async function setPurgeDate(service: SupabaseClient, userId: string, when: Date): Promise<void> {
  const { error } = await service
    .from('users')
    .update({ deletion_scheduled_for: when.toISOString() })
    .eq('id', userId);
  assertCondition(!error, `Moving the purge date failed: ${error?.message}`);
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

async function commentsCount(service: SupabaseClient, postId: string): Promise<number> {
  const { data, error } = await service
    .from('posts')
    .select('comments_count')
    .eq('id', postId)
    .single();
  if (error || !data) {
    throw new Error(`Reading comments_count failed: ${error?.message || 'no row'}`);
  }
  return data.comments_count as number;
}

async function callPurge(url: string, secret: string): Promise<Response> {
  return fetch(`${url}/functions/v1/purge-deleted-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-purge-secret': secret },
    body: '{}',
  });
}

async function ownedObjects(service: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await service.rpc('list_user_storage_objects', { p_user_id: userId });
  assertCondition(!error, `list_user_storage_objects failed: ${error?.message}`);
  return ((data ?? []) as unknown[]).length;
}

async function main(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const purgeSecret = requireEnv('ACCOUNT_PURGE_SECRET');
  const ref = projectRef(url);
  assertCondition(
    PURGE_ALLOWED_PROJECT_REFS.includes(ref),
    `Refusing to run a real purge on project "${ref}". Allowed: ${PURGE_ALLOWED_PROJECT_REFS.join(', ')}`
  );
  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];

  try {
    // 1. Wrong secret.
    const refused = await callPurge(url, `${purgeSecret}-wrong`);
    assertCondition(refused.status === 401, `A wrong secret should get 401, got ${refused.status}`);

    // 2. A due member with an avatar and a post photo.
    const due = await createUser(service, 'purge-due');
    createdUsers.push(due.id);
    const dueClient = await signIn(url, anonKey, due);
    await upload(dueClient, 'avatars', `${due.id}.jpg`);
    await upload(dueClient, 'post-photos', `${due.id}/purge-smoke.jpg`);
    assertCondition(
      (await ownedObjects(service, due.id)) === 2,
      'The due member should own 2 objects'
    );
    await requestDeletion(dueClient);
    await setPurgeDate(service, due.id, new Date(Date.now() - DAY_MS));

    // 3. A pending member whose date is still ahead.
    const waiting = await createUser(service, 'purge-waiting');
    createdUsers.push(waiting.id);
    await requestDeletion(await signIn(url, anonKey, waiting));

    // 4. The due member comments on the waiting member's post.
    const location = await borrow(
      service,
      'posts',
      'metro_area_id, location_zip_code, location_city, location_state'
    );
    const postId = await insertRow(service, 'posts', {
      author_id: waiting.id,
      title: 'Account purge smoke test',
      description: 'Account purge smoke test body',
      status: 'active',
      photos: [],
      is_global: false,
      ...location,
    });
    await insertRow(service, 'post_comments', {
      post_id: postId,
      author_id: due.id,
      content: 'Account purge smoke test comment',
    });
    assertCondition(
      (await commentsCount(service, postId)) === 1,
      'The comment should count before the purge'
    );

    const response = await callPurge(url, purgeSecret);
    assertCondition(response.ok, `The purge should answer 200, got ${response.status}`);
    const summary = (await response.json()) as { purged: number; skipped: number; failed: number };
    assertCondition(
      summary.purged >= 1,
      `The purge should report at least one purge: ${JSON.stringify(summary)}`
    );
    assertCondition(
      summary.failed === 0,
      `The purge reported failures: ${JSON.stringify(summary)}`
    );

    const { data: authUser } = await service.auth.admin.getUserById(due.id);
    assertCondition(!authUser?.user, 'The due auth user should be gone');
    const { data: profile } = await service
      .from('users')
      .select('id')
      .eq('id', due.id)
      .maybeSingle();
    assertCondition(!profile, 'The due profile row should be gone');
    assertCondition(
      (await ownedObjects(service, due.id)) === 0,
      "The due member's objects should be gone"
    );

    const { data: waitingProfile } = await service
      .from('users')
      .select('id, deletion_scheduled_for')
      .eq('id', waiting.id)
      .maybeSingle();
    assertCondition(
      waitingProfile?.deletion_scheduled_for,
      'The member whose date is still ahead should be untouched'
    );

    const countAfter = await commentsCount(service, postId);
    assertCondition(
      countAfter === 0,
      `The purged member's comment should stop counting, comments_count is ${countAfter}`
    );

    console.log('PASS: account purge smoke test verified.');
  } finally {
    for (const userId of createdUsers) {
      const { data: leftovers } = await service.rpc('list_user_storage_objects', {
        p_user_id: userId,
      });
      for (const { bucket_id, name } of (leftovers ?? []) as {
        bucket_id: string;
        name: string;
      }[]) {
        await service.storage.from(bucket_id).remove([name]);
      }
      // The due user is normally gone already; deleting again just errors.
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
