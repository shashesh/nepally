/**
 * Core of the purge-deleted-accounts edge function (scheduled by migration
 * 049). For each account whose deletion grace period has ended it removes
 * the user's storage objects, scrubs the copies of their words kept in other
 * members' rows (052), then deletes the auth user; 048's ON DELETE CASCADE
 * chain removes their own rows.
 *
 * No Deno APIs and no remote imports, so `node --test` can run the tests
 * (npm run functions:test). index.ts wires PurgeDeps to Supabase.
 */

export type StorageObjectRef = { bucket_id: string; name: string };

export interface PurgeDeps {
  /**
   * Users an hour past their deletion date by the database's clock, oldest
   * first (list_due_account_deletions, migration 050). The database decides,
   * so "due" and cancel_account_deletion's refusal share one clock.
   */
  listDueUserIds(limit: number): Promise<string[]>;
  /** Re-read before touching the user, and again before deleting the auth user (is_due_for_purge). */
  isStillDue(userId: string): Promise<boolean>;
  listStorageObjects(userId: string): Promise<StorageObjectRef[]>;
  /** Throws on failure. */
  removeObjects(bucketId: string, paths: string[]): Promise<void>;
  /**
   * Deletes other members' notifications that quote the user and resets chat
   * previews they wrote (scrub_account_copies, 052). It must run before the
   * auth user goes: it finds the user's conversations through rows the
   * cascade removes. Throws on failure.
   */
  scrubCopies(userId: string): Promise<void>;
  /** Throws on failure. */
  deleteAuthUser(userId: string): Promise<void>;
  logFailure(userId: string, error: unknown): void;
}

export type PurgeSummary = { purged: number; skipped: number; failed: number };

/** Accounts handled per run; the rest wait for the next hourly run. */
export const PURGE_BATCH_SIZE = 50;
/** Paths per Storage API remove() call. */
export const STORAGE_REMOVE_CHUNK_SIZE = 100;

function groupPathsByBucket(objects: readonly StorageObjectRef[]): Map<string, string[]> {
  return objects.reduce(
    (byBucket, { bucket_id, name }) =>
      byBucket.set(bucket_id, [...(byBucket.get(bucket_id) ?? []), name]),
    new Map<string, string[]>()
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size)
  );
}

async function purgeAccount(deps: PurgeDeps, userId: string): Promise<'purged' | 'skipped'> {
  if (!(await deps.isStillDue(userId))) return 'skipped';

  const objects = await deps.listStorageObjects(userId);
  for (const [bucketId, paths] of groupPathsByBucket(objects)) {
    for (const batch of chunk(paths, STORAGE_REMOVE_CHUNK_SIZE)) {
      await deps.removeObjects(bucketId, batch);
    }
  }

  // Check again: the user may have restored while their files were being
  // removed. The files are gone either way (the Storage API isn't
  // transactional with Postgres), but the account survives.
  if (!(await deps.isStillDue(userId))) return 'skipped';

  await deps.scrubCopies(userId);
  await deps.deleteAuthUser(userId);
  return 'purged';
}

export async function purgeDueAccounts(deps: PurgeDeps): Promise<PurgeSummary> {
  const userIds = await deps.listDueUserIds(PURGE_BATCH_SIZE);
  const summary: PurgeSummary = { purged: 0, skipped: 0, failed: 0 };

  for (const userId of userIds) {
    try {
      const outcome = await purgeAccount(deps, userId);
      summary[outcome] += 1;
    } catch (error) {
      summary.failed += 1;
      deps.logFailure(userId, error);
    }
  }

  return summary;
}

/**
 * Constant-time comparison for the x-purge-secret header, the same approach
 * as send-push-notification's timingSafeEqual: the length difference is
 * folded into the accumulator instead of returning early. An empty expected
 * secret never matches, so a missing env var can't open the endpoint.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  if (expected.length === 0) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  const maxLength = Math.max(a.length, b.length);

  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLength; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
