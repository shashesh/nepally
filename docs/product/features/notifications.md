# Notifications

**Last Updated:** 2026-09-24 (web UI overhaul PR 9b)

What notifications do on web today. Push delivery is set up in migrations 009–012. The notification list and deep links were first designed in [the notifications wireframe](../../wireframes/15-notifications/15-notifications.md).

## What a member gets

A notification is one row in `notifications`, of type `post_response` (a comment or likes on their post), `emergency_alert` (a verified metro-wide broadcast), `system` or `message`. Chat has its own unread badge, so every web surface leaves out `message` notifications: the bell, the page and both counts. A realtime chat notification is dropped too, so it can't appear and then vanish on reload.

## The bell

The top bar's bell shows the unread count and the eight newest notifications. It stays current in these ways:

- **Realtime** delivers new notifications as they arrive.
- **A 30-second poll** and a refresh when the tab regains focus catch anything realtime misses.
- **`/notifications` switches the poll and realtime off** while it's open, because it has its own subscription. The bell reloads as soon as the member leaves.
- **The page signals the bell** after a mark-read, mark-all or delete, so the bell reloads at once instead of keeping its old count.

When loads overlap, only the latest answer is applied.

## The notifications page (`/notifications`)

- **Layout.** The heading is "Notifications". When anything is unread, the count ("3 unread") sits beside the heading, not inside it, and "Mark all as read" appears. A Preferences link opens the settings page.
- **Grouping.** Emergency alerts come first as one group, then one group per day: Today, Yesterday, then dates ("Mar 5", or "Mar 5, 2025" for another year). Each group is a labelled section. Mobile's notifications screen uses the same day labels since 2026-09-24 (it used "March 5" with no year, so one date in two years shared a section).
- **Rows.** Each row has its own Open and Delete buttons. Opening a notification goes straight to its post, event or conversation and marks it read in the background. If that mark fails, the row simply stays unread.
- **Paging.** More notifications load as the member scrolls, 20 at a time. The next page starts after the rows on screen, so a new notification arriving or a row being deleted never duplicates or skips one. A failed page says "Couldn't load more notifications." with Try again.
- **Live updates.** New notifications appear at the top as they arrive, including one that arrives while the page is still loading.
- **Failures are reported, never silent:**
  - A failed load: "Couldn't load your notifications." with Try again.
  - A failed delete: "Couldn't delete that notification. Please try again."
  - A failed mark-all: "Couldn't mark your notifications as read. Please try again."
  - Deleting an unread notification lowers the count.
- **Focus.** After a delete, focus moves to the row that took its place, or the Preferences link if the list is now empty. After Mark all as read removes its own button, focus moves to Preferences.
- **Empty state.** "You're all caught up".

## Preferences (`/profile/notifications`)

| Setting            | Choices                                        |
| ------------------ | ---------------------------------------------- |
| Push notifications | on / off                                       |
| Chat messages      | Every message, Batched (every 30 minutes), Off |
| Comments           | on / off                                       |
| Likes              | Every like, When 5 or more likes arrive, Off   |
| Emergency alerts   | always on                                      |

- **Defaults.** A member who has never saved gets the table's column defaults. These are `DEFAULT_USER_SETTINGS` in `packages/shared`.
- **A failed load** shows "Couldn't load your notification preferences." with Try again, and no form. Before PR 9b, the page showed the defaults, and Save wrote them over the member's real settings.
- **Saving.** Save stays focusable while it saves, then says "Preferences saved." or "Couldn't save your preferences. Please try again.", keeping the edits.
- **Accessibility.** Every switch and radio group is named by its label, and each switch's description is announced as its description.
