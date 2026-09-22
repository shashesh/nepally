/**
 * Live smoke test: storage.objects RLS lets a member manage only their own files.
 *
 * Verifies migration 039 (owner-only SELECT policies on storage.objects) against
 * a real Supabase project, with two throwaway members A and B:
 *   1. A's first avatar upload with upsert: true succeeds. The storage API's
 *      upsert check uses INSERT ... RETURNING, which needs SELECT even for a
 *      new object.
 *   2. A upserts the same avatar again and succeeds (SELECT + UPDATE).
 *   3. A uploads a post photo with upsert: false and succeeds (INSERT only).
 *   4. B's remove() of A's files deletes nothing: it returns [] and the service
 *      role still finds both objects. B's writes into A's files are rejected
 *      outright too: an upload into A's post-photos folder and an avatar
 *      upsert over A's avatar both error, and A's avatar is unchanged.
 *   5. Nobody else can enumerate: anon list() of every bucket returns [], and
 *      B's root listing of every bucket is also empty — the avatars SELECT
 *      predicate (`name = uid || '.jpg'`) differs from post-photos' folder
 *      predicate, so this is checked per bucket, not just post-photos. B
 *      specifically cannot list A's post-photos folder either. A can list it
 *      (the positive control).
 *   6. A's remove() of its own files returns one item each, and the service
 *      role confirms both are gone.
 *
 * Before 039, steps 1, 2 and 6 fail: every avatar upload is rejected, and
 * remove() returns [] without an error.
 *
 * Run: npm run test:security:storage
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = {
  id: string;
  email: string;
  password: string;
};

type StoredFile = {
  bucket: string;
  path: string;
};

const BUCKETS = ['avatars', 'post-photos', 'event-photos', 'listing-photos'] as const;

/** Not a real image; the storage API does not inspect file contents. */
const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

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

/** Storage RLS needs only an auth user; no public.users row is created. */
async function createFixtureUser(service: SupabaseClient, prefix: string): Promise<UserFixture> {
  const suffix = `${Date.now()}-${randomToken(6)}`;
  const email = `${prefix}.${suffix}@example.com`;
  const password = `P@ss-${randomToken(12)}`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message || 'unknown error'}`);
  }

  return { id: data.user.id, email, password };
}

/** Existence as the service role sees it, which bypasses RLS. */
async function objectExists(service: SupabaseClient, file: StoredFile): Promise<boolean> {
  const slash = file.path.lastIndexOf('/');
  const folder = slash === -1 ? '' : file.path.slice(0, slash);
  const name = file.path.slice(slash + 1);

  const { data, error } = await service.storage.from(file.bucket).list(folder, { search: name });
  assertCondition(!error, `service list of ${file.bucket}/${folder} failed: ${error?.message}`);
  return (data ?? []).some((entry) => entry.name === name);
}

async function expectUpload(
  client: SupabaseClient,
  file: StoredFile,
  upsert: boolean,
  label: string
): Promise<void> {
  const { error } = await client.storage.from(file.bucket).upload(file.path, FAKE_JPEG, {
    contentType: 'image/jpeg',
    upsert,
  });
  assertCondition(
    !error,
    `${label}: upload to ${file.bucket}/${file.path} should succeed: ${error?.message}`
  );
}

/**
 * Asserts a write is rejected by RLS. If it unexpectedly succeeds, the caller's
 * `createdFiles` list gets the path immediately, so cleanup still removes it.
 */
async function expectUploadRejected(
  client: SupabaseClient,
  file: StoredFile,
  upsert: boolean,
  label: string,
  createdFiles: StoredFile[]
): Promise<void> {
  const { error } = await client.storage.from(file.bucket).upload(file.path, FAKE_JPEG, {
    contentType: 'image/jpeg',
    upsert,
  });
  if (!error) {
    createdFiles.push(file);
  }
  assertCondition(
    !!error,
    `${label}: upload to ${file.bucket}/${file.path} should be rejected by RLS, but it succeeded`
  );
}

async function expectListEmpty(
  client: SupabaseClient,
  bucket: string,
  folder: string,
  label: string
): Promise<void> {
  const { data, error } = await client.storage.from(bucket).list(folder);
  assertCondition(!error, `${label}: list of ${bucket}/${folder} failed: ${error?.message}`);
  assertCondition(
    (data ?? []).length === 0,
    `${label}: list of ${bucket}/${folder} should be empty, got ${(data ?? []).length} entries`
  );
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: NO_SESSION_AUTH });
  const anon = createClient(supabaseUrl, supabaseAnonKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  const createdFiles: StoredFile[] = [];

  try {
    const owner = await createFixtureUser(service, 'storage-owner');
    createdUsers.push(owner.id);
    const other = await createFixtureUser(service, 'storage-other');
    createdUsers.push(other.id);

    const ownerClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, owner);
    const otherClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, other);

    const avatar: StoredFile = { bucket: 'avatars', path: `${owner.id}.jpg` };
    const postPhoto: StoredFile = {
      bucket: 'post-photos',
      path: `${owner.id}/storage-smoke-${randomToken(6)}.jpg`,
    };
    createdFiles.push(avatar, postPhoto);

    // 1-3. A's uploads: first-time avatar upsert, repeat upsert, plain post photo.
    await expectUpload(ownerClient, avatar, true, 'owner first avatar upsert');
    await expectUpload(ownerClient, avatar, true, 'owner repeat avatar upsert');
    await expectUpload(ownerClient, postPhoto, false, 'owner post photo upload');

    // 4. B cannot delete A's files; remove() reports nothing deleted.
    for (const file of [avatar, postPhoto]) {
      const { data, error } = await otherClient.storage.from(file.bucket).remove([file.path]);
      assertCondition(
        !error,
        `other member remove of ${file.bucket}/${file.path} errored: ${error?.message}`
      );
      assertCondition(
        (data ?? []).length === 0,
        `other member must not delete ${file.bucket}/${file.path}, but remove() returned ${(data ?? []).length} items`
      );
      assertCondition(
        await objectExists(service, file),
        `${file.bucket}/${file.path} must survive another member's remove()`
      );
    }

    // 4b. B cannot write into A's files either. A's failed remove() above is
    // blocked by the DELETE policy regardless of what SELECT allows, so on its
    // own it would not reveal an over-broad avatars SELECT predicate; these
    // upload attempts need SELECT for their INSERT/UPDATE ... RETURNING checks,
    // so a rejection here is a direct check on B's SELECT scope too.
    const otherPostPhoto: StoredFile = {
      bucket: 'post-photos',
      path: `${owner.id}/storage-smoke-other-${randomToken(6)}.jpg`,
    };
    await expectUploadRejected(
      otherClient,
      otherPostPhoto,
      false,
      'other member post photo upload into owner folder',
      createdFiles
    );
    await expectUploadRejected(
      otherClient,
      avatar,
      true,
      'other member avatar upsert over owner avatar',
      createdFiles
    );
    assertCondition(
      await objectExists(service, avatar),
      "owner's avatar must survive another member's upsert attempt"
    );

    // 5. No enumeration: anon sees no objects anywhere. B's root listing of every
    // bucket is also empty — the avatars SELECT predicate differs from
    // post-photos, so this is checked per bucket rather than relying on the
    // post-photos folder check alone. B cannot list A's post-photos folder either.
    for (const bucket of BUCKETS) {
      await expectListEmpty(anon, bucket, '', 'anon');
      await expectListEmpty(otherClient, bucket, '', 'other member');
    }
    await expectListEmpty(anon, 'post-photos', owner.id, 'anon');
    await expectListEmpty(otherClient, 'post-photos', owner.id, 'other member');

    const { data: ownList, error: ownListError } = await ownerClient.storage
      .from('post-photos')
      .list(owner.id);
    assertCondition(!ownListError, `owner list of own folder failed: ${ownListError?.message}`);
    assertCondition(
      (ownList ?? []).some((entry) => `${owner.id}/${entry.name}` === postPhoto.path),
      'owner should see their own post photo when listing their folder'
    );

    // 6. A deletes its own files; the storage API really removes them.
    for (const file of [avatar, postPhoto]) {
      const { data, error } = await ownerClient.storage.from(file.bucket).remove([file.path]);
      assertCondition(
        !error,
        `owner remove of ${file.bucket}/${file.path} errored: ${error?.message}`
      );
      assertCondition(
        (data ?? []).length === 1,
        `owner remove of ${file.bucket}/${file.path} should delete 1 object, deleted ${(data ?? []).length}`
      );
      assertCondition(
        !(await objectExists(service, file)),
        `${file.bucket}/${file.path} should be gone after the owner's remove()`
      );
    }

    console.log('PASS: storage RLS smoke test verified owner-only access to storage objects.');
  } finally {
    // Service-role remove() bypasses RLS; files already deleted are simply skipped
    // (no error, empty data). Best-effort: every item is still attempted, even
    // after an earlier one fails.
    const leftoverFiles: StoredFile[] = [];
    for (const file of createdFiles) {
      const { error } = await service.storage.from(file.bucket).remove([file.path]);
      if (error) {
        leftoverFiles.push(file);
      }
    }

    const leftoverUserIds: string[] = [];
    for (const userId of createdUsers) {
      const { error } = await service.auth.admin.deleteUser(userId);
      if (error) {
        leftoverUserIds.push(userId);
      }
    }

    if (leftoverFiles.length > 0) {
      console.error(
        `Cleanup failed to remove ${leftoverFiles.length} file(s): ${leftoverFiles
          .map((file) => `${file.bucket}/${file.path}`)
          .join(', ')}`
      );
    }
    if (leftoverUserIds.length > 0) {
      console.error(
        `Cleanup failed to delete ${leftoverUserIds.length} auth user(s): ${leftoverUserIds.join(', ')}`
      );
    }
    if (leftoverFiles.length > 0 || leftoverUserIds.length > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: storage RLS smoke test failed: ${message}`);
  process.exit(1);
});
