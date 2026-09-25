# Web UI System

**Last updated:** 2026-09-24
**Applies to:** `apps/web` only. Design rationale: [../specs/2026-09-14-web-ui-overhaul-design.md](../specs/2026-09-14-web-ui-overhaul-design.md).

The web app uses one design language, **H1 · Ink & Marigold**. It combines editorial type (Gambarino headings, Switzer body), warm paper neutrals and borders instead of shadows. Ink navy carries every action. Marigold is a sparing accent, and crimson is reserved for Emergency.

## Files

| File | Role |
|---|---|
| `apps/web/src/styles/tokens.css` | Source of truth: primitive and semantic tokens |
| `apps/web/src/styles/globals.css` | Reset, base elements, focus ring, reduced motion |
| `apps/web/src/styles/mantine-theme.ts` | Mantine theme mirroring the tokens, plus the variant and CSS-variable resolvers |
| `apps/web/src/styles/mantine-components.module.css` | Theme-level class hooks for Mantine components |
| `apps/web/src/styles/fonts.ts`, `components/layout/FontVariables.tsx` | Self-hosted fonts wired into `--font-display` / `--font-body` |

## Tokens

- **Primitives** (`--ink-*`, `--marigold-*`, `--paper-*`, `--moss-*`, `--crimson-*`, `--amber-*`) only feed semantic tokens.
- **CSS Modules use semantic tokens only**, enforced by `npm run lint:guards`:
  - Surfaces, text and borders: `--surface-{0,1,2,sunken}`, `--text-{1,2,3}`, `--border-{subtle,solid}`
  - Actions: `--action-bg`, `--action-bg-hover`, `--action-fg`
  - Accent: `--accent` (never text), `--accent-tint`, `--accent-ink`
  - Trust tiers: `--trust-{new,verified,contributor}-{fg,bg}`
  - Status: `--emergency-{fg,bg,border}`, `--success`, `--warning`, `--danger`
  - Topic dots: `--tag-<slug>`
  - Event types: `--event-<type>-{fg,bg}`, selected through a `data-type` attribute
  - Marketplace categories: `--category-<slug>-{fg,bg}`, selected through a `data-category` attribute. Five only — migration 016 consolidated the original twelve, and `components/marketplace/categoryTheme.ts` maps anything retired to `other` before it reaches the DOM
- **Type:** `--font-display`, `--font-body`, `--font-size-{xs,sm,base,lg,xl,display}`, `--font-weight-{regular,medium,semibold,bold}`, `--leading-*`, `--tracking-*`.
- **Space:** `--space-1…9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- **Radius:** `--radius-{chip,tag,control,card,overlay,full}`.
- **Layout widths:** `--layout-content-width` (800px) for a column of text; `--layout-content-width-wide` (960px) for a page whose content is a multi-column grid, such as the marketplace.
- **Elevation:** borders by default. Only floating layers get `--shadow-float` (menus, popovers, dropdowns) or `--shadow-modal`. A card in the page's flow (`PostCard`, the feed's sponsored card, `SummaryRow`, `EventCard`, `ListingCard`) answers hover and focus-within by changing its border to `--border-solid`, never by lifting.
- **Motion:** `--duration-fast`, `--duration-base`, `--ease-out`. Non-essential motion is disabled under `prefers-reduced-motion`.
- **Breakpoints:** in CSS Modules use `$mantine-breakpoint-sm` (48em), `-md` (62em) and `-lg` (75em), never pixel literals.

### Adding or changing a token

**Check the name against `tokens.css` before using it.** Nothing catches a `var(--x)` that resolves to nothing: the guard checks for colour literals and legacy names, not for whether a property exists, so a misspelling silently falls back to the inherited value. PR 8a shipped twelve of them — `--weight-semibold` for `--font-weight-semibold`, `--text-sm` for `--font-size-sm` (`--text-1/2/3` are *colours*), `--radius-pill` for `--radius-full`.

1. Edit `tokens.css` and keep every colour inside sRGB.
2. If it is used for text, add its pair to `tokens.contrast.test.ts`.
3. If Mantine needs it, mirror it in `mantine-theme.ts` and extend `mantine-theme.test.ts`.
4. Re-baseline screenshots (see "Testing").

## Fonts

Gambarino (400) and Switzer (400/500/600) are self-hosted through `next/font/local` under the ITF Free Font License. `FontVariables` sets `--font-display` and `--font-body` with `html:root`, and `tokens.css` keeps readable fallbacks. Gambarino has a single weight, and `font-synthesis: none` stops browsers faking bold.

## Mantine

- `primaryColor: 'ink'` (shade 8 = `--action-bg`). `marigold` is available for accents.
- `variantColorResolver` renders `light` variants as a solid tint with shade-9 text, so the Mantine 9 change is invisible.
- `cssVariablesResolver` points Mantine's body, text, dimmed, border and disabled variables at semantic tokens. A disabled control is `--surface-2` with `--text-3` text and a `--border-subtle` border, not Mantine's cool grey.
- `focusClassName: 'nepally-focus'` gives Mantine components the global focus ring: a 2px ink outline plus a marigold halo.
- Component overrides are plain objects, not `Component.extend`, so tests that mock individual Mantine components can still load the theme.
- `Modal`'s `defaultProps` name its close button "Close", which `@mantine/modals` dialogs pick up too.
- Use theme colour props (`c="ink.8"`), never `var(--mantine-color-…)` strings in TSX.
- **Stylesheet import order is cascade order.** `_app.page.tsx` imports Mantine's sheets first (`core`, `notifications`, `dropzone`), then `globals.css`, then `mantine-theme` (which pulls in `mantine-components.module.css`), then the components. Next emits CSS in the order it meets it, and the production build keeps that order across its chunks, so each layer wins ties at equal specificity over the one before, and a component's module beats both Mantine and the theme. With Mantine's sheets below the component imports, production loaded the modules first and Mantine won every tie. The dev server loads them the other way round, so only a production build, and so the visual baselines, shows the difference. Add any new global sheet above the component imports.

## Shell and navigation

- `components/Layout.tsx` composes Mantine `AppShell`:
  - `TopBar` holds the brand, `LocationSwitcher` (≥48em), the search slot, `NotificationBell`, Messages and `AccountMenu` (≥48em).
  - `SideRail` is full width at ≥62em and icon-only between 48em and 62em.
  - `BottomTabBar` is for phones (<48em) and is hidden on `TASK_ROUTES`.
  - `PublicShell` wraps signed-out visitors.
- Navigation data and active-state rules live in `components/layout/navItems.ts`. Change links there, not in components.
- Phones reach secondary pages (locations, notification settings, moderation, legal) from Profile → "Settings & more", and filter the feed with `TopicPills`.
- Unread counts come from `hooks/useUnreadMessageCount` and `hooks/useNotificationsFeed`.
- Accessibility:
  - A skip link targets `main#main-content`.
  - Landmarks are named `Primary`, `Tabs` and `Topics`.
  - Active links carry `aria-current="page"`.
  - Badge counts are part of accessible names ("Messages, 3 unread").
- `globals.css` clips horizontal overflow on `html` and `body` with `overflow-x: clip`, never `hidden`. `hidden` on both makes `<body>` a scroll container that never scrolls, and every `position: sticky` on the site then sticks to it, which means never. It did, until PR 9a: the feed's `SponsoredRail` and listing detail's sidebar had never stuck.

## UI primitives (`components/ui`)

`EmptyState`, `LoadingState`, `ErrorState`, `ListStates`, `DetailList`, `PageHeader`, `TagChip`, `ScopeBadge`, `TrustBadge`, `ActionMenu`, and `useConfirm` / `usePrompt` (never `window.confirm`/`alert`/`prompt`). `hooks/useInfiniteScroll` handles paginated lists.

- `EmptyState`'s heading is an `h3` by default, always at the h3 size. `titleOrder={1}` makes it the page's `h1` where nothing else is (the not-found states of the public profile, an event, a listing and a post), and `titleOrder={2}` puts it directly under a `PageHeader` h1.
- `ErrorState` leaves out a message that only restates its title, so "Couldn't load events" over "Couldn't load events." reads once. A message that adds something, such as the connection sentence, still shows.
- `ListStates` is a list's four states in one place: `loading`, then `error` with retry, then `isEmpty` (its `empty` node), then `children`. Both profile pages use it.
- `DetailList` and `DetailRow` are a `<dl>` of label/value rows (`div > dt + dd`), with `divided` adding the rule between rows. The own profile's Account Info and the public profile's About tab use it.

Both dialogs name their close button "Close". A `danger: true` confirm opens with focus on Cancel: the APG alertdialog pattern puts initial focus on the least destructive action, and a named "Cancel" says what Enter will do more clearly than the icon-only close button, Mantine's default first focus, which also cancels. Other confirms keep Mantine's initial focus, and a prompt focuses its field. `usePrompt`'s `validate` keeps the dialog open with its message on the field.

`Avatar` (`components/Avatar.tsx`) uses shared `getInitials` and token tones, and is always a circle (`--radius-full`), whatever the theme's radius scale. `toneKey` picks the tone and defaults to `name`: pass the full name when `name` is a masked public name, so a member keeps one colour everywhere. `decorative` renders `alt=""` and hides the initials from assistive tech, for when a heading beside the avatar already names the person.

`notify.success(message)` and `notify.error(message)` are the only way to raise a toast; they wrap `@mantine/notifications` so colour and duration stay consistent.

`SummaryRow` is the shell every summary row shares: a member's posts, events and listings. The title is the row's only link, and its `::after` stretches over the row. Rows lift with a `--border-solid` border on hover and focus-within, not a shadow.

| Prop | Meaning |
|---|---|
| `href`, `title` | The link and its text |
| `badge` | Beside the title, never shrinking: a `ScopeBadge` or a status chip |
| `leading` | Before the text, e.g. a thumbnail. Clicking it opens the link |
| `menu` | Beside the row, e.g. an `ActionMenu`. The only slot above the link's overlay |
| `children` | The lines under the title, usually one or two `SummaryRowMeta` |

Only `menu` sits above the overlay. Anything interactive in `badge`, `leading` or `children` is covered and can't be clicked, and anything positioned in `badge` or `children` paints above the overlay and leaves a dead spot, so keep those two unpositioned (a `VisuallyHidden` span is fine). `leading` comes before the link in document order, so positioned content there, such as a `next/image` with `fill`, still paints underneath.

`SummaryRowMeta` is one line of items separated by a dot that screen readers skip. Each item must be its own element (`<span>`, `<time>`), because the dot attaches to an element, not to bare text. The dot follows the item before it (`::after`), so a line that wraps ends with a dot rather than starting with one. `variant` is `'meta'` (small and quiet, the default) or `'detail'` (body size).

`scrollingTabs` keeps a Mantine `Tabs` row on one line and scrolls it sideways on phones instead of wrapping. Pass `classNames={scrollingTabsClassNames}` (spread it to add slots, as the profile does for `panel`) and give every `Tabs.Tab` `onFocus={scrollFocusedTabIntoView}`, because Chromium doesn't scroll a partly clipped tab into view when it takes focus. The module redraws the underline on the list so it stays put while the tabs scroll, stops tabs and their count badges shrinking, and insets the focus ring, which the scroller would otherwise clip. Both profile pages and search's result tabs use it.

`PhotoCarousel` shows one photo at a time with wrap-around previous and next, announces "Photo 2 of 3", and keeps a 40px swipe threshold. `priority` marks it as the page's hero: the first photo gets `next/image`'s `priority` and `fetchPriority="high"` (Next 16's `priority` only preloads and sets nothing on the `img`). Listing detail and post detail pass it. `ImageLightbox` is the full-screen viewer over Mantine `Modal`, which owns the focus trap, Escape and scroll lock; it adds paging, seven zoom levels and controls that fade after 1.5s.

`ImageUploader` is the multi-photo picker, with three callers: create post, create listing and create event. Drop or click to choose, thumbnails, remove, and optional reorder. Over @mantine/dropzone. The profile photo doesn't use it: that photo uploads as soon as it's picked and the avatar is its preview, so `ProfilePhotoControl` wraps Mantine `FileButton` instead.

| Prop | Meaning |
|---|---|
| `photos` / `onChange` | Controlled `UploaderPhoto[]`. Each entry is `{ kind: 'stored', url }` for a photo already in storage or `{ kind: 'picked', id, previewUrl, file }` for one just chosen |
| `max`, `maxBytes`, `accept` | Limits, read from shared constants by the caller. Picking past `max` takes the remaining slots and says so |
| `label`, `description`, `error` | The group's accessible name, its hint and its error. The add control is named "Add {label}" |
| `reorderable` | Adds "Move photo N left/right", with a live region announcing where a photo landed |
| `transformFile` | Runs per accepted file before it enters state — create listing passes `resizeImage`. A file that throws is skipped and counted in one message |

It owns every object URL it mints and revokes them on removal and unmount, so pages never touch `URL.createObjectURL`. Once every slot is used the input is marked `disabled` explicitly, because react-dropzone only drops its handlers.

`ToggleChipGroup` is the labelled row of toggle chips behind post tags, event types and listing categories. The chips are buttons with `aria-pressed`, not checkboxes, so state is announced by the platform rather than baked into the name. `mode` is `'single'` or `'multiple'`; `max` disables the unpressed chips at the cap while leaving pressed ones releasable. Each chip carries `data-value`, which is how create event colours its five types from `--event-<type>-fg` / `-bg` without the component knowing any event vocabulary. `hideLabel` keeps the group's name for assistive technology only, inside `VisuallyHidden` with its id intact, for a filter bar whose purpose is already obvious on screen. `layout="scroll"` keeps the chips on one line below 40em and scrolls them sideways, with room kept for the focus halo the scroller would otherwise clip, and each chip scrolls itself fully into view on focus, as `scrollingTabs` does. Both are used by the events filter bar.

## Event components

The events list (`/events`) and event detail (`/events/[id]`) are built from these, alongside `EventSummaryRow` in the profile section below.

| Component | Notes |
|---|---|
| `EventResponseControl` | The Interested / Going pair, on both the cards and the detail page. `value`, `onChange`, `busy`, `label`, `size`. Two buttons whose names never change, carrying state in `aria-pressed`; pressing the pressed one passes `null`. While `busy` both take `aria-disabled` and ignore presses, so focus stays put — but not `data-disabled`, which would paint both flat grey and hide the state the member just chose (the `FollowButton` exception below) |
| `EventCard` | One event in the grid. The title is the card's only link and its `::after` covers the card, so the response control is the one thing above that overlay (`position: relative; z-index: 1`), exactly as `SummaryRow`'s `menu` is. The decorative organizer row passes clicks through to the link, because Avatar's positioned root would otherwise paint above the overlay and swallow them. The cover is `alt=""`, past cards get a "Past" label and a `--text-2` title rather than fading, and the card fills its grid cell so a row ends level |
| `EventTypeBadge` | Reads `--event-<type>-fg` / `-bg` through `data-type`, as create event's chips do through `data-value`. The emoji is `aria-hidden`, so the badge reads "Cultural" |
| `EventFilterBar` | A Mantine `TextInput` (still `role="searchbox"`, kept `type="text"` so Chromium adds no second clear button) with a `CloseButton` in a clickable right section, over a single-select `ToggleChipGroup` with `hideLabel` and `layout="scroll"` |
| `EventAttendanceCard` | Detail's "Attendance" section: the going count, which is a link-styled button opening the attendee dialog when the list is public or the viewer organizes it, then `EventResponseControl` or one sentence saying why the member can't respond (`blockedBy`: `cancelled`, `past`, `organizer`, `unverified`). Never a disabled button, which couldn't take focus |
| `EventOrganizerCard` | Detail's "Organizer" section: a decorative avatar, the public name as the one link to the profile, and Message Organizer |
| `AttendeeList` | The people going, in a dialog that stays mounted and follows `opened`, so Mantine runs its transition and returns focus to the count button. Loading, error with retry, and empty states |

| Hook | Notes |
|---|---|
| `useEventFeed(metroId, userId)` | The events list's data. Upcoming events soonest first, then past events most recent first, both paged against one `now` taken on load, so nothing changes period mid-scroll. A short first upcoming page chains the first past page, so a metro with nothing upcoming opens on its past events. A failed page stops paging and exposes `loadMoreError` with `retryLoadMore`, rather than retrying in a loop under the sentinel. `respond` reads the previous response from a ref, moves the counts at once with the shared `applyEventResponseChange`, ignores repeat presses while one is saving, and rolls back with a toast |
| `useEventDetail(id, userId)` | One event and the viewer's response, loaded in parallel, with `respond`, `cancel` and `remove`. Resets during render when `id` changes and drops a result for a previous id. `cancel` and `remove` resolve to an error message or null, so the page owns the dialogs and toasts |

### Busy controls stay focusable

A control that is busy because the member just used it keeps focus. It gets `aria-disabled` and `data-disabled`, plus a handler that ignores presses while busy, and never native `disabled` or Mantine's `loading`, which sets `disabled`: disabling the focused element drops focus to `<body>`. Show progress with a `Loader` in `leftSection` or a `role="status"` region and keep the label, so the accessible name doesn't change. `globals.css` gives the pointer cursor only to `button:not(:disabled, [data-disabled])`, so busy buttons show Mantine's `not-allowed`. Native `disabled` is still right for a control the member can't have just used, such as `FollowButton` while its status first loads, or Save Location while the name is empty. `ProfilePhotoControl`, `AccountDetails`' bio button, the profile's Save About You, the public profile's Message button, event detail's Message Organizer, listing detail's Contact Seller, the message thread's Send, `AddLocationForm`'s Save and Cancel, notification preferences' Save, the notifications page's Mark all as read, the moderation queue's actions, `GoogleButton`, the auth pages' submit buttons (Log in, Create account, and onboarding's Find my area, Detect my location and Confirm and continue) and verify-email's Resend all work this way. Resend is also `aria-disabled` through its 60-second cooldown, which shows beside it as plain text rather than a live region, so it isn't announced every second.

Two controls are the exception, both for the same reason: they show the member's new state at once, and `data-disabled` would repaint it in Mantine's grey. While a follow or unfollow saves, `FollowButton` sets only `aria-disabled`, so "Following" or "Follow" stays at full opacity. `EventResponseControl` does the same, so the Interested or Going button the member just pressed stays visibly pressed until the write lands.

When an action removes the control that had focus, focus moves somewhere sensible after the next commit, but only if it was lost. It is never taken back from wherever the member has moved since. `hooks/useFocusAfterUpdate(key)` returns `arm(getTarget, options?)`: when `key` next changes, it disarms, and focuses `getTarget()` if `isFocusStranded()`. A later `arm` replaces an earlier one. The cases:

- **Unsaving a post** (`profile.page.tsx`) focuses the Saved tab panel, keyed on the saved list.
- **Removing the photo** (`ProfilePhotoControl`) focuses Add Photo, keyed on whether there is a photo, so a photo replaced meanwhile doesn't spend it.
- **Manage Locations** keys on each row's id and default flag plus whether the add form is open, so a set-default (which changes no id) and an add whose refresh failed (which changes no row) both restore focus. The target is the neighbouring row's Rename after a remove, that row's Rename after Set as default, and Add a Location after an add (or the new row's Rename, when the cap hides that button).
- **Deleting a notification** (`NotificationList`, by hand) focuses the open button of the row that took its place, then the row before, then the page's Preferences link. **Mark all as read** removes itself on success and focuses Preferences.
- **A moderation card leaving** (`moderation.page.tsx`, by hand) focuses the card that took its place, then the card before, then the section's `h2`. Cards and section headings take `tabIndex={-1}` for this. Focus goes to the card, not its first button, so a second Enter can't act on the next card.

`ActionMenu` moves focus from the menu to its trigger before an item's action runs, and turns off Mantine's delayed `returnFocus`. A dialog the action opens therefore keeps focus while it's open and returns it to the trigger when it closes, instead of to the unmounted menu item, which would drop it to `<body>`. After a click outside, focus stays where the click put it (usually `<body>`) and isn't pulled back to the trigger. That's deliberate, so a click into a field is never overridden.

## Marketplace components

The marketplace (`/marketplace`, `/marketplace/[category]`, `/marketplace/listing/[id]`, `/marketplace/my-listings` and the promote wizard) is built from these, alongside `ListingSummaryRow` in the profile section below. Listing detail shows the category and condition as badges under the title; shared `getListingHighlights` no longer repeats them as chips.

| Component | Notes |
|---|---|
| `MarketplaceBrowse` | The whole browse experience, behind both routes. `metroId`, `query`, `title`, `actions`, `backHref`, `backLabel`, `lockedCategory`, `onFilterChange`, `gridHeading`, `emptyAction`, `ready`. The two routes differ only in heading, back link and where a filter change navigates, so neither owns a grid of its own. A member with no metro gets "Choose your area to see listings" and a Set your area link to `/onboarding/zip` instead of the feed |
| `ListingCard` | One card in the grid and the strips. An `<article>` whose only link is the title, stretched over the card by `::after`; `data-category` colours the chip from the category tokens |
| `ListingStrip` | A horizontally scrolling row of cards, with Mantine `ActionIcon` arrows and `scroll-padding-inline` so a focused card's ring clears the edge |
| `FilterBar` | Category and sort as Mantine `NativeSelect` (short fixed lists, native pickers on phones), plus a `TextInput` with a search icon and a `CloseButton` that clears it |
| `ListingActionsPanel` | Price plus what the viewer can do. Rendered once by listing detail, in an `<aside aria-label="Listing actions">` that a grid places beside the listing (sticky) from 62em and between its top block and the rest below that, so it comes once in tab order at every width |
| `ListingBusinessDetails` | A business listing's contact details and hours as a `<dl>`. `hasBusinessDetails(listing)` says whether there is anything to show, so the page can skip the heading |
| `MyListingActions` | An owner's actions on one listing, as one `ActionMenu` named "Actions for <title>", passed to `ListingSummaryRow`'s `menu`. Edit and Promote are links; Deactivate and Delete ask through `useConfirm` (Delete as `danger`); every action reports its outcome with `notify`. `pending` disables the items while an action runs |
| `PromoteSteps` | `components/marketplace/promote/`. The wizard's progress as an `<ol aria-label="Progress">` with `aria-current="step"` and a visually hidden "completed" — not Mantine's `Stepper`, whose steps are buttons a member could click past |
| `PromotionTierPicker` | One Mantine `Radio.Card` per tier in a named `radiogroup`. Adds a roving tab stop (the checked card, or the first) and names each card by the tier alone, with price and description as its description. A card is a button, so its content is spans |
| `PromotionDurationStep` | A `NumberInput` given `role="spinbutton"` and its value range, over a cost summary. It keeps a draft while the member types, so an emptied field is not clamped straight back to 1 |
| `PromotionReview` | What is being bought, and Pay. Pay stays focusable while busy (see below) |
| `SummaryList` | The two steps' figures as a `<dl>`, so each value is read with its label |

Their data comes from four hooks: `useMarketplaceFeed(metroId, query)` for the strips, grid and paging, `useListingDetail(id, viewer)` for one listing, `useMyListings(userId)` for an owner's listings and their actions, and `usePromoteWizard(listingId, viewer)` for the wizard and checkout. Both keep loading, empty and failed apart — a failed read clears its rows rather than leaving the previous metro's on screen, and a failed page says so instead of looking like the end of the list.

## Messages components

The inbox (`/messages`) and a thread (`/messages/[id]`) are built from these, in `components/messages/`. Chat shows public names ("Bikal S."), with the full name as the avatar's `toneKey`.

| Component | Notes |
|---|---|
| `ConversationRow` | One inbox `li`: the partner's `UserMenuTrigger` (View profile only) beside a link to the thread. Not a stretched link — its overlay would cover the avatar button. The link's name carries the time, the preview and the unread count ("3 unread", the word visually hidden) |
| `ThreadHeader` | A back link to Messages, the partner's one avatar menu, and the page's `h1` |
| `MessageLog` | A `role="log"` region named "Messages with {name}", with `aria-relevant="additions"` so only new messages are announced, not a receipt turning to Read. A `section` and `h2` per day (`formatDayLabel`), receipts spoken as Sent or Read, and a decorative avatar at the end of each received run (`buildThreadDays`). The window scrolls, not the log: it goes to the end of the page on first render, after the viewer sends, and when a message arrives while the viewer is within 120px of the bottom |
| `MessageComposer` | A labelled field ("Message {name}") and an icon Send, `position: sticky` at the bottom of the viewport. Send is natively disabled only while the field is blank and is `aria-disabled` while sending. A sent message clears the field unless the member kept typing, and puts focus back in it; a failed one keeps the text and says so |

| Hook | Notes |
|---|---|
| `useStartConversation()` | `{ start(partner, { beforeStart? }), starting }`, the one way to open a chat, used by the feed, post detail, event detail, the public profile and listing detail. Sends a signed-out visitor to log in, ignores the viewer's own id and a second press, and reports a failure with one toast. `beforeStart` runs inside the double-press guard, which is how listing detail counts one contact per press. `starting` stays set after a success until navigation unmounts the caller |
| `useConversations(userId)` | The inbox, over `useUserList`: a failed load is an error with a retry, never an empty inbox. Not paged — `getConversations` returns every conversation |
| `useMessageThread(conversationId, userId)` | The newest 100 messages, the partner, realtime and `send`. Subscribes before loading and merges what arrives meanwhile; a conversation missing from the viewer's list (never theirs, or with a member they blocked) is `notFound`, and the channel is left. Keyed on the two ids, not the user object |

Every web realtime channel, and shared `subscribeToMessages`, takes its topic from shared `uniqueChannelTopic(base)`. realtime-js hands back a still-leaving channel for a matching topic, and that channel's `subscribe()` does nothing, so resubscribing to a fixed topic straight after removing it — React StrictMode's dev remount, or A → B → A — gets no events. Mobile's own channels (`HomeScreen`, `NotificationsScreen`) still use fixed topics; moving them is on PR 10's list.

## Notifications and moderation components

`/notifications`, `/profile/notifications` and `/moderation` are built from these.

| Component | Notes |
|---|---|
| `NotificationList` | `components/notifications/`. Emergency alerts first, then a `section` per day, each named by its `h2` (`groupNotifications`, `formatDayLabel`). Each row is PR 2's `NotificationItem`: an open button beside a separate Delete. Keeps focus in the list after a delete |
| `PendingPostCard` | `components/moderation/`. A post waiting for review, as an `article` named by its `h3` title link, with Approve and Remove |
| `ReportCard` | An open report, headed by its reason, with what was reported and the actions its target allows (Dismiss; Remove post and Ban author for a post; Ban user for a member) |
| `ModerationActionButton` | A card action that follows the busy-controls rule: `aria-disabled` while any action runs, `aria-busy` and a `Loader` on the running one |

The preferences page's switches render their description outside Mantine's `<label>` and link it with `aria-describedby`. Mantine's own `description` sits inside the label, which makes it part of the accessible name.

| Hook | Notes |
|---|---|
| `useNotificationsPage(userId)` | The page's list, unread count, paging and realtime. Subscribes before loading and keeps what arrives meanwhile without counting it. Pages from the rows on screen, with deletes and pages serialized as in `useMyListings`. Leaves out `message` notifications, as the queries do. A second mark-read or delete of a row already in flight shares the first request. Each mutation resolves false on failure and calls `announceNotificationsChanged()` on success |
| `useUserSettings(userId)` | Notification preferences. `values` is null after a failed load, so nothing unloaded can be saved; a member with no row gets `DEFAULT_USER_SETTINGS` |
| `useModerationQueue(moderatorId)` | Pending posts, open reports and the reported posts, failing as a whole. Actions run one at a time and resolve to `{ ok }` or a sentence to show |
| `useNotificationsFeed({ userId, pollingEnabled })` | The bell. Reloads when polling turns back on and on `announceNotificationsChanged()`, and applies only the latest of overlapping loads. Realtime shows and counts a row once: a redelivered INSERT, a row a load already brought in (the load writes its items ref as it lands, not after the render) and a read row never raise the count. A row that arrives while a load is in flight is merged back into that load's answer, whose snapshot may predate it, unless the member has since deleted it |

## Auth, landing and legal components

Login, signup, verify-email, onboarding, the auth callback, the landing page and the four legal pages are built from these. What the flows do is in [../product/features/sign-up-and-log-in.md](../product/features/sign-up-and-log-in.md).

| Component | Location | Notes |
|---|---|---|
| `AuthCard` | `components/auth/` | `title`, `description`, `titleRef`, `children`, `footer`. The centred card every auth page sits in, at most 420px wide (built from space tokens). Its `h1` has `tabIndex={-1}` so a step change can focus it through `titleRef`, and it drops the focus ring only for pointer focus (`:focus:not(:focus-visible)`). The footer holds the cross-links. Links in the body and footer are underlined, because colour alone doesn't mark a link inside running text (axe's `link-in-text-block`) |
| `GoogleButton` | `components/auth/` | `onClick`, `busy`. "Continue with Google" with an `aria-hidden` Google icon. It follows the busy-controls rule, and stays busy once the hand-off to Google starts, since the page is navigating away |
| `LandingPage` | `components/landing/` | The signed-out `/`: the hero with Sign up and Log in, "What you'll find" over five items that are not links (Housing, Jobs, Help, Events, Marketplace), and a line linking the Community Guidelines |
| `LegalDocument` | `components/legal/` | `title`, `description`, `intro`, `children`. The shell of the four legal pages: the `h1`, the last-updated date, the intro, the body, and a "Policies and help" `nav` linking the other three pages. Its styles live in the private `legal.module.css` |
| `Callout` | `components/legal/` | A `div` with `role="note"` for a warning inside the prose |
| `Faq`, `FaqItem` | `components/legal/` | A group of questions, and one question as native `<details>` / `<summary>`, which opens with Enter or Space and announces its state without any script |

| Hook or helper | Notes |
|---|---|
| `useRedirectWhen(condition, href)` | `hooks/`. Calls `router.replace(href)` in an effect while `condition` holds, once per `href`, and returns `condition` so the page renders `null` meanwhile. Pages never redirect during render |
| `useCountdown(seconds)` | `hooks/`. `{ remaining, restart }`, counting down once a second from mount. `remaining` is derived from an end time, so a throttled background tab still reads right. Verify-email's resend cooldown uses it |
| `finishSignIn(supabase, session)` | `lib/authCallback.ts`. The callback's steps: create the profile if it's missing, mark the member verified by provider, then route by metro. It resolves to `{ destination }` or `{ error }` and checks every step's result, so the page always ends |
| `resendSignupEmail(email)` | `lib/auth.ts`. Resends the sign-up confirmation through shared `resendVerificationEmail` |
| `useGoogleSignIn(setError)` | `hooks/`. `{ busy, start }` for log in and sign up: clears the error, starts Google, stays busy on success (the browser is leaving), and on failure logs `auth_google_failed` and sets `getAuthErrorMessage`'s sentence |
| `signOut()` / `signingOut` | `AuthContext`. The one sign-out, labelled "Log out" everywhere. It sets `signingOut`, which `Layout` treats like `loading` and renders its full-screen loader for, so no page is mounted while the user clears; then signs out, clears the user and replaces `/`. A failure keeps the member signed in and resolves `{ error }` for the caller's toast |

## Web-only helpers (`src/lib`)

| Helper | Notes |
|---|---|
| `toPhotoUploadInputs(files, userId)` | `File[]` → the byte-carrying shape the shared storage API takes. The `File` API is DOM-only, which is why this is not in `packages/shared` |
| `uploadPhotosInOrder(photos, userId, upload)` | Uploads the picked photos, then returns every photo's URL in display order. Concatenation is not enough: a member can drop a new photo in front of a saved one |
| `resizeImage(file)` | Downscales to 1200px wide at JPEG quality 0.8, returning a `File`. Passed to `ImageUploader` as `transformFile` |
| `cropToSquare(file, size?)` | In `resizeImage.ts`. Centre-crops to the largest square and scales it to at most `PROFILE_PHOTO_SIZE_PX`, never up, as a JPEG `File` |
| `replaceProfilePhoto(supabase, userId, file)` | `lib/profilePhoto.ts`: `cropToSquare`, then the shared `setProfilePhoto`. Returns `{ error }` as a message; an image that won't decode is logged and reads "We couldn't process that image" |
| `announceMessagesRead()` | `lib/unreadMessages.ts`. A thread calls it once `markAsRead` has run, and `useUnreadMessageCount` refreshes on it, so the top bar's badge clears at once instead of waiting on realtime or its 30s poll |
| `announceNotificationsChanged()` | `lib/notificationsChanged.ts`. `/notifications` calls it after a mark-read, mark-all or delete, and the bell reloads on it. The page turns the bell's own polling and realtime off while it's open |
| `isFocusStranded()` | `lib/focus.ts`. True when focus is on `<body>` or still inside a closing modal (`[aria-modal="true"]`). Mantine returns focus on a timer and keeps a modal mounted through its exit transition, so an effect restoring focus must treat both as lost |
| `parseMarketplaceQuery(query)` | `lib/marketplaceQuery.ts`. One reading of the marketplace's URL state for both routes, which both expose the slug as `query.category`. Also `isFilteredQuery` and `SEARCH_SLUG`, the pseudo-category `/marketplace/search` uses |
| `submitNewPost` / `submitEditedPost` | Create post's two submit paths, as pure functions. They own the rollback rules: delete what was just uploaded when the write fails, delete what the member dropped only once it succeeds |
| `userMessage(error, fallback, event, context?)` | Shared (`packages/shared/src/logic/userMessage.ts`), imported from `@nepally/shared`. The raw-error policy: logs the raw error through `logClientEvent` under `event`, and returns what the member sees: shared `CONNECTION_ERROR_MESSAGE` when `isConnectionError(error)`, else `fallback`. A Supabase, PostgREST or RLS message never reaches the screen. Fallbacks read "Couldn't <verb> <thing>. Please try again." for actions and "Couldn't load <things>." for lists. Our own validation copy (zod issues) is shown as is |

## Post and feed components

| Component | Location | Notes |
|---|---|---|
| `PostCard` | `components/posts/` | A stretched-link card: the title is the only link and covers the card, so menus, chips and the carousel sit beside it rather than inside it |
| `PostMeta` | `components/posts/` | Author and relative time on the first line, then one list of a `TagChip` per tag and the `ScopeBadge`, which wrap together. Tags become buttons only when the surface can filter |
| `PostActions` | `components/posts/` | Like, comment and save. A count is a button only where a handler is given — the feed has none, so there it stays text, and post detail passes them. Save is always named "Save post"; `aria-pressed` carries whether it is saved |
| `CommentThread` | `components/posts/` | One parent comment with its replies behind a "Show replies (n)" toggle; deleting asks through `useConfirm` |
| `CommentComposer` | `components/posts/` | The comment field, with a real label and a reply banner naming the person |
| `PostComposer` | `components/feed/` | The prompt row; it links to the composer, or to verification below trust level 1 |
| `SponsoredRail` | `components/feed/` | The `<aside>` holding paid listings and the upcoming-events widget |
| `UserMenuTrigger` | `components/users/` | An avatar that opens View profile / Chat through `ActionMenu`. The button is named "Options for {name}" and its avatar is decorative, so the name is read once. `toneKey` keeps the avatar's colour when `name` is a public name. Avatars beside a written name (post and comment authors, search people, attendees) are decorative too, and attendees are named by their public name |
| `DateTimeField` | `components/events/` | A date and a time behaving as one `YYYY-MM-DDTHH:mm` value. The time does nothing until a date is set. Takes both input ids from its caller, because the e2e suite drives them directly |

## Profile components

The own profile (`/profile`), the public profile (`/users/[id]`) and Manage Locations (`/profile/locations`) are built from these. The three summary rows sit on `SummaryRow`.

| Component | Location | Notes |
|---|---|---|
| `PostSummaryRow` | `components/posts/` | `post` and an optional `menu`. `ScopeBadge`, a two-line excerpt, then relative time · likes · comments |
| `EventSummaryRow` | `components/events/` | `event` and `now`, from `useNow()` so every row agrees on what is past. Date and place, then "n going" and Past or Cancelled |
| `ListingSummaryRow` | `components/marketplace/` | `listing`, an optional `owner={{ now }}` and an optional `menu`. Thumbnail in `leading`, then price and category. The owner view adds the status chip (`--success` / `--warning` / `--danger`), view, save and contact counts, and the expiry notice; the public view shows the listing's age |
| `PublicProfileHeader` | `components/users/` | `profileUser`, `metroName`, `helperScore`, `isOwnProfile`, `viewerId`, `messaging`, `onMessage`. A decorative avatar toned by the full name, the public name as the `h1`, `TrustBadge`, bio, follow counts, identity chips, and the Message or Edit profile button. The follower count moves with `FollowButton`'s `onChange` |
| `FollowButton` | `components/users/` | `supabase`, `viewerId`, `targetUserId`, `onChange`. Renders nothing when signed out, on the viewer's own profile, or when the status fails to load, and remounts per viewer and target through a keyed inner `FollowToggle`. Optimistic, rolling back with a toast. Its label reads "Follow" / "Following" beside `aria-pressed`: a deliberate exception to letting the platform announce toggle state, following the social-app convention |
| `ProfilePhotoControl` | `components/profile/` | `name`, `photoUrl`, `busy`, `onPick(file)`, `onRemove`. The avatar with Add/Change and Remove photo, over Mantine `FileButton`. It rejects an unsupported or oversized file itself (`MAX_PROFILE_PHOTO_SOURCE_BYTES`); the upload and its toasts are the caller's |
| `AccountDetails` | `components/profile/` | `user`, `onEditBio`, `editBioBusy`. The About tab's Bio, Account Info and Activity sections. The Phone row shows only when a phone is set, since web can't edit it |
| `AboutPanel` | `components/users/` | The public profile's About tab on `DetailList`. The bio keeps its line breaks (`white-space: pre-line`) |
| `AboutYouSection` | `components/profile/` | Controlled `values` / `onChange` (the shared `AboutYouFormValues`) and `disabled`. Hometown district (`NativeSelect`), college, years in the US, and a `ToggleChipGroup` of languages |
| `SavedLocationRow` | `components/locations/` | One saved location. It owns rename: Enter or blur saves, Escape cancels, and a duplicate name shows on the field. Actions are named per row ("Rename Work", "Remove Work", "Set as default for Work"), and `renameButtonRef` lets the page restore focus |
| `AddLocationForm` | `components/locations/` | Metro or ZIP search through `useMetroSearch`, then "Name this location" with suggestion chips. `onSave` resolves once the page has refreshed its list; `onCancel` is only for Cancel |

Their data and actions come from these hooks in `src/hooks`:

| Hook | Notes |
|---|---|
| `usePublicProfile(id)` | Loads `/users/[id]`: `status` (`loading`, `ready`, `not-found` or `error`, with `reload`), the member, metro name, helper score, and posts, events and listings as three `useUserList` resources (limits 30, 50, 30), so a failed list is an error with a retry, never an empty list. No row, `PGRST116` or `22P02` is not-found ("Member not found"); any other failure is "Couldn't load this profile." with Retry. Resets during render when `id` changes, so a caller that stays mounted never shows one member's data under another's URL |
| `useUserList(userId, fetchList, fallbackError)` | One user-scoped list: `items`, `loading`, `error` and `reload`. `fetchList` must be a module-level function, because an inline closure refetches on every render. Resets per user and drops stale responses |
| `useOwnProfileContent(userId)` | `/profile`'s posts, saved posts and listings, each a `useUserList`, plus `unsave(postId)`, which hides the post at once and restores it if the delete fails |
| `useProfileEditing(user, refreshUser)` | `editName`, `editBio` and `changePassword` (a reset email) through `usePrompt` and `notify`. Name and bio are validated inside the dialog with the shared `fullNameSchema` and `bioSchema`. `saving` is true while a write runs |
| `useMetroSearch(input, userId)` | Debounced metro-name or ZIP search for Manage Locations. Drops stale responses, treats an unknown ZIP as "No metros match." rather than a failure, and logs real failures. `statusMessage` feeds one always-mounted `role="status"` region |

## Guards

Neither guard has an allowlist: every file passes, or the command fails.

| Guard | Command | Scope |
|---|---|---|
| CSS Modules use semantic tokens (`scripts/guard-css-tokens.js`) | `npm run lint:guards` | Every `.module.css` under `apps/web/src` |
| No raw `<button>`, `<input>`, `<select>` or `<textarea>` (`react/forbid-elements` in `apps/web/eslint.config.mjs`) | `npm run lint` | Every `.tsx` under `apps/web/src` except `components/ui/**`, which wraps raw elements for everyone else, and `*.test.tsx` |

The CSS guard fails on:

- hex, and `rgb()`/`hsl()`/`oklch()`/`oklab()` in any case;
- named colours such as `white` in value position;
- direct primitive references such as `var(--ink-900)`;
- the legacy design-system variables (`--color-*`, `--space-m` and the rest), with a message naming the rule;
- **an undefined custom property.** Every `var(--x)` must be defined in `tokens.css`, declared in the same file (`--x:`), or start with `--mantine-`. A fallback, as in `var(--x, 4px)`, doesn't excuse an undefined name, because a fallback is exactly how a typo hides. Variables a Mantine component sets on its own root are allowed only through the guard's `MANTINE_COMPONENT_PROPERTIES` list, each entry with a comment naming the component. Today it holds one, `--tabs-list-border-width` (Tabs, read by `scrollingTabs.module.css`). Add one only after checking that Mantine sets it.

The `var()` rules read the whole comment-stripped file, so a `var(` split across lines or written `VAR(` is still checked. Property names stay case-sensitive, as CSS has them: `var(--Surface-0)` is undefined.

`npm run guards:test` runs the guards' own tests.

## Testing

- `tokens.contrast.test.ts` checks WCAG AA for every text/background token pair.
- `mantine-theme.test.ts` checks the theme against the tokens.
- Component tests render through `apps/web/src/test-utils.tsx`, which wraps `MantineProvider` (real theme, `env="test"`) and `ModalsProvider`. `env="test"` is Mantine's documented test-runner switch: it collapses transitions to their final state, renders portal content inline, and skips floating-ui's detached-reference check, which misfires in jsdom and would otherwise hide popovers and menus from role queries. Cover transition, portal and positioning behaviour in Playwright, not unit tests.
- **Test queries.** Find elements by role, label or text. Never assert Mantine's internal `data-*` attributes (`data-disabled`, `data-active`, `data-loading`…) or CSS-module class names: they are Mantine's and the stylesheet's business, not the component's behaviour. Assert the accessible state instead: `aria-disabled`, `aria-pressed`, `aria-current`, or the button's native `disabled`. A `data-*` attribute that a component documents as its contract with its own stylesheet (`data-type`, `data-category`, `data-variant`, `data-tone`…) may be asserted on an element found by role or text, e.g. `expect(screen.getByText('Cultural').closest('[data-type]')?.getAttribute('data-type')).toBe('cultural')`. The suite has no jest-dom, so read attributes with `getAttribute`.
- Visual regression and axe scans are described in [../guides/setup-and-testing.md](../guides/setup-and-testing.md) under "Visual regression and accessibility tests (web)".

## Mantine 9 readiness

Already handled:

- `defaultRadius` is explicit.
- `light` variants are self-defined.
- `useLocalStorage` always gets a `defaultValue`.
- No removed APIs are used.

React 19.2.3 landed with the Expo SDK 57 migration, so the upgrade is unblocked; it ships as its own PR. When it happens, also set `<Notifications pauseResetOnHover="notification" />`.
