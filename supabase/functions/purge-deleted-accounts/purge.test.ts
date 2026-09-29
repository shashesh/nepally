import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PURGE_BATCH_SIZE,
  purgeDueAccounts,
  secretsMatch,
  type PurgeDeps,
  type StorageObjectRef,
} from './purge.ts';

type FakeOptions = {
  due?: string[];
  restored?: string[];
  objects?: Record<string, StorageObjectRef[]>;
  failStorageFor?: string[];
  failDeleteFor?: string[];
};

/** In-memory deps. Object paths start with `<userId>/`, like the real buckets. */
function fakeDeps(options: FakeOptions = {}) {
  const calls = {
    listDueUserIds: [] as number[],
    listStorageObjects: [] as string[],
    removeObjects: [] as { bucketId: string; paths: string[] }[],
    deleteAuthUser: [] as string[],
  };
  const failures: string[] = [];

  const deps: PurgeDeps = {
    async listDueUserIds(limit) {
      calls.listDueUserIds.push(limit);
      return options.due ?? [];
    },
    async isStillDue(userId) {
      return !(options.restored ?? []).includes(userId);
    },
    async listStorageObjects(userId) {
      calls.listStorageObjects.push(userId);
      return options.objects?.[userId] ?? [];
    },
    async removeObjects(bucketId, paths) {
      const failing = options.failStorageFor ?? [];
      if (paths.some((path) => failing.some((userId) => path.startsWith(`${userId}/`)))) {
        throw new Error('storage unavailable');
      }
      calls.removeObjects.push({ bucketId, paths });
    },
    async deleteAuthUser(userId) {
      if ((options.failDeleteFor ?? []).includes(userId)) {
        throw new Error('auth unavailable');
      }
      calls.deleteAuthUser.push(userId);
    },
    logFailure(userId) {
      failures.push(userId);
    },
  };

  return { deps, calls, failures };
}

function objectsFor(userId: string, bucketId: string, count: number): StorageObjectRef[] {
  return Array.from({ length: count }, (_, i) => ({
    bucket_id: bucketId,
    name: `${userId}/${i}.jpg`,
  }));
}

test('does nothing when no account is due', async () => {
  const { deps, calls } = fakeDeps();

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 0, skipped: 0, failed: 0 });
  assert.deepEqual(calls.listDueUserIds, [PURGE_BATCH_SIZE]);
  assert.deepEqual(calls.deleteAuthUser, []);
});

test('skips a user who restored their account after the batch was listed', async () => {
  const { deps, calls } = fakeDeps({ due: ['u1'], restored: ['u1'] });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 0, skipped: 1, failed: 0 });
  assert.deepEqual(calls.listStorageObjects, []);
  assert.deepEqual(calls.deleteAuthUser, []);
});

test('removes objects bucket by bucket in chunks of 100, then deletes the auth user', async () => {
  const { deps, calls } = fakeDeps({
    due: ['u1'],
    objects: {
      u1: [...objectsFor('u1', 'post-photos', 250), { bucket_id: 'avatars', name: 'u1.jpg' }],
    },
  });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 1, skipped: 0, failed: 0 });
  assert.deepEqual(
    calls.removeObjects.map(({ bucketId, paths }) => [bucketId, paths.length]),
    [
      ['post-photos', 100],
      ['post-photos', 100],
      ['post-photos', 50],
      ['avatars', 1],
    ]
  );
  assert.deepEqual(calls.deleteAuthUser, ['u1']);
});

test('keeps the auth user when storage removal fails, and carries on with the next user', async () => {
  const { deps, calls, failures } = fakeDeps({
    due: ['u1', 'u2'],
    objects: { u1: objectsFor('u1', 'post-photos', 2), u2: objectsFor('u2', 'post-photos', 1) },
    failStorageFor: ['u1'],
  });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 1, skipped: 0, failed: 1 });
  assert.deepEqual(calls.deleteAuthUser, ['u2']);
  assert.deepEqual(failures, ['u1']);
});

test('counts a failed auth delete as a failure', async () => {
  const { deps, failures } = fakeDeps({ due: ['u1'], failDeleteFor: ['u1'] });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 0, skipped: 0, failed: 1 });
  assert.deepEqual(failures, ['u1']);
});

test('deletes each due user once, in order', async () => {
  const { deps, calls } = fakeDeps({ due: ['u1', 'u2', 'u3'] });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 3, skipped: 0, failed: 0 });
  assert.deepEqual(calls.deleteAuthUser, ['u1', 'u2', 'u3']);
});

test('secretsMatch accepts only the exact secret', () => {
  assert.equal(secretsMatch('s3cret-value', 's3cret-value'), true);
  assert.equal(secretsMatch('s3cret-valuE', 's3cret-value'), false);
  assert.equal(secretsMatch('s3cret', 's3cret-value'), false);
  assert.equal(secretsMatch('', 's3cret-value'), false);
  assert.equal(secretsMatch('', ''), false);
});
