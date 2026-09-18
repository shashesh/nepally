---
title: Web UI overhaul — H1 design system, component library, responsive shell, global search
status: planned
created: 2026-09-14
---

# Web UI Overhaul — Design

**Scope:** `apps/web` (plus shared search API/types in `packages/shared` and one migration).
**Out of scope:** `apps/mobile` UI, dark mode, the Mantine 9 bump itself, Expo SDK upgrade.

## 1. Summary

Replace the web app's three competing visual languages with one token-driven design system
("H1 · Ink & Marigold"), build a small shared UI component library on Mantine 8 that is
ready for Mantine 9, split the oversized pages into focused components, give phone-width
browsers real navigation, and add global search (posts, marketplace listings, people).
Delivered as a sequence of reviewable PRs guarded by visual-regression and a11y tests.

### Goals

- One source of truth for colour, type, spacing, radius, motion, breakpoints.
- Mantine-first interactive primitives; no hand-rolled menus/dialogs/tabs.
- Consistent loading / empty / error states; no native `confirm()` / `alert()` / `prompt()`.
- Accessible by default: keyboard, focus, ARIA landmarks, no nested interactive elements.
- Usable navigation at every width (desktop rail, tablet icon rail, phone bottom tabs).
- Global search with live suggestions and a full results page.
- Mantine 8 → 9 becomes a mechanical, visually-verified bump once React 19.2 is available.

### Non-goals

- Mobile app screens (tokens may be adopted there later; not in this effort).
- Dark mode (the semantic token layer makes it possible later).
- Searching events.
- A component showcase / Storybook.
- Upgrading Mantine to 9.x or Expo to 56+/57 (see §8).

## 2. Context (audit, 2026-09-14)

- **Blocker:** Mantine 9.6.1 requires React ^19.2. Web and mobile share an exact React
  19.1.4 pin because RN 0.81 (Expo 54) enforces an exact renderer match
  (`TECH-VERSIONS.md` → Deferred Upgrades). Decision: do the UI work on Mantine 8 now.
- **Three visual languages:** `mantine-theme.ts` (Plus Jakarta Sans, `#0E5F9C`, radius
  md 14px) claims to mirror `design-system.css` ("Curated Connection": Inter/Manrope,
  `#00408b`, glassmorphism) but doesn't; `design-system-next.css` (Gambarino/Switzer,
  crimson) is imported globally but its `--next-*` tokens are consumed nowhere.
- **Mantine is thin:** 43 imports across 35 files; ~5.1k lines of custom CSS Modules;
  ~72 raw `<button>`, 28 `<input>`, 4 `div role="button"`. Menu used in 2 places, Tabs
  and Tooltip never.
- **Monolithic pages:** `feed` 1290 lines, `posts/[id]` 984, `profile` 778,
  `posts/create` 729, `users/[id]` 678, `Layout.tsx` 630.
- **Duplication:** lightbox (~210 TSX + ~130 CSS lines ×2), photo carousel ×3, ~6
  hand-rolled dropdown menus (+4 manual click-outside listeners), 4 loading patterns,
  5 empty-state copies, 3 IntersectionObserver infinite-scroll copies, 4 image
  uploaders, notification item ×2, `timeAgo` ×2 and `getInitials` ×2 despite shared
  `formatRelativeTime`.
- **Hard-coded colours:** 401 hex values in `.module.css` (marketplace 112, promote 97,
  createEvent 54, …).
- **UX / a11y defects:** no navigation below 980px; 25 native `confirm()`/`alert()` +
  2 `prompt()`; `PostCard` is a `<Link>` containing buttons; `<Link>` wrapping Mantine
  `<Button>` in several pages; custom menus lack role/Escape/focus management; lightboxes
  lack dialog role and focus trap; profile tabs lack ARIA; `outline: none` without
  replacement in 4 modules.
- **Broken links:** header search → `/search` (no page); `users/[id]` links to
  `/posts/new` and `/marketplace/new` (real routes are `/create`).
- **Tests:** `test-utils.tsx` renders a bare `MantineProvider` (no theme); some unit and
  e2e tests assert on Mantine internals (`data-loading`, `data-disabled`) or CSS-module
  class substrings, or DOM nesting (`locator('..')`). Playwright runs Desktop Chrome
  only, with Supabase mocked (`e2e/helpers/supabase-mock.ts`), no screenshot assertions.

## 3. Decisions

| Topic | Decision |
|---|---|
| Sequencing | UI overhaul on Mantine 8, written v9-ready; Mantine 9 follows the Expo upgrade |
| Platforms | Web only |
| Visual direction | **H1 · Ink & Marigold** — B's editorial type/spacing (Gambarino + Switzer, borders over shadows, warm paper neutrals) with ink-navy actions and marigold accent; crimson reserved for Emergency |
| Extra scope | Phone-width navigation; visual regression tests; global search |
| Rollout | Foundation first (with legacy token aliases), then shell + primitives, then one PR per product area, then cleanup |
| Phone nav | **M1** — bottom tabs mirroring the native app: Home · Events · + · Market · Profile |
| Search content | Posts, marketplace listings, people |
| Search scope | Current metro (+ global posts) by default with an "All metros" toggle; people nationwide, own metro ranked first |
| Search UX | **S3 → S1** — live suggestion dropdown with per-group "more" links and "See all results" into a tabbed results page |

## 4. Design

### 4.1 Tokens and theme

**File layout (replaces `design-system.css` and `design-system-next.css`):**

```
apps/web/src/styles/
  tokens.css           # primitives + semantic tokens (source of truth)
  legacy-aliases.css   # TEMPORARY: old --color-*/--font-*/--space-* → new tokens (deleted in PR 10)
  globals.css          # reset, base element styles, focus ring; imports the two above
  mantine-theme.ts     # Mantine theme built from the same values
  fonts.ts             # next/font/local declarations exposing --font-display / --font-body
```

**Two layers.** Primitives (`--ink-*`, `--marigold-*`, `--paper-*`, `--moss-*`,
`--crimson-*`) exist only to feed semantic tokens. CSS Modules may use **semantic
tokens only**.

**Semantic tokens (light theme; oklch):**

| Token | Value | Role |
|---|---|---|
| `--surface-0` | `oklch(98.2% .008 75)` | page background (warm paper) |
| `--surface-1` | `oklch(100% 0 0)` | cards, bars, inputs |
| `--surface-2` | `oklch(96% .010 75)` | hover / selected rows, active rail item |
| `--surface-sunken` | `oklch(94% .012 75)` | wells, skeleton base |
| `--text-1` | `oklch(19% .02 265)` | primary text (ink-tinted) |
| `--text-2` | `oklch(44% .015 75)` | secondary text |
| `--text-3` | `oklch(54% .014 75)` | tertiary / meta — 60% failed 4.5:1 on `--surface-0`; enforced by the PR 1 contrast test |
| `--border-subtle` | `oklch(92% .012 75)` | card and divider borders |
| `--border-solid` | `oklch(86% .014 75)` | inputs, outline buttons, chips |
| `--action-bg` | `oklch(26% .07 265)` | primary buttons, active pills/tabs (ink navy) |
| `--action-bg-hover` | `oklch(32% .08 265)` | |
| `--action-fg` | `oklch(100% 0 0)` | |
| `--accent` | `oklch(76% .15 70)` | marigold: brand dot, button underline, active indicators, unread dots — **never text** |
| `--accent-tint` | `oklch(94% .05 85)` | Local chip, Contributor badge, search highlight |
| `--accent-ink` | `oklch(42% .09 65)` | text on `--accent-tint` (chroma .10 is outside sRGB) |
| `--trust-new-fg` / `-bg` | `oklch(40% .01 75)` / `oklch(94% .008 75)` | Level 0 |
| `--trust-verified-fg` / `-bg` | `oklch(35% .08 155)` / `oklch(95% .025 155)` | Level 1 (moss) |
| `--trust-contributor-fg` / `-bg` | `var(--accent-ink)` / `var(--accent-tint)` | Level 2 |
| `--emergency-fg` / `-bg` / `-border` | `oklch(42% .16 25)` / `oklch(95% .04 25)` / `oklch(85% .08 25)` | Emergency tag and banners only |
| `--success` / `--warning` / `--danger` | `oklch(45% .08 155)` / `oklch(55% .11 65)` / `oklch(50% .20 25)` | form validation, toasts |
| `--tag-housing` / `-jobs` / `-help` / `-question` / `-politics` / `-discussion` | `oklch(55% .12 155)` / `oklch(52% .11 255)` / `oklch(65% .12 75)` / `oklch(50% .11 300)` / `oklch(45% .03 265)` / `oklch(55% .09 200)` | topic dots (not full-colour pills); `--tag-emergency` = `var(--emergency-fg)`. Web-only — shared tag constants used by mobile are not changed |

**Typography:** `--font-display` Gambarino (headings, post titles, section titles; weight
400), `--font-body` Switzer (400/500/600). Scale: `--font-size-xs` 13px,
`--font-size-sm` 15px, `--font-size-base` 17px, `--font-size-lg` 19px, `--font-size-xl`
24px, `--font-size-display` `clamp(2.25rem, 1.5rem + 2vw, 3rem)`. Leading
`--leading-tight` 1.15 / `-snug` 1.35 / `-normal` 1.55.

**Spacing (4pt):** `--space-1…9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px.
**Radius (purpose-named):** `--radius-chip` 4 (trust chips), `--radius-tag` 6,
`--radius-control` 8 (buttons, inputs), `--radius-card` 12, `--radius-overlay` 16
(modals, sheets, suggestion dropdown), `--radius-full`. Mantine `radius` maps
xs→chip, sm→tag, md→control, lg→card, xl→overlay.
**Elevation:** borders by default; exactly two shadows — `--shadow-float` (menus,
popovers, suggestion dropdown) and `--shadow-modal`. No glassmorphism, no gradients.
**Motion:** `--duration-fast` 160ms, `--duration-base` 240ms, `--ease-out`
`cubic-bezier(0.25, 1, 0.5, 1)`; all non-essential motion behind
`prefers-reduced-motion: no-preference`.
**Breakpoints:** Mantine defaults via the existing `postcss-simple-vars` config —
`$mantine-breakpoint-sm` 48em (phone ↔ tablet), `-md` 62em (tablet ↔ desktop),
`-lg` 75em. The ten ad-hoc pixel breakpoints are removed as areas migrate.
**Focus ring (global, `:focus-visible`):** 2px `--action-bg` outline, 2px offset, plus a
2px `--accent` halo outside it. Ink carries the ≥3:1 contrast; marigold is the signature.

**Fonts:** self-hosted woff2 via `next/font/local` (no third-party request, no layout
shift), exposed as CSS variables on `<html>`. Remove the Google Fonts (Inter/Manrope) and
Fontshare `@import`s. *Verify in PR 1* that the ITF Free Font License permits
self-hosting; if not, load from the Fontshare CDN with `preconnect` and `display=swap`.

**Mantine theme (`mantine-theme.ts`):**
- `colors.ink` and `colors.marigold` 10-shade tuples (literal values; Mantine needs real
  colours to derive variants); `primaryColor: 'ink'`.
- `fontFamily` / `headings.fontFamily` from the font variables; `headings.fontWeight: '400'`.
- `fontSizes`, `spacing`, `radius`, `breakpoints` mapped 1:1 to the tokens.
- **Explicit** `defaultRadius: 'md'` (Mantine 9 changes the default).
- `cssVariablesResolver` maps `--mantine-color-body`, `--mantine-color-text`,
  `--mantine-color-default-border`, `--mantine-color-dimmed`, placeholder, etc. to the
  semantic tokens so Mantine components sit on paper surfaces.
- `variantColorResolver` defines the `light` variant explicitly (tint bg + ink text) so
  Mantine 9's change to solid light colours cannot shift visuals.
- `components`: theme-level `classNames`/`defaultProps` for Button (primary = ink with
  marigold inset underline; `default` = outline on `--border-solid`), Badge, Input,
  Menu, Popover, Modal, Tabs (marigold active indicator), Switch, Skeleton, Notification.
- Notification hover pausing: `pauseResetOnHover` does not exist in `@mantine/notifications`
  8.3.18, so it is set during the Mantine 9 upgrade (§8).
- **Sync test** (`mantine-theme.test.ts`): parses `tokens.css` and asserts theme base
  shades, radii, spacing and font sizes equal the token values.
- **Contrast test** (`tokens.contrast.test.ts`): asserts WCAG AA (4.5:1) for every
  `--text-*` on `--surface-0/1`, `--action-fg` on `--action-bg`, `--accent-ink` on
  `--accent-tint`, trust and emergency fg/bg pairs (oklch → sRGB via `culori`, dev dep).

**Legacy bridge:** `legacy-aliases.css` maps every old variable in
`design-system.css` onto the new tokens so the entire app re-skins in PR 1:

| Old family | Maps to |
|---|---|
| `--color-primary*`, `--color-text-*`, `--color-bg`, `--color-surface*`, `--color-border*`, `--color-trust-*`, `--color-success/-error/-warning`, `--color-accent-red` | nearest semantic token (`--action-bg`, `--text-1/2/3`, `--surface-*`, `--border-*`, `--trust-*-fg`, `--success`/`--danger`/`--warning`, `--emergency-fg`) |
| `--color-primary-rgb`, `--color-secondary-rgb` | sRGB triplets equivalent to `--action-bg` / `--accent`, so the 69 existing `rgba(var(--…-rgb), α)` uses (9 modules: Layout, LocationSwitcher, Auth, CreatePost, Feed, NotificationPreferences, Notifications, PostDetail, Profile) keep working; area PRs rewrite them to tint tokens or `color-mix(in oklch, …)` |
| `--color-secondary*`, `--color-banner-bg/-text`, `--color-disabled` | `--accent` / `--accent-tint` / `--accent-ink`, and `--border-solid` for disabled |
| `--max-width`, `--content-width`, `--sidebar-width`, `--nav-height`, `--input-height`, `--button-height`, `--card-padding`, `--dropdown-bg/-border/-shadow` | carried into `tokens.css` as layout tokens (`--layout-*`, `--control-height`, `--card-padding`); old names aliased; dropdown → `--surface-1` / `--border-subtle` / `--shadow-float` |
| `--gradient-primary*`, `--gradient-secondary` | `var(--action-bg)` / `var(--accent)` (solid; usages audited for `background-image`) |
| `--glass-*`, `--surface-topbar-*`, `--surface-nav-*`, `--surface-rail-*` | `--surface-1`, blur `none`, `--border-subtle` |
| `--shadow-sm`, `--shadow-md` | `0 0 0 1px var(--border-subtle)` (cards keep separation without soft shadows) |
| `--shadow-lg`, `--shadow-glass`, `--dropdown-shadow` | `var(--shadow-float)` |
| `--font-family` | `var(--font-body)` |
| `--font-size-h1/h2/h3/body/small/caption` | `--font-size-display/xl/lg/base/sm/xs` |
| `--space-xxs…xxl` | `--space-1/2/4/5/6/7/8` |
| `--radius-sm/md/lg/xl/full` | `--radius-control/card/overlay/overlay/full` |
| `--transition-fast/normal/spring` | `var(--duration-fast) var(--ease-out)` / `var(--duration-base) var(--ease-out)` |

**Name-collision rule:** no new token reuses an old variable name with a different
meaning. The only shared name, `--font-display`, keeps its role (display face) and simply
points at Gambarino. Hard-coded hex values are not covered and remain off-palette until
their area PR. `design-system-next.css` is deleted in PR 1 (unused); `legacy-aliases.css`
is deleted in PR 10.

**Enforcement:**
- `scripts/guard-css-tokens.js` (wired into `lint:guards`, modelled on
  `guard-no-catch-any.js`): fails on hex/rgb colour literals or legacy token names in
  `apps/web/src/**/*.module.css`. Starts with an allowlist of current offenders; each area
  PR removes its files; PR 10 deletes the allowlist.
- ESLint `react/forbid-elements` for `button`, `input`, `select`, `textarea` in
  `apps/web/src` outside `components/ui/`, with a shrinking allowlist (file overrides).

### 4.2 Component library

Follows the existing layout: flat `Component.tsx` + `Component.module.css` +
`Component.test.tsx`.

**`components/ui/` — domain-free primitives (each has ≥2 call sites today):**

| Component | Built on | Replaces |
|---|---|---|
| `ConfirmDialog`, `PromptDialog`, `useConfirm()` / `usePrompt()` | `@mantine/modals` (new) | 25 `confirm`/`alert`, 2 `prompt` |
| `ActionMenu` | Mantine `Menu` | ~6 custom dropdowns, 4 manual click-outside listeners |
| `EmptyState` (icon, title, body, action) | — | 5 empty-state copies |
| `LoadingState` (`list` / `card` / `detail` skeletons) | Mantine `Skeleton` | 4 loading patterns |
| `ErrorState` (message + retry) | Mantine `Alert` | 4 error patterns |
| `PageHeader` (title, back link, actions) | — | `.header` / `.title` / `.backLink` in 6–14 modules |
| `TagChip` (dot style; Emergency variant) | Mantine `Badge` | ~7 chip implementations |
| `ScopeBadge` (Local · metro / Global) | Mantine `Badge` | Mantine + custom span variants |
| `TrustBadge` (new / verified / contributor) | Mantine `Badge` | `trustBadge`, `trustChip`, "Verified Seller" |
| `Avatar` (extend: sizes, verified mark, image fallback, initials colour) | existing wrapper | custom avatar in `users/[id]` |
| `ImageLightbox` | Mantine `Modal` (fullScreen) | 2 lightbox copies (adds focus trap, dialog role, Escape) |
| `PhotoCarousel` | CSS scroll-snap (no dependency) | 3 carousel copies |
| `ImageUploader` (drop, pick, reorder, remove, limits) | `@mantine/dropzone` (new) | 4 uploaders |
| `useInfiniteScroll` (hook, `hooks/`) | Mantine `useIntersection` | 3 IntersectionObserver copies |

No wrappers for Tabs, TextInput, Textarea, Select, Switch, Tooltip — styled once in the
theme and used directly.

**`components/<domain>/` — extracted from pages:**
- `layout/`: `AppShell`, `TopBar`, `SideRail`, `BottomTabBar`, `NotificationBell`,
  `AccountMenu`, `PublicShell` (§4.3)
- `posts/`: `PostCard`, `PostActions`, `PostMeta`, `CommentThread`, `CommentComposer`,
  `PostComposer`
- `notifications/`: `NotificationItem` (shared by bell popover and page)
- `users/`: `UserMenuTrigger` (avatar → View profile / Message), `PersonRow`
- `search/`: `SearchCombobox`, `SearchOverlay`, `SearchResultItem` (§4.4)
- existing `events/`, `marketplace/`, `profile/`, `pulse/` gain extracted pieces per area PR

**`packages/shared`:** web's `timeAgo` copies → existing `formatRelativeTime`;
`getInitials` and the deterministic avatar colour hash → `src/utils/` with tests.
(Mobile keeps its local copies — out of scope.) Photo-upload logic duplicated between
post create and edit is consolidated; storage calls go through a shared API function.

**Conventions:**
- Navigation elements are links, actions are buttons: `<Button component={Link}>`, never
  `<Link><Button/></Link>`.
- Clickable cards use the stretched-link pattern (the title link's `::after` covers the
  card; inner buttons sit above it with `position: relative`).
- Props follow Mantine naming (`size`, `variant`, `className` passthrough); no inline
  `style={{}}`; no hex in TSX.
- Toasts via a thin `notify.success/error` helper over `@mantine/notifications`.

### 4.3 App shell and navigation

`Layout.tsx` becomes a thin composition over Mantine `AppShell`:

| Width | Header | Navigation |
|---|---|---|
| ≥ 62em | `TopBar`: logo, `LocationSwitcher`, `SearchCombobox`, bell, messages, `AccountMenu` | `SideRail` full: Feed · Topics (dot + label) · Events · Marketplace · Moderation (moderators) · Create post CTA (Level 0: "Verify to post") · footer links |
| 48–62em | same `TopBar` | `SideRail` icon-only with tooltips |
| < 48em | `TopBar`: logo, search icon, bell, messages | `BottomTabBar`: Home · Events · **+** · Market · Profile |

**BottomTabBar details:** fixed; marigold indicator on the active tab; `+` is an ink
circle (Level 0 → verification route); `padding-bottom: env(safe-area-inset-bottom)`;
`main` gets matching bottom padding; hidden on full-screen task routes (post/listing/event
composers, message thread) so it never covers input bars.

**Phone-width specifics:** bell navigates to `/notifications` (no popover); location
switcher and topic pills render at the top of the feed; Profile page gains a
"Settings & more" list — Locations, Notification settings, Moderation (moderators),
Guidelines, Help, Privacy, Terms, Sign out.

**Logic out of the layout:** realtime/polling for unread chats and notifications moves to
`hooks/useUnreadMessageCount` and `hooks/useNotificationsFeed` (web-specific:
`visibilitychange`), calling shared API functions.

**Signed-out:** `PublicShell` with logo, Log in / Sign up, footer links — same tokens.

**Shell a11y:** skip-to-content link; `<nav aria-label="Primary">` (rail) and
`<nav aria-label="Tabs">` (bottom bar); `aria-current="page"`; unread counts in accessible
names ("Notifications, 3 unread"); popover/menus keyboard-operable via Mantine.

### 4.4 Global search

**UX (S3 → S1):**
- **Suggestions** (`SearchCombobox`, desktop/tablet top bar): starts at 2 characters,
  250ms debounce, stale responses discarded. Groups: Posts (3), Listings (2), People (3);
  empty groups hidden. Each group's `total_count` says whether it has more; if so it shows
  "More posts →" linking to `/search?q=…&tab=posts`. Footer "See all results for “q”"
  → `/search?q=…` (All tab). ↑/↓ move, Enter opens the highlighted item or — with nothing
  highlighted — the results page; Escape closes. No counts in the dropdown.
- **Empty suggestions:** "No matches in {metro}" + "Search all metros" action.
- **Phone:** search icon opens `SearchOverlay` (full-screen, input autofocused), same
  groups and links.
- **Results page** (`pages/search.page.tsx`): heading "Results for “q”", scope segmented
  control (📍 {metro} / All metros), Mantine `Tabs`: All · Posts · Listings · People with
  counts. All = top 2–3 per type with "See all" links; type tabs = full lists with
  `useInfiniteScroll`. `q`, `tab`, `scope` live in the URL (shareable, Back-safe).
  Matches highlighted with `<mark>` styled `--accent-tint`. Signed-in only (redirect to
  login otherwise).

**Database — `supabase/migrations/037_search.sql` (additive only):**
- `public.post_search_document(title, description)` (IMMUTABLE: title weighted `A`, body
  `B`, `english` config) with a GIN **expression** index on `posts`.
- `public.person_search_document(full_name)` (IMMUTABLE, `simple` config — names are not
  stemmed) with a GIN expression index on `users`.
- Expression indexes instead of `STORED` columns: a `posts.search_vector` column would
  ship in every `select('*')` feed payload, and a `users` column would need a new column
  grant. The search functions call the identical expressions, so the indexes apply.
- `public.build_prefix_tsquery(p_input text, p_config regconfig) RETURNS tsquery`
  (IMMUTABLE): splits on non-alphanumerics, drops empty tokens, ANDs them, adds `:*` to
  the last token; returns NULL for empty input. All sanitising happens here, so callers
  can never produce an invalid `tsquery`.
- `search_posts(p_query, p_metro_id, p_all_metros, p_limit, p_offset)`,
  `search_listings(p_query, p_metro_id, p_all_metros, p_limit, p_offset)`,
  `search_people(p_query, p_metro_id, p_limit, p_offset)`:
  - `SECURITY INVOKER`, `SET search_path = ''`, `REVOKE … FROM PUBLIC, anon`,
    `GRANT EXECUTE … TO authenticated` — RLS and column grants apply unchanged.
  - Posts: `status = 'active'` and (`p_all_metros` or `metro_area_id = p_metro_id` or
    `is_global`), ordered by `ts_rank` desc then `created_at` desc.
  - Listings: from `marketplace_listings_view`, `status = 'active'`, metro rule as posts,
    ordered by `ts_rank` then `refreshed_at` desc (existing `search_vector`).
  - People: `is_banned = false`; returns **only** `id, full_name, profile_photo,
    trust_level, metro_area_id, follower_count`; ordered by
    (`metro_area_id = p_metro_id`) desc, `ts_rank` desc, `follower_count` desc.
  - Each returns a `total_count` (window count) for the results-page tab labels.
- Result shape and ordering (decided during planning — no verification spike):
  `search_posts` returns `id, rank, created_at, total_count`; `search_listings` returns
  `id, rank, refreshed_at, total_count`; `search_people` returns the public columns plus
  `is_local, rank, total_count`. The shared API applies ordering and paging with
  PostgREST `.order()` / `.range()` on the function result, then hydrates posts and
  listings with the existing `POST_SELECT` / `LISTING_SELECT` via `.in('id', ids)` and
  restores the rank order.

**Shared — `packages/shared`:**
- `types/search.ts`: `SearchScope`, `SearchTab`, `PostSearchResult`,
  `ListingSearchResult`, `PersonSearchResult`, `SearchGroup<T> { items, hasMore }`,
  `SearchSuggestions`.
- `utils/searchQuery.ts`: `normalizeSearchInput(raw)` (trim, collapse whitespace, null
  if < 2 chars, max length) and `highlightSegments(text, query)` → `{ text, match }[]`.
- `api/search.ts`: `searchPosts`, `searchListings`, `searchPeople` (paged, with
  `totalCount`) and `searchSuggestions(supabase, q, { metroId, allMetros })` (three
  calls in parallel; each group's `hasMore` comes from its `total_count`). All accept `SupabaseClient`.

**Web:** `components/search/SearchCombobox` (Mantine `Combobox`), `SearchOverlay`,
`SearchResultItem` (`post` / `listing` / `person`), `hooks/useSearchSuggestions`
(Mantine `useDebouncedValue` + request sequencing), `pages/search.page.tsx`.

**Docs:** new evergreen `docs/product/features/search.md` when PR 3b ships.

### 4.5 Accessibility baseline (applies to every PR)

- Every interactive element: default, hover, active, `:focus-visible`, disabled states.
- No `outline: none` without the token focus ring replacement.
- No nested interactive elements; links navigate, buttons act.
- Dialogs, menus, popovers, lightboxes, tabs, comboboxes use Mantine primitives (role,
  focus trap/return, Escape, arrow keys).
- Icon-only buttons have `aria-label`; images have meaningful `alt` or `alt=""`.
- Text tokens meet WCAG AA (enforced by the contrast test).

## 5. Rollout

Each PR is its own branch off `master`; commits are free, pushes require approval.

| # | PR | Contents |
|---|---|---|
| 0 | **Safety net** | Playwright `visual` project (screenshots) for login, signup, feed, post detail, create post, profile, public profile, events, event detail, marketplace, listing detail, messages, notifications — at 1280px desktop and Pixel 7 phone; `@axe-core/playwright` scan per page (fail on critical/serious violations not in `a11y-baseline.json`); fallback route for unmocked Supabase REST calls; replace brittle selectors (`data-loading`, `data-disabled`, class substrings, `locator('..')`) with role/label queries; baseline tooling (§6). Captures today's UI. |
| 1 | **Foundation** | `tokens.css`, `fonts.ts`, `legacy-aliases.css`, rebuilt `mantine-theme.ts` + sync and contrast tests, global focus ring, `test-utils` uses the real theme, `ModalsProvider`, explicit Mantine 9-sensitive settings, `guard-css-tokens.js` and `forbid-elements` with allowlists, delete `design-system-next.css`, create `docs/architecture/web-ui-system.md`. Screenshots intentionally re-baselined. |
| 2 | **Shell + primitives** | §4.3 shell; `components/ui/*` from §4.2 (except `ImageLightbox`/`PhotoCarousel` → PR 4 and `ImageUploader` → PR 5, where first adopted); `phone` Playwright project + bottom-tab e2e; `useInfiniteScroll`; unread hooks; shared `getInitials`/avatar colour; Profile "Settings & more"; fix `/posts/new` and `/marketplace/new`; remove the broken search input. |
| 3a | **Search: data + shared** | `037_search.sql`; `types/search.ts`, `utils/searchQuery.ts`, `api/search.ts` + tests; extend `scripts/security/users-pii-smoke.ts` for `search_people` (public columns only, banned excluded). Migration applied before 3b deploys. |
| 3b | **Search: web** | `SearchCombobox`, `SearchOverlay`, `SearchResultItem`, `useSearchSuggestions`, `/search` page; unit, e2e (type → pick; "more posts" → Posts tab; all-metros toggle), visual (dropdown + page, desktop + phone); `docs/product/features/search.md`. |
| 4 | **Feed + post detail** | `PostCard` (stretched link), `PostActions`, `PostMeta`, `CommentThread`, `CommentComposer`, `ImageLightbox`, `PhotoCarousel` adoption. |
| 5 | **Create flows** | posts, marketplace, events create/edit on Mantine inputs; `ImageUploader`; consolidated upload logic. |
| 6 | **Profile + public profile** | Mantine `Tabs`, `TrustBadge`, `PromptDialog`, photo uploader, `AboutYouSection`. |
| 7 | **Events** | list, detail, create; `EventCard`, `EventFilterBar`, `RsvpButton`, `AttendeeList`. |
| 8 | **Marketplace** | index, category, listing detail, my listings, promote, promote success; `ListingCard`, `ListingStrip`, `FilterBar`. |
| 9 | **Messages, notifications, moderation** | conversation list and thread, notifications page (uses `NotificationItem`), moderation queue; remaining `confirm()`s. |
| 10 | **Auth, onboarding, static pages + cleanup** | login, signup, verify-email, onboarding/zip, legal, guidelines, help; delete `legacy-aliases.css`; delete both allowlists; mark `docs/wireframes/00-design-system-foundation` superseded; final `web-ui-system.md` pass. |

**Definition of done — every area PR (4–9, and 10's pages):**
- Its CSS Modules removed from the token-guard allowlist; its files removed from the
  `forbid-elements` allowlist.
- No native `confirm` / `alert` / `prompt` in the area.
- Page files ≲ 350 lines (guideline); inline sub-components extracted.
- Keyboard walkthrough of the area's flows; axe scans pass.
- Unit tests updated/added; screenshots intentionally updated and reviewed.
- `npm run lint`, `lint:guards`, `type-check`, workspace and monorepo tests, web e2e,
  `docs:check` all pass.

## 6. Testing strategy

- **Unit (Vitest):** every new component/hook/util; theme sync + contrast tests; shared
  search utils (injection characters, unicode/Devanagari names, min length) and API
  functions (mocked `rpc`); combobox keyboard behaviour; results page URL ↔ state sync.
  Tests query by role/label, never by Mantine internals or CSS-module class names.
- **E2E (Playwright, Supabase mocked):** existing specs kept green; new `phone` project
  covers bottom-tab navigation and the Profile "Settings & more" list; search flows.
- **Visual regression:** `toHaveScreenshot` with animations disabled, dynamic text
  (relative times, counts) masked, clock frozen via `page.clock`, self-hosted fonts.
  Baselines are **Linux-only** (CI runs `ubuntu-latest`): generated in the official
  Playwright Docker image (`npm run test:visual:docker --workspace=apps/web -- --update`)
  or by the manual `Visual baselines` workflow (`.github/workflows/visual-baselines.yml`),
  whose artifact is committed. PR CI runs the visual projects in a `web_visual` job inside
  the same container image. Non-Linux hosts skip screenshots; `test:visual:smoke` still
  checks every page reaches its ready state.
- **Accessibility:** `@axe-core/playwright` on every visual page, failing on
  critical/serious violations.
- **Security:** `npm run test:security:users-pii` extended for `search_people`.

## 7. Risks and verification items

| Risk / unknown | Mitigation |
|---|---|
| Fontshare licence may not allow self-hosting | Verify in PR 1; fallback to Fontshare CDN with `preconnect` |
| `--text-3` and other pairs may miss 4.5:1 | Contrast test in PR 1 adjusts lightness before any page work |
| 17px body size lengthens dense pages (moderation, notifications) | Dense views may use `--font-size-sm`; reviewed in screenshots |
| Interim inconsistency: pages with hard-coded hex look off-palette until their PR | Worst offenders (marketplace, promote, events) scheduled explicitly; aliases keep token-based pages coherent |
| Screenshot baselines differ across OS | Linux-only baselines via Docker / CI dispatch |
| Bottom tab bar colliding with input bars / iOS safe areas | Hidden on task routes; safe-area padding; phone e2e + screenshots |
| Ranked results lose their order when hydrated | Functions return ranked ids; the shared API orders via PostgREST and re-orders hydrated rows (unit-tested) |
| GIN expression-index builds briefly block writes on `posts`/`users` | Tables are small at current scale; apply off-peak |
| Search load from suggestions | 2-char minimum, 250ms debounce, small page sizes, GIN expression indexes |
| Today's UI already has serious axe violations | Recorded per page in `a11y-baseline.json`; only new violations fail; area PRs delete their entries |

## 8. Mantine 9 readiness (executed after the Expo upgrade)

Pre-neutralised in this effort: explicit `defaultRadius`; `light` variant via
`variantColorResolver`; no use of `Collapse in`,
`Spoiler initialState`, `Grid gutter`, `Text`/`Anchor` `color`,
`TypographyStylesProvider`, `positionDependencies`, or the split/renamed hooks
(`useFullscreen`, `useMouse`, `useMutationObserver`, `useHeadroom` boolean);
`useLocalStorage` always given a `defaultValue`.

Upgrade steps (separate PR): Expo 54 → 56+ unblocks React 19.2+ → bump all `@mantine/*`
(including `modals`, `dropzone`) to 9.x → set `<Notifications pauseResetOnHover="notification" />` (keeps today's
per-notification pausing) → run unit, e2e, **visual (expect zero diffs)** →
update `TECH-VERSIONS.md` (remove the React 19.2 / Mantine 9 deferred rows).

## 9. Documentation

- This spec: `docs/specs/2026-09-14-web-ui-overhaul-design.md` (status `planned`).
- Implementation plan: `docs/plans/active/2026-09-14-web-ui-overhaul.md`. It details
  PRs 0–3b task by task; PRs 4–10 are listed with their scope and the §5 definition of
  done, and each gets a task-level breakdown appended to the plan when that PR starts
  (area internals depend on the primitives shipped in PR 2).
- PR 1 creates `docs/architecture/web-ui-system.md` (tokens, component catalogue,
  conventions); later PRs keep it current.
- PR 3b adds `docs/product/features/search.md`.
- PR 10 marks `docs/wireframes/00-design-system-foundation` superseded.
- `docs/INDEX.md` updated in the same commit as each doc change.
- On completion: spec and plan → `status: implemented`, `git mv` to `docs/archive/`.
