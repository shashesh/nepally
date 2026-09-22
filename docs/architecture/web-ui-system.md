# Web UI System

**Last updated:** 2026-09-22
**Applies to:** `apps/web` only. Design rationale: [../specs/2026-09-14-web-ui-overhaul-design.md](../specs/2026-09-14-web-ui-overhaul-design.md).

The web app uses one design language, **H1 · Ink & Marigold**. It combines editorial type (Gambarino headings, Switzer body), warm paper neutrals and borders instead of shadows. Ink navy carries every action. Marigold is a sparing accent, and crimson is reserved for Emergency.

## Files

| File | Role |
|---|---|
| `apps/web/src/styles/tokens.css` | Source of truth: primitive and semantic tokens |
| `apps/web/src/styles/legacy-aliases.css` | Temporary: old variable names → tokens (removed at the end of the overhaul) |
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
- **Type:** `--font-display`, `--font-body`, `--font-size-{xs,sm,base,lg,xl,display}`, `--font-weight-{regular,medium,semibold,bold}`, `--leading-*`, `--tracking-*`.
- **Space:** `--space-1…9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- **Radius:** `--radius-{chip,tag,control,card,overlay,full}`.
- **Elevation:** borders by default. Only floating layers get `--shadow-float` (menus, popovers, dropdowns) or `--shadow-modal`.
- **Motion:** `--duration-fast`, `--duration-base`, `--ease-out`. Non-essential motion is disabled under `prefers-reduced-motion`.
- **Breakpoints:** in CSS Modules use `$mantine-breakpoint-sm` (48em), `-md` (62em) and `-lg` (75em), never pixel literals.

### Adding or changing a token

1. Edit `tokens.css` and keep every colour inside sRGB.
2. If it is used for text, add its pair to `tokens.contrast.test.ts`.
3. If Mantine needs it, mirror it in `mantine-theme.ts` and extend `mantine-theme.test.ts`.
4. Re-baseline screenshots (see "Testing").

## Fonts

Gambarino (400) and Switzer (400/500/600) are self-hosted through `next/font/local` under the ITF Free Font License. `FontVariables` sets `--font-display` and `--font-body` with `html:root`, and `tokens.css` keeps readable fallbacks. Gambarino has a single weight, and `font-synthesis: none` stops browsers faking bold.

## Mantine

- `primaryColor: 'ink'` (shade 8 = `--action-bg`). `marigold` is available for accents.
- `variantColorResolver` renders `light` variants as a solid tint with shade-9 text, so the Mantine 9 change is invisible.
- `cssVariablesResolver` points Mantine's body, text, dimmed and border variables at semantic tokens.
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

## UI primitives (`components/ui`)

`EmptyState`, `LoadingState`, `ErrorState`, `PageHeader`, `TagChip`, `ScopeBadge`, `TrustBadge`, `ActionMenu`, and `useConfirm` / `usePrompt` (never `window.confirm`/`alert`/`prompt`). `hooks/useInfiniteScroll` handles paginated lists.

Both dialogs name their close button "Close". A `danger: true` confirm opens with focus on Cancel, so Enter or Space can't fire the destructive button by accident. Other confirms keep Mantine's initial focus, and a prompt focuses its field. `usePrompt`'s `validate` keeps the dialog open with its message on the field.

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

`SummaryRowMeta` is one line of items separated by a dot that screen readers skip. Each item must be its own element (`<span>`, `<time>`), because the dot attaches to an element, not to bare text. `variant` is `'meta'` (small and quiet, the default) or `'detail'` (body size).

`scrollingTabs` keeps a Mantine `Tabs` row on one line and scrolls it sideways on phones instead of wrapping. Pass `classNames={scrollingTabsClassNames}` (spread it to add slots, as the profile does for `panel`) and give every `Tabs.Tab` `onFocus={scrollFocusedTabIntoView}`, because Chromium doesn't scroll a partly clipped tab into view when it takes focus. The module redraws the underline on the list so it stays put while the tabs scroll, stops tabs and their count badges shrinking, and insets the focus ring, which the scroller would otherwise clip. Both profile pages use it; search's result tabs don't yet.

`PhotoCarousel` shows one photo at a time with wrap-around previous and next, announces "Photo 2 of 3", and keeps a 40px swipe threshold. `ImageLightbox` is the full-screen viewer over Mantine `Modal`, which owns the focus trap, Escape and scroll lock; it adds paging, seven zoom levels and controls that fade after 1.5s.

`ImageUploader` is the multi-photo picker, with three callers: create post, create listing and create event. Drop or click to choose, thumbnails, remove, and optional reorder. Over @mantine/dropzone. The profile photo doesn't use it: that photo uploads as soon as it's picked and the avatar is its preview, so `ProfilePhotoControl` wraps Mantine `FileButton` instead.

| Prop | Meaning |
|---|---|
| `photos` / `onChange` | Controlled `UploaderPhoto[]`. Each entry is `{ kind: 'stored', url }` for a photo already in storage or `{ kind: 'picked', id, previewUrl, file }` for one just chosen |
| `max`, `maxBytes`, `accept` | Limits, read from shared constants by the caller. Picking past `max` takes the remaining slots and says so |
| `label`, `description`, `error` | The group's accessible name, its hint and its error. The add control is named "Add {label}" |
| `reorderable` | Adds "Move photo N left/right", with a live region announcing where a photo landed |
| `transformFile` | Runs per accepted file before it enters state — create listing passes `resizeImage`. A file that throws is skipped and counted in one message |

It owns every object URL it mints and revokes them on removal and unmount, so pages never touch `URL.createObjectURL`. Once every slot is used the input is marked `disabled` explicitly, because react-dropzone only drops its handlers.

`ToggleChipGroup` is the labelled row of toggle chips behind post tags, event types and listing categories. The chips are buttons with `aria-pressed`, not checkboxes, so state is announced by the platform rather than baked into the name. `mode` is `'single'` or `'multiple'`; `max` disables the unpressed chips at the cap while leaving pressed ones releasable. Each chip carries `data-value`, which is how create event colours its five types from `--event-<type>-fg` / `-bg` without the component knowing any event vocabulary.

### Busy controls stay focusable

A control that is busy because the member just used it keeps focus. It gets `aria-disabled` and `data-disabled`, plus a handler that ignores presses while busy, and never native `disabled` or Mantine's `loading`, which sets `disabled`: disabling the focused element drops focus to `<body>`. Show progress with a `Loader` in `leftSection` or a `role="status"` region and keep the label, so the accessible name doesn't change. `globals.css` gives the pointer cursor only to `button:not(:disabled, [data-disabled])`, so busy buttons show Mantine's `not-allowed`. Native `disabled` is still right for a control the member can't have just used, such as `FollowButton` while its status first loads, or Save Location while the name is empty. `FollowButton`, `ProfilePhotoControl`, `AccountDetails`' bio button, the profile's Save About You and `AddLocationForm` all work this way.

When an action removes the control that had focus (unsaving a post, removing a photo or a location), the page moves focus to a neighbour after the next commit, but only if `isFocusStranded()` says focus has nowhere useful to be. It never takes focus back from wherever the member has moved since.

## Web-only helpers (`src/lib`)

| Helper | Notes |
|---|---|
| `toPhotoUploadInputs(files, userId)` | `File[]` → the byte-carrying shape the shared storage API takes. The `File` API is DOM-only, which is why this is not in `packages/shared` |
| `uploadPhotosInOrder(photos, userId, upload)` | Uploads the picked photos, then returns every photo's URL in display order. Concatenation is not enough: a member can drop a new photo in front of a saved one |
| `resizeImage(file)` | Downscales to 1200px wide at JPEG quality 0.8, returning a `File`. Passed to `ImageUploader` as `transformFile` |
| `cropToSquare(file, size?)` | In `resizeImage.ts`. Centre-crops to the largest square and scales it to at most `PROFILE_PHOTO_SIZE_PX`, never up, as a JPEG `File` |
| `replaceProfilePhoto(supabase, userId, file)` | `lib/profilePhoto.ts`: `cropToSquare`, then the shared `setProfilePhoto`. Returns `{ error }` as a message; an image that won't decode is logged and reads "We couldn't process that image" |
| `isFocusStranded()` | `lib/focus.ts`. True when focus is on `<body>` or still inside a closing modal (`[aria-modal="true"]`). Mantine returns focus on a timer and keeps a modal mounted through its exit transition, so an effect restoring focus must treat both as lost |
| `submitNewPost` / `submitEditedPost` | Create post's two submit paths, as pure functions. They own the rollback rules: delete what was just uploaded when the write fails, delete what the member dropped only once it succeeds |

## Post and feed components

| Component | Location | Notes |
|---|---|---|
| `PostCard` | `components/posts/` | A stretched-link card: the title is the only link and covers the card, so menus, chips and the carousel sit beside it rather than inside it |
| `PostMeta` | `components/posts/` | Author, relative time, `TagChip` per tag and `ScopeBadge`. Tags become buttons only when the surface can filter |
| `PostActions` | `components/posts/` | Like, comment and save. A count is a button only where a handler is given — the feed has none, so there it stays text, and post detail passes them |
| `CommentThread` | `components/posts/` | One parent comment with its replies behind a "Show replies (n)" toggle; deleting asks through `useConfirm` |
| `CommentComposer` | `components/posts/` | The comment field, with a real label and a reply banner naming the person |
| `PostComposer` | `components/feed/` | The prompt row; it links to the composer, or to verification below trust level 1 |
| `SponsoredRail` | `components/feed/` | The `<aside>` holding paid listings and the upcoming-events widget |
| `UserMenuTrigger` | `components/users/` | An avatar that opens View profile / Chat through `ActionMenu` |
| `DateTimeField` | `components/events/` | A date and a time behaving as one `YYYY-MM-DDTHH:mm` value. The time does nothing until a date is set. Takes both input ids from its caller, because the e2e suite drives them directly |

## Profile components

The own profile (`/profile`), the public profile (`/users/[id]`) and Manage Locations (`/profile/locations`) are built from these. The three summary rows sit on `SummaryRow`.

| Component | Location | Notes |
|---|---|---|
| `PostSummaryRow` | `components/posts/` | `post` and an optional `menu`. `ScopeBadge`, a two-line excerpt, then relative time · likes · comments |
| `EventSummaryRow` | `components/events/` | `event` and `now`, from `useNow()` so every row agrees on what is past. Date and place, then "n going" and Past or Cancelled |
| `ListingSummaryRow` | `components/marketplace/` | `listing` and an optional `owner={{ now }}`. Thumbnail in `leading`, then price and category. The owner view adds the status chip (`--success` / `--warning` / `--danger`), view, save and contact counts, and the expiry notice; the public view shows the listing's age |
| `PublicProfileHeader` | `components/users/` | `profileUser`, `metroName`, `helperScore`, `isOwnProfile`, `viewerId`, `messaging`, `onMessage`. A decorative avatar toned by the full name, the public name as the `h1`, `TrustBadge`, bio, follow counts, identity chips, and the Message or Edit profile button |
| `FollowButton` | `components/users/` | `supabase`, `viewerId`, `targetUserId`, `onChange`. Renders nothing when signed out, on the viewer's own profile, or when the status fails to load, and remounts per viewer and target through a keyed inner `FollowToggle`. Optimistic, rolling back with a toast. Its label reads "Follow" / "Following" beside `aria-pressed`: a deliberate exception to letting the platform announce toggle state, following the social-app convention |
| `ProfilePhotoControl` | `components/profile/` | `name`, `photoUrl`, `busy`, `onPick(file)`, `onRemove`. The avatar with Add/Change and Remove photo, over Mantine `FileButton`. It rejects an unsupported or oversized file itself (`MAX_PROFILE_PHOTO_SOURCE_BYTES`); the upload and its toasts are the caller's |
| `AccountDetails` | `components/profile/` | `user`, `onEditBio`, `editBioBusy`. The About tab's Bio, Account Info and Activity sections |
| `AboutYouSection` | `components/profile/` | Controlled `values` / `onChange` (the shared `AboutYouFormValues`) and `disabled`. Hometown district (`NativeSelect`), college, years in the US, and a `ToggleChipGroup` of languages |
| `SavedLocationRow` | `components/locations/` | One saved location. It owns rename: Enter or blur saves, Escape cancels, and a duplicate name shows on the field. Actions are named per row ("Rename Work", "Remove Work", "Set as default for Work"), and `renameButtonRef` lets the page restore focus |
| `AddLocationForm` | `components/locations/` | Metro or ZIP search through `useMetroSearch`, then "Name this location" with suggestion chips. `onSave` resolves once the page has refreshed its list; `onCancel` is only for Cancel |

Their data and actions come from these hooks in `src/hooks`:

| Hook | Notes |
|---|---|
| `usePublicProfile(id)` | Loads `/users/[id]`: the member, metro name, posts, events, listings and helper score, with a loading flag for the profile and for each list. Resets during render when `id` changes, so a caller that stays mounted never shows one member's data under another's URL |
| `useUserList(userId, fetchList, fallbackError)` | One user-scoped list: `items`, `loading`, `error` and `reload`. `fetchList` must be a module-level function, because an inline closure refetches on every render. Resets per user and drops stale responses |
| `useOwnProfileContent(userId)` | `/profile`'s posts, saved posts and listings, each a `useUserList`, plus `unsave(postId)`, which hides the post at once and restores it if the delete fails |
| `useProfileEditing(user, refreshUser)` | `editName`, `editBio` and `changePassword` (a reset email) through `usePrompt` and `notify`. Name and bio are validated inside the dialog with the shared `fullNameSchema` and `bioSchema`. `saving` is true while a write runs |
| `useMetroSearch(input, userId)` | Debounced metro-name or ZIP search for Manage Locations. Drops stale responses, treats an unknown ZIP as "No metros match." rather than a failure, and logs real failures. `statusMessage` feeds one always-mounted `role="status"` region |

## Guards

| Guard | Command | Allowlist |
|---|---|---|
| Colour literals, named colours, primitives and legacy variables in CSS Modules | `npm run lint:guards` | `scripts/guard-css-tokens.allowlist.json` (regenerate: `node scripts/guard-css-tokens.js --write-allowlist`) |
| Raw `<button>/<input>/<select>/<textarea>` outside `components/ui/` | `npm run lint` | `apps/web/eslint/raw-element-allowlist.mjs` (regenerate: `node apps/web/eslint/write-raw-element-allowlist.mjs`) |
| Stale entries in the raw-element allowlist | `npm run lint:guards` | — (`node apps/web/eslint/write-raw-element-allowlist.mjs --check`) |

The CSS guard rejects hex, `rgb()`/`hsl()`/`oklch()`/`oklab()` in any case, named colours such as `white` in value position, direct primitive references such as `var(--ink-900)`, and the legacy design-system variables.

Allowlists only shrink, and both are enforced. The CSS guard fails if an allowlisted file is already clean. The raw-element allowlist is applied through ESLint `ignores`, which skips a file silently, so `--check` fails on entries that no longer render a raw element — otherwise a migrated file left in the list would go on hiding new raw elements.

The raw-element allowlist stores plain file paths. `apps/web/eslint.config.mjs` passes each one through `escapeGlobLiteral` (`apps/web/eslint/escape-glob.mjs`, tested by `npm run guards:test`) before adding it to ESLint `ignores`, because Next.js dynamic routes such as `pages/users/[id].page.tsx` would otherwise be read as glob character classes and not ignored.

## Testing

- `tokens.contrast.test.ts` checks WCAG AA for every text/background token pair.
- `mantine-theme.test.ts` checks the theme against the tokens.
- `legacy-aliases.test.ts` checks every old variable still resolves.
- Component tests render through `apps/web/src/test-utils.tsx`, which wraps `MantineProvider` (real theme, `env="test"`) and `ModalsProvider`. `env="test"` is Mantine's documented test-runner switch: it collapses transitions to their final state, renders portal content inline, and skips floating-ui's detached-reference check, which misfires in jsdom and would otherwise hide popovers and menus from role queries. Cover transition, portal and positioning behaviour in Playwright, not unit tests.
- Visual regression and axe scans are described in [../guides/setup-and-testing.md](../guides/setup-and-testing.md) under "Visual regression and accessibility tests (web)".

## Mantine 9 readiness

Already handled:

- `defaultRadius` is explicit.
- `light` variants are self-defined.
- `useLocalStorage` always gets a `defaultValue`.
- No removed APIs are used.

React 19.2.3 landed with the Expo SDK 57 migration, so the upgrade is unblocked; it ships as its own PR. When it happens, also set `<Notifications pauseResetOnHover="notification" />`.
