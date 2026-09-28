/**
 * Live smoke test: each storage bucket refuses files the apps would refuse.
 *
 * Verifies migration 045 (storage_bucket_limits) against a real Supabase
 * project, with one throwaway member uploading straight to the storage API,
 * the way a client that skips the apps' checks would. For every bucket:
 *   1. A file one byte over the bucket's size limit is rejected, and not by
 *      RLS: the member may write there, so only the size limit can refuse it.
 *   2. A small text/html file is rejected for its type.
 *   3. A small file of an allowed type is accepted (the positive control, so
 *      a broken fixture can't pass steps 1 and 2 on its own).
 *
 * Before 045, steps 1 and 2 fail: every bucket accepts any size and type.
 *
 * Run: npm run test:security:storage-limits
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

type BucketLimit = {
  bucket: string;
  maxBytes: number;
  allowedType: string;
  /** avatars is keyed `<uid>.jpg` and upserted; the rest are `<uid>/<file>`. */
  pathFor: (userId: string, label: string) => string;
  upsert: boolean;
};

const MB = 1024 * 1024;

const folderPath = (userId: string, label: string) =>
  `${userId}/limits-smoke-${label}-${randomToken(6)}.jpg`;

/** Mirrors 045; each value comes from the upload helper named there. */
const BUCKET_LIMITS: BucketLimit[] = [
  {
    bucket: 'post-photos',
    maxBytes: 5 * MB,
    allowedType: 'image/png',
    pathFor: folderPath,
    upsert: false,
  },
  {
    bucket: 'listing-photos',
    maxBytes: 2 * MB,
    allowedType: 'image/webp',
    pathFor: folderPath,
    upsert: false,
  },
  {
    bucket: 'event-photos',
    maxBytes: 2 * MB,
    allowedType: 'image/jpeg',
    pathFor: folderPath,
    upsert: false,
  },
  {
    bucket: 'avatars',
    maxBytes: 1 * MB,
    allowedType: 'image/jpeg',
    pathFor: (userId) => `${userId}.jpg`,
    upsert: true,
  },
];

/** The storage API does not inspect file contents, only size and declared type. */
const SMALL_FILE = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

/** What the storage API says for each refusal (storage-api on staging, 2026-09-25). */
const RLS_DENIAL_MESSAGE = /row-level security/i;
const SIZE_REJECTION_MESSAGE = /exceeded the maximum allowed size/i;
const TYPE_REJECTION_MESSAGE = /mime type .+ is not supported/i;

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

/** Storage uploads need only an auth user; no public.users row is created. */
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

/**
 * Uploads `body` and asserts the storage API refuses it for the reason
 * `expected` names, not RLS or anything else. An unexpected success is
 * recorded in `createdFiles` so cleanup removes it.
 */
async function expectRejected(
  client: SupabaseClient,
  file: StoredFile,
  body: Uint8Array,
  contentType: string,
  upsert: boolean,
  expected: RegExp,
  label: string,
  createdFiles: StoredFile[]
): Promise<void> {
  const { error } = await client.storage
    .from(file.bucket)
    .upload(file.path, body, { contentType, upsert });
  if (!error) {
    createdFiles.push(file);
    throw new Error(`${label}: ${file.bucket} should reject the upload, but it succeeded`);
  }
  assertCondition(
    !RLS_DENIAL_MESSAGE.test(error.message) && expected.test(error.message),
    `${label}: ${file.bucket} should reject the upload for its ${expected}, ` +
      `but got: ${JSON.stringify(error)}`
  );
}

async function checkBucket(
  client: SupabaseClient,
  userId: string,
  limit: BucketLimit,
  createdFiles: StoredFile[]
): Promise<void> {
  const oversized: StoredFile = { bucket: limit.bucket, path: limit.pathFor(userId, 'big') };
  await expectRejected(
    client,
    oversized,
    new Uint8Array(limit.maxBytes + 1),
    limit.allowedType,
    limit.upsert,
    SIZE_REJECTION_MESSAGE,
    'oversized upload',
    createdFiles
  );

  const html: StoredFile = { bucket: limit.bucket, path: limit.pathFor(userId, 'html') };
  await expectRejected(
    client,
    html,
    SMALL_FILE,
    'text/html',
    limit.upsert,
    TYPE_REJECTION_MESSAGE,
    'text/html upload',
    createdFiles
  );

  const allowed: StoredFile = { bucket: limit.bucket, path: limit.pathFor(userId, 'ok') };
  createdFiles.push(allowed);
  const { error } = await client.storage
    .from(allowed.bucket)
    .upload(allowed.path, SMALL_FILE, { contentType: limit.allowedType, upsert: limit.upsert });
  assertCondition(
    !error,
    `allowed upload: ${limit.bucket} should accept a small ${limit.allowedType}: ${error?.message}`
  );
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];
  const createdFiles: StoredFile[] = [];

  try {
    const member = await createFixtureUser(service, 'storage-limits');
    createdUsers.push(member.id);
    const memberClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, member);

    for (const limit of BUCKET_LIMITS) {
      await checkBucket(memberClient, member.id, limit, createdFiles);
    }

    console.log(
      'PASS: storage limits smoke test verified every bucket refuses oversized and non-image files.'
    );
  } finally {
    // Service-role remove() bypasses RLS; paths that were never stored are
    // simply skipped. Best-effort: every item is still attempted.
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
  console.error(`FAIL: storage limits smoke test failed: ${message}`);
  process.exit(1);
});
