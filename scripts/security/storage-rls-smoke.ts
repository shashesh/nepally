/**
 * Live smoke test: storage.objects RLS lets a member manage only their own files.
 *
 * Verifies migration 039 (owner-only SELECT policies on storage.objects) against
 * a real Supabase project, with two throwaway members A and B:
 *   1. A's first avatar upload with upsert: true succeeds. The storage API's
 *      upsert check uses INSERT ... RETURNING, which needs SELECT even for a
 *      new object.
 *   2. A upserts the same avatar again and succeeds (SELECT + UPDATE).
 *   3. A uploads a photo into each folder-scoped bucket — post, event and
 *      listing photos — with upsert: false, and each succeeds (INSERT only).
 *   4. B's remove() of A's files (the avatar plus all three folder-scoped
 *      photos) deletes nothing: it returns [] and the service role still
 *      finds every object. B's writes into A's files are rejected outright
 *      too: an upload into A's post-photos folder and an avatar upsert over
 *      A's avatar are both denied by RLS specifically, not just any error,
 *      and A's avatar is unchanged.
 *   5. Nobody else can enumerate: anon list() of every bucket returns [], and
 *      B's root listing of every bucket is also empty — the avatars SELECT
 *      predicate (`name = uid || '.jpg'`) differs from the folder-scoped
 *      buckets' predicate, so this is checked per bucket, not just
 *      post-photos. For each folder-scoped bucket, anon and B specifically
 *      cannot list A's own folder either — a broad or wrong-bucket SELECT
 *      policy on event-photos or listing-photos would otherwise pass
 *      unnoticed, since only post-photos and avatars had fixtures to probe
 *      with before. A can list every one of A's own folders (the positive
 *      control).
 *   6. A's remove() of its own files (avatar plus all three folder-scoped
 *      photos) returns one item each, and the service role confirms all are
 *      gone.
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

/**
 * Buckets whose objects live at `<uid>/<file>`, per the app's upload helpers
 * (`uploadPostPhoto`/`uploadEventPhoto`/`uploadListingPhoto` in
 * packages/shared/src/api/storage.ts) and the matching INSERT policies
 * (003_storage.sql, 006_events.sql, 015_listing_photos_storage.sql — all
 * `(storage.foldername(name))[1] = auth.uid()::text`). `avatars` is excluded:
 * its object lives at the bucket root as `<uid>.jpg`, not in a folder.
 */
const FOLDER_SCOPED_BUCKETS = ['post-photos', 'event-photos', 'listing-photos'] as const;

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

/** The message Supabase Storage's Postgres backend raises when RLS blocks a write. */
const RLS_DENIAL_MESSAGE = /row-level security/i;

/**
 * True only for an RLS denial specifically: an error whose message names the
 * row-level security policy. A network failure, a bad content type, or a
 * missing bucket would also leave `upload()`'s `error` truthy, so checking
 * `!!error` alone can't tell an RLS rejection from a misconfigured run.
 *
 * The HTTP status isn't checked: depending on the storage-api version, an RLS
 * denial arrives as HTTP 403, or as HTTP 400 with `statusCode: "403"` in the
 * body, so `error.status` can read 400 for a genuine denial.
 */
function isRlsDenied(error: { message: string }): boolean {
  return RLS_DENIAL_MESSAGE.test(error.message);
}

/**
 * Asserts a write is denied by RLS specifically, not by some other failure
 * that would also leave `error` truthy. If it unexpectedly succeeds, the
 * caller's `createdFiles` list gets the path immediately, so cleanup still
 * removes it.
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
    throw new Error(
      `${label}: upload to ${file.bucket}/${file.path} should be rejected by RLS, but it succeeded`
    );
  }
  assertCondition(
    isRlsDenied(error),
    `${label}: upload to ${file.bucket}/${file.path} should be denied by RLS specifically, ` +
      `but got a different error: ${JSON.stringify(error)}`
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
    // One owner-owned fixture per folder-scoped bucket, so post-photos isn't
    // the only one exercised — event-photos and listing-photos each got their
    // own SELECT policy in 039 too, and an empty bucket can't catch a broad or
    // wrong-bucket predicate on either of them.
    const folderScopedPhotos: StoredFile[] = FOLDER_SCOPED_BUCKETS.map((bucket) => ({
      bucket,
      path: `${owner.id}/storage-smoke-${randomToken(6)}.jpg`,
    }));
    createdFiles.push(avatar, ...folderScopedPhotos);

    // 1-3. A's uploads: first-time avatar upsert, repeat upsert, then a plain
    // upload into each folder-scoped bucket.
    await expectUpload(ownerClient, avatar, true, 'owner first avatar upsert');
    await expectUpload(ownerClient, avatar, true, 'owner repeat avatar upsert');
    for (const file of folderScopedPhotos) {
      await expectUpload(ownerClient, file, false, `owner ${file.bucket} upload`);
    }

    // 4. B cannot delete A's files; remove() reports nothing deleted.
    for (const file of [avatar, ...folderScopedPhotos]) {
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

    // 4b. B cannot write into A's files either: the INSERT and UPDATE policies
    // reject an upload into A's post-photos folder and an upsert over A's
    // avatar, and A's avatar survives. These don't test SELECT scope (the
    // write policies reject them on their own); step 5's listings do that.
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
    // bucket is also empty — the avatars SELECT predicate differs from the
    // folder-scoped buckets, so this is checked per bucket rather than relying
    // on a single bucket's folder check alone. For each folder-scoped bucket,
    // anon and B specifically cannot list A's own folder either, while A can
    // (the positive control).
    for (const bucket of BUCKETS) {
      await expectListEmpty(anon, bucket, '', 'anon');
      await expectListEmpty(otherClient, bucket, '', 'other member');
    }

    for (const file of folderScopedPhotos) {
      await expectListEmpty(anon, file.bucket, owner.id, 'anon');
      await expectListEmpty(otherClient, file.bucket, owner.id, 'other member');

      const { data: ownList, error: ownListError } = await ownerClient.storage
        .from(file.bucket)
        .list(owner.id);
      assertCondition(
        !ownListError,
        `owner list of own ${file.bucket} folder failed: ${ownListError?.message}`
      );
      assertCondition(
        (ownList ?? []).some((entry) => `${owner.id}/${entry.name}` === file.path),
        `owner should see their own ${file.bucket} photo when listing their folder`
      );
    }

    // 6. A deletes its own files; the storage API really removes them.
    for (const file of [avatar, ...folderScopedPhotos]) {
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
