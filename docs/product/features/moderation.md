# Moderation

**Last Updated:** 2026-10-02 (reported members and listings that are gone, from account deletion)

What the moderator queue at `/moderation` does on web today. Access and the server-side rules come from `supabase/migrations/035_emergency_post_moderation.sql` and `047_report_auto_hide_threshold.sql`:

- Emergency posts start as `pending`.
- 100 reports auto-hide a post (it goes to `pending`). It was 3 until migration 047.
- 100 reports remove a listing (`removed`), even a deactivated one. The owner can't bring a removed listing back; for now a moderator restores it from the Supabase dashboard.
- Only members at Trust Level 1 or above can report.
- An author or owner can't reset a post's or listing's report count, or create one with a count already set.
- A report is always filed open. Only open reports count, so one member can't push content to 100 alone: each member has at most one open report per post or listing.
- Bans go through the `moderate_user()` RPC.

## Who sees it

Only members with `is_moderator`. Anyone else who opens the page sees "Moderator access required", and nothing is loaded.

## The queue

There are two sections:

- **Pending posts:** Emergency submissions and auto-hidden reported posts, oldest first. Each card shows the title (a link to the post), the author's public name, the place and age, a preview of up to 280 characters, the tags, then Approve and Remove.
- **Open reports:** newest first. Each card is headed by the reason ("Spam"), then the reporter's note and what was reported. What the card offers depends on the target:
  - **A post:** its title (or "Post no longer available"), a View post link, and Dismiss, Remove post and Ban author.
  - **A member:** a View member link, and Dismiss and Ban user. A member whose account was deleted shows "Member no longer available", with no link and no Ban user. A member still in their deletion grace period shows as usual, because moderators can still see them (see [account deletion](account-deletion.md)).
  - **A chat message:** a note that the content is private, and Dismiss only.
  - **A listing:** a View listing link, and Dismiss only. Removing a listing from the queue is not built yet. A listing the moderator can no longer read shows "Listing no longer available", with no link. That covers a deleted account's listing, and one that is sold or removed; the card doesn't say which.

Each section shows how many cards it holds ("3 waiting", "2 open").

If any part of the queue fails to load, the whole page says "Couldn't load the moderation queue." with Try again. Before PR 9b, a failed load looked like an empty queue, and a failed post lookup marked every reported post "Post no longer available".

## Actions

- **Approve** publishes a pending post. **Dismiss** closes a report with no action. Neither asks first.
- **Remove**, **Remove post** and **Ban** ask first, in a dialog that opens with focus on Cancel:
  - "Remove this post?" warns that the post will be taken down and won't appear in any feed.
  - "Ban {name}?" warns that their posts will be removed and they will no longer be able to post.
- **Removing a reported post** also closes its report as actioned, and drops the post from Pending posts if it was there.
- **A ban** closes the report as actioned. It also drops the member's pending posts from the queue, since `moderate_user()` removes them.
- **One action runs at a time.** While it runs, every action button stays focusable but inert, and the running one shows a spinner.
- **Results are sentences, never raw database errors.** Success: "Post approved and published.", "Report dismissed.", "Ram S. has been banned.". Failure: "Couldn't approve the post. Please try again.". A half-finished action says which half failed, for example "The post was removed, but the report couldn't be closed. Please try again."
- **Focus after an action.** When a card leaves, focus moves to the card that took its place, then the one before it, then the section heading. It never moves to a button, so a second Enter can't act on the next card by mistake.
