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

This spec adds a delete flow to web and mobile. A request starts a 30-day grace
period. During it the account is hidden from other members, and signing in offers
a choice to restore it. After 30 days a scheduled job deletes the auth user, which
cascades to all of their data, and removes their photos from storage.

## 2. Decisions

| #   | Decision                                                                                                         | Why                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 30-day grace period, then a hard delete                                                                          | Accidental deletions can be undone. The privacy policy already promises removal "within 30 days".                                                                                                                                                   |
| D2  | During the grace period the account is hidden: profile, posts, comments, listings, events, likes, RSVPs, follows | A "deleted" person's posts shouldn't stay up for a month. Chats keep their history and show the person as an unavailable account.                                                                                                                   |
| D3  | Signing in during the grace period asks: restore, or keep the deletion and sign out                              | A stray sign-in, or someone else with the password, can't silently undo the request.                                                                                                                                                                |
| D4  | Before a request, the user must have signed in within the last 10 minutes. The database checks this.             | The long-lived sessions ADR makes deletion a sensitive action. The check reads the JWT `amr` claim, so a stolen, still-open session can't delete the account.                                                                                       |
| D5  | Email accounts re-enter their password. Google-only accounts redo Google sign-in.                                | `supabase.auth.reauthenticate()` sends a code, but the code can only be checked by a password change (`updateUser`), so it can't gate deletion. Emailed sign-in codes would need custom SMTP, which isn't set up yet. This amends the ADR (see §9). |
| D6  | Request and cancel are Postgres functions. The purge is an edge function run daily by pg_cron.                   | Request and cancel need no service role and no deploy. Only the purge needs the Storage API, because files can't be deleted from SQL without leaving the stored blobs behind.                                                                       |
| D7  | Payment records aren't kept in our database                                                                      | No Stripe customer is stored and there are no subscriptions. Stripe keeps the payment records, which covers the privacy policy's "may keep payment records".                                                                                        |

## 3. What exists today

- **Everything cascades.** `public.users.id` references `auth.users(id) ON DELETE CASCADE`. Every user-linked table references `public.users` with `ON DELETE CASCADE`. The two exceptions use `SET NULL`: `conversations.creator_id` and `reports.reviewed_by`. So `auth.admin.deleteUser(id)` already removes the profile, posts, comments, likes, saves, messages, conversation memberships, events and RSVPs, listings and their saves, views and contacts, promotions, follows, blocks, notifications, device tokens, settings and saved locations.
- **One reference with no foreign key:** `reports.target_id`, which points at a post, comment, listing or user.
- **Storage doesn't cascade.** There are four public buckets. Every object has `owner_id` set.
  - `avatars`: `<uid>.jpg` at the root
  - `post-photos`, `event-photos`, `listing-photos`: `<uid>/<file>`
- **Delete triggers keep counters right:** `event_rsvps`, `post_likes`, `saved_listings` and `user_follows` each have one.
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

**`is_account_active(uid uuid) RETURNS boolean`.** Stable, `SECURITY DEFINER`, pinned
`search_path`. It returns false only when the user exists and has
`deletion_scheduled_for` set.

**RLS.** Each SELECT policy on these tables gains "the row's user is the caller,
or the caller is a moderator (`is_moderator()`), or `is_account_active(<user
column>)`":

| Table                  | User column                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `users`                | `id`                                                                |
| `posts`                | `author_id`                                                         |
| `post_comments`        | `author_id`                                                         |
| `marketplace_listings` | `owner_id`                                                          |
| `events`               | `organizer_id`                                                      |
| `event_rsvps`          | `user_id`                                                           |
| `post_likes`           | `user_id`                                                           |
| `user_follows`         | `follower_id` and `followee_id` (hide the row if either is pending) |

The listing view (`marketplace_listings_view`) runs as the invoker and inherits the
policies. The implementation plan confirms the same for `user_helper_scores` and
`listing_promotions_display`. Messages and conversations don't change.

**`request_account_deletion() RETURNS timestamptz`.** `SECURITY DEFINER`, executable
by `authenticated` only (the 041 grant pattern).

1. `auth.uid()` must not be null.
2. Recent sign-in: the newest `timestamp` in `auth.jwt()->'amr'` must be within
   600 seconds of `now()`. Otherwise raise an error with a stable code the client
   can match: SQLSTATE `P0001` and message `reauth_required`.
3. If deletion is already pending, return the existing date. The function is
   idempotent.
4. Set `deletion_scheduled_for = now() + interval '30 days'`.
5. Delete the user's `device_tokens` rows, which covers mobile and web push.
6. Return the date.

**`cancel_account_deletion() RETURNS void`.** `SECURITY DEFINER`, `authenticated`
only. It sets `deletion_scheduled_for = NULL` for `auth.uid()`. It needs no recent
sign-in check, because reaching the restore screen already required signing in.
Push registration happens again on the next app start.

**`get_my_profile()`** also returns `deletion_scheduled_for`.

**`list_user_storage_objects(uid uuid) RETURNS TABLE(bucket_id text, name text)`.**
`SECURITY DEFINER`, executable by `service_role` only. It selects from
`storage.objects` where `owner_id = uid::text`. The purge uses it to find every
object the user owns, whatever the path convention.

### 4.2 Edge function `purge-deleted-accounts`

- `verify_jwt = false` in `supabase/config.toml`. The caller must send
  `x-purge-secret`, compared in constant time with the `ACCOUNT_PURGE_SECRET`
  function secret (the same approach as `send-push-notification`).
- Uses a service-role client. Per run it selects up to 50 users with
  `deletion_scheduled_for <= now()`, then for each one:
  1. Re-reads the row and skips the user if they restored since the select.
  2. Calls `list_user_storage_objects`, groups the paths by bucket and removes
     them through the Storage API in chunks of 100.
  3. If storage removal succeeded, calls `auth.admin.deleteUser(uid)`. The
     cascades do the rest.
  4. On any failure, logs the user id and error, then moves on. That user is
     retried on the next run.
- Responds with counts only (`purged`, `skipped`, `failed`). It never logs names or
  emails.
- The logic that picks and deletes users sits in a module that takes its clients as
  parameters, so it can be unit-tested without a network.

### 4.3 Migration `049_purge_deleted_accounts_cron.sql`

`cron.schedule('purge-deleted-accounts', '0 9 * * *', ...)` calls `net.http_post`.
The URL and secret are read at run time from `vault.decrypted_secrets`:
`project_url` and `account_purge_secret`. No secret goes in the repo. The Vault
secrets and the `ACCOUNT_PURGE_SECRET` function secret are set by hand in each
environment, following a runbook added to `migration-workflow.md`. Until they are
set, the job's HTTP call fails harmlessly and nothing is deleted.

## 5. Client design

### 5.1 Shared (`packages/shared`)

- **Constants:** `ACCOUNT_DELETION_GRACE_DAYS = 30`, `REAUTH_MAX_AGE_SECONDS = 600`.
- **Types:** `deletion_scheduled_for: string | null` on the profile type.
- **API** (`src/api/accountDeletion.ts`), taking a `SupabaseClient` and returning
  the usual `{ data, error }`:
  - `requestAccountDeletion(supabase)` returns the scheduled date. It maps
    `reauth_required` to a typed error code.
  - `cancelAccountDeletion(supabase)`.
- **Logic:**
  - `getLastSignInAt(accessToken)` returns the newest `amr` timestamp, or null.
  - `isRecentSignIn(accessToken, now)` lets the UI skip step 2 when the user has
    just signed in. The server check is the one that counts.
  - `getReauthMethod(user)` returns `'password'` when `app_metadata.providers`
    includes `email`, otherwise `'google'`.
  - `formatDeletionDate(iso)`.

### 5.2 The delete flow (web and mobile)

1. **Explain.** What is deleted: profile, posts, comments, messages, listings,
   events, photos. Active promotions end with the listings. The account is hidden
   now and deleted on _date_. Signing in before then lets you restore it.
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
    (`SUPPORT_EMAIL`).
- **Entry point:** a "Delete account" item in `getSettingsLinks`, pointing to
  `/delete-account`.
- **Restore gate:** web has no central route guard (pages redirect one by one). The
  app shell renders the restore screen in place of the page whenever the signed-in
  profile has `deletion_scheduled_for`. Public legal pages stay reachable.

### 5.4 Mobile

- **Entry point:** a "Delete account" item in the Profile dropdown menu opens a new
  `DeleteAccountScreen` in `ProfileNavigator`.
- **Re-auth:**
  - Password uses the `pauseAuthListener` / `resumeAuthListener` pattern from
    `ChangePasswordScreen`.
  - Google reuses `services/auth/googleAuth.ts`.
- **Restore gate:** `RootNavigator` gains a branch. When the user's profile has
  `deletion_scheduled_for`, it shows `AccountRestoreScreen` in place of onboarding
  or the main tabs.

### 5.5 Restore screen (both platforms)

"Your account is scheduled for deletion on _date_." It has two actions:

- **Restore my account** calls `cancelAccountDeletion`, then refreshes the profile.
- **Keep deletion and sign out** signs out.

### 5.6 Chat fallback (both platforms)

When a conversation's other participant comes back empty, show "Unavailable
account" with a neutral avatar and no profile link. This happens while their
deletion is pending (hidden by RLS) and after the purge (their participant row is
gone).

### 5.7 Legal copy

- `/privacy`: add the in-app steps, the 30-day grace period and restoring by
  signing in. Keep "within 30 days" and the paragraph on records kept by law.
- `/help`: add the same steps, and link to `/delete-account`.
- `/terms`: add the same steps.
- Update `legal.test.tsx` to match.
- The email route stays as a fallback on all three pages.

## 6. Edge cases

- **Banned users** can delete their account, because both stores require it. After
  the purge their email can sign up again. Blocking ban evasion is out of scope
  (§10).
- **Reports** whose `target_id` points at purged content or a purged profile: the
  moderation queue shows "Content deleted" and must not crash.
- **Paid promotions:** hidden with the listing during the grace period, deleted at
  the purge. Refund wording belongs to the lawyer's promotion refund text, not
  this flow.
- **Counters:** follower and like counts include a pending user until the purge,
  when the delete triggers decrement them. This is accepted.
- **Restore during a purge run:** the purge re-reads each row just before deleting.
- **Messages sent to a pending user** stay in the conversation. The pending user
  sees them after restoring. They stay after the purge too, because only the
  purged user's own messages cascade.

## 7. Testing

- **Checked first, on staging:** whether a refreshed access token keeps its original
  `amr` timestamp. D4 depends on it. If a refresh resets the timestamp, stop and
  redesign the recent sign-in check before building on it.
- **Shared unit tests:** `amr` parsing, `isRecentSignIn`, `getReauthMethod`,
  `formatDeletionDate`, and the API wrappers (success, `reauth_required`, generic
  error).
- **Live database check** `npm run test:security:account-deletion` (in
  `scripts/security/`, like the existing checks). It creates throwaway users on
  staging and verifies:
  - a request without a recent sign-in is rejected
  - a direct `UPDATE` of `deletion_scheduled_for` is blocked
  - another member can't see the pending user's profile, posts, comments,
    listings, events, likes, RSVPs or follows, while a moderator still can
  - cancelling restores visibility
- **Edge function unit tests** with injected clients:
  - nothing is due
  - a user who restored is skipped
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
| 1   | Migration 048, the `test:security:account-deletion` check, and the `amr` refresh check                              | Apply to staging after merge, then realign the tracker row to `048`.              |
| 2   | `purge-deleted-accounts` edge function, `config.toml` entry, migration 049, and the Vault runbook                   | Deploy the function and set the secrets on staging. Then do the manual purge run. |
| 3   | Shared constants, types, API and logic; the web flow, `/delete-account`, restore gate, chat fallback and legal copy | Needs PR 1 applied on staging.                                                    |
| 4   | Mobile `DeleteAccountScreen`, `AccountRestoreScreen`, the `RootNavigator` gate, menu entry and chat fallback        | Needs PRs 1 and 3.                                                                |

The production Supabase project doesn't exist yet. When it is created, migrations
048 and 049, the function and the secrets go with the rest of the setup.

## 9. Documentation changes

- **Amend** `decisions/2026-09-18-long-lived-sessions.md`: Google and Apple accounts
  confirm who they are by redoing their provider sign-in, not with
  `reauthenticate()`, which can only gate password changes.
- **Add** `product/features/account-deletion.md` when PR 4 ships, then archive
  this spec.
- **Update** `architecture/database-schema.md` (the new column, functions and
  policies) and `architecture/migration-workflow.md` (the Vault runbook).
- **Tick** the launch plan's W3 row.

## 10. Out of scope

- A confirmation email when deletion is requested. It needs custom SMTP.
- Blocking banned users from signing up again with the same email after the purge.
- Data export before deletion.
- Sign in with Apple. It is a separate W3 item, but its re-auth follows D5.
