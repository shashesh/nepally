# Account Deletion

**Last Updated:** 2026-10-02 (shipped in PRs #111–#115)

What deleting an account does on web and mobile today. Both app stores require in-app deletion for apps that create accounts, and Google Play also wants a web page that works without the app. The design and its reasoning are in the archived [spec](../../archive/specs/2026-09-28-account-deletion.md) and [plan](../../archive/plans/2026-09-28-account-deletion.md). The plan's Follow-ups section is this feature's backlog.

## In short

A member asks to delete their account and confirms it's them. The account is hidden from other members right away and deleted 29 days later. Signing in before that date offers to restore it. After the date an hourly job removes their photos and the copies of their words in other members' notifications and chat previews, then deletes the account itself, which takes every row of their data with it. The privacy policy promises removal "within 30 days", and this keeps that promise.

## Where to find it

- **Web:** Profile → Settings & more → **Delete account**, which opens `/delete-account`. Anyone can open that page signed out, and it is the URL for the Play Console's data-deletion field.
- **Mobile:** the Profile menu → **Delete Account**, which opens `DeleteAccountScreen` in the profile stack.

## The delete flow (both apps)

1. **Delete your account.** It says what goes: the profile and photos, posts and comments, the messages the member sent (messages others sent them stay in those members' chats), and their listings and events (active promotions end with the listings). It gives the date, 29 days out, and "Sign in before then to restore it." It names the account: "Signed in as _email_". Continue or Cancel.
2. **Confirm it's you.** If the member signed in within the last 10 minutes, Continue skips this step.
   - **An account with a password** enters it. A wrong one says "That password is incorrect."; other failures use the log-in sentences from [sign-up and log-in](sign-up-and-log-in.md#error-sentences). If the account has Google too, "Continue with Google" is offered under "or". A forgotten password gets the support address: "Email <support@nepally.us> from your account's email address and we'll delete it for you."
   - **A Google-only account** presses "Continue with Google". Google always shows its account chooser (`prompt=select_account`).
   - **Choosing a different Google account** signs that account out of the browser or device and deletes nothing. Web returns to `/delete-account` with "You signed in as a different account. Sign in again as yourself to delete your account." Mobile shows an alert: "You signed in as a different account" and "Nothing was deleted. Sign in again as yourself." Web keeps the member's user id in `sessionStorage` across the Google round trip to tell the accounts apart. If the browser blocks site storage, Google doesn't start, and the step says why.
3. **Delete your account?** It names the account again and says it will be hidden now and deleted on _date_. **Delete my account** schedules the deletion and signs out every device.
   - **Web** lands on `/delete-account?scheduled=…`: "Your account will be deleted on _date_. Sign in before then to restore it."
   - **Mobile** returns to the welcome screen under an alert: "Account scheduled for deletion".

**When it fails.**

| What happened                                                              | The member sees                                                                                                                                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The sign-in is older than 10 minutes (`reauth_required`)                   | Back to step 2, with "Please confirm it's you again."                                                                                                                              |
| The account has no profile row (`profile_not_found`)                       | "We couldn't delete this account here. Email <support@nepally.us> from your account's email address and we'll delete it for you."                                                  |
| Anything else (network, server)                                            | "Couldn't delete your account. Please try again." Nothing has changed.                                                                                                             |
| Web: the deletion went through, but signing out failed                     | A toast: "Your account will be deleted on _date_, but we couldn't sign you out. Choose "Keep deletion and sign out" to try again." The restore screen then takes the flow's place. |
| Mobile: the session no longer belongs to the member when they press Delete | Signed out of this device, with the different-account alert. Nothing is deleted.                                                                                                   |

Failures are logged as `account_delete_failed`, `account_delete_reauth_failed` (with the method, and `wrong_account` or `storage_blocked` when that's the reason) and `account_delete_session_read_failed`.

## The server side

- **The request** is the `request_account_deletion()` function (migration 048, timing from 050). It needs a sign-in within the last 10 minutes, read from the token's `amr` claim, which a token refresh doesn't reset. It sets `users.deletion_scheduled_for` 29 days out, deletes the member's push tokens, and returns the date. Asking again returns the same date. Members can't set the column any other way.
- **What is hidden.** While the date is set, the profile, posts, comments, listings, events, likes, RSVPs and follows are hidden from everyone but the member and moderators. That includes signed-out visitors and the views built on those tables. Counts such as followers and likes still include the member until the purge.
- **What isn't hidden.** Chats keep their history, and other members can still send them messages, which the member sees if they restore. Their photos stay at their public URLs until the purge, so a saved link keeps working. The privacy policy says so.
- **Restore** is `cancel_account_deletion()`. It needs no recent sign-in, because the request signed out every session. It works until the date. After that it refuses with `deletion_in_progress` and changes nothing.

Schema details are in [database-schema.md](../../architecture/database-schema.md), "Account deletion (migration 048)".

## Signing in during the grace period

Whatever the member opens, they see the restore screen first: web's `Layout` and mobile's `RootNavigator` show it in place of every page. On web, only the footer's legal pages (Privacy Policy, Terms of Service, Guidelines and Help Center) stay readable. `/delete-account` is gated too, so its sign-in link can't skip Restore.

- **Before the date:** "Your account is scheduled for deletion" and "It will be deleted on _date_. Restore it to keep using Nepally." **Restore my account** clears the date and reloads the profile, and the app carries on as normal. **Keep deletion and sign out** signs out.
- **After the date, before the purge runs:** "Your account is being deleted" and "Its deletion date has passed, so it can no longer be restored." Only **Sign out** is offered. A screen left open past the date switches by itself, and so does a Restore the server refuses.
- **If the restore went through but the profile didn't reload,** web says "We couldn't confirm the restore. Please refresh the page." and mobile says "…Close and reopen the app." A failed restore says "Couldn't restore your account. Please try again." These are logged as `account_restore_reload_failed` and `account_restore_failed`.
- **Push.** Neither app registers a push token for a pending account. Restoring registers it again, on every device the member opens.

## The public page (`/delete-account`)

- **Signed out:** "Delete your Nepally account". It explains the 29 days and what is removed, and offers **Sign in to delete your account**, which goes to `/login?redirect=/delete-account` and comes back to the flow. "Can't sign in?" gives the support address, with the subject "Delete my account".
- **Signed in:** the delete flow above.
- **Pending deletion:** the restore screen.

## The purge

An hourly `pg_cron` job, `purge-deleted-accounts` (migrations 049 and 050), calls the edge function of the same name. Each run takes up to 50 accounts whose date passed at least an hour ago, oldest first, by the database's clock. The hour means a restore that started just before the date can't race the purge. For each account it:

1. removes every storage object the member owns, in all four photo buckets, through the Storage API;
2. deletes other members' message, comment and like notifications that name them, and resets each chat preview they wrote to the other member's last message, or empties it (`scrub_account_copies`, 052);
3. deletes the auth user. Every table cascades from it, and the delete triggers count down comments, likes, follows, RSVPs and saves (051 added the comment trigger).

A failure at any step leaves that account for the next run. The function returns only counts (`purged`, `skipped`, `failed`) and never logs names or emails. Push notifications already on a phone can't be recalled.

The job's URL and secret live in Vault, and the function's secret is set by hand in each environment, following [supabase-setup.md](../../architecture/supabase-setup.md#5-scheduled-jobs), "Scheduled Jobs". Until both are set, the job fails every hour and no account is purged in that environment.

## What other members see

- **Content** from a pending member disappears from feeds, search, profiles, events and the marketplace, and comes back if they restore.
- **Chat:** the partner shows as "Unavailable account", with an initials avatar and no profile link or Block. After the purge the thread keeps the messages sent to them, and says "This account has been deleted, so it can't get new messages." in place of the composer. See [in-app chat](in-app-chat.md).
- **Moderation:** moderators still see a pending member's profile and content. Once a reported member or listing is gone, the report card says "Member no longer available" or "Listing no longer available", with no link and no Ban user. See [moderation](moderation.md).

## Known limits

These are deliberate, or recorded in the plan's Follow-ups:

- No confirmation email is sent when deletion is requested. That needs custom SMTP.
- Photos stay at their public URLs during the grace period.
- A banned member can sign up again with the same email once their account is purged.
- There is no data export before deletion.
- Google re-auth can't demand a password. Whoever holds a browser or phone signed in to that Google account passes it, as the [long-lived sessions ADR](../../decisions/2026-09-18-long-lived-sessions.md) accepts.
- The restore screen is a screen, not a permission check. A pending member's own rows are still writable through the API, so a message they send still reaches the other member, from "Unavailable account".

## Where it's tested

- **Shared:** `constants/accountDeletion.test.ts`, `logic/accountDeletion.test.ts`, `api/accountDeletion.test.ts`, `utils/redirect.test.ts` and `api/conversations.test.ts` (unavailable partners).
- **Web:** `components/account/DeleteAccountFlow.test.tsx` and `AccountRestoreScreen.test.tsx`, `pages/delete-account.test.tsx` and `components/Layout.test.tsx` (the gate).
- **Mobile:** `screens/profile/DeleteAccountScreen.test.tsx` and `AccountRestoreScreen.test.tsx`, `navigation/RootNavigator.test.tsx` (the gate), and the Maestro flow `.maestro/flows/07-delete-and-restore.yaml`, which needs a dev build.
- **Edge function:** `npm run functions:test` runs the purge's unit tests with injected clients.
- **Live checks on staging:** `npm run test:security:account-deletion` (request, hiding, restore) and `npm run test:security:account-purge` (a real purge, refused on any project but staging). See [setup-and-testing.md](../../guides/setup-and-testing.md).
