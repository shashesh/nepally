---
title: In-app account deletion
status: in-progress
created: 2026-09-28
spec: docs/specs/2026-09-28-account-deletion.md
---

# In-App Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members can delete their account from web and mobile. The account is hidden for 29 days, can be restored by signing in until then, and is then purged with all its data and photos, within the privacy policy's 30 days.

**Architecture:** Migration 048 adds `users.deletion_scheduled_for`, the request and cancel functions, and RLS changes that hide a pending account. An edge function run by pg_cron (migration 049, made hourly by 050) removes the user's photos through the Storage API and deletes the auth user, whose cascades remove every row. Migration 050 also closes restore at the date and shortens the grace period to 29 days. Migration 051 adds the missing `comments_count` delete trigger. Web and mobile add a three-step delete flow, a restore screen shown to pending accounts, and a chat fallback for accounts that are gone. See the [spec](../../specs/2026-09-28-account-deletion.md).

**Tech Stack:** Supabase Postgres 17 (RLS, pg_cron, pg_net, Vault), Supabase Edge Functions (Deno), `@nepally/shared` (Supabase JS), Next.js 16 Pages Router with Mantine and Vitest (web), Expo SDK 57 with React Navigation 7 and Jest (mobile), `tsx` security checks in `scripts/security/`.

---

## Verified while planning (2026-09-28)

- **`amr` survives token refreshes.** A throwaway staging user signed in with a password and refreshed twice. Each refresh gave a new `iat`, but `amr` stayed `[{"method":"password","timestamp":1790629567}]`. So the newest `amr` timestamp is the time of the last real sign-in, and the 10-minute check (spec D4) works.
- **Live SELECT policies**, which 048 replaces with `ALTER POLICY` (roles are kept):
  - `users."Users are viewable by everyone"`: `true`
  - `posts."Active posts are viewable by everyone"`: `status = 'active' OR author_id = auth.uid() OR is_moderator()`
  - `post_comments."Anyone can view non-deleted comments"`: `is_deleted = false`
  - `marketplace_listings."Anyone can read active listings"` (authenticated only): `status = 'active' OR owner_id = auth.uid()`
  - `events.events_select`: `status <> 'removed'`
  - `event_rsvps.rsvps_select`: `EXISTS (the event is visible and its RSVPs are public, or the caller is its organizer or the RSVP's user)`
  - `post_likes."Anyone can view likes"`: `true`
  - `user_follows.user_follows_select_all`: `true`
- **`get_my_profile()`** is `RETURNS SETOF users` with `SELECT u.*`, so it returns the new column with no change.
- **All three views** (`marketplace_listings_view`, `listing_promotions_display`, `user_helper_scores`) have `security_invoker=true`, so they inherit the new policies.
- **Column grants (036):** clients can only SELECT public-profile columns of `users`. The new column gets no client grant. Owners read it through `get_my_profile()`.
- **Function grants (041):** a new function is executable only by its owner and `service_role` until a migration grants it. `scripts/security/function-execute-smoke.ts` expects every policy helper to return `false` for a missing id. That is why the helper is `is_pending_deletion(uuid)` and not the spec's `is_account_active(uuid)`. The spec has been updated to match.
- **Nobody has Deno installed**, and no edge function has tests. Node 24, the version CI uses, runs `.ts` files natively with `node --test`. So the purge core is a dependency-free module (Deno-style `./x.ts` imports) tested that way.
- **pg_cron, pg_net and supabase_vault** are installed on staging.
- **048's partial index is a plain `CREATE INDEX`.** [migration-workflow.md](../../architecture/migration-workflow.md#adding-a-migration-going-forward) step 6 asks for `CONCURRENTLY`, in a migration of its own, on tables that already hold data, and exempts a fresh database. Production will replay 048 onto empty tables. On staging the `users` table holds only test accounts, and the new column is NULL in every row, so the build blocks writes for milliseconds.

## How it runs

The same chunked process as the [mobile marketplace fixes](../../archive/plans/2026-09-27-mobile-marketplace-fixes.md#how-it-runs):

- **Inside a PR**, every task writes its failing test, runs only that test, implements, re-runs it and commits. There is no review between tasks.
- **At the end of each PR, the gate runs.** Check each command's exit code; never pipe it through `tail`.
  - `npm run type-check`
  - `npm run lint`
  - `npm run lint:guards`
  - the full unit suite of every workspace touched. Run web Vitest from a `C:\…` working directory; a lowercase `c:\` fails whole files.
  - `npm run docs:check` and `npm run lint:md`
- **Then one code-review agent** reviews the PR's whole diff, and a `security-reviewer` agent reviews PRs 1 and 2. CRITICAL and HIGH findings are fixed in one `fix: address PR N review` commit. Everything else goes to [Follow-ups](#follow-ups-not-scheduled), **never to new tasks**.
- **Then ship it as a draft.** Push, open a **draft** PR, and request Copilot's review with `gh pr edit <n> --add-reviewer @copilot`. The user marks it ready, which starts CI.
- **Migrations are applied to staging only when the user asks for it directly.** `apply_migration` is blocked otherwise. Right after applying, realign the tracker row (see [migration-workflow.md](../../architecture/migration-workflow.md#adding-a-migration-going-forward)).
- Format a single Markdown file with `npx prettier --write <file>`. `npm run format -- <file>` reformats the whole repo.
- Keep `git commit` in its own command. A hook rejects a command that has both `git commit` and a `-n` flag anywhere in it.

| PR  | Branch                          | Theme                                                                                                                                                 | Needs           |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `feat/account-deletion-db`      | Migration 048 and the `test:security:account-deletion` check                                                                                          | spec PR         |
| 2   | `feat/account-deletion-purge`   | `purge-deleted-accounts` edge function, migrations 049 (cron), 050 (deletion timing), 051 (comment count) and 052 (scrub copies), and a Vault runbook | 1 applied       |
| 3   | `feat/account-deletion-web`     | Shared code, the web flow, `/delete-account`, login return path, restore gate, chat fallback, legal                                                   | 1, 2 applied    |
| 4   | `feat/account-deletion-mobile`  | Mobile flow, restore screen, `RootNavigator` gate, chat fallback                                                                                      | 1, 2 applied; 3 |
| 5   | `docs/account-deletion-shipped` | Feature doc, archive the spec and this plan, tick the launch plan                                                                                     | 1–4 merged      |

PR 1 is broken into steps below. PRs 2–4 list their tasks, files, signatures and acceptance criteria. Each one gets its step breakdown when it starts, against the code as it is then.

---

## PR 1 — Database: migration 048

**Files:**

- Create: `scripts/security/account-deletion-smoke.ts`
- Create: `supabase/migrations/048_account_deletion.sql`
- Modify: `package.json` (add `test:security:account-deletion`)
- Modify: `scripts/security/function-execute-smoke.ts` (the new functions' grants)
- Docs: `docs/architecture/database-schema.md`, `docs/guides/setup-and-testing.md`, this plan

### Task 1.1: A live check that describes account deletion

The check runs against staging. Before 048 is applied, it fails because the functions don't exist, which is the RED step.

**Files:**

- Create: `scripts/security/account-deletion-smoke.ts`
- Modify: `package.json` (the `scripts` block, after `test:security:listing-reports`)

- [x] **Step 1: Write the check.**

```ts
/**
 * Live smoke test: account deletion requests, hiding and restore.
 *
 * Verifies migration 048 against a real Supabase project:
 *   1. amr_signed_in_within accepts a recent sign-in and rejects stale, empty
 *      and malformed amr claims (this is the check request_account_deletion
 *      runs on the caller's JWT).
 *   2. A member cannot set deletion_scheduled_for directly (034 guard).
 *   3. request_account_deletion, right after signing in, schedules deletion
 *      30 days out, returns the same date when repeated, and removes the
 *      member's device tokens.
 *   4. While deletion is pending, another member cannot see the profile,
 *      post, comment, like, follows, listing, event or RSVP. A moderator
 *      still sees all of it. The member themself still sees everything
 *      except follow edges, which are hidden when either end is pending.
 *   5. cancel_account_deletion makes everything visible again.
 *
 * Run: npm run test:security:account-deletion
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = { id: string; email: string; password: string };

type ContentFixtures = {
  postId: string;
  commentId: string;
  listingId: string;
  eventId: string;
};

const GRACE_DAYS = 30;
const REAUTH_MAX_AGE_SECONDS = 600;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Error the 034 guard trigger raises (ERRCODE 42501 + fixed message). */
const PRIVILEGE_GUARD_ERROR_CODE = '42501';
const PRIVILEGE_GUARD_MESSAGE = 'Privileged user columns cannot be modified directly';

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

async function createUser(
  service: SupabaseClient,
  prefix: string,
  isModerator = false
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
    is_moderator: isModerator,
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

async function insertLink(
  service: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const { error } = await service.from(table).insert(rows);
  assertCondition(!error, `Failed to insert fixture ${table}: ${error?.message}`);
}

/** The owner's post, comment, like, both follow edges, listing, event and RSVP. */
async function seedContent(
  service: SupabaseClient,
  owner: UserFixture,
  other: UserFixture
): Promise<ContentFixtures> {
  const location = await borrow(
    service,
    'posts',
    'metro_area_id, location_zip_code, location_city, location_state'
  );
  const postId = await insertRow(service, 'posts', {
    author_id: owner.id,
    title: 'Account deletion smoke test',
    description: 'Account deletion smoke test body',
    status: 'active',
    photos: [],
    is_global: false,
    ...location,
  });
  const commentId = await insertRow(service, 'post_comments', {
    post_id: postId,
    author_id: owner.id,
    content: 'Account deletion smoke test comment',
  });
  await insertLink(service, 'post_likes', [{ post_id: postId, user_id: owner.id }]);
  await insertLink(service, 'user_follows', [
    { follower_id: owner.id, followee_id: other.id },
    { follower_id: other.id, followee_id: owner.id },
  ]);

  const listingShape = await borrow(
    service,
    'marketplace_listings',
    'metro_area_id, category_id, listing_type'
  );
  const listingId = await insertRow(service, 'marketplace_listings', {
    owner_id: owner.id,
    title: 'Account deletion smoke test listing',
    description: 'Account deletion smoke test listing body',
    status: 'active',
    ...listingShape,
  });

  const eventShape = await borrow(service, 'events', 'metro_area_id, event_type');
  const eventId = await insertRow(service, 'events', {
    organizer_id: owner.id,
    title: 'Account deletion smoke test event',
    description: 'Account deletion smoke test event body',
    location_name: 'Smoke Test Hall',
    start_date: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    ...eventShape,
  });
  await insertLink(service, 'event_rsvps', [{ event_id: eventId, user_id: owner.id }]);

  return { postId, commentId, listingId, eventId };
}

/** How many of the owner's rows each table shows the given client. */
async function visibleCounts(
  client: SupabaseClient,
  ownerId: string,
  fixtures: ContentFixtures
): Promise<Record<string, number>> {
  const count = async (
    label: string,
    query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
  ) => {
    const { data, error } = await query;
    assertCondition(!error, `Reading ${label} failed: ${error?.message}`);
    return data?.length ?? 0;
  };

  return {
    profile: await count('users', client.from('users').select('id').eq('id', ownerId)),
    post: await count('posts', client.from('posts').select('id').eq('id', fixtures.postId)),
    comment: await count(
      'post_comments',
      client.from('post_comments').select('id').eq('id', fixtures.commentId)
    ),
    like: await count(
      'post_likes',
      client
        .from('post_likes')
        .select('post_id')
        .eq('post_id', fixtures.postId)
        .eq('user_id', ownerId)
    ),
    follows: await count(
      'user_follows',
      client
        .from('user_follows')
        .select('follower_id')
        .or(`follower_id.eq.${ownerId},followee_id.eq.${ownerId}`)
    ),
    listing: await count(
      'marketplace_listings',
      client.from('marketplace_listings').select('id').eq('id', fixtures.listingId)
    ),
    event: await count('events', client.from('events').select('id').eq('id', fixtures.eventId)),
    rsvp: await count(
      'event_rsvps',
      client.from('event_rsvps').select('event_id').eq('event_id', fixtures.eventId)
    ),
  };
}

const ALL_VISIBLE = {
  profile: 1,
  post: 1,
  comment: 1,
  like: 1,
  follows: 2,
  listing: 1,
  event: 1,
  rsvp: 1,
};

const NONE_VISIBLE = {
  profile: 0,
  post: 0,
  comment: 0,
  like: 0,
  follows: 0,
  listing: 0,
  event: 0,
  rsvp: 0,
};

function expectCounts(
  actual: Record<string, number>,
  expected: Record<string, number>,
  who: string
) {
  for (const [key, value] of Object.entries(expected)) {
    assertCondition(
      actual[key] === value,
      `${who} should see ${value} ${key} row(s), saw ${actual[key]}`
    );
  }
}

async function checkAmrHelper(service: SupabaseClient): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cases: { label: string; amr: unknown; expected: boolean }[] = [
    {
      label: 'fresh password sign-in',
      amr: [{ method: 'password', timestamp: nowSeconds - 5 }],
      expected: true,
    },
    {
      label: 'stale sign-in',
      amr: [{ method: 'password', timestamp: nowSeconds - 3600 }],
      expected: false,
    },
    {
      label: 'stale password, fresh oauth',
      amr: [
        { method: 'oauth', timestamp: nowSeconds - 5 },
        { method: 'password', timestamp: nowSeconds - 3600 },
      ],
      expected: true,
    },
    { label: 'empty amr', amr: [], expected: false },
    { label: 'missing amr', amr: null, expected: false },
    { label: 'amr not an array', amr: { method: 'password' }, expected: false },
    {
      label: 'string timestamp',
      amr: [{ method: 'password', timestamp: String(nowSeconds) }],
      expected: false,
    },
  ];

  for (const { label, amr, expected } of cases) {
    const { data, error } = await service.rpc('amr_signed_in_within', {
      p_amr: amr,
      p_max_age_seconds: REAUTH_MAX_AGE_SECONDS,
    });
    assertCondition(!error, `amr_signed_in_within (${label}) failed: ${error?.message}`);
    assertCondition(
      data === expected,
      `amr_signed_in_within (${label}) should be ${expected}, got ${data}`
    );
  }
}

async function main(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const service = createClient(url, serviceKey, { auth: NO_SESSION_AUTH });
  const createdUsers: string[] = [];

  try {
    // 1. The sign-in recency check.
    await checkAmrHelper(service);

    const owner = await createUser(service, 'del-owner');
    createdUsers.push(owner.id);
    const viewer = await createUser(service, 'del-viewer');
    createdUsers.push(viewer.id);
    const moderator = await createUser(service, 'del-mod', true);
    createdUsers.push(moderator.id);

    const fixtures = await seedContent(service, owner, viewer);
    await insertLink(service, 'device_tokens', [
      { user_id: owner.id, token: `ExponentPushToken[smoke-${randomToken(10)}]`, platform: 'expo' },
    ]);

    const ownerClient = await signIn(url, anonKey, owner);
    const viewerClient = await signIn(url, anonKey, viewer);
    const moderatorClient = await signIn(url, anonKey, moderator);

    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      ALL_VISIBLE,
      'viewer before'
    );

    // 2. The column can't be written directly.
    const { error: directError } = await ownerClient
      .from('users')
      .update({ deletion_scheduled_for: new Date().toISOString() })
      .eq('id', owner.id)
      .select('id');
    assertCondition(
      directError?.code === PRIVILEGE_GUARD_ERROR_CODE &&
        directError.message.includes(PRIVILEGE_GUARD_MESSAGE),
      `Direct update of deletion_scheduled_for should hit the guard, got ${directError?.code} ${directError?.message}`
    );

    // 3. Request right after signing in.
    const before = Date.now();
    const { data: scheduled, error: requestError } = await ownerClient.rpc(
      'request_account_deletion'
    );
    assertCondition(
      !requestError,
      `request_account_deletion should succeed: ${requestError?.message}`
    );
    const scheduledMs = new Date(scheduled as string).getTime();
    const expectedMs = before + GRACE_DAYS * DAY_MS;
    assertCondition(
      Math.abs(scheduledMs - expectedMs) < DAY_MS,
      `Deletion should be scheduled ${GRACE_DAYS} days out, got ${scheduled}`
    );

    const { data: again, error: againError } = await ownerClient.rpc('request_account_deletion');
    assertCondition(!againError, `A repeated request should succeed: ${againError?.message}`);
    assertCondition(
      new Date(again as string).getTime() === scheduledMs,
      `A repeated request should return the same date, got ${again}`
    );

    const { data: tokens, error: tokensError } = await service
      .from('device_tokens')
      .select('id')
      .eq('user_id', owner.id);
    assertCondition(!tokensError, `Reading device tokens failed: ${tokensError?.message}`);
    assertCondition((tokens ?? []).length === 0, 'The request should remove every device token');

    // 4. Hidden from members, visible to moderators and the owner.
    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      NONE_VISIBLE,
      'viewer while pending'
    );
    expectCounts(
      await visibleCounts(moderatorClient, owner.id, fixtures),
      ALL_VISIBLE,
      'moderator while pending'
    );
    const ownerView = await visibleCounts(ownerClient, owner.id, fixtures);
    expectCounts(ownerView, { ...ALL_VISIBLE, follows: 0 }, 'owner while pending');

    const { data: ownProfile, error: ownProfileError } = await ownerClient
      .rpc('get_my_profile')
      .maybeSingle();
    assertCondition(!ownProfileError, `get_my_profile failed: ${ownProfileError?.message}`);
    assertCondition(
      (ownProfile as { deletion_scheduled_for: string | null } | null)?.deletion_scheduled_for,
      'get_my_profile should return deletion_scheduled_for while pending'
    );

    // 5. Restore.
    const { error: cancelError } = await ownerClient.rpc('cancel_account_deletion');
    assertCondition(
      !cancelError,
      `cancel_account_deletion should succeed: ${cancelError?.message}`
    );
    expectCounts(
      await visibleCounts(viewerClient, owner.id, fixtures),
      ALL_VISIBLE,
      'viewer after restore'
    );

    console.log('PASS: account deletion smoke test verified.');
  } finally {
    // Deleting the auth user cascades to the profile and every fixture row.
    for (const userId of createdUsers) {
      const { error } = await service.auth.admin.deleteUser(userId);
      if (error) console.error(`Cleanup failed for ${userId}: ${error.message}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [x] **Step 2: Add the npm script.** In `package.json`, after the `test:security:listing-reports` line:

```json
    "test:security:account-deletion": "tsx scripts/security/account-deletion-smoke.ts",
```

- [x] **Step 3: Run it and watch it fail.** Export the env first. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from `scripts/.env`. `SUPABASE_ANON_KEY` is `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local`.

Run: `npm run test:security:account-deletion`
Expected: exit code 1, and `FAIL: amr_signed_in_within (fresh password sign-in) failed: Could not find the function public.amr_signed_in_within…`

- [x] **Step 4: Format and commit.**

```bash
npx prettier --write scripts/security/account-deletion-smoke.ts
git add scripts/security/account-deletion-smoke.ts package.json
```

```bash
git commit -m "test: add live check for account deletion requests and hiding"
```

### Task 1.2: Migration 048

**Files:**

- Create: `supabase/migrations/048_account_deletion.sql`

- [x] **Step 1: Write the migration.**

```sql
-- 048_account_deletion.sql
-- ADDITIVE / non-destructive: one nullable column, one partial index, five
-- functions, a replaced guard-trigger function and eight SELECT policies
-- altered in place. No data changes.
--
-- In-app account deletion, first half (spec:
-- docs/specs/2026-09-28-account-deletion.md). A member asks to delete their
-- account; it is hidden from everyone else for 30 days and can be restored
-- by signing in. After 30 days the purge-deleted-accounts edge function
-- (added with migration 049) removes their storage objects and deletes the
-- auth user, and the existing ON DELETE CASCADE chain removes every row.
--
--   users.deletion_scheduled_for: NULL while the account is active; the
--   purge date while deletion is pending. No client role holds a column
--   grant on it (036), so only the owner sees it, through get_my_profile()
--   (SETOF users, SELECT u.*, so it picks the column up unchanged).
--   The 034 guard now treats it as privileged: only the functions below and
--   service_role can change it.
--
--   amr_signed_in_within(amr, max_age): true when the newest timestamp in a
--   Supabase JWT's amr claim is at most max_age seconds old. Refreshing a
--   token keeps amr unchanged (checked on staging 2026-09-28), so this is
--   the time of the last real sign-in. SECURITY INVOKER and pure; only
--   service_role (the smoke test) and the definer functions call it.
--
--   request_account_deletion(): the caller must have signed in within the
--   last 600 seconds (REAUTH_MAX_AGE_SECONDS in @nepally/shared), otherwise
--   it raises 'reauth_required' (SQLSTATE P0001), which the apps match on.
--   Sets the purge date 30 days out (ACCOUNT_DELETION_GRACE_DAYS), removes
--   the caller's device tokens so no push reaches a hidden account, and
--   returns the date. Repeating it returns the existing date.
--
--   cancel_account_deletion(): clears the date. No recency check: the
--   restore screen is only reachable by signing in.
--
--   is_pending_deletion(uid): policy helper. False for active and unknown
--   users, so it follows the 041 smoke test's convention for helpers.
--   Granted to anon and authenticated because the posts, comments, likes,
--   follows, events and RSVP policies apply to every role.
--
--   list_user_storage_objects(uid): every storage object the user owns,
--   whatever its path. service_role only; the purge uses it.
--
--   Policies: each SELECT policy below keeps its original condition and
--   adds "the row's user is not pending deletion, or the caller is that
--   user, or the caller is a moderator". user_follows hides an edge when
--   either end is pending (moderators still see it). Messages and
--   conversations are unchanged: chats keep their history and the apps show
--   the other person as an unavailable account.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE, GRANT/REVOKE and ALTER POLICY can all be re-run.
--
-- Verify: npm run test:security:account-deletion and
-- npm run test:security:functions against staging.
--
-- Rollback (forward-only): a new migration that ALTERs the eight policies
-- back to their pre-048 conditions (each is quoted in the account-deletion
-- implementation plan, "Verified while planning"), restores the 034 guard
-- body, and drops the functions. The column can stay; NULL everywhere means
-- nothing is hidden.

-- ---------------------------------------------------------------------------
-- 1) Column and index
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;

COMMENT ON COLUMN public.users.deletion_scheduled_for IS
  'NULL = active. Otherwise the account is hidden and will be purged at this time (migration 048). Changed only by request_account_deletion() / cancel_account_deletion().';

CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_for
  ON public.users (deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) The 034 guard also protects deletion_scheduled_for
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.trust_level            := 0;
    NEW.is_moderator           := false;
    NEW.is_premium             := false;
    NEW.is_banned              := false;
    NEW.ban_reason             := NULL;
    NEW.email_verified         := false;
    NEW.google_verified        := false;
    NEW.phone_verified         := false;
    NEW.facebook_verified      := false;
    NEW.posts_count            := 0;
    NEW.helpful_votes_received := 0;
    NEW.reports_received       := 0;
    NEW.follower_count         := 0;
    NEW.following_count        := 0;
    NEW.deletion_scheduled_for := NULL;
    RETURN NEW;
  END IF;

  IF NEW.trust_level            IS DISTINCT FROM OLD.trust_level
     OR NEW.is_moderator           IS DISTINCT FROM OLD.is_moderator
     OR NEW.is_premium             IS DISTINCT FROM OLD.is_premium
     OR NEW.is_banned              IS DISTINCT FROM OLD.is_banned
     OR NEW.ban_reason             IS DISTINCT FROM OLD.ban_reason
     OR NEW.email_verified         IS DISTINCT FROM OLD.email_verified
     OR NEW.google_verified        IS DISTINCT FROM OLD.google_verified
     OR NEW.phone_verified         IS DISTINCT FROM OLD.phone_verified
     OR NEW.facebook_verified      IS DISTINCT FROM OLD.facebook_verified
     OR NEW.posts_count            IS DISTINCT FROM OLD.posts_count
     OR NEW.helpful_votes_received IS DISTINCT FROM OLD.helpful_votes_received
     OR NEW.reports_received       IS DISTINCT FROM OLD.reports_received
     OR NEW.follower_count         IS DISTINCT FROM OLD.follower_count
     OR NEW.following_count        IS DISTINCT FROM OLD.following_count
     OR NEW.deletion_scheduled_for IS DISTINCT FROM OLD.deletion_scheduled_for
  THEN
    RAISE EXCEPTION 'Privileged user columns cannot be modified directly'
      USING ERRCODE = '42501',
            HINT = 'Verification goes through mark_user_verified(); moderation flags require a moderator action; account deletion goes through request_account_deletion().';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.amr_signed_in_within(p_amr jsonb, p_max_age_seconds integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_amr) IS DISTINCT FROM 'array' THEN false
    ELSE COALESCE(
      (
        SELECT max((entry ->> 'timestamp')::numeric)
          FROM jsonb_array_elements(p_amr) AS entry
         WHERE jsonb_typeof(entry -> 'timestamp') = 'number'
      ) >= extract(epoch FROM now()) - p_max_age_seconds,
      false
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_pending_deletion(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.id = p_user_id
       AND u.deletion_scheduled_for IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_grace_period           CONSTANT interval := interval '30 days';
  c_reauth_max_age_seconds CONSTANT integer  := 600;
  v_user_id   uuid := auth.uid();
  v_scheduled timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.amr_signed_in_within(auth.jwt() -> 'amr', c_reauth_max_age_seconds) THEN
    RAISE EXCEPTION 'reauth_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.deletion_scheduled_for
    INTO v_scheduled
    FROM public.users u
   WHERE u.id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_scheduled IS NOT NULL THEN
    RETURN v_scheduled;
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = now() + c_grace_period
   WHERE id = v_user_id
  RETURNING deletion_scheduled_for INTO v_scheduled;

  DELETE FROM public.device_tokens WHERE user_id = v_user_id;

  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = NULL
   WHERE id = auth.uid()
     AND deletion_scheduled_for IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_user_storage_objects(p_user_id uuid)
RETURNS TABLE (bucket_id text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.bucket_id, o.name
    FROM storage.objects o
   WHERE o.owner_id = p_user_id::text
   ORDER BY o.bucket_id, o.name;
$$;

-- Grants (041: new functions are executable by nobody until granted).
REVOKE EXECUTE ON FUNCTION public.amr_signed_in_within(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.amr_signed_in_within(jsonb, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_pending_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pending_deletion(uuid) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_user_storage_objects(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Hide pending accounts from everyone but themselves and moderators
-- ---------------------------------------------------------------------------

ALTER POLICY "Users are viewable by everyone" ON public.users
  USING (
    deletion_scheduled_for IS NULL
    OR id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY "Active posts are viewable by everyone" ON public.posts
  USING (
    (status = 'active'::post_status AND NOT public.is_pending_deletion(author_id))
    OR author_id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY "Anyone can view non-deleted comments" ON public.post_comments
  USING (
    is_deleted = false
    AND (
      NOT public.is_pending_deletion(author_id)
      OR author_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY "Anyone can read active listings" ON public.marketplace_listings
  USING (
    (
      status = 'active'::listing_status
      AND (NOT public.is_pending_deletion(owner_id) OR (SELECT public.is_moderator()))
    )
    OR owner_id = (SELECT auth.uid())
  );

ALTER POLICY events_select ON public.events
  USING (
    status <> 'removed'::event_status
    AND (
      NOT public.is_pending_deletion(organizer_id)
      OR organizer_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY rsvps_select ON public.event_rsvps
  USING (
    EXISTS (
      SELECT 1
        FROM public.events
       WHERE events.id = event_rsvps.event_id
         AND events.status <> 'removed'::event_status
         AND (
           events.rsvp_visibility = 'public'
           OR events.organizer_id = (SELECT auth.uid())
           OR event_rsvps.user_id = (SELECT auth.uid())
         )
    )
    AND (
      NOT public.is_pending_deletion(user_id)
      OR user_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY "Anyone can view likes" ON public.post_likes
  USING (
    NOT public.is_pending_deletion(user_id)
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY user_follows_select_all ON public.user_follows
  USING (
    (NOT public.is_pending_deletion(follower_id) AND NOT public.is_pending_deletion(followee_id))
    OR (SELECT public.is_moderator())
  );
```

- [x] **Step 2: Check each policy against its live condition.** Compare every `ALTER POLICY` with its condition under [Verified while planning](#verified-while-planning-2026-09-28). The original condition must survive unchanged, apart from the added visibility clause. The one intended exception: moderators can now see a pending member's active listings. The migration is applied and the check turns green in Task 1.5.

- [x] **Step 3: Commit.**

```bash
git add supabase/migrations/048_account_deletion.sql
```

```bash
git commit -m "feat(db): add account deletion requests, restore and hiding (048)"
```

### Task 1.3: The function-execute check knows the new functions

**Files:**

- Modify: `scripts/security/function-execute-smoke.ts:36-57` (the three `RpcCall` lists)

- [x] **Step 1: Add the new functions to the lists.** `cancel_account_deletion` comes straight after `request_account_deletion`, so the test member ends up active again.

```ts
/** RPCs the apps call signed in; anon must be refused, authenticated let through. */
const SIGNED_IN_RPCS: RpcCall[] = [
  { fn: 'increment_listing_views', args: { p_listing_id: MISSING_ID } },
  { fn: 'increment_listing_contacts', args: { p_listing_id: MISSING_ID } },
  { fn: 'soft_delete_event', args: { p_event_id: MISSING_ID } },
  { fn: 'soft_delete_own_comment', args: { p_comment_id: MISSING_ID } },
  { fn: 'request_account_deletion', args: {} },
  { fn: 'cancel_account_deletion', args: {} },
];

/** Helpers that RLS policies call as the querying role; anon and members must keep them. */
const POLICY_HELPER_RPCS: RpcCall[] = [
  { fn: 'is_moderator', args: {} },
  { fn: 'is_conversation_participant', args: { conv_id: MISSING_ID, uid: MISSING_ID } },
  { fn: 'is_conversation_creator', args: { conv_id: MISSING_ID, uid: MISSING_ID } },
  { fn: 'is_pending_deletion', args: { p_user_id: MISSING_ID } },
];

/** Helpers only the database itself uses; every client role must be refused. */
const INTERNAL_RPCS: RpcCall[] = [
  { fn: 'has_user_liked_post', args: { p_post_id: MISSING_ID, p_user_id: MISSING_ID } },
  { fn: 'get_post_like_count', args: { p_post_id: MISSING_ID } },
  { fn: 'get_post_comment_count', args: { p_post_id: MISSING_ID } },
  { fn: 'get_metro_by_zip', args: { zip: '75001' } },
  { fn: 'build_notification_push_url', args: { p_type: 'system', p_data: {} } },
  { fn: 'amr_signed_in_within', args: { p_amr: [], p_max_age_seconds: 600 } },
  { fn: 'list_user_storage_objects', args: { p_user_id: MISSING_ID } },
];
```

Also update the header comment's numbered list: item 1 names the RPCs anon can't call, item 2 the policy helpers. Add the new names to those sentences.

- [x] **Step 2: Commit.**

```bash
npx prettier --write scripts/security/function-execute-smoke.ts
git add scripts/security/function-execute-smoke.ts
```

```bash
git commit -m "test: cover account deletion functions in the function-execute check"
```

### Task 1.4: Docs

**Files:**

- Modify: `docs/architecture/database-schema.md`: add `deletion_scheduled_for` to the Users table section, and a `### Account deletion (migration 048)` section after `### Report thresholds and guards (migration 047)`
- Modify: `docs/guides/setup-and-testing.md`: add `npm run test:security:account-deletion` to the list of security checks
- Modify: this plan's PR table (mark PR 1 in progress)

- [x] **Step 1: Write the schema section.**

```markdown
### Account deletion (migration 048)

- `users.deletion_scheduled_for timestamptz` is NULL while the account is active. While deletion is pending it holds the purge time, 30 days after the request. No client role has a column grant on it; the owner reads it through `get_my_profile()`. The 034 guard treats it as privileged.
- `request_account_deletion()` (authenticated) needs a sign-in within the last 600 seconds, read from the JWT's `amr` claim by `amr_signed_in_within(amr, max_age)`. Otherwise it raises `reauth_required` (SQLSTATE `P0001`). It sets the purge time, deletes the caller's `device_tokens`, and returns the time. A repeated call returns the same time.
- `cancel_account_deletion()` (authenticated) clears it.
- `is_pending_deletion(uid)` (anon, authenticated) is the RLS helper. The SELECT policies on `users`, `posts`, `post_comments`, `marketplace_listings`, `events`, `event_rsvps` and `post_likes` hide a pending member's rows from everyone but that member and moderators. `user_follows` hides an edge when either end is pending, except from moderators. Messages and conversations are unchanged.
- `list_user_storage_objects(uid)` (service_role) lists every storage object a user owns, for the purge in migration 049.
- Live checks: `npm run test:security:account-deletion` and `npm run test:security:functions`.
```

In the Users table section, add a row or bullet for the column in the same style as its neighbours.

- [x] **Step 2: Format, check and commit.**

```bash
npx prettier --write docs/architecture/database-schema.md docs/guides/setup-and-testing.md docs/plans/active/2026-09-28-account-deletion.md
npm run docs:check
npm run lint:md
git add docs/architecture/database-schema.md docs/guides/setup-and-testing.md docs/plans/active/2026-09-28-account-deletion.md
```

```bash
git commit -m "docs: document account deletion schema (048)"
```

### Task 1.5: Gate, review, apply and verify

- [x] **Step 1: Run the gate** (see [How it runs](#how-it-runs)). The only code touched is in `scripts/`, so no workspace suites need to run. Run `npm run type-check`, `npm run lint`, `npm run docs:check` and `npm run lint:md`. Check every exit code.
- [x] **Step 2: Review.** Dispatch a `code-reviewer` agent and a `security-reviewer` agent on `git diff master...HEAD`. Fix CRITICAL and HIGH in one `fix: address PR 1 review` commit; put the rest in [Follow-ups](#follow-ups-not-scheduled).
- [x] **Step 3: Ship the draft.** Push with `git push -u origin feat/account-deletion-db`, open a **draft** PR against `master` with the template filled in, and request Copilot's review.
- [x] **Step 4: Apply 048 to staging**, once the user asks for it directly. Use `apply_migration` with name `account_deletion`, then realign the tracker row:

```sql
UPDATE supabase_migrations.schema_migrations
   SET version = '048',
       statements = ARRAY['-- Canonical SQL: supabase/migrations/048_account_deletion.sql']
 WHERE name = 'account_deletion' AND version <> '048';
```

- [x] **Step 5: Run the live checks against staging.** Every one must exit 0:
  - `npm run test:security:account-deletion`
  - `npm run test:security:functions`
  - `npm run test:security:users-privilege`
  - `npm run test:security:users-pii`
  - `npm run test:security:emergency-post`
  - `npm run test:security:listing-reports`
  - `npm run test:security:chat-rls`

  If one fails, fix it forward in the same PR. Edit 048 and re-apply the changed statements with `execute_sql`, as 035 did.

- [x] **Step 6: Run `get_advisors`** (security and performance). Any new warning about the new functions or policies gets fixed or recorded in Follow-ups with a reason.
- [x] **Step 7:** Record in this plan and in memory that 048 is applied and realigned. The next migration number is 049.

**Done 2026-09-28.** 048 was applied to staging and its tracker row realigned to `048`. All seven live checks passed. `users-pii` failed once, from a flake that predates 048 (see Follow-ups), and passed on both reruns. The advisors show no new findings beyond the intended ones: definer functions callable by clients, as with 041's helpers and RPCs, and the new, still-unused index.

---

## PR 2 — Purge: edge function and migration 049

Branch `feat/account-deletion-purge`, stacked on PR 1. It needs 048 applied on staging, which happened 2026-09-28.

**Found at the start of PR 2 (2026-09-28):**

- **The root lint and type-check cover the workspaces only.** Nothing checks `supabase/functions` today. The purge core gets `node --test` tests, run by the new `npm run functions:test`, and a strict `tsc` run in the gate. `index.ts` imports from `esm.sh` and uses `Deno`, so the live check in Task 2.4 is what exercises it.
- **Root `package.json` has no `"type"`.** Node 24's syntax detection runs the `.ts` test as ESM, and type stripping handles the types. The core must use only erasable TypeScript: no enums, no namespaces, no parameter properties.
- **`supabase-setup.md` §5 is out of date for this job.** It says scheduled jobs run SQL and need no manual setup. The purge is the exception, so that text changes in Task 2.5.
- **pg_net stops waiting after 5 seconds by default.** The cron call sets `timeout_milliseconds := 60000`.
- **Uploads must come from the user.** Objects uploaded with the service role have no `owner_id`, so the live check uploads as the user. `storage-rls-smoke.ts` shows the pattern: a 4-byte fake JPEG with `contentType: 'image/jpeg'`.

**Files:**

- Create: `supabase/functions/purge-deleted-accounts/purge.ts`
- Create: `supabase/functions/purge-deleted-accounts/purge.test.ts`
- Create: `supabase/functions/purge-deleted-accounts/index.ts`
- Modify: `supabase/config.toml`
- Create: `supabase/migrations/049_purge_deleted_accounts_cron.sql`
- Create: `scripts/security/account-purge-smoke.ts`
- Modify: `package.json`: `functions:test`, wired into `test`, `test:ci` and `test:coverage:ci`; and `test:security:account-purge`
- Docs: `docs/architecture/supabase-setup.md` (§3 deploy list, §5 Scheduled Jobs and the secrets runbook), `docs/architecture/database-schema.md` (049), `docs/guides/setup-and-testing.md` (the new check), this plan

### Task 2.1: The purge core, test first

**Files:**

- Create: `supabase/functions/purge-deleted-accounts/purge.test.ts`
- Create: `supabase/functions/purge-deleted-accounts/purge.ts`
- Modify: `package.json` (`scripts`)

- [x] **Step 1: Add the test script.** In `package.json`, add `"functions:test": "node --test \"supabase/functions/*/*.test.ts\"",` after `guards:test`. Then, in `test`, `test:ci` and `test:coverage:ci`, change `npm run guards:test` to `npm run guards:test && npm run functions:test`.

- [x] **Step 2: Write the failing tests.**

```ts
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
  /** Due on the first check, restored by the second. */
  restoresMidPurge?: string[];
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
  const stillDueChecks = new Map<string, number>();

  const deps: PurgeDeps = {
    async listDueUserIds(limit) {
      calls.listDueUserIds.push(limit);
      return options.due ?? [];
    },
    async isStillDue(userId) {
      const checks = (stillDueChecks.get(userId) ?? 0) + 1;
      stillDueChecks.set(userId, checks);
      if ((options.restoresMidPurge ?? []).includes(userId)) return checks === 1;
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

test('keeps the account when the user restores while their files are being removed', async () => {
  const { deps, calls } = fakeDeps({
    due: ['u1'],
    restoresMidPurge: ['u1'],
    objects: { u1: objectsFor('u1', 'post-photos', 1) },
  });

  const summary = await purgeDueAccounts(deps);

  assert.deepEqual(summary, { purged: 0, skipped: 1, failed: 0 });
  assert.equal(calls.removeObjects.length, 1);
  assert.deepEqual(calls.deleteAuthUser, []);
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
```

- [x] **Step 3: Run it and watch it fail.**

Run: `npm run functions:test`
Expected: a non-zero exit, because `./purge.ts` doesn't exist (`ERR_MODULE_NOT_FOUND`).

- [x] **Step 4: Write the core.**

```ts
/**
 * Core of the purge-deleted-accounts edge function (scheduled by migration
 * 049). For each account whose deletion grace period has ended it removes
 * the user's storage objects, then deletes the auth user; 048's ON DELETE
 * CASCADE chain removes their rows.
 *
 * No Deno APIs and no remote imports, so `node --test` can run the tests
 * (npm run functions:test). index.ts wires PurgeDeps to Supabase.
 */

export type StorageObjectRef = { bucket_id: string; name: string };

export interface PurgeDeps {
  /** Users whose deletion_scheduled_for <= now(), oldest first. */
  listDueUserIds(limit: number): Promise<string[]>;
  /** Re-read before touching the user, and again before deleting the auth user. */
  isStillDue(userId: string): Promise<boolean>;
  listStorageObjects(userId: string): Promise<StorageObjectRef[]>;
  /** Throws on failure. */
  removeObjects(bucketId: string, paths: string[]): Promise<void>;
  /** Throws on failure. */
  deleteAuthUser(userId: string): Promise<void>;
  logFailure(userId: string, error: unknown): void;
}

export type PurgeSummary = { purged: number; skipped: number; failed: number };

/** Accounts handled per run; the rest wait for the next daily run. */
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
```

- [x] **Step 5: Run the tests and watch them pass.**

Run: `npm run functions:test`
Expected: 7 tests pass, exit 0.

- [x] **Step 6: Type-check strictly.**

Run: `npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --module nodenext --moduleResolution nodenext --target es2022 --types node --allowImportingTsExtensions supabase/functions/purge-deleted-accounts/purge.ts supabase/functions/purge-deleted-accounts/purge.test.ts`
Expected: exit 0.

- [x] **Step 7: Format and commit.**

```bash
npx prettier --write supabase/functions/purge-deleted-accounts/purge.ts supabase/functions/purge-deleted-accounts/purge.test.ts
git add supabase/functions/purge-deleted-accounts/purge.ts supabase/functions/purge-deleted-accounts/purge.test.ts package.json
```

```bash
git commit -m "feat: add account purge core with node tests"
```

### Task 2.2: The edge function handler

**Files:**

- Create: `supabase/functions/purge-deleted-accounts/index.ts`
- Modify: `supabase/config.toml` (after `[functions.stripe-webhook]`)

- [x] **Step 1: Write the handler.**

```ts
/**
 * purge-deleted-accounts — Supabase Edge Function
 *
 * Deletes accounts whose 30-day deletion grace period has ended (spec:
 * docs/specs/2026-09-28-account-deletion.md). For each due user it removes
 * every storage object they own, then deletes the auth user; ON DELETE
 * CASCADE removes their rows. The pg_cron job from migration 049 calls it
 * daily.
 *
 * Auth: verify_jwt = false in config.toml. The caller must send an
 * x-purge-secret header equal to the ACCOUNT_PURGE_SECRET function secret.
 * Setup: docs/architecture/supabase-setup.md, "Scheduled Jobs".
 *
 * Response: 200 { purged, skipped, failed }. Logs user ids and error
 * messages only, never names or emails.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { purgeDueAccounts, secretsMatch, type PurgeDeps, type StorageObjectRef } from './purge.ts';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildDeps(supabase: SupabaseClient): PurgeDeps {
  return {
    async listDueUserIds(limit) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .lte('deletion_scheduled_for', new Date().toISOString())
        .order('deletion_scheduled_for', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row: { id: string }) => row.id);
    },
    async isStillDue(userId) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .lte('deletion_scheduled_for', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    async listStorageObjects(userId) {
      const { data, error } = await supabase.rpc('list_user_storage_objects', {
        p_user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as StorageObjectRef[];
    },
    async removeObjects(bucketId, paths) {
      const { error } = await supabase.storage.from(bucketId).remove(paths);
      if (error) throw error;
    },
    async deleteAuthUser(userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    logFailure(userId, error) {
      console.error(`purge-deleted-accounts: user ${userId} failed: ${errorMessage(error)}`);
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('ACCOUNT_PURGE_SECRET') ?? '';
  if (expectedSecret.length === 0) {
    console.error('purge-deleted-accounts: ACCOUNT_PURGE_SECRET is not set');
    return new Response('Server misconfigured', { status: 500 });
  }
  if (!secretsMatch(req.headers.get('x-purge-secret') ?? '', expectedSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const summary = await purgeDueAccounts(buildDeps(supabase));
    console.log(`purge-deleted-accounts: ${JSON.stringify(summary)}`);
    return Response.json(summary);
  } catch (error) {
    console.error(`purge-deleted-accounts: run failed: ${errorMessage(error)}`);
    return new Response('Purge failed', { status: 500 });
  }
});
```

- [x] **Step 2: Register the function.** In `supabase/config.toml`, after the `[functions.stripe-webhook]` block:

```toml
[functions.purge-deleted-accounts]
verify_jwt = false
```

- [x] **Step 3: Format and commit.** Tests for this glue come in Task 2.4.

```bash
npx prettier --write supabase/functions/purge-deleted-accounts/index.ts
git add supabase/functions/purge-deleted-accounts/index.ts supabase/config.toml
```

```bash
git commit -m "feat: add purge-deleted-accounts edge function"
```

### Task 2.3: Migration 049, the daily job

**Files:**

- Create: `supabase/migrations/049_purge_deleted_accounts_cron.sql`

- [x] **Step 1: Write the migration.**

```sql
-- 049_purge_deleted_accounts_cron.sql
-- ADDITIVE / non-destructive: one pg_cron job. No schema changes.
-- Runs the purge-deleted-accounts edge function once a day: the second half
-- of in-app account deletion (spec: docs/specs/2026-09-28-account-deletion.md;
-- 048 added the request, restore and hiding).
--
--   Why an edge function, when 046 moved promotion expiry into SQL: a purge
--   must delete the user's files, and only the Storage API deletes the
--   stored files. Deleting rows from storage.objects in SQL would leave the
--   files behind. The function removes the files, then deletes the auth
--   user, and the ON DELETE CASCADE chain removes every row.
--
--   The job reads two Vault secrets when it runs, so no secret is stored in
--   this file or in cron.job:
--     project_url           https://<project-ref>.supabase.co
--     account_purge_secret  the same value as the function's
--                           ACCOUNT_PURGE_SECRET secret
--   They are created by hand in each environment (runbook:
--   docs/architecture/supabase-setup.md, "Scheduled Jobs"). Until they
--   exist the call fails, cron.job_run_details records the failure, and
--   nothing is deleted.
--
--   Daily at 09:00 UTC, early morning across the US. pg_net sends the
--   request in the background; the 60 s timeout (default 5 s) gives the
--   function time to answer, and its logs record what it purged.
--
--   cron.schedule with a job name replaces an existing job of that name,
--   so re-running this migration does not add a second job.
--
-- Idempotent: the named cron.schedule can be re-run.
--
-- Verify: SELECT jobname, schedule, active FROM cron.job; then, after the
-- secrets exist, npm run test:security:account-purge against staging.
--
-- Rollback (forward-only): a new migration that runs
--   SELECT cron.unschedule('purge-deleted-accounts');

SELECT cron.schedule(
  'purge-deleted-accounts',
  '0 9 * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/purge-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'account_purge_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
```

- [x] **Step 2: Commit.**

```bash
git add supabase/migrations/049_purge_deleted_accounts_cron.sql
```

```bash
git commit -m "feat(db): schedule the daily account purge (049)"
```

### Task 2.4: A live check for the purge

**Files:**

- Create: `scripts/security/account-purge-smoke.ts`
- Modify: `package.json` (after `test:security:account-deletion`)

The check runs a **real purge** on the target project. Every account whose date has passed is deleted, not only the check's own. On staging nobody else is due. It needs `ACCOUNT_PURGE_SECRET` in the environment; keep it in the git-ignored `scripts/.env`.

- [x] **Step 1: Write the check.** Follow the helpers and style of `scripts/security/account-deletion-smoke.ts`. The same `requireEnv`, `randomToken`, `assertCondition`, `NO_SESSION_AUTH` and `signIn` shapes live in this file too, as they do in every other check.

```ts
/**
 * Live smoke test: the purge-deleted-accounts edge function (migration 049).
 *
 * Against a real Supabase project where 048 is applied, the function is
 * deployed and its secret is set:
 *   1. A POST without the right x-purge-secret is refused (401).
 *   2. A member uploads an avatar and a post photo, requests deletion, and
 *      has the purge date moved into the past. After a POST with the secret,
 *      the auth user, the profile row and both storage objects are gone.
 *   3. A second pending member whose date is still in the future is left
 *      alone.
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
```

- [x] **Step 2: Add the npm script** after `test:security:account-deletion`:

```json
    "test:security:account-purge": "tsx scripts/security/account-purge-smoke.ts",
```

- [x] **Step 3: Type-check it strictly.**

Run: `npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --module nodenext --moduleResolution nodenext --target es2022 --types node scripts/security/account-purge-smoke.ts`
Expected: exit 0. The check itself runs in Task 2.7, once the function is deployed and the secrets are set.

- [x] **Step 4: Format and commit.**

```bash
npx prettier --write scripts/security/account-purge-smoke.ts
git add scripts/security/account-purge-smoke.ts package.json
```

```bash
git commit -m "test: add live check for the account purge"
```

### Task 2.5: Docs

**Files:**

- Modify: `docs/architecture/supabase-setup.md`: add `supabase functions deploy purge-deleted-accounts` to the §3 deploy list. In §5 Scheduled Jobs, rewrite the opening paragraph and add the job row and a runbook (below).
- Modify: `docs/architecture/database-schema.md`: one bullet under `### Account deletion (migration 048)`: "Migration 049 schedules the daily `purge-deleted-accounts` job (pg_cron + pg_net, secrets in Vault). See supabase-setup.md, Scheduled Jobs."
- Modify: `docs/guides/setup-and-testing.md`: a row for `npm run test:security:account-purge` next to the account-deletion row. Say that it runs a real purge and needs `ACCOUNT_PURGE_SECRET`.
- Modify: this plan: tick Tasks 2.1–2.5.

- [x] **Step 1: Rewrite §5's opening paragraph.**

```markdown
Scheduled work runs in the database on `pg_cron` (enabled by `001_schema.sql`). Migrations create the jobs. Most run SQL directly, so they have no public endpoint to protect and need no setup. The one exception is `purge-deleted-accounts`. It calls an edge function, because deleting stored files needs the Storage API, and that call needs the secrets below to be set once in each environment.
```

- [x] **Step 2: Add the table row.**

```markdown
| `purge-deleted-accounts` | Daily, 09:00 UTC | POSTs to the `purge-deleted-accounts` edge function, which deletes accounts whose 30-day grace period has ended: their storage objects, then the auth user | `049` |
```

- [x] **Step 3: Add the runbook** after the existing SQL block in §5:

````markdown
#### Account purge secrets (once per environment)

The purge job and its edge function share a secret. Until both halves below are set, the job fails harmlessly and nobody is purged. Never paste the secret into a commit, a PR, an issue or a chat.

1. Generate a secret in your terminal: `openssl rand -hex 32`.
2. Give it to the edge function:

   ```bash
   npx supabase secrets set ACCOUNT_PURGE_SECRET=<secret> --project-ref <project-ref>
   ```

3. Store it and the project URL in Vault, in the dashboard's SQL editor:

   ```sql
   SELECT vault.create_secret('<secret>', 'account_purge_secret');
   SELECT vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   ```

   To rotate the secret, repeat step 2 and run `SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'account_purge_secret'), '<new secret>');`.

4. On staging only, for the live check: add `ACCOUNT_PURGE_SECRET=<secret>` to `scripts/.env` (git-ignored) and export it with the other script credentials, for example `set -a; . scripts/.env; set +a`. The npm scripts don't load that file themselves. Then run `npm run test:security:account-purge`. Never run it against production: it purges every due account.
5. After the next 09:00 UTC run, check it:

   ```sql
   SELECT d.status, d.return_message, d.start_time
     FROM cron.job_run_details d JOIN cron.job j USING (jobid)
    WHERE j.jobname = 'purge-deleted-accounts'
    ORDER BY d.start_time DESC
    LIMIT 5;

   SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;
   ```

   The function's logs, in the dashboard under Edge Functions → purge-deleted-accounts, show the `{ purged, skipped, failed }` summary for each run.
````

- [x] **Step 4: Format, check and commit.**

```bash
npx prettier --write docs/architecture/supabase-setup.md docs/architecture/database-schema.md docs/guides/setup-and-testing.md docs/plans/active/2026-09-28-account-deletion.md
npm run docs:check
npm run lint:md
git add docs/architecture/supabase-setup.md docs/architecture/database-schema.md docs/guides/setup-and-testing.md docs/plans/active/2026-09-28-account-deletion.md
```

```bash
git commit -m "docs: document the account purge job and its secrets (049)"
```

### Task 2.6: Gate, review, draft PR

- [x] **Step 1: Run the gate.** Run `npm run type-check`, `npm run lint`, `npm run lint:guards`, `npm run guards:test`, `npm run functions:test`, `npm run docs:check` and `npm run lint:md`, plus the two strict `tsc` commands from Tasks 2.1 and 2.4. Check every exit code.
- [x] **Step 2: Review.** Dispatch a `code-reviewer` agent and a `security-reviewer` agent on the PR 2 commits only. Fix CRITICAL and HIGH in one `fix: address PR 2 review` commit; put the rest in [Follow-ups](#follow-ups-not-scheduled). Tell reviewers about the column-privilege probe recorded in Follow-ups.
- [x] **Step 3: Ship the draft.** Push with `git push -u origin feat/account-deletion-purge`. Open a **draft** PR against `master`, noting that it is stacked on #112, and request Copilot's review.

### Task 2.7: Staging rollout (needs the user)

Each step runs only when the user asks for it directly.

- [x] **Step 1: Deploy the function.** Run `npx supabase functions deploy purge-deleted-accounts --project-ref tlusiongalvszftnzpoq`. The Supabase CLI is already logged in on this machine.
- [ ] **Step 2: The user sets the secrets**, following the runbook in `supabase-setup.md` §5. That's the function secret, the two Vault secrets, and `ACCOUNT_PURGE_SECRET` in `scripts/.env`. The secret value must not pass through the chat.
- [x] **Step 3: Apply 049** with `apply_migration`, name `purge_deleted_accounts_cron`. Realign its tracker row to `049`. Check that `SELECT jobname, schedule, active FROM cron.job;` lists `purge-deleted-accounts | 0 9 * * * | t`.
- [ ] **Step 4: Run the live checks.** `npm run test:security:account-purge` and `npm run test:security:account-deletion` must both exit 0.
- [ ] **Step 5: Record it.** Note in this plan and in memory that 049 is applied and the function deployed. The next migration number is 050.

**Progress 2026-09-28:** the function is deployed; the CLI bundled it server-side, with no Docker needed. A POST without a secret gets the handler's `500 Server misconfigured`, and GET gets 405, so `verify_jwt = false` is live and the function fails closed. 049 is applied and realigned to `049`. `cron.job` lists `purge-deleted-accounts | 0 9 * * * | active`, running as `postgres`, which can read `vault.decrypted_secrets`. Waiting on the user for the secrets (Step 2). Until then the 09:00 UTC run fails harmlessly.

### Task 2.8: Timing and counter fixes from the spec review (050, 051)

Review of #111 (2026-09-30) found four problems in the applied design:

- A restore could land between the purge's last re-read and `deleteUser`, and the account would still be deleted.
- The 30-day grace period plus a daily run broke the privacy policy's "within 30 days".
- `post_comments` has no hard-delete trigger, so a purge left `posts.comments_count` too high for good.
- A 30-vs-29-day check with a one-day tolerance couldn't tell the two apart.

The user chose to close restore at the date, to use a 29-day grace period, and to add the trigger (spec §4.4, §4.5).

**Files:**

- Modify: `supabase/functions/purge-deleted-accounts/purge.ts`, `purge.test.ts`, `index.ts`
- Create: `supabase/migrations/050_account_deletion_timing.sql`, `supabase/migrations/051_post_comments_delete_count.sql`
- Modify: `scripts/security/account-deletion-smoke.ts`, `scripts/security/account-purge-smoke.ts`, `scripts/security/function-execute-smoke.ts`
- Docs: `database-schema.md`, `supabase-setup.md` §5, `setup-and-testing.md`, this plan

- [x] **Step 1: The one-hour margin.**
  - The first version computed the cutoff in the function: `purgeCutoff(new Date())`, one hour before the runtime's clock, unit-tested.
  - Review (Step 6) found two problems. The guarantee still depended on the function's clock staying within an hour of the database's. And nothing live tested the margin.
  - So the margin moved into SQL. `list_due_account_deletions(limit)` and `is_due_for_purge(uid)` in 050 use `now() - interval '1 hour'`, and `index.ts` calls them. `purgeCutoff` and its unit test were removed.
- [x] **Step 2: The live checks, first.**
  - `account-deletion-smoke.ts` expects 29 days, within a 10-minute tolerance instead of a day. A new step 6 moves a pending date into the past with the service role and expects `cancel_account_deletion` to raise `deletion_in_progress` and keep the date.
  - `account-purge-smoke.ts` has the due member comment on the waiting member's post. It expects `comments_count` to go from 1 back to 0 after the purge. A third member, whose date passed 30 minutes ago, must survive the purge: that is the margin.
  - `function-execute-smoke.ts` lists `list_due_account_deletions` and `is_due_for_purge` as internal. Every client role must be refused.
  - The deletion check failed against staging as expected: "Deletion should be scheduled 29 days out, got …" (2026-09-30).
- [x] **Step 3: Migration 050.**
  - It replaces `request_account_deletion()` with 048's body and a 29-day `c_grace_period`. A diff against 048 shows only that line.
  - It replaces `cancel_account_deletion()`: it locks the row and returns if nothing is pending, raises `deletion_in_progress` (`P0001`) once the date is `<= now()`, and otherwise clears the date.
  - It restates both grants.
  - It adds `list_due_account_deletions(p_limit)`, which returns `TABLE (id uuid)`, oldest date first, and `is_due_for_purge(p_user_id)`, which returns a boolean. Both are `STABLE` SQL with `search_path = ''`, due at `now() - interval '1 hour'`, and executable by `service_role` only.
  - It reschedules `purge-deleted-accounts` to `'0 * * * *'` with 049's job body, which is byte-identical.
- [x] **Step 4: Migration 051.** `decrement_post_comments_count_on_delete()`, `AFTER DELETE ON post_comments FOR EACH ROW`. It decrements, clamped at zero, only when `OLD.is_deleted = false`. It is SECURITY DEFINER with `search_path = ''`, and EXECUTE is revoked from client roles, like 041's triggers. `function-execute-smoke.ts` doesn't list trigger functions, so it needs no change. Both files parse with libpg-query 17.
- [x] **Step 5: Docs.** Update `database-schema.md` (050, 051 and the comment triggers), the §5 table row and check step in `supabase-setup.md`, and the two check rows in `setup-and-testing.md`.
- [x] **Step 6: Gate and review.** The gate from Task 2.6 Step 1 passed. The `code-reviewer` and `security-reviewer` each found no CRITICAL or HIGH issues. Both flagged the cross-clock margin, and the code reviewer flagged the untested margin. Both were fixed in `fix: address Task 2.8 review` (see Step 1), and the gate passed again.
- [x] **Step 7: Apply on staging (needs the user).** Apply 050 (`account_deletion_timing`) and 051 (`post_comments_delete_count`) with `apply_migration`, and realign the tracker rows to `050` and `051`. Then redeploy `purge-deleted-accounts`. The new `index.ts` calls the 050 functions, so deploying it before 050 would make every run fail (closed: nothing is purged). Check that `cron.job` lists `purge-deleted-accounts | 0 * * * * | t`. Then `npm run test:security:account-deletion` and `npm run test:security:functions` must exit 0. After the user sets the secrets (Task 2.7 Step 2), `npm run test:security:account-purge` must too. The next migration number is 052.

**Progress 2026-09-30:** at the user's request, 050 and 051 were applied to staging and their tracker rows realigned (the tracker ends `048`, `049`, `050`, `051`). What the database showed:

- `cron.job` lists `purge-deleted-accounts | 0 * * * * | t`.
- `request_account_deletion` uses 29 days, and `cancel_account_deletion` raises `deletion_in_progress`.
- `list_due_account_deletions` and `is_due_for_purge` are executable by `service_role` only.
- The delete trigger is enabled, and no client role can execute its function.
- The drift query found 0 posts with a wrong `comments_count`.

`purge-deleted-accounts` was then redeployed. `npm run test:security:account-deletion` and `npm run test:security:functions` both pass. The security advisors show nothing new. A POST without the secret still gets 500, because the function secret isn't set yet, so the function fails closed. `test:security:account-purge` waits on the secrets (Task 2.7 Step 2).

**Acceptance:**

- `npm run functions:test` passes and is part of `npm run test`.
- The live purge check passes on staging: a wrong secret gets 401, and a due account loses its auth user, profile and files, while a pending account whose date is still ahead, or passed less than an hour ago, is untouched. The purged member's comment stops counting.
- The live deletion check passes: 29 days, and a cancel after the date is refused.
- `cron.job` lists `purge-deleted-accounts` hourly.

### Task 2.9: Scrub copies (052) and the #112 review's test gaps

The full review of #111 (2026-09-30) found that other members keep copies of a purged member's words: message, comment and like notifications, and `conversations.last_message`. The user chose to scrub them at the purge (spec §4.6). The #112 review found gaps in the deletion check.

**Files:**

- Modify: `supabase/functions/purge-deleted-accounts/purge.ts`, `purge.test.ts`, `index.ts`
- Create: `supabase/migrations/052_scrub_account_copies.sql`
- Modify: `scripts/security/account-deletion-smoke.ts`, `account-purge-smoke.ts`, `function-execute-smoke.ts`
- Docs: `database-schema.md`, `supabase-setup.md` §5, `setup-and-testing.md`, the spec (§4.1 views, §6 promotions), this plan

- [x] **Step 1: The purge core, test first.**
  - Two node tests failed first. One checks that the scrub runs once per member, just before their auth delete. The other checks that a failed scrub counts as failed and keeps the auth user.
  - Then `PurgeDeps.scrubCopies(userId)` was added. `purgeAccount` calls it after the second re-read. `index.ts` wires it to `rpc('scrub_account_copies')`. 10 tests pass.
  - The stale "daily run" comment now says hourly.
- [x] **Step 2: The deletion check's gaps (from the #112 review), run against staging.** All pass on staging (2026-09-30), because they test 048 and 050, which are applied. The check now covers:
  - A signed-out visitor, who loses the profile, post, comment, like and helper score while the member is pending.
  - `marketplace_listings_view` and `user_helper_scores`, which hide the member from other members.
  - A private-RSVP event: its RSVP stays hidden from members and moderators, pending or not, and the owner still sees it.
  - `not_authenticated` for request and cancel without a user JWT.
  - The 034 guard's INSERT branch: a new member's own profile insert can't set `deletion_scheduled_for`, because `authenticated` holds an INSERT grant on the column.
  - `listing_promotions_display` isn't hidden, and needs no check. See spec §4.1.
- [x] **Step 3: The 052 checks, first.**
  - `function-execute-smoke.ts` lists `scrub_account_copies` as internal. It failed against staging with PGRST202, as expected.
  - `account-purge-smoke.ts` gives the waiting member three copies of the due member's words: a like (with `notify_likes = 'all'`), a comment and a message notification. The due member also writes the newest message in their shared chat, whose preview is set to it. After the purge, all three notifications must be gone, and the preview must be the waiting member's message and time. The check deletes the conversation in `finally`, because conversations don't cascade from users.
- [x] **Step 4: Migration 052.**
  - `notify_on_new_like()` is 004's body plus `'liker_id', NEW.user_id`. The diff shows only that line. Staging's live body matched 004 apart from CRLF line endings.
  - `scrub_account_copies(p_user_id)`, `service_role` only, as spec §4.6 describes. It resets a chat preview only where the member wrote the newest message.
  - It parses with libpg-query 17.
- [x] **Step 5: Docs.**
- [x] **Step 6: Gate, then a full review of #113** (code, security, database and test coverage), then `npm run ci:local`, because the PR is a draft.
  - The gate passed, and so did `npm run ci:local`: lint, guards, type-check, unit tests with coverage, and web E2E.
  - No reviewer found a CRITICAL issue. The security reviewer found nothing to fix: clients can't insert notifications, so no one can forge a row that the scrub would delete for someone else.
  - Fixed in `fix: address the full #113 review`:
    - 052's preview reset finds each chat's newest message once, instead of in three subqueries, and breaks timestamp ties on `id`.
    - `index.ts` checks `SUPABASE_URL` and the service key, and creates the client inside the `try`.
    - The deletion check backdates by 5 minutes, not a day. That's inside the purge's margin, so a real hourly purge on staging can't take its account mid-test.
    - New node test: a failed due-list lookup fails the run.
    - The purge check covers GET → 405; a soft-deleted comment not counted down twice; the purged member's own post taking its comments with it; a chat the other member spoke last in staying untouched; and a chat with only the purged member's messages emptying its preview.
  - Kept, with the reason in 052's header: the notification DELETE scans the table (see Risks).
- [ ] **Step 7: Staging (needs the user).** Items 1–3 are done; item 4 waits on the secrets.
  1. Apply 052 (`scrub_account_copies`) and realign the tracker row to `052`.
  2. Redeploy `purge-deleted-accounts`. It calls `scrub_account_copies`, so it must go after 052.
  3. `npm run test:security:functions` must pass.
  4. With the secrets set, `npm run test:security:account-purge` must pass too. The next migration number is 053.

**Progress 2026-09-30 (052):** at the user's request, 052 was applied to staging and its tracker row realigned. The tracker now ends `050`, `051`, `052`.

- `notify_on_new_like` stores `liker_id`.
- `scrub_account_copies` is executable by `service_role` only.
- A call with an id that matches nothing, in a rolled-back transaction, ran cleanly. That shows the column references resolve.
- Then `purge-deleted-accounts` was redeployed.
- `npm run test:security:functions` and `npm run test:security:account-deletion` pass, and the security advisors show nothing new.
- The function still answers 500 to a POST without the secret (the function secret isn't set yet) and 405 to a GET.
- `test:security:account-purge` waits on the secrets (Task 2.7 Step 2).
- `reauth_required` through the real RPC stays untested live: a real session can't be made stale on demand. `amr_signed_in_within` is tested directly, and the RPC calls it with `auth.jwt() -> 'amr'`.

---

## PR 3 — Shared code and web

Branch `feat/account-deletion-web`, from master after #111–#113 merged. 048 to 052 are applied on staging.

**Found at the start of PR 3 (2026-09-30):**

- **supabase-js already signs out locally when the server call fails.** `auth-js` 2.116 (`GoTrueClient._signOut`) removes the stored session and fires `SIGNED_OUT` even when revoking it on the server fails, then returns the error. So neither app needs a "fall back to local sign-out" step; the #111 review assumed it did. Web's `handleSignOut` still says "Couldn't log you out" in that case although this browser is signed out, which Task 3.12 fixes. Mobile needs nothing, and PR 4 drops its item.
- **`formatPublicName` mangles the placeholder.** `formatPublicName('Unavailable account')` is `'Unavailable A.'`, and every chat reader on both platforms formats the partner's name. Task 3.4 makes it return `UNAVAILABLE_ACCOUNT_NAME` unchanged, so no reader has to change to show it.
- **`api/conversations.ts` has no test file.** Task 3.4 creates one.
- **The thread opens a purged partner's chat without changes.** `useMessageThread` finds its partner in `getConversations`' list, so keeping the conversation there is enough.
- **The column can be optional on `User`.** Only `get_my_profile()` returns it; other `User` reads select fewer columns. `deletion_scheduled_for?: string | null` breaks no fixture, including the web `e2e/` fixtures and `PublicProfileHeader.test.tsx`.
- **`AuthContext` already carries the column.** It stores `getMyProfile()`'s row as `user`. Push registration is keyed on `supabaseUser.id`, before the profile loads (Task 3.12).
- **Login's Google button goes through `hooks/useGoogleSignIn.ts`.** `/auth/callback` subscribes once with the router from its first render, and the page is statically optimised, so it reads `?redirect=` from `window.location` (Task 3.11).
- **The redirect allow-list already covers the new URLs.** `supabase-setup.md`, "Configure Site URL and Redirect URLs", lists `http://localhost:3000/**`, `https://nepally.us/**` and preview URLs. They match `/auth/callback?redirect=…` and `/delete-account?step=confirm`. Task 3.21 checks that staging's dashboard matches.
- **`AuthCard` and Mantine cover the new screens,** so the delete page and the restore screen need no CSS module. Their buttons follow the busy-controls rule in `web-ui-system.md`: `aria-disabled`, `data-disabled`, `aria-busy` and a `Loader`. Never Mantine's `loading` or native `disabled` on a control the member just used.
- **`logClientEvent` takes any event name,** so new events need no type change.
- **Sign-out errors must be toasts.** While `signOut` runs, `Layout` shows its loader in place of the page. So the screen that asked to sign out is unmounted, and any error it sets in its own state is lost. `Layout` and the profile page already report sign-out errors with `notify.error`. The restore screen and the delete flow do the same (Tasks 3.13 and 3.15). After a failed sign-out, the delete flow also reloads the profile, so the restore screen, with its own sign-out, takes the flow's place.
- **The flow survives a password re-auth.** `AuthContext`'s `onAuthStateChange` updates `supabaseUser` and the profile without setting `loading`, so `Layout` keeps the flow mounted through `signInWithPassword`.

**How this PR runs:** five chunks. Each ends with its gate and one `code-reviewer`; chunks 2 and 3 get a `security-reviewer` too. Commit after every task. Run web Vitest from `C:\…`, uppercase, or whole files fail. Use `npx prettier --write <file>` on each changed file, never `npm run format`.

| Chunk | Tasks     | Theme                                                                                                                    |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1     | 3.1–3.3   | Shared account deletion: constants, the `User` field, logic, API                                                         |
| 2     | 3.4–3.8   | Shared chat, redirect and moderation data; the web chat fallback; mobile's null guards                                   |
| 3     | 3.9–3.12  | Web auth plumbing: Google options, the login return path, the callback, `AuthContext`                                    |
| 4     | 3.13–3.18 | Web feature: the restore screen and gate, the delete flow and page, the Settings entry, moderation "no longer available" |
| 5     | 3.19–3.21 | Legal copy, docs, ship                                                                                                   |

### Chunk 1: shared account deletion

### Task 3.1: Constants and the `User` field

**Files:**

- Create: `packages/shared/src/constants/accountDeletion.ts`, `packages/shared/src/constants/accountDeletion.test.ts`
- Modify: `packages/shared/src/index.ts`, `packages/shared/src/types/user.ts`

- [x] **Step 1: Write the failing test.** It imports from the package entry, so it also proves the export.

```ts
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  DELETION_IN_PROGRESS,
  PROFILE_NOT_FOUND,
  REAUTH_MAX_AGE_SECONDS,
  REAUTH_REQUIRED,
  UNAVAILABLE_ACCOUNT_NAME,
} from '../index';

describe('account deletion constants', () => {
  it('match the database: the 050 grace period and the 048 recency window', () => {
    expect(ACCOUNT_DELETION_GRACE_DAYS).toBe(29);
    expect(REAUTH_MAX_AGE_SECONDS).toBe(600);
  });

  it('name the errors the RPCs raise', () => {
    expect([REAUTH_REQUIRED, DELETION_IN_PROGRESS, PROFILE_NOT_FOUND]).toEqual([
      'reauth_required',
      'deletion_in_progress',
      'profile_not_found',
    ]);
  });

  it('has the placeholder the apps show for a missing chat partner', () => {
    expect(UNAVAILABLE_ACCOUNT_NAME).toBe('Unavailable account');
  });
});
```

- [x] **Step 2: Run it and watch it fail.**

Run: `npm run test --workspace=packages/shared -- src/constants/accountDeletion.test.ts`
Expected: FAIL, because the constants aren't exported.

- [x] **Step 3: Write the constants** in `packages/shared/src/constants/accountDeletion.ts`.

```ts
/**
 * Account deletion (spec: docs/specs/2026-09-28-account-deletion.md). The
 * numbers and error names mirror the database; keep them in step with
 * request_account_deletion() and cancel_account_deletion() in
 * supabase/migrations/050_account_deletion_timing.sql.
 */

/** Days between a deletion request and the purge (050: c_grace_period). */
export const ACCOUNT_DELETION_GRACE_DAYS = 29;

/** How recent a sign-in request_account_deletion accepts, in seconds (c_reauth_max_age_seconds). */
export const REAUTH_MAX_AGE_SECONDS = 600;

/** Raised by request_account_deletion() without a recent sign-in (P0001). Also the ApiError code. */
export const REAUTH_REQUIRED = 'reauth_required';

/** Raised by cancel_account_deletion() once the date has passed (P0001). Also the ApiError code. */
export const DELETION_IN_PROGRESS = 'deletion_in_progress';

/** Raised by request_account_deletion() when the caller has no profile row (P0002). Also the ApiError code. */
export const PROFILE_NOT_FOUND = 'profile_not_found';

/** Shown in place of a chat partner who is pending deletion or purged. */
export const UNAVAILABLE_ACCOUNT_NAME = 'Unavailable account';
```

- [x] **Step 4: Export them.** In `packages/shared/src/index.ts`, after `export * from './constants/search';`, add:

```ts
export * from './constants/accountDeletion';
```

- [x] **Step 5: Add the field.** In `packages/shared/src/types/user.ts`, after `last_active_at: string;` in `User`:

```ts

  // Account deletion (migration 048): the purge time while deletion is
  // pending, null otherwise. Only get_my_profile() returns it.
  deletion_scheduled_for?: string | null;
```

In the same file, add `| 'deletion_scheduled_for'` to the end of `PublicUser`'s `Omit` list, after `| 'google_verified'`.

- [x] **Step 6: Run the test and type-check.**

Run: `npm run test --workspace=packages/shared -- src/constants/accountDeletion.test.ts`
Expected: PASS, 3 tests.
Run: `npm run type-check --workspace=packages/shared`
Expected: exit 0.

- [x] **Step 7: Commit.**

```bash
git add packages/shared/src/constants/accountDeletion.ts packages/shared/src/constants/accountDeletion.test.ts packages/shared/src/index.ts packages/shared/src/types/user.ts
git commit -m "feat(shared): account deletion constants and the User field"
```

### Task 3.2: Account deletion logic

**Files:**

- Create: `packages/shared/src/logic/accountDeletion.ts`, `packages/shared/src/logic/accountDeletion.test.ts`
- Modify: `packages/shared/src/logic/index.ts`

- [x] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from 'vitest';
import {
  formatDeletionDate,
  getLastSignInAt,
  getReauthMethod,
  getScheduledDeletionDate,
  isDeletionDatePassed,
  isRecentSignIn,
} from './accountDeletion';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A JWT-shaped token with this payload. The signature is never checked client-side. */
function tokenWith(payload: object): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.signature`;
}

const NOW_MS = Date.UTC(2026, 9, 1, 12, 0, 0); // 2026-10-01T12:00:00Z
const NOW_S = NOW_MS / 1000;

describe('getLastSignInAt', () => {
  it('returns the newest numeric amr timestamp', () => {
    const token = tokenWith({
      amr: [
        { method: 'password', timestamp: NOW_S - 3600 },
        { method: 'oauth', timestamp: NOW_S - 60 },
      ],
    });
    expect(getLastSignInAt(token)).toBe(NOW_S - 60);
  });

  it('ignores entries without a numeric timestamp', () => {
    expect(
      getLastSignInAt(
        tokenWith({ amr: [{ method: 'otp', timestamp: '123' }, { method: 'password' }] })
      )
    ).toBeNull();
  });

  it('returns null for a missing or malformed claim', () => {
    expect(getLastSignInAt(tokenWith({}))).toBeNull();
    expect(getLastSignInAt(tokenWith({ amr: 'password' }))).toBeNull();
  });

  it('never throws on a token it cannot read', () => {
    expect(getLastSignInAt('not-a-jwt')).toBeNull();
    expect(getLastSignInAt('a.%%%.c')).toBeNull();
    expect(getLastSignInAt('')).toBeNull();
  });
});

describe('isRecentSignIn', () => {
  it('accepts a sign-in inside the ten-minute window, including its edge', () => {
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 60 }] }), NOW_MS)
    ).toBe(true);
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 600 }] }), NOW_MS)
    ).toBe(true);
  });

  it('rejects an older sign-in, or none', () => {
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 601 }] }), NOW_MS)
    ).toBe(false);
    expect(isRecentSignIn('not-a-jwt', NOW_MS)).toBe(false);
  });
});

describe('getReauthMethod', () => {
  it('uses the password when the account has an email identity', () => {
    expect(getReauthMethod({ app_metadata: { providers: ['google', 'email'] } })).toBe('password');
  });

  it('uses Google otherwise', () => {
    expect(getReauthMethod({ app_metadata: { providers: ['google'] } })).toBe('google');
    expect(getReauthMethod({})).toBe('google');
  });
});

describe('deletion dates', () => {
  it('formats a date for people', () => {
    expect(formatDeletionDate('2026-10-30T12:00:00.000Z')).toBe('October 30, 2026');
  });

  it('schedules 29 days out', () => {
    expect(getScheduledDeletionDate(NOW_MS)).toBe('2026-10-30T12:00:00.000Z');
  });

  it('knows when the date has passed', () => {
    expect(isDeletionDatePassed('2026-10-01T11:59:59.000Z', NOW_MS)).toBe(true);
    expect(isDeletionDatePassed('2026-10-01T12:00:00.000Z', NOW_MS)).toBe(true);
    expect(isDeletionDatePassed('2026-10-01T12:00:01.000Z', NOW_MS)).toBe(false);
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run: `npm run test --workspace=packages/shared -- src/logic/accountDeletion.test.ts`
Expected: FAIL, because `./accountDeletion` doesn't exist.

- [x] **Step 3: Write the logic** in `packages/shared/src/logic/accountDeletion.ts`.

```ts
/**
 * Account deletion helpers (spec: docs/specs/2026-09-28-account-deletion.md
 * §5.1). The database has the final say on recency
 * (request_account_deletion); these only decide what the apps show.
 */
import { ACCOUNT_DELETION_GRACE_DAYS, REAUTH_MAX_AGE_SECONDS } from '../constants/accountDeletion';

export type ReauthMethod = 'password' | 'google';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A JWT's payload, or null when the token can't be read. Never throws. */
function readJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));
    return typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The newest `amr` timestamp (seconds) in a Supabase access token, or null if there is none. */
export function getLastSignInAt(accessToken: string): number | null {
  const amr = readJwtPayload(accessToken)?.amr;
  if (!Array.isArray(amr)) return null;
  const timestamps = amr
    .map((entry: unknown) =>
      typeof entry === 'object' && entry !== null
        ? (entry as { timestamp?: unknown }).timestamp
        : undefined
    )
    .filter((timestamp): timestamp is number => typeof timestamp === 'number');
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

/** True when the last sign-in is within REAUTH_MAX_AGE_SECONDS of `nowMs`. */
export function isRecentSignIn(accessToken: string, nowMs: number = Date.now()): boolean {
  const signedInAt = getLastSignInAt(accessToken);
  return signedInAt !== null && nowMs / 1000 - signedInAt <= REAUTH_MAX_AGE_SECONDS;
}

/** 'password' when the account has an email identity, otherwise 'google'. */
export function getReauthMethod(user: { app_metadata?: { providers?: unknown } }): ReauthMethod {
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes('email') ? 'password' : 'google';
}

/** "October 30, 2026" for an ISO timestamp. */
export function formatDeletionDate(iso: string, locale: string = 'en-US'): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** The purge date a request made at `nowMs` would get. */
export function getScheduledDeletionDate(nowMs: number = Date.now()): string {
  return new Date(nowMs + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS).toISOString();
}

/** True once the date has passed, when restoring is closed (050). */
export function isDeletionDatePassed(iso: string, nowMs: number = Date.now()): boolean {
  return new Date(iso).getTime() <= nowMs;
}
```

- [x] **Step 4: Export it.** Add `export * from './accountDeletion';` to the end of `packages/shared/src/logic/index.ts`.

- [x] **Step 5: Run the tests.**

Run: `npm run test --workspace=packages/shared -- src/logic/accountDeletion.test.ts`
Expected: PASS, 11 tests.

- [x] **Step 6: Commit.**

```bash
git add packages/shared/src/logic/accountDeletion.ts packages/shared/src/logic/accountDeletion.test.ts packages/shared/src/logic/index.ts
git commit -m "feat(shared): account deletion logic: recent sign-in, re-auth method, dates"
```

### Task 3.3: The account deletion API

**Files:**

- Create: `packages/shared/src/api/accountDeletion.ts`, `packages/shared/src/api/accountDeletion.test.ts`
- Modify: `packages/shared/src/api/index.ts`

- [x] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/apiError';
import {
  cancelAccountDeletion,
  getAccountDeletionErrorCode,
  requestAccountDeletion,
} from './accountDeletion';

function clientReturning(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}

/** The shape PostgREST gives a RAISE EXCEPTION. */
function raised(message: string, code = 'P0001') {
  return { message, code, details: null, hint: null };
}

describe('requestAccountDeletion', () => {
  it('calls the RPC and resolves with the purge date', async () => {
    const { supabase, rpc } = clientReturning({ data: '2026-10-30T12:00:00+00:00', error: null });

    const result = await requestAccountDeletion(supabase);

    expect(rpc).toHaveBeenCalledWith('request_account_deletion');
    expect(result).toEqual({ data: '2026-10-30T12:00:00+00:00' });
  });

  it('turns reauth_required into a coded error with a sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('reauth_required') });

    const result = await requestAccountDeletion(supabase);

    expect(result.error).toBeInstanceOf(ApiError);
    expect(result.error?.message).toBe("Please confirm it's you again.");
    expect(getAccountDeletionErrorCode(result.error)).toBe('reauth_required');
  });

  it('turns profile_not_found into a coded error', async () => {
    const { supabase } = clientReturning({
      data: null,
      error: raised('profile_not_found', 'P0002'),
    });

    const result = await requestAccountDeletion(supabase);

    expect(getAccountDeletionErrorCode(result.error)).toBe('profile_not_found');
  });

  it('gives any other failure the fallback sentence and no code', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('boom', 'XX000') });

    const result = await requestAccountDeletion(supabase);

    expect(result.error?.message).toBe("Couldn't delete your account. Please try again.");
    expect(getAccountDeletionErrorCode(result.error)).toBeNull();
  });

  it('fails when no date comes back', async () => {
    const { supabase } = clientReturning({ data: null, error: null });

    const result = await requestAccountDeletion(supabase);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

describe('cancelAccountDeletion', () => {
  it('calls the RPC', async () => {
    const { supabase, rpc } = clientReturning({ data: null, error: null });

    expect(await cancelAccountDeletion(supabase)).toEqual({});
    expect(rpc).toHaveBeenCalledWith('cancel_account_deletion');
  });

  it('turns deletion_in_progress into a coded error with a sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('deletion_in_progress') });

    const result = await cancelAccountDeletion(supabase);

    expect(result.error?.message).toBe('Your account is already being deleted.');
    expect(getAccountDeletionErrorCode(result.error)).toBe('deletion_in_progress');
  });

  it('gives any other failure the fallback sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('boom', 'XX000') });

    const result = await cancelAccountDeletion(supabase);

    expect(result.error?.message).toBe("Couldn't restore your account. Please try again.");
  });
});

describe('getAccountDeletionErrorCode', () => {
  it('reads codes only from the errors these functions return', () => {
    expect(getAccountDeletionErrorCode(new Error('reauth_required'))).toBeNull();
    expect(getAccountDeletionErrorCode(undefined)).toBeNull();
    expect(getAccountDeletionErrorCode(new ApiError('x', { code: 'reauth_required' }))).toBe(
      'reauth_required'
    );
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run: `npm run test --workspace=packages/shared -- src/api/accountDeletion.test.ts`
Expected: FAIL, because `./accountDeletion` doesn't exist.

- [x] **Step 3: Write the API** in `packages/shared/src/api/accountDeletion.ts`.

```ts
/**
 * Account deletion RPCs (migrations 048 and 050). Both take the caller from
 * the JWT, so neither takes a user id.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, toApiError } from '../utils/apiError';
import {
  DELETION_IN_PROGRESS,
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
} from '../constants/accountDeletion';

export type AccountDeletionErrorCode =
  typeof REAUTH_REQUIRED | typeof DELETION_IN_PROGRESS | typeof PROFILE_NOT_FOUND;

/** What each error the RPCs raise tells the member. */
const SENTENCES: Record<AccountDeletionErrorCode, string> = {
  [REAUTH_REQUIRED]: "Please confirm it's you again.",
  [DELETION_IN_PROGRESS]: 'Your account is already being deleted.',
  [PROFILE_NOT_FOUND]: "We couldn't find your profile.",
};

function isAccountDeletionErrorCode(value: unknown): value is AccountDeletionErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SENTENCES, value);
}

/** The RPCs raise their error as the message; it becomes an ApiError carrying it as the code. */
function toAccountDeletionError(raw: unknown, fallback: string): Error {
  const message =
    typeof raw === 'object' && raw !== null ? (raw as { message?: unknown }).message : undefined;
  if (isAccountDeletionErrorCode(message)) {
    return new ApiError(SENTENCES[message], { code: message });
  }
  return toApiError(raw, fallback);
}

/** The account deletion error an error from these functions carries, or null. */
export function getAccountDeletionErrorCode(error: unknown): AccountDeletionErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  return isAccountDeletionErrorCode(error.code) ? error.code : null;
}

export interface AccountDeletionResult {
  /** The ISO purge date. */
  data?: string;
  error?: Error;
}

/**
 * Schedules the caller's account for deletion. It needs a sign-in within
 * REAUTH_MAX_AGE_SECONDS; repeating it returns the same date.
 */
export async function requestAccountDeletion(
  supabase: SupabaseClient
): Promise<AccountDeletionResult> {
  try {
    const { data, error } = await supabase.rpc('request_account_deletion');
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('No deletion date returned');
    return { data };
  } catch (error) {
    return {
      error: toAccountDeletionError(error, "Couldn't delete your account. Please try again."),
    };
  }
}

/** Restores the caller's account. Refused with DELETION_IN_PROGRESS once the date has passed. */
export async function cancelAccountDeletion(supabase: SupabaseClient): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.rpc('cancel_account_deletion');
    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: toAccountDeletionError(error, "Couldn't restore your account. Please try again."),
    };
  }
}
```

- [x] **Step 4: Export it.** Add `export * from './accountDeletion';` to the end of `packages/shared/src/api/index.ts`.

- [x] **Step 5: Run the tests.**

Run: `npm run test --workspace=packages/shared -- src/api/accountDeletion.test.ts`
Expected: PASS, 9 tests.

- [x] **Step 6: Commit.**

```bash
git add packages/shared/src/api/accountDeletion.ts packages/shared/src/api/accountDeletion.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): request and cancel account deletion"
```

- [x] **Chunk 1 gate and review.** Run `npm run test --workspace=packages/shared`, `npm run type-check --workspace=packages/shared` and `npm run lint --workspace=packages/shared`, checking each exit code. Then a `code-reviewer` on the chunk's three commits. Fix CRITICAL and HIGH findings in one `fix: address chunk 1 review` commit; everything else goes to Follow-ups.

### Chunk 2: shared chat, redirect and moderation data

### Task 3.4: `getConversations` marks unavailable partners

**Files:**

- Modify: `packages/shared/src/types/chat.ts`, `packages/shared/src/utils/user.ts`, `packages/shared/src/utils/user.test.ts`, `packages/shared/src/api/conversations.ts`
- Create: `packages/shared/src/api/conversations.test.ts`

After this task, `other_user_id` is nullable, and web and mobile won't type-check until Tasks 3.5 and 3.6. Run only the shared tests until then.

- [x] **Step 1: Write the failing tests.** Add to `packages/shared/src/utils/user.test.ts`. Import `UNAVAILABLE_ACCOUNT_NAME` from `'../constants/accountDeletion'` if the file doesn't already, and put the test inside the existing `describe('formatPublicName', …)`:

```ts
it('leaves the unavailable-account placeholder whole', () => {
  expect(formatPublicName(UNAVAILABLE_ACCOUNT_NAME)).toBe('Unavailable account');
});
```

Then create `packages/shared/src/api/conversations.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UNAVAILABLE_ACCOUNT_NAME } from '../constants/accountDeletion';
import { getConversations } from './conversations';

type Result = { data: unknown; error: unknown };

/** A query builder whose methods all chain, and which resolves to `result` when awaited. */
function query(result: Result) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  for (const method of ['select', 'eq', 'in', 'neq', 'order', 'or']) {
    builder[method] = vi.fn(() => builder);
  }
  return builder;
}

/** Answers from() in call order: my rows, conversations, partner rows, blocks, then partner profiles. */
function client(...results: Result[]): SupabaseClient {
  const queue = results.map(query);
  return { from: vi.fn(() => queue.shift()) } as unknown as SupabaseClient;
}

const ok = (data: unknown): Result => ({ data, error: null });
const MINE = ok([{ conversation_id: 'c1', unread_count: 2 }]);
const CONVERSATION = ok([
  {
    id: 'c1',
    last_message: 'Hi',
    last_message_time: '2026-09-30T10:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  },
]);
const PARTNER_ROW = ok([{ conversation_id: 'c1', user_id: 'u2', name: 'Bikal Shrestha' }]);
const NO_BLOCKS = ok([]);

describe('getConversations', () => {
  it('returns an available partner with their name, photo and trust level', async () => {
    const supabase = client(
      MINE,
      CONVERSATION,
      PARTNER_ROW,
      NO_BLOCKS,
      ok([{ id: 'u2', profile_photo: 'p.jpg', trust_level: 1 }])
    );

    const { data, error } = await getConversations(supabase, 'u1');

    expect(error).toBeUndefined();
    expect(data).toEqual([
      {
        id: 'c1',
        last_message: 'Hi',
        last_message_time: '2026-09-30T10:00:00Z',
        created_at: '2026-09-01T00:00:00Z',
        other_user_id: 'u2',
        other_user_name: 'Bikal Shrestha',
        other_user_photo: 'p.jpg',
        other_user_trust_level: 1,
        other_user_available: true,
        unread_count: 2,
      },
    ]);
  });

  it('marks a partner pending deletion unavailable: the profile is hidden, the participant row stays', async () => {
    const supabase = client(MINE, CONVERSATION, PARTNER_ROW, NO_BLOCKS, ok([]));

    const { data } = await getConversations(supabase, 'u1');

    expect(data?.[0]).toMatchObject({
      other_user_id: 'u2',
      other_user_name: UNAVAILABLE_ACCOUNT_NAME,
      other_user_photo: null,
      other_user_available: false,
    });
  });

  it('keeps a conversation whose partner was purged, with no partner id', async () => {
    const supabase = client(MINE, CONVERSATION, ok([]), NO_BLOCKS);

    const { data } = await getConversations(supabase, 'u1');

    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      other_user_id: null,
      other_user_name: UNAVAILABLE_ACCOUNT_NAME,
      other_user_available: false,
    });
  });

  it("fails when the partners' profiles can't be read, rather than calling everyone unavailable", async () => {
    const supabase = client(MINE, CONVERSATION, PARTNER_ROW, NO_BLOCKS, {
      data: null,
      error: { message: 'boom', code: 'XX000' },
    });

    const { data, error } = await getConversations(supabase, 'u1');

    expect(data).toBeUndefined();
    expect(error?.message).toBe('Failed to fetch conversations');
  });

  it('still leaves out a conversation with a blocked partner', async () => {
    const supabase = client(
      MINE,
      CONVERSATION,
      PARTNER_ROW,
      ok([{ blocker_id: 'u1', blocked_id: 'u2' }]),
      ok([{ id: 'u2', profile_photo: null, trust_level: 1 }])
    );

    const { data } = await getConversations(supabase, 'u1');

    expect(data).toEqual([]);
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run: `npm run test --workspace=packages/shared -- src/utils/user.test.ts src/api/conversations.test.ts`
Expected: FAIL. `formatPublicName` gives `'Unavailable A.'`, the results have no `other_user_available`, the purged conversation is dropped, and the lookup error is ignored.

- [x] **Step 3: Let the placeholder through `formatPublicName`.** In `packages/shared/src/utils/user.ts`, import the constant at the top:

```ts
import { UNAVAILABLE_ACCOUNT_NAME } from '../constants/accountDeletion';
```

and add, as the second line of `formatPublicName`'s body, after the blank-name check:

```ts
// A label, not a name: getConversations uses it for a partner who is
// pending deletion or purged, and it must read the same everywhere.
if (fullName === UNAVAILABLE_ACCOUNT_NAME) return fullName;
```

- [x] **Step 4: Change the type.** In `packages/shared/src/types/chat.ts`, in `ConversationWithParticipant`, replace `other_user_id: string;` and `other_user_name: string;` with:

```ts
/** Null when the partner's account was purged: their participant row is gone. */
other_user_id: string | null;
/** UNAVAILABLE_ACCOUNT_NAME when the partner is pending deletion or purged. */
other_user_name: string;
```

and add after `other_user_trust_level?: number;`:

```ts
/** False when the partner is pending deletion (hidden by RLS) or purged. */
other_user_available: boolean;
```

- [x] **Step 5: Change `getConversations`.** In `packages/shared/src/api/conversations.ts`:

- Import the constant:

```ts
import { UNAVAILABLE_ACCOUNT_NAME } from '../constants/accountDeletion';
```

- In the profile lookup, replace `const { data: userProfiles } = await supabase` with `const { data: userProfiles, error: usersError } = await supabase`. Right after that call, add `if (usersError) throw usersError;`.
- Replace the `// Assemble results` loop with:

```ts
// Assemble results. A partner is unavailable when their users row didn't
// come back: hidden by RLS while pending deletion, or gone after the
// purge. A purged partner's participant row is gone too; the
// conversation stays, with no partner id.
const result: ConversationWithParticipant[] = [];
for (const conv of conversations || []) {
  const other = otherMap.get(conv.id);
  if (other && blockedUserIds.has(other.user_id)) continue;

  const userInfo = other ? userInfoMap.get(other.user_id) : undefined;
  result.push({
    id: conv.id,
    last_message: conv.last_message,
    last_message_time: conv.last_message_time,
    created_at: conv.created_at,
    other_user_id: other?.user_id ?? null,
    other_user_name: other && userInfo ? other.name : UNAVAILABLE_ACCOUNT_NAME,
    other_user_photo: userInfo?.profile_photo ?? null,
    other_user_trust_level: userInfo?.trust_level ?? 0,
    other_user_available: userInfo !== undefined,
    unread_count: unreadMap.get(conv.id) || 0,
  });
}
```

- [x] **Step 6: Run the tests.**

Run: `npm run test --workspace=packages/shared -- src/utils/user.test.ts src/api/conversations.test.ts`
Expected: PASS.

- [x] **Step 7: Commit.**

```bash
git add packages/shared/src/types/chat.ts packages/shared/src/utils/user.ts packages/shared/src/utils/user.test.ts packages/shared/src/api/conversations.ts packages/shared/src/api/conversations.test.ts
git commit -m "feat(shared): mark chat partners who are pending deletion or purged unavailable"
```

### Task 3.5: The web chat fallback

**Files:**

- Modify: `apps/web/src/components/messages/ConversationRow.tsx` (+ `.test.tsx`), `apps/web/src/components/messages/ThreadHeader.tsx` (+ `.test.tsx`), `apps/web/src/pages/messages/[id].page.tsx` (+ `[id].test.tsx`)
- Modify, fixtures only: `apps/web/src/components/messages/MessageLog.test.tsx`, `apps/web/src/pages/messages/index.test.tsx`, `apps/web/src/hooks/useConversations.test.ts`, `apps/web/src/hooks/useMessageThread.test.ts`

`MessageLog` and the thread page's `<title>` and composer label already read `formatPublicName(partner.other_user_name)`, which now yields the placeholder. They need no change.

- [x] **Step 1: Give every typed fixture the new field.** Add `other_user_available: true,` to:
  - the `conversation()` builder in `ConversationRow.test.tsx`, `index.test.tsx`, `useConversations.test.ts` and `useMessageThread.test.ts`
  - `PARTNER` in `ThreadHeader.test.tsx`, `MessageLog.test.tsx` and `[id].test.tsx`

- [x] **Step 2: Write the failing tests.** In `ConversationRow.test.tsx` (import `UNAVAILABLE_ACCOUNT_NAME` from `@nepally/shared`):

```tsx
it('shows an unavailable partner by the placeholder, with an avatar but no member menu', () => {
  renderRow({
    other_user_id: null,
    other_user_name: UNAVAILABLE_ACCOUNT_NAME,
    other_user_photo: null,
    other_user_available: false,
  });

  expect(screen.getByText('Unavailable account')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Options for/ })).toBeNull();
});
```

In `ThreadHeader.test.tsx`, following the file's render pattern:

```tsx
it('heads an unavailable partner by the placeholder, with no member menu', () => {
  render(
    <ThreadHeader
      partner={{
        ...PARTNER,
        other_user_name: UNAVAILABLE_ACCOUNT_NAME,
        other_user_available: false,
      }}
    />
  );

  expect(screen.getByRole('heading', { level: 1, name: 'Unavailable account' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Options for/ })).toBeNull();
});
```

In `[id].test.tsx`, which mocks `useMessageThread` through its `thread()` builder:

```tsx
it('hides the composer when the partner was purged, and says why', () => {
  const purged = {
    ...PARTNER,
    other_user_id: null,
    other_user_name: UNAVAILABLE_ACCOUNT_NAME,
    other_user_available: false,
  };
  mocks.useMessageThread.mockReturnValue(thread({ partner: purged, messages: [MESSAGE] }));

  render(<MessageThreadPage />);

  expect(
    screen.getByText("This account has been deleted, so it can't get new messages.")
  ).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
});
```

- [x] **Step 3: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/messages src/pages/messages`
Expected: the three new tests FAIL; the rest pass.

- [x] **Step 4: Render the fallback.** In `ConversationRow.tsx`, import `Avatar from '../Avatar'`, and replace the `<UserMenuTrigger … />` element with:

```tsx
{
  conversation.other_user_available && conversation.other_user_id ? (
    <UserMenuTrigger
      userId={conversation.other_user_id}
      name={name}
      toneKey={conversation.other_user_name}
      photoUrl={conversation.other_user_photo}
      trustLevel={conversation.other_user_trust_level}
    />
  ) : (
    <Avatar
      name={name}
      toneKey={conversation.other_user_name}
      photoUrl={null}
      size="medium"
      decorative
    />
  );
}
```

Do the same in `ThreadHeader.tsx`, with `size="small"` on both branches. In `[id].page.tsx`, replace `<MessageComposer partnerName={name} onSend={thread.send} />` with:

```tsx
{
  partner.other_user_id === null ? (
    <Text className={styles.firstMessage}>
      This account has been deleted, so it can&apos;t get new messages.
    </Text>
  ) : (
    <MessageComposer partnerName={name} onSend={thread.send} />
  );
}
```

- [x] **Step 5: Run the web tests and type-check.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/messages src/pages/messages src/hooks/useConversations.test.ts src/hooks/useMessageThread.test.ts`
Expected: PASS.
Run: `npm run type-check --workspace=apps/web`
Expected: exit 0.

- [x] **Step 6: Commit.**

```bash
git add apps/web/src/components/messages apps/web/src/pages/messages apps/web/src/hooks/useConversations.test.ts apps/web/src/hooks/useMessageThread.test.ts
git commit -m "feat(web): show chat partners who are pending deletion or purged as unavailable"
```

### Task 3.6: Mobile's null guards

**Files:**

- Modify: `apps/mobile/src/types/navigation.ts`, `apps/mobile/src/screens/chat/MessageThreadScreen.tsx` (+ `.test.tsx`)

PR 4 builds mobile's visible fallback. This task only keeps mobile correct now that `other_user_id` can be null. The name already shows as the placeholder, because `ConversationItem` and the thread both format it with `formatPublicName` (Task 3.4).

- [x] **Step 1: Write the failing test** in `MessageThreadScreen.test.tsx`, inside the `describe` that renders the thread, and in the file's style:

```tsx
it('offers no Block for a purged partner', async () => {
  mockUseRoute.mockReturnValue({
    params: {
      conversationId: 'conv-1',
      otherUserId: null,
      otherUserName: 'Unavailable account',
      otherUserTrustLevel: 0,
      otherUserPhotoUrl: null,
    },
  });
  const screen = render(<MessageThreadScreen />);
  await act(async () => {});

  expect(screen.queryByLabelText('Conversation options')).toBeNull();
  expect(screen.getByText('Unavailable account')).toBeTruthy();
});
```

- [x] **Step 2: Run it and watch it fail.**

Run: `npm run test --workspace=apps/mobile -- src/screens/chat/MessageThreadScreen.test.tsx`
Expected: FAIL, because the options button is there.

- [x] **Step 3: Guard.** In `types/navigation.ts`, change `MessageThread`'s `otherUserId: string;` to:

```ts
/** Null when the partner's account was purged. */
otherUserId: string | null;
```

In `MessageThreadScreen.tsx`, change `handleBlock`'s guard to `if (!user?.id || !otherUserId) return;`. Then wrap the `menuButton` `TouchableOpacity`, the one labelled "Conversation options", in `{otherUserId ? ( … ) : null}`.

- [x] **Step 4: Run the test, the chat tests and type-check.**

Run: `npm run test --workspace=apps/mobile -- src/screens/chat`
Expected: PASS.
Run: `npm run type-check --workspace=apps/mobile`
Expected: exit 0.

- [x] **Step 5: Commit.**

```bash
git add apps/mobile/src/types/navigation.ts apps/mobile/src/screens/chat/MessageThreadScreen.tsx apps/mobile/src/screens/chat/MessageThreadScreen.test.tsx
git commit -m "fix(mobile): no Block for a purged chat partner"
```

### Task 3.7: `safeRedirectPath`

**Files:**

- Create: `packages/shared/src/utils/redirect.ts`, `packages/shared/src/utils/redirect.test.ts`
- Modify: `packages/shared/src/utils/index.ts`

- [x] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

const ORIGIN = 'https://nepally.us';

describe('safeRedirectPath', () => {
  it('accepts a same-origin path, with its query and hash', () => {
    expect(safeRedirectPath('/delete-account', ORIGIN)).toBe('/delete-account');
    expect(safeRedirectPath('/feed?tags=jobs#top', ORIGIN)).toBe('/feed?tags=jobs#top');
  });

  it('refuses anything that could leave the site', () => {
    for (const value of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      ' /feed',
      'javascript:alert(1)',
      'feed',
      // Dot segments that the parser collapses into `//evil.com`
      '/.//evil.com',
      '/..//evil.com',
      '/a/..//evil.com',
    ]) {
      expect(safeRedirectPath(value, ORIGIN)).toBeNull();
    }
  });

  it('keeps an encoded backslash as text, on this site', () => {
    expect(safeRedirectPath('/%5Cevil.com', ORIGIN)).toBe('/%5Cevil.com');
  });

  it('refuses empty and non-string values', () => {
    expect(safeRedirectPath('', ORIGIN)).toBeNull();
    expect(safeRedirectPath(undefined, ORIGIN)).toBeNull();
    expect(safeRedirectPath(['/feed'], ORIGIN)).toBeNull();
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run: `npm run test --workspace=packages/shared -- src/utils/redirect.test.ts`
Expected: FAIL, because `./redirect` doesn't exist.

- [x] **Step 3: Write the helper** in `packages/shared/src/utils/redirect.ts`.

```ts
/** True for a space, a control character or a backslash, which browsers may read as a slash. */
function hasUnsafeCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || char === '\\') return true;
  }
  return false;
}

/**
 * A same-origin path to return to after signing in (e.g. ?redirect=/delete-account),
 * or null when `value` isn't one. It refuses spaces, control characters and
 * backslashes, then parses the value against `origin` and accepts it only when
 * it starts with a single slash and the origin is unchanged. So `//evil.com`,
 * `/\evil.com`, `/<tab>/evil.com` and `https://evil.com` all fail. Pass the
 * value already decoded, as Next's router.query or URLSearchParams gives it.
 */
export function safeRedirectPath(value: unknown, origin: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (hasUnsafeCharacter(value)) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin) return null;
    // Dot segments collapse during parsing: `/.//evil.com` becomes `//evil.com`,
    // which a browser reads as another site. Check the normalised path too.
    if (url.pathname.startsWith('//')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
```

- [x] **Step 4: Export it.** Add `export * from './redirect';` to the end of `packages/shared/src/utils/index.ts`.

- [x] **Step 5: Run the tests.**

Run: `npm run test --workspace=packages/shared -- src/utils/redirect.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 6: Commit.**

```bash
git add packages/shared/src/utils/redirect.ts packages/shared/src/utils/redirect.test.ts packages/shared/src/utils/index.ts
git commit -m "feat(shared): safeRedirectPath for returning after sign-in"
```

### Task 3.8: Which reported members and listings still exist

**Files:**

- Modify: `packages/shared/src/api/moderation.ts`, `packages/shared/src/api/moderation.test.ts`

A moderator sees pending accounts and their active listings (048). So only purged members come back missing, and listings that are purged or no longer active.

- [x] **Step 1: Write the failing tests** at the end of `moderation.test.ts`, adding `getExistingListingIds` and `getExistingUserIds` to its import from `./moderation`:

```ts
describe.each([
  ['getExistingUserIds', getExistingUserIds, 'users'],
  ['getExistingListingIds', getExistingListingIds, 'marketplace_listings'],
] as const)('%s', (_name, fetchIds, table) => {
  it('returns an empty list without querying when no ids are given', async () => {
    const from = vi.fn();

    const result = await fetchIds({ from } as unknown as SupabaseClient, []);

    expect(result.data).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('returns the ids that still exist, from one query', async () => {
    const query = { select: vi.fn(), in: vi.fn() };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({ data: [{ id: 'a' }], error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await fetchIds(supabase, ['a', 'b']);

    expect(supabase.from).toHaveBeenCalledWith(table);
    expect(query.select).toHaveBeenCalledWith('id');
    expect(query.in).toHaveBeenCalledWith('id', ['a', 'b']);
    expect(result.data).toEqual(['a']);
  });

  it('returns the error when the query fails', async () => {
    const query = { select: vi.fn(), in: vi.fn() };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await fetchIds(supabase, ['a']);

    expect(result.error?.message).toBe('boom');
    expect(result.data).toBeUndefined();
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run: `npm run test --workspace=packages/shared -- src/api/moderation.test.ts`
Expected: FAIL, because the functions aren't exported.

- [x] **Step 3: Write them** in `moderation.ts`, after `getPostsByIds`:

```ts
/** The ids in `ids` that still have a row in `table`, in one query. */
async function getExistingIds(
  supabase: SupabaseClient,
  table: 'users' | 'marketplace_listings',
  ids: string[],
  fallback: string
): Promise<{ data?: string[]; error?: Error }> {
  if (ids.length === 0) {
    return { data: [] };
  }

  try {
    const { data, error } = await supabase.from(table).select('id').in('id', ids);

    if (error) throw error;

    return { data: (data || []).map((row: { id: string }) => row.id) };
  } catch (error) {
    return { error: toApiError(error, fallback) };
  }
}

/** Which reported members still exist. A purged account comes back missing. */
export function getExistingUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ data?: string[]; error?: Error }> {
  return getExistingIds(supabase, 'users', userIds, 'Failed to check reported members');
}

/** Which reported listings the moderator can still see: purged and no-longer-active ones come back missing. */
export function getExistingListingIds(
  supabase: SupabaseClient,
  listingIds: string[]
): Promise<{ data?: string[]; error?: Error }> {
  return getExistingIds(
    supabase,
    'marketplace_listings',
    listingIds,
    'Failed to check reported listings'
  );
}
```

- [x] **Step 4: Run the tests.**

Run: `npm run test --workspace=packages/shared -- src/api/moderation.test.ts`
Expected: PASS.

- [x] **Step 5: Commit.**

```bash
git add packages/shared/src/api/moderation.ts packages/shared/src/api/moderation.test.ts
git commit -m "feat(shared): check which reported members and listings still exist"
```

- [x] **Chunk 2 gate and review.** Run each and check its exit code:
  - `npm run test --workspace=packages/shared`
  - from `C:\…`, `npm run test --workspace=apps/web`
  - `npm run test --workspace=apps/mobile`
  - `npm run type-check`
  - `npm run lint`

  Then a `code-reviewer` and a `security-reviewer` on the chunk's commits. The redirect helper is the security-sensitive part. Fix CRITICAL and HIGH in one `fix: address chunk 2 review` commit.

### Chunk 3: web auth plumbing

### Task 3.9: Google sign-in takes a return address and the account chooser

**Files:**

- Modify: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth.test.ts`

- [x] **Step 1: Write the failing test** in `auth.test.ts`, inside `describe('signInWithGoogle', …)`:

```ts
it('passes a return address and asks for the account chooser when told to', async () => {
  authMocks.signInWithOAuthMock.mockResolvedValue({
    data: { url: 'https://accounts.google.com/o/oauth2/...' },
    error: null,
  });

  await signInWithGoogle({
    redirectTo: 'http://localhost:3000/delete-account?step=confirm',
    selectAccount: true,
  });

  expect(authMocks.signInWithOAuthMock).toHaveBeenCalledWith({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/delete-account?step=confirm',
      queryParams: { prompt: 'select_account' },
    },
  });
});
```

- [x] **Step 2: Run it and watch it fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/lib/auth.test.ts`
Expected: FAIL, because `signInWithGoogle` takes no options.

- [x] **Step 3: Add the options.** In `lib/auth.ts`, replace `signInWithGoogle`'s signature and its `signInWithOAuth` call:

```ts
export interface GoogleSignInOptions {
  /** Where Google hands the member back; /auth/callback by default. */
  redirectTo?: string;
  /** Always show Google's account chooser, so a re-auth can't complete silently. */
  selectAccount?: boolean;
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}): Promise<GoogleAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: options.redirectTo ?? `${window.location.origin}/auth/callback`,
        ...(options.selectAccount ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    });
```

The rest of the function is unchanged.

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/lib/auth.test.ts`
Expected: PASS. The existing no-options test still sees exactly `{ redirectTo: '…/auth/callback' }`.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/lib/auth.test.ts
git commit -m "feat(web): Google sign-in takes a return address and the account chooser"
```

### Task 3.10: Login returns to a safe `?redirect=`

**Files:**

- Modify: `apps/web/src/hooks/useGoogleSignIn.ts` (+ `.test.ts`), `apps/web/src/pages/login.page.tsx`, `apps/web/src/pages/login.test.tsx`

- [x] **Step 1: Write the failing tests.** In `useGoogleSignIn.test.ts`:

```ts
it('carries a return path through the Google callback', async () => {
  mocks.signInWithGoogle.mockResolvedValue({});
  const { result } = renderHook(() => useGoogleSignIn(vi.fn(), '/delete-account'));

  await act(async () => {
    await result.current.start();
  });

  expect(mocks.signInWithGoogle).toHaveBeenCalledWith({
    redirectTo: `${window.location.origin}/auth/callback?redirect=%2Fdelete-account`,
  });
});
```

In `login.test.tsx`, inside `describe('LoginPage', …)`:

```tsx
it('goes to a safe ?redirect= after logging in', async () => {
  loginMocks.useRouterMock.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    query: { redirect: '/delete-account' },
    isReady: true,
  });
  loginMocks.signInWithEmailMock.mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com' },
  });
  render(<LoginPage />);

  await submitWith('test@example.com', 'correctpassword');

  expect(mockPush).toHaveBeenCalledWith('/delete-account');
});

it('ignores an unsafe ?redirect= and goes to the feed', async () => {
  loginMocks.useRouterMock.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    query: { redirect: 'https://evil.com' },
    isReady: true,
  });
  loginMocks.signInWithEmailMock.mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com' },
  });
  render(<LoginPage />);

  await submitWith('test@example.com', 'correctpassword');

  expect(mockPush).toHaveBeenCalledWith('/feed');
});

it('sends a signed-in visitor to a safe ?redirect=', async () => {
  loginMocks.useRouterMock.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    query: { redirect: '/delete-account' },
    isReady: true,
  });
  loginMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' }, refreshUser: mockRefreshUser });
  render(<LoginPage />);
  await act(async () => {});

  expect(mockReplace).toHaveBeenCalledWith('/delete-account');
});

it('passes a safe ?redirect= to Google sign-in', async () => {
  loginMocks.useRouterMock.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    query: { redirect: '/delete-account' },
    isReady: true,
  });
  render(<LoginPage />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
  });

  expect(loginMocks.signInWithGoogleMock).toHaveBeenCalledWith({
    redirectTo: `${window.location.origin}/auth/callback?redirect=%2Fdelete-account`,
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/hooks/useGoogleSignIn.test.ts src/pages/login.test.tsx`
Expected: the five new tests FAIL.

- [x] **Step 3: Carry the return path in the hook.** In `useGoogleSignIn.ts`, add the parameter and use it:

```ts
/**
 * Starts Google sign-in for log in and sign up. `setError('')` first; on
 * failure logs auth_google_failed and sets the mapped sentence. On success
 * `busy` stays true: the browser is already leaving for Google. `returnTo`,
 * already checked with safeRedirectPath, rides through /auth/callback as
 * ?redirect=.
 */
export function useGoogleSignIn(
  setError: (message: string) => void,
  returnTo: string | null = null
): { busy: boolean; start: () => Promise<void> } {
  const [busy, setBusy] = useState(false);

  async function start(): Promise<void> {
    setError('');
    setBusy(true);
    const result = await (returnTo
      ? signInWithGoogle({
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(returnTo)}`,
        })
      : signInWithGoogle());
```

The rest of `start` is unchanged.

- [x] **Step 4: Read `?redirect=` on the login page.** In `login.page.tsx`, add `safeRedirectPath` to the `@nepally/shared` import. After the `info` constant, add:

```ts
// Where to go after logging in: a safe ?redirect= (/delete-account sends
// one), or the feed. The router is never ready on the server, so window
// is only read in the browser.
const returnTo = router.isReady
  ? safeRedirectPath(router.query.redirect, window.location.origin)
  : null;
const destination = returnTo ?? '/feed';
```

Then make these three changes:

- `const google = useGoogleSignIn(setServerError);` becomes `const google = useGoogleSignIn(setServerError, returnTo);`
- Replace the redirect lines with the block below. Until the router is ready, a signed-in visitor sees nothing rather than a flash of the form:

```ts
const redirecting = useRedirectWhen(!!user && router.isReady, destination);
if (redirecting || (user && !router.isReady)) return null;
```

- In `handleSubmit`, `void router.push('/feed');` becomes `void router.push(destination);`

- [x] **Step 5: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/hooks/useGoogleSignIn.test.ts src/pages/login.test.tsx`
Expected: PASS, the old tests included.

- [x] **Step 6: Commit.**

```bash
git add apps/web/src/hooks/useGoogleSignIn.ts apps/web/src/hooks/useGoogleSignIn.test.ts apps/web/src/pages/login.page.tsx apps/web/src/pages/login.test.tsx
git commit -m "feat(web): login returns to a safe ?redirect="
```

### Task 3.11: The Google callback honours `?redirect=`

**Files:**

- Modify: `apps/web/src/pages/auth/callback.page.tsx`, `apps/web/src/pages/auth/callback.test.tsx`

- [x] **Step 1: Write the failing tests** at the end of `describe('AuthCallbackPage', …)`:

```tsx
describe('with ?redirect=', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('goes to a safe ?redirect= instead of the feed', async () => {
    window.history.pushState({}, '', '/auth/callback?redirect=%2Fdelete-account');
    render(<AuthCallbackPage />);

    await fireAuthEvent('SIGNED_IN');

    expect(mockPush).toHaveBeenCalledWith('/delete-account');
  });

  it('still sends a member with no metro to onboarding first', async () => {
    window.history.pushState({}, '', '/auth/callback?redirect=%2Fdelete-account');
    callbackMocks.finishSignInMock.mockResolvedValue({ destination: '/onboarding/zip' });
    render(<AuthCallbackPage />);

    await fireAuthEvent('SIGNED_IN');

    expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
  });

  it('ignores an unsafe ?redirect=', async () => {
    window.history.pushState({}, '', '/auth/callback?redirect=https%3A%2F%2Fevil.com');
    render(<AuthCallbackPage />);

    await fireAuthEvent('SIGNED_IN');

    expect(mockPush).toHaveBeenCalledWith('/feed');
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/auth/callback.test.tsx`
Expected: the first new test FAILS; it gets `/feed`.

- [x] **Step 3: Honour it.** In `callback.page.tsx`, import `safeRedirectPath` along with `logClientEvent` from `@nepally/shared`. Replace `void router.push(result.destination);` with:

```ts
// A safe ?redirect= (e.g. /delete-account) wins over the feed, never
// over onboarding. Read from window.location: this page is statically
// optimised, so the first render's router query is empty.
const returnTo = safeRedirectPath(
  new URLSearchParams(window.location.search).get('redirect'),
  window.location.origin
);
void router.push(result.destination === '/feed' && returnTo ? returnTo : result.destination);
```

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/auth/callback.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/pages/auth/callback.page.tsx apps/web/src/pages/auth/callback.test.tsx
git commit -m "feat(web): the Google callback honours a safe ?redirect="
```

### Task 3.12: `AuthContext`: sign-out destination, the real sign-out state, push after the profile

**Files:**

- Modify: `apps/web/src/contexts/AuthContext.tsx`, `apps/web/src/contexts/AuthContext.test.tsx`, `docs/product/features/sign-up-and-log-in.md`

- [x] **Step 1: Write the failing tests** in `AuthContext.test.tsx`, inside `describe('AuthProvider', …)`:

```tsx
it('treats a failed revoke as signed out when this browser has no session left', async () => {
  const snapshots = await renderSignedIn();
  authMocks.signOutMock.mockResolvedValue({ error: new Error('network down') });
  // supabase-js drops the local session even when revoking it fails.
  authMocks.getSessionMock.mockResolvedValue({ data: { session: null } });

  let result: { error?: string } = { error: 'not called' };
  await act(async () => {
    result = await snapshots[snapshots.length - 1].signOut();
  });

  expect(result).toEqual({});
  expect(authMocks.replaceMock).toHaveBeenCalledWith('/');
  expect(snapshots[snapshots.length - 1].user).toBeNull();
  expect(authMocks.logClientEventMock).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'auth_sign_out_failed' })
  );
});

it('lands on the given page after signing out', async () => {
  const snapshots = await renderSignedIn();

  await act(async () => {
    await snapshots[snapshots.length - 1].signOut({ redirectTo: '/delete-account?scheduled=x' });
  });

  expect(authMocks.replaceMock).toHaveBeenCalledWith('/delete-account?scheduled=x');
});

it('registers web push only once the profile shows no pending deletion', async () => {
  const snapshots: Array<React.ContextType<typeof AuthContext>> = [];
  authMocks.getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-3' } } } });
  authMocks.getUserMock.mockResolvedValue({ data: { user: { id: 'user-3' } } });
  authMocks.getMyProfileMock.mockResolvedValue({
    data: { id: 'user-3', deletion_scheduled_for: '2999-01-01T00:00:00Z' },
  });

  render(
    <AuthProvider>
      <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
    </AuthProvider>
  );
  await waitFor(() => {
    expect(snapshots[snapshots.length - 1].user?.id).toBe('user-3');
  });
  expect(authMocks.requestWebPushPermissionMock).not.toHaveBeenCalled();

  // A restore clears the date, and the next profile read registers push.
  authMocks.getMyProfileMock.mockResolvedValue({
    data: { id: 'user-3', deletion_scheduled_for: null },
  });
  await act(async () => {
    await snapshots[snapshots.length - 1].refreshUser();
  });

  await waitFor(() => {
    expect(authMocks.requestWebPushPermissionMock).toHaveBeenCalledWith(
      expect.any(Object),
      'user-3'
    );
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/contexts/AuthContext.test.tsx`
Expected: the three new tests FAIL.

- [x] **Step 3: Change `AuthContext.tsx`.**

- Add above `interface AuthContextType`:

```ts
interface SignOutOptions {
  /** Where to land once signed out; / by default. */
  redirectTo?: string;
}
```

- In `AuthContextType`, `signOut: () => Promise<{ error?: string }>;` becomes `signOut: (options?: SignOutOptions) => Promise<{ error?: string }>;`. Its doc comment says "replaces the route with `redirectTo`, or /".
- Replace the push registration effect's first lines, and key it on the profile. Push waits for the profile and skips an account pending deletion: its tokens were deleted by the request, and signing out wouldn't remove a new one. A restore clears the date, and the effect runs again.

```ts
  const pushUserId = user && !user.deletion_scheduled_for ? user.id : null;

  // Register browser push once per member in this app session, once their
  // profile shows no pending deletion.
  useEffect(() => {
    const userId = pushUserId;
```

and change the effect's dependency list from `[supabaseUser?.id]` to `[pushUserId]`. The rest of the effect body is unchanged.

- Replace `handleSignOut` with:

```ts
// True while this browser still holds a session. Unsure counts as yes.
async function hasLocalSession(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  } catch {
    return true;
  }
}

// Layout shows its loader while signingOut, which unmounts the page before
// the user clears, so a protected page's `!user → /login` redirect never
// races the replace.
async function handleSignOut(options: SignOutOptions = {}): Promise<{ error?: string }> {
  setSigningOut(true);
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    logClientEvent({ event: 'auth_sign_out_failed', context: { platform: 'web' }, error });
    // supabase-js drops this browser's session even when revoking it on
    // the server fails, so the member may be signed out here already.
    if (await hasLocalSession()) {
      setSigningOut(false);
      return { error: SIGN_OUT_FAILED };
    }
  }
  setUser(null);
  setSupabaseUser(null);
  pushRegistrationAttemptedUserIdRef.current = null;
  try {
    await router.replace(options.redirectTo ?? '/');
  } finally {
    setSigningOut(false);
  }
  return {};
}
```

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/contexts/AuthContext.test.tsx`
Expected: PASS, including "a failed signOut keeps the member", whose `renderSignedIn` leaves a session behind.

- [x] **Step 5: Update the feature doc.** In `docs/product/features/sign-up-and-log-in.md`, replace the last sentence of the "Log out" paragraph with: "If Supabase can't revoke the session but this browser is signed out anyway (supabase-js drops the local session either way), they land on `/` as usual. Only if the browser still holds the session do they stay signed in and see "Couldn't log you out. Please try again." Either failure is logged as `auth_sign_out_failed`."

- [x] **Step 6: Commit.**

```bash
git add apps/web/src/contexts/AuthContext.tsx apps/web/src/contexts/AuthContext.test.tsx docs/product/features/sign-up-and-log-in.md
git commit -m "feat(web): sign-out destination, the real sign-out state, push after the profile"
```

- [x] **Chunk 3 gate and review.** From `C:\…`, run `npm run test --workspace=apps/web`, then `npm run type-check`, `npm run lint`, `npm run docs:check` and `npm run lint:md`, checking each exit code. Then a `code-reviewer` and a `security-reviewer` on the chunk's commits: the redirect handling and sign-out are security-sensitive. Fix CRITICAL and HIGH in one `fix: address chunk 3 review` commit.

### Chunk 4: the web feature

### Task 3.13: `busyButtonProps` for everyone, and the restore screen

**Files:**

- Create: `apps/web/src/components/ui/busyButtonProps.tsx` (+ `.test.tsx`), `apps/web/src/components/account/AccountRestoreScreen.tsx` (+ `.test.tsx`)
- Modify: `apps/web/src/components/ui/index.ts`, `apps/web/src/pages/onboarding/zip.page.tsx`

- [x] **Step 1: Move `busyButtonProps` out of the ZIP page, test first.** Create `components/ui/busyButtonProps.test.tsx`:

```tsx
import React from 'react';
import { describe, expect, it } from 'vitest';
import { busyButtonProps } from './busyButtonProps';

describe('busyButtonProps', () => {
  it('locks the button focusably and shows a Loader on the running one', () => {
    const props = busyButtonProps(true, true, <span>icon</span>);
    expect(props['aria-disabled']).toBe(true);
    expect(props['data-disabled']).toBe(true);
    expect(props['aria-busy']).toBe(true);
    expect(React.isValidElement(props.leftSection)).toBe(true);
  });

  it('leaves an idle button alone, with its icon', () => {
    const icon = <span>icon</span>;
    const props = busyButtonProps(false, false, icon);
    expect(props['aria-disabled']).toBeUndefined();
    expect(props['data-disabled']).toBeUndefined();
    expect(props['aria-busy']).toBeUndefined();
    expect(props.leftSection).toBe(icon);
  });
});
```

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/ui/busyButtonProps.test.tsx`. It should FAIL, because the module doesn't exist. Then create `components/ui/busyButtonProps.tsx` from the ZIP page's function:

```tsx
import React, { type ReactNode } from 'react';
import { Loader } from '@mantine/core';

/**
 * The busy-controls rule (web-ui-system.md): a locked button stays focusable,
 * and the one that's running shows a Loader in place of its icon.
 */
export function busyButtonProps(locked: boolean, running: boolean, icon?: ReactNode) {
  return {
    'aria-disabled': locked || undefined,
    'data-disabled': locked || undefined,
    'aria-busy': running || undefined,
    leftSection: running ? <Loader size={16} color="currentColor" aria-hidden="true" /> : icon,
  };
}
```

Add `export { busyButtonProps } from './busyButtonProps';` to `components/ui/index.ts`. In `onboarding/zip.page.tsx`, delete the local function, import `busyButtonProps` from `'../../components/ui'`, and drop `Loader` from its Mantine import if nothing else there uses it. Run the new test and `src/pages/onboarding`; both PASS.

- [x] **Step 2: Write the restore screen's failing tests** in `components/account/AccountRestoreScreen.test.tsx`:

```tsx
import React from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  refreshUser: vi.fn(),
  signOut: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  logClientEvent: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  cancelAccountDeletion: mocks.cancelAccountDeletion,
  logClientEvent: mocks.logClientEvent,
}));

import { AccountRestoreScreen } from './AccountRestoreScreen';

const AHEAD = '2999-01-01T12:00:00.000Z';
const PASSED = '2000-01-01T12:00:00.000Z';

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

describe('AccountRestoreScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ refreshUser: mocks.refreshUser, signOut: mocks.signOut });
    mocks.refreshUser.mockResolvedValue({ id: 'user-1', deletion_scheduled_for: null });
    mocks.signOut.mockResolvedValue({});
    mocks.cancelAccountDeletion.mockResolvedValue({});
  });

  it('gives the date and offers both choices', () => {
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is scheduled for deletion' })
    ).toBeDefined();
    expect(screen.getByText(/January 1, 2999/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Restore my account' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Keep deletion and sign out' })).toBeDefined();
  });

  it('restores, then reloads the profile so the gate lifts', async () => {
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(mocks.cancelAccountDeletion).toHaveBeenCalledTimes(1);
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
  });

  it('switches to "being deleted" when the database refuses a late restore', async () => {
    mocks.cancelAccountDeletion.mockResolvedValue({
      error: new ApiError('Your account is already being deleted.', {
        code: 'deletion_in_progress',
      }),
    });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is being deleted' })
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Restore my account' })).toBeNull();
    expect(mocks.refreshUser).not.toHaveBeenCalled();
  });

  it('shows any other restore failure and logs it', async () => {
    mocks.cancelAccountDeletion.mockResolvedValue({
      error: new ApiError("Couldn't restore your account. Please try again."),
    });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(screen.getByText("Couldn't restore your account. Please try again.")).toBeDefined();
    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_restore_failed' })
    );
  });

  it('offers only Sign out once the date has passed', () => {
    render(<AccountRestoreScreen scheduledFor={PASSED} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is being deleted' })
    ).toBeDefined();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Sign out']);
  });

  it('signs out, and toasts the sentence when that fails', async () => {
    mocks.signOut.mockResolvedValue({ error: "Couldn't log you out. Please try again." });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Keep deletion and sign out');

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't log you out. Please try again.");
  });
});
```

- [x] **Step 3: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/account/AccountRestoreScreen.test.tsx`
Expected: FAIL, because the module doesn't exist.

- [x] **Step 4: Write the screen** in `components/account/AccountRestoreScreen.tsx`:

```tsx
import React, { useState } from 'react';
import Head from 'next/head';
import { Alert, Button, Stack } from '@mantine/core';
import {
  DELETION_IN_PROGRESS,
  cancelAccountDeletion,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  isDeletionDatePassed,
  logClientEvent,
} from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from '../auth/AuthCard';
import { busyButtonProps, notify } from '../ui';

type Busy = 'restore' | 'sign-out' | null;

export interface AccountRestoreScreenProps {
  /** The member's deletion_scheduled_for. */
  scheduledFor: string;
}

/**
 * What a member pending deletion sees in place of every page (Layout's gate,
 * spec §5.5): restore the account, or keep the deletion and sign out. Once
 * the date has passed, restoring is closed (050) and only Sign out is left.
 */
export function AccountRestoreScreen({ scheduledFor }: AccountRestoreScreenProps) {
  const { refreshUser, signOut } = useAuth();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [refused, setRefused] = useState(false);
  // Read the clock once, not on every render.
  const [passedAtOpen] = useState(() => isDeletionDatePassed(scheduledFor));
  const beingDeleted = refused || passedAtOpen;

  async function handleRestore() {
    if (busy) return;
    setBusy('restore');
    setError('');
    const result = await cancelAccountDeletion(supabase);
    if (result.error) {
      setBusy(null);
      if (getAccountDeletionErrorCode(result.error) === DELETION_IN_PROGRESS) {
        setRefused(true);
        return;
      }
      logClientEvent({
        event: 'account_restore_failed',
        context: { platform: 'web' },
        error: result.error,
      });
      setError(result.error.message);
      return;
    }
    // Layout swaps this screen for the page once the profile has no date.
    await refreshUser();
    setBusy(null);
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy('sign-out');
    setError('');
    // Layout swaps this screen for its loader while signing out, so a failure
    // comes back as a toast, like the menu's Log out.
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setBusy(null);
      notify.error(signOutError);
    }
  }

  return (
    <>
      <Head>
        <title>
          {beingDeleted ? 'Account being deleted - Nepally' : 'Restore your account - Nepally'}
        </title>
      </Head>
      <AuthCard
        title={
          beingDeleted ? 'Your account is being deleted' : 'Your account is scheduled for deletion'
        }
        description={
          beingDeleted
            ? 'Its deletion date has passed, so it can no longer be restored.'
            : `It will be deleted on ${formatDeletionDate(scheduledFor)}. Restore it to keep using Nepally.`
        }
      >
        <Stack gap="sm">
          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}
          {beingDeleted ? null : (
            <Button
              onClick={() => void handleRestore()}
              {...busyButtonProps(busy !== null, busy === 'restore')}
            >
              Restore my account
            </Button>
          )}
          <Button
            variant={beingDeleted ? 'filled' : 'default'}
            onClick={() => void handleSignOut()}
            {...busyButtonProps(busy !== null, busy === 'sign-out')}
          >
            {beingDeleted ? 'Sign out' : 'Keep deletion and sign out'}
          </Button>
        </Stack>
      </AuthCard>
    </>
  );
}
```

- [x] **Step 5: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/account src/components/ui/busyButtonProps.test.tsx src/pages/onboarding`
Expected: PASS.

- [x] **Step 6: Commit.**

```bash
git add apps/web/src/components/ui/busyButtonProps.tsx apps/web/src/components/ui/busyButtonProps.test.tsx apps/web/src/components/ui/index.ts apps/web/src/pages/onboarding/zip.page.tsx apps/web/src/components/account/AccountRestoreScreen.tsx apps/web/src/components/account/AccountRestoreScreen.test.tsx
git commit -m "feat(web): the account restore screen; share busyButtonProps"
```

### Task 3.14: The restore gate

**Files:**

- Modify: `apps/web/src/components/Layout.tsx`, `apps/web/src/components/Layout.test.tsx`, `apps/web/src/components/layout/PublicShell.tsx`

- [x] **Step 1: Write the failing tests** in `Layout.test.tsx`. Mock the screen at the top, beside the other `vi.mock` calls:

```tsx
vi.mock('./account/AccountRestoreScreen', () => ({
  AccountRestoreScreen: ({ scheduledFor }: { scheduledFor: string }) =>
    React.createElement('p', null, `Restore screen for ${scheduledFor}`),
}));
```

Then, inside `describe('Layout', …)`:

```tsx
it('shows a member pending deletion the restore screen instead of the page, with no Log in', () => {
  mocks.useAuth.mockReturnValue({
    user: { ...member, deletion_scheduled_for: '2999-01-01T00:00:00Z' },
    loading: false,
    signOut: mocks.signOut,
  });
  render(<Layout>Page content</Layout>);

  expect(screen.getByText('Restore screen for 2999-01-01T00:00:00Z')).toBeDefined();
  expect(screen.queryByText('Page content')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
});

it('keeps the legal pages readable for a member pending deletion', () => {
  mocks.useRouter.mockReturnValue({ pathname: '/privacy', query: {}, push: mocks.push });
  mocks.useAuth.mockReturnValue({
    user: { ...member, deletion_scheduled_for: '2999-01-01T00:00:00Z' },
    loading: false,
    signOut: mocks.signOut,
  });
  render(<Layout>Privacy text</Layout>);

  expect(screen.getByText('Privacy text')).toBeDefined();
  expect(screen.queryByText(/Restore screen/)).toBeNull();
});

it('gates /delete-account too, so a pending member cannot skip Restore', () => {
  mocks.useRouter.mockReturnValue({ pathname: '/delete-account', query: {}, push: mocks.push });
  mocks.useAuth.mockReturnValue({
    user: { ...member, deletion_scheduled_for: '2999-01-01T00:00:00Z' },
    loading: false,
    signOut: mocks.signOut,
  });
  render(<Layout>Delete page</Layout>);

  expect(screen.queryByText('Delete page')).toBeNull();
  expect(screen.getByText(/Restore screen/)).toBeDefined();
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/Layout.test.tsx`
Expected: the three new tests FAIL.

- [x] **Step 3: Let `PublicShell` hide its auth links.** In `layout/PublicShell.tsx`, change the signature and wrap the `Group`:

```tsx
/** Shell for signed-out visitors: brand, Log in / Sign up, legal footer. */
export function PublicShell({ children, showAuthLinks = true }: { children: ReactNode; showAuthLinks?: boolean }) {
```

and `{showAuthLinks ? ( <Group gap="xs"> … </Group> ) : null}` around the existing `Group`.

- [x] **Step 4: Add the gate** to `Layout.tsx`. Import the screen:

```tsx
import { AccountRestoreScreen } from './account/AccountRestoreScreen';
```

add above `export default function Layout`:

```tsx
/** Pages a member pending deletion can still read. Every other page shows the restore screen. */
const OPEN_WHILE_PENDING_DELETION = new Set(['/privacy', '/terms', '/help']);
```

and after `if (!user) { return <PublicShell>{children}</PublicShell>; }`:

```tsx
// A member pending deletion restores or signs out before anything else
// (spec §5.3). /delete-account is gated too, or its sign-in link would
// skip Restore.
if (user.deletion_scheduled_for) {
  return (
    <PublicShell showAuthLinks={false}>
      {OPEN_WHILE_PENDING_DELETION.has(router.pathname) ? (
        children
      ) : (
        <AccountRestoreScreen scheduledFor={user.deletion_scheduled_for} />
      )}
    </PublicShell>
  );
}
```

- [x] **Step 5: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/Layout.test.tsx`
Expected: PASS.

- [x] **Step 6: Commit.**

```bash
git add apps/web/src/components/Layout.tsx apps/web/src/components/Layout.test.tsx apps/web/src/components/layout/PublicShell.tsx
git commit -m "feat(web): gate every page behind the restore screen for a member pending deletion"
```

### Task 3.15: The delete flow

**Files:**

- Create: `apps/web/src/components/account/DeleteAccountFlow.tsx` (+ `.test.tsx`)

- [x] **Step 1: Write the failing tests** in `components/account/DeleteAccountFlow.test.tsx`:

```tsx
import React from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SUPPORT_EMAIL } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signOut: vi.fn(),
  refreshUser: vi.fn(),
  notifyError: vi.fn(),
  useRouter: vi.fn(),
  replace: vi.fn(),
  getSession: vi.fn(),
  supabaseSignOut: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  requestAccountDeletion: vi.fn(),
  isRecentSignIn: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession, signOut: mocks.supabaseSignOut } },
}));
vi.mock('../../lib/auth', () => ({
  signInWithEmail: mocks.signInWithEmail,
  signInWithGoogle: mocks.signInWithGoogle,
}));
vi.mock('../ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requestAccountDeletion: mocks.requestAccountDeletion,
  isRecentSignIn: mocks.isRecentSignIn,
  logClientEvent: mocks.logClientEvent,
}));

import { DeleteAccountFlow, REAUTH_USER_KEY } from './DeleteAccountFlow';

const EMAIL_MEMBER = {
  id: 'user-1',
  email: 'member@example.com',
  app_metadata: { providers: ['email'] },
};
const GOOGLE_MEMBER = {
  id: 'user-1',
  email: 'member@example.com',
  app_metadata: { providers: ['google'] },
};

async function press(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

async function submitPassword(password: string) {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  await press('Confirm');
}

describe('DeleteAccountFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.useRouter.mockReturnValue({ query: {}, isReady: true, replace: mocks.replace });
    mocks.useAuth.mockReturnValue({
      supabaseUser: EMAIL_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mocks.isRecentSignIn.mockReturnValue(false);
    mocks.signOut.mockResolvedValue({});
    mocks.supabaseSignOut.mockResolvedValue({ error: null });
    mocks.replace.mockResolvedValue(true);
  });

  it('explains what goes and when, then asks for the password after an old sign-in', async () => {
    render(<DeleteAccountFlow />);

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account' })).toBeDefined();
    expect(screen.getByText(/the messages you sent/)).toBeDefined();
    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: "Confirm it's you" })).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('skips confirming after a recent sign-in', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    render(<DeleteAccountFlow />);

    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
  });

  it('says so when the password is wrong', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      error: Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await submitPassword('wrong');

    expect(mocks.signInWithEmail).toHaveBeenCalledWith('member@example.com', 'wrong');
    expect(screen.getByText('That password is incorrect.')).toBeDefined();
  });

  it('moves on after the right password', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      user: { id: 'user-1', email: 'member@example.com' },
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await submitPassword('right');

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
  });

  it('starts Google with its account chooser, remembering who asked', async () => {
    mocks.useAuth.mockReturnValue({
      supabaseUser: GOOGLE_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    mocks.signInWithGoogle.mockResolvedValue({});
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press(/Continue with Google/);

    expect(window.sessionStorage.getItem(REAUTH_USER_KEY)).toBe('user-1');
    expect(mocks.signInWithGoogle).toHaveBeenCalledWith({
      redirectTo: `${window.location.origin}/delete-account?step=confirm`,
      selectAccount: true,
    });
  });

  it('back from Google as the same account, goes straight to the final step', async () => {
    window.sessionStorage.setItem(REAUTH_USER_KEY, 'user-1');
    mocks.useRouter.mockReturnValue({
      query: { step: 'confirm' },
      isReady: true,
      replace: mocks.replace,
    });

    render(<DeleteAccountFlow />);
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
    expect(window.sessionStorage.getItem(REAUTH_USER_KEY)).toBeNull();
  });

  it('back from Google as a different account, signs it out and deletes nothing', async () => {
    window.sessionStorage.setItem(REAUTH_USER_KEY, 'someone-else');
    mocks.useRouter.mockReturnValue({
      query: { step: 'confirm' },
      isReady: true,
      replace: mocks.replace,
    });

    render(<DeleteAccountFlow />);
    await act(async () => {});

    expect(mocks.supabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.replace).toHaveBeenCalledWith('/delete-account?reauth=wrong-account');
    expect(mocks.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('deletes the account, then signs out onto the scheduled page', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({ data: '2026-10-30T12:00:00.000Z' });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(mocks.signOut).toHaveBeenCalledWith({
      redirectTo: '/delete-account?scheduled=2026-10-30T12%3A00%3A00.000Z',
    });
  });

  it('goes back to confirming when the database wants a fresh sign-in', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("Please confirm it's you again.", { code: 'reauth_required' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByRole('heading', { level: 1, name: "Confirm it's you" })).toBeDefined();
    expect(screen.getByText("Please confirm it's you again.")).toBeDefined();
  });

  it('offers the email route for an account with no profile', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("We couldn't find your profile.", { code: 'profile_not_found' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByText(new RegExp(SUPPORT_EMAIL))).toBeDefined();
  });

  it('shows any other failure and stays on the final step', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("Couldn't delete your account. Please try again."),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByText("Couldn't delete your account. Please try again.")).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('toasts the date and reloads the profile when signing out fails after the delete', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({ data: '2026-10-30T12:00:00.000Z' });
    mocks.signOut.mockResolvedValue({ error: "Couldn't log you out. Please try again." });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(mocks.notifyError).toHaveBeenCalledWith(expect.stringContaining('October 30, 2026'));
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/account/DeleteAccountFlow.test.tsx`
Expected: FAIL, because the module doesn't exist.

- [x] **Step 3: Write the flow** in `components/account/DeleteAccountFlow.tsx`:

```tsx
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, List, PasswordInput, Stack, Text } from '@mantine/core';
import {
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
  SUPPORT_EMAIL,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  getAuthErrorMessage,
  getReauthMethod,
  getScheduledDeletionDate,
  isRecentSignIn,
  logClientEvent,
  requestAccountDeletion,
} from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { signInWithEmail, signInWithGoogle } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from '../auth/AuthCard';
import { GoogleButton } from '../auth/GoogleButton';
import { busyButtonProps, notify } from '../ui';

/** Holds the member's user id across the Google round trip. */
export const REAUTH_USER_KEY = 'nepally.deleteAccount.userId';

const WRONG_PASSWORD = 'That password is incorrect.';
const CONFIRM_AGAIN = "Please confirm it's you again.";

type Step = 'explain' | 'confirm' | 'final' | 'wrong-account';

function readReauthUserId(): string | null {
  try {
    return window.sessionStorage.getItem(REAUTH_USER_KEY);
  } catch {
    return null;
  }
}

/** Back from Google (?step=confirm), the stored id decides where the flow starts. */
function initialStep(returnedFromGoogle: boolean, userId: string): Step {
  if (!returnedFromGoogle) return 'explain';
  const expected = readReauthUserId();
  if (expected === null) return 'explain';
  return expected === userId ? 'final' : 'wrong-account';
}

function passwordErrorMessage(error: Error): string {
  return (error as { code?: unknown }).code === 'invalid_credentials'
    ? WRONG_PASSWORD
    : getAuthErrorMessage(error, 'log-in');
}

/**
 * Deleting a signed-in member's account (spec §5.2): explain, confirm it's
 * them, delete. /delete-account renders it for any session, so a Google
 * re-auth as a different account, even one with no profile, still lands
 * here and is signed out.
 */
export function DeleteAccountFlow() {
  const router = useRouter();
  const { supabaseUser, signOut, refreshUser } = useAuth();
  const userId = supabaseUser?.id ?? '';
  const returnedFromGoogle = router.query.step === 'confirm';
  const [step, setStep] = useState<Step>(() => initialStep(returnedFromGoogle, userId));
  // Read the clock once, not on every render.
  const [scheduledDate] = useState(() => getScheduledDeletionDate());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const handledReturnRef = useRef(false);

  // The Google round trip is over: forget the stored id. A different account
  // is signed out of this browser, and nothing is deleted.
  useEffect(() => {
    if (!returnedFromGoogle || handledReturnRef.current) return;
    handledReturnRef.current = true;
    try {
      window.sessionStorage.removeItem(REAUTH_USER_KEY);
    } catch {
      // Storage blocked: nothing to forget.
    }
    if (step === 'wrong-account') {
      void supabase.auth.signOut({ scope: 'local' }).finally(() => {
        void router.replace('/delete-account?reauth=wrong-account');
      });
    }
  }, [returnedFromGoogle, step, router]);

  async function handleContinue() {
    if (busy) return;
    setBusy(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setBusy(false);
    setNotice('');
    setStep(session && isRecentSignIn(session.access_token) ? 'final' : 'confirm');
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await signInWithEmail(supabaseUser?.email ?? '', password);
    setBusy(false);
    if (result.error) {
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { platform: 'web', method: 'password' },
        error: result.error,
      });
      setError(passwordErrorMessage(result.error));
      return;
    }
    setPassword('');
    setNotice('');
    setStep('final');
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      window.sessionStorage.setItem(REAUTH_USER_KEY, userId);
    } catch {
      // Without storage, the return from Google starts over at Explain.
    }
    const result = await signInWithGoogle({
      redirectTo: `${window.location.origin}/delete-account?step=confirm`,
      selectAccount: true,
    });
    if (result.error) {
      setBusy(false);
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { platform: 'web', method: 'google' },
        error: result.error,
      });
      setError(getAuthErrorMessage(result.error, 'google'));
    }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestAccountDeletion(supabase);
    if (result.error || !result.data) {
      setBusy(false);
      const code = getAccountDeletionErrorCode(result.error);
      if (code === REAUTH_REQUIRED) {
        setNotice(CONFIRM_AGAIN);
        setStep('confirm');
        return;
      }
      logClientEvent({
        event: 'account_delete_failed',
        context: { platform: 'web' },
        error: result.error,
      });
      setError(
        code === PROFILE_NOT_FOUND
          ? `We couldn't delete this account here. Email ${SUPPORT_EMAIL} from your account's email address and we'll delete it for you.`
          : (result.error?.message ?? "Couldn't delete your account. Please try again.")
      );
      return;
    }
    const scheduled = result.data;
    const { error: signOutError } = await signOut({
      redirectTo: `/delete-account?scheduled=${encodeURIComponent(scheduled)}`,
    });
    if (signOutError) {
      // Layout unmounted this flow while signing out, so state set here is
      // lost. The toast survives, and the reloaded profile (now with its date)
      // puts the restore screen, with its own sign-out, in the flow's place.
      notify.error(
        `Your account will be deleted on ${formatDeletionDate(scheduled)}, but we couldn't sign you out. Choose "Keep deletion and sign out" to try again.`
      );
      await refreshUser();
    }
  }

  const errorAlert = error ? (
    <Alert color="red" variant="light">
      {error}
    </Alert>
  ) : null;

  let content: React.ReactNode;
  if (step === 'wrong-account') {
    content = (
      <AuthCard
        title="You signed in as a different account"
        description="Signing that account out…"
      >
        <Text>Nothing was deleted.</Text>
      </AuthCard>
    );
  } else if (step === 'explain') {
    content = (
      <AuthCard
        title="Delete your account"
        description="Read this first. After the grace period it can't be undone."
      >
        <Stack gap="sm">
          <Text>Deleting your account removes:</Text>
          <List>
            <List.Item>your profile and photos</List.Item>
            <List.Item>your posts and comments</List.Item>
            <List.Item>
              the messages you sent (messages other members sent you stay in their chats)
            </List.Item>
            <List.Item>
              your listings and events (active promotions end with the listings)
            </List.Item>
          </List>
          <Text>
            Your account is hidden from other members right away and deleted on{' '}
            {formatDeletionDate(scheduledDate)}. Sign in before then to restore it.
          </Text>
          <Button onClick={() => void handleContinue()} {...busyButtonProps(busy, busy)}>
            Continue
          </Button>
          <Button variant="default" component={Link} href="/profile">
            Cancel
          </Button>
        </Stack>
      </AuthCard>
    );
  } else if (step === 'confirm' && supabaseUser && getReauthMethod(supabaseUser) === 'password') {
    content = (
      <AuthCard title="Confirm it's you" description={notice || 'Enter your password to continue.'}>
        {errorAlert}
        <form noValidate onSubmit={(event) => void handlePassword(event)}>
          <Stack gap="sm">
            <PasswordInput
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
            />
            <Button type="submit" {...busyButtonProps(busy, busy)}>
              Confirm
            </Button>
          </Stack>
        </form>
      </AuthCard>
    );
  } else if (step === 'confirm') {
    content = (
      <AuthCard
        title="Confirm it's you"
        description={notice || 'Sign in with Google again to continue.'}
      >
        {errorAlert}
        <GoogleButton onClick={() => void handleGoogle()} busy={busy} />
      </AuthCard>
    );
  } else {
    content = (
      <AuthCard
        title="Delete your account?"
        description={`Your account will be hidden now and deleted on ${formatDeletionDate(scheduledDate)}.`}
      >
        <Stack gap="sm">
          {errorAlert}
          <Button color="red" onClick={() => void handleDelete()} {...busyButtonProps(busy, busy)}>
            Delete my account
          </Button>
          <Button variant="default" component={Link} href="/profile">
            Cancel
          </Button>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <>
      <Head>
        <title>Delete account - Nepally</title>
      </Head>
      {content}
    </>
  );
}
```

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/account/DeleteAccountFlow.test.tsx`
Expected: PASS, 12 tests.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/components/account/DeleteAccountFlow.tsx apps/web/src/components/account/DeleteAccountFlow.test.tsx
git commit -m "feat(web): the delete account flow: explain, confirm it's you, delete"
```

### Task 3.16: The `/delete-account` page

**Files:**

- Create: `apps/web/src/pages/delete-account.page.tsx`, `apps/web/src/pages/delete-account.test.tsx`

- [x] **Step 1: Write the failing tests** in `pages/delete-account.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), useRouter: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../components/account/DeleteAccountFlow', () => ({
  DeleteAccountFlow: () => React.createElement('p', null, 'The delete flow'),
}));

import DeleteAccountPage from './delete-account.page';

function routerWith(query: Record<string, string>, isReady = true) {
  mocks.useRouter.mockReturnValue({ query, isReady });
}

describe('DeleteAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerWith({});
    mocks.useAuth.mockReturnValue({ supabaseUser: null });
  });

  it('renders nothing until the router is ready', () => {
    routerWith({}, false);
    const { container } = render(<DeleteAccountPage />);
    expect(container.textContent).toBe('');
  });

  it('runs the flow for anyone with a session', () => {
    mocks.useAuth.mockReturnValue({ supabaseUser: { id: 'user-1' } });
    render(<DeleteAccountPage />);
    expect(screen.getByText('The delete flow')).toBeDefined();
  });

  it('tells a signed-out visitor how deletion works and how to start it', () => {
    render(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Delete your Nepally account' })
    ).toBeDefined();
    expect(screen.getByText(/29 days/)).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Sign in to delete your account' }).getAttribute('href')
    ).toBe('/login?redirect=%2Fdelete-account');
    expect(screen.getByRole('link', { name: 'support@nepally.us' }).getAttribute('href')).toBe(
      'mailto:support@nepally.us'
    );
  });

  it('confirms the date after a request', () => {
    routerWith({ scheduled: '2026-10-30T12:00:00.000Z' });
    render(<DeleteAccountPage />);

    expect(
      screen.getByText(
        'Your account will be deleted on October 30, 2026. Sign in before then to restore it.'
      )
    ).toBeDefined();
  });

  it('ignores a scheduled date that is not a date', () => {
    routerWith({ scheduled: 'nope' });
    render(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Delete your Nepally account' })
    ).toBeDefined();
  });

  it('says so after a Google re-auth as a different account', () => {
    routerWith({ reauth: 'wrong-account' });
    render(<DeleteAccountPage />);

    expect(screen.getByText(/You signed in as a different account/)).toBeDefined();
  });
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/delete-account.test.tsx`
Expected: FAIL, because the page doesn't exist.

- [x] **Step 3: Write the page** in `pages/delete-account.page.tsx`:

```tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { ACCOUNT_DELETION_GRACE_DAYS, SUPPORT_EMAIL, formatDeletionDate } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { AuthCard } from '../components/auth/AuthCard';
import { DeleteAccountFlow } from '../components/account/DeleteAccountFlow';

const LOGIN_HERE = `/login?redirect=${encodeURIComponent('/delete-account')}`;

function ScheduledCard({ date }: { date: string }) {
  return (
    <AuthCard title="Your account will be deleted" footer={<Link href="/login">Log in</Link>}>
      <Text>{`Your account will be deleted on ${date}. Sign in before then to restore it.`}</Text>
    </AuthCard>
  );
}

function SignedOutCard({ wrongAccount }: { wrongAccount: boolean }) {
  return (
    <AuthCard title="Delete your Nepally account">
      <Stack gap="sm">
        {wrongAccount ? (
          <Alert color="red" variant="light">
            You signed in as a different account. Sign in again as yourself to delete your account.
          </Alert>
        ) : null}
        <Text>
          Sign in, then confirm it&apos;s you. Your account is hidden right away and deleted after{' '}
          {ACCOUNT_DELETION_GRACE_DAYS} days: your profile, posts, comments, the messages you sent,
          listings, events and photos. Sign in before then to restore it.
        </Text>
        <Button component={Link} href={LOGIN_HERE}>
          Sign in to delete your account
        </Button>
        <Text>
          Can&apos;t sign in? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from
          your account&apos;s email address with the subject &quot;Delete my account&quot;.
        </Text>
      </Stack>
    </AuthCard>
  );
}

/**
 * The public account deletion page, and the URL given to the Play Console.
 * With a session it runs the flow. A member pending deletion never gets here:
 * Layout shows them the restore screen.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const { supabaseUser } = useAuth();
  if (!router.isReady) return null;

  const scheduledParam = router.query.scheduled;
  const scheduled =
    typeof scheduledParam === 'string' && !Number.isNaN(Date.parse(scheduledParam))
      ? scheduledParam
      : null;

  return (
    <>
      <Head>
        <title>Delete your account - Nepally</title>
      </Head>
      {supabaseUser ? (
        <DeleteAccountFlow />
      ) : scheduled ? (
        <ScheduledCard date={formatDeletionDate(scheduled)} />
      ) : (
        <SignedOutCard wrongAccount={router.query.reauth === 'wrong-account'} />
      )}
    </>
  );
}
```

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/delete-account.test.tsx`
Expected: PASS, 6 tests.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/pages/delete-account.page.tsx apps/web/src/pages/delete-account.test.tsx
git commit -m "feat(web): the public /delete-account page"
```

### Task 3.17: The Settings entry

**Files:**

- Modify: `apps/web/src/components/layout/navItems.ts`, `apps/web/src/components/layout/navItems.test.ts`

- [x] **Step 1: Write the failing test** in `navItems.test.ts`, inside `describe('navItems', …)`:

```ts
it('ends the Settings list with Delete account', () => {
  expect(getSettingsLinks({ is_moderator: false }).at(-1)).toEqual({
    label: 'Delete account',
    href: '/delete-account',
  });
});
```

- [x] **Step 2: Run it and watch it fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/layout/navItems.test.ts`
Expected: FAIL.

- [x] **Step 3: Add the link.** In `getSettingsLinks`, add `{ label: 'Delete account', href: '/delete-account' },` after the Terms of Service entry.

- [x] **Step 4: Run the test** and `src/pages/profile.test.tsx`, which renders the list.

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/components/layout/navItems.test.ts src/pages/profile.test.tsx`
Expected: PASS. If the profile test pins the list's exact labels, add "Delete account" there.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/components/layout/navItems.ts apps/web/src/components/layout/navItems.test.ts apps/web/src/pages/profile.test.tsx
git commit -m "feat(web): Delete account in Settings"
```

### Task 3.18: Moderation shows reported members and listings that are gone

**Files:**

- Modify: `apps/web/src/hooks/useModerationQueue.ts` (+ `.test.ts`), `apps/web/src/components/moderation/ReportCard.tsx` (+ `.test.tsx`), `apps/web/src/pages/moderation.page.tsx`, `apps/web/src/pages/moderation.test.tsx`

- [x] **Step 1: Write the failing hook tests.** In `useModerationQueue.test.ts`:
  - Add `getExistingUserIds: vi.fn(),` and `getExistingListingIds: vi.fn(),` to the `vi.mock('@nepally/shared', …)` factory.
  - Add them to the import from `@nepally/shared`, with `const mockExistingUsers = getExistingUserIds as ReturnType<typeof vi.fn>;` and `const mockExistingListings = getExistingListingIds as ReturnType<typeof vi.fn>;`.
  - In `beforeEach`, add `mockExistingUsers.mockResolvedValue({ data: ['author-2'] });` and `mockExistingListings.mockResolvedValue({ data: [] });`.

Then add these tests:

```ts
it('marks reported members and listings that no longer exist', async () => {
  mockReports.mockResolvedValue({
    data: [
      report('r1', { target_type: 'user', target_id: 'author-2' }),
      report('r2', { target_type: 'user', target_id: 'gone-user' }),
      report('r3', { target_type: 'listing', target_id: 'gone-listing' }),
    ],
  });

  const { result } = await loaded();

  expect(mockExistingUsers).toHaveBeenCalledWith({}, ['author-2', 'gone-user']);
  expect(mockExistingListings).toHaveBeenCalledWith({}, ['gone-listing']);
  expect([...result.current.missingTargetIds].sort()).toEqual(['gone-listing', 'gone-user']);
});

it('fails the queue as a whole when a target check fails', async () => {
  mockExistingUsers.mockResolvedValue({ error: new Error('boom') });

  const { result } = await loaded();

  expect(result.current.error).toBe("Couldn't load the moderation queue.");
});
```

- [x] **Step 2: Write the failing card tests** in `ReportCard.test.tsx`:

```tsx
it('says a purged member is gone, with no link and no ban', () => {
  renderCard({
    report: { ...POST_REPORT, target_type: 'user', target_id: 'user-5' },
    post: undefined,
    targetMissing: true,
  });

  expect(screen.getByText('Member no longer available')).toBeDefined();
  expect(screen.queryByRole('link', { name: 'View member' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Ban user' })).toBeNull();
});

it('says a listing is gone, with no link', () => {
  renderCard({
    report: { ...POST_REPORT, target_type: 'listing', target_id: 'listing-7' },
    post: undefined,
    targetMissing: true,
  });

  expect(screen.getByText('Listing no longer available')).toBeDefined();
  expect(screen.queryByRole('link', { name: 'View listing' })).toBeNull();
});
```

In `moderation.test.tsx`, add `missingTargetIds: new Set<string>(),` to the `queue()` fixture, and this test:

```tsx
it('shows a reported member who is gone as no longer available', () => {
  mocks.useModerationQueue.mockReturnValue(
    queue({ missingTargetIds: new Set([USER_REPORT.target_id]) })
  );
  render(<ModerationPage />);

  expect(screen.getByText('Member no longer available')).toBeDefined();
});
```

Match the file's own names for the hook mock and the page component if they differ from `mocks.useModerationQueue` and `ModerationPage`.

- [x] **Step 3: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/hooks/useModerationQueue.test.ts src/components/moderation/ReportCard.test.tsx src/pages/moderation.test.tsx`
Expected: the new tests FAIL.

- [x] **Step 4: Fetch and expose the missing ids.** In `useModerationQueue.ts`:
  - Import `getExistingListingIds` and `getExistingUserIds` from `@nepally/shared`.
  - In `ModerationQueueState`, after `reportedPosts`, add:

```ts
/** Reported members and listings that no longer exist (or, for listings, are no longer active). */
missingTargetIds: ReadonlySet<string>;
```

- Add `missingTargetIds: ReadonlySet<string>;` to `interface Queue`, and `missingTargetIds: new Set()` to `EMPTY_QUEUE`.
- In `fetchQueue`, replace everything from `const postIds = …` to the end of the function with:

```ts
const idsOf = (type: 'post' | 'user' | 'listing') =>
  Array.from(new Set(reports.filter((r) => r.target_type === type).map((r) => r.target_id)));
const userIds = idsOf('user');
const listingIds = idsOf('listing');
// One batched query per kind: the reported posts (so a card can show the
// title and offer "Ban author"), and which reported members and listings
// still exist.
const [reportedResult, usersResult, listingsResult] = await Promise.all([
  getPostsByIds(supabase, idsOf('post')),
  getExistingUserIds(supabase, userIds),
  getExistingListingIds(supabase, listingIds),
]);
if (reportedResult.error || usersResult.error || listingsResult.error) return null;

const found = new Set([...(usersResult.data ?? []), ...(listingsResult.data ?? [])]);
return {
  pendingPosts: postsResult.data ?? [],
  reports,
  reportedPosts: Object.fromEntries((reportedResult.data ?? []).map((p) => [p.id, p])),
  missingTargetIds: new Set([...userIds, ...listingIds].filter((id) => !found.has(id))),
};
```

- In the hook's final `return { … }`, add `missingTargetIds: queue.missingTargetIds,` after `reportedPosts: queue.reportedPosts,`.
- Update the doc comment above `fetchQueue` to say "any of the requests".

- [x] **Step 5: Show it on the card.** In `ReportCard.tsx`:
  - Add to `ReportCardProps`:

```ts
  /** A reported member or listing that no longer exists: no link and no ban. */
  targetMissing?: boolean;
```

- Give `ReportTarget` a `targetMissing` prop (`{ report, post, targetMissing }: { report: ReportWithUsers; post: Post | undefined; targetMissing: boolean }`). At the top of its `user` branch add `if (targetMissing) return <Text className={styles.target}>Member no longer available</Text>;`, and at the top of its `listing` branch add `if (targetMissing) return <Text className={styles.target}>Listing no longer available</Text>;`.
- In `ReportCard`, take `targetMissing = false`, pass it to `<ReportTarget … targetMissing={targetMissing} />`, and change the Ban user condition to `report.target_type === 'user' && !targetMissing`.
- In `moderation.page.tsx`, pass `targetMissing={queue.missingTargetIds.has(report.target_id)}` to `ReportCard`.

- [x] **Step 6: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/hooks/useModerationQueue.test.ts src/components/moderation src/pages/moderation.test.tsx`
Expected: PASS.

- [x] **Step 7: Commit.**

```bash
git add apps/web/src/hooks/useModerationQueue.ts apps/web/src/hooks/useModerationQueue.test.ts apps/web/src/components/moderation/ReportCard.tsx apps/web/src/components/moderation/ReportCard.test.tsx apps/web/src/pages/moderation.page.tsx apps/web/src/pages/moderation.test.tsx
git commit -m "feat(web): moderation shows reported members and listings that are gone"
```

- [x] **Chunk 4 gate and review.** From `C:\…`, run `npm run test --workspace=apps/web`, then `npm run type-check` and `npm run lint`, checking each exit code. Then a `code-reviewer` on the chunk's commits. Fix CRITICAL and HIGH in one `fix: address chunk 4 review` commit.

### Chunk 5: legal, docs, ship

### Task 3.19: Legal copy

**Files:**

- Modify: `apps/web/src/pages/privacy.page.tsx`, `apps/web/src/pages/help.page.tsx`, `apps/web/src/pages/terms.page.tsx`, `apps/web/src/pages/legal.test.tsx`, `packages/shared/src/constants/appConfig.ts`

- [x] **Step 1: Write the failing tests** in `legal.test.tsx`. Add to the Privacy test `'links to the Terms and explains deletion'`:

```tsx
expectMention(/29 days/);
expectMention(/restore it by signing in/i);
expectMention(/saved link/i);
expectLink(/delete-account/, '/delete-account');
```

To the Help Center test:

```tsx
expectMention(/Delete account/);
expectLink(/delete-account/, '/delete-account');
```

To the Terms page test that covers deletion, or a new one:

```tsx
it('points to in-app account deletion', () => {
  render(<TermsPage />);

  expectLink(/delete-account/, '/delete-account');
});
```

- [x] **Step 2: Run them and watch them fail.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/legal.test.tsx`
Expected: FAIL.

- [x] **Step 3: Write the copy.**

In `privacy.page.tsx`, replace the "How long we keep it" paragraph:

```tsx
<p>
  We keep your account and content while your account is active. When you delete your account, it is
  hidden from other members right away and deleted 29 days later: your profile, posts, comments, the
  messages you sent, listings, events, and photos. Until then you can restore it by signing in. The
  apps stop showing your photos right away, but a saved link to one keeps working until the photo is
  deleted. Everything goes within 30 days. We may keep limited records longer where the law requires
  it, for example payment records, or to investigate abuse.
</p>
```

and the "Delete your account" bullet under "Your choices":

```tsx
<li>
  Delete your account from Settings, or at{' '}
  <Link href="/delete-account">nepally.us/delete-account</Link>. If you can&apos;t sign in, email{' '}
  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your account email and we will delete
  your account for you.
</li>
```

In `help.page.tsx`, replace the answer to "How do I delete my account?":

```tsx
<p>
  Open your profile, then Settings &amp; more, then <strong>Delete account</strong>, or go to{' '}
  <Link href="/delete-account">nepally.us/delete-account</Link>. Confirm it&apos;s you with your
  password or Google, then choose Delete my account. Your account is hidden right away and deleted
  after 29 days, along with your profile, posts, comments, the messages you sent, listings, and
  photos. Sign in before then to restore it. If you can&apos;t sign in, email{' '}
  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email address on your account
  with the subject &quot;Delete my account&quot;. See the{' '}
  <Link href="/privacy">Privacy Policy</Link> for what we may need to keep and why.
</p>
```

In `terms.page.tsx`, change "You can delete your account at any time (see the Help Center)" to: "You can delete your account at any time from Settings or at `<Link href="/delete-account">nepally.us/delete-account</Link>` (see the `<Link href="/help">Help Center</Link>`)."

In `packages/shared/src/constants/appConfig.ts`, set `LEGAL_LAST_UPDATED` to the day this lands.

- [x] **Step 4: Run the tests.**

Run, from `C:\…`: `npm run test --workspace=apps/web -- src/pages/legal.test.tsx`
Expected: PASS. The text still needs counsel review, like the rest of the legal pages.

- [x] **Step 5: Commit.**

```bash
git add apps/web/src/pages/privacy.page.tsx apps/web/src/pages/help.page.tsx apps/web/src/pages/terms.page.tsx apps/web/src/pages/legal.test.tsx packages/shared/src/constants/appConfig.ts
git commit -m "docs(web): legal copy for in-app account deletion"
```

### Task 3.20: Docs

**Files:**

- Modify: `docs/decisions/2026-09-18-long-lived-sessions.md`, `docs/plans/active/2026-09-18-production-launch.md`, `docs/plans/active/mobile-usability-security-hardening.md`, `docs/architecture/web-ui-system.md`, this plan

- [x] **Step 1: Amend the ADR.** In `2026-09-18-long-lived-sessions.md`, replace the "Sensitive actions ask the user to confirm who they are instead" bullet with:

```markdown
- Sensitive actions ask the user to confirm who they are instead: deleting the account, and changing email or password. Email accounts re-enter the password; Google and Apple accounts redo their provider sign-in (Google with `prompt=select_account`). _Amended 2026-10-01: an emailed code (`supabase.auth.reauthenticate()`) was the first choice, but its code can only be checked by a password change, so it can't gate deletion. See [account deletion](../specs/2026-09-28-account-deletion.md), D5._
```

Use the date the PR lands.

- [x] **Step 2: Fix the same claim elsewhere.** In `production-launch.md`, line 33's "Google and Apple accounts confirm an emailed one-time code" becomes "Google and Apple accounts redo their provider sign-in". Line 221's "an emailed code through `supabase.auth.reauthenticate()` for Google and Apple accounts" becomes "redoing their provider sign-in for Google and Apple accounts". In `mobile-usability-security-hardening.md`, line 142's "(password, or an emailed code for Google/Apple accounts)" becomes "(password, or redoing the provider sign-in for Google/Apple accounts)".

- [x] **Step 3: Record the new components** in `web-ui-system.md`:
  - Add `busyButtonProps` to the busy-controls paragraph, as the helper to use.
  - Add the delete flow, the restore screen and the Delete account page to that paragraph's list of controls that follow the rule.
  - Add rows for `AccountRestoreScreen` and `DeleteAccountFlow` (`components/account/`) to the component table nearest the auth components.

- [x] **Step 4: Check and commit.**

Run: `npm run docs:check` and `npm run lint:md`, after `npx prettier --write` on each changed file.
Expected: exit 0 for both.

```bash
git add docs/decisions/2026-09-18-long-lived-sessions.md docs/plans/active/2026-09-18-production-launch.md docs/plans/active/mobile-usability-security-hardening.md docs/architecture/web-ui-system.md
git commit -m "docs: re-auth by provider sign-in; the account deletion components"
```

### Task 3.21: Gate, review, draft PR, staging check

- [x] **Step 1: Run the full gate** and check every exit code:
  - `npm run type-check`
  - `npm run lint`
  - `npm run lint:guards`
  - `npm run test --workspace=packages/shared`
  - from `C:\…`, `npm run test --workspace=apps/web`
  - `npm run test --workspace=apps/mobile`
  - `npm run docs:check`
  - `npm run lint:md`

  Then `npm run ci:local`, since drafts run no CI.

- [x] **Step 2: Review the whole PR.** Run a `code-reviewer`, a `security-reviewer` (redirects, re-auth, the gate) and a `pr-test-analyzer` on `git diff master...HEAD`. Fix CRITICAL and HIGH in one `fix: address PR 3 review` commit; the rest go to Follow-ups.
- [ ] **Step 3: Check staging's redirect allow-list.** In the Supabase dashboard for `tlusiongalvszftnzpoq`, Authentication → URL Configuration must list `http://localhost:3000/**`, or the exact `/auth/callback` and `/delete-account` URLs. Otherwise Google falls back to the Site URL. This needs the user.
- [x] **Step 4: Ship the draft.**
  - Push with `git push -u origin feat/account-deletion-web`.
  - Open a **draft** PR against `master` from `.github/pull_request_template.md`.
  - Request Copilot's review with `gh pr edit <n> --add-reviewer @copilot`.
- [ ] **Step 5: Manual check on staging with the web app (needs the user).**
  - Delete an email account and a Google account. Check the one-time Google account chooser, and that a different Google account is signed out.
  - A second browser signed in as another member no longer sees the deleted member.
  - Signing back in shows the restore screen, and Restore brings everything back.
  - Moving a test account's date into the past with the service role shows "being deleted".

**Acceptance:** a web member can delete their account on staging with a password and with Google. Another member no longer sees them. Signing back in shows the restore screen, and Restore brings everything back. After the date, the restore screen offers only Sign out. Moderation shows a purged member as no longer available. A chat with a pending or purged member shows "Unavailable account".

---

## PR 4 — Mobile

Break this PR into steps when it starts. It needs 048 and 050 applied and PR 3 merged, for the shared code.

**Tasks:**

- **4.1 `DeleteAccountScreen`.**
  - `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx` (+ test) has the same three steps as web.
  - Password re-auth uses `pauseAuthListener` / `resumeAuthListener` around `signInWithPassword`, the way `ChangePasswordScreen.tsx:66-100` does.
  - Google re-auth calls `services/auth/googleAuth.ts` with `prompt: 'select_account'`, then compares the returned session's user id with the one from before. `googleAuth.ts` exchanges the code straight into the live session. So on a mismatch, sign that session out and send the member to sign in again, as on web.
  - `profile_not_found` shows the `SUPPORT_EMAIL` fallback.
  - Mobile `AuthContext.signOut` ignores Supabase's `{ error }` (`AuthContext.tsx:210-219`), and that's fine. supabase-js removes the local session even when revoking it on the server fails (PR 3, "Found at the start of PR 3"), so it needs no local fallback.
  - Every async handler checks `navigation.isFocused()` before navigating or alerting, the same guard #109 added to chat starts.
  - On success it shows an alert, "Your account will be deleted on _date_. Sign in before then to restore it.", then signs out and runs `clearAllData()`.
  - Tests cover every state in spec §7, following the golden rules in `apps/mobile/CLAUDE.md`.
- **4.2 Navigation.**
  - Add `DeleteAccount: undefined` to the profile stack's param list in `apps/mobile/src/types/navigation.ts`, and the screen to `ProfileNavigator.tsx`. Export both new screens from `screens/profile/index.ts`, because `ProfileNavigator` imports from that barrel.
  - Add `AccountRestore: undefined` to `RootStackParamList` for the gate in 4.4. `RootNavigator` imports `AccountRestoreScreen` from its own file, not the barrel, which would pull in every profile screen (`RootNavigator.test.tsx:12-30` avoids that on purpose).
  - Add a "Delete account" item to the Profile dropdown menu in `ProfileScreen.tsx:411-428`, after Change Password. Update `ProfileScreen.test.tsx`.
- **4.3 `AccountRestoreScreen`.** `apps/mobile/src/screens/profile/AccountRestoreScreen.tsx` (+ test): **Restore my account** calls `cancelAccountDeletion` then refreshes the profile; **Keep deletion and sign out** signs out. After the date, or when `getAccountDeletionErrorCode(error)` is `DELETION_IN_PROGRESS`, it shows "Your account is being deleted" with only Sign out, as on web.
- **4.4 The `RootNavigator` gate.** When `user?.deletion_scheduled_for` is set, show `AccountRestoreScreen` in place of onboarding and the main tabs. Update `RootNavigator.test.tsx`.
  - Mobile `AuthContext` declares its own `User` interface and copies a fixed list of fields from `getMyProfile()` (`AuthContext.tsx:13` and `:105-121`). So the column is loaded but dropped. Add it to both, or switch the context to the shared `User`.
  - Push: `AuthContext` calls `registerPushTokenForUser` on sign-in, before `refreshUser()` loads the profile. Move registration after the profile loads, skip it for a pending account, and register after a successful restore. Update `AuthContext.test.tsx`.
- **4.5 The chat fallback.** In `components/chat/ConversationItem.tsx` and `screens/chat/MessageThreadScreen.tsx` (and their tests), `other_user_available: false` shows the default avatar, and doesn't open a profile. The name is already `UNAVAILABLE_ACCOUNT_NAME`, and `formatPublicName` passes it through unchanged (PR 3, Task 3.4). These components get the partner only through props and route params, so pass the flag through both. A purged partner (`other_user_id: null`) hides the composer. PR 3's null guards already hide Block.
  - `NotificationsScreen.tsx:165-175` opens `MessageThread` straight from a notification, with `otherUserName: target.senderName ?? notif.title`, and the thread never refetches. So a pending partner's real name, photo, Block and Conversation options all show. Resolve the partner through `getConversations` (in the handler or the thread screen) and use its `other_user_name`, `other_user_id`, `other_user_photo` and `other_user_available`. Found in the PR 3 chunk 2 review.
  - Hide Block for an unavailable (pending) partner too, once the flag reaches the thread. Blocking a hidden member does no harm, but "Block Unavailable account?" reads oddly.
- **4.6 Gate, review, draft PR.** Then run a Maestro flow once on a dev build: sign in, delete, sign in again, restore. Add it under `apps/mobile/.maestro/` if the flow is stable.

**Acceptance:** on a device, a member can delete their account with a password and with Google. Signing back in shows the restore screen, and Restore works. Chats with a pending member show "Unavailable account".

---

## PR 5 — Ship docs

- Add `docs/product/features/account-deletion.md`: what the feature is today (flow, grace period, hiding, purge, public page), and add it to `docs/INDEX.md`.
- Set `status: implemented` on the spec and this plan, `git mv` both into `docs/archive/`, and fix links and INDEX.
- Tick the W3 account-deletion row in `docs/plans/active/2026-09-18-production-launch.md`. Note that the `/delete-account` URL goes into the Play Console's data-deletion field once the domain is live.
- Update `docs/product/roadmap.md` §"Remaining" item 5.

---

## Risks

- **RLS cost.** `is_pending_deletion` is a SECURITY DEFINER function, so Postgres can't inline it and runs one primary-key lookup per row it checks. `user_follows` runs it twice. Wrapping it in `(SELECT …)` doesn't help, because its argument is a row column. That's fine at launch scale.
  - **When to act:** `EXPLAIN ANALYZE` on production-sized data shows the check dominating feed or search queries.
  - **The fix** (from the #112 database review): a `STABLE SECURITY DEFINER` function `pending_deletion_user_ids() RETURNS uuid[]`, reading the 048 partial index. The policies then use `NOT (author_id = ANY ((SELECT public.pending_deletion_user_ids())))`. The subselect is uncorrelated, so Postgres runs it once per query as an InitPlan.
  - Recorded here, not scheduled.
- **Web has no central route guard.** The restore gate is new ground (Task 3.14). Keep it one component with its own test, not scattered page checks.
- **The scrub scans notifications.** `scrub_account_copies` matches `notifications.data` with no index, once per purged member. An index would slow every notification insert (every message, comment and like) for a job that runs a few times a week. If `notifications` grows past about a million rows, add `CREATE INDEX CONCURRENTLY … USING gin (data jsonb_path_ops)` in its own migration, and match with `data @> jsonb_build_object(…)`.
- **Purge secrets are manual per environment.** Until the runbook is followed, the cron job fails and nobody is purged. The production launch checklist must include the runbook.
- **Google re-auth can't force a password.** `prompt: 'select_account'` makes Google show its chooser, so re-auth never completes silently. But Google has no `prompt` that demands a password. Whoever holds a browser signed in to that Google account passes. That still needs that Google account on that device, which is what the ADR asks for (spec §6).

## Follow-ups (not scheduled)

- A confirmation email when deletion is requested (needs custom SMTP).
- Locking a pending member's photos during the grace period. The buckets are public, so a saved URL keeps working until the purge (spec §6).
- Blocking a banned member from signing up again with the same email after the purge.
- Data export before deletion.
- From the PR 1 review:
  - `amr_signed_in_within()` relies on the default `SECURITY INVOKER`. Sibling migrations such as 046 write it out. The re-created 034 guard keeps its original header on purpose.
  - The `profile_not_found` branch of `request_account_deletion()` has no live-check coverage. Every signed-in member has a profile row, so it only guards against drift.
  - On Windows, every `scripts/security/*.ts` failure path exits 127, not 1. `process.exit(1)` races the Supabase client's handles and trips a libuv assertion. Any non-zero exit still means FAIL. A shared fix, such as setting `process.exitCode` and letting the event loop drain, would touch all the checks.
- Both PR 1 reviewers flagged the `users` policy as reading a column clients have no SELECT grant on. That is a false positive. A rolled-back probe on staging (2026-09-28) showed that Postgres doesn't check column privileges for columns used only inside a policy. `anon` and `authenticated` read the granted columns normally.
- `users-pii-smoke.ts` fails about 28% of the time, and has since before 048. Its fixture names end in `<timestamp>-<6 random base-36 chars>`. When the random part starts with a digit, Postgres's parser reads `-5abc12` as the signed integer `-5` plus `abc12`, but `build_prefix_tsquery` splits on the hyphen and searches `5abc12:*`, so `search_people` misses the fixture. Fix the fixture: start the random part with a letter. The same split affects any real name containing `-<digit>`, which is rare, so no search change is scheduled.
- From the PR 2 review:
  - A small restore race remains. A member who restores while the purge is removing their files keeps the account but loses those files. Closing it fully would mean `cancel_account_deletion()` refusing once `deletion_scheduled_for` has passed, so "restore before the date" becomes the strict rule. That's a user-visible change to the restore screen, so it needs the user's decision first.
  - `index.ts` builds the Supabase client outside its `try`. The env vars it reads are injected by Supabase, but a missing one would skip the function's own 500 response.
  - `PURGE_BATCH_SIZE` is 50 per day. A larger backlog drains oldest-first over several days. For the same reason, the live purge check could miss its own user if more than 50 older accounts were ever due on staging.
  - pg_net holds the outbound request, including the `x-purge-secret` header, in `net.http_request_queue` until it is sent. The secret commands in the runbook can land in shell or SQL-editor history. The endpoint has no rate limit; the 256-bit secret is its protection.
- From the PR 3 chunk 1 review (no CRITICAL or HIGH):
  - `isDeletionDatePassed` treats an unparseable date as not passed, and `formatDeletionDate` renders "Invalid Date". Both only get values from `get_my_profile()` or the RPC, but failing closed (passed, and an empty string) would be safer.
  - The `formatDeletionDate` test expects "October 30, 2026" for noon UTC, which fails on a machine at UTC+12 or later. Pin the zone (`vi.stubEnv('TZ', 'UTC')`) if anyone runs the suite there.
  - `requestAccountDeletion` surfaces "No deletion date returned" as-is if the RPC ever returns no date; an `ApiError` with the usual sentence would read better.
  - `getLastSignInAt` accepts `Infinity` as a timestamp (`Number.isFinite` would close it; a server-signed token can't carry one), and `isRecentSignIn` treats a future timestamp as recent.
  - Cheap test gaps: a two-part token, a non-JSON payload, an already-padded segment, a non-ASCII `user_metadata` name, an `Error`-shaped PostgREST error with a code as its message, and `not_authenticated` falling back to the generic sentence.
  - `isDeletionDatePassed`'s doc could say, as `isRecentSignIn`'s does, that the client clock is a hint and the server's `deletion_in_progress` decides.
- From the PR 3 chunk 2 reviews (no CRITICAL or HIGH; the plan's `safeRedirectPath` let `/.//evil.com` normalise to `//evil.com`, which the implementer caught and fixed in Task 3.7):
  - An empty thread with a purged partner shows "No messages yet. Say hello!" right above "This account has been deleted…" (`pages/messages/[id].page.tsx`, which also reuses `styles.firstMessage` for the new line). Hide the hello line when `other_user_id` is null, and give the line its own class.
  - `getOrCreateConversation` inserts the two participant rows separately. If the second insert fails, the orphan now shows as "Unavailable account" with no composer, the same as a purged partner (before, it was skipped). Clean up the orphan, or make the insert atomic.
  - A chat partner can still read a pending member's `conversation_participants.name` through PostgREST (008's policy lets participants read each other's rows). The UI no longer shows it, and only people who already chatted with the member can read it. Closing it needs a database change, such as a view without the column.
  - `safeRedirectPath` accepts any length. A very long `?redirect=` could push the OAuth `redirectTo` past URL limits and fail that member's Google sign-in. Cap it at about 2 KB. Optionally refuse targets under `/auth/callback` and `/login`, which only chain back to themselves.
  - `getExistingIds` sends the whole id list in one `.in()`. The moderation queue's page size bounds it today, but more than 1000 ids would hit `max_rows` and show real targets as gone. Chunk it, or assert the bound at the call site.
  - Tests: cover the "no partner ids, so the `users` query is skipped" branch in `getConversations` explicitly.
- From the PR 3 chunk 3 reviews (no CRITICAL or HIGH; auth-js 2.116's `_signOut` was confirmed to remove the local session and fire `SIGNED_OUT` on any revoke error other than 401, 403 or 404):
  - `signOut({ redirectTo })` and `signInWithGoogle({ redirectTo })` take any string. Every caller passes an app-built path today, but running `safeRedirectPath(redirectTo, window.location.origin) ?? '/'` inside `handleSignOut` (and checking the origin in `signInWithGoogle`) would make them safe by construction.
  - A sign-out whose server revoke failed still leaves the refresh token valid on the server, although this browser is signed out. The error is logged; a non-blocking notice could say so.
  - Push: the registration's `cancelled` flag is never checked after its awaits, so a token can still register if deletion is requested while the permission prompt is open. `device_tokens` also has no server-side block for a pending account (048 deletes tokens only at request time). Check `cancelled` before `registerDeviceToken`, and consider a trigger or policy that refuses tokens for pending accounts.
  - Missing tests: a signed-in visitor on `/login` renders nothing and doesn't redirect until `router.isReady`; a signed-in visitor with an unsafe `?redirect=` goes to `/feed`; `hasLocalSession()` throwing keeps the member signed in with the error. The "ignores an unsafe ?redirect=" test would also pass if `redirect` were ignored entirely; assert the unsafe value is never pushed.
  - After an email sign-in, `useRedirectWhen`'s replace and the handler's push both navigate (pre-existing, harmless).
  - Check once on a preview URL that Supabase's `/**` allow-list matches a `redirectTo` with a query string. If it doesn't, Supabase falls back to the Site URL and the return path is lost.
- From the PR 3 chunk 4 review (no CRITICAL or HIGH; the Google round trip and the moderation path were traced end to end):
  - Back from Google after cancelling there, the stored id still matches, so the flow jumps to the final step and only the server's `reauth_required` sends it back. Also require `isRecentSignIn` before choosing the final step.
  - When the other Google account is itself pending deletion, Layout shows that account's restore screen, the flow never mounts, and `REAUTH_USER_KEY` stays behind (harmless: the next Google start overwrites it).
  - Layout still polls unread counts and notifications for a pending member. Pass a null user id to those hooks while `deletion_scheduled_for` is set.
  - `handleGoogle` never clears `notice`, and `handlePassword` clears it only on success; clear it whenever an error shows.
  - Focus falls to `<body>` when the step changes. Move it to the new card's heading.
  - After a successful `signInWithGoogle`, `busy` stays true on purpose, but a back-forward-cache restore leaves the Google button stuck. Reset it on `pageshow` with `persisted`.
  - The wrong-account effect's `signOut(...).finally(...)` has no `.catch`, so a rejection goes unhandled (the redirect still runs).
  - If signing out fails after the delete and `refreshUser()` then returns null, the remounted flow shows Explain again under the toast.
  - Missing tests: the wrong-account path removing the stored key, a `getSession` failure in Continue, `sessionStorage` throwing in the Google start, the double-press guard, and `refreshUser` returning null on restore.
- From the PR 3 whole-PR reviews (no CRITICAL or HIGH from the code, security or test-coverage reviews; the code review's one MEDIUM, `/guidelines` missing from the restore gate's open pages, was fixed in PR 3):
  - Fixed in PR 3 after the reviews, at the user's request: `DeleteAccountFlow` is split into the `useDeleteAccountFlow` hook and five step components; Continue falls through to confirming when the session can't be read; Restore says so when the account can't be reloaded; and the shared `getSignInReturnPath` keeps `/login` and `/auth/*` from being a return address, so `/login?redirect=/login` no longer renders a blank page. The hook's body is still about 130 lines, with every handler under 50.
  - The restore gate is UX, not an authorization boundary. A pending member can still write to their own rows through PostgREST. Their posts, comments, likes and follows stay hidden by 048, but a message they send reaches the recipient (from "Unavailable account"). Add `NOT public.is_pending_deletion(sender_id)` to the `messages` INSERT policy if that matters.
  - `is_pending_deletion(uuid)` is granted to `anon` (048, needed by the policies) and is SECURITY DEFINER, so anyone can ask whether a known user id is pending. User ids are already public, and a pending member's content visibly disappears; restructuring the policies to revoke it is optional.
  - `toApiError` returns an `Error` unchanged, so an unexpected RPC failure can show a raw database message in the delete flow's or restore screen's alert. Show the fixed sentence for any code outside the three deletion codes, and log the raw error.
  - A `REAUTH_USER_KEY` left by an abandoned Google re-auth lets a later `/delete-account?step=confirm` in the same tab open on the final step (the RPC's `reauth_required` still refuses). Store a timestamp with it and ignore stale ones.
  - `?scheduled=` is shown as given, so a crafted link can show any date to a signed-out visitor (text only).
  - The error sentences and "29 days" are repeated: `CONFIRM_AGAIN` and the delete fallback in `DeleteAccountFlow` copy `api/accountDeletion.ts`, and the Privacy and Help pages hardcode 29 days instead of `ACCOUNT_DELETION_GRACE_DAYS`. Export the sentences and interpolate the constant (or pin them together with a test).
  - `docs/product/features/sign-up-and-log-in.md` doesn't describe `?redirect=` on `/login` and `/auth/callback`, or the restore screen. PR 5's `account-deletion.md` should cover the gate; the redirect belongs in sign-up-and-log-in.
  - Tests worth adding: one integration test with the real `AuthProvider` and `Layout` for delete, then sign-out, then the scheduled card (and the sign-out-failure variant ending on the restore screen); `SIGNED_OUT` clearing the context, and the wrong-account path replacing the route only after its sign-out settles; `signInWithGoogle` failing and a non-credential password failure in the flow; `?step=confirm` with no stored key landing on Explain; `router.replace` rejecting inside `handleSignOut`; `isRecentSignIn` called with the session's access token; `conversations.test.ts` asserting table names and the `.in()` ids rather than relying on call order; the callback's unsafe-redirect test asserting a single push to `/feed`.
  - Between PR 3 and PR 4, mobile still shows a composer for a purged partner (PR 4 Task 4.5).
