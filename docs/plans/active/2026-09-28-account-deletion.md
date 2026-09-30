---
title: In-app account deletion
status: planned
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

- [ ] **Step 1: Write the check.**

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
 *      post, comment, like, follows, listing, event or RSVP. A moderator and
 *      the member themself still can.
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
  return data as Record<string, unknown>;
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
    expectCounts(
      ownerView,
      { profile: 1, post: 1, comment: 1, like: 1, listing: 1, event: 1, rsvp: 1 },
      'owner while pending'
    );

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

- [ ] **Step 2: Add the npm script.** In `package.json`, after the `test:security:listing-reports` line:

```json
    "test:security:account-deletion": "tsx scripts/security/account-deletion-smoke.ts",
```

- [ ] **Step 3: Run it and watch it fail.** Export the env first. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from `scripts/.env`. `SUPABASE_ANON_KEY` is `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local`.

Run: `npm run test:security:account-deletion`
Expected: exit code 1, and `FAIL: amr_signed_in_within (fresh password sign-in) failed: Could not find the function public.amr_signed_in_within…`

- [ ] **Step 4: Format and commit.**

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

- [ ] **Step 1: Write the migration.**

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

- [ ] **Step 2: Check each policy against its live condition.** Compare every `ALTER POLICY` with its condition under [Verified while planning](#verified-while-planning-2026-09-28). The original condition must survive unchanged, apart from the added visibility clause. The one intended exception: moderators can now see a pending member's active listings. The migration is applied and the check turns green in Task 1.5.

- [ ] **Step 3: Commit.**

```bash
git add supabase/migrations/048_account_deletion.sql
```

```bash
git commit -m "feat(db): add account deletion requests, restore and hiding (048)"
```

### Task 1.3: The function-execute check knows the new functions

**Files:**

- Modify: `scripts/security/function-execute-smoke.ts:36-57` (the three `RpcCall` lists)

- [ ] **Step 1: Add the new functions to the lists.** `cancel_account_deletion` comes straight after `request_account_deletion`, so the test member ends up active again.

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

- [ ] **Step 2: Commit.**

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

- [ ] **Step 1: Write the schema section.**

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

- [ ] **Step 2: Format, check and commit.**

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

- [ ] **Step 1: Run the gate** (see [How it runs](#how-it-runs)). The only code touched is in `scripts/`, so no workspace suites need to run. Run `npm run type-check`, `npm run lint`, `npm run docs:check` and `npm run lint:md`. Check every exit code.
- [ ] **Step 2: Review.** Dispatch a `code-reviewer` agent and a `security-reviewer` agent on `git diff master...HEAD`. Fix CRITICAL and HIGH in one `fix: address PR 1 review` commit; put the rest in [Follow-ups](#follow-ups-not-scheduled).
- [ ] **Step 3: Ship the draft.** Push with `git push -u origin feat/account-deletion-db`, open a **draft** PR against `master` with the template filled in, and request Copilot's review.
- [ ] **Step 4: Apply 048 to staging**, once the user asks for it directly. Use `apply_migration` with name `account_deletion`, then realign the tracker row:

```sql
UPDATE supabase_migrations.schema_migrations
   SET version = '048',
       statements = ARRAY['-- Canonical SQL: supabase/migrations/048_account_deletion.sql']
 WHERE name = 'account_deletion' AND version <> '048';
```

- [ ] **Step 5: Run the live checks against staging.** Every one must exit 0:
  - `npm run test:security:account-deletion`
  - `npm run test:security:functions`
  - `npm run test:security:users-privilege`
  - `npm run test:security:users-pii`
  - `npm run test:security:emergency-post`
  - `npm run test:security:listing-reports`
  - `npm run test:security:chat-rls`

  If one fails, fix it forward in the same PR. Edit 048 and re-apply the changed statements with `execute_sql`, as 035 did.

- [ ] **Step 6: Run `get_advisors`** (security and performance). Any new warning about the new functions or policies gets fixed or recorded in Follow-ups with a reason.
- [ ] **Step 7:** Record in this plan and in memory that 048 is applied and realigned. The next migration number is 049.

---

## PR 2 — Purge: edge function and migration 049

Break this PR into steps when it starts. It needs 048 applied on staging.

**Files:**

- Create: `supabase/functions/purge-deleted-accounts/purge.ts`: the core, with no imports beyond types and no Deno APIs
- Create: `supabase/functions/purge-deleted-accounts/purge.test.ts`: `node:test` + `node:assert/strict`
- Create: `supabase/functions/purge-deleted-accounts/index.ts`: the Deno handler
- Modify: `supabase/config.toml`: `[functions.purge-deleted-accounts]` with `verify_jwt = false`
- Create: `supabase/migrations/049_purge_deleted_accounts_cron.sql`
- Create: `supabase/migrations/050_account_deletion_timing.sql`: restore closes at the date, the grace period becomes 29 days, the job runs hourly
- Create: `supabase/migrations/051_post_comments_delete_count.sql`: the missing `comments_count` delete trigger
- Create: `supabase/migrations/052_scrub_account_copies.sql`: `liker_id` on like notifications, and `scrub_account_copies(p_user_id)` for the purge
- Modify: `scripts/security/account-deletion-smoke.ts`: a cancel after the date is refused; a new date is 29 days out
- Modify: `scripts/security/account-purge-smoke.ts`: a purged member's comment lowers the other post's `comments_count`
- Modify: `package.json`: `"functions:test": "node --test \"supabase/functions/*/*.test.ts\""`, and add `npm run functions:test` to `test`, `test:ci` and `test:coverage:ci`, next to `guards:test`
- Docs: `docs/architecture/supabase-setup.md` (section 5, Scheduled jobs: the job, and a runbook for the secrets), `docs/architecture/database-schema.md` (049), this plan

**The core's interface** (`purge.ts`), which the handler wires to Supabase:

```ts
export type StorageObjectRef = { bucket_id: string; name: string };

export interface PurgeDeps {
  /** Users an hour past their date by the database's clock, oldest first (050). */
  listDueUserIds(limit: number): Promise<string[]>;
  /** Re-read before touching the user and again before deleting the auth user. */
  isStillDue(userId: string): Promise<boolean>;
  listStorageObjects(userId: string): Promise<StorageObjectRef[]>;
  /** Throws on failure. */
  removeObjects(bucketId: string, paths: string[]): Promise<void>;
  /** Throws on failure. */
  deleteAuthUser(userId: string): Promise<void>;
  logFailure(userId: string, error: unknown): void;
}

export type PurgeSummary = { purged: number; skipped: number; failed: number };

export const PURGE_BATCH_SIZE = 50;
export const STORAGE_REMOVE_CHUNK_SIZE = 100;

export async function purgeDueAccounts(deps: PurgeDeps): Promise<PurgeSummary>;

/** Constant-time string comparison for the x-purge-secret header. */
export function secretsMatch(provided: string, expected: string): boolean;
```

**A restore can't race the purge.** Re-reading the row doesn't close the gap before `deleteUser`, because a restore could still land after the last read. Instead, migration 050 closes restore at the date, and the purge only takes accounts an hour past it. The database decides both, by `now()`, so the two can't disagree. Once the purge can pick an account, no member can restore it. The re-reads stay, for service-role changes such as a support restore.

**Tasks:**

- **2.1 The purge core, test first.** Tests cover:
  - nothing due → `{0, 0, 0}` and no deletes
  - a user who is no longer due → skipped, with no storage or auth call
  - objects grouped by bucket and removed in chunks of 100, e.g. 250 objects in one bucket makes three calls
  - a storage failure → counted as failed, `deleteAuthUser` not called for that user, the next user still processed
  - an auth delete failure → counted as failed
  - success → `deleteAuthUser` called once per user
  - `secretsMatch`: equal, different, different length, empty
- **2.2 The handler (`index.ts`).**
  - `POST` only.
  - It reads `x-purge-secret` and compares it with `Deno.env.get('ACCOUNT_PURGE_SECRET')` using `secretsMatch`. It returns 401 if the secret is missing or wrong, and 500 if the env var isn't set.
  - It builds the deps from a service-role client:
    - `listDueUserIds`: `rpc('list_due_account_deletions', { p_limit })`
    - `isStillDue`: `rpc('is_due_for_purge', { p_user_id })`
    - `listStorageObjects`: `rpc('list_user_storage_objects')`
    - `removeObjects`: `storage.from(bucket).remove(paths)`, throwing on `error`
    - `deleteAuthUser`: `auth.admin.deleteUser`, throwing on `error`
  - It responds `200 { purged, skipped, failed }`. It logs ids and error messages only, never names or emails.
- **2.3 `config.toml`** gets `verify_jwt = false`. The shared secret is the auth, as with `send-push-notification`'s key check.
- **2.4 Migration 049.** One named `cron.schedule('purge-deleted-accounts', '0 9 * * *', $$ … $$)`.
  - The job body calls `net.http_post`:
    - `url`: `(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/purge-deleted-accounts'`
    - headers: `Content-Type: application/json` and `x-purge-secret` from the Vault secret `account_purge_secret`
    - `body`: `'{}'::jsonb`
  - The header comment follows the 046 style: problem, what it does, why Vault, idempotent, how to verify, rollback (`cron.unschedule('purge-deleted-accounts')`).
  - No secret values appear in the file.
- **2.4a Migration 050, test first.**
  - `scripts/security/account-deletion-smoke.ts` gets two checks:
    - Set a pending user's date to the past with the service role, then call `cancel_account_deletion` as that user. It must raise `deletion_in_progress` and leave the date in place.
    - A new request's date is 29 days out.
  - `CREATE OR REPLACE FUNCTION public.cancel_account_deletion()` keeps 048's body, but first locks the row and reads the date. If the date is `<= now()`, it raises `deletion_in_progress` (`P0001`). The grants carry over. `CREATE OR REPLACE` keeps them.
  - `CREATE OR REPLACE FUNCTION public.request_account_deletion()` with `c_grace_period := interval '29 days'`.
  - `list_due_account_deletions(p_limit)` and `is_due_for_purge(p_user_id)`, service role only: due at `now() - interval '1 hour'`. The purge calls these, so it never compares against its own clock. The live purge check has a member 30 minutes past their date, who must survive the run. `function-execute-smoke.ts` lists both as internal.
  - `cron.schedule('purge-deleted-accounts', '0 * * * *', …)` with 049's body. A named schedule replaces the job.
  - Header comment: the race it closes, the "within 30 days" arithmetic, and why it isn't a change to 048 or 049 (both already applied to staging).
- **2.4b Migration 051, test first.**
  - `scripts/security/account-purge-smoke.ts` gets a check. The throwaway user comments on another throwaway user's post. After the purge, that post's `comments_count` is back to what it was.
  - `decrement_post_comments_count_on_delete()`, `AFTER DELETE ON post_comments FOR EACH ROW`. When `OLD.is_deleted = false`, it runs `comments_count = GREATEST(0, comments_count - 1)` on `OLD.post_id`. Copy the existing `post_likes` delete trigger's form and grants (041: trigger functions get no grant).
  - `function-execute-smoke.ts` doesn't list trigger functions (041's default privileges cover them), so it needs no change.
- **2.4c Migration 052, test first (spec §4.6).**
  - `account-purge-smoke.ts`: the waiting member gets a message and a comment notification from the due member, and their shared conversation's `last_message` is the due member's. After the purge, both notifications are gone, and `last_message` is the waiting member's own last message.
  - `function-execute-smoke.ts` lists `scrub_account_copies` as internal.
  - `CREATE OR REPLACE FUNCTION public.notify_on_new_like()` with 004's body, plus `'liker_id', NEW.user_id` in `data`.
  - `scrub_account_copies(p_user_id uuid)`, `service_role` only, as the spec describes.
  - The purge core gains a `scrubCopies(userId)` dep, called after the second re-read and before `deleteAuthUser`, with node tests for it: called once per purged user; a failure counts as failed and skips `deleteAuthUser`.
- **2.5 Wire `functions:test`** into the root scripts listed under Files.
- **2.6 The runbook** in `supabase-setup.md` §5, for each environment:
  1. Generate a secret locally with `openssl rand -hex 32`.
  2. `npx supabase secrets set ACCOUNT_PURGE_SECRET=<value> --project-ref <ref>`.
  3. In the SQL editor, `select vault.create_secret('<value>', 'account_purge_secret');` and `select vault.create_secret('https://<ref>.supabase.co', 'project_url');`.
  4. To check it: `select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'purge-deleted-accounts') order by start_time desc limit 5;` and the function's logs.
  5. Secret values never go into a commit, a PR or a chat transcript.
- **2.7 Gate, reviews (`code-reviewer` + `security-reviewer`), draft PR.**
- **2.8 Staging rollout**, on the user's direct request:
  1. Deploy with `npx supabase functions deploy purge-deleted-accounts --project-ref tlusiongalvszftnzpoq`.
  2. The user sets the two secrets following the runbook.
  3. Apply 049 to 052 and realign their tracker rows. Apply 050 and 052 before deploying the function, which calls their functions.
  4. Manual run: create a throwaway user with an avatar and a post photo. Request deletion (signed in), then set `deletion_scheduled_for` to yesterday with the service role. POST to the function with the secret. Confirm the auth user, the profile row, the post and both storage objects are gone.

**Acceptance:**

- `npm run functions:test` passes locally and is part of `npm run test`.
- A POST without the secret gets 401.
- The manual staging run purges exactly the throwaway user.
- `cron.job` lists `purge-deleted-accounts`.

---

## PR 3 — Shared code and web

Break this PR into steps when it starts. It needs 048 and 050 applied on staging (PRs 1 and 2). The 29-day constant, `deletion_in_progress` and the "being deleted" state come from 050.

**Shared files and signatures:**

- Create: `packages/shared/src/constants/accountDeletion.ts`. There is no constants index, so export it from `packages/shared/src/index.ts` next to the other constants:

```ts
/** Days between a deletion request and the purge (050: c_grace_period). */
export const ACCOUNT_DELETION_GRACE_DAYS = 29;
/** How recent a sign-in request_account_deletion accepts (048: c_reauth_max_age_seconds). */
export const REAUTH_MAX_AGE_SECONDS = 600;
/** Message and ApiError code for a request without a recent sign-in. */
export const REAUTH_REQUIRED = 'reauth_required';
/** Message and ApiError code for a restore after the deletion date (050). */
export const DELETION_IN_PROGRESS = 'deletion_in_progress';
/** Shown in place of a chat partner who is pending deletion or purged. */
export const UNAVAILABLE_ACCOUNT_NAME = 'Unavailable account';
```

- Modify: `packages/shared/src/types/user.ts`. Add `deletion_scheduled_for: string | null;` to `User` under a `// Account deletion` comment. `PublicUser` is `Omit<User, …>`, so add the field to that `Omit` list too, or it leaks into `PublicUser` and the `baseUser: PublicUser` fixture in `PublicProfileHeader.test.tsx` stops type-checking. It is not added to `PUBLIC_USER_COLUMNS`. The web tsconfig includes `e2e/`, so `apps/web/e2e/fixtures/mock-data.ts` needs the field too.
- Modify: `packages/shared/src/api/conversations.ts` (and its test). Today `getConversations` takes the partner's name from `conversation_participants.name`, which stays visible while they are pending. It also skips a conversation with no partner row (`if (!other) continue`), so after the purge the conversation disappears and web's thread shows "Conversation not found". Change it to:
  - keep a conversation with no partner row, with `other_user_id: null`
  - add `other_user_available: boolean` to `ConversationWithParticipant`, false when the partner's `users` row didn't come back (pending or purged)
  - when unavailable, set `other_user_name` to `UNAVAILABLE_ACCOUNT_NAME`. The real name then can't leak through any reader: the web message log's `aria-label` and initials, the thread page's `<title>` and composer label, or mobile's route params.
  - throw on an error from the `users` lookup (`conversations.ts:85-88` ignores it today). Otherwise a failed query would mark every partner unavailable.
  - make `other_user_id` nullable, and update its readers (`useMessageThread`, the web and mobile list rows, and mobile's thread route params)
  - the nullable id breaks mobile's type-check in this PR: `ConversationListScreen.tsx:60`, `ChatStackParamList.otherUserId` (`navigation.ts:79`), and `blockUser(…, otherUserId)` in `MessageThreadScreen.tsx:275`. So PR 3 adds mobile's null guards, which hide Block for a purged partner, and runs the mobile tests in its gate. PR 4 builds the visible fallback on top.
  - typed fixtures that need `other_user_available`: `MessageLog.test.tsx`, `useConversations.test.ts`, `useMessageThread.test.ts`, `messages/[id].test.tsx`, `messages/index.test.tsx`
  - tests: a pending partner (`users` row missing, participant row present), a purged partner (both missing), a normal partner, and a `users` lookup error
- Create: `packages/shared/src/utils/safeRedirectPath.ts` (and `.test.ts`), exported from the package index: `safeRedirectPath(value: unknown, origin: string): string | null`. It returns null for anything that isn't a string, is empty, or contains whitespace or control characters. Otherwise it parses the value with `new URL(value, origin)` and returns `pathname + search + hash` only when the parsed origin equals `origin` and the value starts with a single `/`. Tests: plain path, path with a query, absolute URL, `//host`, `/\host`, `/\t/host`, `%09` and `%5C` forms after decoding, `javascript:`, empty, and not a string.
- Create: `packages/shared/src/logic/accountDeletion.ts` (and `.test.ts`), exported from `logic/index.ts`:

```ts
export type ReauthMethod = 'password' | 'google';

/** Newest amr timestamp (seconds) in a Supabase access token, or null if absent or unreadable. */
export function getLastSignInAt(accessToken: string): number | null;

/** True when the last sign-in is within REAUTH_MAX_AGE_SECONDS of nowMs. UI hint only; the server decides. */
export function isRecentSignIn(accessToken: string, nowMs?: number): boolean;

/** 'password' when the user has an email identity, otherwise 'google'. */
export function getReauthMethod(user: { app_metadata?: { providers?: string[] } }): ReauthMethod;

/** "October 28, 2026" for an ISO timestamp, in the given locale (default 'en-US'). */
export function formatDeletionDate(iso: string, locale?: string): string;
```

`getLastSignInAt` decodes the JWT payload with `atob` after base64url normalisation. Hermes, browsers and Node all have `atob`. It must never throw: a malformed token returns null.

- Create: `packages/shared/src/api/accountDeletion.ts` (and `.test.ts`), exported from `api/index.ts`:

```ts
export interface AccountDeletionResult {
  /** ISO timestamp of the scheduled purge. */
  data?: string;
  error?: Error;
}

export async function requestAccountDeletion(
  supabase: SupabaseClient
): Promise<AccountDeletionResult>;
export async function cancelAccountDeletion(supabase: SupabaseClient): Promise<{ error?: Error }>;

/** True for the error requestAccountDeletion returns when the user must sign in again. */
export function isReauthRequiredError(error: unknown): boolean;

/** True for the error cancelAccountDeletion returns once the deletion date has passed. */
export function isDeletionInProgressError(error: unknown): boolean;
```

A PostgREST error whose `message` is `reauth_required` becomes `new ApiError('Please confirm it’s you again.', { code: REAUTH_REQUIRED })`. From cancel, `deletion_in_progress` becomes `new ApiError('Your account is already being deleted.', { code: DELETION_IN_PROGRESS })`. Any other error goes through `toApiError(error, 'Couldn’t delete your account. Try again.')` (for cancel: `'Couldn’t restore your account. Try again.'`).

**Web tasks:**

- **3.1 Shared constants, type, logic and API**, test first, as specified above.
- **3.2 The delete flow component.**
  - `apps/web/src/components/account/DeleteAccountFlow.tsx` (+ `.module.css`, `.test.tsx`) with three steps:
    1. **Explain**, including the date `now + ACCOUNT_DELETION_GRACE_DAYS`.
    2. **Confirm it's you:** a password field using `signInWithPassword`, or a Continue with Google button.
    3. **Final confirm.**
  - The Google path stores the current user id in `sessionStorage` under `nepally.deleteAccount.userId`. It calls `signInWithGoogle` with `redirectTo: <origin>/delete-account?step=confirm` and `prompt: 'select_account'`.
  - That redirect skips `/auth/callback`, so `finishSignIn` never runs. If the other Google account has no Nepally profile, `AuthContext`'s profile stays null. So compare the stored id with `session.user.id`, never with the profile.
  - On a mismatch, sign that session out locally. Show "You signed in as a different account. Sign in again as yourself." Offer `/login?redirect=/delete-account`, and delete nothing.
  - The step 2 → 3 transition is skipped when `isRecentSignIn(session.access_token)`.
  - `profile_not_found` from the request shows the `SUPPORT_EMAIL` fallback.
  - On success it signs out globally and lands on `/delete-account?scheduled=<iso>`.
    - `AuthContext.signOut()` takes no arguments and always ends with `router.replace('/')`, which would fight that route. So give it an optional destination, `signOut({ redirectTo })`.
    - `handleSignOut` also returns the error and keeps the session when Supabase's sign-out fails (`AuthContext.tsx:157-166`). Make it fall back to `signOut({ scope: 'local' })`, so a failed global sign-out still signs this browser out.
    - Update `AuthContext.test.tsx` for both. supabase-js already signs out globally by default.
  - Tests cover every state in spec §7.
- **3.3 `apps/web/src/lib/auth.ts`.** `signInWithGoogle` accepts an optional `redirectTo` and an optional `prompt`, passed as `queryParams`. The existing callers are unchanged, and a test covers the new arguments.
- **3.4 The `/delete-account` page.**
  - `apps/web/src/pages/delete-account.page.tsx` (+ `.test.tsx`) is public.
  - Signed in, it renders `DeleteAccountFlow`. A pending member gets the restore screen from the gate (3.5), as on every other page.
  - Signed out with `?scheduled=`, it shows "Your account will be deleted on _date_. Sign in before then to restore it."
  - Signed out without it, it explains the process and links to `/login?redirect=/delete-account` and the `SUPPORT_EMAIL` fallback.
- **3.4a A return path for login.** None exists today. `login.page.tsx` sends a signed-in visitor, and a successful sign-in, to `/feed`. `lib/authCallback.ts` routes a Google sign-in only to `/feed` or `/onboarding/zip`.
  - Login reads `?redirect=` through the shared `safeRedirectPath` (above).
  - Login starts Google sign-in through `hooks/useGoogleSignIn.ts`, not `signInWithGoogle` directly. The hook takes the redirect, and carries it on the OAuth `redirectTo` as `/auth/callback?redirect=…`. Update its test.
  - `callback.page.tsx` subscribes once with the router from its first render. The page is statically optimised, so `router.query` is `{}` then. Read `redirect` from `window.location.search` instead, and pass it through `safeRedirectPath`.
  - The callback honours the redirect once onboarding is complete. Onboarding still comes first.
  - Tests: login with a safe and an unsafe parameter, the hook, and the callback with a safe, unsafe and missing parameter.
- **3.5 The restore gate.**
  - `apps/web/src/components/account/AccountRestoreScreen.tsx` (+ test) has two buttons: **Restore my account** (`cancelAccountDeletion`, then refresh the profile in `AuthContext`) and **Keep deletion and sign out**.
  - Once `deletion_scheduled_for` has passed, or when Restore gets `isDeletionInProgressError`, it shows "Your account is being deleted" with only a sign-out button.
  - The app shell renders it in place of the page whenever the profile has `deletion_scheduled_for`. Only the public legal pages stay reachable. `/delete-account` is gated too, or a pending member could skip Restore through its sign-in link. Nothing needs it open: after the request the member is signed out, and the Google re-auth returns before the account is pending. Put it in `Layout.tsx`, which already reads auth.
  - `AuthContext` must expose `deletion_scheduled_for`. It comes with `getMyProfile()` once the type is updated.
  - Web push: `AuthContext` calls `requestWebPushPermission` on sign-in. It must wait until the profile has loaded, and skip a pending account. The request removed that account's tokens, and signing out doesn't remove a new one. After a successful restore, register again. Cover both in `AuthContext.test.tsx`.
- **3.6 The Settings entry.** Add `{ label: 'Delete account', href: '/delete-account' }` to `getSettingsLinks` in `components/layout/navItems.ts`, and update `navItems.test.ts`.
- **3.7 The chat fallback.** When `other_user_available` is false, `ConversationRow.tsx` and `ThreadHeader.tsx` (and their tests) show the default avatar and no profile link. The name is already `UNAVAILABLE_ACCOUNT_NAME` from `getConversations`, which also covers `MessageLog.tsx` (its `aria-label` and initials) and `pages/messages/[id].page.tsx` (its `<title>` and composer label). When `other_user_id` is null (purged), `useMessageThread` loads the thread instead of reporting "Conversation not found", and the page hides the composer.
- **3.8 Moderation.** Today `useModerationQueue` batch-fetches only reported posts (`getPostsByIds`), and `ReportCard` gets only a `post` prop. So for a user or listing target it can't tell whether the target still exists.
  - Shared: next to `getPostsByIds` in `packages/shared/src/api/moderation.ts`, add `getExistingUserIds(supabase, ids)` and `getExistingListingIds(supabase, ids)`. Each selects `id` with `.in('id', ids)`, returns `{ data: string[] }` and short-circuits on an empty list. Tests: found, missing, empty list, error. A moderator sees pending accounts and their active listings (048), so only purged ones, and listings no longer active, come back missing.
  - `useModerationQueue`'s `fetchQueue` makes both calls alongside `getPostsByIds`, and the queue fails as a whole if any fails. It exposes a `missingTargetIds: Set<string>`. Update its test.
  - `moderation.page.tsx` passes `targetMissing` to `ReportCard`. For a missing user or listing, the card shows "Member no longer available" or "Listing no longer available", with no link and no **Ban user** button. The post branch already shows "Post no longer available". Add a `ReportCard` test for each target type, missing and present. The untyped `queue()` fixture in `moderation.test.tsx` needs `missingTargetIds`, or the page tests crash once the page calls `.has()`.
- **3.9 Legal copy.**
  - `privacy.page.tsx`, `help.page.tsx` and `terms.page.tsx` get the in-app steps, the 29-day grace period and restoring by signing in. Privacy and Help keep "within 30 days". Privacy also says that the apps stop showing photos right away, but a saved link to a photo keeps working until the photo is removed at the end of the grace period. The email fallback stays.
  - The Help page links to `/delete-account`.
  - Bump `LEGAL_LAST_UPDATED`, and update `legal.test.tsx`.
  - The text still needs counsel review, like the rest of the legal pages.
- **3.10 Docs.**
  - Amend `docs/decisions/2026-09-18-long-lived-sessions.md` line 29: Google and Apple accounts redo their provider sign-in, because `reauthenticate()` can't gate anything except a password change. Add a dated "Amended" note.
  - Fix the same "emailed code" claim in `docs/plans/active/2026-09-18-production-launch.md` (lines 33 and 221) and `docs/plans/active/mobile-usability-security-hardening.md` (line 142).
  - Update `docs/product/features/sign-up-and-log-in.md` if it describes Settings.
- **3.11 Gate, review, draft PR.** The gate includes the mobile tests and type-check, because of the null guards. End-to-end checks are deferred to PR 4.

**Acceptance:** a web member can delete their account on staging with a password and with Google. A second browser signed in as another member no longer sees them. Signing back in shows the restore screen, and Restore brings everything back.

---

## PR 4 — Mobile

Break this PR into steps when it starts. It needs 048 and 050 applied and PR 3 merged, for the shared code.

**Tasks:**

- **4.1 `DeleteAccountScreen`.**
  - `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx` (+ test) has the same three steps as web.
  - Password re-auth uses `pauseAuthListener` / `resumeAuthListener` around `signInWithPassword`, the way `ChangePasswordScreen.tsx:66-100` does.
  - Google re-auth calls `services/auth/googleAuth.ts` with `prompt: 'select_account'`, then compares the returned session's user id with the one from before. `googleAuth.ts` exchanges the code straight into the live session. So on a mismatch, sign that session out and send the member to sign in again, as on web.
  - `profile_not_found` shows the `SUPPORT_EMAIL` fallback.
  - Mobile `AuthContext.signOut` ignores Supabase's `{ error }` (`AuthContext.tsx:210-219`). Make it fall back to `signOut({ scope: 'local' })`, and test it.
  - Every async handler checks `navigation.isFocused()` before navigating or alerting, the same guard #109 added to chat starts.
  - On success it shows an alert, "Your account will be deleted on _date_. Sign in before then to restore it.", then signs out globally (falling back to local) and runs `clearAllData()`.
  - Tests cover every state in spec §7, following the golden rules in `apps/mobile/CLAUDE.md`.
- **4.2 Navigation.**
  - Add `DeleteAccount: undefined` to the profile stack's param list in `apps/mobile/src/types/navigation.ts`, and the screen to `ProfileNavigator.tsx`. Export both new screens from `screens/profile/index.ts`, because `ProfileNavigator` imports from that barrel.
  - Add `AccountRestore: undefined` to `RootStackParamList` for the gate in 4.4. `RootNavigator` imports `AccountRestoreScreen` from its own file, not the barrel, which would pull in every profile screen (`RootNavigator.test.tsx:12-30` avoids that on purpose).
  - Add a "Delete account" item to the Profile dropdown menu in `ProfileScreen.tsx:411-428`, after Change Password. Update `ProfileScreen.test.tsx`.
- **4.3 `AccountRestoreScreen`.** `apps/mobile/src/screens/profile/AccountRestoreScreen.tsx` (+ test): **Restore my account** calls `cancelAccountDeletion` then refreshes the profile; **Keep deletion and sign out** signs out. After the date, or on `isDeletionInProgressError`, it shows "Your account is being deleted" with only Sign out, as on web.
- **4.4 The `RootNavigator` gate.** When `user?.deletion_scheduled_for` is set, show `AccountRestoreScreen` in place of onboarding and the main tabs. Update `RootNavigator.test.tsx`.
  - Mobile `AuthContext` declares its own `User` interface and copies a fixed list of fields from `getMyProfile()` (`AuthContext.tsx:13` and `:105-121`). So the column is loaded but dropped. Add it to both, or switch the context to the shared `User`.
  - Push: `AuthContext` calls `registerPushTokenForUser` on sign-in, before `refreshUser()` loads the profile. Move registration after the profile loads, skip it for a pending account, and register after a successful restore. Update `AuthContext.test.tsx`.
- **4.5 The chat fallback.** In `components/chat/ConversationItem.tsx` and `screens/chat/MessageThreadScreen.tsx` (and their tests), `other_user_available: false` shows the default avatar, and doesn't open a profile. The name is already `UNAVAILABLE_ACCOUNT_NAME`. These components get the partner only through props and route params, so pass the flag through both. A purged partner (`other_user_id: null`) hides the composer. PR 3's null guards already hide Block.
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

- **RLS cost.** `is_pending_deletion` is a SECURITY DEFINER function, so Postgres can't inline it and runs one primary-key lookup per row it checks. That's fine at launch scale. If feed queries slow down, replace it with a join against a partial index, or cache pending ids per statement. Recorded here, not scheduled.
- **Web has no central route guard.** The restore gate is new ground (3.5). Keep it one component with its own test, not scattered page checks.
- **Purge secrets are manual per environment.** Until the runbook is followed, the cron job fails and nobody is purged. The production launch checklist must include the runbook.
- **Google re-auth can't force a password.** `prompt: 'select_account'` makes Google show its chooser, so re-auth never completes silently. But Google has no `prompt` that demands a password. Whoever holds a browser signed in to that Google account passes. That still needs that Google account on that device, which is what the ADR asks for (spec §6).

## Follow-ups (not scheduled)

- A confirmation email when deletion is requested (needs custom SMTP).
- Locking a pending member's photos during the grace period. The buckets are public, so a saved URL keeps working until the purge (spec §6).
- Blocking a banned member from signing up again with the same email after the purge.
- Data export before deletion.
