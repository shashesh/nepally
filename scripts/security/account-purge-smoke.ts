/**
 * Live smoke test: the purge-deleted-accounts edge function (migration 049).
 *
 * Against a real Supabase project where 048 to 052 are applied, the function
 * is deployed and its secret is set:
 *   1. A POST without the right x-purge-secret is refused (401), and a GET
 *      with 405.
 *   2. A member uploads an avatar and a post photo, requests deletion, and
 *      has the purge date moved into the past. After a POST with the secret,
 *      the auth user, the profile row and both storage objects are gone.
 *   3. A second pending member whose date is still in the future is left
 *      alone.
 *   4. A third member whose date passed 30 minutes ago is left alone too.
 *      The purge waits an hour past the date by the database's clock
 *      (migration 050), so no restore can race it.
 *   5. Comment counts (migration 051). The due member's live comment on the
 *      second member's post stops counting, but a comment of theirs that was
 *      soft-deleted earlier isn't counted down twice. The due member's own
 *      post goes, with the second member's comment on it, and the purge
 *      reports no failure.
 *   6. Copies of the due member's words in the second member's rows are
 *      scrubbed (migration 052). The message, comment and like notifications
 *      naming them are deleted. A chat preview they wrote falls back to the
 *      second member's last message, or empties when the chat has none. A
 *      chat the second member spoke last in is untouched.
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
/** Inside the purge's one-hour margin (050), with room for clock drift either way. */
const JUST_PAST_MS = 30 * 60 * 1000;
const WAITING_MESSAGE = 'Account purge smoke test: message from the member who stays';
const DUE_MESSAGE = 'Account purge smoke test: message from the member being purged';

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

/** Notifications the recipient holds that name the author as sender, commenter or liker. */
async function copiesOf(
  service: SupabaseClient,
  recipientId: string,
  authorId: string
): Promise<number> {
  const { data, error } = await service
    .from('notifications')
    .select('id')
    .eq('user_id', recipientId)
    .or(
      `data->>sender_id.eq.${authorId},data->>commenter_id.eq.${authorId},data->>liker_id.eq.${authorId}`
    );
  if (error) {
    throw new Error(`Reading notifications failed: ${error.message}`);
  }
  return (data ?? []).length;
}

type ChatLine = { senderId: string; text: string; sentAt: string };
type ChatPreview = { last_message: string | null; last_message_time: string | null };

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/** A two-member chat with these messages, previewing the last one the way sendMessage does. */
async function createChat(
  service: SupabaseClient,
  members: { id: string; name: string }[],
  lines: ChatLine[]
): Promise<string> {
  const conversationId = await insertRow(service, 'conversations', { creator_id: members[0].id });
  const { error: participantsError } = await service
    .from('conversation_participants')
    .insert(
      members.map(({ id, name }) => ({ conversation_id: conversationId, user_id: id, name }))
    );
  assertCondition(!participantsError, `Adding participants failed: ${participantsError?.message}`);
  const { error: messagesError } = await service.from('messages').insert(
    lines.map(({ senderId, text, sentAt }) => ({
      conversation_id: conversationId,
      sender_id: senderId,
      text,
      timestamp: sentAt,
    }))
  );
  assertCondition(!messagesError, `Sending messages failed: ${messagesError?.message}`);
  const last = lines[lines.length - 1];
  const { error: previewError } = await service
    .from('conversations')
    .update({ last_message: last.text, last_message_time: last.sentAt })
    .eq('id', conversationId);
  assertCondition(!previewError, `Setting the chat preview failed: ${previewError?.message}`);
  return conversationId;
}

async function chatPreview(service: SupabaseClient, conversationId: string): Promise<ChatPreview> {
  const { data, error } = await service
    .from('conversations')
    .select('last_message, last_message_time')
    .eq('id', conversationId)
    .single();
  if (error || !data) {
    throw new Error(`Reading the chat failed: ${error?.message || 'no row'}`);
  }
  return data as ChatPreview;
}

function previewIs(actual: ChatPreview, text: string | null, sentAt: string | null): boolean {
  const sameTime =
    actual.last_message_time === null || sentAt === null
      ? actual.last_message_time === sentAt
      : new Date(actual.last_message_time).getTime() === new Date(sentAt).getTime();
  return actual.last_message === text && sameTime;
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
  const conversationIds: string[] = [];

  try {
    // 1. Wrong secret, wrong method.
    const refused = await callPurge(url, `${purgeSecret}-wrong`);
    assertCondition(refused.status === 401, `A wrong secret should get 401, got ${refused.status}`);
    const wrongMethod = await fetch(`${url}/functions/v1/purge-deleted-accounts`, {
      method: 'GET',
    });
    assertCondition(wrongMethod.status === 405, `A GET should get 405, got ${wrongMethod.status}`);

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

    // 4. A member whose date passed only 30 minutes ago.
    const justPast = await createUser(service, 'purge-just-past');
    createdUsers.push(justPast.id);
    await requestDeletion(await signIn(url, anonKey, justPast));
    await setPurgeDate(service, justPast.id, new Date(Date.now() - JUST_PAST_MS));

    // 5. Comments (051). On the waiting member's post: the waiting member's
    // own comment, the due member's comment, and a due member's comment that
    // was soft-deleted (counted down once already, and must not be again).
    // And the due member's own post, which the waiting member commented on:
    // its comments go with it when the purge deletes the post.
    const location = await borrow(
      service,
      'posts',
      'metro_area_id, location_zip_code, location_city, location_state'
    );
    const newPost = (authorId: string, title: string) =>
      insertRow(service, 'posts', {
        author_id: authorId,
        title,
        description: `${title} body`,
        status: 'active',
        photos: [],
        is_global: false,
        ...location,
      });
    const postId = await newPost(waiting.id, 'Account purge smoke test');
    await insertRow(service, 'post_comments', {
      post_id: postId,
      author_id: waiting.id,
      content: 'Account purge smoke test: the post author comments',
    });
    await insertRow(service, 'post_comments', {
      post_id: postId,
      author_id: due.id,
      content: 'Account purge smoke test comment',
    });
    const softDeletedId = await insertRow(service, 'post_comments', {
      post_id: postId,
      author_id: due.id,
      content: 'Account purge smoke test: a comment deleted before the purge',
    });
    const { error: softDeleteError } = await service
      .from('post_comments')
      .update({ is_deleted: true })
      .eq('id', softDeletedId);
    assertCondition(
      !softDeleteError,
      `Soft-deleting a comment failed: ${softDeleteError?.message}`
    );
    assertCondition(
      (await commentsCount(service, postId)) === 2,
      'Two live comments should count before the purge'
    );

    const duePostId = await newPost(due.id, 'Account purge smoke test (purged author)');
    const commentOnDuePostId = await insertRow(service, 'post_comments', {
      post_id: duePostId,
      author_id: waiting.id,
      content: "Account purge smoke test: a comment on the purged member's post",
    });

    // 6. More copies of the due member's words in the waiting member's rows
    // (052): a like notification (every like notifies once notify_likes is
    // 'all'), and three chats. In the first the due member spoke last, so its
    // preview must fall back. In the second the waiting member spoke last, so
    // it must stay as it is. The third holds only the due member's messages,
    // so its preview must empty.
    const { error: settingsError } = await service
      .from('user_settings')
      .upsert({ user_id: waiting.id, notify_likes: 'all' }, { onConflict: 'user_id' });
    assertCondition(!settingsError, `Setting notify_likes failed: ${settingsError?.message}`);
    const { error: likeError } = await service
      .from('post_likes')
      .insert({ post_id: postId, user_id: due.id });
    assertCondition(!likeError, `Liking the post failed: ${likeError?.message}`);

    const members = [
      { id: waiting.id, name: 'Purge smoke waiting' },
      { id: due.id, name: 'Purge smoke due' },
    ];
    const fallbackAt = minutesAgo(3);
    const fallbackChat = await createChat(service, members, [
      { senderId: waiting.id, text: WAITING_MESSAGE, sentAt: fallbackAt },
      { senderId: due.id, text: DUE_MESSAGE, sentAt: minutesAgo(2) },
    ]);
    const untouchedAt = minutesAgo(2);
    const untouchedChat = await createChat(service, members, [
      { senderId: due.id, text: DUE_MESSAGE, sentAt: minutesAgo(3) },
      { senderId: waiting.id, text: WAITING_MESSAGE, sentAt: untouchedAt },
    ]);
    const dueOnlyChat = await createChat(service, members, [
      { senderId: due.id, text: DUE_MESSAGE, sentAt: minutesAgo(2) },
    ]);
    conversationIds.push(fallbackChat, untouchedChat, dueOnlyChat);

    // Three message notifications (one per chat), two comment notifications
    // (the soft-deleted comment's is still there) and one like notification.
    const copiesBefore = await copiesOf(service, waiting.id, due.id);
    assertCondition(
      copiesBefore === 6,
      `The waiting member should hold 6 notifications naming the due member, found ${copiesBefore}`
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

    const { data: justPastProfile } = await service
      .from('users')
      .select('id')
      .eq('id', justPast.id)
      .maybeSingle();
    assertCondition(
      justPastProfile,
      'The member whose date passed 30 minutes ago should wait for the one-hour margin'
    );

    const countAfter = await commentsCount(service, postId);
    assertCondition(
      countAfter === 1,
      `Only the purged member's live comment should stop counting (the soft-deleted one was counted down already), comments_count is ${countAfter}`
    );
    const { data: duePost } = await service
      .from('posts')
      .select('id')
      .eq('id', duePostId)
      .maybeSingle();
    const { data: commentOnDuePost } = await service
      .from('post_comments')
      .select('id')
      .eq('id', commentOnDuePostId)
      .maybeSingle();
    assertCondition(
      !duePost && !commentOnDuePost,
      "The purged member's post and the comments on it should be gone"
    );

    const copiesAfter = await copiesOf(service, waiting.id, due.id);
    assertCondition(
      copiesAfter === 0,
      `Notifications naming the purged member should be scrubbed, found ${copiesAfter}`
    );
    const fallback = await chatPreview(service, fallbackChat);
    assertCondition(
      previewIs(fallback, WAITING_MESSAGE, fallbackAt),
      `The chat preview should fall back to the waiting member's message, got ${JSON.stringify(fallback)}`
    );
    const untouched = await chatPreview(service, untouchedChat);
    assertCondition(
      previewIs(untouched, WAITING_MESSAGE, untouchedAt),
      `A chat the waiting member spoke last in should be untouched, got ${JSON.stringify(untouched)}`
    );
    const dueOnly = await chatPreview(service, dueOnlyChat);
    assertCondition(
      previewIs(dueOnly, null, null),
      `A chat with only the purged member's messages should have no preview, got ${JSON.stringify(dueOnly)}`
    );

    console.log('PASS: account purge smoke test verified.');
  } finally {
    // Conversations don't cascade from users; remove these by hand.
    for (const id of conversationIds) {
      await service.from('conversations').delete().eq('id', id);
    }
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
