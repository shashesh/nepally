---
title: In-app account deletion (web and mobile)
status: planned
created: 2026-09-28
---

# In-app account deletion (web and mobile)

**Date:** 2026-09-28
**Status:** Design spec, awaiting review
**Author:** Brainstormed with the user; written by Claude Code
**Related docs:**

- [plans/active/2026-09-18-production-launch.md](../plans/active/2026-09-18-production-launch.md) (W3, store compliance)
- [decisions/2026-09-18-long-lived-sessions.md](../decisions/2026-09-18-long-lived-sessions.md) (re-auth for sensitive actions)
- [architecture/migration-workflow.md](../architecture/migration-workflow.md)

---

## 1. Summary

Both app stores require apps that create accounts to let people delete them in the
app. Google Play also wants a web page where people can ask for deletion without
the app. Today Nepally only offers deletion by email to support.

This spec adds a delete flow to web and mobile. A request starts a 29-day grace
period. During it the account is hidden from other members, and signing in offers
a choice to restore it. After 29 days a scheduled job deletes the auth user, which
cascades to all of their data, and removes their photos from storage.

## 2. Decisions

| #   | Decision                                                                                                         | Why                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 29-day grace period, then a hard delete                                                                          | Accidental deletions can be undone. The privacy policy promises removal "within 30 days". 29 days plus an hourly purge keeps that promise (§4.4). Restoring is possible until the date, not after it.                                                                                                                                         |
| D2  | During the grace period the account is hidden: profile, posts, comments, listings, events, likes, RSVPs, follows | A "deleted" person's posts shouldn't stay up for a month. Chats keep their history and show the person as an unavailable account. Photos stay at their public URLs until the purge (§6).                                                                                                                                                      |
| D3  | Signing in during the grace period asks: restore, or keep the deletion and sign out                              | A stray sign-in, or someone else with the password, can't silently undo the request.                                                                                                                                                                                                                                                          |
| D4  | Before a request, the user must have signed in within the last 10 minutes. The database checks this.             | The long-lived sessions ADR makes deletion a sensitive action. The check reads the JWT `amr` claim, so a stolen, still-open session can't delete the account.                                                                                                                                                                                 |
| D5  | Email accounts re-enter their password. Google-only accounts redo Google sign-in.                                | `supabase.auth.reauthenticate()` sends a code, but the code can only be checked by a password change (`updateUser`), so it can't gate deletion. Emailed sign-in codes would need custom SMTP, which isn't set up yet. This amends the ADR (see §9).                                                                                           |
| D6  | Request and cancel are Postgres functions. The purge is an edge function run hourly by pg_cron.                  | Request and cancel need no service role and no deploy. Only the purge needs the Storage API, because files can't be deleted from SQL without leaving the stored blobs behind.                                                                                                                                                                 |
| D7  | Stripe is the payment record. Our promotion rows go at the purge.                                                | No Stripe customer is stored and there are no subscriptions. `listing_promotions` holds each promotion's cost and its Stripe checkout session and payment intent ids. They stay during the grace period and the purge's cascade deletes them. Stripe keeps the payment records, which covers the privacy policy's "may keep payment records". |

## 3. What exists today

- **Everything cascades.** `public.users.id` references `auth.users(id) ON DELETE CASCADE`. Every user-linked table references `public.users` with `ON DELETE CASCADE`. The two exceptions use `SET NULL`: `conversations.creator_id` and `reports.reviewed_by`. So `auth.admin.deleteUser(id)` already removes the profile, posts, comments, likes, saves, messages, conversation memberships, events and RSVPs, listings and their saves, views and contacts, promotions, follows, blocks, notifications, device tokens, settings and saved locations.
- **One reference with no foreign key:** `reports.target_id`, which points at a post, comment, listing or user.
- **Storage doesn't cascade.** There are four public buckets. Every object has `owner_id` set. A public bucket serves files by URL with no RLS check (027).
  - `avatars`: `<uid>.jpg` at the root
  - `post-photos`, `event-photos`, `listing-photos`: `<uid>/<file>`
- **Delete triggers keep most counters right:** `event_rsvps`, `post_likes`, `saved_listings` and `user_follows` each have one. `post_comments` has only an INSERT trigger and a soft-delete UPDATE trigger. So a hard delete, which is what the purge's cascade does, leaves `posts.comments_count` too high. Migration 051 adds the missing trigger (§4.5).
- **Chat names are copies.** `conversation_participants.name` holds each member's name, and `getConversations` shows the partner's name from it. Only the photo and trust level come from `users`. It also drops a conversation whose partner has no participant row.
- **Feed, search and metro pulse** queries run as the caller (security invoker), so RLS applies to them.
- **Scheduling infrastructure:** `pg_cron`, `pg_net` and `supabase_vault` are installed on staging.
- **No Settings screen on either platform.** Web uses the profile page's "Settings & more" list (`getSettingsLinks` in `apps/web/src/components/layout/navItems.ts`). Mobile uses the Profile dropdown menu (`ProfileScreen.tsx`) and `ProfileNavigator`.
- **Google sign-in** uses `signInWithOAuth` on both platforms: `apps/web/src/lib/auth.ts` and `apps/mobile/src/services/auth/googleAuth.ts`.

## 4. Server design

### 4.1 Migration `048_account_deletion.sql`

**Column.** `users.deletion_scheduled_for timestamptz NULL`. Null means the account
is active. Add a partial index `WHERE deletion_scheduled_for IS NOT NULL`. Add the
column to `guard_user_privileged_columns()` (from 034) so it can only change
through the functions below.

The index is a plain `CREATE INDEX` inside 048, not a `CONCURRENTLY` migration of
its own. [migration-workflow.md](../architecture/migration-workflow.md#adding-a-migration-going-forward)
step 6 exempts a fresh database, and production will replay 048 onto empty tables.
On staging the `users` table holds only test accounts, and the new column is NULL in
every row, so the build blocks writes for milliseconds.

**`is_pending_deletion(uid uuid) RETURNS boolean`.** Stable, `SECURITY DEFINER`,
pinned `search_path`, executable by `anon` and `authenticated` because the policies
apply to every role. It returns true only when the user exists and has
`deletion_scheduled_for` set. It returns false for active and unknown users, the
convention the 041 function-execute check expects of policy helpers.

**RLS.** Each SELECT policy on these tables keeps its current condition, and that
condition is ANDed with a pending check: `NOT is_pending_deletion(<user column>)`,
or the row's user is the caller, or the caller is a moderator (`is_moderator()`).
Because it is ANDed, the check can only hide rows. It never shows a row the current
policy hides, such as an RSVP to an event whose RSVPs are private. `users` reads its
own column instead of calling the helper.

| Table                  | User column                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `users`                | `id`                                                                                                   |
| `posts`                | `author_id`                                                                                            |
| `post_comments`        | `author_id`                                                                                            |
| `marketplace_listings` | `owner_id`                                                                                             |
| `events`               | `organizer_id`                                                                                         |
| `event_rsvps`          | `user_id`                                                                                              |
| `post_likes`           | `user_id`                                                                                              |
| `user_follows`         | `follower_id` and `followee_id`. The row is hidden if either is pending, from everyone but moderators. |

All three views (`marketplace_listings_view`, `user_helper_scores` and
`listing_promotions_display`) run as the invoker and inherit the policies. Messages
and conversations don't change.

**`amr_signed_in_within(amr jsonb, max_age_seconds integer) RETURNS boolean`.**
Stable and pure, executable by `service_role` only. It is true when the newest
numeric `timestamp` in `amr` is at most `max_age_seconds` old, and false for an
empty, missing or malformed claim. It is a separate function so the live check can
test stale sign-ins, which a real session can't produce on demand.

**`request_account_deletion() RETURNS timestamptz`.** `SECURITY DEFINER`, executable
by `authenticated` only (the 041 grant pattern).

1. `auth.uid()` must not be null.
2. Recent sign-in: `amr_signed_in_within(auth.jwt()->'amr', 600)` must be true.
   Otherwise raise an error with a stable code the client can match: SQLSTATE
   `P0001` and message `reauth_required`.
3. If deletion is already pending, return the existing date. The function is
   idempotent.
4. Set `deletion_scheduled_for = now() + interval '30 days'`. Migration 050 changes
   this to 29 days (§4.4).
5. Delete the user's `device_tokens` rows, which covers mobile and web push.
6. Return the date.

**`cancel_account_deletion() RETURNS void`.** `SECURITY DEFINER`, `authenticated`
only. It sets `deletion_scheduled_for = NULL` for `auth.uid()`. It needs no recent
sign-in check, because reaching the restore screen already required signing in.
The apps register for push again only after a restore (§5.3, §5.4). Migration 050
(§4.4) makes it refuse once the date has passed.

**`get_my_profile()`** also returns `deletion_scheduled_for`.

**`list_user_storage_objects(uid uuid) RETURNS TABLE(bucket_id text, name text)`.**
`SECURITY DEFINER`, executable by `service_role` only. It selects from
`storage.objects` where `owner_id = uid::text`. The purge uses it to find every
object the user owns, whatever the path convention.

### 4.2 Edge function `purge-deleted-accounts`

- `verify_jwt = false` in `supabase/config.toml`. The caller must send
  `x-purge-secret`, compared in constant time with the `ACCOUNT_PURGE_SECRET`
  function secret (the same approach as `send-push-notification`).
- Uses a service-role client. Per run it selects up to 50 users whose
  `deletion_scheduled_for` is at least an hour in the past. The hour covers any
  clock drift between the function and the database. Then for each one:
  1. Re-reads the row and skips the user if it is no longer due.
  2. Calls `list_user_storage_objects`, groups the paths by bucket and removes
     them through the Storage API in chunks of 100.
  3. If storage removal succeeded, re-reads the row again, then calls
     `auth.admin.deleteUser(uid)`. The cascades do the rest.
  4. On any failure, logs the user id and error, then moves on. That user is
     retried on the next run.
- **A restore can't race the purge.** `cancel_account_deletion` refuses once the
  date has passed (§4.4), and the purge only takes accounts an hour past it. A
  member can't clear a due date, and without that no re-read could close the gap
  before `deleteUser`. The two re-reads still cover a service-role change, such as
  support restoring an account by hand. Files already removed when that happens
  stay gone, but the account survives.
- Responds with counts only (`purged`, `skipped`, `failed`). It never logs names or
  emails.
- The logic that picks and deletes users sits in a module that takes its clients as
  parameters, so it can be unit-tested without a network.

### 4.3 Migration `049_purge_deleted_accounts_cron.sql`

`cron.schedule('purge-deleted-accounts', '0 9 * * *', ...)` calls `net.http_post`.
The URL and secret are read at run time from `vault.decrypted_secrets`:
`project_url` and `account_purge_secret`. No secret goes in the repo. The Vault
secrets and the `ACCOUNT_PURGE_SECRET` function secret are set by hand in each
environment, following a runbook added to `supabase-setup.md` (§5, Scheduled jobs). Until they are
set, the job's HTTP call fails harmlessly and nothing is deleted. Migration 050 makes
the job hourly (§4.4).

### 4.4 Migration `050_account_deletion_timing.sql`

Review of the design, after 048 and 049 were applied to staging, found two timing
problems. Both are fixed in one new migration.

- **Restore closes at the date.** `cancel_account_deletion()` clears the date only
  while `deletion_scheduled_for > now()`. After that it raises
  `deletion_in_progress` (SQLSTATE `P0001`) and changes nothing. Signing in after
  the date, before the purge has run, shows "Your account is being deleted" (§5.5).
  Under 048 alone, a restore could land after the purge's last re-read and still
  lose the account.
- **"Within 30 days" holds.** `request_account_deletion()` sets the date 29 days
  out instead of 30, and the job runs hourly (`'0 * * * *'`) instead of daily. An
  account is purged at most about two hours after its date: the one-hour margin
  plus the wait for the next run. So removal lands about 29 days after the request.
  A failed purge is retried an hour later, well inside the 30 days. With a daily
  run, removal could land up to 25 hours after the date.

### 4.5 Migration `051_post_comments_delete_count.sql`

An `AFTER DELETE` trigger on `post_comments` decrements `posts.comments_count` when
the deleted comment wasn't already soft-deleted. The soft-delete trigger has already
counted those. It clamps at zero, like the soft-delete trigger. It covers the purge's
cascade and any other hard delete.

## 5. Client design

### 5.1 Shared (`packages/shared`)

- **Constants:** `ACCOUNT_DELETION_GRACE_DAYS = 29`, `REAUTH_MAX_AGE_SECONDS = 600`.
- **Types:** `deletion_scheduled_for: string | null` on `User`, and left out of
  `PublicUser`.
- **Chat:** `getConversations` returns `other_user_available` and keeps
  conversations whose partner is gone (§5.6).
- **API** (`src/api/accountDeletion.ts`), taking a `SupabaseClient` and returning
  the usual `{ data, error }`:
  - `requestAccountDeletion(supabase)` returns the scheduled date. It maps
    `reauth_required` to a typed error code.
  - `cancelAccountDeletion(supabase)`. It maps `deletion_in_progress` to a typed
    error code.
- **Logic:**
  - `getLastSignInAt(accessToken)` returns the newest `amr` timestamp, or null.
  - `isRecentSignIn(accessToken, now)` lets the UI skip step 2 when the user has
    just signed in. The server check is the one that counts.
  - `getReauthMethod(user)` returns `'password'` when `app_metadata.providers`
    includes `email`, otherwise `'google'`.
  - `formatDeletionDate(iso)`.

### 5.2 The delete flow (web and mobile)

1. **Explain.** What is deleted: profile, posts, comments, the messages you sent,
   listings, events, photos. Messages other members sent you stay in their chats.
   Active promotions end with the listings. The account is hidden now and deleted
   on _date_. Signing in before then lets you restore it.
2. **Confirm it's you.**
   - Password: a password field, then `signInWithPassword` with the user's email.
     A wrong password shows "That password is incorrect."
   - Google: "Continue with Google". Before starting, store the current user id.
     After returning, if the user id differs, stop, show "You signed in as a
     different account", and delete nothing.
3. **Final confirm.** "Delete my account" calls `requestAccountDeletion`, then
   `signOut({ scope: 'global' })`, then clears local data. It ends on a signed-out
   screen: "Your account will be deleted on _date_. Sign in before then to restore
   it."

**Errors.**

- `reauth_required` returns to step 2 with "Please confirm it's you again."
- Network or server errors show a retry message. Nothing has changed.
- If the global sign-out fails after a successful request, sign out locally anyway.
  Other devices land on the restore screen.

### 5.3 Web

- **`/delete-account`** is a public page, and its URL is the one given to the Play
  Console.
  - Signed in: runs the flow above. Google re-auth redirects back to
    `/delete-account?step=confirm`.
  - Signed out: explains the process and offers "Sign in to delete your account",
    which returns to this page. It also gives the email fallback
    (`SUPPORT_EMAIL`). Login has no return path today: `/login` and the Google
    callback always go to `/feed`. This work adds a validated, same-origin return
    parameter to both.
- **Entry point:** a "Delete account" item in `getSettingsLinks`, pointing to
  `/delete-account`.
- **Restore gate:** web has no central route guard (pages redirect one by one). The
  app shell renders the restore screen in place of the page whenever the signed-in
  profile has `deletion_scheduled_for`. Public legal pages stay reachable. Web push
  registration waits until the profile has loaded and isn't pending.

### 5.4 Mobile

- **Entry point:** a "Delete account" item in the Profile dropdown menu opens a new
  `DeleteAccountScreen` in `ProfileNavigator`.
- **Re-auth:**
  - Password uses the `pauseAuthListener` / `resumeAuthListener` pattern from
    `ChangePasswordScreen`.
  - Google reuses `services/auth/googleAuth.ts`.
- **Restore gate:** `RootNavigator` gains a branch. When the user's profile has
  `deletion_scheduled_for`, it shows `AccountRestoreScreen` in place of onboarding
  or the main tabs. Mobile `AuthContext` copies a fixed list of profile fields, so
  it must add this one.
- **Push:** today mobile registers a push token on every sign-in, before the
  profile loads. It must wait for the profile and skip a pending account.

### 5.5 Restore screen (both platforms)

"Your account is scheduled for deletion on _date_." It has two actions:

- **Restore my account** calls `cancelAccountDeletion`, then refreshes the profile.
- **Keep deletion and sign out** signs out.

Once the date has passed, the screen says "Your account is being deleted" and offers
only Sign out. A restore that gets `deletion_in_progress` switches to that state.

### 5.6 Chat fallback (both platforms)

The partner's participant row can't signal this. It keeps their name while they are
pending, and it is gone after the purge, which today drops the whole conversation
(§3). So `getConversations` decides instead:

- The partner is **unavailable** when their `users` row isn't visible. That covers
  pending (hidden by RLS) and purged (deleted).
- A conversation with no partner row is kept, with `other_user_id: null`, instead of
  dropped.
- It returns `other_user_available: false` for both.

The list and the thread show "Unavailable account" with a neutral avatar and no
profile link. After the purge the thread has no composer, since nobody would get the
message. While the partner is pending, messages can still be sent (§6).

### 5.7 Legal copy

- `/privacy`: add the in-app steps, the 29-day grace period and restoring by
  signing in. Say that photos are removed at the end of the grace period. Keep
  "within 30 days" and the paragraph on records kept by law.
- `/help`: add the same steps, and link to `/delete-account`.
- `/terms`: add the same steps.
- Update `legal.test.tsx` to match.
- The email route stays as a fallback on all three pages.

## 6. Edge cases

- **Banned users** can delete their account, because both stores require it. After
  the purge their email can sign up again. Blocking ban evasion is out of scope
  (§10).
- **Reports** whose `target_id` points at purged content or a purged profile: the
  moderation queue shows the target as "no longer available", the wording it
  already uses for a missing post. It shows no link and no ban action, and must not
  crash. A moderator can't tell a purged listing from one that is sold or removed,
  so the wording doesn't claim which.
- **Paid promotions:** hidden with the listing during the grace period, deleted at
  the purge. Refund wording belongs to the lawyer's promotion refund text, not
  this flow.
- **Counters:** follower, like, RSVP, save and comment counts include a pending
  user until the purge, when the delete triggers decrement them (comments from
  051). This is accepted.
- **Push while pending:** the request deletes the device tokens. Signing in during
  the grace period doesn't register them again until the member restores. So
  "Keep deletion and sign out" leaves no token behind.
- **Signing in after the date, before the purge runs:** restore is closed
  (§4.4). The restore screen says the account is being deleted.
- **Messages sent to a pending user** stay in the conversation. The pending user
  sees them after restoring. After the purge the other member keeps the
  conversation and the messages they sent. The cascades on `messages.sender_id`
  and `conversation_participants.user_id` delete the purged user's own messages
  and participant row.
- **Photos during the grace period.** The buckets are public, so hiding the rows
  doesn't lock the files. The apps stop showing the profile, post, event and
  listing photos, because the rows that hold their URLs are hidden. But anyone who saved a photo's URL can still open it
  until the purge removes the file. That includes the avatar URL
  (`avatars/<uid>.jpg`) for anyone who knows the user id. Locking the files would
  mean moving them to a private bucket and back on restore. That is a follow-up,
  not part of this work.

## 7. Testing

- **Checked on staging while planning (2026-09-28):** a refreshed access token keeps
  its original `amr` timestamp. Two refreshes of a password sign-in each gave a new
  `iat`, but the same `amr` entry. D4 holds.
- **Shared unit tests:** `amr` parsing, `isRecentSignIn`, `getReauthMethod`,
  `formatDeletionDate`, and the API wrappers (success, `reauth_required`, generic
  error).
- **Live database check** `npm run test:security:account-deletion` (in
  `scripts/security/`, like the existing checks). It creates throwaway users on
  staging and verifies:
  - `amr_signed_in_within` accepts a recent sign-in and rejects stale, empty and
    malformed claims
  - a request right after signing in succeeds, is idempotent, and removes the
    device tokens
  - a direct `UPDATE` of `deletion_scheduled_for` is blocked
  - another member can't see the pending user's profile, posts, comments,
    listings, events, likes, RSVPs or follows, while a moderator still can
  - cancelling restores visibility
  - once the date has passed, cancelling raises `deletion_in_progress` and keeps
    the date (050)
  - a new request's date is 29 days out (050)
- **Live purge check** `npm run test:security:account-purge`: besides removing the
  user, their files and their rows, a purged member's comment on another member's
  post lowers that post's `comments_count` (051).
- **Shared unit tests for chat:** `getConversations` marks a hidden or purged partner
  unavailable and keeps the conversation.
- **Edge function unit tests** with injected clients:
  - nothing is due
  - the due cutoff is an hour before now
  - a user who is no longer due is skipped
  - a storage failure skips that user and continues
  - on success, `deleteUser` is called once per user
- **Manual staging run** of the purge on one throwaway user whose date is set in the
  past. Confirm the auth user, rows and objects are gone.
- **Web (vitest) and mobile (jest) screen tests:**
  - the delete flow: signed out, password, Google, wrong account, `reauth_required`,
    network error, success
  - the restore screen: restore and sign out
  - the gates
  - the menu entries
  - the chat fallback
  - the legal copy
- **End-to-end checks** run once, at the end of the last PR.

## 8. Rollout

| PR  | Contents                                                                                                            | Notes                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Migration 048 and the `test:security:account-deletion` check                                                        | Apply to staging when the user asks, then realign the tracker row to `048`.       |
| 2   | `purge-deleted-accounts` edge function, `config.toml` entry, migrations 049 to 051, and the Vault runbook           | Deploy the function and set the secrets on staging. Then do the manual purge run. |
| 3   | Shared constants, types, API and logic; the web flow, `/delete-account`, restore gate, chat fallback and legal copy | Needs PR 1 applied on staging.                                                    |
| 4   | Mobile `DeleteAccountScreen`, `AccountRestoreScreen`, the `RootNavigator` gate, menu entry and chat fallback        | Needs PRs 1 and 3.                                                                |

The production Supabase project doesn't exist yet. When it is created, migrations
048 to 051, the function and the secrets go with the rest of the setup.

## 9. Documentation changes

- **Amend** `decisions/2026-09-18-long-lived-sessions.md`: Google and Apple accounts
  confirm who they are by redoing their provider sign-in, not with
  `reauthenticate()`, which can only gate password changes. Fix the same claim in
  `plans/active/2026-09-18-production-launch.md` (lines 33 and 221) and
  `plans/active/mobile-usability-security-hardening.md` (line 142).
- **Add** `product/features/account-deletion.md` when PR 4 ships, then archive
  this spec.
- **Update** `architecture/database-schema.md` (the new column, functions and
  policies) and `architecture/supabase-setup.md` (the cron job and the Vault
  runbook).
- **Tick** the launch plan's W3 row.

## 10. Out of scope

- A confirmation email when deletion is requested. It needs custom SMTP.
- Locking a pending member's photos during the grace period (§6).
- Blocking banned users from signing up again with the same email after the purge.
- Data export before deletion.
- Sign in with Apple. It is a separate W3 item, but its re-auth follows D5.
