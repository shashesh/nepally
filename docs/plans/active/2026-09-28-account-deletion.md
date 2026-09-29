---
title: In-app account deletion
status: planned
created: 2026-09-28
spec: docs/specs/2026-09-28-account-deletion.md
---

# In-App Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members can delete their account from web and mobile. The account is hidden for 30 days, can be restored by signing in, and is then purged with all its data and photos.

**Architecture:** Migration 048 adds `users.deletion_scheduled_for`, the request and cancel functions, and RLS changes that hide a pending account. An edge function run daily by pg_cron (migration 049) removes the user's photos through the Storage API and deletes the auth user, whose cascades remove every row. Web and mobile add a three-step delete flow, a restore screen shown to pending accounts, and a chat fallback for accounts that are gone. See the [spec](../../specs/2026-09-28-account-deletion.md).

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

| PR  | Branch                          | Theme                                                                            | Needs      |
| --- | ------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| 1   | `feat/account-deletion-db`      | Migration 048 and the `test:security:account-deletion` check                     | spec PR    |
| 2   | `feat/account-deletion-purge`   | `purge-deleted-accounts` edge function, migration 049 (cron) and a Vault runbook | 1 applied  |
| 3   | `feat/account-deletion-web`     | Shared code, the web flow, `/delete-account`, restore gate, chat fallback, legal | 1 applied  |
| 4   | `feat/account-deletion-mobile`  | Mobile flow, restore screen, `RootNavigator` gate, chat fallback                 | 1, 3       |
| 5   | `docs/account-deletion-shipped` | Feature doc, archive the spec and this plan, tick the launch plan                | 1–4 merged |

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
  /** Re-read just before deleting: false if the user restored meanwhile. */
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

- [ ] **Step 1: Write the check.** Follow the helpers and style of `scripts/security/account-deletion-smoke.ts`. The same `requireEnv`, `randomToken`, `assertCondition`, `NO_SESSION_AUTH` and `signIn` shapes live in this file too, as they do in every other check.

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

- [ ] **Step 2: Add the npm script** after `test:security:account-deletion`:

```json
    "test:security:account-purge": "tsx scripts/security/account-purge-smoke.ts",
```

- [ ] **Step 3: Type-check it strictly.**

Run: `npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --module nodenext --moduleResolution nodenext --target es2022 --types node scripts/security/account-purge-smoke.ts`
Expected: exit 0. The check itself runs in Task 2.7, once the function is deployed and the secrets are set.

- [ ] **Step 4: Format and commit.**

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

- [ ] **Step 1: Rewrite §5's opening paragraph.**

```markdown
Scheduled work runs in the database on `pg_cron` (enabled by `001_schema.sql`). Migrations create the jobs. Most run SQL directly, so they have no public endpoint to protect and need no setup. The one exception is `purge-deleted-accounts`. It calls an edge function, because deleting stored files needs the Storage API, and that call needs the secrets below to be set once in each environment.
```

- [ ] **Step 2: Add the table row.**

```markdown
| `purge-deleted-accounts` | Daily, 09:00 UTC | POSTs to the `purge-deleted-accounts` edge function, which deletes accounts whose 30-day grace period has ended: their storage objects, then the auth user | `049` |
```

- [ ] **Step 3: Add the runbook** after the existing SQL block in §5:

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

4. For the live check, add `ACCOUNT_PURGE_SECRET=<secret>` to `scripts/.env` (git-ignored), then run `npm run test:security:account-purge`.
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

- [ ] **Step 4: Format, check and commit.**

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

- [ ] **Step 1: Run the gate.** Run `npm run type-check`, `npm run lint`, `npm run lint:guards`, `npm run guards:test`, `npm run functions:test`, `npm run docs:check` and `npm run lint:md`, plus the two strict `tsc` commands from Tasks 2.1 and 2.4. Check every exit code.
- [ ] **Step 2: Review.** Dispatch a `code-reviewer` agent and a `security-reviewer` agent on the PR 2 commits only. Fix CRITICAL and HIGH in one `fix: address PR 2 review` commit; put the rest in [Follow-ups](#follow-ups-not-scheduled). Tell reviewers about the column-privilege probe recorded in Follow-ups.
- [ ] **Step 3: Ship the draft.** Push with `git push -u origin feat/account-deletion-purge`. Open a **draft** PR against `master`, noting that it is stacked on #112, and request Copilot's review.

### Task 2.7: Staging rollout (needs the user)

Each step runs only when the user asks for it directly.

- [ ] **Step 1: Deploy the function.** Run `npx supabase functions deploy purge-deleted-accounts --project-ref tlusiongalvszftnzpoq`. The Supabase CLI is already logged in on this machine.
- [ ] **Step 2: The user sets the secrets**, following the runbook in `supabase-setup.md` §5. That's the function secret, the two Vault secrets, and `ACCOUNT_PURGE_SECRET` in `scripts/.env`. The secret value must not pass through the chat.
- [ ] **Step 3: Apply 049** with `apply_migration`, name `purge_deleted_accounts_cron`. Realign its tracker row to `049`. Check that `SELECT jobname, schedule, active FROM cron.job;` lists `purge-deleted-accounts | 0 9 * * * | t`.
- [ ] **Step 4: Run the live checks.** `npm run test:security:account-purge` and `npm run test:security:account-deletion` must both exit 0.
- [ ] **Step 5: Record it.** Note in this plan and in memory that 049 is applied and the function deployed. The next migration number is 050.

**Acceptance:**

- `npm run functions:test` passes and is part of `npm run test`.
- The live purge check passes on staging: a wrong secret gets 401, and a due account loses its auth user, profile and files, while a pending account whose date is still ahead is untouched.
- `cron.job` lists `purge-deleted-accounts`.

---

## PR 3 — Shared code and web

Break this PR into steps when it starts. It needs 048 applied on staging.

**Shared files and signatures:**

- Create: `packages/shared/src/constants/accountDeletion.ts`, exported from the constants index:

```ts
/** Days between a deletion request and the purge (048: c_grace_period). */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;
/** How recent a sign-in request_account_deletion accepts (048: c_reauth_max_age_seconds). */
export const REAUTH_MAX_AGE_SECONDS = 600;
/** Message and ApiError code for a request without a recent sign-in. */
export const REAUTH_REQUIRED = 'reauth_required';
```

- Modify: `packages/shared/src/types/user.ts`. Add `deletion_scheduled_for: string | null;` to `User` under a `// Account deletion` comment. It is not added to `PublicUser` or `PUBLIC_USER_COLUMNS`.
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
```

A PostgREST error whose `message` is `reauth_required` becomes `new ApiError('Please confirm it’s you again.', { code: REAUTH_REQUIRED })`. Any other error goes through `toApiError(error, 'Couldn’t delete your account. Try again.')` (for cancel: `'Couldn’t restore your account. Try again.'`).

**Web tasks:**

- **3.1 Shared constants, type, logic and API**, test first, as specified above.
- **3.2 The delete flow component.**
  - `apps/web/src/components/account/DeleteAccountFlow.tsx` (+ `.module.css`, `.test.tsx`) with three steps:
    1. **Explain**, including the date `now + ACCOUNT_DELETION_GRACE_DAYS`.
    2. **Confirm it's you:** a password field using `signInWithPassword`, or a Continue with Google button.
    3. **Final confirm.**
  - The Google path stores the current user id in `sessionStorage` under `nepally.deleteAccount.userId`. It calls `signInWithGoogle` with `redirectTo: <origin>/delete-account?step=confirm`. On return it compares ids and shows "You signed in as a different account" on a mismatch.
  - The step 2 → 3 transition is skipped when `isRecentSignIn(session.access_token)`.
  - On success it calls `signOut({ scope: 'global' })`, falling back to local. Then it routes to `/delete-account?scheduled=<iso>`.
  - Tests cover every state in spec §7.
- **3.3 `apps/web/src/lib/auth.ts`.** `signInWithGoogle` accepts an optional `redirectTo`. The existing callers are unchanged, and a test covers the new argument.
- **3.4 The `/delete-account` page.**
  - `apps/web/src/pages/delete-account.page.tsx` (+ `.test.tsx`) is public.
  - Signed in, it renders `DeleteAccountFlow`.
  - Signed out with `?scheduled=`, it shows "Your account will be deleted on _date_. Sign in before then to restore it."
  - Signed out without it, it explains the process and links to `/login?redirect=/delete-account` (use the login page's existing return-path parameter; check its name when this PR starts) and the `SUPPORT_EMAIL` fallback.
- **3.5 The restore gate.**
  - `apps/web/src/components/account/AccountRestoreScreen.tsx` (+ test) has two buttons: **Restore my account** (`cancelAccountDeletion`, then refresh the profile in `AuthContext`) and **Keep deletion and sign out**.
  - The app shell renders it in place of the page whenever the profile has `deletion_scheduled_for`. The public legal pages and `/delete-account` stay reachable. Put this in `_app.page.tsx` or `Layout.tsx`, whichever already reads the auth profile, and decide when the PR starts.
  - `AuthContext` must expose `deletion_scheduled_for`. It comes with `getMyProfile()` once the type is updated.
- **3.6 The Settings entry.** Add `{ label: 'Delete account', href: '/delete-account' }` to `getSettingsLinks` in `components/layout/navItems.ts`, and update `navItems.test.ts`.
- **3.7 The chat fallback.** In `components/messages/ConversationRow.tsx` and `ThreadHeader.tsx` (and their tests), when the other participant's profile is missing, show "Unavailable account" with the default avatar and no profile link. Check `pages/messages/[id].page.tsx` for other places that read the participant.
- **3.8 Moderation.** `components/moderation/ReportCard.tsx` shows "Content deleted" when a report's target is missing, instead of throwing. Add a test for each target type.
- **3.9 Legal copy.**
  - `privacy.page.tsx`, `help.page.tsx` and `terms.page.tsx` get the in-app steps, the 30-day grace period and restoring by signing in. The email fallback stays.
  - The Help page links to `/delete-account`.
  - Bump `LEGAL_LAST_UPDATED`, and update `legal.test.tsx`.
  - The text still needs counsel review, like the rest of the legal pages.
- **3.10 Docs.**
  - Amend `docs/decisions/2026-09-18-long-lived-sessions.md` line 29: Google and Apple accounts redo their provider sign-in, because `reauthenticate()` can't gate anything except a password change. Add a dated "Amended" note.
  - Update `docs/product/features/sign-up-and-log-in.md` if it describes Settings.
- **3.11 Gate, review, draft PR.** End-to-end checks are deferred to PR 4.

**Acceptance:** a web member can delete their account on staging with a password and with Google. A second browser signed in as another member no longer sees them. Signing back in shows the restore screen, and Restore brings everything back.

---

## PR 4 — Mobile

Break this PR into steps when it starts. It needs PR 1 applied and PR 3 merged, for the shared code.

**Tasks:**

- **4.1 `DeleteAccountScreen`.**
  - `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx` (+ test) has the same three steps as web.
  - Password re-auth uses `pauseAuthListener` / `resumeAuthListener` around `signInWithPassword`, the way `ChangePasswordScreen.tsx:66-100` does.
  - Google re-auth calls `services/auth/googleAuth.ts` and compares the returned user id with the one from before.
  - Every async handler checks `navigation.isFocused()` before navigating or alerting, the same guard #109 added to chat starts.
  - On success it shows an alert, "Your account will be deleted on _date_. Sign in before then to restore it.", then signs out globally (falling back to local) and runs `clearAllData()`.
  - Tests cover every state in spec §7, following the golden rules in `apps/mobile/CLAUDE.md`.
- **4.2 Navigation.**
  - Add `DeleteAccount: undefined` to the profile stack's param list in `apps/mobile/src/types/navigation.ts`, and the screen to `ProfileNavigator.tsx`.
  - Add a "Delete account" item to the Profile dropdown menu in `ProfileScreen.tsx:411-428`, after Change Password. Update `ProfileScreen.test.tsx`.
- **4.3 `AccountRestoreScreen`.** `apps/mobile/src/screens/profile/AccountRestoreScreen.tsx` (+ test): **Restore my account** calls `cancelAccountDeletion` then refreshes the profile; **Keep deletion and sign out** signs out.
- **4.4 The `RootNavigator` gate.** When `user?.deletion_scheduled_for` is set, show `AccountRestoreScreen` in place of onboarding and the main tabs. Update `RootNavigator.test.tsx`. Check that `AuthContext` loads the profile through `getMyProfile()`, so the column arrives.
- **4.5 The chat fallback.** In `components/chat/ConversationItem.tsx` and `screens/chat/MessageThreadScreen.tsx` (and their tests), a missing participant shows "Unavailable account", the default avatar, and doesn't open a profile.
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
- **Google re-auth may not prompt.** If the browser is still signed in to Google, re-auth can complete without a prompt. It still needs that Google account on that device, which is what the ADR asks for. A stricter `prompt` parameter is a follow-up if review asks for it.

## Follow-ups (not scheduled)

- A confirmation email when deletion is requested (needs custom SMTP).
- Blocking a banned member from signing up again with the same email after the purge.
- Data export before deletion.
- From the PR 1 review:
  - `amr_signed_in_within()` relies on the default `SECURITY INVOKER`. Sibling migrations such as 046 write it out. The re-created 034 guard keeps its original header on purpose.
  - The `profile_not_found` branch of `request_account_deletion()` has no live-check coverage. Every signed-in member has a profile row, so it only guards against drift.
  - On Windows, every `scripts/security/*.ts` failure path exits 127, not 1. `process.exit(1)` races the Supabase client's handles and trips a libuv assertion. Any non-zero exit still means FAIL. A shared fix, such as setting `process.exitCode` and letting the event loop drain, would touch all the checks.
- Both PR 1 reviewers flagged the `users` policy as reading a column clients have no SELECT grant on. That is a false positive. A rolled-back probe on staging (2026-09-28) showed that Postgres doesn't check column privileges for columns used only inside a policy. `anon` and `authenticated` read the granted columns normally.
- `users-pii-smoke.ts` fails about 28% of the time, and has since before 048. Its fixture names end in `<timestamp>-<6 random base-36 chars>`. When the random part starts with a digit, Postgres's parser reads `-5abc12` as the signed integer `-5` plus `abc12`, but `build_prefix_tsquery` splits on the hyphen and searches `5abc12:*`, so `search_people` misses the fixture. Fix the fixture: start the random part with a letter. The same split affects any real name containing `-<digit>`, which is rare, so no search change is scheduled.
