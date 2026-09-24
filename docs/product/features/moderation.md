# Moderation

**Last Updated:** 2026-09-24 (web UI overhaul PR 9b)

What the moderator queue at `/moderation` does on web today. Access and the server-side rules come from `supabase/migrations/035_emergency_post_moderation.sql`:
- Emergency posts start as `pending`.
- Three or more reports auto-hide a post.
- Bans go through the `moderate_user()` RPC.

## Who sees it

Only members with `is_moderator`. Anyone else who opens the page sees "Moderator access required", and nothing is loaded.

## The queue

There are two sections:

- **Pending posts:** Emergency submissions and auto-hidden reported posts, oldest first. Each card shows the title (a link to the post), the author's public name, the place and age, a preview of up to 280 characters, the tags, then Approve and Remove.
- **Open reports:** newest first. Each card is headed by the reason ("Spam"), then the reporter's note and what was reported. What the card offers depends on the target:
  - **A post:** its title (or "Post no longer available"), a View post link, and Dismiss, Remove post and Ban author.
  - **A member:** a View member link, and Dismiss and Ban user.
  - **A chat message:** a note that the content is private, and Dismiss only.

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
