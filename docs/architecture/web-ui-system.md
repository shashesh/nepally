# Web UI System

**Last updated:** 2026-09-14
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
- Use theme colour props (`c="ink.8"`), never `var(--mantine-color-…)` strings in TSX.

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

`EmptyState`, `LoadingState`, `ErrorState`, `PageHeader`, `TagChip`, `ScopeBadge`, `TrustBadge`, `ActionMenu`, and `useConfirm` / `usePrompt` (never `window.confirm`/`alert`/`prompt`). `hooks/useInfiniteScroll` handles paginated lists. `Avatar` uses shared `getInitials` and token tones.

`notify.success(message)` and `notify.error(message)` are the only way to raise a toast; they wrap `@mantine/notifications` so colour and duration stay consistent.

`PhotoCarousel` shows one photo at a time with wrap-around previous and next, announces "Photo 2 of 3", and keeps a 40px swipe threshold. `ImageLightbox` is the full-screen viewer over Mantine `Modal`, which owns the focus trap, Escape and scroll lock; it adds paging, seven zoom levels and controls that fade after 1.5s.

`ImageUploader` is the only photo picker: drop or click to choose, thumbnails, remove, and optional reorder. Over @mantine/dropzone.

| Prop | Meaning |
|---|---|
| `photos` / `onChange` | Controlled `UploaderPhoto[]`. Each entry is `{ kind: 'stored', url }` for a photo already in storage or `{ kind: 'picked', id, previewUrl, file }` for one just chosen |
| `max`, `maxBytes`, `accept` | Limits, read from shared constants by the caller. Picking past `max` takes the remaining slots and says so |
| `label`, `description`, `error` | The group's accessible name, its hint and its error. The add control is named "Add {label}" |
| `reorderable` | Adds "Move photo N left/right", with a live region announcing where a photo landed |
| `transformFile` | Runs per accepted file before it enters state — create listing passes `resizeImage`. A file that throws is skipped and counted in one message |

It owns every object URL it mints and revokes them on removal and unmount, so pages never touch `URL.createObjectURL`. Once every slot is used the input is marked `disabled` explicitly, because react-dropzone only drops its handlers.

`ToggleChipGroup` is the labelled row of toggle chips behind post tags, event types and listing categories. The chips are buttons with `aria-pressed`, not checkboxes, so state is announced by the platform rather than baked into the name. `mode` is `'single'` or `'multiple'`; `max` disables the unpressed chips at the cap while leaving pressed ones releasable. Each chip carries `data-value`, which is how create event colours its five types from `--event-<type>-fg` / `-bg` without the component knowing any event vocabulary.

## Web-only helpers (`src/lib`)

| Helper | Notes |
|---|---|
| `toPhotoUploadInputs(files, userId)` | `File[]` → the byte-carrying shape the shared storage API takes. The `File` API is DOM-only, which is why this is not in `packages/shared` |
| `uploadPhotosInOrder(photos, userId, upload)` | Uploads the picked photos, then returns every photo's URL in display order. Concatenation is not enough: a member can drop a new photo in front of a saved one |
| `resizeImage(file)` | Downscales to 1200px wide at JPEG quality 0.8, returning a `File`. Passed to `ImageUploader` as `transformFile` |
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
