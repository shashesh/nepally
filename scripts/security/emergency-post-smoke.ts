/**
 * Live smoke test: Emergency (moderated) posts + moderator actions.
 *
 * Verifies migration 035 (emergency_post_moderation) against a real Supabase
 * project:
 *   1. A verified user can create a post with status = 'pending'.
 *   2. The author can read their own pending post; a stranger cannot.
 *   3. The author cannot self-approve (status -> 'active').
 *   4. A moderator can read the pending post and approve it.
 *   5. Three reports auto-hide an active post (status -> 'pending') and bump
 *      posts.reports_count / users.reports_received; a duplicate open report
 *      from the same reporter is rejected.
 *   6. Only moderators can ban; banning removes the user's posts and blocks
 *      further posting; unbanning restores posting.
 *
 * Run: npm run test:security:emergency-post
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
  return Math.random().toString(36).slice(2, 2 + length);
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
    throw new Error(`Failed to sign in test user ${fixture.email}: ${error?.message || 'no session'}`);
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
  overrides: Record<string, unknown> = {}
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
    trust_level: 1,
    ...overrides,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile row for ${email}: ${profileError.message}`);
  }

  return { id: data.user.id, email, password, fullName };
}

type PostLocation = {
  metro_area_id: string;
  location_zip_code: string;
  location_city: string;
  location_state: string;
};

/** Borrow the location of any existing post so fixtures use a real metro id. */
async function pickLocation(service: SupabaseClient): Promise<PostLocation> {
  const { data, error } = await service
    .from('posts')
    .select('metro_area_id, location_zip_code, location_city, location_state')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Failed to pick a fixture location: ${error?.message || 'no posts to borrow a location from'}`);
  }

  return data as PostLocation;
}

async function insertPost(
  client: SupabaseClient,
  authorId: string,
  location: PostLocation,
  status: 'active' | 'pending',
  title: string
) {
  return client
    .from('posts')
    .insert({
      author_id: authorId,
      title,
      description: `${title} — smoke test body`,
      status,
      photos: [],
      is_global: false,
      ...location,
    })
    .select('id, status')
    .single();
}

async function readPostStatus(service: SupabaseClient, postId: string) {
  const { data, error } = await service
    .from('posts')
    .select('status, reports_count')
    .eq('id', postId)
    .single();
  if (error || !data) throw new Error(`Failed to read post ${postId}: ${error?.message || 'no row'}`);
  return data;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  const createdPosts: string[] = [];

  try {
    const location = await pickLocation(service);

    const author = await createFixtureUser(service, 'em-author');
    const stranger = await createFixtureUser(service, 'em-stranger');
    const moderator = await createFixtureUser(service, 'em-mod', { is_moderator: true });
    const reporter2 = await createFixtureUser(service, 'em-rep2');
    const reporter3 = await createFixtureUser(service, 'em-rep3');
    createdUsers.push(author.id, stranger.id, moderator.id, reporter2.id, reporter3.id);

    const authorClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, author);
    const strangerClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, stranger);
    const moderatorClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, moderator);
    const reporter2Client = await createAuthedClient(supabaseUrl, supabaseAnonKey, reporter2);
    const reporter3Client = await createAuthedClient(supabaseUrl, supabaseAnonKey, reporter3);

    // 1. Verified author can create a pending (moderated) post.
    const pendingInsert = await insertPost(authorClient, author.id, location, 'pending', 'Emergency smoke');
    assertCondition(!pendingInsert.error, `Pending post insert should succeed: ${pendingInsert.error?.message}`);
    const pendingPostId = pendingInsert.data!.id as string;
    createdPosts.push(pendingPostId);
    assertCondition(pendingInsert.data!.status === 'pending', 'Inserted post should be pending');

    // 2. Author sees own pending post; stranger does not.
    const authorRead = await authorClient.from('posts').select('id').eq('id', pendingPostId);
    assertCondition(!authorRead.error && authorRead.data?.length === 1, 'Author should see own pending post');

    const strangerRead = await strangerClient.from('posts').select('id').eq('id', pendingPostId);
    assertCondition(!strangerRead.error && strangerRead.data?.length === 0, 'Stranger must not see a pending post');

    // 3. Author cannot self-approve.
    const selfApprove = await authorClient
      .from('posts')
      .update({ status: 'active' })
      .eq('id', pendingPostId)
      .select('id');
    assertCondition(!!selfApprove.error, 'Author self-approval should be rejected');
    assertCondition((await readPostStatus(service, pendingPostId)).status === 'pending', 'Post must stay pending after self-approval attempt');

    // 4. Moderator sees and approves the pending post.
    const modRead = await moderatorClient.from('posts').select('id').eq('id', pendingPostId);
    assertCondition(!modRead.error && modRead.data?.length === 1, 'Moderator should see pending posts');

    const approve = await moderatorClient
      .from('posts')
      .update({ status: 'active' })
      .eq('id', pendingPostId)
      .select('id, status')
      .single();
    assertCondition(!approve.error, `Moderator approval should succeed: ${approve.error?.message}`);
    assertCondition(approve.data?.status === 'active', 'Approved post should be active');

    // 5. Three reports auto-hide the post; duplicate open report is rejected.
    const reportPayload = (reporterId: string) => ({
      reported_by: reporterId,
      target_type: 'post',
      target_id: pendingPostId,
      reason: 'Spam',
    });

    const report1 = await strangerClient.from('reports').insert(reportPayload(stranger.id)).select('id').single();
    assertCondition(!report1.error, `First report should succeed: ${report1.error?.message}`);

    const duplicate = await strangerClient.from('reports').insert(reportPayload(stranger.id)).select('id').single();
    assertCondition(!!duplicate.error, 'Duplicate open report from the same reporter should be rejected');

    const afterOne = await readPostStatus(service, pendingPostId);
    assertCondition(afterOne.reports_count === 1, `reports_count should be 1 after one report (got ${afterOne.reports_count})`);
    assertCondition(afterOne.status === 'active', 'Post should still be active after one report');

    const report2 = await reporter2Client.from('reports').insert(reportPayload(reporter2.id)).select('id').single();
    assertCondition(!report2.error, `Second report should succeed: ${report2.error?.message}`);
    const report3 = await reporter3Client.from('reports').insert(reportPayload(reporter3.id)).select('id').single();
    assertCondition(!report3.error, `Third report should succeed: ${report3.error?.message}`);

    const afterThree = await readPostStatus(service, pendingPostId);
    assertCondition(afterThree.reports_count === 3, `reports_count should be 3 (got ${afterThree.reports_count})`);
    assertCondition(afterThree.status === 'pending', 'Post should be auto-hidden (pending) after 3 reports');

    const { data: authorRow } = await service
      .from('users')
      .select('reports_received')
      .eq('id', author.id)
      .single();
    assertCondition(authorRow?.reports_received === 3, `Author reports_received should be 3 (got ${authorRow?.reports_received})`);

    // 6. Ban: only moderators; banning removes posts and blocks posting.
    const strangerBan = await strangerClient.rpc('moderate_user', {
      p_user_id: author.id,
      p_banned: true,
      p_reason: 'not allowed',
    });
    assertCondition(!!strangerBan.error, 'Non-moderator ban attempt should be rejected');

    const modBan = await moderatorClient.rpc('moderate_user', {
      p_user_id: author.id,
      p_banned: true,
      p_reason: 'Spam account',
    });
    assertCondition(!modBan.error, `Moderator ban should succeed: ${modBan.error?.message}`);
    const bannedRow = Array.isArray(modBan.data) ? modBan.data[0] : modBan.data;
    assertCondition(bannedRow?.is_banned === true, 'Banned user row should have is_banned = true');
    assertCondition((await readPostStatus(service, pendingPostId)).status === 'removed', 'Banned user posts should be removed');

    const bannedInsert = await insertPost(authorClient, author.id, location, 'active', 'Banned attempt');
    assertCondition(!!bannedInsert.error, 'Banned user should not be able to create posts');

    const modUnban = await moderatorClient.rpc('moderate_user', {
      p_user_id: author.id,
      p_banned: false,
      p_reason: null,
    });
    assertCondition(!modUnban.error, `Moderator unban should succeed: ${modUnban.error?.message}`);

    const unbannedInsert = await insertPost(authorClient, author.id, location, 'active', 'After unban');
    assertCondition(!unbannedInsert.error, `Unbanned user should be able to post again: ${unbannedInsert.error?.message}`);
    createdPosts.push(unbannedInsert.data!.id as string);

    console.log('PASS: emergency post + moderation smoke test verified.');
  } finally {
    for (const postId of createdPosts) {
      await service.from('reports').delete().eq('target_id', postId);
      await service.from('posts').delete().eq('id', postId);
    }
    for (const userId of createdUsers) {
      await service.from('users').delete().eq('id', userId);
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: emergency post smoke test failed: ${message}`);
  process.exit(1);
});
