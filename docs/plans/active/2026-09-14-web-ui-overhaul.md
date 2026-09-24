---
title: Web UI overhaul — implementation plan
status: in-progress
created: 2026-09-14
spec: docs/specs/2026-09-14-web-ui-overhaul-design.md
---

# Web UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web app's three visual languages with the H1 "Ink & Marigold" token system, a Mantine-8 component library that is ready for Mantine 9, a responsive shell with phone bottom tabs, and global search. It ships as a sequence of small PRs guarded by visual and accessibility regression tests.

**Architecture:** `tokens.css` is the single source of truth. A temporary `legacy-aliases.css` re-skins every existing CSS Module at once, and the Mantine theme mirrors the tokens (enforced by a sync test). The 630-line `Layout.tsx` becomes a composition of focused shell components over Mantine `AppShell`. Search is three `SECURITY INVOKER` Postgres functions that return ranked ids. Shared API functions wrap them and hydrate rows with the existing selects. On web, a Mantine `Combobox` and a `/search` page sit on top.

**Tech Stack:** Next.js 16.3 (pages router) · React 19.2.3 · Mantine 8.3.18 (+ `@mantine/modals` 8.3.18) · CSS Modules + postcss-preset-mantine · Vitest 4 + Testing Library · Playwright 1.63 (+ `@axe-core/playwright` 4.13) · culori 4 · Supabase Postgres 17 · TypeScript 7 (`npm run type-check`).

**Spec:** [docs/specs/2026-09-14-web-ui-overhaul-design.md](../../specs/2026-09-14-web-ui-overhaul-design.md)

## Global Constraints

- Web only. Do not change anything under `apps/mobile/`.
- React stays at exactly `19.2.3` (the Expo SDK 57 pin). Every `@mantine/*` package stays on `^8.3.18`. Do not install Mantine 9.
- These are the only new dependencies this plan allows: `@mantine/modals@^8.3.18`, `@mantine/dropzone@^8.3.18` (PR 5), `@axe-core/playwright@^4.13.0`, `culori@^4.0.2`, `@types/culori@^4.0.1`.
- **Never commit on `master`.** Every PR starts with `git switch master && git pull --ff-only && git switch -c <branch>`. Commit, push and open the PR freely on the feature branch. Never push to `master`, and never merge a PR unless the user asks.
- Commit messages follow Conventional Commits. The last paragraph is `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. The commit commands below pass it as a second `-m`.
- Web styling: no inline `style={{}}`. Use CSS Modules (`className={styles.x}`). Files that are off the token-guard allowlist may contain no hex/rgb/hsl/oklch colour literals.
- CSS Modules use **semantic tokens only** (spec §4.1 table). Primitives (`--ink-*`, `--marigold-*`, `--paper-*`, `--moss-*`, `--crimson-*`, `--amber-*`) appear only in `tokens.css`.
- Breakpoints: `$mantine-breakpoint-sm` = 48em (phone ↔ tablet), `$mantine-breakpoint-md` = 62em (tablet ↔ desktop), `$mantine-breakpoint-lg` = 75em. Write media queries with these postcss variables, never pixel literals.
- Shared-first: non-UI logic lives in `packages/shared/src/**`. `packages/shared` never imports `react`, `next`, `react-native` or `expo-*`. Shared types are snake_case. Apps import from `@nepally/shared`.
- Database: the new migrations are `supabase/migrations/037_search.sql` and `038_search_prefix_fix.sql` (the PR 65 review fixes). Both are additive only; never touch `001`–`003`. Apply them with the Supabase MCP `apply_migration` tool or the dashboard SQL editor, never `supabase db push`.
- Tests: every new behaviour ships with tests in the same task. Web tests live in `apps/web/src/**/*.test.tsx`; shared tests in `packages/shared/src/**/*.test.ts`. Query the DOM by role, label or text, never by Mantine `data-*` internals or CSS-module class names.
- Running tests: web is `npm run test --workspace=apps/web -- <paths>`; shared is `npm run test --workspace=packages/shared -- <paths>`.
- Accessibility: no nested interactive elements. Links navigate, buttons act. Icon-only buttons get an `aria-label`. `outline: none` is allowed only together with the token focus ring.
- Docs: adding or moving any doc means updating `docs/INDEX.md` in the same commit. `npm run docs:check` passes before every PR.
- Mantine 9 readiness:
  - Set `defaultRadius: 'md'` explicitly.
  - Style the `light` variant through `variantColorResolver`.
  - Always give `useLocalStorage` a `defaultValue`.
  - Never use `Collapse in`, `Spoiler initialState`, `Grid gutter`, `Text`/`Anchor` `color`, `TypographyStylesProvider`, `positionDependencies`, `useFullscreen`, `useMouse`, `useMutationObserver` or `useHeadroom`.

## Decisions made while planning

The spec is updated in the same commit as this plan.

1. **Search ordering is deterministic, so no investigation is needed.**
   - Each search function returns `id`, `rank`, a sort column and `total_count`.
   - The shared API orders and pages those rows with PostgREST `.order()` / `.range()` on the RPC result.
   - It then hydrates full rows with the existing `POST_SELECT` / `LISTING_SELECT` via `.in('id', ids)` and restores the rank order.
   - `hasMore` comes from `total_count`, so no extra row needs fetching.
2. **Search indexes are expressions, not stored columns.**
   - A `STORED` `posts.search_vector` would appear in every `select('*')`, bloating feed payloads.
   - `users.name_search` would need an extra column grant.
   - Instead, `037` indexes two IMMUTABLE functions: `post_search_document(title, description)` and `person_search_document(full_name)`. The search functions call the same expressions.
3. **`pauseResetOnHover` does not exist in `@mantine/notifications` 8.3.18.** It moves to the Mantine 9 upgrade checklist, which sets it to `"notification"`.
4. **Some token values change for accessibility and gamut.** Four chromas shrink so the colours sit inside sRGB:
   - `--accent-ink` / `--marigold-700` → `oklch(42% 0.09 65)` (was 0.10)
   - `--emergency-fg` / `--crimson-700` → `oklch(42% 0.16 25)` (was 0.19)
   - `--warning` / `--amber-600` → `oklch(55% 0.11 65)` (was 0.13)
   - `--tag-help` → `oklch(65% 0.12 75)` (was 0.14)

   `--text-3` becomes `oklch(54% 0.014 75)`, because the spec's 60% fails 4.5:1 on `--surface-0`. Task 1.1's contrast test proves it.
5. **How visual tests run in CI.**
   - Linux baselines come from a dedicated manual workflow, `.github/workflows/visual-baselines.yml`.
   - PR CI runs visual tests in a `web_visual` job inside the same Playwright container, because the reusable `ci-job.yml` template cannot run containers.
6. **An accessibility baseline tolerates today's known violations.** The current UI already has serious axe violations. PR 0 records them per page in `apps/web/e2e/visual/a11y-baseline.json`. Tests fail only on *new* violations, and each area PR deletes its own pages' entries.
7. **The e2e mocks get a fallback route.** `mockSupabaseLoggedIn` gains a lowest-priority `**/rest/v1/**` route that returns empty results, so no screenshot depends on the network.
8. **The `phone` Playwright project** arrives in PR 2, together with the first phone-navigation tests.
9. **Image components are built where they are first used.** `ImageLightbox` and `PhotoCarousel` come in PR 4, and `ImageUploader` in PR 5, not PR 2.

## Decisions made during implementation

1. **No Docker locally.** Screenshot baselines are generated by the Visual baselines workflow. That workflow also runs on pushes to non-`master` branches whose head commit message contains `[visual-baselines]`. PRs are stacked branches.
2. **Native buttons keep a pointer cursor.** Task 1.3's `globals.css` includes `button:not(:disabled) { cursor: pointer; }`. The original rewrite had dropped the old `button { cursor: pointer; }` rule. PR 6's Task 6.19a narrowed the rule to `button:not(:disabled, [data-disabled])`. At (0,1,1) specificity the old rule beat Mantine's `[data-disabled]` `not-allowed`, so busy buttons (decision 8) showed a pointer.
3. **Allowlist paths are glob-escaped.** Minimatch reads Next.js `[id]` route names as glob character classes, so Task 1.5's ESLint `ignores` pass allowlist paths through `escapeGlobLiteral` (`apps/web/eslint/escape-glob.mjs`, with `escape-glob.test.mjs`). `guards:test` now also runs `apps/web/eslint/*.test.mjs`.
4. **`URL` in Vitest on Windows.** Vitest's jsdom global `URL` mis-parses `file:///C:/…` on Windows, so test utilities that read files import Node's `URL` explicitly (`import { URL as NodeURL } from 'node:url'`).
5. **Mantine test environment.** `apps/web/src/test-utils.tsx` renders `MantineProvider` with `env="test"`. Mantine's `Popover.Dropdown` hides itself (`display: none`) when floating-ui reports its reference as detached. jsdom has no layout, so that check misfires and hides popovers and menus from role queries. `env="test"` is Mantine's documented test-runner switch. It also collapses transitions and renders portals inline, so test transition and positioning behaviour in Playwright.
6. **Primitive behaviour tightened in review.**
   - `TrustBadge` clamps its level to the three known tiers, so style, icon and label always agree.
   - `ActionMenu` never renders a disabled item as a link, because an `<a>` ignores `disabled`.
   - `getInitials` works on code points.
   - `Avatar`'s verified mark is announced as "Verified".
7. **Allowlists stay green per commit.** Task 2.11 removed the `Layout.module.css` and `Layout.tsx` allowlist entries in the same commit as the rewrite, because the CSS guard fails on an allowlisted file that is clean.
8. **AppShell navbar.** `AppShell.Navbar` renders with `component="div"`, so `SideRail`'s `<nav aria-label="Primary">` is the only navigation landmark there. It is hidden below 48em with `visibleFrom="sm"`, because `navbar.collapsed.mobile` only moves the navbar off-canvas and never sets `display`. `Layout.test.tsx` asserts that every navigation landmark has an accessible name.
9. **Top-bar search deferred to PR 3b.** The old top-bar search input led to `/search`, which did not exist. PR 2 drops it, and PR 3b fills `TopBar`'s `search` slot with `SearchCombobox`.
10. **Baselines are always fully rewritten.** The first PR 2 baseline run left seven stale pre-PR-2 screenshots: phone `messages`, `notifications`, `post-detail` and `create-post`, and desktop `landing`, `login` and `signup`.

   - **Why:** Playwright's default `--update-snapshots` rewrites only snapshots that fail comparison. A near-white tab bar on a near-white page stays within `maxDiffPixelRatio: 0.01`, so those snapshots never failed.
   - **Fix:** the Visual baselines workflow, `scripts/visual/run-in-docker.mjs` and `test:visual:update` now pass `--update-snapshots=all`.
   - **Coverage:** pixel diffs cannot see low-contrast chrome, so the phone e2e suite now asserts the tab bar is visible on `/messages`, `/notifications` and post detail.

11. **Search tokenizer keeps Devanagari words whole.** Migration 037's `build_prefix_tsquery` splits input on `[[:space:][:punct:]!-/:-@[-`{-~]+`, not on `[^[:alnum:]]+` as first planned.

   - **Why:** Postgres `[:alnum:]` excludes combining marks, so the planned pattern split `राम थापा` into `{र,म,थ,प}` and made Devanagari names unsearchable.
   - **Evidence:** before the migration was written, read-only queries on the live project confirmed three things about the chosen pattern. It keeps `{राम, थाप}`, it still strips every tsquery operator character, and it produces `'thapa' & 'nclex' & 'pr':*` for the English example.

12. **Migration 037 is live, and the tracker is realigned.** 037 was applied to `nusa-staging` on 2026-09-15 with the user's approval.

   - **Verification:** functions, indexes and the anon denial were checked. Postgres and `authenticated` returned the same counts (people 20/20, posts 100/100, listings 3/3), so invoker rights work. The advisors raised no new lints. The users PII smoke test, extended for `search_people`, passes.
   - **Tracker:** 036 still had its timestamp version, so 036 and 037 were both realigned to numeric versions in `supabase_migrations.schema_migrations`.

13. **Carried into PR 3b.**

   - **Total count:** a page past the end reports `totalCount` 0, so `useSearchPage` must keep the total from page 1.
   - **Suggestion errors:** `searchSuggestions` is all-or-nothing on error. Enter still opens `/search`, where each tab loads on its own.
   - **Resolved in 3b.5:** tab counts read from the `searchSuggestions` preview, never from a paged list response, so a past-the-end `totalCount` cannot corrupt them.

14. **jsdom needs a `ResizeObserver` stub.** Mantine renders `Tabs.List` through `FloatingIndicator`, which constructs a `ResizeObserver` on mount. jsdom has no such API, so every `/search` page test threw `ReferenceError: ResizeObserver is not defined`.

   - **Fix:** `apps/web/vitest.setup.ts` defines a no-op `ResizeObserver`, alongside the existing `scrollIntoView` and `matchMedia` stubs.
   - **Scope:** global to the web suite. All 755 web tests pass with it, so no existing test depended on its absence.

15. **`next-env.d.ts` churn is not committed.** Running the e2e suite builds for production, which rewrites the file's imports from `./.next/dev/types/…` to `./.next/types/…`; `next dev` flips them back. Since then the file is untracked and listed in `apps/web/.gitignore`, as the Next.js docs recommend, so the churn no longer shows up in git.
16. **The suggestions listbox needed an accessible name.** The first baselines run recorded `aria-input-field-name` (serious) for `visual-desktop:search-dropdown`.

   - **Cause:** `Combobox.Options` renders a `div` with `role="listbox"`, and `aria-input-field-name` covers the `listbox` role. The input itself was already named, which is why only the dropdown-open page flagged it.
   - **Fix:** `aria-label="Search suggestions"` on `Combobox.Options`, so `a11y-baseline.json` gains no entry. Re-probing with axe reports zero serious or critical violations.
   - **Screenshots:** an `aria-label` changes no pixels, so the baselines from that run stay valid.

17. **The Visual baselines workflow uploads, it does not commit.** It publishes `__screenshots__` and `a11y-baseline.json` as the `visual-baselines` artifact. Someone downloads it, checks the a11y diff, and commits — which is how the PR 0–2 baseline commits were made.
18. **The fixture clock is pinned for visual runs (Copilot, PR #62).** `page.clock.setFixedTime` freezes `Date` only inside the browser, but `e2e/fixtures/mock-data.ts` builds its timestamps in the Node process with `Date.now()`. Absolute event dates and the listing's `Refreshed Nd ago` text therefore moved with the run day, so the committed screenshots drifted after baseline day. `dynamicMasks` did not cover them: its regex is anchored and matches only bare relative times.

   - **Fix:** timestamps derive from `FIXTURE_NOW_MS`, which the visual projects pin to `VISUAL_NOW` through `E2E_FIXED_NOW`. Ordinary e2e runs keep the wall clock, because the app itself decides what counts as "upcoming".
   - **Guard:** five entry points run the visual projects (the two `apps/web` scripts, `run-in-docker.mjs`, `smoke.mjs`, and both workflows), so `prepareVisualPage` asserts the pin. A missed entry point fails loudly instead of drifting silently.
   - **Not taken:** Copilot also asked for per-node a11y fingerprints instead of rule IDs. The observation is right — a second `color-contrast` violation on an already-baselined page passes — but PRs 1–10 exist to rewrite this markup, so fingerprints would churn and fail for reasons unrelated to accessibility. The baseline reaches `{}` at PR 10, which closes the gap.

19. **The guards had enforcement gaps (Copilot, PR #63).** All five findings were correct and are fixed; PRs 4–10 write most of the remaining CSS, so they are worth closing before those start.

   - **CSS guard:** the colour-literal pattern was case-sensitive (`RGB(0 0 0)` passed), named colours were not detected at all (`color: white` passed), and direct primitive references (`var(--ink-900)`) passed despite the semantic-only contract. Named colours match in value position only and never inside a longer identifier, so `--ink-white`, `.whiteBox` and `url(black.png)` stay clean.
   - **Raw-element allowlist:** it is applied through ESLint `ignores`, which skips a file silently, so a migrated file left in the list would keep hiding new raw elements. `write-raw-element-allowlist.mjs --check` now fails on stale entries, mirroring the CSS guard's clean-file failure, and runs in `lint:guards`.
   - **CI:** `guards:test` was reachable only through the root `test` script, which no workflow calls — CI's unit-test job runs `test:ci`. PR 1's own `escape-glob.test.mjs` had therefore never run in CI. `test:ci` now runs `guards:test` first.

20. **The notification bell had three realtime and read-state defects (Copilot, PR #64).**

   - **Duplicate subscription:** the realtime effect checked only `userId`, so `/notifications` — which passes `pollingEnabled: false` because it owns its own `notifications-page:` channel — still opened a second channel for the same INSERTs. Now gated on `pollingEnabled`.
   - **Chat notifications leaked into the bell:** `getNotifications` and `getUnreadNotificationCount` both filter `.neq('type', 'message')`, but the handler accepted every INSERT, so a chat notification appeared and bumped the count until the next reload. Message-type payloads are ignored.
   - **Unchecked write results:** `markRead` and `markAllRead` updated state without checking the returned `{ error }`, showing a false read state after an RLS or network failure. Both now match `remove`, which already checked. Copilot flagged only `markRead`; `markAllRead` had the same defect.
   - **Not a defect:** the fourth finding said the prompt dialog's Cancel button defaults to `submit`. Mantine's `UnstyledButton` sets `type="button"` for button elements, so it never was. A test pins this, because Cancel precedes Save and would otherwise become the form's default button and swallow Enter.

21. **Prefix search was broken mid-word; migration 038 fixes it (review of PR #65).** 037 indexed posts and listings with `english` and built the tsquery with `english` too, so both sides were stemmed. A `:*` prefix on a stemmed term cannot match a shorter stem.

   - **Verified on `nusa-staging`:** for the document `'avail':2 'hous':1 'queen':4`, typing `hous` matched, `housi` and `housin` matched nothing, and `housing` matched again. With a 250ms debounce the suggestion dropdown went empty for two keystrokes on every `-ing`/`-ed`/`-ment` word — much of the housing and jobs vocabulary. `search_people` was unaffected because it uses `simple`.
   - **Fix:** the documents carry both `english` stems and `simple` raw lexemes, and `build_search_tsquery` ORs a stemmed tsquery with a raw prefix tsquery. Verified against the live `search_posts`: `hous`, `housi`, `housin`, `housing` and `houses` now all return 17, so prefixes hold at every keystroke while `houses` still finds `Housing` by stem.
   - **Posts use a STORED column.** `posts.search_document` is generated, so `ts_rank` reads it instead of re-deriving the tsvector for every matching row. 037 avoided a stored column on the grounds it would appear in `select('*')`, but every posts read goes through the explicit `POST_SELECT` — the premise did not hold. Measured on staging: the same query went from **50.7 ms to 7.5 ms**.
   - **Listings keep an expression document.** `LISTING_SELECT` is `*`, so a stored column there would enter every listing payload, as the pre-existing `search_vector` already does. `search_vector` itself is untouched because the marketplace filter still uses it through `textSearch()`.
   - **Index rebuild:** a GIN index stores values precomputed from the old definition, so 038 drops `idx_posts_search_document` first. Replacing the definition alone would have left the index silently stale.
   - **Volatility:** `build_prefix_tsquery` was declared `IMMUTABLE` but calls `array_to_string`, which `pg_proc` confirms is `STABLE`. Now declared `STABLE`.
   - **People:** `idx_users_person_search_document` is now partial on `is_banned = false`. Search stays nationwide with local-first ordering, which is the documented behaviour — the review's suggestion of a metro bound would have changed the product, so it was not taken.
   - **Pagination:** every search wrapper now ends its sort with `id`. Without it, offset paging duplicated and dropped rows: `simple` applies no weights, so verified on staging, "Bikash Thapa", "Sita Thapa" and "Ram Thapa" all score exactly `0.0607927`.
   - **Applied to `nusa-staging` 2026-09-17.** Grants re-verified (anon denied, authenticated allowed on all three), no new advisor lints, and search returns no duplicate rows.
   - **Still open from that review:** five items are scoped as **PR 3c — Search follow-ups** below. The sixth, building the indexes without `CONCURRENTLY`, needs no change. Production gets 037/038 on empty tables (launch plan W1), where a plain build is instant, and the rule for later index migrations is in [migration-workflow.md](../../architecture/migration-workflow.md).

22. **The search UI shared one error field between two requests (Copilot, PR #66).** `useSearchPage` ran a preview request and a list request but exposed a single `error`, which only the preview effect cleared. That one gap produced four wrong states: a failed tab kept its error after switching tabs, a failed preview left the All tab on a permanent skeleton, a failed type tab rendered "No … match" beside the error, and a failed `loadMore` was never cleared by a later success. Preview and list errors are now separate and the hook returns the active tab's.

   - **Tight retry loop:** a failed `loadMore` left `hasMore` true while the sentinel was still on screen, so `useInfiniteScroll` re-fired as soon as `loadingMore` cleared. It now stops and waits for the explicit retry.
   - **Paging offset:** `items.length` was used as the next offset, but hydration drops rows that were deleted or hidden by RLS, so one dropped row made the next request start too early and repeat results. A ranked offset now advances by the page size regardless of how many rows survived.
   - **Signed-out requests:** `/search` ran its effects before the auth guard, calling RPCs that are revoked from `anon` before redirecting. The query is null until the viewer is known to be signed in.
   - **Metro race:** `activeLocation` loads asynchronously, so a direct `/search?q=` sent `metroId: null` with `allMetros: false` and matched global rows only. The page and the combobox now fall back to `user.metro_area_id`, as `FeedPage` already did.
   - **Stale highlighting:** the suggestions hook kept previous results while the next request was in flight but reported the new query, so marks described words the visible results never matched. It now returns `resultsQuery` alongside `query`.
   - **Not taken:** the missing-baselines finding was stale — all three PNGs are committed. Keyboard navigation is not broken: Mantine's `Combobox.Target` wires arrows and Escape, and a passing test covers ArrowDown + Enter. The range-aware e2e fixture was reverted, because its synthetic ids never hydrate, so it would also need post hydration mocks and a baseline regeneration for the least valuable finding in the set.

23. **`PostActions` differs from its task description (PR 4a).** Task 4a.4 specified a `detailHref` rendered as an `Anchor`, and no `liked` prop.

   - **"View Details" stays a plain span.** The card's stretched link already opens the post, so a link here would be a second tab stop to the same URL and would have to fight the stretched link's overlay for clicks. It is `aria-hidden`, because the link already carries the post title.
   - **`liked` was missing.** The heart is filled for posts the viewer liked (feed 1288), so the prop is `{ likeCount, commentCount, liked?, onShare }`.
   - **Counts stay text.** They are `<span>`s today with no handler; nothing on the feed can like or comment. Each carries a visually hidden "3 likes" / "1 comment" so the number is not read bare.

24. **`PhotoCarousel` keeps wrap-around paging (PR 4a).** Task 4a.5 called for previous and next disabled at the ends and a scroll-snap track. The carousel wraps today (`(index ± 1 + length) % length`), so disabling would change behaviour that no task asked to change, and a scroll-snap track would swap the whole interaction model on a migration PR. It stays one photo at a time with wrap-around, and the fix is structural: previous and next are real buttons **beside** the photo, where they used to be `role="button"` divs nested inside another `role="button"` div. The 40px swipe threshold is unchanged.

25. **`PostCard` drops `onAvatarViewProfile`, and is wired up in 4a.9 (PR 4a).**

   - **The prop is gone.** `UserMenuTrigger`'s "View profile" is a real link to `/users/:id`, so the callback that pushed that route has nothing left to do. `PostCardProps` is the other twelve props plus `metroLabel`.
   - **The page keeps using its inline card until 4a.9.** Task 4a.7 said to wire the new component into `feed.page.tsx`, but swapping it in changes what 40 feed tests query — tag case, menus rendered in a portal, the scope badge's text. Doing that here would leave the suite red across two commits, so the extraction and its own tests land first and the page adopts them in 4a.9, where the feed tests are rewritten anyway.

26. **The marketplace filters use `NativeSelect`, not `Select` (PR 8a, Task 8a.3).** The task text said the `Select`s stay as they are. They did not, and the chunk 1 review was right to flag the deviation.
   - **Why the swap.** Category and Sort are short, fixed lists with no search. A real `<select>` gives the OS picker on phones, needs no portal, and cannot be driven in tests without mocking Mantine's `Select` away — which is recon finding 12, the thing this PR exists to stop doing. Task 6.17 had already moved About You's fields to `NativeSelect` for the same reasons, so this follows a precedent rather than setting one.
   - **What changes visually.** The closed field keeps Mantine's input chrome, so the filter row looks the same at rest; the open list becomes the browser's own rather than Mantine's dropdown. No screenshot in `pages.ts` captures an open dropdown, so chunk 4's baselines should not move because of this.
   - **Not taken:** keeping `Select` and leaving the test mocks in place. That would have held the one place in the area where a control is only ever exercised through a fake.

## Live tracker

One task is `In Progress` at a time. Update this table when a PR starts and when it merges.

| PR | Branch | Tasks | Status | Last updated | Notes |
|---|---|---|---|---|---|
| 0 Safety net | `test/web-visual-safety-net` | 0.1–0.6 | Merged (PR #62) | 2026-09-18 | Linux baselines generated in CI (no local Docker) |
| 1 Foundation | `feat/web-design-tokens` (stacked on PR 0) | 1.1–1.7 | Merged (PR #63) | 2026-09-18 | Linux baselines generated in CI (db52500) |
| 2 Shell + primitives | `feat/web-app-shell` (stacked on PR 1) | 2.1–2.12 | Merged (PR #64) | 2026-09-18 | Linux baselines f19b133 (CI run 35016011832) |
| 3a Search: data + shared | `feat/search-data` (stacked on PR 2) | 3a.1–3a.4 | Merged (PR #65) | 2026-09-18 | migration 037 applied to nusa-staging 2026-09-15; PII smoke test PASS |
| 3b Search: web | `feat/search-web` (stacked on PR 3a) | 3b.1–3b.6 | Merged (PR #66) | 2026-09-18 | Linux baselines f8c9ebd (CI run 35276325905); a11y baseline unchanged |
| 3c Search follow-ups | `fix/search-follow-ups` (stacked on PR #78) | 3c.1–3c.5 | Merged (PR #79) | 2026-09-19 | no migration; the `count(*) OVER ()` fix stays deferred with its trigger |
| 4a Post components + feed | `feat/web-ui-feed` | 4a.1–4a.12 | Merged (PR #80) | 2026-09-20 | Linux baselines regenerated and reviewed before it was marked ready |
| 4b Post detail | `feat/web-ui-post-detail` | 4b.1–4b.8 | Merged (PR #81) | 2026-09-20 | six Copilot review rounds; baselines regenerated from eb849d7 (run 35527351030) |
| 5 Create flows | `feat/web-ui-create-flows` | 5.1–5.14 | Merged (PR #83) | 2026-09-21 | branched from `master` at 4f6b96d; baselines regenerated from d522812 |
| 6 Profile + public profile | `feat/web-ui-profile` | 6.1–6.20, 6.5a, 6.19a, 6.19b | Merged (PR #85) | 2026-09-22 | branched from `master` at e685317; baselines regenerated locally in Docker (25d56ce) |
| 7 Events | `feat/web-ui-events` | 7.1–7.15, in four chunks | Merged (PR #86) | 2026-09-22 | branched from `master` at 3386a5d. **Chunk 1** (7.1–7.5, b9e4eb3..294c80e) done 2026-09-22: gate green (shared 660, web 1402, mobile 636 tests); review found no CRITICAL or HIGH. Routed from its review: (1) **for the user to decide:** `EventResponseControl`'s `data-disabled` gives both buttons Mantine's grey disabled look while a response saves, hiding the pressed state decision 6 says moves at once — the reason `FollowButton` sets only `aria-disabled`; (2) `getMetroEventsPage`'s comment should cite the `CHECK` in `006_events.sql`, not `createEventSchema`; (3) no test asserts `EventTypeBadge`'s `data-type`; (4) `getUserEventResponse` swaps a PostgREST error for a generic message, as the rest of `api/events.ts` does; (5) a malformed id returns `22P02`, so `notFound` stays unset — Task 7.11 should weigh that; (6) Task 7.15's docs pass also drops `hasUserRsvp` from `events-feature-breakdown.md:91` and `13-event-discovery-and-rsvp.md:499`; (7) a double blank line in `api/events.test.ts`. **Chunk 2** (7.6–7.10, e4e1fb9..30f1c6e) done 2026-09-22: gate green (shared 660, web 1428 tests); `events/index.page.tsx` 333 → 141 lines. Review: two HIGH fixed in 30f1c6e (the organizer avatar was a dead spot above the stretched link's overlay; the title clamp clipped the link's focus ring), plus ragged card heights, a regression from the `li` becoming the grid item. Routed from its review: (1) `useEventFeed.test.ts`'s "drops a page that lands after the reload" leans on the previous test's mock for its chained past call, so it fails alone — add `mockResolvedValueOnce(page([]))` and reset mocks in `beforeEach`; (2) the pages test's fake `IntersectionObserver` fires disconnected observers too, so it can't catch a sentinel unmounted while a filter shows nothing; (3) untested hook branches: the chained past page failing on first load, and the reset when metro or viewer changes; (4) `hasMore` stays true after a failed first load (no visible effect; add `&& error === null`); (5) a `loadMore` in flight when the metro becomes null still lands — bump the generation before the early return; (6) "Couldn't load more events" reads oddly when a metro's first past page fails and nothing is on screen; (7) a mid-row chip focused on a phone sits flush against the scroll edge and clips its ring — add `scroll-padding-inline`; (8) `EventCard.test.tsx` queries `time` with `querySelector` where `getByRole('time')` works; (9) the page tests check sections by `closest('section')`, not `getByRole('region')` and list items; (10) Task 7.15's list already covers the stale `pages.ts` comment and `ToggleChipGroup`'s new props in `web-ui-system.md`. **Chunk 3** (7.11–7.14, c917f93..616d3b4) done 2026-09-22: gate green (shared 661, web 1464 tests); `events/[id].page.tsx` 379 → 277 lines, against a ~230 target, the difference being the id-keyed view wrapper and the `blockedBy` helper. Review: one HIGH fixed in 616d3b4 (Mantine's `Breadcrumbs` nowrap clipped a long title on phones), with the two other breadcrumb nits on the same lines. Routed from its review: (1) `AttendeeList` rows pass `full_name` to a non-decorative `Avatar`, so screen readers hear the surname the row masks — PR 10, with the test id; (2) `useEventDetail` can't clear `responding` in its render-time reset, which only the page's id key makes safe — narrow the comment or clear it in the effect; (3) the load effect has no `.catch`, harmless while every shared API catches its own errors; (4) the sidebar card chrome is defined three times, a candidate for one primitive in PR 10; (5) the attendee list is cached per open, so the dialog can show 12 while the count reads 13 (pre-existing); (6) "This event has passed." appears in both the alert and the attendance card, which reads as helpful rather than redundant, but a cancelled event shows no line at all, and chunk 4's e2e must scope that string to a role. **Chunk 4** (7.15, 8407421) done 2026-09-22: smoke pass, e2e (102), baselines regenerated in Docker and the visual suite green, full gate green (shared 661, web 1464, mobile 636), docs updated, draft PR #86 open with Copilot requested. The a11y diff only deletes the four `events` / `event-detail` entries. Twelve screenshots changed and were reviewed; reviewing them caught a three-column card squeezing the organizer name to one letter, fixed by wrapping the response control to its own line. The feed's visual ready check waited only for its first post, so the Metro Pulse strip was in the shot or not depending on timing; it now waits for the strip. The keyboard walk ran in Chromium against the production build and passed every case in Step 7 |
| 8a Marketplace: browse + listing detail | `feat/web-ui-marketplace` | 8a.1–8a.12, in four chunks | Merged (PR #88) | 2026-09-23 | rebased onto `master` at `f995deb` after PR #87 merged. Owns both visual pages, so it takes `a11y-baseline.json` to `{}`. **Chunk 1** (8a.1–8a.4, cf331d8..4e90113) done 2026-09-22: gate green (shared 666, web 1492 tests); `marketplace.module.css` 837 → 713 lines and 159 → 136 guard violations; `FilterBar` and `ListingStrip` off both allowlists, so the raw-element list is down to 9 files. Review found no CRITICAL. Two HIGH: (1) `Select` → `NativeSelect` was a real deviation from the task text and is now implementation decision 26; (2) "the twelve dead `.categoryTheme*` blocks should be deleted" is **wrong** — `listing/[id].page.tsx` 26–38 keeps its own copy of the map and applies it at 150, so they belong to Task 8a.10. Fixed in the review commit: the pending-debounce-then-clear path had no test, and `data-category` sat on both the article and the chip. Routed from its review: (1) the tests use `data-testid` for the decorative star and cover placeholder, and read the article's `data-category` — PR 7's own review asked for exactly that kind of `data-type` assertion, so this stays, but PR 10 should settle whether the "role, label or text" rule carves out styling hooks explicitly; (2) mobile's two `isVerifiedSeller` copies cannot be touched here (global constraint: web only), so they go to PR 10 with the other mobile parity items. **Chunk 2** (8a.5–8a.8, 30be668..84780a9) done 2026-09-22: gate green (shared 666, web 1546 tests). `index.page.tsx` 330 → 77 lines and `[category].page.tsx` 177 → 79, over one 193-line `MarketplaceBrowse`; `marketplace.module.css` 713 → 524 lines and 136 → 108 guard violations, with 21 dead class blocks deleted. Review found no CRITICAL or HIGH. Fixed in the review commit: **twelve references to tokens that do not exist**, shipped in chunk 1 and repeated here — `--weight-*` for `--font-weight-*`, `--text-sm`/`--text-lg` for `--font-size-*` (`--text-1/2/3` are colours), `--radius-pill` for `--radius-full` — each silently falling back to the inherited value; the hardcoded `'search'` in `[category].page.tsx` now uses `SEARCH_SLUG`; the leftover `ListingStrip` mock in the category test; and the sponsored strip had no view-level test. Routed to PR 10: the missing undefined-custom-property guard, the paging offset that counts unique rather than consumed rows, and the empty-state copy for a member with no metro. **Chunk 3** (8a.9–8a.11, 543fe61..d8ae4c4) done 2026-09-22: gate green (shared 666, web 1565 tests). `listing/[id].page.tsx` 330 → 216 lines; `marketplace.module.css` 524 → 190 lines and 108 → 32 guard violations, the twelve `.categoryTheme*` blocks finally gone; the page comes off the raw-element allowlist, down to 8 files. `ListingResult` gains `notFound`, mirroring `EventResult`, so a failed read stops reading as "Listing not found." Review found no CRITICAL; two HIGH, both fixed in the review commit: the two extracted components shipped with no tests of their own, and the save button had lost its visible saved state (it now keeps one stable name with `aria-pressed`, and the bookmark icon fills in, rather than renaming itself). Also fixed there: dropping `router.isReady` made a hard reload flash "Listing not found" before the id arrived; Mantine's `Breadcrumbs` renders a plain `div`, so the `nav` landmark came back; a business listing with no details rendered an empty "Business Details" heading; and `.badge` still referenced `--category-bg` / `--category-color` after their defining blocks were deleted. Routed to PR 10: event detail's identical breadcrumb-landmark gap, `PhotoCarousel` having no `priority` hint, and the actions panel rendering twice. **Chunk 4** (8a.12) done 2026-09-22: e2e 107, visual 39, full gate green (shared 666, web 1584, mobile 636). **`a11y-baseline.json` is now `{}`** and the diff only deletes lines, so the app has no known serious or critical violation on any screenshotted page. Four screenshots changed, all reviewed: `marketplace` and `listing-detail` at both widths. Seven others changed on the first run and were restored — re-running the suite against the originals passed, so they were rendering noise, not real diffs. **The keyboard walk found a real bug:** pressing Save dropped focus to `<body>`, because the panel used Mantine's `loading`, which sets native `disabled` — the exact thing "Busy controls stay focusable" forbids. The old page did it too, so it was carried over rather than introduced. It now takes `aria-disabled` / `data-disabled` with a `Loader` in `leftSection`. The walk is kept as `13-marketplace-keyboard.spec.ts` rather than run once, since its 375px checks are the regression guard for recon 9. Routed to PR 10: listing detail shows the category and condition twice, once as a badge and once as a highlight chip, which `getListingHighlights` has always done. **Copilot review** (5 rounds, 15 inline comments) answered 2026-09-23. Four were real and are fixed in `fix(web): address Copilot's review`: (1) `getListingsByMetro` derives `hasMore` from the raw window *before* dropping rows of another category, so a full window can arrive filtered to nothing — the browse view called that empty and unmounted the sentinel, stranding a category that does have listings, and the hook offset by `grid.length`, which never advanced and re-requested the same window; the offset now counts the API window and the empty state waits for `hasMore` to go false; (2) a load-more in flight when the metro cleared still landed, because the effect returned before bumping the generation — the same fault PR 7 found in `useEventFeed`; (3) `/marketplace/search` showed an h1 "Search: momo" over a region named "All Listings"; it now reads "Results"; (4) `getListingById` missed `22P02`, so a mistyped UUID gave a retryable error rather than not-found, where `getEventById` handles both. Two were already fixed in earlier chunk reviews (the undefined token names, and `loading` on the save button). One was **rejected**: it claimed `ListingBusinessDetails` could not type-check because a `Row[]` annotation took nullable members, but the `as Row[]` cast applies to the `.filter(Boolean)` result, not the literal, and `type-check` passes. The remaining six were on the plan text itself, written before the implementation diverged from it; the task interfaces now match what shipped |
| 8b Marketplace: seller flow | `feat/web-ui-marketplace-seller` | 8b.1–8b.12, in three chunks | Merged (PR #89) | 2026-09-23 | branched from `master` at f632e79. No visual pages, so no baseline run; `a11y-baseline.json` stays `{}`. `marketplace.module.css` is deleted in chunk 1 (my-listings is its last consumer). **Chunk 1** (8b.1–8b.5, fd1c478..ff4d273) done 2026-09-23: gate green (shared 670, web 1610 tests); `my-listings.page.tsx` 216 → 104 lines before the review fix; `marketplace.module.css` (193 lines, 32 guard violations) deleted, and the page off the raw-element allowlist, down to 7 files. One deviation from decision 2: the next page's offset is `listings.length`, which equals "rows fetched minus rows deleted" because deactivated rows stay on screen and deleted ones leave both the screen and the server's results. Review found no CRITICAL. Two HIGH, both fixed in 90eabce: (1) that equivalence failed when a delete and a page load overlapped — the page's offset counted a row the delete then removed, so one listing never appeared — so a delete now waits for a page in flight and no page is requested while a delete is pending; (2) deleting a row unmounted the menu trigger the confirm dialog returns focus to, dropping focus to `<body>`, so focus now moves to the neighbouring row's link, or to Create listing, when `isFocusStranded()`. Nothing routed. **Chunk 2** (8b.6–8b.11, 2f6d18f..345a7ec) done 2026-09-23: gate green (shared 677, web 1650 tests). `listing/promote/[id].page.tsx` 410 → 173 lines; `promote.module.css` 841 → 99 lines and 107 → 0 guard violations. Both pages off both allowlists: the raw-element list is down to 6 files and the CSS guard allowlist holds only PR 10's four stylesheets. Deviations: a small `SummaryList` shared by the duration and review steps; `promote.module.css` came off the CSS allowlist in 8b.10 rather than 8b.11, because the guard fails on an allowlisted file that is already clean — the rewrite kept the success page's class names on tokens so it stayed styled between commits; a checkout response with no URL now reports an error rather than doing nothing; Continue waits with `aria-disabled`, not native `disabled`; and step markers use the action ink pair, since `--accent` is never text. Review found no CRITICAL, HIGH or MEDIUM. Fixed in the review commit: clearing the duration field snapped it straight back to 1 (found while triaging the review, not by it), so deleting "7" and typing "3" gave "13"; and the missing test for a checkout with no URL. Routed to PR 10: `tokens.contrast.test.ts` has no `--accent-ink` / `--success` on `--surface-sunken` pair, used by the tier icons and the success icon (both `aria-hidden` beside text that carries the same meaning). **Chunk 3** (8b.12, a71f26e..addf5f5) done 2026-09-23: e2e 111, visual 39 with no screenshot diffs (neither page is in `pages.ts`), and `a11y-baseline.json` still `{}`; full gate green (shared 677, web 1653, mobile 636). The my-listings e2e now drives the row menu and confirm dialogs and checks focus survives a delete, and a new e2e walks the wizard to review by keyboard. The keyboard walk is kept in `13-marketplace-keyboard.spec.ts`, as 8a's was: a row menu opens on Enter, moves on arrows and returns focus to its trigger on Escape, and neither page overflows at 375px on any step. Screenshots of both pages at 1280 and 375 were reviewed by eye, with nothing to fix: at 375 the third step's label truncates to "Review …" (its full text stays in the DOM). The mobile Jest run needed `--cacheDirectory` pointed at a writable folder, because the default system-temp transform cache failed to write in this environment — not a code issue. **Copilot review** (round 1, 2 inline comments) answered 2026-09-23; both were real and are fixed: (1) the wizard worked out its blocker only when it opened, and the edge function does not check status, so a listing deactivated in another tab could still be paid for — Pay now re-reads the listing first (bef9022); (2) a load-more from before a reload could clear the in-flight page ref for a newer request, releasing a delete early — a request now clears the ref only while it still holds it (3b1229f). The durable fix for (1) followed at the user's go-ahead: `create-promotion-checkout` now refuses a listing that is not active with a 409, after the ownership check (8307a28), deployed to `nusa-staging` as version 6 on 2026-09-23. The deployed v5 source was diffed against the repo first and matched, and v6 was read back and matched the commit; a smoke call without auth returned the function's own 401. The 409 path itself was not exercised live, since that needs a member's session and an inactive listing. Found while doing it and fixed at the user's go-ahead (b2abda2, deployed as version 7 the same way, read back and smoke-tested): the web checkout's `cancel_url` pointed at `/marketplace/listing/<id>/promote`, a route that does not exist, so cancelling on Stripe's page landed on a 404; it now returns to the wizard at `/marketplace/listing/promote/<id>`. **Copilot round 2** (2 inline comments) answered 2026-09-23, both real and fixed: (1) a delete that waited for a page in flight checked the generation only after sending the mutation, so a reload or account switch during the wait still sent it — it now checks right after the wait and sends nothing (f3ef86b); (2) the duration's `aria-valuenow` reported the last committed value while the field was empty — it now follows the draft and is omitted when empty (4bfa303). Round 3 (on the edge function commit) raised one comment, **rejected**: it asked for the status check to be atomic with the `listing_promotions` insert, but that insert only creates a `pending` row — payment happens minutes later on Stripe's page and `stripe-webhook` activates the row after — and only the owner can change a listing's status (RLS), so a lock around the insert protects nothing that matters. **Open for the user:** what a paid promotion should do when its listing is inactive at payment time or is deactivated mid-run (a webhook check before activation, a refund, a pause) — a billing decision, not this PR's |
| 9a Messages | `feat/web-ui-messaging` | 9a.1–9a.12, in three chunks | In Review (PR #90) | 2026-09-23 | branched from `master` at e59513a. PR 9 split into 9a and 9b at recon (see "PR 9 — split into 9a and 9b"). Owns the `messages` visual page. **Chunk 1** (9a.1–9a.6, bf8fdf7..2b1bf9a) done 2026-09-23: gate green (shared 689, web 1692, mobile 636 tests). `getMessages` now returns a thread's newest messages (mobile included); `formatDayLabel` and `buildThreadDays` shared; `useStartConversation` adopted by feed, post detail, event detail, the public profile and listing detail, so **Contact Seller now opens the thread** instead of `/messages?to=`, and feed and post detail report a failed start. `useConversations` is a wrapper over `useUserList` rather than a copy of its pattern. Review found no CRITICAL. One HIGH, fixed in 7a5923b: `useMessageThread` subscribed only after its load, as Task 9a.6 said, so a message sent during the load (five `getConversations` queries plus the channel join) was never delivered and stayed unread — a regression, since the old page subscribed at once. It now subscribes first and merges. Also fixed there: listing detail counted a contact twice on a double press and showed no busy state during the counter's round trip (`start` gained a `beforeStart` step inside its guard); realtime callbacks could run after leaving a thread and mark it read; messages arriving out of order were appended rather than placed by time; `starting` cleared before navigation finished. Routed to PR 10: shared `subscribeToMessages` reuses one topic per conversation, which can leave a thread without live updates after A → B → A while A's leave is pending (pre-existing). Web now 1705 tests. **Chunk 2** (9a.7–9a.11, 7ed37c7..4af4fee) done 2026-09-23: gate green (web 1726 tests). `messages/index.page.tsx` 153 → 55 lines and `[id].page.tsx` 336 → 81; `Messages.module.css` (293 lines, 74 guard violations) deleted; the thread off the raw-element allowlist, down to 5 files, and the CSS allowlist down to 7. Deviation: the thread's loading, error and not-found states render a `PageHeader` "Conversation" so the page always has an `h1`. Review found no CRITICAL; three HIGH, all fixed in 0c13315. (1) **No `position: sticky` on the site has ever stuck**: `globals.css` set `overflow-x: hidden` on both `html` and `body`, which makes `body` a scroll container that never scrolls, so every sticky element pinned to it — the composer, and before it the feed's `SponsoredRail` and listing detail's sidebar. Now `overflow-x: clip`. Chunk 3's baselines should be checked for the rail and sidebar. (2) `MessageLog` scrolled a sentinel into view, which stopped ~130px short of the page end (page gap, composer and paddings below it), past the 120px follow threshold, so after its own scroll the log stopped following new messages; it now scrolls the window to the document end. (3) The composer lifted itself above the phone tab bar, but a thread is a task route with no tab bar, which would have left a 64px gap. Also fixed there: the log announced every Sent → Read change (`aria-relevant="additions"`); text typed during a slow send was erased when it succeeded; a send that threw left Send busy; the badge rendered a `div` inside the link. Chunk 3 must scope `phone/navigation.spec.ts:45`'s `/messages/i` heading to level 1, since the empty inbox's `EmptyState` h3 "No messages yet" also matches. Web now 1732 tests. **Chunk 3** (9a.12, 9835a68..40d4ed9) done 2026-09-23: e2e 117 (six new in `14-messages.spec.ts`, over a stateful chat mock: public names and unread counts, sending, the profile menu, not found, keyboard order, and at 375px no overflow with the composer pinned while reading back); the marketplace spec now expects Contact Seller to open `/messages/<id>`; the phone spec's heading is scoped to the h1. The base e2e mock gained a `conversations` POST so `getOrCreateConversation` can create one. Visual 39 green, and `a11y-baseline.json` still `{}`. The Docker `--update` rewrote twelve PNGs: eight had no pixel over the diff threshold and two (`feed`, `search-dropdown`) differed by ~1.5% with nothing visible — re-running the suite against their originals passed, so all ten were restored as noise, and only `messages` at both widths was accepted (the new `PageHeader` and `EmptyState`). The thread, which no baseline covers, was screenshotted by eye at 1280 and 375: the composer stays pinned when scrolled to the top, long messages wrap in their bubble. Full gate green (shared 689, web 1732, mobile 636). **Follow-ups fixed at the user's go-ahead** (2026-09-23, 67b2fa7..): (1) the realtime topic reuse routed to PR 10 in chunk 1 — shared `uniqueChannelTopic` now gives `subscribeToMessages`, the unread badge and the bell a fresh topic per subscription; it also meant that under React StrictMode (on in dev) a thread's remount rejoined its own leaving channel and got no live messages; mobile's own fixed topics stay on PR 10's list. (2) The stale Messages badge: staging does publish `conversation_participants` to realtime (checked with a read-only query), so the stale badge in the e2e screenshot was the mock, which has no realtime — but two real gaps remained and are fixed: overlapping refreshes could land out of order and restore a stale count (only the latest request's answer applies now), and a thread now announces on `window` once it has marked itself read, so the badge refreshes at once rather than waiting on realtime or the 30s poll. e2e 118, shared 692, web 1737. **Copilot review** (2 rounds, 3 inline comments) answered 2026-09-24; all three were real and are fixed (ed25e35, 2ddc8a2): (1) `MessageLog`'s day labels and times read the clock only on render, so a thread left open past midnight still said Today — it and the inbox rows now take `useNow()`, and shared `formatRelativeTime` gained an optional `now`; (2) the thread announced a badge refresh even after a failed `markAsRead` — and underneath, shared `markAsRead` never returned an error at all, because it ignored both updates' `error`; it now does, and the thread announces only on success; (3) `web-ui-system.md` claimed every channel used `uniqueChannelTopic` — now scoped to web and shared, with mobile named as PR 10's, and the notifications page's own channel moved onto it so the web claim holds. Shared 696, web 1740. Round 3 (1 comment, real, fixed in 06a7fce): the failed-load and not-found paths left the channel without setting `cancelled`, and `removeChannel` is a round trip, so an in-flight event could still add a message and mark the thread read behind the error screen; one `leave()` now serves both paths and the cleanup. Web 1743 |
| 9b Notifications, preferences, moderation | `feat/web-ui-notifications` | breakdown at PR start | Not Started | 2026-09-23 | branches from `master` after 9a merges; scope is PR 9 recon items 16–27. Owns the `notifications` visual page |
| 10 Static pages + cleanup | `feat/web-ui-cleanup` | breakdown at PR start | Not Started | 2026-09-14 | |

---

# PR 0 — Safety net

**Branch:** `test/web-visual-safety-net`

**Outcome:** screenshot and axe coverage of today's UI at desktop and phone widths, deterministic mocks, and no tests coupled to Mantine internals. From PR 1 on, visual changes are deliberate and reviewable.

| Path | Change | Responsibility |
|---|---|---|
| `apps/web/src/pages/login.test.tsx` | Modify | Stop asserting Mantine's `data-loading` |
| `apps/web/src/pages/signup.test.tsx` | Modify | Stop asserting Mantine's `data-loading` |
| `apps/web/src/components/events/RsvpButton.test.tsx` | Modify | Stop asserting `data-disabled` |
| `apps/web/src/pages/messages/[id].test.tsx` | Modify | Stop querying CSS-module class substrings |
| `apps/web/src/components/Layout.tsx` | Modify | Messages link name announces the unread count |
| `apps/web/src/components/Layout.test.tsx` | Modify | Tests for that name |
| `apps/web/e2e/tests/06-profile.spec.ts` | Modify | Role-based lookup instead of `[class*="profileName"]` |
| `apps/web/e2e/tests/07-messages-badge.spec.ts` | Modify | Assert the accessible name instead of DOM nesting |
| `apps/web/e2e/helpers/supabase-mock.ts` | Modify | `mockUnhandledRest` fallback route |
| `apps/web/playwright.config.ts` | Modify | `visual-desktop` / `visual-phone` projects, snapshot path |
| `apps/web/package.json` | Modify | Scripts, `@axe-core/playwright` |
| `apps/web/e2e/visual/helpers.ts` | Create | Frozen clock, auth, settle, masks, axe baseline |
| `apps/web/e2e/visual/pages.visual.spec.ts` | Create | One screenshot + axe scan per page |
| `apps/web/e2e/visual/a11y-baseline.json` | Create (generated) | Known serious/critical violations per `project:page` |
| `apps/web/e2e/visual/__screenshots__/**` | Create (generated) | Linux screenshot baselines |
| `scripts/visual/run-in-docker.mjs` | Create | Run visual projects in the Playwright image |
| `scripts/visual/smoke.mjs` | Create | Run visual projects without screenshots (any OS) |
| `.github/workflows/ci.yml` | Modify | `web_visual` job |
| `.github/workflows/visual-baselines.yml` | Create | Manual baseline regeneration |
| `package.json` (root) | Modify | `test:visual:web` script |
| `docs/guides/setup-and-testing.md` | Modify | Visual test commands |
| `TECH-VERSIONS.md` | Modify | `@axe-core/playwright` row |

### Task 0.1: Decouple unit tests from Mantine internals

**Files:**

- Modify: `apps/web/src/pages/login.test.tsx` (test "disables submit button while signing in")
- Modify: `apps/web/src/pages/signup.test.tsx` (test "shows loading state while submitting")
- Modify: `apps/web/src/components/events/RsvpButton.test.tsx` (four "is disabled when …" tests)
- Modify: `apps/web/src/pages/messages/[id].test.tsx` (test "returns null and redirects when user is not logged in")

**Interfaces:** Consumes nothing. Produces nothing.

- [ ] **Step 1: Create the PR branch**

```bash
git switch master && git pull --ff-only && git switch -c test/web-visual-safety-net
```

- [ ] **Step 2: login.test.tsx — assert the native disabled state only**

Replace:

```tsx
      expect(btn.hasAttribute('disabled')).toBe(true);
      expect(btn.getAttribute('data-loading')).toBe('true');
```

with:

```tsx
      // Mantine renders `loading` as a disabled native <button>; assert that
      // user-observable state rather than Mantine's data-loading attribute.
      expect(btn.hasAttribute('disabled')).toBe(true);
```

- [ ] **Step 3: signup.test.tsx — same replacement**

Apply the identical replacement from Step 2 inside "shows loading state while submitting".

- [ ] **Step 4: RsvpButton.test.tsx — drop the data-disabled fallback**

`RsvpButton` passes `disabled` to a native `<button>`, so the attribute is always present. Replace all four occurrences of:

```tsx
    expect(btn.hasAttribute('disabled') || btn.getAttribute('data-disabled') === 'true').toBe(true);
```

with:

```tsx
    expect(btn.hasAttribute('disabled')).toBe(true);
```

- [ ] **Step 5: messages/[id].test.tsx — query by role and text**

Replace:

```tsx
    const { container } = render(<MessageThreadPage />);
    // MantineProvider injects style tags; verify no meaningful UI content
    expect(container.querySelector('[class*="message"], [class*="thread"], main, article')).toBeNull();
```

with:

```tsx
    render(<MessageThreadPage />);
    expect(screen.queryByText('Loading messages...')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('main')).toBeNull();
```

- [ ] **Step 6: Run the four files**

Run: `npm run test --workspace=apps/web -- src/pages/login.test.tsx src/pages/signup.test.tsx src/components/events/RsvpButton.test.tsx "src/pages/messages/[id].test.tsx"`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/login.test.tsx apps/web/src/pages/signup.test.tsx apps/web/src/components/events/RsvpButton.test.tsx "apps/web/src/pages/messages/[id].test.tsx"
git commit -m "test(web): assert user-visible state instead of Mantine internals" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 0.2: Announce unread messages in the link name; role-based e2e selectors

**Files:**

- Modify: `apps/web/src/components/Layout.tsx:417-427` (Messages `ActionIcon`)
- Modify: `apps/web/src/components/Layout.test.tsx` (inside `describe('when user is logged in')`)
- Modify: `apps/web/e2e/tests/06-profile.spec.ts` (test "navigating to /profile from feed works")
- Modify: `apps/web/e2e/tests/07-messages-badge.spec.ts` (whole file)

**Interfaces:**

- Produces: the Messages link accessible name is `"Messages"` when nothing is unread, or `"Messages, N unread"` otherwise. PR 2's `TopBar` must keep this contract.

- [ ] **Step 1: Write the failing unit tests**

Add inside `describe('when user is logged in', …)` in `Layout.test.tsx`, after the test "does not show messages badge when count is 0":

```tsx
    it('includes the unread count in the Messages link accessible name', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 5 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByLabelText('Messages, 5 unread')).toBeDefined();
      });
    });

    it('names the Messages link plainly when nothing is unread', async () => {
      render(<Layout>Content</Layout>);
      await waitFor(() => expect(layoutMocks.getTotalUnreadCountMock).toHaveBeenCalled());
      expect(screen.getByLabelText('Messages')).toBeDefined();
    });
```

- [ ] **Step 2: Run them to verify the first one fails**

Run: `npm run test --workspace=apps/web -- src/components/Layout.test.tsx -t "Messages link"`
Expected: "includes the unread count…" FAILS (unable to find label `Messages, 5 unread`); the other PASSES.

- [ ] **Step 3: Implement**

In `Layout.tsx`, on the Messages `ActionIcon`, replace `aria-label="Messages"` with:

```tsx
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
```

- [ ] **Step 4: Run the Layout suite**

Run: `npm run test --workspace=apps/web -- src/components/Layout.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Rewrite `e2e/tests/07-messages-badge.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

test.describe('Messages badge', () => {
  test('refreshes unread badge when page becomes active', async ({ page }) => {
    let unreadRows: Array<{ unread_count: number }> = [];

    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);

    await page.unroute('**/rest/v1/conversation_participants**');
    await page.route('**/rest/v1/conversation_participants**', async (route) => {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(unreadRows) });
    });

    await page.goto('/feed');

    const readLink = page.getByRole('link', { name: 'Messages', exact: true });
    const unreadLink = page.getByRole('link', { name: 'Messages, 3 unread', exact: true });
    await expect(readLink).toBeVisible({ timeout: 10_000 });

    unreadRows = [{ unread_count: 3 }];
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(unreadLink).toBeVisible();

    unreadRows = [];
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(readLink).toBeVisible();
  });
});
```

- [ ] **Step 6: Fix the class-substring selector in `06-profile.spec.ts`**

Replace:

```ts
    await expect(page.locator('[class*="profileName"]').filter({ hasText: MOCK_USER_PROFILE.full_name })).toBeVisible({ timeout: 10_000 });
```

with:

```ts
    await expect(
      page.getByRole('main').getByText(MOCK_USER_PROFILE.full_name, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
```

- [ ] **Step 7: Run the two e2e specs**

Run (Git Bash; the placeholders are only needed when `apps/web/.env.local` is missing):
`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run test:e2e --workspace=apps/web -- e2e/tests/06-profile.spec.ts e2e/tests/07-messages-badge.spec.ts`
Expected: both specs PASS. The first run includes a `next build`, which takes a few minutes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/Layout.tsx apps/web/src/components/Layout.test.tsx apps/web/e2e/tests/06-profile.spec.ts apps/web/e2e/tests/07-messages-badge.spec.ts
git commit -m "fix(web): announce unread message count in the Messages link name" -m "E2E specs now assert accessible names instead of DOM nesting and CSS-module class substrings." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 0.3: Deterministic fallback for unmocked Supabase REST calls

**Files:**

- Modify: `apps/web/e2e/helpers/supabase-mock.ts`

**Interfaces:**

- Produces: `export async function mockUnhandledRest(page: Page): Promise<void>`. `mockSupabaseLoggedIn` calls it first.

- [ ] **Step 1: Add the fallback helper**

Insert after `mockGetMyProfile` in `supabase-mock.ts`:

```ts
/**
 * Lowest-priority handler for any REST/RPC call a spec doesn't mock.
 *
 * Playwright tries the most recently registered route first, so registering
 * this before every specific route means it only answers requests nothing
 * else claims. Without it an unmocked request hits the network (or the CI
 * placeholder host) and renders a nondeterministic error state, which breaks
 * screenshot tests.
 */
export async function mockUnhandledRest(page: Page): Promise<void> {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(expectsSingleObject(route) ? null : []),
    });
  });
}
```

- [ ] **Step 2: Register it first in `mockSupabaseLoggedIn`**

Change the start of `mockSupabaseLoggedIn` from:

```ts
  const marketplaceState = buildMarketplaceState();

  await mockGetMyProfile(page);
```

to:

```ts
  const marketplaceState = buildMarketplaceState();

  // Must be registered before every specific route (see mockUnhandledRest).
  await mockUnhandledRest(page);
  await mockGetMyProfile(page);
```

- [ ] **Step 3: Run the whole e2e suite**

Run: `npm run test:e2e --workspace=apps/web`
Expected: all specs PASS. The fallback answers only unmocked calls, so existing behaviour is unchanged.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/helpers/supabase-mock.ts
git commit -m "test(web): answer unmocked Supabase REST calls deterministically in e2e" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 0.4: Visual and accessibility harness

**Files:**

- Modify: `apps/web/playwright.config.ts` (whole file)
- Modify: `apps/web/package.json` (scripts, devDependency)
- Modify: `package.json` (root script)
- Create: `apps/web/e2e/visual/helpers.ts`
- Create: `apps/web/e2e/visual/pages.visual.spec.ts`
- Create: `apps/web/e2e/visual/a11y-baseline.json`
- Create: `scripts/visual/smoke.mjs`

**Interfaces:**

- Consumes: `mockUnhandledRest`, `mockSupabaseLoggedIn` (Task 0.3); `injectAuthSession` (existing).
- Produces (later PRs add pages and call these):
  - `VISUAL_NOW: Date`
  - `isVisualHostSupported(): boolean`
  - `isSmokeRun: boolean`
  - `prepareVisualPage(page: Page, options: { signedIn: boolean }): Promise<void>`
  - `settle(page: Page): Promise<void>`
  - `dynamicMasks(page: Page): Locator[]`
  - `expectNoNewA11yViolations(page: Page, key: string): Promise<void>`
  - `type VisualPage = { name: string; path: string; signedIn: boolean; setup?: (page: Page) => Promise<void>; ready: (page: Page) => Promise<void> }` exported from `pages.visual.spec.ts`'s sibling `pages.ts`. It is created in Step 5, so PR 3b can append entries.

- [ ] **Step 1: Install axe for Playwright**

Run: `npm install --save-dev @axe-core/playwright@^4.13.0 --workspace=apps/web`
Expected: `apps/web/package.json` devDependencies gains `"@axe-core/playwright": "^4.13.0"`.

- [ ] **Step 2: Replace `apps/web/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

/** Stable rendering context for screenshot projects. */
const VISUAL_CONTEXT = {
  locale: 'en-US',
  timezoneId: 'UTC',
  colorScheme: 'light' as const,
};

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  // Baselines are per project (desktop/phone) and Linux-only; see
  // docs/guides/setup-and-testing.md → "Visual regression and accessibility tests".
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual-desktop',
      testDir: './e2e/visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, ...VISUAL_CONTEXT },
    },
    {
      name: 'visual-phone',
      testDir: './e2e/visual',
      use: { ...devices['Pixel 7'], ...VISUAL_CONTEXT },
    },
  ],

  webServer: {
    command: 'next build && next start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    cwd: __dirname,
  },
});
```

- [ ] **Step 3: Update web scripts**

In `apps/web/package.json` `scripts`, replace `"test:e2e"` and `"test:e2e:ui"` and add the visual scripts:

```json
    "test:e2e": "playwright test --project=chromium",
    "test:e2e:ui": "playwright test --ui --project=chromium",
    "test:visual": "playwright test --project=visual-desktop --project=visual-phone",
    "test:visual:update": "playwright test --project=visual-desktop --project=visual-phone --update-snapshots",
    "test:visual:docker": "node ../../scripts/visual/run-in-docker.mjs",
    "test:visual:smoke": "node ../../scripts/visual/smoke.mjs",
```

In the root `package.json` `scripts`, add after `"test:e2e:web:report"`:

```json
    "test:visual:web": "npm run test:visual:docker --workspace=apps/web",
```

- [ ] **Step 4: Create `apps/web/e2e/visual/helpers.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn, mockUnhandledRest } from '../helpers/supabase-mock';

/** Frozen "now" so relative times and dates render identically on every run. */
export const VISUAL_NOW = new Date('2026-09-14T12:00:00Z');

/** Screenshot baselines are generated on Linux (Docker/CI) only. */
export function isVisualHostSupported(): boolean {
  return process.platform === 'linux' || process.env.VISUAL_FORCE === '1';
}

/** Smoke runs check that every page reaches its ready state, without screenshots. */
export const isSmokeRun = process.env.VISUAL_SMOKE === '1';

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json');
type A11yBaseline = Record<string, string[]>;

function readBaseline(): A11yBaseline {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline;
}

function writeBaseline(baseline: A11yBaseline): void {
  const sorted = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

export async function prepareVisualPage(page: Page, options: { signedIn: boolean }): Promise<void> {
  await page.clock.setFixedTime(VISUAL_NOW);
  if (options.signedIn) {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  } else {
    await mockUnhandledRest(page);
  }
}

/** Waits for web fonts and in-flight images so the screenshot is stable. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const pending = Array.from(document.images).filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          })
      )
    );
  });
}

/** Regions whose text depends on the wall clock or live counters. */
export function dynamicMasks(page: Page): Locator[] {
  return [page.getByText(/^(just now|\d+[mhdw] ago)$/)];
}

/**
 * Fails on serious/critical axe violations that are not already recorded for
 * `key` in a11y-baseline.json. With A11Y_BASELINE_WRITE=1 it records the
 * current violations instead (run with --workers=1).
 */
export async function expectNoNewA11yViolations(page: Page, key: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = Array.from(
    new Set(
      results.violations
        .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
        .map((violation) => violation.id)
    )
  ).sort();

  const baseline = readBaseline();
  if (process.env.A11Y_BASELINE_WRITE === '1') {
    if (blocking.length > 0) baseline[key] = blocking;
    else delete baseline[key];
    writeBaseline(baseline);
    return;
  }

  const known = new Set(baseline[key] ?? []);
  const unexpected = blocking.filter((id) => !known.has(id));
  expect(unexpected, `New serious/critical axe violations on ${key}: ${unexpected.join(', ')}`).toEqual([]);
}
```

- [ ] **Step 5: Create `apps/web/e2e/visual/pages.ts` (page catalogue)**

```ts
import { expect, type Page, type Route } from '@playwright/test';
import {
  MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE,
  MOCK_POST_OTHER_AUTHOR,
  MOCK_POSTS,
  MOCK_UPCOMING_EVENTS,
  MOCK_USER_PROFILE,
} from '../fixtures/mock-data';

export type VisualPage = {
  /** Screenshot file stem and a11y-baseline key suffix. */
  name: string;
  path: string;
  signedIn: boolean;
  /** Extra routes registered after the default mocks (they take priority). */
  setup?: (page: Page) => Promise<void>;
  /** Resolves once the page shows its real content (not a skeleton). */
  ready: (page: Page) => Promise<void>;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const READY_TIMEOUT = { timeout: 15_000 };

function wantsSingleObject(route: Route): boolean {
  return (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
}

async function heading(page: Page, name: RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name }).first()).toBeVisible(READY_TIMEOUT);
}

export const VISUAL_PAGES: VisualPage[] = [
  { name: 'landing', path: '/', signedIn: false, ready: (page) => heading(page, /welcome to nepally/i) },
  { name: 'login', path: '/login', signedIn: false, ready: (page) => heading(page, /welcome back/i) },
  { name: 'signup', path: '/signup', signedIn: false, ready: (page) => heading(page, /join nepally/i) },
  {
    name: 'feed',
    path: '/feed',
    signedIn: true,
    ready: (page) => expect(page.getByText(MOCK_POSTS[0].title).first()).toBeVisible(READY_TIMEOUT),
  },
  {
    name: 'post-detail',
    path: `/posts/${MOCK_POST_OTHER_AUTHOR.id}`,
    signedIn: true,
    setup: async (page) => {
      const detailPost = {
        ...MOCK_POST_OTHER_AUTHOR,
        post_tags: (MOCK_POST_OTHER_AUTHOR.tags ?? []).map((tag) => ({ tag })),
      };
      await page.route('**/rest/v1/posts**', async (route) => {
        const body = wantsSingleObject(route) ? detailPost : [detailPost];
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
      });
    },
    ready: (page) => expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'create-post', path: '/posts/create', signedIn: true, ready: (page) => heading(page, /create post/i) },
  {
    name: 'profile',
    path: '/profile',
    signedIn: true,
    ready: (page) =>
      expect(page.getByRole('main').getByText(MOCK_USER_PROFILE.full_name, { exact: true }).first()).toBeVisible(
        READY_TIMEOUT
      ),
  },
  {
    name: 'public-profile',
    path: `/users/${MOCK_POST_OTHER_AUTHOR.author_id}`,
    signedIn: true,
    ready: (page) => expect(page.getByText(MOCK_USER_PROFILE.full_name).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'events', path: '/events', signedIn: true, ready: (page) => heading(page, /^events$/i) },
  {
    name: 'event-detail',
    path: `/events/${MOCK_UPCOMING_EVENTS[0].id}`,
    signedIn: true,
    setup: async (page) => {
      await page.route('**/rest/v1/events**', async (route) => {
        const body = wantsSingleObject(route) ? MOCK_UPCOMING_EVENTS[0] : MOCK_UPCOMING_EVENTS;
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
      });
    },
    ready: (page) => expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'marketplace', path: '/marketplace', signedIn: true, ready: (page) => heading(page, /^marketplace$/i) },
  {
    name: 'listing-detail',
    path: `/marketplace/listing/${MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.id}`,
    signedIn: true,
    ready: (page) =>
      expect(page.getByText(MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'messages', path: '/messages', signedIn: true, ready: (page) => heading(page, /messages/i) },
  { name: 'notifications', path: '/notifications', signedIn: true, ready: (page) => heading(page, /notifications/i) },
];
```

- [ ] **Step 6: Create `apps/web/e2e/visual/pages.visual.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import {
  dynamicMasks,
  expectNoNewA11yViolations,
  isSmokeRun,
  isVisualHostSupported,
  prepareVisualPage,
  settle,
} from './helpers';
import { VISUAL_PAGES } from './pages';

test.describe.configure({ mode: 'parallel' });

for (const entry of VISUAL_PAGES) {
  test(`${entry.name} matches its baseline`, async ({ page }, testInfo) => {
    test.skip(
      !isVisualHostSupported(),
      'Visual baselines are Linux-only. Run: npm run test:visual:docker --workspace=apps/web'
    );

    await prepareVisualPage(page, { signedIn: entry.signedIn });
    await entry.setup?.(page);
    await page.goto(entry.path);
    await entry.ready(page);
    await settle(page);

    if (isSmokeRun) return;

    await expect(page).toHaveScreenshot(`${entry.name}.png`, { mask: dynamicMasks(page) });
    await expectNoNewA11yViolations(page, `${testInfo.project.name}:${entry.name}`);
  });
}
```

- [ ] **Step 7: Create the empty baseline and the smoke runner**

`apps/web/e2e/visual/a11y-baseline.json`:

```json
{}
```

`scripts/visual/smoke.mjs`:

```js
#!/usr/bin/env node
/**
 * Runs the visual projects without taking screenshots, on any OS. It proves
 * every catalogued page reaches its ready state before baselines are generated
 * in Docker/CI. Invoked from apps/web via `npm run test:visual:smoke`.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', '--project=visual-desktop', '--project=visual-phone'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VISUAL_FORCE: '1', VISUAL_SMOKE: '1' },
});

process.exit(result.status ?? 1);
```

- [ ] **Step 8: Run the smoke check**

Run: `npm run test:visual:smoke --workspace=apps/web`
Expected: 28 tests PASS (14 pages × 2 projects).

If a `ready` assertion times out, open the trace (`npx playwright show-trace <path printed in the failure>`, run from `apps/web`), find the first stable heading or text the page renders with the mocked data, and change that entry's `ready` to wait for it. Do not add sleeps.

- [ ] **Step 9: Confirm the e2e suite still selects only the functional project**

Run: `npm run test:e2e --workspace=apps/web -- --list`
Expected: every listed test is under `[chromium]`; none under `visual-*`.

- [ ] **Step 10: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/package.json package.json package-lock.json apps/web/e2e/visual scripts/visual/smoke.mjs
git commit -m "test(web): add visual regression and axe harness for key pages" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 0.5: Linux baselines — Docker runner, CI job, baseline workflow

**Files:**

- Create: `scripts/visual/run-in-docker.mjs`
- Create: `.github/workflows/visual-baselines.yml`
- Modify: `.github/workflows/ci.yml` (append the `web_visual` job)
- Create (generated): `apps/web/e2e/visual/__screenshots__/**`, `apps/web/e2e/visual/a11y-baseline.json`

**Interfaces:**

- Consumes: the `visual-desktop` / `visual-phone` projects (Task 0.4).
- Produces: `npm run test:visual:docker --workspace=apps/web [-- --update] [--write-a11y-baseline]`, used by every later PR to re-baseline.

- [ ] **Step 1: Create `scripts/visual/run-in-docker.mjs`**

```js
#!/usr/bin/env node
/**
 * Runs the web visual-regression projects inside the official Playwright
 * Docker image, so screenshots match CI regardless of the host OS.
 *
 *   npm run test:visual:docker --workspace=apps/web
 *   npm run test:visual:docker --workspace=apps/web -- --update
 *   npm run test:visual:docker --workspace=apps/web -- --update --write-a11y-baseline
 *
 * Linux node_modules live in named Docker volumes so the host install is
 * never overwritten.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const playwrightPkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'node_modules', '@playwright', 'test', 'package.json'), 'utf8')
);
const image = `mcr.microsoft.com/playwright:v${playwrightPkg.version}-noble`;

const update = process.argv.includes('--update');
const writeA11yBaseline = process.argv.includes('--write-a11y-baseline');

const playwrightArgs = ['--project=visual-desktop', '--project=visual-phone'];
if (update) playwrightArgs.push('--update-snapshots');
if (writeA11yBaseline) playwrightArgs.push('--workers=1');

const mounts = [
  `type=bind,source=${repoRoot},target=/work`,
  'type=volume,source=nepally-visual-root-modules,target=/work/node_modules',
  'type=volume,source=nepally-visual-web-modules,target=/work/apps/web/node_modules',
  'type=volume,source=nepally-visual-mobile-modules,target=/work/apps/mobile/node_modules',
  'type=volume,source=nepally-visual-shared-modules,target=/work/packages/shared/node_modules',
  'type=volume,source=nepally-visual-next-build,target=/work/apps/web/.next',
];

const env = {
  CI: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key',
  ...(writeA11yBaseline ? { A11Y_BASELINE_WRITE: '1' } : {}),
};

const command = `npm ci && cd apps/web && npx playwright test ${playwrightArgs.join(' ')}`;

const dockerArgs = [
  'run',
  '--rm',
  '--ipc=host',
  '--workdir',
  '/work',
  ...mounts.flatMap((mount) => ['--mount', mount]),
  ...Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
  image,
  'bash',
  '-lc',
  command,
];

console.log(`Running visual tests in ${image}${update ? ' (updating snapshots)' : ''}`);
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit' });
if (result.error) {
  console.error(`Could not start Docker: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
```

- [ ] **Step 2: Append the `web_visual` job to `.github/workflows/ci.yml`**

Add at the end of `jobs:` (same indentation as `web_e2e:`):

```yaml
  web_visual:
    name: Web visual regression
    needs:
      - gate
    runs-on: ubuntu-latest
    timeout-minutes: 30
    # Keep this tag equal to the installed @playwright/test version.
    container:
      image: mcr.microsoft.com/playwright:v1.63.0-noble
      options: --user 1001
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run visual tests
        working-directory: apps/web
        run: npx playwright test --project=visual-desktop --project=visual-phone
        env:
          CI: 'true'
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key

      - name: Upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: apps/web/test-results
```

- [ ] **Step 3: Create `.github/workflows/visual-baselines.yml`**

```yaml
name: Visual baselines

on:
  workflow_dispatch:
    inputs:
      target_branch:
        description: Branch to regenerate web visual baselines for
        required: true

jobs:
  update:
    name: Regenerate web visual baselines
    runs-on: ubuntu-latest
    timeout-minutes: 30
    # Keep this tag equal to the installed @playwright/test version.
    container:
      image: mcr.microsoft.com/playwright:v1.63.0-noble
      options: --user 1001
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.target_branch }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Update screenshots and accessibility baseline
        working-directory: apps/web
        run: npx playwright test --project=visual-desktop --project=visual-phone --update-snapshots --workers=1
        env:
          CI: 'true'
          A11Y_BASELINE_WRITE: '1'
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key

      - name: Upload baselines
        uses: actions/upload-artifact@v4
        with:
          name: visual-baselines
          path: |
            apps/web/e2e/visual/__screenshots__
            apps/web/e2e/visual/a11y-baseline.json
```

- [ ] **Step 4: Generate today's baselines**

Run: `npm run test:visual:docker --workspace=apps/web -- --update --write-a11y-baseline`
Expected: the run finishes, `apps/web/e2e/visual/__screenshots__/visual-desktop/*.png` and `…/visual-phone/*.png` exist (14 each), and `a11y-baseline.json` lists violation ids per `visual-*:page` key.

**If Docker is not available:** stop and ask the user to approve pushing `test/web-visual-safety-net`. After the push, run **Actions → Visual baselines → Run workflow** on that branch. Then download the `visual-baselines` artifact and unzip it so `__screenshots__/` and `a11y-baseline.json` land in `apps/web/e2e/visual/`.

- [ ] **Step 5: Sanity-check the images**

Open four PNGs (desktop and phone for `feed` and `login`). Expected: real content, with no skeletons, error states or blank pages. If one shows a loading state, tighten that page's `ready` in `pages.ts` and repeat Step 4.

- [ ] **Step 6: Verify the baselines pass**

Run: `npm run test:visual:docker --workspace=apps/web`
Expected: 28 PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/run-in-docker.mjs .github/workflows/ci.yml .github/workflows/visual-baselines.yml apps/web/e2e/visual
git commit -m "ci(web): run visual regression in the Playwright container and add baselines" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 0.6: Document the workflow and verify PR 0

**Files:**

- Modify: `docs/guides/setup-and-testing.md` (insert before `### Policy reminder`)
- Modify: `TECH-VERSIONS.md` (Testing Stack table)

**Interfaces:** none.

- [ ] **Step 1: Add the guide section**

Insert immediately before the line `### Policy reminder` in `docs/guides/setup-and-testing.md`:

````markdown
### Visual regression and accessibility tests (web)

The `visual-desktop` (1280×800) and `visual-phone` (Pixel 7) Playwright projects screenshot key pages and run an axe scan on each. Baselines are **Linux-only** and live in `apps/web/e2e/visual/__screenshots__/`. CI runs them in the `Web visual regression` job inside the Playwright container.

```bash
# Compare against baselines (needs Docker; identical to CI)
npm run test:visual:docker --workspace=apps/web

# Accept intentional visual changes
npm run test:visual:docker --workspace=apps/web -- --update

# Any OS without Docker: check every page reaches its ready state (no screenshots)
npm run test:visual:smoke --workspace=apps/web
```

- **No Docker?** Push the branch, run **Actions → Visual baselines** on it, and unzip the `visual-baselines` artifact into `apps/web/e2e/visual/`.
- **Add a page:** append an entry to `apps/web/e2e/visual/pages.ts`.
- **Accessibility baseline:** `apps/web/e2e/visual/a11y-baseline.json` records known serious/critical axe violations per `project:page`, and tests fail on anything new. After fixing violations, regenerate with `-- --update --write-a11y-baseline`. The diff of that file must only delete lines.
- **Image tag:** the container tag in `ci.yml` and `visual-baselines.yml` must equal the installed `@playwright/test` version.

````

- [ ] **Step 2: Add the TECH-VERSIONS row**

In `TECH-VERSIONS.md` → **Testing Stack**, add after the `@playwright/test` row:

```markdown
| **@axe-core/playwright** | ^4.13.0 | apps/web | Axe scans in the visual projects; known violations in `e2e/visual/a11y-baseline.json` |
```

- [ ] **Step 3: Full verification**

Run each; all must succeed:

```bash
npm run lint
npm run lint:guards
npm run type-check
npm run test
npm run test:e2e:web
npm run test:visual:web
npm run docs:check
```

- [ ] **Step 4: Commit**

```bash
git add docs/guides/setup-and-testing.md TECH-VERSIONS.md
git commit -m "docs: document web visual regression and accessibility tests" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Push and open the PR**

Push `test/web-visual-safety-net` and open its PR. Update the tracker row for PR 0.

---

# PR 1 — Foundation

**Branch:** `feat/web-design-tokens`, created from `master` after PR 0 merges.

**Outcome:** the whole app renders with H1 tokens and fonts, the Mantine theme mirrors the tokens, and guards stop new hard-coded colours or raw form elements from appearing.

| Path | Change | Responsibility |
|---|---|---|
| `apps/web/src/styles/tokens.css` | Create | Primitive + semantic tokens (source of truth) |
| `apps/web/src/styles/tokens.testutil.ts` | Create | Parse `tokens.css`, resolve `var()` chains (tests only) |
| `apps/web/src/styles/tokens.contrast.test.ts` | Create | WCAG AA for every text/background pair |
| `apps/web/src/styles/fonts/*.woff2` | Create | Self-hosted Gambarino + Switzer |
| `apps/web/src/styles/fonts.ts` | Create | `next/font/local` declarations |
| `apps/web/src/components/layout/FontVariables.tsx` (+ test) | Create | Points `--font-display` / `--font-body` at next/font families |
| `apps/web/src/styles/legacy-aliases.css` (+ `legacy-aliases.test.ts`) | Create | Old variable names → new tokens (deleted in PR 10) |
| `apps/web/src/styles/globals.css` | Rewrite | Reset, base elements, focus ring, reduced motion |
| `apps/web/src/styles/design-system.css`, `design-system-next.css` | Delete | Replaced by tokens + aliases |
| `apps/web/src/styles/mantine-theme.ts` (+ test) | Rewrite | Theme, `variantColorResolver`, `cssVariablesResolver` |
| `apps/web/src/styles/mantine-components.module.css` | Create | Theme-level class hooks |
| `apps/web/src/pages/_app.page.tsx`, `_app.test.tsx` | Modify | Resolver, `ModalsProvider`, `FontVariables` |
| `apps/web/src/test-utils.tsx` | Modify | Real theme + `ModalsProvider` in tests |
| `apps/web/src/components/events/RsvpButton.tsx`, `Layout.tsx`, `LocationSwitcher.tsx` (+ `.module.css`) | Modify | Drop `nusaPrimary` colour references |
| `scripts/guard-css-tokens.js` (+ `.test.js`, `.allowlist.json`) | Create | Token guard for CSS Modules |
| `apps/web/eslint.config.mjs` | Modify | `react/forbid-elements` rule |
| `apps/web/eslint/raw-element-allowlist.mjs`, `write-raw-element-allowlist.mjs` | Create | Shrinking allowlist + its generator |
| `package.json` (root) | Modify | `lint:guards`, `guards:test`, `test` scripts |
| `docs/architecture/web-ui-system.md` | Create | Evergreen design-system guide |
| `docs/INDEX.md`, `TECH-VERSIONS.md`, `CLAUDE.md` | Modify | Index, versions, styling rule |
| `apps/web/e2e/visual/__screenshots__/**`, `a11y-baseline.json` | Update | Intentional re-baseline |

### Task 1.1: Token file with contrast guarantees

**Files:**

- Create: `apps/web/src/styles/tokens.testutil.ts`
- Create: `apps/web/src/styles/tokens.contrast.test.ts`
- Create: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/package.json` (devDependencies)

**Interfaces:**

- Produces `readTokenMap(css?: string): Map<string, string>`, which parses the first `:root { … }` block into a name → raw value map. It reads `tokens.css` by default.
- Produces `resolveToken(map: Map<string, string>, name: string): string`, which follows `var(--x)` chains to a literal and throws on unknown or circular tokens.
- Produces every token name in `tokens.css`. All later CSS uses these names.

- [ ] **Step 1: Create the PR branch**

```bash
git switch master && git pull --ff-only && git switch -c feat/web-design-tokens
```

- [ ] **Step 2: Install culori**

Run: `npm install --save-dev culori@^4.0.2 @types/culori@^4.0.1 --workspace=apps/web`

- [ ] **Step 3: Write the token parser `apps/web/src/styles/tokens.testutil.ts`**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOKENS_PATH = fileURLToPath(new URL('./tokens.css', import.meta.url));

/** Parses the first `:root { … }` block of a stylesheet into name → raw value. */
export function readTokenMap(css: string = readFileSync(TOKENS_PATH, 'utf8')): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rootBlock = withoutComments.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootBlock) throw new Error('Stylesheet has no :root block');

  const tokens = new Map<string, string>();
  for (const declaration of rootBlock[1].split(';')) {
    const match = declaration.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (match) tokens.set(match[1], match[2].replace(/\s+/g, ' '));
  }
  return tokens;
}

/** Follows `var(--x)` references until a literal value is reached. */
export function resolveToken(tokens: Map<string, string>, name: string, seen: Set<string> = new Set()): string {
  const raw = tokens.get(name);
  if (raw === undefined) throw new Error(`Unknown token ${name}`);
  const reference = raw.match(/^var\((--[\w-]+)\)$/);
  if (!reference) return raw;
  if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
  seen.add(name);
  return resolveToken(tokens, reference[1], seen);
}
```

- [ ] **Step 4: Write the failing contrast test `apps/web/src/styles/tokens.contrast.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { wcagContrast } from 'culori';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();

/** WCAG 2.x AA for normal-size text. */
const AA_TEXT = 4.5;

const TEXT_PAIRS: Array<[foreground: string, background: string]> = [
  ['--text-1', '--surface-0'],
  ['--text-1', '--surface-1'],
  ['--text-1', '--surface-2'],
  ['--text-2', '--surface-0'],
  ['--text-2', '--surface-1'],
  ['--text-2', '--surface-2'],
  ['--text-3', '--surface-0'],
  ['--text-3', '--surface-1'],
  ['--action-fg', '--action-bg'],
  ['--action-fg', '--action-bg-hover'],
  ['--accent-ink', '--accent-tint'],
  ['--trust-new-fg', '--trust-new-bg'],
  ['--trust-verified-fg', '--trust-verified-bg'],
  ['--trust-contributor-fg', '--trust-contributor-bg'],
  ['--emergency-fg', '--emergency-bg'],
  ['--danger', '--surface-1'],
  ['--success', '--surface-1'],
  ['--warning', '--surface-1'],
];

describe('design token contrast (WCAG AA)', () => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (foreground, background) => {
    const ratio = wcagContrast(resolveToken(tokens, foreground), resolveToken(tokens, background));
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm run test --workspace=apps/web -- src/styles/tokens.contrast.test.ts`
Expected: FAIL with `ENOENT … tokens.css`.

- [ ] **Step 6: Create `apps/web/src/styles/tokens.css` with the spec's original values**

```css
/*
 * Nepally web design tokens — "H1 · Ink & Marigold".
 * Spec:  docs/specs/2026-09-14-web-ui-overhaul-design.md §4.1
 * Guide: docs/architecture/web-ui-system.md
 *
 * Primitives only feed the semantic layer below them. CSS Modules use semantic
 * tokens only (scripts/guard-css-tokens.js). Text colour pairs are checked for
 * WCAG AA by tokens.contrast.test.ts; mantine-theme.ts mirrors these values
 * (mantine-theme.test.ts). All colours are inside the sRGB gamut.
 */
:root {
  /* ── Primitives: ink (navy) ───────────────────────────── */
  --ink-900: oklch(19% 0.02 265);
  --ink-800: oklch(26% 0.07 265);
  --ink-700: oklch(32% 0.08 265);

  /* ── Primitives: marigold ─────────────────────────────── */
  --marigold-100: oklch(94% 0.05 85);
  --marigold-500: oklch(76% 0.15 70);
  --marigold-700: oklch(42% 0.09 65);

  /* ── Primitives: paper (warm neutrals) ────────────────── */
  --paper-0: oklch(100% 0 0);
  --paper-50: oklch(98.2% 0.008 75);
  --paper-100: oklch(96% 0.01 75);
  --paper-150: oklch(94% 0.012 75);
  --paper-200: oklch(92% 0.012 75);
  --paper-300: oklch(86% 0.014 75);
  --paper-500: oklch(60% 0.014 75);
  --paper-700: oklch(44% 0.015 75);

  /* ── Primitives: status hues ──────────────────────────── */
  --moss-100: oklch(95% 0.025 155);
  --moss-600: oklch(45% 0.08 155);
  --moss-700: oklch(35% 0.08 155);
  --crimson-100: oklch(95% 0.04 25);
  --crimson-300: oklch(85% 0.08 25);
  --crimson-600: oklch(50% 0.2 25);
  --crimson-700: oklch(42% 0.16 25);
  --amber-600: oklch(55% 0.11 65);

  /* ── Surfaces, text, borders ──────────────────────────── */
  --surface-0: var(--paper-50);
  --surface-1: var(--paper-0);
  --surface-2: var(--paper-100);
  --surface-sunken: var(--paper-150);
  --text-1: var(--ink-900);
  --text-2: var(--paper-700);
  --text-3: var(--paper-500);
  --border-subtle: var(--paper-200);
  --border-solid: var(--paper-300);

  /* ── Action (ink) and accent (marigold — never text) ──── */
  --action-bg: var(--ink-800);
  --action-bg-hover: var(--ink-700);
  --action-fg: var(--paper-0);
  --accent: var(--marigold-500);
  --accent-tint: var(--marigold-100);
  --accent-ink: var(--marigold-700);

  /* ── Trust tiers ──────────────────────────────────────── */
  --trust-new-fg: oklch(40% 0.01 75);
  --trust-new-bg: oklch(94% 0.008 75);
  --trust-verified-fg: var(--moss-700);
  --trust-verified-bg: var(--moss-100);
  --trust-contributor-fg: var(--accent-ink);
  --trust-contributor-bg: var(--accent-tint);

  /* ── Status ───────────────────────────────────────────── */
  --emergency-fg: var(--crimson-700);
  --emergency-bg: var(--crimson-100);
  --emergency-border: var(--crimson-300);
  --success: var(--moss-600);
  --warning: var(--amber-600);
  --danger: var(--crimson-600);

  /* ── Topic dots (decorative; always paired with a label) ─ */
  --tag-housing: oklch(55% 0.12 155);
  --tag-jobs: oklch(52% 0.11 255);
  --tag-help: oklch(65% 0.12 75);
  --tag-question: oklch(50% 0.11 300);
  --tag-politics: oklch(45% 0.03 265);
  --tag-discussion: oklch(55% 0.09 200);
  --tag-emergency: var(--emergency-fg);

  /* ── Typography ───────────────────────────────────────── */
  /* FontVariables.tsx overrides both families with the self-hosted faces. */
  --font-display: 'Gambarino', 'Source Serif Pro', Georgia, serif;
  --font-body: 'Switzer', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 0.8125rem;
  --font-size-sm: 0.9375rem;
  --font-size-base: 1.0625rem;
  --font-size-lg: 1.1875rem;
  --font-size-xl: 1.5rem;
  --font-size-display: clamp(2.25rem, 1.5rem + 2vw, 3rem);
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  /* Switzer is loaded at 400/500/600 only; "bold" means the heaviest loaded weight. */
  --font-weight-bold: 600;
  --leading-tight: 1.15;
  --leading-snug: 1.35;
  --leading-normal: 1.55;
  --leading-relaxed: 1.7;
  --tracking-tight: -0.02em;
  --tracking-snug: -0.01em;

  /* ── Space (4pt) ──────────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;

  /* ── Radius (purpose-named) ───────────────────────────── */
  --radius-chip: 4px;
  --radius-tag: 6px;
  --radius-control: 8px;
  --radius-card: 12px;
  --radius-overlay: 16px;
  --radius-full: 9999px;

  /* ── Elevation: borders by default, shadows only for floating layers ── */
  --shadow-float: 0 12px 40px oklch(19% 0.02 265 / 0.16), 0 2px 6px oklch(19% 0.02 265 / 0.06);
  --shadow-modal: 0 24px 64px oklch(19% 0.02 265 / 0.22), 0 4px 12px oklch(19% 0.02 265 / 0.08);
  --focus-ring-halo: 0 0 0 2px var(--surface-1), 0 0 0 6px var(--accent);

  /* ── Motion ───────────────────────────────────────────── */
  --duration-fast: 160ms;
  --duration-base: 240ms;
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);

  /* ── Layout ───────────────────────────────────────────── */
  --layout-max-width: 1200px;
  --layout-content-width: 800px;
  --layout-aside-width: 300px;
  --layout-rail-width: 240px;
  --layout-rail-compact-width: 72px;
  --layout-topbar-height: 60px;
  --layout-tabbar-height: 64px;
  --control-height: 44px;
  --card-padding: var(--space-5);
}
```

- [ ] **Step 7: Run the test and confirm the expected failures**

Run: `npm run test --workspace=apps/web -- src/styles/tokens.contrast.test.ts`
Expected: exactly two FAILs, `--text-3 on --surface-0` and `--text-3 on --surface-1` (ratios ≈ 3.7 and ≈ 3.9). Every other pair PASSES.

- [ ] **Step 8: Darken `--paper-500` so tertiary text meets AA**

In `tokens.css`, replace `--paper-500: oklch(60% 0.014 75);` with:

```css
  /* 60% measured 3.7:1 on --surface-0; 54% clears 4.5:1 on every surface. */
  --paper-500: oklch(54% 0.014 75);
```

- [ ] **Step 9: Run the test**

Run: `npm run test --workspace=apps/web -- src/styles/tokens.contrast.test.ts`
Expected: all 18 PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/styles/tokens.css apps/web/src/styles/tokens.testutil.ts apps/web/src/styles/tokens.contrast.test.ts apps/web/package.json package-lock.json
git commit -m "feat(web): add H1 design tokens with WCAG AA contrast test" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.2: Self-hosted fonts

**Files:**

- Create: `apps/web/src/styles/fonts/Gambarino-Regular.woff2`, `Switzer-Regular.woff2`, `Switzer-Medium.woff2`, `Switzer-Semibold.woff2`
- Create: `apps/web/src/styles/fonts.ts`
- Create: `apps/web/src/components/layout/FontVariables.tsx`
- Create: `apps/web/src/components/layout/FontVariables.test.tsx`
- Modify: `apps/web/src/pages/_app.page.tsx`, `apps/web/src/pages/_app.test.tsx`

**Interfaces:**

- Produces `displayFont` and `bodyFont` (`next/font/local` results; `.style.fontFamily: string`).
- Produces `FontVariables(): JSX.Element`, rendered once in `_app`.

- [ ] **Step 1: Licence gate**

Open https://www.fontshare.com/fonts/gambarino and https://www.fontshare.com/fonts/switzer, click **Download family**, and read the licence file inside each ZIP (ITF Free Font License).

- **If it permits embedding the fonts in a website or app:** continue with Step 2.
- **If it does not:** skip Steps 2–4. In `apps/web/src/pages/_document.page.tsx`, inside `<Head>`, add:

  ```tsx
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=gambarino@400&f[]=switzer@400,500,600&display=swap"
        />
  ```

  Then continue at Step 7, leaving out every `FontVariables` change. The families named in `tokens.css` load from the CDN. Record which path you took in the Task 1.6 guide (§ Fonts).

- [ ] **Step 2: Download the woff2 files**

```bash
mkdir -p apps/web/src/styles/fonts
curl -fL -o apps/web/src/styles/fonts/Gambarino-Regular.woff2 "https://cdn.fontshare.com/wf/ZINX7PW4XMYISLZAZKYY4QHYYHYNPKAV/Z54IGKTR4PBLA5KTYL3IDQZHFQPJJVNZ/6KBHT5NXCZVM6GHTPKGIR6DXZLQAYIFK.woff2"
curl -fL -o apps/web/src/styles/fonts/Switzer-Regular.woff2 "https://cdn.fontshare.com/wf/BLNB4FAQFNK56DWWNF7PMGTCOTZHOEII/ST3WKSSDMBK2MIQQO3MAVYWLF4FTOLFV/6IN5WOLRCYP4G4MOCOHOMXNON6Q7MDAR.woff2"
curl -fL -o apps/web/src/styles/fonts/Switzer-Medium.woff2 "https://cdn.fontshare.com/wf/OYB4CXKJQXKTNSLJMTDQOIVUL2V5EL7S/WYO2P7DQVV5RNXGMCUO2HL4RJP4VFUAS/6XPIMU23OJVRY676OG5YVJMWEHWICATX.woff2"
curl -fL -o apps/web/src/styles/fonts/Switzer-Semibold.woff2 "https://cdn.fontshare.com/wf/5SZVFDB7V52TI6ULVC6J3WQZQCIZVDV5/ODYPSTCUDMKSTYIPTV4CLQ7URIK7XYBJ/YS3VPNVO4B3TOJMEXDGFZQ4TLZGGSRZC.woff2"
for f in apps/web/src/styles/fonts/*.woff2; do printf '%s ' "$f"; head -c 4 "$f"; echo; done
```

Expected: every file prints `wOF2`. If a download 404s because Fontshare rotated its URLs, copy the same four weights from the `Fonts/WEB/fonts/` folder of the ZIPs from Step 1.

- [ ] **Step 3: Create `apps/web/src/styles/fonts.ts`**

```ts
import localFont from 'next/font/local';

/**
 * Self-hosted brand faces (Fontshare, ITF Free Font License). next/font inlines
 * the @font-face rules, preloads the files and sizes a metric-matched fallback,
 * so there is no third-party request and no layout shift.
 */
export const displayFont = localFont({
  src: [{ path: './fonts/Gambarino-Regular.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  fallback: ['Source Serif Pro', 'Georgia', 'serif'],
});

export const bodyFont = localFont({
  src: [
    { path: './fonts/Switzer-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Switzer-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Switzer-Semibold.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});
```

- [ ] **Step 4: Write the failing test `apps/web/src/components/layout/FontVariables.test.tsx`**

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('../../styles/fonts', () => ({
  displayFont: { style: { fontFamily: "'Display Mock', serif" } },
  bodyFont: { style: { fontFamily: "'Body Mock', sans-serif" } },
}));

import FontVariables from './FontVariables';

describe('FontVariables', () => {
  it('points the font tokens at the self-hosted faces', () => {
    const { container } = render(<FontVariables />);
    const css = container.querySelector('style')?.innerHTML ?? '';
    expect(css).toContain("--font-display:'Display Mock', serif");
    expect(css).toContain("--font-body:'Body Mock', sans-serif");
  });

  it('uses a selector that outranks tokens.css :root', () => {
    const { container } = render(<FontVariables />);
    expect(container.querySelector('style')?.innerHTML.startsWith('html:root{')).toBe(true);
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/layout/FontVariables.test.tsx`
Expected: FAIL, `Cannot find module './FontVariables'`.

- [ ] **Step 5: Create `apps/web/src/components/layout/FontVariables.tsx`**

```tsx
import Head from 'next/head';
import { bodyFont, displayFont } from '../../styles/fonts';

/**
 * Points --font-display / --font-body at the next/font families. `html:root`
 * outranks the `:root` rule in tokens.css, whose readable family names remain
 * as the fallback for tests and the first paint.
 */
export default function FontVariables() {
  const css = `html:root{--font-display:${displayFont.style.fontFamily};--font-body:${bodyFont.style.fontFamily};}`;
  return (
    <Head>
      <style key="font-variables" dangerouslySetInnerHTML={{ __html: css }} />
    </Head>
  );
}
```

Run: `npm run test --workspace=apps/web -- src/components/layout/FontVariables.test.tsx`
Expected: 2 PASS.

- [ ] **Step 6: Render it in `_app.page.tsx` and mock it in `_app.test.tsx`**

In `_app.page.tsx`, add the import `import FontVariables from '../components/layout/FontVariables';` and render `<FontVariables />` as the first child of `<MantineProvider>`.

In `_app.test.tsx`, add next to the other component mocks:

```tsx
vi.mock('../components/layout/FontVariables', () => ({
  default: () => null,
}));
```

- [ ] **Step 7: Run the app tests**

Run: `npm run test --workspace=apps/web -- src/pages/_app.test.tsx src/components/layout/FontVariables.test.tsx`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/styles/fonts apps/web/src/styles/fonts.ts apps/web/src/components/layout apps/web/src/pages/_app.page.tsx apps/web/src/pages/_app.test.tsx
git commit -m "feat(web): self-host Gambarino and Switzer via next/font" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.3: Legacy aliases, new globals, retire the old design-system files

**Files:**

- Create: `apps/web/src/styles/legacy-aliases.test.ts`
- Create: `apps/web/src/styles/legacy-aliases.css`
- Rewrite: `apps/web/src/styles/globals.css`
- Delete: `apps/web/src/styles/design-system.css`, `apps/web/src/styles/design-system-next.css`

**Interfaces:**

- Consumes `readTokenMap`, `resolveToken` (Task 1.1).
- Produces the global class `nepally-focus` (focus ring used by the Mantine theme in Task 1.4).
- Every old `design-system.css` variable name keeps resolving until PR 10.

- [ ] **Step 1: Write the failing test `apps/web/src/styles/legacy-aliases.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { converter } from 'culori';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();
const legacyPath = fileURLToPath(new URL('./legacy-aliases.css', import.meta.url));
const legacy = readTokenMap(readFileSync(legacyPath, 'utf8'));
const defined = new Map([...tokens, ...legacy]);
const toRgb = converter('rgb');

/** Every custom property the retired design-system.css defined. */
const LEGACY_NAMES = [
  '--color-primary', '--color-primary-dark', '--color-primary-light', '--color-primary-rgb',
  '--color-secondary', '--color-secondary-dark', '--color-secondary-light', '--color-secondary-rgb',
  '--color-accent-red', '--color-success', '--color-warning', '--color-error',
  '--gradient-primary', '--gradient-primary-hover', '--gradient-secondary', '--gradient-bg',
  '--color-bg', '--color-surface', '--color-surface-low', '--color-surface-container',
  '--color-text-primary', '--color-text-secondary', '--color-text-tertiary',
  '--color-border', '--color-border-solid', '--color-disabled',
  '--color-trust-new', '--color-trust-verified', '--color-trust-contributor',
  '--color-banner-bg', '--color-banner-text',
  '--glass-bg', '--glass-bg-strong', '--glass-bg-card', '--glass-blur', '--glass-blur-sm',
  '--glass-border', '--glass-border-card', '--ghost-border',
  '--font-family', '--font-display',
  '--font-size-h1', '--font-size-h2', '--font-size-h3', '--font-size-body', '--font-size-small', '--font-size-caption',
  '--font-weight-regular', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold', '--font-weight-extrabold',
  '--line-height-tight', '--line-height-normal', '--line-height-relaxed',
  '--space-xxs', '--space-xs', '--space-s', '--space-m', '--space-l', '--space-xl', '--space-xxl',
  '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full',
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-glass',
  '--max-width', '--content-width', '--sidebar-width', '--nav-height', '--input-height', '--button-height', '--card-padding',
  '--surface-rail-bg', '--surface-rail-blur', '--surface-rail-border', '--surface-rail-shadow',
  '--surface-topbar-bg', '--surface-topbar-blur', '--surface-topbar-border', '--surface-topbar-shadow',
  '--surface-nav-bg', '--surface-nav-blur', '--surface-nav-border', '--surface-nav-shadow',
  '--dropdown-bg', '--dropdown-border', '--dropdown-shadow',
  '--transition-fast', '--transition-normal', '--transition-spring',
];

function toByteChannels(color: string): number[] {
  const rgb = toRgb(color);
  if (!rgb) throw new Error(`Unparseable colour ${color}`);
  return [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));
}

describe('legacy-aliases.css', () => {
  it.each(LEGACY_NAMES)('%s is still defined', (name) => {
    expect(defined.has(name)).toBe(true);
  });

  it('only references variables that exist', () => {
    for (const [name, value] of legacy) {
      for (const reference of value.matchAll(/var\((--[\w-]+)\)/g)) {
        expect(defined.has(reference[1]), `${name} references undefined ${reference[1]}`).toBe(true);
      }
    }
  });

  it('never redefines a name that tokens.css owns', () => {
    for (const name of legacy.keys()) {
      expect(tokens.has(name), `${name} is defined in both files`).toBe(false);
    }
  });

  it.each([
    ['--color-primary-rgb', '--action-bg'],
    ['--color-secondary-rgb', '--accent'],
  ])('%s is the sRGB triplet of %s', (legacyName, tokenName) => {
    const triplet = legacy.get(legacyName)!.split(',').map((part) => Number(part.trim()));
    const expected = toByteChannels(resolveToken(tokens, tokenName));
    const close = triplet.every((channel, index) => Math.abs(channel - expected[index]) <= 2);
    expect(close, `expected ≈ ${expected.join(', ')}, got ${triplet.join(', ')}`).toBe(true);
  });
});
```

Run: `npm run test --workspace=apps/web -- src/styles/legacy-aliases.test.ts`
Expected: FAIL, `ENOENT … legacy-aliases.css`.

- [ ] **Step 2: Create `apps/web/src/styles/legacy-aliases.css`**

```css
/*
 * TEMPORARY bridge: names from the retired design-system.css → H1 tokens.
 * Lets every existing CSS Module re-skin without edits. Each area PR of the web
 * UI overhaul migrates its modules to semantic tokens; PR 10 deletes this file.
 * Names owned by tokens.css (--font-display, --font-weight-regular/medium/
 * semibold/bold, --radius-full, --card-padding) are intentionally absent.
 */
:root {
  /* Colours */
  --color-primary: var(--action-bg);
  --color-primary-dark: var(--ink-900);
  --color-primary-light: var(--action-bg-hover);
  --color-primary-rgb: 19, 34, 70;
  --color-secondary: var(--accent);
  --color-secondary-dark: var(--accent-ink);
  --color-secondary-light: var(--accent-tint);
  --color-secondary-rgb: 237, 158, 47;
  --color-accent-red: var(--emergency-fg);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-error: var(--danger);
  --gradient-primary: var(--action-bg);
  --gradient-primary-hover: var(--action-bg-hover);
  --gradient-secondary: var(--accent);
  --gradient-bg: var(--surface-0);
  --color-bg: var(--surface-0);
  --color-surface: var(--surface-1);
  --color-surface-low: var(--surface-2);
  --color-surface-container: var(--surface-sunken);
  --color-text-primary: var(--text-1);
  --color-text-secondary: var(--text-2);
  --color-text-tertiary: var(--text-3);
  --color-border: var(--border-subtle);
  --color-border-solid: var(--border-solid);
  --color-disabled: var(--border-solid);
  --color-trust-new: var(--trust-new-fg);
  --color-trust-verified: var(--trust-verified-fg);
  --color-trust-contributor: var(--trust-contributor-fg);
  --color-banner-bg: var(--accent-tint);
  --color-banner-text: var(--accent-ink);

  /* Glassmorphism → flat surfaces */
  --glass-bg: var(--surface-1);
  --glass-bg-strong: var(--surface-1);
  --glass-bg-card: var(--surface-1);
  --glass-blur: none;
  --glass-blur-sm: none;
  --glass-border: 1px solid var(--border-subtle);
  --glass-border-card: 1px solid var(--border-subtle);
  --ghost-border: 1px solid var(--border-subtle);

  /* Typography */
  --font-family: var(--font-body);
  --font-size-h1: var(--font-size-display);
  --font-size-h2: var(--font-size-xl);
  --font-size-h3: var(--font-size-lg);
  --font-size-body: var(--font-size-base);
  --font-size-small: var(--font-size-sm);
  --font-size-caption: var(--font-size-xs);
  --font-weight-extrabold: var(--font-weight-semibold);
  --line-height-tight: var(--leading-tight);
  --line-height-normal: var(--leading-normal);
  --line-height-relaxed: var(--leading-relaxed);

  /* Space */
  --space-xxs: var(--space-1);
  --space-xs: var(--space-2);
  --space-s: var(--space-4);
  --space-m: var(--space-5);
  --space-l: var(--space-6);
  --space-xl: var(--space-7);
  --space-xxl: var(--space-8);

  /* Radius */
  --radius-sm: var(--radius-control);
  --radius-md: var(--radius-card);
  --radius-lg: var(--radius-overlay);
  --radius-xl: var(--radius-overlay);

  /* Elevation: cards keep separation with a hairline instead of soft shadows */
  --shadow-sm: 0 0 0 1px var(--border-subtle);
  --shadow-md: 0 0 0 1px var(--border-subtle);
  --shadow-lg: var(--shadow-float);
  --shadow-glass: var(--shadow-float);

  /* Layout */
  --max-width: var(--layout-max-width);
  --content-width: var(--layout-content-width);
  --sidebar-width: var(--layout-aside-width);
  --nav-height: var(--layout-topbar-height);
  --input-height: var(--control-height);
  --button-height: var(--control-height);

  /* Shell surfaces */
  --surface-rail-bg: var(--surface-1);
  --surface-rail-blur: none;
  --surface-rail-border: 1px solid var(--border-subtle);
  --surface-rail-shadow: none;
  --surface-topbar-bg: var(--surface-1);
  --surface-topbar-blur: none;
  --surface-topbar-border: 1px solid var(--border-subtle);
  --surface-topbar-shadow: none;
  --surface-nav-bg: var(--surface-1);
  --surface-nav-blur: none;
  --surface-nav-border: 1px solid var(--border-subtle);
  --surface-nav-shadow: none;
  --dropdown-bg: var(--surface-1);
  --dropdown-border: 1px solid var(--border-subtle);
  --dropdown-shadow: var(--shadow-float);

  /* Motion */
  --transition-fast: var(--duration-fast) var(--ease-out);
  --transition-normal: var(--duration-base) var(--ease-out);
  --transition-spring: var(--duration-base) var(--ease-out);
}
```

- [ ] **Step 3: Run the alias test**

Run: `npm run test --workspace=apps/web -- src/styles/legacy-aliases.test.ts`
Expected: all PASS. If a triplet assertion fails, replace that triplet with the `expected ≈ r, g, b` values from the failure message and re-run.

- [ ] **Step 4: Rewrite `apps/web/src/styles/globals.css`**

```css
@import './tokens.css';
@import './legacy-aliases.css';

*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
  padding: 0;
}

:root {
  color-scheme: light;
}

html {
  /* Never synthesise bold/italic Gambarino or unloaded Switzer weights. */
  font-synthesis: none;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: var(--text-1);
  background: var(--surface-0);
  min-height: 100vh;
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--action-bg);
  text-decoration: none;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--text-1);
  font-family: var(--font-display);
  font-weight: var(--font-weight-regular);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-snug);
}

h1 {
  font-size: var(--font-size-display);
  letter-spacing: var(--tracking-tight);
}

h2 {
  font-size: var(--font-size-xl);
}

h3 {
  font-size: var(--font-size-lg);
}

button,
input,
textarea,
select {
  font-family: inherit;
}

input,
textarea,
select {
  font-size: var(--font-size-base);
}

/* Focus ring: ink outline carries the ≥3:1 contrast; the marigold halo is the signature.
   `.nepally-focus` is Mantine's theme.focusClassName (mantine-theme.ts). */
:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible,
.nepally-focus:focus-visible {
  outline: 2px solid var(--action-bg);
  outline-offset: 2px;
  box-shadow: var(--focus-ring-halo);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Delete the retired files and confirm nothing imports them**

```bash
git rm apps/web/src/styles/design-system.css apps/web/src/styles/design-system-next.css
grep -rn "design-system" apps/web/src --include=*.ts --include=*.tsx --include=*.css
```

Expected: `grep` prints only comments (e.g. in `PublicProfile.module.css`), with no `@import` and no `import`.

- [ ] **Step 6: Verify CSS compiles and tests pass**

Run: `npm run build --workspace=apps/web && npm run test --workspace=apps/web`
Expected: the build succeeds and all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/styles
git commit -m "feat(web): bridge legacy design-system variables to H1 tokens" -m "Retires design-system.css and the unused design-system-next.css; globals.css adopts the token focus ring and reduced-motion rules." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.4: Mantine theme mirrors the tokens

**Files:**

- Create: `apps/web/src/styles/mantine-theme.test.ts`
- Rewrite: `apps/web/src/styles/mantine-theme.ts`
- Create: `apps/web/src/styles/mantine-components.module.css`
- Modify: `apps/web/src/pages/_app.page.tsx`, `apps/web/src/pages/_app.test.tsx`, `apps/web/src/test-utils.tsx`
- Modify: `apps/web/src/components/events/RsvpButton.tsx:30`, `apps/web/src/components/Layout.tsx:290`, `apps/web/src/components/LocationSwitcher.tsx:101,121,134-135`, `apps/web/src/components/LocationSwitcher.module.css`
- Modify: `apps/web/package.json` (`@mantine/modals`)

**Interfaces:**

- Consumes: `readTokenMap`, `resolveToken`, and the global class `nepally-focus`.
- Produces:
  - `nepallyTheme: MantineThemeOverride`: colours `ink` and `marigold`; `primaryColor: 'ink'`, `primaryShade: 8`; `defaultRadius: 'md'`
  - `ink: MantineColorsTuple` and `marigold: MantineColorsTuple`
  - `variantColorResolver: VariantColorsResolver`
  - `cssVariablesResolver: CSSVariablesResolver`
- Theme colour references for later code: `c="ink.8"` for action-coloured text; `color="marigold"` only where the accent is intended.

- [ ] **Step 1: Install modals**

Run: `npm install @mantine/modals@^8.3.18 --workspace=apps/web`

- [ ] **Step 2: Write the failing test `apps/web/src/styles/mantine-theme.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { converter } from 'culori';
import { DEFAULT_THEME, defaultVariantColorsResolver, mergeMantineTheme } from '@mantine/core';
import { cssVariablesResolver, nepallyTheme, variantColorResolver } from './mantine-theme';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();
const theme = mergeMantineTheme(DEFAULT_THEME, nepallyTheme);
const toRgb = converter('rgb');
const token = (name: string) => resolveToken(tokens, name);

function byteChannels(color: string): number[] {
  const rgb = toRgb(color);
  if (!rgb) throw new Error(`Unparseable colour ${color}`);
  return [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));
}

function expectSameColour(actual: string, tokenName: string): void {
  const a = byteChannels(actual);
  const e = byteChannels(token(tokenName));
  const close = a.every((channel, index) => Math.abs(channel - e[index]) <= 2);
  expect(close, `${actual} should match ${tokenName} ≈ rgb(${e.join(', ')})`).toBe(true);
}

describe('nepallyTheme mirrors tokens.css', () => {
  it('ink shades 7, 8, 9 match --ink-700, --ink-800, --ink-900', () => {
    expectSameColour(theme.colors.ink[7], '--ink-700');
    expectSameColour(theme.colors.ink[8], '--ink-800');
    expectSameColour(theme.colors.ink[9], '--ink-900');
  });

  it('marigold shades 1, 5, 7 match --marigold-100, --marigold-500, --marigold-700', () => {
    expectSameColour(theme.colors.marigold[1], '--marigold-100');
    expectSameColour(theme.colors.marigold[5], '--marigold-500');
    expectSameColour(theme.colors.marigold[7], '--marigold-700');
  });

  it('uses ink shade 8 (--action-bg) as the primary colour', () => {
    expect(theme.primaryColor).toBe('ink');
    expect(theme.primaryShade).toBe(8);
  });

  it('font sizes mirror --font-size-*', () => {
    expect(theme.fontSizes).toMatchObject({
      xs: token('--font-size-xs'),
      sm: token('--font-size-sm'),
      md: token('--font-size-base'),
      lg: token('--font-size-lg'),
      xl: token('--font-size-xl'),
    });
  });

  it('spacing mirrors the 4pt scale', () => {
    expect(theme.spacing).toMatchObject({
      xs: token('--space-2'),
      sm: token('--space-3'),
      md: token('--space-4'),
      lg: token('--space-5'),
      xl: token('--space-6'),
    });
  });

  it('radius mirrors the purpose-named radii', () => {
    expect(theme.radius).toMatchObject({
      xs: token('--radius-chip'),
      sm: token('--radius-tag'),
      md: token('--radius-control'),
      lg: token('--radius-card'),
      xl: token('--radius-overlay'),
    });
  });

  it('sets defaultRadius explicitly (Mantine 9 changes the default)', () => {
    expect(theme.defaultRadius).toBe('md');
  });

  it('breakpoints match the CSS breakpoints', () => {
    expect(theme.breakpoints).toMatchObject({ sm: '48em', md: '62em', lg: '75em' });
  });

  it('uses the global focus ring class', () => {
    expect(theme.focusClassName).toBe('nepally-focus');
  });

  it('adds the marigold underline only to primary filled buttons', () => {
    const buttonClassNames = nepallyTheme.components?.Button?.classNames as (
      t: unknown,
      props: { variant?: string; color?: string }
    ) => Record<string, string>;
    expect(Object.keys(buttonClassNames(theme, {}))).toEqual(['root']);
    expect(buttonClassNames(theme, { variant: 'outline' })).toEqual({});
    expect(buttonClassNames(theme, { color: 'red' })).toEqual({});
  });
});

describe('variantColorResolver', () => {
  it('renders light variants as solid tints with dark text (stable across Mantine 8 → 9)', () => {
    expect(variantColorResolver({ color: 'ink', theme, variant: 'light' })).toEqual({
      background: theme.colors.ink[1],
      hover: theme.colors.ink[2],
      color: theme.colors.ink[9],
      border: 'transparent',
    });
  });

  it('treats Mantine default palettes the same way', () => {
    expect(variantColorResolver({ color: 'red', theme, variant: 'light' })).toEqual({
      background: theme.colors.red[1],
      hover: theme.colors.red[2],
      color: theme.colors.red[9],
      border: 'transparent',
    });
  });

  it('defers to Mantine for every other variant', () => {
    const input = { color: 'ink', theme, variant: 'filled' };
    expect(variantColorResolver(input)).toEqual(defaultVariantColorsResolver(input));
  });
});

describe('cssVariablesResolver', () => {
  it('points Mantine surface, text and border variables at semantic tokens', () => {
    expect(cssVariablesResolver(theme).light).toMatchObject({
      '--mantine-color-body': 'var(--surface-0)',
      '--mantine-color-text': 'var(--text-1)',
      '--mantine-color-dimmed': 'var(--text-2)',
      '--mantine-color-placeholder': 'var(--text-3)',
      '--mantine-color-default': 'var(--surface-1)',
      '--mantine-color-default-hover': 'var(--surface-2)',
      '--mantine-color-default-color': 'var(--text-1)',
      '--mantine-color-default-border': 'var(--border-solid)',
      '--mantine-color-anchor': 'var(--action-bg)',
      '--mantine-color-error': 'var(--danger)',
    });
  });
});
```

Run: `npm run test --workspace=apps/web -- src/styles/mantine-theme.test.ts`
Expected: FAIL (`cssVariablesResolver` / `nepallyTheme` / `variantColorResolver` are not exported).

- [ ] **Step 3: Create `apps/web/src/styles/mantine-components.module.css`**

```css
/*
 * Theme-level class hooks for Mantine components, wired in mantine-theme.ts.
 * Semantic tokens only.
 */
.primaryButton:not(:disabled, [data-disabled]) {
  box-shadow: inset 0 -3px 0 var(--accent);
}

.badge {
  text-transform: none;
  letter-spacing: 0;
  font-weight: var(--font-weight-semibold);
}

.floating {
  border: 1px solid var(--border-subtle);
}

.modal {
  box-shadow: var(--shadow-modal);
}

.input {
  border-color: var(--border-solid);
}

.input:focus,
.input:focus-within {
  border-color: var(--action-bg);
}
```

- [ ] **Step 4: Rewrite `apps/web/src/styles/mantine-theme.ts`**

```ts
import {
  createTheme,
  defaultVariantColorsResolver,
  parseThemeColor,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';
import classes from './mantine-components.module.css';

/**
 * Mantine theme for the H1 "Ink & Marigold" design system.
 *
 * tokens.css is the source of truth. Mantine needs literal colours to derive
 * variants, so the tuples repeat token values and mantine-theme.test.ts fails
 * if they drift. Component overrides are plain objects (not Component.extend)
 * so tests that mock individual Mantine components can still load the theme.
 */

/** Shade 7 = --ink-700 (hover), 8 = --ink-800 (--action-bg), 9 = --ink-900 (--text-1). */
export const ink: MantineColorsTuple = [
  '#EEF1F7',
  '#DCE2EE',
  '#B8C3DA',
  '#91A1C3',
  '#6C7FA9',
  '#4F6290',
  '#384A77',
  '#1E305B',
  '#132246',
  '#0F141D',
];

/** Shade 1 = --marigold-100 (tint), 5 = --marigold-500 (accent), 7 = --marigold-700 (accent ink). */
export const marigold: MantineColorsTuple = [
  '#FEF7EA',
  '#FBE9C6',
  '#F8D597',
  '#F4C06A',
  '#F0AE4A',
  '#ED9E2F',
  '#A96A12',
  '#6E4108',
  '#55320A',
  '#3B2307',
];

/**
 * `light` variants as solid tint + dark text. Mantine 9 switches light variants
 * from translucent to solid on its own terms; defining them here keeps visuals
 * identical across the upgrade.
 */
export const variantColorResolver: VariantColorsResolver = (input) => {
  const defaults = defaultVariantColorsResolver(input);
  if (input.variant !== 'light') return defaults;

  const parsed = parseThemeColor({ color: input.color ?? input.theme.primaryColor, theme: input.theme });
  if (!parsed.isThemeColor) return defaults;

  const shades = input.theme.colors[parsed.color];
  return { background: shades[1], hover: shades[2], color: shades[9], border: 'transparent' };
};

/** Sits Mantine components on the token surfaces instead of Mantine's own greys. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': 'var(--surface-0)',
    '--mantine-color-text': 'var(--text-1)',
    '--mantine-color-dimmed': 'var(--text-2)',
    '--mantine-color-placeholder': 'var(--text-3)',
    '--mantine-color-default': 'var(--surface-1)',
    '--mantine-color-default-hover': 'var(--surface-2)',
    '--mantine-color-default-color': 'var(--text-1)',
    '--mantine-color-default-border': 'var(--border-solid)',
    '--mantine-color-anchor': 'var(--action-bg)',
    '--mantine-color-error': 'var(--danger)',
  },
  dark: {},
});

export const nepallyTheme = createTheme({
  colors: { ink, marigold },
  primaryColor: 'ink',
  primaryShade: 8,
  white: '#FFFFFF',
  black: '#0F141D',
  variantColorResolver,

  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: '400',
    sizes: {
      h1: { fontSize: 'var(--font-size-display)', lineHeight: '1.15' },
      h2: { fontSize: 'var(--font-size-xl)', lineHeight: '1.15' },
      h3: { fontSize: 'var(--font-size-lg)', lineHeight: '1.35' },
      h4: { fontSize: 'var(--font-size-base)', lineHeight: '1.35' },
    },
  },
  fontSizes: {
    xs: '0.8125rem',
    sm: '0.9375rem',
    md: '1.0625rem',
    lg: '1.1875rem',
    xl: '1.5rem',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'md',
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  shadows: {
    xs: 'none',
    sm: '0 0 0 1px var(--border-subtle)',
    md: 'var(--shadow-float)',
    lg: 'var(--shadow-float)',
    xl: 'var(--shadow-modal)',
  },
  cursorType: 'pointer',
  focusClassName: 'nepally-focus',

  components: {
    Button: {
      classNames: (_theme: unknown, props: { variant?: string; color?: string }) =>
        (props.variant ?? 'filled') === 'filled' && (props.color ?? 'ink') === 'ink'
          ? { root: classes.primaryButton }
          : {},
    },
    Badge: { classNames: { root: classes.badge } },
    Tabs: { vars: () => ({ root: { '--tabs-color': 'var(--accent)' } }) },
    Menu: { defaultProps: { shadow: 'md', radius: 'lg' }, classNames: { dropdown: classes.floating } },
    Popover: { defaultProps: { shadow: 'md', radius: 'lg' }, classNames: { dropdown: classes.floating } },
    Combobox: { classNames: { dropdown: classes.floating } },
    Modal: { defaultProps: { radius: 'xl' }, classNames: { content: classes.modal } },
    Input: { classNames: { input: classes.input } },
    Notification: { defaultProps: { radius: 'lg' } },
  },
});
```

- [ ] **Step 5: Run the theme test**

Run: `npm run test --workspace=apps/web -- src/styles/mantine-theme.test.ts`
Expected: all PASS. If a shade assertion fails, set that tuple entry to the hex of the `≈ rgb(…)` value in the failure message and re-run.

- [ ] **Step 6: Wire the theme into `_app.page.tsx`**

Replace the file with:

```tsx
import type { AppProps } from 'next/app';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import Layout from '../components/Layout';
import FontVariables from '../components/layout/FontVariables';
import { cssVariablesResolver, nepallyTheme } from '../styles/mantine-theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={nepallyTheme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <FontVariables />
      <ModalsProvider>
        <Notifications position="top-right" />
        <AuthProvider>
          <LocationProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </LocationProvider>
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
```

- [ ] **Step 7: Update `_app.test.tsx` mocks**

Replace the `vi.mock('../styles/mantine-theme', …)` block with:

```tsx
vi.mock('../styles/mantine-theme', () => ({
  nepallyTheme: {},
  cssVariablesResolver: () => ({ variables: {}, light: {}, dark: {} }),
}));

vi.mock('@mantine/modals', () => ({
  ModalsProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'modals-provider' }, children),
}));
```

and in the first test add `expect(screen.getByTestId('modals-provider')).toBeDefined();` after the `location-provider` assertion.

- [ ] **Step 8: Render tests with the real theme — replace `apps/web/src/test-utils.tsx`**

```tsx
import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { cssVariablesResolver, nepallyTheme } from './styles/mantine-theme';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={nepallyTheme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}

function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

export { renderWithMantine as render };
export { screen, fireEvent, waitFor, act } from '@testing-library/react';
```

- [ ] **Step 9: Remove the retired `nusaPrimary` colour references**

- `RsvpButton.tsx`: delete the line `      color="nusaPrimary.6"` (ink is the primary colour).
- `Layout.tsx`: replace `<Loader color="nusaPrimary.6" />` with `<Loader />`.
- `LocationSwitcher.tsx`:
  - `<IconCheck size={16} stroke={3} color="var(--mantine-color-nusaPrimary-6)" />` → `<IconCheck size={16} stroke={3} className={styles.accentIcon} />`
  - `<Text size="sm" fw={600} c="nusaPrimary.6">` → `<Text size="sm" fw={600} c="ink.8">`
  - `leftSection={<IconPlus size={16} color="var(--mantine-color-nusaPrimary-6)" />}` → `leftSection={<IconPlus size={16} className={styles.accentIcon} />}`
  - `c="nusaPrimary.6"` → `c="ink.8"`
- `LocationSwitcher.module.css`: append

```css
.accentIcon {
  color: var(--action-bg);
}
```

Run: `grep -rn "nusaPrimary\|nusaSecondary\|nusaRed" apps/web/src`
Expected: no output.

- [ ] **Step 10: Run the whole web suite and type-check**

Run: `npm run test --workspace=apps/web && npm run type-check --workspace=apps/web`
Expected: all PASS; no type errors.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/styles/mantine-theme.ts apps/web/src/styles/mantine-theme.test.ts apps/web/src/styles/mantine-components.module.css apps/web/src/pages/_app.page.tsx apps/web/src/pages/_app.test.tsx apps/web/src/test-utils.tsx apps/web/src/components/events/RsvpButton.tsx apps/web/src/components/Layout.tsx apps/web/src/components/LocationSwitcher.tsx apps/web/src/components/LocationSwitcher.module.css apps/web/package.json package-lock.json
git commit -m "feat(web): rebuild Mantine theme from design tokens" -m "Adds ink/marigold palettes, solid light variants, token-backed CSS variables, the global focus class and ModalsProvider; tests now render with the real theme." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.5: Guards against regressions

**Files:**

- Create: `scripts/guard-css-tokens.js`
- Create: `scripts/guard-css-tokens.test.js`
- Create (generated): `scripts/guard-css-tokens.allowlist.json`
- Modify: `package.json` (root scripts)
- Modify: `apps/web/eslint.config.mjs`
- Create: `apps/web/eslint/raw-element-allowlist.mjs`
- Create: `apps/web/eslint/write-raw-element-allowlist.mjs`

**Interfaces:**

- Produces `findViolations(content: string): Array<{ line: number; kind: 'colour literal' | 'legacy token'; text: string }>` (CommonJS export).
- Produces commands that every area PR runs:
  - `node scripts/guard-css-tokens.js --write-allowlist`
  - `node apps/web/eslint/write-raw-element-allowlist.mjs`

- [ ] **Step 1: Write the failing guard test `scripts/guard-css-tokens.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { findViolations } = require('./guard-css-tokens');

test('flags hex, rgb, hsl and oklch colour literals', () => {
  const css = [
    '.a { color: #fff; }',
    '.b { background: rgba(0, 0, 0, 0.5); }',
    '.c { color: hsl(10 20% 30%); }',
    '.d { color: oklch(50% 0.1 20); }',
  ].join('\n');
  assert.deepEqual(
    findViolations(css).map((violation) => [violation.line, violation.kind]),
    [
      [1, 'colour literal'],
      [2, 'colour literal'],
      [3, 'colour literal'],
      [4, 'colour literal'],
    ]
  );
});

test('flags legacy design-system variables', () => {
  const css = '.a { color: var(--color-primary); padding: var(--space-s); border-radius: var(--radius-md); }';
  assert.deepEqual(
    findViolations(css).map((violation) => violation.kind),
    ['legacy token', 'legacy token', 'legacy token']
  );
});

test('allows semantic tokens, Mantine variables and color-mix over tokens', () => {
  const css = [
    '.a {',
    '  color: var(--text-1);',
    '  padding: var(--space-4);',
    '  border-radius: var(--radius-card);',
    '  font-size: var(--font-size-sm);',
    '  background: color-mix(in oklch, var(--action-bg) 12%, transparent);',
    '  outline-color: var(--mantine-color-ink-8);',
    '}',
  ].join('\n');
  assert.deepEqual(findViolations(css), []);
});

test('ignores colours inside comments but keeps line numbers', () => {
  const css = '/* was\n #fff */\n.a { color: #000; }';
  assert.deepEqual(findViolations(css).map((violation) => violation.line), [3]);
});
```

Add root scripts in `package.json`:

```json
    "guards:test": "node --test \"scripts/*.test.js\"",
```

and change `"test"` to:

```json
    "test": "npm run docs:test && npm run guards:test && npm run test --workspaces --if-present",
```

Run: `npm run guards:test`
Expected: FAIL, `Cannot find module './guard-css-tokens'`.

- [ ] **Step 2: Create `scripts/guard-css-tokens.js`**

```js
#!/usr/bin/env node
/**
 * Guard: web CSS Modules must use semantic design tokens.
 *
 * Fails on colour literals (hex, rgb/rgba, hsl/hsla, oklch/oklab) and on the
 * legacy design-system variables that legacy-aliases.css keeps alive during the
 * web UI overhaul. Files in guard-css-tokens.allowlist.json are skipped; an
 * allowlisted file that is now clean also fails, so the list only shrinks.
 * Spec: docs/specs/2026-09-14-web-ui-overhaul-design.md §4.1.
 *
 *   node scripts/guard-css-tokens.js                    check
 *   node scripts/guard-css-tokens.js --write-allowlist  record current offenders
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps/web/src');
const ALLOWLIST_PATH = path.join(__dirname, 'guard-css-tokens.allowlist.json');
const IGNORED_DIRS = new Set(['node_modules', '.next', 'coverage']);

const RULES = [
  {
    kind: 'colour literal',
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/g,
  },
  {
    kind: 'legacy token',
    pattern:
      /var\(\s*--(?:color-|gradient-|glass-|ghost-border|font-family\b|font-size-(?:h1|h2|h3|body|small|caption)\b|font-weight-extrabold|line-height-|space-(?:xxs|xs|s|m|l|xl|xxl)\b|radius-(?:sm|md|lg|xl)\b|shadow-(?:sm|md|lg|glass)\b|max-width|content-width|sidebar-width|nav-height|input-height|button-height|surface-(?:rail|topbar|nav)-|dropdown-|transition-)/g,
  },
];

function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function findViolations(content) {
  const violations = [];
  stripComments(content)
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const rule of RULES) {
        for (const match of line.matchAll(rule.pattern)) {
          violations.push({ line: index + 1, kind: rule.kind, text: match[0] });
        }
      }
    });
  return violations;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(fullPath, files);
    } else if (entry.name.endsWith('.module.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function main() {
  const offenders = new Map();
  for (const filePath of walk(TARGET_DIR)) {
    const violations = findViolations(fs.readFileSync(filePath, 'utf8'));
    if (violations.length > 0) offenders.set(toRepoPath(filePath), violations);
  }

  if (process.argv.includes('--write-allowlist')) {
    fs.writeFileSync(ALLOWLIST_PATH, `${JSON.stringify([...offenders.keys()].sort(), null, 2)}\n`);
    console.log(`Wrote ${offenders.size} files to ${toRepoPath(ALLOWLIST_PATH)}.`);
    return;
  }

  const allowlist = new Set(
    fs.existsSync(ALLOWLIST_PATH) ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')) : []
  );
  let failed = false;

  for (const [filePath, violations] of offenders) {
    if (allowlist.has(filePath)) continue;
    failed = true;
    for (const violation of violations) {
      console.error(`${filePath}:${violation.line} ${violation.kind}: ${violation.text}`);
    }
  }

  for (const filePath of allowlist) {
    if (!offenders.has(filePath)) {
      failed = true;
      console.error(`${filePath} is clean — remove it from scripts/guard-css-tokens.allowlist.json`);
    }
  }

  if (failed) {
    console.error('\nUse semantic tokens from apps/web/src/styles/tokens.css (docs/architecture/web-ui-system.md).\n');
    process.exit(1);
  }

  console.log('CSS Modules use semantic tokens (outside the allowlist).');
}

module.exports = { findViolations };

if (require.main === module) {
  main();
}
```

Run: `npm run guards:test`
Expected: 4 PASS.

- [ ] **Step 3: Record today's offenders and wire the guard into `lint:guards`**

Run: `node scripts/guard-css-tokens.js --write-allowlist`
Expected: `Wrote N files to scripts/guard-css-tokens.allowlist.json.` N is roughly 30. `mantine-components.module.css` must **not** be in the list.

In root `package.json`, change `"lint:guards"` to:

```json
    "lint:guards": "node scripts/guard-no-catch-any.js && node scripts/guard-css-tokens.js",
```

Run: `npm run lint:guards`
Expected: both guards print success.

- [ ] **Step 4: Add the raw-element rule to `apps/web/eslint.config.mjs`**

Add the import at the top:

```js
import { RAW_ELEMENT_ALLOWLIST } from './eslint/raw-element-allowlist.mjs';
```

and append this object to the `config` array (after the react-hooks block):

```js
  // Web UI overhaul (spec §4.2): interactive primitives come from Mantine.
  // components/ui/ may wrap raw elements. Files not migrated yet are listed in
  // eslint/raw-element-allowlist.mjs, which shrinks with each area PR.
  {
    files: ['src/**/*.tsx'],
    ignores: [
      'src/components/ui/**',
      'src/**/*.test.tsx',
      ...(process.env.RAW_ELEMENT_ALLOWLIST_DISABLED === '1' ? [] : RAW_ELEMENT_ALLOWLIST),
    ],
    rules: {
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'button', message: 'Use Mantine Button, UnstyledButton or ActionIcon (or a components/ui primitive).' },
            { element: 'input', message: 'Use a Mantine input component.' },
            { element: 'select', message: 'Use Mantine Select or NativeSelect.' },
            { element: 'textarea', message: 'Use Mantine Textarea.' },
          ],
        },
      ],
    },
  },
```

Create `apps/web/eslint/raw-element-allowlist.mjs` (empty until generated):

```js
export const RAW_ELEMENT_ALLOWLIST = [];
```

- [ ] **Step 5: Create the generator `apps/web/eslint/write-raw-element-allowlist.mjs`**

```js
#!/usr/bin/env node
/**
 * Regenerates eslint/raw-element-allowlist.mjs from the files that currently
 * break react/forbid-elements. Run from the repo root:
 *   node apps/web/eslint/write-raw-element-allowlist.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Read by eslint.config.mjs when ESLint loads it inside lintFiles().
process.env.RAW_ELEMENT_ALLOWLIST_DISABLED = '1';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: webRoot });
const results = await eslint.lintFiles(['src/**/*.tsx']);

const files = results
  .filter((result) => result.messages.some((message) => message.ruleId === 'react/forbid-elements'))
  .map((result) => path.relative(webRoot, result.filePath).replace(/\\/g, '/'))
  .sort();

const body = `/**
 * Files that still render raw <button>/<input>/<select>/<textarea>.
 * Each web UI overhaul area PR removes its files; delete the list when empty.
 * Regenerate: node apps/web/eslint/write-raw-element-allowlist.mjs
 */
export const RAW_ELEMENT_ALLOWLIST = ${JSON.stringify(files, null, 2)};
`;

writeFileSync(path.join(webRoot, 'eslint', 'raw-element-allowlist.mjs'), body);
console.log(`Allowlisted ${files.length} files.`);
```

Run: `node apps/web/eslint/write-raw-element-allowlist.mjs`
Expected: `Allowlisted N files.` N is roughly 20, and `src/pages/users/[id].page.tsx` and `src/pages/events/create.page.tsx` are in the list.

- [ ] **Step 6: Lint**

Run: `npm run lint --workspace=apps/web`
Expected: no `react/forbid-elements` errors; only pre-existing warnings.

- [ ] **Step 7: Commit**

```bash
git add scripts/guard-css-tokens.js scripts/guard-css-tokens.test.js scripts/guard-css-tokens.allowlist.json package.json apps/web/eslint.config.mjs apps/web/eslint
git commit -m "chore: guard CSS Modules to tokens and interactive elements to Mantine" -m "Both guards start with allowlists of today's offenders that shrink with each web UI overhaul area PR." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.6: Evergreen docs

**Files:**

- Create: `docs/architecture/web-ui-system.md`
- Modify: `docs/INDEX.md` (Architecture section)
- Modify: `TECH-VERSIONS.md` (Web App + Testing Stack tables)
- Modify: `CLAUDE.md` (Styling Rules)

**Interfaces:** none.

- [ ] **Step 1: Create `docs/architecture/web-ui-system.md`**

````markdown
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

## Guards

| Guard | Command | Allowlist |
|---|---|---|
| Colour literals and legacy variables in CSS Modules | `npm run lint:guards` | `scripts/guard-css-tokens.allowlist.json` (regenerate: `node scripts/guard-css-tokens.js --write-allowlist`) |
| Raw `<button>/<input>/<select>/<textarea>` outside `components/ui/` | `npm run lint` | `apps/web/eslint/raw-element-allowlist.mjs` (regenerate: `node apps/web/eslint/write-raw-element-allowlist.mjs`) |

Allowlists only shrink. The CSS guard fails if an allowlisted file is already clean.

## Testing

- `tokens.contrast.test.ts` checks WCAG AA for every text/background token pair.
- `mantine-theme.test.ts` checks the theme against the tokens.
- `legacy-aliases.test.ts` checks every old variable still resolves.
- Visual regression and axe scans are described in [../guides/setup-and-testing.md](../guides/setup-and-testing.md) under "Visual regression and accessibility tests (web)".

## Mantine 9 readiness

Already handled:
- `defaultRadius` is explicit.
- `light` variants are self-defined.
- `useLocalStorage` always gets a `defaultValue`.
- No removed APIs are used.

The upgrade itself waits for React 19.2+ (Expo 56+). When it happens, also set `<Notifications pauseResetOnHover="notification" />`.
````

- [ ] **Step 2: Index it**

In `docs/INDEX.md` → **Architecture**, add after the `migration-workflow.md` line:

```markdown
- [architecture/web-ui-system.md](architecture/web-ui-system.md) — web design tokens, fonts, Mantine theme, guards and allowlists
```

- [ ] **Step 3: TECH-VERSIONS rows**

In `TECH-VERSIONS.md` → **Web App (`apps/web`)** table, add:

```markdown
| **@mantine/core / hooks / form / notifications / modals** | 8.3.x | All on one version; 9.x waits for React 19.2 (see Deferred Upgrades) |
```

In **Testing Stack**, add:

```markdown
| **culori** | ^4.0.2 | apps/web | Colour maths for token contrast and theme-sync tests |
```

- [ ] **Step 4: CLAUDE.md styling rule**

In `CLAUDE.md` → **Styling Rules**, replace:

```markdown
- **Web**: NEVER inline `style={{}}`. Always CSS Modules (`.module.css`), reference via `className={styles.x}`
```

with:

```markdown
- **Web**: NEVER inline `style={{}}`. Always CSS Modules (`.module.css`), reference via `className={styles.x}`. Use semantic tokens from `apps/web/src/styles/tokens.css` — no colour literals (see [docs/architecture/web-ui-system.md](./docs/architecture/web-ui-system.md))
```

- [ ] **Step 5: Docs check and commit**

Run: `npm run docs:check`
Expected: `docs:check - clean, 0 violations.`

```bash
git add docs/architecture/web-ui-system.md docs/INDEX.md TECH-VERSIONS.md CLAUDE.md
git commit -m "docs: add web UI system guide for tokens, theme and guards" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 1.7: Re-baseline and verify PR 1

**Files:**

- Update (generated): `apps/web/e2e/visual/__screenshots__/**`, `apps/web/e2e/visual/a11y-baseline.json`

**Interfaces:** none.

- [ ] **Step 1: Update screenshots**

Run: `npm run test:visual:docker --workspace=apps/web -- --update`

- [ ] **Step 2: Review every changed PNG**

Run: `git status --short apps/web/e2e/visual/__screenshots__`

Open each changed image and check:

- paper background, Switzer body text and Gambarino headings
- ink buttons
- no clipped text, overlapping elements or invisible (same-colour) text

A broken layout means a CSS Module relies on a removed visual (glass, gradient text, etc.). Fix it by moving that module's declarations to semantic tokens, remove the file from `scripts/guard-css-tokens.allowlist.json`, and repeat Step 1.

- [ ] **Step 3: Check accessibility did not regress**

Run: `npm run test:visual:docker --workspace=apps/web`
Expected: all PASS. A new axe violation (usually `color-contrast`) comes from a hard-coded colour now sitting on a token background. Fix that declaration with tokens and remove the file from the CSS allowlist. Do not edit the baseline to hide it.

Then record fixed violations:

Run: `npm run test:visual:docker --workspace=apps/web -- --write-a11y-baseline && git diff apps/web/e2e/visual/a11y-baseline.json`
Expected: the diff only removes lines, or is empty.

- [ ] **Step 4: Full verification**

```bash
npm run lint
npm run lint:guards
npm run type-check
npm run test
npm run test:e2e:web
npm run test:visual:web
npm run docs:check
```

Expected: all succeed.

- [ ] **Step 5: Commit, push and open the PR**

```bash
git add apps/web/e2e/visual
git commit -m "test(web): re-baseline screenshots for the H1 design tokens" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Push `feat/web-design-tokens` and open its PR. Update the tracker row for PR 1.

---

# PR 2 — App shell + primitives

**Branch:** `feat/web-app-shell`, created from `master` after PR 1 merges.

**Outcome:**

- The UI building blocks (`components/ui/`) exist, each with tests.
- `Layout.tsx` is a thin composition over Mantine `AppShell`.
- Phones get bottom tabs, and tablets get an icon-only rail.
- The unread-count logic lives in hooks.
- Profile gains "Settings & more", and the broken links are fixed.

| Path | Change | Responsibility |
|---|---|---|
| `packages/shared/src/utils/user.ts` (+ test) | Modify | `getInitials`, `getAvatarToneIndex` |
| `apps/web/src/styles/tokens.css`, `tokens.contrast.test.ts` | Modify | Avatar tone tokens + contrast pairs |
| `apps/web/src/components/Avatar.tsx` (+ css, test) | Modify | Shared initials, token tones, verified mark |
| `apps/web/src/components/ui/{EmptyState,LoadingState,ErrorState,PageHeader}.tsx` (+ css, tests) | Create | State and header primitives |
| `apps/web/src/components/ui/{TagChip,ScopeBadge,TrustBadge}.tsx` (+ css, tests) | Create | Chips and badges |
| `apps/web/src/components/ui/ActionMenu.tsx` (+ test) | Create | Accessible overflow/context menu |
| `apps/web/src/components/ui/dialogs.tsx` (+ test) | Create | `useConfirm`, `usePrompt` |
| `apps/web/src/components/ui/index.ts` | Create | Barrel export |
| `apps/web/src/hooks/useInfiniteScroll.ts` (+ test) | Create | Sentinel-based pagination |
| `apps/web/src/hooks/useUnreadMessageCount.ts`, `useNotificationsFeed.ts` (+ tests) | Create | Realtime + polling logic from Layout |
| `apps/web/src/components/notifications/NotificationItem.tsx` (+ css, test) | Create | One notification row |
| `apps/web/src/components/layout/*` | Create | `navItems`, `NotificationBell`, `AccountMenu`, `TopBar`, `SideRail`, `BottomTabBar`, `TopicPills`, `PublicShell` |
| `apps/web/src/components/Layout.tsx` (+ css, test) | Rewrite | Composition only |
| `apps/web/src/pages/feed.page.tsx` | Modify | Phone-only location switcher + topic pills |
| `apps/web/src/pages/profile.page.tsx` (+ test) | Modify | "Settings & more" list |
| `apps/web/src/pages/users/[id].page.tsx` | Modify | Fix `/posts/new`, `/marketplace/new` |
| `apps/web/playwright.config.ts`, `e2e/tests/phone/navigation.spec.ts` | Modify / Create | `phone` project + bottom-tab e2e |

### Task 2.1: Shared initials and avatar tones

**Files:**

- Modify: `packages/shared/src/utils/user.ts`, `packages/shared/src/utils/user.test.ts`
- Modify: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/tokens.contrast.test.ts`
- Rewrite: `apps/web/src/components/Avatar.tsx`, `apps/web/src/components/Avatar.module.css`, `apps/web/src/components/Avatar.test.tsx`

**Interfaces:**

- Produces (shared):
  - `getInitials(fullName: string): string`. Returns `'?'` for an empty name, the first two letters for a single word, otherwise the first and last initials, all uppercased.
  - `getAvatarToneIndex(name: string, toneCount: number): number`. Returns an index in `[0, toneCount)`, the same for the same name.
- Produces (web): `Avatar` props `{ name: string; photoUrl?: string | null; trustLevel?: number; size?: 'small' | 'medium' | 'large' | 'xlarge'; showVerifiedMark?: boolean }` (default export, unchanged call sites). `getColorFromName` is removed.

- [ ] **Step 1: Create the PR branch**

```bash
git switch master && git pull --ff-only && git switch -c feat/web-app-shell
```

- [ ] **Step 2: Write failing shared tests** — append to `packages/shared/src/utils/user.test.ts`:

```ts
import { getAvatarToneIndex, getInitials } from './user';

describe('getInitials', () => {
  it('uses first and last initials for multi-word names', () => {
    expect(getInitials('Ram Bahadur Thapa')).toBe('RT');
  });

  it('uses the first two letters of a single word', () => {
    expect(getInitials('bishal')).toBe('BI');
  });

  it('collapses extra whitespace', () => {
    expect(getInitials('  Sita   Gurung ')).toBe('SG');
  });

  it('returns ? for an empty name', () => {
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getAvatarToneIndex', () => {
  it('is stable for the same name', () => {
    expect(getAvatarToneIndex('Alice', 8)).toBe(getAvatarToneIndex('Alice', 8));
  });

  it('stays within range', () => {
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', '']) {
      const index = getAvatarToneIndex(name, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });

  it('spreads different names across tones', () => {
    const tones = new Set(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].map((name) => getAvatarToneIndex(name, 8)));
    expect(tones.size).toBeGreaterThan(1);
  });
});
```

If the file's existing imports already include `describe/expect/it` from `vitest`, merge the import lines rather than duplicating.

Run: `npm run test --workspace=packages/shared -- src/utils/user.test.ts`
Expected: FAIL, `getInitials is not a function` (or "not exported").

- [ ] **Step 3: Implement** — append to `packages/shared/src/utils/user.ts`:

```ts
/**
 * Initials for avatar placeholders: first + last word initials, or the first two
 * letters of a single word. "?" when the name is blank.
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic tone for an avatar placeholder, in [0, toneCount). */
export function getAvatarToneIndex(name: string, toneCount: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % toneCount;
}
```

Run: `npm run test --workspace=packages/shared -- src/utils/user.test.ts`
Expected: PASS.

- [ ] **Step 4: Add avatar tone tokens** — in `tokens.css`, insert before the `/* ── Typography` block:

```css
  /* ── Avatar placeholder tones (bg / fg pairs) ─────────── */
  --avatar-tone-1-bg: oklch(92% 0.04 25);
  --avatar-tone-1-fg: oklch(38% 0.07 25);
  --avatar-tone-2-bg: oklch(92% 0.04 70);
  --avatar-tone-2-fg: oklch(38% 0.07 70);
  --avatar-tone-3-bg: oklch(92% 0.04 110);
  --avatar-tone-3-fg: oklch(38% 0.07 110);
  --avatar-tone-4-bg: oklch(92% 0.04 155);
  --avatar-tone-4-fg: oklch(38% 0.07 155);
  --avatar-tone-5-bg: oklch(92% 0.04 200);
  --avatar-tone-5-fg: oklch(38% 0.07 200);
  --avatar-tone-6-bg: oklch(92% 0.04 235);
  --avatar-tone-6-fg: oklch(38% 0.07 235);
  --avatar-tone-7-bg: oklch(92% 0.04 265);
  --avatar-tone-7-fg: oklch(38% 0.07 265);
  --avatar-tone-8-bg: oklch(92% 0.04 320);
  --avatar-tone-8-fg: oklch(38% 0.07 320);

```

In `tokens.contrast.test.ts`, add after the `TEXT_PAIRS` array:

```ts
for (let tone = 1; tone <= 8; tone++) {
  TEXT_PAIRS.push([`--avatar-tone-${tone}-fg`, `--avatar-tone-${tone}-bg`]);
}
```

Run: `npm run test --workspace=apps/web -- src/styles/tokens.contrast.test.ts`
Expected: 26 PASS.

- [ ] **Step 5: Rewrite `apps/web/src/components/Avatar.test.tsx`**

```tsx
import React from 'react';
import { render, screen } from '../test-utils';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders the photo with an accessible name', () => {
    render(<Avatar name="Ram Sharma" photoUrl="https://example.com/photo.jpg" />);
    const img = screen.getByAltText("Ram Sharma's avatar");
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('falls back to shared initials without a photo', () => {
    render(<Avatar name="Ram Bahadur Thapa" photoUrl={null} />);
    expect(screen.getByText('RT')).toBeDefined();
  });

  it('shows the verified mark for Level 1+ when requested', () => {
    render(<Avatar name="Sita Gurung" trustLevel={1} showVerifiedMark />);
    expect(screen.getByTestId('verified-mark')).toBeDefined();
  });

  it('hides the verified mark for Level 0 or when not requested', () => {
    const { rerender } = render(<Avatar name="Sita Gurung" trustLevel={0} showVerifiedMark />);
    expect(screen.queryByTestId('verified-mark')).toBeNull();
    rerender(<Avatar name="Sita Gurung" trustLevel={2} />);
    expect(screen.queryByTestId('verified-mark')).toBeNull();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/Avatar.test.tsx`
Expected: FAIL on the verified-mark tests.

- [ ] **Step 6: Rewrite `apps/web/src/components/Avatar.tsx`**

```tsx
import React from 'react';
import { Avatar as MantineAvatar } from '@mantine/core';
import { getAvatarToneIndex, getInitials } from '@nepally/shared';
import styles from './Avatar.module.css';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
  /** Overlay a small check for Level 1+ members. */
  showVerifiedMark?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 32,
  medium: 40,
  large: 64,
  xlarge: 80,
};

const TONE_CLASSES = [
  styles.tone1,
  styles.tone2,
  styles.tone3,
  styles.tone4,
  styles.tone5,
  styles.tone6,
  styles.tone7,
  styles.tone8,
];

export default function Avatar({
  name,
  photoUrl,
  trustLevel = 0,
  size = 'medium',
  showVerifiedMark = false,
}: AvatarProps) {
  const toneClass = TONE_CLASSES[getAvatarToneIndex(name, TONE_CLASSES.length)];

  return (
    <span className={styles.root}>
      <MantineAvatar
        src={photoUrl ?? null}
        alt={`${name}'s avatar`}
        size={SIZE_MAP[size]}
        radius="xl"
        classNames={{ placeholder: toneClass }}
      >
        {getInitials(name)}
      </MantineAvatar>
      {showVerifiedMark && trustLevel >= 1 ? (
        <span className={styles.verifiedMark} data-testid="verified-mark" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 7: Rewrite `apps/web/src/components/Avatar.module.css`**

```css
.root {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.verifiedMark {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--trust-verified-fg);
  color: var(--action-fg);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 0 0 2px var(--surface-1);
}

.tone1 { background: var(--avatar-tone-1-bg); color: var(--avatar-tone-1-fg); }
.tone2 { background: var(--avatar-tone-2-bg); color: var(--avatar-tone-2-fg); }
.tone3 { background: var(--avatar-tone-3-bg); color: var(--avatar-tone-3-fg); }
.tone4 { background: var(--avatar-tone-4-bg); color: var(--avatar-tone-4-fg); }
.tone5 { background: var(--avatar-tone-5-bg); color: var(--avatar-tone-5-fg); }
.tone6 { background: var(--avatar-tone-6-bg); color: var(--avatar-tone-6-fg); }
.tone7 { background: var(--avatar-tone-7-bg); color: var(--avatar-tone-7-fg); }
.tone8 { background: var(--avatar-tone-8-bg); color: var(--avatar-tone-8-fg); }
```

- [ ] **Step 8: Run tests, update the CSS allowlist, commit**

Run: `npm run test --workspace=apps/web -- src/components/Avatar.test.tsx && npm run test --workspace=packages/shared && node scripts/guard-css-tokens.js`
Expected: tests PASS. If the guard reports `Avatar.module.css is clean — remove it…`, delete that line from `scripts/guard-css-tokens.allowlist.json` and re-run until it passes.

```bash
git add packages/shared/src/utils/user.ts packages/shared/src/utils/user.test.ts apps/web/src/styles/tokens.css apps/web/src/styles/tokens.contrast.test.ts apps/web/src/components/Avatar.tsx apps/web/src/components/Avatar.module.css apps/web/src/components/Avatar.test.tsx scripts/guard-css-tokens.allowlist.json
git commit -m "feat: share avatar initials and give placeholders token tones" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.2: State and header primitives

**Files:**

- Create: `apps/web/src/components/ui/EmptyState.tsx`, `EmptyState.module.css`, `EmptyState.test.tsx`
- Create: `apps/web/src/components/ui/LoadingState.tsx`, `LoadingState.module.css`, `LoadingState.test.tsx`
- Create: `apps/web/src/components/ui/ErrorState.tsx`, `ErrorState.test.tsx`
- Create: `apps/web/src/components/ui/PageHeader.tsx`, `PageHeader.module.css`, `PageHeader.test.tsx`
- Create: `apps/web/src/components/ui/index.ts`

**Interfaces:**

- Produces:
  - `EmptyState({ icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode })`
  - `LoadingState({ variant?: 'list' | 'card' | 'detail'; count?: number; label?: string })`
  - `ErrorState({ title?: string; message: string; onRetry?: () => void; retryLabel?: string })`
  - `PageHeader({ title: string; description?: ReactNode; backHref?: string; backLabel?: string; actions?: ReactNode })`
- All are named exports, re-exported from `components/ui/index.ts`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/components/ui/EmptyState.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('announces title, description and action', () => {
    render(
      <EmptyState
        title="No posts yet"
        description="Be the first to share something."
        action={<button type="button">Create post</button>}
      />
    );
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('No posts yet');
    expect(screen.getByText('Be the first to share something.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create post' })).toBeDefined();
  });

  it('renders the title as a heading', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeDefined();
  });
});
```

`apps/web/src/components/ui/LoadingState.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('is a busy status with an accessible label', () => {
    render(<LoadingState label="Loading posts" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading posts')).toBeDefined();
  });

  it('renders one placeholder per requested row', () => {
    render(<LoadingState variant="list" count={4} />);
    expect(screen.getAllByTestId('loading-row')).toHaveLength(4);
  });

  it('renders a single block for detail pages', () => {
    render(<LoadingState variant="detail" count={4} />);
    expect(screen.getAllByTestId('loading-row')).toHaveLength(1);
  });
});
```

`apps/web/src/components/ui/ErrorState.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the message in an alert', () => {
    render(<ErrorState message="Couldn't load posts" />);
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load posts");
  });

  it('offers retry when a handler is given', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no retry button without a handler', () => {
    render(<ErrorState message="Failed" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

`apps/web/src/components/ui/PageHeader.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

describe('PageHeader', () => {
  it('renders the title as the page heading', () => {
    render(<PageHeader title="Events" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeDefined();
  });

  it('renders a back link when backHref is set', () => {
    render(<PageHeader title="Create event" backHref="/events" backLabel="Back to events" />);
    expect(screen.getByRole('link', { name: 'Back to events' }).getAttribute('href')).toBe('/events');
  });

  it('renders actions', () => {
    render(<PageHeader title="Marketplace" actions={<button type="button">Create listing</button>} />);
    expect(screen.getByRole('button', { name: 'Create listing' })).toBeDefined();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/ui`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `EmptyState`**

`apps/web/src/components/ui/EmptyState.tsx`:

```tsx
import React, { type ReactNode } from 'react';
import { Text, Title } from '@mantine/core';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.root} role="status">
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Title order={3} className={styles.title}>
        {title}
      </Title>
      {description ? <Text className={styles.description}>{description}</Text> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
```

`apps/web/src/components/ui/EmptyState.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-5);
  text-align: center;
  border: 1px dashed var(--border-solid);
  border-radius: var(--radius-card);
  background: var(--surface-1);
}

.icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--accent-tint);
  color: var(--accent-ink);
}

.title {
  font-size: var(--font-size-xl);
}

.description {
  max-width: 42ch;
  color: var(--text-2);
}

.action {
  margin-top: var(--space-3);
}
```

- [ ] **Step 3: Implement `LoadingState`**

`apps/web/src/components/ui/LoadingState.tsx`:

```tsx
import React from 'react';
import { Skeleton, VisuallyHidden } from '@mantine/core';
import styles from './LoadingState.module.css';

export type LoadingStateVariant = 'list' | 'card' | 'detail';

export interface LoadingStateProps {
  variant?: LoadingStateVariant;
  count?: number;
  label?: string;
}

export function LoadingState({ variant = 'list', count = 3, label = 'Loading…' }: LoadingStateProps) {
  const rows = variant === 'detail' ? 1 : count;

  return (
    <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>{label}</VisuallyHidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles[variant]} data-testid="loading-row">
          {variant === 'card' ? <Skeleton height={160} radius="lg" /> : null}
          {variant === 'list' ? <Skeleton circle height={40} /> : null}
          <div className={styles.lines}>
            <Skeleton height={variant === 'detail' ? 28 : 14} width={variant === 'detail' ? '60%' : '70%'} />
            <Skeleton height={12} width="45%" />
            {variant === 'detail' ? (
              <>
                <Skeleton height={14} />
                <Skeleton height={14} />
                <Skeleton height={14} width="80%" />
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
```

`apps/web/src/components/ui/LoadingState.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.list,
.card,
.detail {
  padding: var(--card-padding);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-1);
}

.list {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.card,
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}
```

- [ ] **Step 4: Implement `ErrorState`**

`apps/web/src/components/ui/ErrorState.tsx`:

```tsx
import React from 'react';
import { Alert, Button, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <Alert variant="light" color="red" radius="lg" title={title} icon={<IconAlertTriangle size={20} aria-hidden="true" />}>
      <Text size="sm">{message}</Text>
      {onRetry ? (
        <Button variant="default" size="xs" mt="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Alert>
  );
}
```

- [ ] **Step 5: Implement `PageHeader`**

`apps/web/src/components/ui/PageHeader.tsx`:

```tsx
import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { Anchor, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backHref, backLabel = 'Back', actions }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      {backHref ? (
        <Anchor component={Link} href={backHref} className={styles.back}>
          <IconArrowLeft size={16} aria-hidden="true" />
          {backLabel}
        </Anchor>
      ) : null}
      <div className={styles.row}>
        <div className={styles.text}>
          <Title order={1} className={styles.title}>
            {title}
          </Title>
          {description ? <Text className={styles.description}>{description}</Text> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}
```

`apps/web/src/components/ui/PageHeader.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-start;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-2);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
}

.text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.title {
  font-size: var(--font-size-display);
}

.description {
  color: var(--text-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

- [ ] **Step 6: Create the barrel `apps/web/src/components/ui/index.ts`**

```ts
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { LoadingState, type LoadingStateProps, type LoadingStateVariant } from './LoadingState';
export { PageHeader, type PageHeaderProps } from './PageHeader';
```

- [ ] **Step 7: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/ui && npm run lint:guards`
Expected: all PASS.

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add empty, loading, error and page header primitives" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.3: Chips and badges

**Files:**

- Create: `apps/web/src/components/ui/TagChip.tsx`, `TagChip.module.css`, `TagChip.test.tsx`
- Create: `apps/web/src/components/ui/ScopeBadge.tsx`, `ScopeBadge.module.css`, `ScopeBadge.test.tsx`
- Create: `apps/web/src/components/ui/TrustBadge.tsx`, `TrustBadge.module.css`, `TrustBadge.test.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

- Produces:
  - `TagChip({ slug: string; label: string })`. Uses the dot style; slug `emergency` gets the emergency styling.
  - `ScopeBadge({ isGlobal: boolean; metroLabel?: string })`. Renders "Global", "Local · {metroLabel}" or "Local".
  - `TrustBadge({ level: number })`. Renders "New Member", "Verified" or "Contributor" via shared `getTrustLabel`.

- [ ] **Step 1: Write the failing tests**

`TagChip.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { TagChip } from './TagChip';

describe('TagChip', () => {
  it('shows the tag label', () => {
    render(<TagChip slug="housing" label="Housing" />);
    expect(screen.getByText('Housing')).toBeDefined();
  });

  it('marks emergency tags for assistive tech', () => {
    render(<TagChip slug="emergency" label="Emergency" />);
    expect(screen.getByText('Emergency').closest('[data-emergency="true"]')).not.toBeNull();
  });

  it('accepts unknown slugs', () => {
    render(<TagChip slug="politics-local" label="Local politics" />);
    expect(screen.getByText('Local politics')).toBeDefined();
  });
});
```

`ScopeBadge.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { ScopeBadge } from './ScopeBadge';

describe('ScopeBadge', () => {
  it('labels global posts', () => {
    render(<ScopeBadge isGlobal />);
    expect(screen.getByText('Global')).toBeDefined();
  });

  it('labels local posts with the metro', () => {
    render(<ScopeBadge isGlobal={false} metroLabel="NYC" />);
    expect(screen.getByText('Local · NYC')).toBeDefined();
  });

  it('labels local posts without a metro', () => {
    render(<ScopeBadge isGlobal={false} />);
    expect(screen.getByText('Local')).toBeDefined();
  });
});
```

`TrustBadge.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { TrustBadge } from './TrustBadge';

describe('TrustBadge', () => {
  it.each([
    [0, 'New Member'],
    [1, 'Verified'],
    [2, 'Contributor'],
  ])('level %i reads "%s"', (level, label) => {
    render(<TrustBadge level={level} />);
    expect(screen.getByText(label)).toBeDefined();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/ui/TagChip.test.tsx src/components/ui/ScopeBadge.test.tsx src/components/ui/TrustBadge.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `TagChip`**

`TagChip.tsx`:

```tsx
import React from 'react';
import { Badge } from '@mantine/core';
import styles from './TagChip.module.css';

const DOT_CLASS: Record<string, string> = {
  housing: styles.housing,
  jobs: styles.jobs,
  help: styles.help,
  question: styles.question,
  politics: styles.politics,
  discussion: styles.discussion,
  emergency: styles.emergencyDot,
};

export interface TagChipProps {
  slug: string;
  label: string;
}

export function TagChip({ slug, label }: TagChipProps) {
  const isEmergency = slug === 'emergency';
  return (
    <Badge
      variant="default"
      radius="sm"
      size="lg"
      data-emergency={isEmergency ? 'true' : undefined}
      className={isEmergency ? styles.emergency : styles.root}
      leftSection={<span className={`${styles.dot} ${DOT_CLASS[slug] ?? styles.other}`} aria-hidden="true" />}
    >
      {label}
    </Badge>
  );
}
```

`TagChip.module.css`:

```css
.root,
.emergency {
  height: auto;
  padding: 3px var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.root {
  border-color: var(--border-solid);
  background: var(--surface-1);
  color: var(--text-2);
}

.emergency {
  border-color: var(--emergency-border);
  background: var(--emergency-bg);
  color: var(--emergency-fg);
  font-weight: var(--font-weight-semibold);
}

.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
}

.housing { background: var(--tag-housing); }
.jobs { background: var(--tag-jobs); }
.help { background: var(--tag-help); }
.question { background: var(--tag-question); }
.politics { background: var(--tag-politics); }
.discussion { background: var(--tag-discussion); }
.emergencyDot { background: var(--tag-emergency); }
.other { background: var(--text-3); }
```

- [ ] **Step 3: Implement `ScopeBadge`**

`ScopeBadge.tsx`:

```tsx
import React from 'react';
import { Badge } from '@mantine/core';
import styles from './ScopeBadge.module.css';

export interface ScopeBadgeProps {
  isGlobal: boolean;
  metroLabel?: string;
}

export function ScopeBadge({ isGlobal, metroLabel }: ScopeBadgeProps) {
  const label = isGlobal ? 'Global' : metroLabel ? `Local · ${metroLabel}` : 'Local';
  return (
    <Badge variant="default" radius="sm" size="lg" className={isGlobal ? styles.global : styles.local}>
      {label}
    </Badge>
  );
}
```

`ScopeBadge.module.css`:

```css
.local,
.global {
  height: auto;
  padding: 3px var(--space-2);
  border: none;
  font-size: var(--font-size-xs);
}

.local {
  background: var(--accent-tint);
  color: var(--accent-ink);
}

.global {
  background: var(--surface-2);
  color: var(--text-2);
}
```

- [ ] **Step 4: Implement `TrustBadge`**

`TrustBadge.tsx`:

```tsx
import React from 'react';
import { Badge } from '@mantine/core';
import { IconCircleCheck, IconStarFilled } from '@tabler/icons-react';
import { getTrustLabel } from '@nepally/shared';
import styles from './TrustBadge.module.css';

export interface TrustBadgeProps {
  level: number;
}

export function TrustBadge({ level }: TrustBadgeProps) {
  const tierClass = level >= 2 ? styles.contributor : level === 1 ? styles.verified : styles.new;
  const icon =
    level >= 2 ? <IconStarFilled size={12} aria-hidden="true" /> : level === 1 ? <IconCircleCheck size={12} aria-hidden="true" /> : null;

  return (
    <Badge variant="default" radius="xs" size="md" className={`${styles.root} ${tierClass}`} leftSection={icon}>
      {getTrustLabel(level)}
    </Badge>
  );
}
```

`TrustBadge.module.css`:

```css
.root {
  height: auto;
  padding: 2px var(--space-2);
  border: none;
  font-size: var(--font-size-xs);
}

.new {
  background: var(--trust-new-bg);
  color: var(--trust-new-fg);
}

.verified {
  background: var(--trust-verified-bg);
  color: var(--trust-verified-fg);
}

.contributor {
  background: var(--trust-contributor-bg);
  color: var(--trust-contributor-fg);
}
```

- [ ] **Step 5: Export, run, commit**

Append to `components/ui/index.ts`:

```ts
export { ScopeBadge, type ScopeBadgeProps } from './ScopeBadge';
export { TagChip, type TagChipProps } from './TagChip';
export { TrustBadge, type TrustBadgeProps } from './TrustBadge';
```

Run: `npm run test --workspace=apps/web -- src/components/ui && npm run lint:guards`
Expected: all PASS.

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add tag chip, scope and trust badges" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.4: `ActionMenu`

**Files:**

- Create: `apps/web/src/components/ui/ActionMenu.tsx`, `ActionMenu.test.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

- Produces `ActionMenu({ label: string; items: ActionMenuItem[]; target?: ReactElement; position?: MenuProps['position'] })`.
- `ActionMenuItem = { key: string; label: string; icon?: ReactNode; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean }`.
- A custom `target` must be one element that forwards its ref (a Mantine component or `forwardRef`).

- [ ] **Step 1: Write the failing test `ActionMenu.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './ActionMenu';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

describe('ActionMenu', () => {
  const items = [
    { key: 'report', label: 'Report', onClick: vi.fn() },
    { key: 'profile', label: 'View profile', href: '/users/u1' },
    { key: 'delete', label: 'Delete', onClick: vi.fn(), danger: true },
  ];

  it('opens from a labelled trigger and lists menu items', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(3));
  });

  it('runs the item action', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Report' }));
    expect(items[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('renders link items as links', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const link = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(link.getAttribute('href')).toBe('/users/u1');
  });

  it('closes on Escape', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const menu = await screen.findByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/ui/ActionMenu.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `ActionMenu.tsx`**

```tsx
import React, { type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { ActionIcon, Menu, type MenuProps } from '@mantine/core';
import { IconDots } from '@tabler/icons-react';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  /** Accessible name of the default "⋯" trigger. */
  label: string;
  items: ActionMenuItem[];
  /** Custom trigger; must be a single element that forwards its ref. */
  target?: ReactElement;
  position?: MenuProps['position'];
}

export function ActionMenu({ label, items, target, position = 'bottom-end' }: ActionMenuProps) {
  return (
    <Menu position={position} width={220} withinPortal>
      <Menu.Target>
        {target ?? (
          <ActionIcon variant="subtle" color="gray" aria-label={label}>
            <IconDots size={18} aria-hidden="true" />
          </ActionIcon>
        )}
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) =>
          item.href ? (
            <Menu.Item key={item.key} component={Link} href={item.href} leftSection={item.icon} disabled={item.disabled}>
              {item.label}
            </Menu.Item>
          ) : (
            <Menu.Item
              key={item.key}
              onClick={item.onClick}
              leftSection={item.icon}
              color={item.danger ? 'red' : undefined}
              disabled={item.disabled}
            >
              {item.label}
            </Menu.Item>
          )
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 3: Export, run, commit**

Append to `components/ui/index.ts`:

```ts
export { ActionMenu, type ActionMenuItem, type ActionMenuProps } from './ActionMenu';
```

Run: `npm run test --workspace=apps/web -- src/components/ui/ActionMenu.test.tsx`
Expected: 4 PASS.

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add accessible ActionMenu primitive" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.5: Confirm and prompt dialogs

**Files:**

- Create: `apps/web/src/components/ui/dialogs.tsx`, `dialogs.test.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

- Produces:
  - `useConfirm(): (options: ConfirmOptions) => Promise<boolean>`
  - `usePrompt(): (options: PromptOptions) => Promise<string | null>`. Resolves `null` on cancel or close.
- `ConfirmOptions = { title: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }`.
- `PromptOptions = { title: string; label: string; initialValue?: string; confirmLabel?: string; cancelLabel?: string; maxLength?: number; multiline?: boolean; validate?: (value: string) => string | null }`.
- Requires `ModalsProvider`, which `_app` and `test-utils` already provide.
- Area PRs replace `window.confirm`, `window.alert` and `window.prompt` with these.

- [ ] **Step 1: Write the failing test `dialogs.test.tsx`**

```tsx
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { useConfirm, usePrompt } from './dialogs';

function ConfirmHarness() {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({ title: 'Delete post?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
          setResult(String(ok));
        }}
      >
        Open confirm
      </button>
      <output>{result}</output>
    </>
  );
}

function PromptHarness() {
  const prompt = usePrompt();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const value = await prompt({
            title: 'Edit name',
            label: 'Full name',
            initialValue: 'Sita',
            validate: (v) => (v.trim().length < 2 ? 'Name is too short' : null),
          });
          setResult(value ?? 'null');
        }}
      >
        Open prompt
      </button>
      <output>{result}</output>
    </>
  );
}

describe('useConfirm', () => {
  it('resolves true when confirmed', async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByText('This cannot be undone.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('true'));
  });

  it('resolves false when cancelled', async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('false'));
  });
});

describe('usePrompt', () => {
  it('resolves the submitted value', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    const input = await screen.findByLabelText('Full name');
    fireEvent.change(input, { target: { value: 'Sita Gurung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Sita Gurung'));
  });

  it('shows validation errors and keeps the dialog open', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'S' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name is too short')).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('pending');
  });

  it('resolves null when cancelled', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('null'));
  });
});
```

(`<output>` has the implicit ARIA role `status`.)

Run: `npm run test --workspace=apps/web -- src/components/ui/dialogs.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `dialogs.tsx`**

```tsx
import React, { useCallback, useState, type ReactNode } from 'react';
import { Button, Group, Text, TextInput, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  multiline?: boolean;
  /** Return an error message to block submission, or null when valid. */
  validate?: (value: string) => string | null;
}

/** Resolves once; later calls (e.g. onClose after onConfirm) are ignored. */
function once<T>(resolve: (value: T) => void): (value: T) => void {
  let settled = false;
  return (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };
}

/** Promise-based replacement for window.confirm, rendered with @mantine/modals. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const settle = once(resolve);
        modals.openConfirmModal({
          title: options.title,
          children: <Text size="sm">{options.message}</Text>,
          labels: { confirm: options.confirmLabel ?? 'Confirm', cancel: options.cancelLabel ?? 'Cancel' },
          confirmProps: options.danger ? { color: 'red' } : undefined,
          onConfirm: () => settle(true),
          onCancel: () => settle(false),
          onClose: () => settle(false),
        });
      }),
    []
  );
}

interface PromptFormProps {
  options: PromptOptions;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function PromptForm({ options, onSubmit, onCancel }: PromptFormProps) {
  const [value, setValue] = useState(options.initialValue ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(event.currentTarget.value);
    setError(null);
  };

  const fieldProps = {
    label: options.label,
    value,
    onChange: handleChange,
    maxLength: options.maxLength,
    error,
    'data-autofocus': true,
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const message = options.validate?.(value) ?? null;
        if (message) {
          setError(message);
          return;
        }
        onSubmit(value);
      }}
    >
      {options.multiline ? <Textarea autosize minRows={3} {...fieldProps} /> : <TextInput {...fieldProps} />}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onCancel}>
          {options.cancelLabel ?? 'Cancel'}
        </Button>
        <Button type="submit">{options.confirmLabel ?? 'Save'}</Button>
      </Group>
    </form>
  );
}

/** Promise-based replacement for window.prompt; resolves null when dismissed. */
export function usePrompt(): (options: PromptOptions) => Promise<string | null> {
  return useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        const settle = once(resolve);
        const modalId = modals.open({
          title: options.title,
          onClose: () => settle(null),
          children: (
            <PromptForm
              options={options}
              onSubmit={(value) => {
                settle(value);
                modals.close(modalId);
              }}
              onCancel={() => {
                settle(null);
                modals.close(modalId);
              }}
            />
          ),
        });
      }),
    []
  );
}
```

- [ ] **Step 3: Export, run, commit**

Append to `components/ui/index.ts`:

```ts
export { useConfirm, usePrompt, type ConfirmOptions, type PromptOptions } from './dialogs';
```

Run: `npm run test --workspace=apps/web -- src/components/ui/dialogs.test.tsx`
Expected: 5 PASS.

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add promise-based confirm and prompt dialogs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.6: `useInfiniteScroll`

**Files:**

- Create: `apps/web/src/hooks/useInfiniteScroll.ts`, `apps/web/src/hooks/useInfiniteScroll.test.tsx`

**Interfaces:**

- Produces `useInfiniteScroll(options: { hasMore: boolean; loading: boolean; onLoadMore: () => void; rootMargin?: string }): { sentinelRef: React.RefCallback<HTMLDivElement | null> }`.
- Render `<div ref={sentinelRef} />` after the last item. PRs 3b, 4, 7 and 8 replace the three copied IntersectionObserver blocks with it.

- [ ] **Step 1: Write the failing test `useInfiniteScroll.test.tsx`**

```tsx
import React from 'react';
import { render, act } from '../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from './useInfiniteScroll';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let observerCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Harness(props: { hasMore: boolean; loading: boolean; onLoadMore: () => void }) {
  const { sentinelRef } = useInfiniteScroll(props);
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

function intersect() {
  act(() => {
    observerCallback?.([{ isIntersecting: true }]);
  });
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads more when the sentinel becomes visible', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading={false} onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load while a page is loading', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not load when there are no more pages', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore={false} loading={false} onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/hooks/useInfiniteScroll.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `useInfiniteScroll.ts`**

```ts
import { useEffect } from 'react';
import { useIntersection } from '@mantine/hooks';

export interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Start loading before the sentinel is on screen. */
  rootMargin?: string;
}

/** Calls onLoadMore when a sentinel element after the list scrolls into view. */
export function useInfiniteScroll({ hasMore, loading, onLoadMore, rootMargin = '400px' }: UseInfiniteScrollOptions) {
  const { ref, entry } = useIntersection<HTMLDivElement>({ rootMargin });
  const isIntersecting = entry?.isIntersecting ?? false;

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  return { sentinelRef: ref };
}
```

- [ ] **Step 3: Run and commit**

Run: `npm run test --workspace=apps/web -- src/hooks/useInfiniteScroll.test.tsx`
Expected: 3 PASS.

```bash
git add apps/web/src/hooks/useInfiniteScroll.ts apps/web/src/hooks/useInfiniteScroll.test.tsx
git commit -m "feat(web): add useInfiniteScroll hook" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.7: Move unread-count and notification logic into hooks

**Files:**

- Create: `apps/web/src/hooks/useUnreadMessageCount.ts`, `apps/web/src/hooks/useUnreadMessageCount.test.tsx`
- Create: `apps/web/src/hooks/useNotificationsFeed.ts`, `apps/web/src/hooks/useNotificationsFeed.test.tsx`
- Create: `apps/web/src/components/notifications/notificationHref.ts`, `notificationHref.test.ts`

**Interfaces:**

- Produces `useUnreadMessageCount(userId: string | null): number`.
- Produces `useNotificationsFeed(options: { userId: string | null; pollingEnabled: boolean }): NotificationsFeed`, where `NotificationsFeed = { unreadCount: number; items: Notification[]; markRead(n: Notification): Promise<void>; markAllRead(): Promise<void>; remove(n: Notification): Promise<boolean> }`.
- Produces `getNotificationHref(notification: Notification): string`.
- Behaviour is identical to today's `Layout.tsx` (lines 95–285): realtime channels, a 30-second poll, a refresh on tab focus, a bell list of 8, and no bell polling while on `/notifications`.

- [ ] **Step 1: Write the failing hook tests**

`apps/web/src/hooks/useUnreadMessageCount.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTotalUnreadCount: vi.fn(),
  subscriptions: [] as Array<{ filter: { table?: string; event?: string }; callback: (payload: unknown) => void }>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockImplementation(() => {
      const channel = {
        on: vi.fn((_type: unknown, filter: { table?: string; event?: string }, callback: (payload: unknown) => void) => {
          mocks.subscriptions.push({ filter, callback });
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getTotalUnreadCount: mocks.getTotalUnreadCount,
}));

import { useUnreadMessageCount } from './useUnreadMessageCount';

function messageInsert() {
  return mocks.subscriptions.find((sub) => sub.filter.table === 'messages' && sub.filter.event === 'INSERT');
}

describe('useUnreadMessageCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptions.length = 0;
    mocks.getTotalUnreadCount.mockResolvedValue({ count: 2 });
  });

  it('loads the unread count', async () => {
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(2));
  });

  it('refreshes when someone else sends a message', async () => {
    mocks.getTotalUnreadCount.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 4 });
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(1));
    act(() => messageInsert()?.callback({ new: { sender_id: 'user-2' } }));
    await waitFor(() => expect(result.current).toBe(4));
  });

  it('ignores the viewer’s own messages', async () => {
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(2));
    const calls = mocks.getTotalUnreadCount.mock.calls.length;
    act(() => messageInsert()?.callback({ new: { sender_id: 'user-1' } }));
    expect(mocks.getTotalUnreadCount.mock.calls.length).toBe(calls);
  });

  it('refreshes when the tab becomes visible', async () => {
    mocks.getTotalUnreadCount.mockResolvedValueOnce({ count: 0 }).mockResolvedValue({ count: 6 });
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(mocks.getTotalUnreadCount).toHaveBeenCalled());
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(result.current).toBe(6));
  });

  it('returns 0 and does nothing without a user', () => {
    const { result } = renderHook(() => useUnreadMessageCount(null));
    expect(result.current).toBe(0);
    expect(mocks.getTotalUnreadCount).not.toHaveBeenCalled();
  });
});
```

`apps/web/src/hooks/useNotificationsFeed.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscriptions: [] as Array<{ filter: { table?: string; event?: string }; callback: (payload: unknown) => void }>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockImplementation(() => {
      const channel = {
        on: vi.fn((_type: unknown, filter: { table?: string; event?: string }, callback: (payload: unknown) => void) => {
          mocks.subscriptions.push({ filter, callback });
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getNotifications: mocks.getNotifications,
  getUnreadNotificationCount: mocks.getUnreadNotificationCount,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  deleteNotification: mocks.deleteNotification,
}));

import { useNotificationsFeed } from './useNotificationsFeed';

const base: Notification = {
  id: 'n-1',
  user_id: 'user-1',
  type: 'system',
  title: 'Hello',
  body: 'Body',
  data: {},
  read: false,
  sent_at: '2026-09-14T11:00:00Z',
  created_at: '2026-09-14T11:00:00Z',
} as Notification;

describe('useNotificationsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptions.length = 0;
    mocks.getUnreadNotificationCount.mockResolvedValue({ count: 1 });
    mocks.getNotifications.mockResolvedValue({ data: [base] });
    mocks.markNotificationRead.mockResolvedValue({});
    mocks.markAllNotificationsRead.mockResolvedValue({});
    mocks.deleteNotification.mockResolvedValue({});
  });

  it('loads the unread count and the 8 most recent items', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.unreadCount).toBe(1);
    expect(mocks.getNotifications).toHaveBeenCalledWith(expect.anything(), 'user-1', 8, 0);
  });

  it('prepends realtime notifications and bumps the count', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const insert = mocks.subscriptions.find((sub) => sub.filter.table === 'notifications');
    act(() => insert?.callback({ new: { ...base, id: 'n-2', title: 'New' } }));
    expect(result.current.items[0].id).toBe('n-2');
    expect(result.current.unreadCount).toBe(2);
  });

  it('marks one notification read', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.markRead(base));
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(expect.anything(), 'n-1');
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items[0].read).toBe(true);
  });

  it('marks everything read', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.markAllRead());
    expect(result.current.unreadCount).toBe(0);
  });

  it('removes a notification, keeping it when the delete fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mocks.deleteNotification.mockResolvedValueOnce({ error: new Error('RLS blocked') });
    let removed = true;
    await act(async () => {
      removed = await result.current.remove(base);
    });
    expect(removed).toBe(false);
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      removed = await result.current.remove(base);
    });
    expect(removed).toBe(true);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
    errorSpy.mockRestore();
  });

  it('does not poll on tab focus when polling is disabled', async () => {
    renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: false }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
  });
});
```

`apps/web/src/components/notifications/notificationHref.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Notification } from '@nepally/shared';
import { getNotificationHref } from './notificationHref';

const base = {
  id: 'n',
  user_id: 'u',
  type: 'system',
  title: 't',
  body: 'b',
  read: false,
  sent_at: '2026-09-14T00:00:00Z',
  created_at: '2026-09-14T00:00:00Z',
} as const;

const make = (overrides: Partial<Notification>) => ({ ...base, data: {}, ...overrides }) as Notification;

describe('getNotificationHref', () => {
  it('routes message notifications to the thread', () => {
    expect(getNotificationHref(make({ type: 'message', data: { conversation_id: 'conv-1' } }))).toBe('/messages/conv-1');
  });

  it('routes event notifications to the event', () => {
    expect(getNotificationHref(make({ data: { event_id: 'event-1' } }))).toBe('/events/event-1');
  });

  it('falls back to the notifications page for malformed payloads', () => {
    expect(getNotificationHref(make({ type: 'message', data: { conversation_id: 123 } as never }))).toBe('/notifications');
  });
});
```

Run: `npm run test --workspace=apps/web -- src/hooks/useUnreadMessageCount.test.tsx src/hooks/useNotificationsFeed.test.tsx src/components/notifications/notificationHref.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `apps/web/src/hooks/useUnreadMessageCount.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { getTotalUnreadCount } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const POLL_INTERVAL_MS = 30_000;

/**
 * Total unread chat messages for the signed-in user. Realtime keeps it live;
 * the focus refresh and 30s poll keep it correct when realtime events are
 * delayed or missed (reconnects, publication hiccups).
 */
export function useUnreadMessageCount(userId: string | null): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await getTotalUnreadCount(supabase, userId);
    setCount(result.count);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const participantsChannel = supabase
      .channel(`chat-unread:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`chat-messages-unread:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = payload.new as { sender_id?: string };
        if (message.sender_id !== userId) void refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;

    const onVisibilityChange = () => {
      if (!document.hidden) void refresh();
    };
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, refresh]);

  return userId ? count : 0;
}
```

- [ ] **Step 3: Implement `apps/web/src/hooks/useNotificationsFeed.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@nepally/shared';
import type { Notification } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const BELL_LIMIT = 8;
const POLL_INTERVAL_MS = 30_000;

export interface NotificationsFeed {
  unreadCount: number;
  items: Notification[];
  markRead: (notification: Notification) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Resolves false (and keeps the item) when the delete fails. */
  remove: (notification: Notification) => Promise<boolean>;
}

export interface UseNotificationsFeedOptions {
  userId: string | null;
  /** False on /notifications, which loads and subscribes on its own. */
  pollingEnabled: boolean;
}

/** Unread count + recent notifications for the top-bar bell. */
export function useNotificationsFeed({ userId, pollingEnabled }: UseNotificationsFeedOptions): NotificationsFeed {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const [countResult, listResult] = await Promise.all([
      getUnreadNotificationCount(supabase, userId),
      getNotifications(supabase, userId, BELL_LIMIT, 0),
    ]);
    setUnreadCount(countResult.count);
    if (listResult.data) setItems(listResult.data);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId || !pollingEnabled) return;

    const onVisibilityChange = () => {
      if (!document.hidden) void load();
    };
    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, pollingEnabled, load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as Notification;
          setUnreadCount((count) => count + 1);
          setItems((previous) => [notification, ...previous].slice(0, BELL_LIMIT));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (notification: Notification) => {
    if (notification.read) return;
    await markNotificationRead(supabase, notification.id);
    setUnreadCount((count) => Math.max(0, count - 1));
    setItems((previous) => previous.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(supabase, userId);
    setUnreadCount(0);
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  }, [userId]);

  const remove = useCallback(async (notification: Notification) => {
    const result = await deleteNotification(supabase, notification.id);
    if (result.error) {
      console.error('Failed to delete notification:', result.error);
      return false;
    }
    setItems((previous) => previous.filter((item) => item.id !== notification.id));
    if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
    return true;
  }, []);

  return {
    unreadCount: userId ? unreadCount : 0,
    items: userId ? items : [],
    markRead,
    markAllRead,
    remove,
  };
}
```

- [ ] **Step 4: Implement `apps/web/src/components/notifications/notificationHref.ts`**

```ts
import { resolveNotificationRouteTarget } from '@nepally/shared';
import type { Notification } from '@nepally/shared';

/** Where tapping a notification should take the user. */
export function getNotificationHref(notification: Notification): string {
  const target = resolveNotificationRouteTarget(notification);
  if (target.kind === 'post') return `/posts/${target.postId}`;
  if (target.kind === 'event') return `/events/${target.eventId}`;
  if (target.kind === 'message') return `/messages/${target.conversationId}`;
  return '/notifications';
}
```

- [ ] **Step 5: Run and commit**

Run: `npm run test --workspace=apps/web -- src/hooks src/components/notifications`
Expected: all PASS.

```bash
git add apps/web/src/hooks/useUnreadMessageCount.ts apps/web/src/hooks/useUnreadMessageCount.test.tsx apps/web/src/hooks/useNotificationsFeed.ts apps/web/src/hooks/useNotificationsFeed.test.tsx apps/web/src/components/notifications
git commit -m "refactor(web): extract unread and notification feed logic into hooks" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.8: `NotificationItem` and `NotificationBell`

**Files:**

- Create: `apps/web/src/components/notifications/NotificationItem.tsx`, `NotificationItem.module.css`, `NotificationItem.test.tsx`
- Create: `apps/web/src/components/layout/NotificationBell.tsx`, `NotificationBell.module.css`, `NotificationBell.test.tsx`

**Interfaces:**

- Consumes the `Notification` type.
- Produces `NotificationItem({ notification: Notification; onOpen(n): void; onDelete(n): void })`, with two sibling buttons and no nested interactive elements. PR 9 reuses it on `/notifications`.
- Produces `NotificationBell({ unreadCount: number; items: Notification[]; onOpen(n): void; onMarkAllRead(): void; onDelete(n): void })`.
  - Below 48em it renders a link to `/notifications`.
  - Otherwise it renders a Mantine `Popover`.
  - The trigger's accessible name is `"Notifications"` or `"Notifications, N unread"`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/components/notifications/NotificationItem.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';
import { NotificationItem } from './NotificationItem';

const notification = {
  id: 'n-1',
  user_id: 'u',
  type: 'post_response',
  title: 'New comment',
  body: 'Sita replied to your post',
  data: {},
  read: false,
  sent_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
} as Notification;

describe('NotificationItem', () => {
  it('opens the notification from its main button', () => {
    const onOpen = vi.fn();
    render(<NotificationItem notification={notification} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /New comment/ }));
    expect(onOpen).toHaveBeenCalledWith(notification);
  });

  it('deletes from a separate button', () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<NotificationItem notification={notification} onOpen={onOpen} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete notification' }));
    expect(onDelete).toHaveBeenCalledWith(notification);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('announces unread items', () => {
    render(<NotificationItem notification={notification} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Unread')).toBeDefined();
  });
});
```

`apps/web/src/components/layout/NotificationBell.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';
import { NotificationBell } from './NotificationBell';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode; onClick?: () => void }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

const item = {
  id: 'n-1',
  user_id: 'u',
  type: 'system',
  title: 'Event reminder',
  body: 'Teej is tomorrow',
  data: {},
  read: false,
  sent_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
} as Notification;

function renderBell(overrides: Partial<React.ComponentProps<typeof NotificationBell>> = {}) {
  const props = {
    unreadCount: 0,
    items: [] as Notification[],
    onOpen: vi.fn(),
    onMarkAllRead: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<NotificationBell {...props} />);
  return props;
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the trigger with the unread count and shows a badge', () => {
    renderBell({ unreadCount: 3 });
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('caps the badge at 9+', () => {
    renderBell({ unreadCount: 12 });
    expect(screen.getByText('9+')).toBeDefined();
  });

  it('opens an empty dropdown with a link to all notifications', async () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('No notifications yet')).toBeDefined();
    expect(screen.getByRole('link', { name: 'See all notifications →' }).getAttribute('href')).toBe('/notifications');
  });

  it('offers mark all as read when something is unread', async () => {
    const props = renderBell({ unreadCount: 1, items: [item] });
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    expect(props.onMarkAllRead).toHaveBeenCalled();
  });

  it('opens an item and closes the dropdown', async () => {
    const props = renderBell({ unreadCount: 1, items: [item] });
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    fireEvent.click(await screen.findByRole('button', { name: /Event reminder/ }));
    expect(props.onOpen).toHaveBeenCalledWith(item);
    await waitFor(() => expect(screen.queryByText('Teej is tomorrow')).toBeNull());
  });

  it('is a plain link to /notifications on phones', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList
    );
    renderBell({ unreadCount: 2 });
    const link = await screen.findByRole('link', { name: 'Notifications, 2 unread' });
    expect(link.getAttribute('href')).toBe('/notifications');
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/notifications/NotificationItem.test.tsx src/components/layout/NotificationBell.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `NotificationItem`**

`apps/web/src/components/notifications/NotificationItem.tsx`:

```tsx
import React from 'react';
import { CloseButton, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconAlertTriangle, IconMail, IconMessageCircle, IconMessageDots } from '@tabler/icons-react';
import { formatRelativeTime } from '@nepally/shared';
import type { Notification } from '@nepally/shared';
import styles from './NotificationItem.module.css';

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'message':
      return <IconMessageCircle size={18} />;
    case 'post_response':
      return <IconMessageDots size={18} />;
    case 'emergency_alert':
      return <IconAlertTriangle size={18} />;
    default:
      return <IconMail size={18} />;
  }
}

export interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

export function NotificationItem({ notification, onOpen, onDelete }: NotificationItemProps) {
  const classNames = [
    styles.root,
    notification.read ? '' : styles.unread,
    notification.type === 'emergency_alert' ? styles.emergency : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <UnstyledButton className={styles.open} onClick={() => onOpen(notification)}>
        <span className={styles.icon} aria-hidden="true">
          <NotificationIcon type={notification.type} />
        </span>
        <span className={styles.content}>
          <span className={styles.title}>{notification.title}</span>
          <span className={styles.body}>{notification.body}</span>
          <span className={styles.time}>{formatRelativeTime(new Date(notification.sent_at))}</span>
        </span>
        {notification.read ? null : (
          <span className={styles.unreadDot}>
            <VisuallyHidden>Unread</VisuallyHidden>
          </span>
        )}
      </UnstyledButton>
      <CloseButton
        size="sm"
        className={styles.delete}
        aria-label="Delete notification"
        onClick={() => onDelete(notification)}
      />
    </div>
  );
}
```

`apps/web/src/components/notifications/NotificationItem.module.css`:

```css
.root {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  padding-right: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

.unread {
  background: var(--surface-2);
}

.emergency .icon {
  background: var(--emergency-bg);
  color: var(--emergency-fg);
}

.open {
  display: flex;
  flex: 1;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  text-align: left;
}

.open:hover {
  background: var(--surface-2);
}

.icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--surface-sunken);
  color: var(--text-2);
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-1);
}

.body {
  overflow: hidden;
  font-size: var(--font-size-sm);
  color: var(--text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: var(--font-size-xs);
  color: var(--text-3);
}

.unreadDot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--accent);
}

.delete {
  margin-top: var(--space-3);
}
```

- [ ] **Step 3: Implement `NotificationBell`**

`apps/web/src/components/layout/NotificationBell.tsx`:

```tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { ActionIcon, Anchor, Button, Indicator, Popover, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBell } from '@tabler/icons-react';
import type { Notification } from '@nepally/shared';
import { NotificationItem } from '../notifications/NotificationItem';
import styles from './NotificationBell.module.css';

export interface NotificationBellProps {
  unreadCount: number;
  items: Notification[];
  onOpen: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onDelete: (notification: Notification) => void;
}

/** Phones (below 48em) navigate to /notifications instead of opening a popover. */
const PHONE_QUERY = '(max-width: 47.99em)';

export function NotificationBell({ unreadCount, items, onOpen, onMarkAllRead, onDelete }: NotificationBellProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [opened, setOpened] = useState(false);
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';
  const badge = unreadCount > 9 ? '9+' : unreadCount;

  if (isPhone) {
    return (
      <Indicator label={badge} size={18} disabled={unreadCount === 0} color="red" offset={4}>
        <ActionIcon component={Link} href="/notifications" variant="subtle" color="gray" size="lg" aria-label={label}>
          <IconBell size={22} aria-hidden="true" />
        </ActionIcon>
      </Indicator>
    );
  }

  return (
    <Indicator label={badge} size={18} disabled={unreadCount === 0} color="red" offset={4}>
      <Popover opened={opened} onChange={setOpened} position="bottom-end" width={360} withinPortal>
        <Popover.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={opened}
            onClick={() => setOpened((current) => !current)}
          >
            <IconBell size={22} aria-hidden="true" />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p={0} aria-label="Notifications">
          <div className={styles.header}>
            <Text fw={600}>Notifications</Text>
            {unreadCount > 0 ? (
              <Button variant="subtle" size="compact-sm" onClick={onMarkAllRead}>
                Mark all as read
              </Button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <Text className={styles.empty}>No notifications yet</Text>
          ) : (
            <ul className={styles.list}>
              {items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onOpen={(selected) => {
                      setOpened(false);
                      onOpen(selected);
                    }}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className={styles.footer}>
            <Anchor component={Link} href="/notifications" onClick={() => setOpened(false)}>
              See all notifications →
            </Anchor>
          </div>
        </Popover.Dropdown>
      </Popover>
    </Indicator>
  );
}
```

`apps/web/src/components/layout/NotificationBell.module.css`:

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.list {
  max-height: 420px;
  overflow-y: auto;
  list-style: none;
}

.empty {
  padding: var(--space-6) var(--space-4);
  text-align: center;
  color: var(--text-2);
}

.footer {
  padding: var(--space-3) var(--space-4);
  text-align: center;
  font-size: var(--font-size-sm);
}
```

- [ ] **Step 4: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/notifications src/components/layout/NotificationBell.test.tsx`
Expected: all PASS.

```bash
git add apps/web/src/components/notifications apps/web/src/components/layout/NotificationBell.tsx apps/web/src/components/layout/NotificationBell.module.css apps/web/src/components/layout/NotificationBell.test.tsx
git commit -m "feat(web): add NotificationItem and popover NotificationBell" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.9: `AccountMenu` and `TopBar`

**Files:**

- Create: `apps/web/src/components/layout/AccountMenu.tsx`, `AccountMenu.module.css`
- Create: `apps/web/src/components/layout/TopBar.tsx`, `TopBar.module.css`, `TopBar.test.tsx`

**Interfaces:**

- Consumes: `NotificationBell` (2.8), `NotificationsFeed` (2.7), `LocationSwitcher`, `Avatar`.
- Produces `AccountMenu({ user: User; onSignOut(): void })`. The trigger is named "Open account menu"; items are View Profile, Manage Locations and Sign Out.
- Produces `TopBar({ user: User; unreadMessages: number; notifications: NotificationsFeed; onOpenNotification(n): void; onSignOut(): void; search?: ReactNode })`.
  - The `search` slot is filled by PR 3b.
  - The Messages link name follows the Task 0.2 contract.

- [ ] **Step 1: Write the failing test `TopBar.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import type { NotificationsFeed } from '../../hooks/useNotificationsFeed';
import { TopBar } from './TopBar';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));
vi.mock('../LocationSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'location-switcher' }),
}));

const user = { id: 'u1', full_name: 'Test User', email: 'test@example.com', trust_level: 1, profile_photo: null } as unknown as User;

const feed: NotificationsFeed = {
  unreadCount: 0,
  items: [],
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  remove: vi.fn(),
};

function renderTopBar(overrides: Partial<React.ComponentProps<typeof TopBar>> = {}) {
  const props = {
    user,
    unreadMessages: 0,
    notifications: feed,
    onOpenNotification: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
  render(<TopBar {...props} />);
  return props;
}

describe('TopBar', () => {
  it('links the brand home and shows the location switcher', () => {
    renderTopBar();
    expect(screen.getByRole('link', { name: 'Nepally' }).getAttribute('href')).toBe('/');
    expect(screen.getByTestId('location-switcher')).toBeDefined();
  });

  it('names the Messages link with the unread count', () => {
    renderTopBar({ unreadMessages: 5 });
    expect(screen.getByRole('link', { name: 'Messages, 5 unread' }).getAttribute('href')).toBe('/messages');
    expect(screen.getByText('5')).toBeDefined();
  });

  it('caps the messages badge at 99+', () => {
    renderTopBar({ unreadMessages: 100 });
    expect(screen.getByText('99+')).toBeDefined();
  });

  it('renders the search slot', () => {
    renderTopBar({ search: <input aria-label="Search Nepally" /> });
    expect(screen.getByRole('textbox', { name: 'Search Nepally' })).toBeDefined();
  });

  it('signs out from the account menu', async () => {
    const props = renderTopBar();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    });
    expect(await screen.findByRole('menuitem', { name: 'View Profile' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Manage Locations' })).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    });
    await waitFor(() => expect(props.onSignOut).toHaveBeenCalled());
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/layout/TopBar.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `AccountMenu`**

`apps/web/src/components/layout/AccountMenu.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { Menu, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLogout, IconMapPin, IconUser } from '@tabler/icons-react';
import type { User } from '@nepally/shared';
import Avatar from '../Avatar';
import styles from './AccountMenu.module.css';

export interface AccountMenuProps {
  user: User;
  onSignOut: () => void;
}

export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  return (
    <Menu position="bottom-end" width={260} offset={10}>
      <Menu.Target>
        <UnstyledButton className={styles.trigger} aria-label="Open account menu">
          <Avatar name={user.full_name || '?'} photoUrl={user.profile_photo} trustLevel={user.trust_level} size="small" />
          <IconChevronDown size={14} stroke={2.5} aria-hidden="true" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <div className={styles.identity}>
          <Text size="sm" fw={600} truncate>
            {user.full_name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
        </div>
        <Menu.Divider />
        <Menu.Item component={Link} href="/profile" leftSection={<IconUser size={16} aria-hidden="true" />}>
          View Profile
        </Menu.Item>
        <Menu.Item component={Link} href="/profile/locations" leftSection={<IconMapPin size={16} aria-hidden="true" />}>
          Manage Locations
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" onClick={onSignOut} leftSection={<IconLogout size={16} aria-hidden="true" />}>
          Sign Out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

`apps/web/src/components/layout/AccountMenu.module.css`:

```css
.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-1) 2px 2px;
  border-radius: var(--radius-full);
  color: var(--text-2);
}

.trigger:hover {
  background: var(--surface-2);
}

.identity {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3);
}
```

- [ ] **Step 3: Implement `TopBar`**

`apps/web/src/components/layout/TopBar.tsx`:

```tsx
import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ActionIcon, Indicator } from '@mantine/core';
import { IconMessageCircle } from '@tabler/icons-react';
import type { Notification, User } from '@nepally/shared';
import type { NotificationsFeed } from '../../hooks/useNotificationsFeed';
import LocationSwitcher from '../LocationSwitcher';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import styles from './TopBar.module.css';

export interface TopBarProps {
  user: User;
  unreadMessages: number;
  notifications: NotificationsFeed;
  onOpenNotification: (notification: Notification) => void;
  onSignOut: () => void;
  /** Search entry point (SearchCombobox on wide screens, a search link on phones). */
  search?: ReactNode;
}

export function TopBar({ user, unreadMessages, notifications, onOpenNotification, onSignOut, search }: TopBarProps) {
  const messagesLabel = unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages';

  return (
    <div className={styles.root}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandDot} aria-hidden="true" />
        Nepally
      </Link>

      <div className={styles.location}>
        <LocationSwitcher />
      </div>

      <div className={styles.search}>{search}</div>

      <div className={styles.actions}>
        <NotificationBell
          unreadCount={notifications.unreadCount}
          items={notifications.items}
          onOpen={onOpenNotification}
          onMarkAllRead={() => {
            void notifications.markAllRead();
          }}
          onDelete={(notification) => {
            void notifications.remove(notification);
          }}
        />
        <Indicator label={unreadMessages > 99 ? '99+' : unreadMessages} size={18} disabled={unreadMessages === 0} color="red" offset={4}>
          <ActionIcon component={Link} href="/messages" variant="subtle" color="gray" size="lg" aria-label={messagesLabel}>
            <IconMessageCircle size={22} aria-hidden="true" />
          </ActionIcon>
        </Indicator>
        <div className={styles.account}>
          <AccountMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </div>
  );
}
```

`apps/web/src/components/layout/TopBar.module.css`:

```css
.root {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 100%;
  padding: 0 var(--space-4);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 1.375rem;
  color: var(--action-bg);
  white-space: nowrap;
}

.brandDot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.location {
  display: none;
}

.search {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.account {
  display: none;
}

@media (min-width: $mantine-breakpoint-sm) {
  .location,
  .account {
    display: block;
  }

  .search {
    justify-content: flex-start;
    max-width: 440px;
  }
}
```

- [ ] **Step 4: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/layout/TopBar.test.tsx`
Expected: 5 PASS.

```bash
git add apps/web/src/components/layout/AccountMenu.tsx apps/web/src/components/layout/AccountMenu.module.css apps/web/src/components/layout/TopBar.tsx apps/web/src/components/layout/TopBar.module.css apps/web/src/components/layout/TopBar.test.tsx
git commit -m "feat(web): add TopBar and AccountMenu shell components" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.10: Navigation model, side rail, bottom tabs, topic pills

**Files:**

- Create: `apps/web/src/components/layout/navItems.ts`, `navItems.test.ts`
- Create: `apps/web/src/components/layout/SideRail.tsx`, `SideRail.module.css`, `SideRail.test.tsx`
- Create: `apps/web/src/components/layout/BottomTabBar.tsx`, `BottomTabBar.module.css`, `BottomTabBar.test.tsx`
- Create: `apps/web/src/components/layout/TopicPills.tsx`, `TopicPills.module.css`
- Modify: `apps/web/src/pages/feed.page.tsx`, `apps/web/src/styles/Feed.module.css`

**Interfaces:**

- Produces (`navItems.ts`):
  - `TASK_ROUTES: string[]` and `isTaskRoute(pathname: string): boolean`
  - `isSectionActive(pathname: string, href: string): boolean`
  - `getTopicLinks(): Array<{ slug: string; label: string; href: string }>`
  - `getCommunityLinks(user): NavLinkItem[]`
  - `getCreateLink(user): { label: string; href: string }`
  - `getTabLinks(user): NavLinkItem[]`
  - `getSettingsLinks(user): Array<{ label: string; href: string }>`
  - `FOOTER_LINKS: Array<{ label: string; href: string }>`
  - Here `NavLinkItem = { key: string; label: string; href: string; icon: NavIcon }`.
- Produces `SideRail({ user })` (`nav[aria-label="Primary"]`), `BottomTabBar({ user })` (`nav[aria-label="Tabs"]`) and `TopicPills()` (`nav[aria-label="Topics"]`).
- Active items carry `aria-current="page"`.

- [ ] **Step 1: Write the failing tests**

`navItems.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getCommunityLinks,
  getCreateLink,
  getSettingsLinks,
  getTabLinks,
  getTopicLinks,
  isSectionActive,
  isTaskRoute,
} from './navItems';

describe('navItems', () => {
  it('treats composers and message threads as task routes', () => {
    expect(isTaskRoute('/posts/create')).toBe(true);
    expect(isTaskRoute('/messages/[id]')).toBe(true);
    expect(isTaskRoute('/messages')).toBe(false);
    expect(isTaskRoute('/feed')).toBe(false);
  });

  it('matches sections by prefix and treats / as the feed', () => {
    expect(isSectionActive('/', '/feed')).toBe(true);
    expect(isSectionActive('/events/[id]', '/events')).toBe(true);
    expect(isSectionActive('/eventsx', '/events')).toBe(false);
    expect(isSectionActive('/profile/locations', '/profile')).toBe(true);
  });

  it('links every sidebar topic to a feed filter', () => {
    expect(getTopicLinks()[0]).toEqual({ slug: 'housing', label: 'Housing', href: '/feed?tags=housing' });
  });

  it('only shows Moderation to moderators', () => {
    expect(getCommunityLinks({ is_moderator: false }).map((link) => link.label)).toEqual(['Events', 'Marketplace']);
    expect(getCommunityLinks({ is_moderator: true }).map((link) => link.label)).toContain('Moderation');
    expect(getSettingsLinks({ is_moderator: false }).map((link) => link.label)).not.toContain('Moderation');
  });

  it('sends Level 0 members to verification instead of the composer', () => {
    expect(getCreateLink({ trust_level: 0 })).toEqual({ label: 'Verify to post', href: '/profile' });
    expect(getCreateLink({ trust_level: 1 })).toEqual({ label: 'Create post', href: '/posts/create' });
  });

  it('has five tabs in the native-app order', () => {
    expect(getTabLinks({ trust_level: 1 }).map((tab) => tab.key)).toEqual(['home', 'events', 'create', 'marketplace', 'profile']);
  });
});
```

`SideRail.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import { SideRail } from './SideRail';

const useRouterMock = vi.hoisted(() => vi.fn());
vi.mock('next/router', () => ({ useRouter: useRouterMock }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

const member = { id: 'u1', trust_level: 1, is_moderator: false } as unknown as User;

describe('SideRail', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: {} });
  });

  it('is the primary navigation landmark with feed, topics and community links', () => {
    render(<SideRail user={member} />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toBeDefined();
    expect(screen.getByRole('link', { name: 'Housing' }).getAttribute('href')).toBe('/feed?tags=housing');
    expect(screen.getByRole('link', { name: 'Events' }).getAttribute('href')).toBe('/events');
    expect(screen.getByRole('link', { name: 'Create post' }).getAttribute('href')).toBe('/posts/create');
  });

  it('marks the active topic', () => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: { tags: 'jobs' } });
    render(<SideRail user={member} />);
    expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Feed' }).getAttribute('aria-current')).toBeNull();
  });

  it('keeps the legal links in the rail footer', () => {
    render(<SideRail user={member} />);
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy');
  });

  it('shows Moderation and Verify to post when appropriate', () => {
    render(<SideRail user={{ ...member, trust_level: 0, is_moderator: true } as User} />);
    expect(screen.getByRole('link', { name: 'Moderation' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Verify to post' }).getAttribute('href')).toBe('/profile');
  });
});
```

`BottomTabBar.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import { BottomTabBar } from './BottomTabBar';

const useRouterMock = vi.hoisted(() => vi.fn());
vi.mock('next/router', () => ({ useRouter: useRouterMock }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

const member = { id: 'u1', trust_level: 1, is_moderator: false } as unknown as User;

describe('BottomTabBar', () => {
  it('renders the five tabs with the current one marked', () => {
    useRouterMock.mockReturnValue({ pathname: '/events/[id]', query: {} });
    render(<BottomTabBar user={member} />);
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeDefined();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Events' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });

  it('points the create tab at verification for Level 0', () => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: {} });
    render(<BottomTabBar user={{ ...member, trust_level: 0 } as User} />);
    expect(screen.getByRole('link', { name: 'Verify to post' }).getAttribute('href')).toBe('/profile');
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/layout/navItems.test.ts src/components/layout/SideRail.test.tsx src/components/layout/BottomTabBar.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `navItems.ts`**

```ts
import type { ComponentType } from 'react';
import {
  IconCalendarEvent,
  IconHome,
  IconPlus,
  IconShieldCheck,
  IconShoppingBag,
  IconUser,
} from '@tabler/icons-react';
import { SIDEBAR_TAGS } from '@nepally/shared';
import type { User } from '@nepally/shared';

export type NavIcon = ComponentType<{ size?: number; stroke?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export interface NavLinkItem {
  key: string;
  label: string;
  href: string;
  icon: NavIcon;
}

/** Full-screen task routes; the bottom tab bar would cover their input bars. */
export const TASK_ROUTES = [
  '/posts/create',
  '/marketplace/create',
  '/events/create',
  '/messages/[id]',
  '/marketplace/listing/promote/[id]',
];

export function isTaskRoute(pathname: string): boolean {
  return TASK_ROUTES.includes(pathname);
}

export function isSectionActive(pathname: string, href: string): boolean {
  if (href === '/feed') return pathname === '/' || pathname === '/feed';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getTopicLinks(): Array<{ slug: string; label: string; href: string }> {
  return SIDEBAR_TAGS.map((tag) => ({ slug: tag.slug, label: tag.name, href: `/feed?tags=${tag.slug}` }));
}

export function getCommunityLinks(user: Pick<User, 'is_moderator'>): NavLinkItem[] {
  const links: NavLinkItem[] = [
    { key: 'events', label: 'Events', href: '/events', icon: IconCalendarEvent },
    { key: 'marketplace', label: 'Marketplace', href: '/marketplace', icon: IconShoppingBag },
  ];
  if (user.is_moderator) {
    links.push({ key: 'moderation', label: 'Moderation', href: '/moderation', icon: IconShieldCheck });
  }
  return links;
}

export function getCreateLink(user: Pick<User, 'trust_level'>): { label: string; href: string } {
  return user.trust_level >= 1
    ? { label: 'Create post', href: '/posts/create' }
    : { label: 'Verify to post', href: '/profile' };
}

/** Phone tabs, mirroring the native app: Home · Events · Create · Market · Profile. */
export function getTabLinks(user: Pick<User, 'trust_level'>): NavLinkItem[] {
  const create = getCreateLink(user);
  return [
    { key: 'home', label: 'Home', href: '/feed', icon: IconHome },
    { key: 'events', label: 'Events', href: '/events', icon: IconCalendarEvent },
    { key: 'create', label: create.label, href: create.href, icon: IconPlus },
    { key: 'marketplace', label: 'Market', href: '/marketplace', icon: IconShoppingBag },
    { key: 'profile', label: 'Profile', href: '/profile', icon: IconUser },
  ];
}

/** Secondary destinations listed on the Profile page ("Settings & more"). */
export function getSettingsLinks(user: Pick<User, 'is_moderator'>): Array<{ label: string; href: string }> {
  return [
    { label: 'Locations', href: '/profile/locations' },
    { label: 'Notification settings', href: '/profile/notifications' },
    ...(user.is_moderator ? [{ label: 'Moderation', href: '/moderation' }] : []),
    { label: 'Guidelines', href: '/guidelines' },
    { label: 'Help Center', href: '/help' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ];
}

export const FOOTER_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Guidelines', href: '/guidelines' },
  { label: 'Help Center', href: '/help' },
];
```

- [ ] **Step 3: Implement `SideRail`**

`SideRail.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mantine/core';
import { IconLayoutGrid, IconLock, IconPlus } from '@tabler/icons-react';
import type { User } from '@nepally/shared';
import {
  FOOTER_LINKS,
  getCommunityLinks,
  getCreateLink,
  getTopicLinks,
  isSectionActive,
  type NavIcon,
} from './navItems';
import styles from './SideRail.module.css';

const DOT_CLASS: Record<string, string> = {
  housing: styles.dotHousing,
  jobs: styles.dotJobs,
  help: styles.dotHelp,
  question: styles.dotQuestion,
  discussion: styles.dotDiscussion,
  emergency: styles.dotEmergency,
};

interface RailLinkProps {
  href: string;
  label: string;
  active: boolean;
  icon?: NavIcon;
  dotSlug?: string;
}

function RailLink({ href, label, active, icon: Icon, dotSlug }: RailLinkProps) {
  return (
    <Link href={href} className={styles.link} aria-current={active ? 'page' : undefined} title={label}>
      {Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : (
        <span className={`${styles.dot} ${DOT_CLASS[dotSlug ?? ''] ?? ''}`} aria-hidden="true" />
      )}
      <span className={styles.label}>{label}</span>
    </Link>
  );
}

/** Full rail at ≥62em; icon-only between 48em and 62em; hidden on phones (AppShell). */
export function SideRail({ user }: { user: User }) {
  const router = useRouter();
  const activeTag = typeof router.query.tags === 'string' ? router.query.tags : null;
  const create = getCreateLink(user);
  const canPost = user.trust_level >= 1;

  return (
    <nav aria-label="Primary" className={styles.root}>
      <div className={styles.section}>
        <RailLink href="/feed" label="Feed" icon={IconLayoutGrid} active={isSectionActive(router.pathname, '/feed') && !activeTag} />
      </div>

      <div className={styles.section}>
        <p className={styles.heading}>Topics</p>
        {getTopicLinks().map((topic) => (
          <RailLink key={topic.slug} href={topic.href} label={topic.label} dotSlug={topic.slug} active={activeTag === topic.slug} />
        ))}
      </div>

      <div className={styles.section}>
        <p className={styles.heading}>Community</p>
        {getCommunityLinks(user).map((link) => (
          <RailLink key={link.key} href={link.href} label={link.label} icon={link.icon} active={isSectionActive(router.pathname, link.href)} />
        ))}
      </div>

      <Button
        component={Link}
        href={create.href}
        variant={canPost ? 'filled' : 'default'}
        leftSection={canPost ? <IconPlus size={16} aria-hidden="true" /> : <IconLock size={16} aria-hidden="true" />}
        className={styles.cta}
        fullWidth
      >
        <span className={styles.label}>{create.label}</span>
      </Button>

      <footer className={styles.footer}>
        {FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={styles.footerLink}>
            {link.label}
          </Link>
        ))}
      </footer>
    </nav>
  );
}
```

`SideRail.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  padding: var(--space-4) var(--space-3);
  overflow-y: auto;
  background: var(--surface-1);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.heading {
  padding: 0 var(--space-3) var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}

.link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
  font-size: var(--font-size-sm);
  color: var(--text-2);
  transition: background var(--duration-fast) var(--ease-out);
}

.link:hover {
  background: var(--surface-2);
  color: var(--text-1);
}

.link[aria-current='page'] {
  background: var(--surface-2);
  box-shadow: inset 3px 0 0 var(--accent);
  font-weight: var(--font-weight-semibold);
  color: var(--action-bg);
}

.dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin: 0 5px;
  border-radius: var(--radius-full);
  background: var(--text-3);
}

.dotHousing { background: var(--tag-housing); }
.dotJobs { background: var(--tag-jobs); }
.dotHelp { background: var(--tag-help); }
.dotQuestion { background: var(--tag-question); }
.dotDiscussion { background: var(--tag-discussion); }
.dotEmergency { background: var(--tag-emergency); }

.cta {
  flex-shrink: 0;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  margin-top: auto;
  padding: var(--space-3) var(--space-3) 0;
  border-top: 1px solid var(--border-subtle);
}

.footerLink {
  font-size: var(--font-size-xs);
  color: var(--text-3);
}

/* Tablet: icon-only rail. Labels stay in the accessibility tree. */
@media (min-width: $mantine-breakpoint-sm) and (max-width: $mantine-breakpoint-md) {
  .root {
    align-items: center;
    padding: var(--space-3) var(--space-2);
  }

  .label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .heading,
  .footer {
    display: none;
  }

  .link {
    justify-content: center;
    padding: var(--space-3);
  }
}
```

- [ ] **Step 4: Implement `BottomTabBar`**

`BottomTabBar.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { User } from '@nepally/shared';
import { getTabLinks, isSectionActive } from './navItems';
import styles from './BottomTabBar.module.css';

/** Phone navigation (<48em). Layout hides it on task routes. */
export function BottomTabBar({ user }: { user: User }) {
  const router = useRouter();

  return (
    <nav aria-label="Tabs" className={styles.root}>
      <ul className={styles.list}>
        {getTabLinks(user).map((tab) => {
          const isCreate = tab.key === 'create';
          const active = !isCreate && isSectionActive(router.pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.key} className={styles.item}>
              <Link href={tab.href} className={isCreate ? styles.create : styles.tab} aria-current={active ? 'page' : undefined}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={isCreate ? 24 : 20} />
                </span>
                <span className={isCreate ? styles.visuallyHidden : styles.label}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`BottomTabBar.module.css`:

```css
.root {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 200;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-1);
}

.list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: var(--layout-tabbar-height);
  list-style: none;
}

.item {
  display: flex;
}

.tab,
.create {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--text-3);
}

.tab {
  position: relative;
  font-size: var(--font-size-xs);
}

.tab[aria-current='page'] {
  font-weight: var(--font-weight-semibold);
  color: var(--action-bg);
}

.tab[aria-current='page']::before {
  content: '';
  position: absolute;
  top: 0;
  width: 22px;
  height: 3px;
  border-radius: 0 0 var(--radius-chip) var(--radius-chip);
  background: var(--accent);
}

.create .icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--action-bg);
  color: var(--action-fg);
  box-shadow: 0 0 0 4px var(--accent-tint);
}

.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (min-width: $mantine-breakpoint-sm) {
  .root {
    display: none;
  }
}
```

- [ ] **Step 5: Implement `TopicPills` and show it on the phone feed**

`TopicPills.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getTopicLinks } from './navItems';
import styles from './TopicPills.module.css';

/** Phone-only topic filter row for the feed (the rail holds topics on wider screens). */
export function TopicPills() {
  const router = useRouter();
  const active = typeof router.query.tags === 'string' ? router.query.tags : null;

  return (
    <nav aria-label="Topics" className={styles.root}>
      <Link href="/feed" className={styles.pill} aria-current={active ? undefined : 'page'}>
        All
      </Link>
      {getTopicLinks().map((topic) => (
        <Link key={topic.slug} href={topic.href} className={styles.pill} aria-current={active === topic.slug ? 'page' : undefined}>
          {topic.label}
        </Link>
      ))}
    </nav>
  );
}
```

`TopicPills.module.css`:

```css
.root {
  display: flex;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-4));
  padding: 0 var(--space-4) var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
}

.pill {
  flex-shrink: 0;
  padding: 6px var(--space-3);
  border: 1px solid var(--border-solid);
  border-radius: var(--radius-full);
  background: var(--surface-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-2);
  white-space: nowrap;
}

.pill[aria-current='page'] {
  border-color: var(--action-bg);
  background: var(--action-bg);
  color: var(--action-fg);
}
```

In `apps/web/src/pages/feed.page.tsx`:

1. Change `import { useClickOutside } from '@mantine/hooks';` to `import { useClickOutside, useMediaQuery } from '@mantine/hooks';`.
2. Add these imports:

```tsx
import LocationSwitcher from '../components/LocationSwitcher';
import { TopicPills } from '../components/layout/TopicPills';
```

3. Add this immediately after `const { user, loading: authLoading } = useAuth();`. It is rendered only on phones, so desktop DOM (and existing e2e selectors) are unchanged:

```tsx
  const isPhone = useMediaQuery('(max-width: 47.99em)');
```

4. Insert this immediately before `<div className={styles.composerCard}>`:

```tsx
            {isPhone ? (
              <div className={styles.phoneFilters}>
                <LocationSwitcher />
                <TopicPills />
              </div>
            ) : null}
```

In `apps/web/src/styles/Feed.module.css`, append:

```css
.phoneFilters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
```

- [ ] **Step 6: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/layout src/pages/feed.test.tsx`
Expected: all PASS.

```bash
git add apps/web/src/components/layout apps/web/src/pages/feed.page.tsx apps/web/src/styles/Feed.module.css
git commit -m "feat(web): add responsive side rail, phone bottom tabs and topic pills" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.11: Compose the new Layout

**Files:**

- Create: `apps/web/src/components/layout/PublicShell.tsx`, `PublicShell.module.css`
- Rewrite: `apps/web/src/components/Layout.tsx`, `apps/web/src/components/Layout.module.css`, `apps/web/src/components/Layout.test.tsx`
- Modify: `apps/web/playwright.config.ts`, `apps/web/package.json` (`test:e2e` script)
- Create: `apps/web/e2e/tests/phone/navigation.spec.ts`

**Interfaces:**

- Consumes everything from Tasks 2.7–2.10.
- `Layout` keeps its default export and `{ children }` prop.
- `main#main-content` is the skip-link target.
- Pages render inside `.content`: max width `--layout-max-width`, `--space-5` padding, and extra bottom padding above the phone tab bar.

- [ ] **Step 1: Rewrite `Layout.test.tsx` (failing against the old Layout)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  useUnreadMessageCount: vi.fn(),
  useNotificationsFeed: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('../hooks/useUnreadMessageCount', () => ({ useUnreadMessageCount: mocks.useUnreadMessageCount }));
vi.mock('../hooks/useNotificationsFeed', () => ({ useNotificationsFeed: mocks.useNotificationsFeed }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));
vi.mock('./LocationSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'location-switcher' }),
}));

import Layout from './Layout';

const member = { id: 'user-1', full_name: 'Test User', email: 'test@example.com', trust_level: 1, profile_photo: null, is_moderator: false };

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ pathname: '/feed', query: {}, push: mocks.push });
    mocks.useUnreadMessageCount.mockReturnValue(0);
    mocks.useNotificationsFeed.mockReturnValue({
      unreadCount: 0,
      items: [],
      markRead: vi.fn().mockResolvedValue(undefined),
      markAllRead: vi.fn(),
      remove: vi.fn(),
    });
  });

  it('shows only a loader while auth loads', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: true, signOut: mocks.signOut });
    render(<Layout>Content</Layout>);
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('renders the public shell for visitors', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false, signOut: mocks.signOut });
    render(<Layout>Page content</Layout>);
    expect(screen.getByRole('link', { name: 'Log In' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Sign Up' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy');
    expect(screen.getByRole('main').textContent).toContain('Page content');
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  });

  describe('signed in', () => {
    beforeEach(() => {
      mocks.useAuth.mockReturnValue({ user: member, loading: false, signOut: mocks.signOut });
    });

    it('renders top bar, rail, tabs and children', () => {
      render(<Layout>Main content</Layout>);
      expect(screen.getByTestId('location-switcher')).toBeDefined();
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeDefined();
      expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeDefined();
      expect(screen.getByRole('main').textContent).toContain('Main content');
    });

    it('offers a skip link to the main content', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main-content');
      expect(screen.getByRole('main').id).toBe('main-content');
    });

    it('hides the tab bar on task routes', () => {
      mocks.useRouter.mockReturnValue({ pathname: '/posts/create', query: {}, push: mocks.push });
      render(<Layout>Content</Layout>);
      expect(screen.queryByRole('navigation', { name: 'Tabs' })).toBeNull();
    });

    it('stops bell polling on the notifications page', () => {
      mocks.useRouter.mockReturnValue({ pathname: '/notifications', query: {}, push: mocks.push });
      render(<Layout>Content</Layout>);
      expect(mocks.useNotificationsFeed).toHaveBeenCalledWith({ userId: 'user-1', pollingEnabled: false });
    });

    it('marks a notification read and navigates to it', async () => {
      const notification = {
        id: 'n-1',
        user_id: 'user-1',
        type: 'message',
        title: 'New message',
        body: 'Hi',
        data: { conversation_id: 'conv-1' },
        read: false,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const feed = {
        unreadCount: 1,
        items: [notification],
        markRead: vi.fn().mockResolvedValue(undefined),
        markAllRead: vi.fn(),
        remove: vi.fn(),
      };
      mocks.useNotificationsFeed.mockReturnValue(feed);
      render(<Layout>Content</Layout>);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
      fireEvent.click(await screen.findByRole('button', { name: /New message/ }));
      await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/messages/conv-1'));
      expect(feed.markRead).toHaveBeenCalledWith(notification);
    });

    it('signs out and returns home', async () => {
      mocks.signOut.mockResolvedValue(undefined);
      render(<Layout>Content</Layout>);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
      });
      await act(async () => {
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign Out' }));
      });
      await waitFor(() => {
        expect(mocks.signOut).toHaveBeenCalled();
        expect(mocks.push).toHaveBeenCalledWith('/');
      });
    });
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/Layout.test.tsx`
Expected: FAIL (the old Layout has no skip link, no Tabs navigation, and does not call the new hooks).

- [ ] **Step 2: Implement `PublicShell`**

`PublicShell.tsx`:

```tsx
import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Group } from '@mantine/core';
import { FOOTER_LINKS } from './navItems';
import styles from './PublicShell.module.css';

/** Shell for signed-out visitors: brand, Log In / Sign Up, legal footer. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} aria-hidden="true" />
            Nepally
          </Link>
          <Group gap="xs">
            <Button variant="default" component={Link} href="/login">
              Log In
            </Button>
            <Button component={Link} href="/signup">
              Sign Up
            </Button>
          </Group>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <nav aria-label="Footer links" className={styles.footerNav}>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className={styles.copy}>&copy; {new Date().getFullYear()} Nepally Community</p>
      </footer>
    </div>
  );
}
```

`PublicShell.module.css`:

```css
.root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-1);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--layout-max-width);
  height: var(--layout-topbar-height);
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 1.375rem;
  color: var(--action-bg);
}

.brandDot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.main {
  flex: 1;
  width: 100%;
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.footerNav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2) var(--space-5);
}

.footerLink {
  font-size: var(--font-size-sm);
  color: var(--text-2);
}

.copy {
  font-size: var(--font-size-xs);
  color: var(--text-3);
}
```

- [ ] **Step 3: Rewrite `apps/web/src/components/Layout.tsx`**

```tsx
import React, { type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AppShell, Center, Loader } from '@mantine/core';
import type { Notification } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { useNotificationsFeed } from '../hooks/useNotificationsFeed';
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';
import { BottomTabBar } from './layout/BottomTabBar';
import { isTaskRoute } from './layout/navItems';
import { PublicShell } from './layout/PublicShell';
import { SideRail } from './layout/SideRail';
import { TopBar } from './layout/TopBar';
import { getNotificationHref } from './notifications/notificationHref';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;
  const unreadMessages = useUnreadMessageCount(userId);
  const notifications = useNotificationsFeed({ userId, pollingEnabled: router.pathname !== '/notifications' });

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <PublicShell>{children}</PublicShell>;
  }

  const handleOpenNotification = async (notification: Notification) => {
    await notifications.markRead(notification);
    router.push(getNotificationHref(notification));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const showTabs = !isTaskRoute(router.pathname);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: { sm: 72, md: 240 }, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding={0}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <AppShell.Header className={styles.header}>
        <TopBar
          user={user}
          unreadMessages={unreadMessages}
          notifications={notifications}
          onOpenNotification={(notification) => {
            void handleOpenNotification(notification);
          }}
          onSignOut={() => {
            void handleSignOut();
          }}
        />
      </AppShell.Header>

      <AppShell.Navbar className={styles.navbar}>
        <SideRail user={user} />
      </AppShell.Navbar>

      <AppShell.Main id="main-content" className={styles.main}>
        <div className={showTabs ? `${styles.content} ${styles.withTabs}` : styles.content}>{children}</div>
      </AppShell.Main>

      {showTabs ? <BottomTabBar user={user} /> : null}
    </AppShell>
  );
}
```

- [ ] **Step 4: Rewrite `apps/web/src/components/Layout.module.css`**

```css
.skipLink {
  position: fixed;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 1000;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  background: var(--action-bg);
  color: var(--action-fg);
  transform: translateY(-200%);
}

.skipLink:focus-visible {
  transform: none;
}

.header {
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-1);
}

.navbar {
  border-right: 1px solid var(--border-subtle);
}

.main {
  background: var(--surface-0);
}

/* Mantine offsets .main for the header and rail; page width and padding live here. */
.content {
  width: 100%;
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: var(--space-4);
}

.withTabs {
  padding-bottom: calc(var(--layout-tabbar-height) + env(safe-area-inset-bottom) + var(--space-4));
}

@media (min-width: $mantine-breakpoint-sm) {
  .content,
  .withTabs {
    padding: var(--space-5);
  }
}
```

- [ ] **Step 5: Run the web suite**

Run: `npm run test --workspace=apps/web`
Expected: all PASS.

- [ ] **Step 6: Add the `phone` Playwright project and a navigation spec**

In `apps/web/playwright.config.ts`:

- Change the `chromium` project to

  ```ts
      {
        name: 'chromium',
        testDir: './e2e/tests',
        testIgnore: '**/phone/**',
        use: { ...devices['Desktop Chrome'] },
      },
  ```

- Add after it:

  ```ts
      {
        name: 'phone',
        testDir: './e2e/tests/phone',
        use: { ...devices['Pixel 7'] },
      },
  ```

In `apps/web/package.json`, change `"test:e2e"` to `"playwright test --project=chromium --project=phone"`.

Create `apps/web/e2e/tests/phone/navigation.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../../fixtures/auth';
import { mockSupabaseLoggedIn } from '../../helpers/supabase-mock';

test.describe('Phone navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('bottom tabs replace the side rail', async ({ page }) => {
    await page.goto('/feed');
    const tabs = page.getByRole('navigation', { name: 'Tabs' });
    await expect(tabs).toBeVisible({ timeout: 10_000 });
    await expect(tabs.getByRole('link')).toHaveCount(5);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
    await expect(tabs.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  test('tabs navigate between sections', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('topic pills filter the feed', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('navigation', { name: 'Topics' }).getByRole('link', { name: 'Housing' }).click();
    await expect(page).toHaveURL(/tags=housing/);
  });

  test('the composer hides the tab bar', async ({ page }) => {
    await page.goto('/posts/create');
    await expect(page.getByRole('heading', { name: /create post/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  });
});
```

Run: `npm run test:e2e --workspace=apps/web`
Expected: all chromium and phone specs PASS.

If `04-feed.spec.ts` "shows create post button" or `06-profile.spec.ts` fails because of changed label text (`Create post` in the rail vs `Create Post` in the feed composer), update the spec to use a case-insensitive name (`/^create post$/i`). The composer link text is unchanged.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/Layout.tsx apps/web/src/components/Layout.module.css apps/web/src/components/Layout.test.tsx apps/web/src/components/layout/PublicShell.tsx apps/web/src/components/layout/PublicShell.module.css apps/web/playwright.config.ts apps/web/package.json apps/web/e2e/tests
git commit -m "feat(web): compose the app shell from focused components over Mantine AppShell" -m "Adds the skip link, icon-only tablet rail and phone bottom tabs; phone e2e project covers navigation." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 2.12: Settings & more, broken links, docs, re-baseline

**Files:**

- Modify: `apps/web/src/pages/profile.page.tsx`, `apps/web/src/pages/profile.test.tsx`, `apps/web/src/styles/Profile.module.css`
- Modify: `apps/web/src/pages/users/[id].page.tsx:269,381`
- Modify: `docs/architecture/web-ui-system.md`
- Update (generated): allowlists, `apps/web/e2e/visual/__screenshots__/**`, `a11y-baseline.json`

**Interfaces:**

- Consumes `getSettingsLinks` (2.10).

- [ ] **Step 1: Write the failing profile tests** — append inside `describe('ProfilePage', …)` in `profile.test.tsx`:

```tsx
  it('lists settings and secondary pages under "Settings & more"', async () => {
    render(<ProfilePage />);
    const settings = await screen.findByRole('navigation', { name: 'Settings & more' });
    const hrefs = Array.from(settings.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/profile/locations', '/profile/notifications', '/guidelines', '/help', '/privacy', '/terms']);
  });

  it('includes Moderation for moderators', async () => {
    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, is_moderator: true },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    render(<ProfilePage />);
    const settings = await screen.findByRole('navigation', { name: 'Settings & more' });
    expect(Array.from(settings.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toContain('/moderation');
  });
```

Run: `npm run test --workspace=apps/web -- src/pages/profile.test.tsx`
Expected: the two new tests FAIL.

- [ ] **Step 2: Implement the section**

In `profile.page.tsx`:

- Add `IconChevronRight` to the imports (`import { IconChevronRight } from '@tabler/icons-react';`).
- Add `import { getSettingsLinks } from '../components/layout/navItems';`.
- Insert this immediately after the closing `</div>` of `<div className={styles.profileCard}>` (before the page wrapper's closing `</div>`):

```tsx
        <nav aria-labelledby="settings-heading" className={styles.settingsCard}>
          <h2 id="settings-heading" className={styles.sectionTitle}>
            Settings &amp; more
          </h2>
          <ul className={styles.settingsList}>
            {getSettingsLinks(user).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.settingsLink}>
                  {link.label}
                  <IconChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <UnstyledButton className={`${styles.settingsLink} ${styles.settingsDanger}`} onClick={handleMenuLogout}>
                Sign out
              </UnstyledButton>
            </li>
          </ul>
        </nav>
```

Append to `apps/web/src/styles/Profile.module.css` (new rules use tokens; the file stays on the allowlist until PR 6):

```css
.settingsCard {
  margin-top: var(--space-5);
  padding: var(--card-padding);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-1);
}

.settingsList {
  margin-top: var(--space-3);
  list-style: none;
}

.settingsLink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--font-size-base);
  color: var(--text-1);
}

.settingsDanger {
  border-bottom: none;
  color: var(--danger);
}
```

Run: `npm run test --workspace=apps/web -- src/pages/profile.test.tsx`
Expected: all PASS.

- [ ] **Step 3: Fix the broken links in `users/[id].page.tsx`**

- Line 269: `<Link href="/posts/new">` → `<Link href="/posts/create">`
- Line 381: `<Link href="/marketplace/new">` → `<Link href="/marketplace/create">`

Run: `grep -rn '"/posts/new"\|"/marketplace/new"' apps/web/src`
Expected: no output.

- [ ] **Step 4: Document the shell** — append to `docs/architecture/web-ui-system.md` before `## Guards`:

```markdown
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
```

- [ ] **Step 5: Shrink the allowlists**

```bash
node scripts/guard-css-tokens.js --write-allowlist
node apps/web/eslint/write-raw-element-allowlist.mjs
git diff scripts/guard-css-tokens.allowlist.json apps/web/eslint/raw-element-allowlist.mjs
```

Expected: both diffs only remove entries. `Layout.module.css` and `Layout.tsx` are gone from the lists. If an entry was **added**, a new file breaks the rule; fix that file instead of accepting the entry.

- [ ] **Step 6: Re-baseline screenshots and accessibility**

```bash
npm run test:visual:docker --workspace=apps/web -- --update
npm run test:visual:docker --workspace=apps/web
npm run test:visual:docker --workspace=apps/web -- --write-a11y-baseline
git diff apps/web/e2e/visual/a11y-baseline.json
```

Expected:

- The desktop PNGs show the new rail and top bar; the phone PNGs show bottom tabs.
- The second command PASSES, with no new axe violations.
- The baseline diff only removes lines.

- [ ] **Step 7: Full verification, commit, push**

```bash
npm run lint
npm run lint:guards
npm run type-check
npm run test
npm run test:e2e:web
npm run test:visual:web
npm run docs:check
```

Expected: all succeed.

```bash
git add apps/web/src/pages/profile.page.tsx apps/web/src/pages/profile.test.tsx apps/web/src/styles/Profile.module.css "apps/web/src/pages/users/[id].page.tsx" docs/architecture/web-ui-system.md scripts/guard-css-tokens.allowlist.json apps/web/eslint/raw-element-allowlist.mjs apps/web/e2e/visual
git commit -m "feat(web): add Settings & more to Profile and fix broken create links" -m "Re-baselines screenshots for the new shell and shrinks the token and raw-element allowlists." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Push `feat/web-app-shell` and open its PR. Update the tracker row for PR 2.

---

# PR 3a — Search: data + shared

**Branch:** `feat/search-data`, created from `master` after PR 2 merges.

**Outcome:** the database can rank posts, listings and people for a query, and `@nepally/shared` exposes typed, tested search functions. The UI has no changes yet. **The migration must be live before PR 3b deploys.**

| Path | Change | Responsibility |
|---|---|---|
| `supabase/migrations/037_search.sql` | Create | Search documents, GIN expression indexes, `build_prefix_tsquery`, `search_posts` / `search_listings` / `search_people` |
| `packages/shared/src/constants/search.ts` | Create | Limits and debounce |
| `packages/shared/src/types/search.ts` | Create | Result, page and suggestion types |
| `packages/shared/src/utils/searchQuery.ts` (+ test) | Create | `normalizeSearchInput`, `highlightSegments` |
| `packages/shared/src/api/search.ts` (+ test) | Create | `searchPosts`, `searchListings`, `searchPeople`, `searchSuggestions` |
| `packages/shared/src/api/marketplace.ts` | Modify | Export `LISTING_SELECT` |
| `packages/shared/src/{index,api/index,types/index,utils/index}.ts` | Modify | Barrel exports |
| `scripts/security/users-pii-smoke.ts` | Modify | `search_people` checks |
| `docs/architecture/database-schema.md` | Modify | Search functions section |

### Task 3a.1: Migration `037_search.sql`

**Files:**

- Create: `supabase/migrations/037_search.sql`

**Interfaces:** each function returns `SETOF` rows. The shared API orders and pages them with PostgREST.

- `public.search_posts(p_query text, p_metro_id text, p_all_metros boolean DEFAULT false)` returns `id uuid, rank real, created_at timestamptz, total_count bigint`.
- `public.search_listings(p_query text, p_metro_id text, p_all_metros boolean DEFAULT false)` returns `id uuid, rank real, refreshed_at timestamptz, total_count bigint`.
- `public.search_people(p_query text, p_metro_id text)` returns `id uuid, full_name text, profile_photo text, trust_level integer, metro_area_id text, follower_count integer, is_local boolean, rank real, total_count bigint`.

- [ ] **Step 1: Create the PR branch**

```bash
git switch master && git pull --ff-only && git switch -c feat/search-data
```

- [ ] **Step 2: Write `supabase/migrations/037_search.sql`**

```sql
-- 037_search.sql
-- Global search (web UI overhaul, docs/specs/2026-09-14-web-ui-overhaul-design.md §4.4).
--
-- 1. IMMUTABLE search-document functions for posts and people, with GIN
--    expression indexes. Expression indexes (not STORED columns) keep tsvectors
--    out of `select('*')` payloads and need no new column grants.
-- 2. build_prefix_tsquery(): turns raw user input into a safe prefix tsquery.
-- 3. search_posts / search_listings / search_people: SECURITY INVOKER, so RLS
--    and migration 036's column grants apply exactly as for direct queries.
--    They return ranked ids (+ public person columns) and a window total; the
--    client orders and pages the result through PostgREST.
--
-- Additive migration — no DROP TABLE / DROP TYPE.

-- ─── 1. Search documents + indexes ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.post_search_document(p_title text, p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_description, '')), 'B');
$$;

CREATE INDEX IF NOT EXISTS idx_posts_search_document
  ON public.posts USING GIN (public.post_search_document(title, description));

-- Names are not English words: the `simple` config lowercases without stemming.
CREATE OR REPLACE FUNCTION public.person_search_document(p_full_name text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_full_name, ''));
$$;

CREATE INDEX IF NOT EXISTS idx_users_person_search_document
  ON public.users USING GIN (public.person_search_document(full_name));

-- ─── 2. Safe prefix query builder ──────────────────────────────────────────
-- "thapa's NCLEX (pr" → 'thapa' & 's' & 'nclex' & 'pr':*
-- Every non-alphanumeric character is a separator, so tsquery operators in user
-- input can never produce a syntax error. Returns NULL for empty input.

CREATE OR REPLACE FUNCTION public.build_prefix_tsquery(p_input text, p_config regconfig)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN pg_catalog.array_length(words, 1) IS NULL THEN NULL
    ELSE pg_catalog.to_tsquery(
      p_config,
      pg_catalog.array_to_string(words, ' & ') || ':*'
    )
  END
  FROM (
    SELECT pg_catalog.array_remove(
      pg_catalog.regexp_split_to_array(pg_catalog.lower(coalesce(p_input, '')), '[^[:alnum:]]+'),
      ''
    ) AS words
  ) AS tokens;
$$;

-- ─── 3. Search functions ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_posts(
  p_query text,
  p_metro_id text,
  p_all_metros boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, created_at timestamptz, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'english'::regconfig) AS query)
  SELECT p.id,
         pg_catalog.ts_rank(public.post_search_document(p.title, p.description), q.query) AS rank,
         p.created_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.posts AS p
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND p.status = 'active'
    AND public.post_search_document(p.title, p.description) @@ q.query
    AND (p_all_metros OR p.metro_area_id = p_metro_id OR p.is_global);
$$;

CREATE OR REPLACE FUNCTION public.search_listings(
  p_query text,
  p_metro_id text,
  p_all_metros boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, refreshed_at timestamptz, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'english'::regconfig) AS query)
  SELECT l.id,
         pg_catalog.ts_rank(l.search_vector, q.query) AS rank,
         l.refreshed_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.marketplace_listings AS l
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND l.status = 'active'
    AND l.search_vector @@ q.query
    AND (p_all_metros OR l.metro_area_id = p_metro_id OR l.is_global);
$$;

CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_metro_id text)
RETURNS TABLE (
  id uuid,
  full_name text,
  profile_photo text,
  trust_level integer,
  metro_area_id text,
  follower_count integer,
  is_local boolean,
  rank real,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'simple'::regconfig) AS query)
  SELECT u.id,
         u.full_name,
         u.profile_photo,
         u.trust_level,
         u.metro_area_id,
         u.follower_count,
         coalesce(u.metro_area_id = p_metro_id, false) AS is_local,
         pg_catalog.ts_rank(public.person_search_document(u.full_name), q.query) AS rank,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.users AS u
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND u.is_banned = false
    AND public.person_search_document(u.full_name) @@ q.query;
$$;

-- Signed-in members only. The helper functions keep default EXECUTE so index
-- maintenance and the invoker-rights search functions can always call them.
REVOKE ALL ON FUNCTION public.search_posts(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_posts(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.search_listings(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_listings(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.search_people(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text, text) TO authenticated;

COMMENT ON FUNCTION public.search_posts(text, text, boolean) IS
  'Ranked active post ids for a prefix query; metro + global unless p_all_metros. Order by rank desc, created_at desc.';
COMMENT ON FUNCTION public.search_listings(text, text, boolean) IS
  'Ranked active listing ids for a prefix query; metro + global unless p_all_metros. Order by rank desc, refreshed_at desc.';
COMMENT ON FUNCTION public.search_people(text, text) IS
  'Public columns of non-banned members matching a name prefix query. Order by is_local desc, rank desc, follower_count desc.';
```

- [ ] **Step 3: Ask before touching the live database**

`037` applies to the single live Supabase project (`nusa-staging`, see `docs/architecture/migration-workflow.md`). Show the user the SQL file and ask for approval to apply it. Do not continue without a yes.

- [ ] **Step 4: Apply it**

Use the Supabase MCP tool `apply_migration` with `name: "037_search"` and the file contents as `query`. Do **not** use `supabase db push`.

- [ ] **Step 5: Verify on the live project** (Supabase MCP `execute_sql`)

```sql
SELECT public.build_prefix_tsquery('Thapa''s NCLEX (pr', 'english'::regconfig)::text AS q1,
       public.build_prefix_tsquery('  &|!():* ', 'english'::regconfig) IS NULL AS q2_is_null;
```

Expected: `q1` = `'thapa' & 'nclex' & 'pr':*` (English drops the `s` stopword) and `q2_is_null` = `true`.

```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('search_posts', 'search_listings', 'search_people', 'build_prefix_tsquery',
                  'post_search_document', 'person_search_document');
SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_posts_search_document', 'idx_users_person_search_document');
SELECT has_function_privilege('anon', 'public.search_people(text, text)', 'EXECUTE') AS anon_can_search,
       has_function_privilege('authenticated', 'public.search_people(text, text)', 'EXECUTE') AS members_can_search;
```

Expected:

- Six functions, all with `prosecdef = false`.
- Both indexes present.
- `anon_can_search = false` and `members_can_search = true`.

```sql
SELECT count(*) AS post_hits FROM public.search_posts('the', NULL, true);
SELECT id, rank, total_count FROM public.search_posts('room', NULL, true) ORDER BY rank DESC LIMIT 3;
```

Expected: both run without error. Counts depend on live data.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/037_search.sql
git commit -m "feat(db): add ranked search for posts, listings and people (037)" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3a.2: Search constants, types and query utils

**Files:**

- Create: `packages/shared/src/constants/search.ts`
- Create: `packages/shared/src/types/search.ts`
- Create: `packages/shared/src/utils/searchQuery.ts`, `packages/shared/src/utils/searchQuery.test.ts`
- Modify: `packages/shared/src/index.ts`, `packages/shared/src/types/index.ts`, `packages/shared/src/utils/index.ts`

**Interfaces:**

- Produces constants: `SEARCH_MIN_QUERY_LENGTH = 2`, `SEARCH_MAX_QUERY_LENGTH = 100`, `SEARCH_DEBOUNCE_MS = 250`, `SEARCH_PAGE_SIZE = 20`, `SEARCH_SUGGESTION_LIMITS = { posts: 3, listings: 2, people: 3 }`.
- Produces types:
  - `SearchTab = 'all' | 'posts' | 'listings' | 'people'`
  - `SearchScope = 'metro' | 'all'`
  - `PersonSearchResult`
  - `SearchPageOptions`, `PeopleSearchPageOptions`
  - `SearchPage<T>`, `SearchGroup<T>`
  - `SearchSuggestions`, `SearchSuggestionsResult`
- Produces utils:
  - `normalizeSearchInput(raw: string | null | undefined): string | null`
  - `highlightSegments(text: string, query: string | null): HighlightSegment[]`, where `HighlightSegment = { text: string; match: boolean }`

- [ ] **Step 1: Create `packages/shared/src/constants/search.ts`**

```ts
/**
 * Global search limits (web UI overhaul spec §4.4).
 */

/** Queries shorter than this are not sent to the database. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Longer input is truncated before searching. */
export const SEARCH_MAX_QUERY_LENGTH = 100;

/** Pause in typing before live suggestions are requested. */
export const SEARCH_DEBOUNCE_MS = 250;

/** Rows per page on the full results page. */
export const SEARCH_PAGE_SIZE = 20;

/** Rows per group in the live suggestion dropdown. */
export const SEARCH_SUGGESTION_LIMITS = { posts: 3, listings: 2, people: 3 } as const;
```

- [ ] **Step 2: Create `packages/shared/src/types/search.ts`**

```ts
/**
 * Global search types — snake_case row fields match the search_* functions in
 * supabase/migrations/037_search.sql.
 */
import type { MarketplaceListing } from './marketplace';
import type { Post } from './post';
import type { UserSummary } from './user';

export type SearchTab = 'all' | 'posts' | 'listings' | 'people';

/** `metro` = the viewer's metro (plus global posts/listings); `all` = every metro. */
export type SearchScope = 'metro' | 'all';

/** A member returned by search_people — public columns only. */
export interface PersonSearchResult extends UserSummary {
  metro_area_id: string | null;
  follower_count: number;
  /** True when the member is in the viewer's metro (ranked first). */
  is_local: boolean;
}

export interface SearchPageOptions {
  metroId: string | null;
  allMetros: boolean;
  limit: number;
  offset: number;
}

export type PeopleSearchPageOptions = Omit<SearchPageOptions, 'allMetros'>;

export interface SearchPage<T> {
  data?: T[];
  /** Total matches for the query, across all pages. */
  totalCount?: number;
  hasMore?: boolean;
  error?: Error;
}

export interface SearchGroup<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface SearchSuggestions {
  posts: SearchGroup<Post>;
  listings: SearchGroup<MarketplaceListing>;
  people: SearchGroup<PersonSearchResult>;
}

export interface SearchSuggestionsResult {
  data?: SearchSuggestions;
  error?: Error;
}
```

- [ ] **Step 3: Write the failing util test `packages/shared/src/utils/searchQuery.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { highlightSegments, normalizeSearchInput } from './searchQuery';

describe('normalizeSearchInput', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSearchInput('  room   in  queens ')).toBe('room in queens');
  });

  it('returns null below the minimum length', () => {
    expect(normalizeSearchInput('a')).toBeNull();
    expect(normalizeSearchInput('   ')).toBeNull();
    expect(normalizeSearchInput(undefined)).toBeNull();
  });

  it('truncates to 100 characters', () => {
    expect(normalizeSearchInput('x'.repeat(150))).toHaveLength(100);
  });

  it('keeps tsquery operator characters (the database sanitises them)', () => {
    expect(normalizeSearchInput("thapa's & (nclex)")).toBe("thapa's & (nclex)");
  });
});

describe('highlightSegments', () => {
  it('marks words that start with a query word, case-insensitively', () => {
    expect(highlightSegments('Thapa Catering: momo orders', 'tha')).toEqual([
      { text: 'Thapa', match: true },
      { text: ' Catering: momo orders', match: false },
    ]);
  });

  it('matches several query words', () => {
    expect(highlightSegments('Room near Jackson Heights', 'jackson room')).toEqual([
      { text: 'Room', match: true },
      { text: ' near ', match: false },
      { text: 'Jackson', match: true },
      { text: ' Heights', match: false },
    ]);
  });

  it('handles Devanagari names', () => {
    expect(highlightSegments('राम थापा', 'थापा')).toEqual([
      { text: 'राम ', match: false },
      { text: 'थापा', match: true },
    ]);
  });

  it('returns the whole text unmarked without a query', () => {
    expect(highlightSegments('Hello world', null)).toEqual([{ text: 'Hello world', match: false }]);
  });

  it('returns nothing for empty text', () => {
    expect(highlightSegments('', 'room')).toEqual([]);
  });
});
```

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `packages/shared/src/utils/searchQuery.ts`**

```ts
/**
 * Search input helpers shared by web and mobile.
 */
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '../constants/search';

/** Trims, collapses whitespace and truncates; null when too short to search. */
export function normalizeSearchInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_QUERY_LENGTH).trim();
  return normalized.length >= SEARCH_MIN_QUERY_LENGTH ? normalized : null;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

const WORD = /[\p{L}\p{M}\p{N}]+/u;
const TOKENS = /[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu;

/**
 * Splits text into matched / unmatched runs for rendering <mark>. A word
 * matches when it starts with any query word, mirroring the database's prefix
 * matching ("tha" highlights "Thapa"). Adjacent runs with the same state merge.
 */
export function highlightSegments(text: string, query: string | null): HighlightSegment[] {
  if (!text) return [];
  const queryWords = (query ?? '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (queryWords.length === 0) return [{ text, match: false }];

  const segments: HighlightSegment[] = [];
  for (const [token] of text.matchAll(TOKENS)) {
    const lower = token.toLocaleLowerCase();
    const match = WORD.test(token) && queryWords.some((word) => lower.startsWith(word));
    const previous = segments[segments.length - 1];
    if (previous && previous.match === match) {
      previous.text += token;
    } else {
      segments.push({ text: token, match });
    }
  }
  return segments;
}
```

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`
Expected: 9 PASS.

- [ ] **Step 5: Export from the barrels**

- `packages/shared/src/index.ts`: add `export * from './constants/search';` after `export * from './constants/users';`.
- `packages/shared/src/types/index.ts`: add `export * from './search';`.
- `packages/shared/src/utils/index.ts`: add `export * from './searchQuery';`.

Run: `npm run type-check --workspace=packages/shared && npm run test --workspace=packages/shared`
Expected: no type errors; all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/constants/search.ts packages/shared/src/types/search.ts packages/shared/src/types/index.ts packages/shared/src/utils/searchQuery.ts packages/shared/src/utils/searchQuery.test.ts packages/shared/src/utils/index.ts packages/shared/src/index.ts
git commit -m "feat(shared): add search constants, types and query helpers" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3a.3: Search API functions

**Files:**

- Create: `packages/shared/src/api/search.ts`, `packages/shared/src/api/search.test.ts`
- Modify: `packages/shared/src/api/marketplace.ts:37` (export `LISTING_SELECT`), `packages/shared/src/api/index.ts`

**Interfaces:**

- Consumes: `POST_SELECT`, `flattenPostTags` (posts.ts); `LISTING_SELECT` (marketplace.ts); `normalizeSearchInput`; `SEARCH_SUGGESTION_LIMITS`; the 037 functions.
- Produces:
  - `searchPosts(supabase: SupabaseClient, query: string, options: SearchPageOptions): Promise<SearchPage<Post>>`
  - `searchListings(supabase: SupabaseClient, query: string, options: SearchPageOptions): Promise<SearchPage<MarketplaceListing>>`
  - `searchPeople(supabase: SupabaseClient, query: string, options: PeopleSearchPageOptions): Promise<SearchPage<PersonSearchResult>>`
  - `searchSuggestions(supabase: SupabaseClient, query: string, scope: { metroId: string | null; allMetros: boolean }): Promise<SearchSuggestionsResult>`
- A query shorter than 2 characters resolves `{ data: [], totalCount: 0, hasMore: false }` without any request.

- [ ] **Step 1: Write the failing test `packages/shared/src/api/search.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchListings, searchPeople, searchPosts, searchSuggestions } from './search';

type Rows = Array<Record<string, unknown>>;

interface MockConfig {
  rpc?: Record<string, { data: Rows | null; error?: { message: string } | null }>;
  tables?: Record<string, { data: Rows | null; error?: { message: string } | null }>;
}

function createSupabase(config: MockConfig) {
  const rpcBuilders: Record<string, { order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }> = {};
  const tableBuilders: Record<string, { select: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> }> = {};

  const rpc = vi.fn((fn: string) => {
    const result = config.rpc?.[fn] ?? { data: [] };
    const builder = { order: vi.fn(), range: vi.fn() };
    builder.order.mockReturnValue(builder);
    builder.range.mockResolvedValue({ data: result.data, error: result.error ?? null });
    rpcBuilders[fn] = builder;
    return builder;
  });

  const from = vi.fn((table: string) => {
    const result = config.tables?.[table] ?? { data: [] };
    const builder = { select: vi.fn(), in: vi.fn() };
    builder.select.mockReturnValue(builder);
    builder.in.mockResolvedValue({ data: result.data, error: result.error ?? null });
    tableBuilders[table] = builder;
    return builder;
  });

  return { supabase: { rpc, from } as unknown as SupabaseClient, rpc, from, rpcBuilders, tableBuilders };
}

const pageOptions = { metroId: 'metro-nyc', allMetros: false, limit: 3, offset: 0 };

describe('searchPosts', () => {
  it('skips the database for queries shorter than 2 characters', async () => {
    const mock = createSupabase({});
    await expect(searchPosts(mock.supabase, ' a ', pageOptions)).resolves.toEqual({ data: [], totalCount: 0, hasMore: false });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('ranks via search_posts, then hydrates rows in rank order', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: {
          data: [
            { id: 'p2', rank: 0.9, created_at: '2026-09-14T00:00:00Z', total_count: 5 },
            { id: 'p1', rank: 0.4, created_at: '2026-09-13T00:00:00Z', total_count: 5 },
          ],
        },
      },
      tables: {
        posts: {
          data: [
            { id: 'p1', title: 'One', post_tags: [] },
            { id: 'p2', title: 'Two', post_tags: [{ tag: { id: 't', slug: 'jobs', name: 'Jobs' } }] },
          ],
        },
      },
    });

    const result = await searchPosts(mock.supabase, '  thapa ', pageOptions);

    expect(mock.rpc).toHaveBeenCalledWith('search_posts', { p_query: 'thapa', p_metro_id: 'metro-nyc', p_all_metros: false });
    expect(mock.rpcBuilders.search_posts.order).toHaveBeenNthCalledWith(1, 'rank', { ascending: false });
    expect(mock.rpcBuilders.search_posts.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 2);
    expect(mock.tableBuilders.posts.in).toHaveBeenCalledWith('id', ['p2', 'p1']);
    expect(result.data?.map((post) => post.id)).toEqual(['p2', 'p1']);
    expect(result.data?.[0].tags?.[0].slug).toBe('jobs');
    expect(result.totalCount).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('drops ids whose rows are no longer visible', async () => {
    const mock = createSupabase({
      rpc: { search_posts: { data: [{ id: 'gone', rank: 1, total_count: 1 }, { id: 'p1', rank: 0.5, total_count: 1 }] } },
      tables: { posts: { data: [{ id: 'p1', title: 'One', post_tags: [] }] } },
    });
    const result = await searchPosts(mock.supabase, 'room', pageOptions);
    expect(result.data?.map((post) => post.id)).toEqual(['p1']);
  });

  it('returns an Error when the function fails', async () => {
    const mock = createSupabase({ rpc: { search_posts: { data: null, error: { message: 'boom' } } } });
    const result = await searchPosts(mock.supabase, 'room', pageOptions);
    expect(result.error?.message).toBe('boom');
  });
});

describe('searchListings', () => {
  it('orders by refreshed_at and hydrates from the listings view', async () => {
    const mock = createSupabase({
      rpc: { search_listings: { data: [{ id: 'l1', rank: 0.5, refreshed_at: '2026-09-14T00:00:00Z', total_count: 1 }] } },
      tables: { marketplace_listings_view: { data: [{ id: 'l1', title: 'Desk' }] } },
    });
    const result = await searchListings(mock.supabase, 'desk', { ...pageOptions, allMetros: true });
    expect(mock.rpc).toHaveBeenCalledWith('search_listings', { p_query: 'desk', p_metro_id: 'metro-nyc', p_all_metros: true });
    expect(mock.rpcBuilders.search_listings.order).toHaveBeenNthCalledWith(2, 'refreshed_at', { ascending: false });
    expect(result.data?.[0].id).toBe('l1');
    expect(result.hasMore).toBe(false);
  });
});

describe('searchPeople', () => {
  it('ranks local members first and returns public fields only', async () => {
    const mock = createSupabase({
      rpc: {
        search_people: {
          data: [
            {
              id: 'u1',
              full_name: 'Bikash Thapa',
              profile_photo: null,
              trust_level: 2,
              metro_area_id: 'metro-nyc',
              follower_count: 128,
              is_local: true,
              rank: 0.6,
              total_count: 3,
            },
          ],
        },
      },
    });
    const result = await searchPeople(mock.supabase, 'thapa', { metroId: 'metro-nyc', limit: 1, offset: 0 });
    expect(mock.rpc).toHaveBeenCalledWith('search_people', { p_query: 'thapa', p_metro_id: 'metro-nyc' });
    expect(mock.rpcBuilders.search_people.order.mock.calls.map((call) => call[0])).toEqual(['is_local', 'rank', 'follower_count']);
    expect(result.data).toEqual([
      {
        id: 'u1',
        full_name: 'Bikash Thapa',
        profile_photo: null,
        trust_level: 2,
        metro_area_id: 'metro-nyc',
        follower_count: 128,
        is_local: true,
      },
    ]);
    expect(result.hasMore).toBe(true);
    expect(mock.from).not.toHaveBeenCalled();
  });
});

describe('searchSuggestions', () => {
  it('queries all three groups with the suggestion limits', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: { data: [{ id: 'p1', rank: 1, total_count: 7 }] },
        search_listings: { data: [] },
        search_people: { data: [] },
      },
      tables: { posts: { data: [{ id: 'p1', title: 'One', post_tags: [] }] } },
    });

    const result = await searchSuggestions(mock.supabase, 'thapa', { metroId: 'metro-nyc', allMetros: false });

    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 2);
    expect(mock.rpcBuilders.search_listings.range).toHaveBeenCalledWith(0, 1);
    expect(mock.rpcBuilders.search_people.range).toHaveBeenCalledWith(0, 2);
    expect(result.data?.posts).toEqual({ items: [expect.objectContaining({ id: 'p1' })], totalCount: 7, hasMore: true });
    expect(result.data?.listings).toEqual({ items: [], totalCount: 0, hasMore: false });
  });

  it('surfaces the first error', async () => {
    const mock = createSupabase({ rpc: { search_people: { data: null, error: { message: 'people failed' } } } });
    const result = await searchSuggestions(mock.supabase, 'thapa', { metroId: null, allMetros: true });
    expect(result.error?.message).toBe('people failed');
    expect(result.data).toBeUndefined();
  });
});
```

Run: `npm run test --workspace=packages/shared -- src/api/search.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Export `LISTING_SELECT`**

In `packages/shared/src/api/marketplace.ts`, change `const LISTING_SELECT = ` to `export const LISTING_SELECT = `.

- [ ] **Step 3: Implement `packages/shared/src/api/search.ts`**

```ts
/**
 * Global search (web UI overhaul spec §4.4).
 *
 * The search_* database functions (migration 037) return ranked ids plus a
 * window total. Ordering and paging are applied here through PostgREST, then
 * posts and listings are hydrated with their usual selects and put back into
 * rank order. Rows RLS hides from the viewer simply drop out.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEARCH_SUGGESTION_LIMITS } from '../constants/search';
import type { MarketplaceListing } from '../types/marketplace';
import type { Post } from '../types/post';
import type {
  PeopleSearchPageOptions,
  PersonSearchResult,
  SearchGroup,
  SearchPage,
  SearchPageOptions,
  SearchSuggestionsResult,
} from '../types/search';
import { normalizeSearchInput } from '../utils/searchQuery';
import { LISTING_SELECT } from './marketplace';
import { POST_SELECT, flattenPostTags } from './posts';

type RawPost = Parameters<typeof flattenPostTags>[0];
type RankedIdRow = { id: string; total_count: number };

const EMPTY_PAGE = { data: [], totalCount: 0, hasMore: false };

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: unknown } | null)?.message;
  return new Error(typeof message === 'string' ? message : fallback);
}

function inRankOrder<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is T => row !== undefined);
}

async function fetchRankedIds(
  supabase: SupabaseClient,
  fn: 'search_posts' | 'search_listings',
  query: string,
  options: SearchPageOptions,
  tiebreaker: 'created_at' | 'refreshed_at'
): Promise<{ ids: string[]; totalCount: number }> {
  const { data, error } = await supabase
    .rpc(fn, { p_query: query, p_metro_id: options.metroId, p_all_metros: options.allMetros })
    .order('rank', { ascending: false })
    .order(tiebreaker, { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (error) throw error;
  const rows = (data ?? []) as RankedIdRow[];
  return { ids: rows.map((row) => row.id), totalCount: Number(rows[0]?.total_count ?? 0) };
}

export async function searchPosts(
  supabase: SupabaseClient,
  query: string,
  options: SearchPageOptions
): Promise<SearchPage<Post>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { ids, totalCount } = await fetchRankedIds(supabase, 'search_posts', normalized, options, 'created_at');
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };

    const { data, error } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
    if (error) throw error;

    const posts = inRankOrder(((data ?? []) as RawPost[]).map(flattenPostTags), ids);
    return { data: posts, totalCount, hasMore: options.offset + ids.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search posts') };
  }
}

export async function searchListings(
  supabase: SupabaseClient,
  query: string,
  options: SearchPageOptions
): Promise<SearchPage<MarketplaceListing>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { ids, totalCount } = await fetchRankedIds(supabase, 'search_listings', normalized, options, 'refreshed_at');
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };

    const { data, error } = await supabase.from('marketplace_listings_view').select(LISTING_SELECT).in('id', ids);
    if (error) throw error;

    const listings = inRankOrder((data ?? []) as MarketplaceListing[], ids);
    return { data: listings, totalCount, hasMore: options.offset + ids.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search listings') };
  }
}

export async function searchPeople(
  supabase: SupabaseClient,
  query: string,
  options: PeopleSearchPageOptions
): Promise<SearchPage<PersonSearchResult>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { data, error } = await supabase
      .rpc('search_people', { p_query: normalized, p_metro_id: options.metroId })
      .order('is_local', { ascending: false })
      .order('rank', { ascending: false })
      .order('follower_count', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
    if (error) throw error;

    const rows = (data ?? []) as Array<PersonSearchResult & { rank: number; total_count: number }>;
    const totalCount = Number(rows[0]?.total_count ?? 0);
    const people = rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      profile_photo: row.profile_photo,
      trust_level: row.trust_level,
      metro_area_id: row.metro_area_id,
      follower_count: row.follower_count,
      is_local: row.is_local,
    }));
    return { data: people, totalCount, hasMore: options.offset + rows.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search people') };
  }
}

function toGroup<T>(page: SearchPage<T>): SearchGroup<T> {
  return { items: page.data ?? [], totalCount: page.totalCount ?? 0, hasMore: Boolean(page.hasMore) };
}

/** Live-suggestion groups for the search dropdown (3 posts, 2 listings, 3 people). */
export async function searchSuggestions(
  supabase: SupabaseClient,
  query: string,
  scope: { metroId: string | null; allMetros: boolean }
): Promise<SearchSuggestionsResult> {
  const [posts, listings, people] = await Promise.all([
    searchPosts(supabase, query, { ...scope, limit: SEARCH_SUGGESTION_LIMITS.posts, offset: 0 }),
    searchListings(supabase, query, { ...scope, limit: SEARCH_SUGGESTION_LIMITS.listings, offset: 0 }),
    searchPeople(supabase, query, { metroId: scope.metroId, limit: SEARCH_SUGGESTION_LIMITS.people, offset: 0 }),
  ]);

  const error = posts.error ?? listings.error ?? people.error;
  if (error) return { error };

  return { data: { posts: toGroup(posts), listings: toGroup(listings), people: toGroup(people) } };
}
```

In `packages/shared/src/api/index.ts`, add `export * from './search';`.

- [ ] **Step 4: Run and commit**

Run: `npm run test --workspace=packages/shared && npm run type-check --workspace=packages/shared`
Expected: all PASS; no type errors.

```bash
git add packages/shared/src/api/search.ts packages/shared/src/api/search.test.ts packages/shared/src/api/marketplace.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): add ranked search API for posts, listings and people" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3a.4: Security smoke test and schema docs

**Files:**

- Modify: `scripts/security/users-pii-smoke.ts`
- Modify: `docs/architecture/database-schema.md` (insert before `## Data Migration from Firestore`)

**Interfaces:** none.

- [ ] **Step 1: Extend the PII smoke test**

In `scripts/security/users-pii-smoke.ts`, update the header comment list with:

```ts
 *   6. search_people (migration 037) returns public columns only, hides banned
 *      members, and anon cannot call it.
```

Inside `main()`, right after `createdUsers.push(target.id, viewer.id);`, add:

```ts
    const banned = await createFixtureUser(service, 'pii-banned', {
      phone: '+15550142',
      zipCode: '75003',
    });
    createdUsers.push(banned.id);
    const { error: banError } = await service.from('users').update({ is_banned: true }).eq('id', banned.id);
    assertCondition(!banError, `Failed to ban fixture user: ${banError?.message}`);
```

Immediately before `console.log('PASS: users PII smoke test …')`, add:

```ts
    // 6. search_people: public columns only, banned members hidden, anon denied.
    const SEARCH_PEOPLE_COLUMNS = new Set([
      'id',
      'full_name',
      'profile_photo',
      'trust_level',
      'metro_area_id',
      'follower_count',
      'is_local',
      'rank',
      'total_count',
    ]);

    const { data: peopleRows, error: peopleError } = await viewerClient.rpc('search_people', {
      p_query: target.fullName,
      p_metro_id: null,
    });
    assertCondition(!peopleError, `search_people should succeed for members: ${peopleError?.message}`);
    const people = (peopleRows ?? []) as Record<string, unknown>[];
    assertCondition(people.some((row) => row.id === target.id), 'search_people should find the target by name');
    for (const row of people) {
      for (const column of Object.keys(row)) {
        assertCondition(SEARCH_PEOPLE_COLUMNS.has(column), `search_people leaked column "${column}"`);
      }
    }

    const { data: bannedRows } = await viewerClient.rpc('search_people', { p_query: banned.fullName, p_metro_id: null });
    assertCondition(
      !((bannedRows ?? []) as Record<string, unknown>[]).some((row) => row.id === banned.id),
      'search_people must hide banned members'
    );

    const { error: anonSearchError } = await anon.rpc('search_people', { p_query: target.fullName, p_metro_id: null });
    assertCondition(!!anonSearchError, 'anon must not be able to call search_people');
```

- [ ] **Step 2: Run it against the live project**

Run (with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` exported): `npm run test:security:users-pii`
Expected: `PASS: users PII smoke test verified column-level read restrictions.`

If the env vars are not available in this session, ask the user to run it and paste the output. Do not mark the step done without a PASS.

- [ ] **Step 3: Document the search functions**

Insert before `## Data Migration from Firestore` in `docs/architecture/database-schema.md`:

````markdown
### Global search (migration 037)

| Function | Returns | Notes |
|---|---|---|
| `post_search_document(title, description)` | `tsvector` | IMMUTABLE; title weight A, body weight B, `english`. GIN expression index `idx_posts_search_document` |
| `person_search_document(full_name)` | `tsvector` | IMMUTABLE; `simple` (no stemming). GIN expression index `idx_users_person_search_document` |
| `build_prefix_tsquery(input, config)` | `tsquery` | Splits on non-alphanumerics, ANDs words, prefix-matches the last; NULL for empty input |
| `search_posts(p_query, p_metro_id, p_all_metros)` | `id, rank, created_at, total_count` | Active posts; metro + global unless `p_all_metros` |
| `search_listings(p_query, p_metro_id, p_all_metros)` | `id, rank, refreshed_at, total_count` | Active listings; uses `marketplace_listings.search_vector` |
| `search_people(p_query, p_metro_id)` | public columns + `is_local, rank, total_count` | Non-banned members |

All three `search_*` functions are `SECURITY INVOKER` and executable by `authenticated` only, so RLS and migration 036's column grants apply unchanged. Clients order and page the results through PostgREST:

```ts
supabase.rpc('search_posts', { p_query, p_metro_id, p_all_metros })
  .order('rank', { ascending: false })
  .order('created_at', { ascending: false })
  .range(0, 19);
```

Use the shared wrappers in `packages/shared/src/api/search.ts` rather than calling the functions directly.
````

- [ ] **Step 4: Full verification, commit, push**

```bash
npm run lint
npm run type-check
npm run test
npm run docs:check
```

Expected: all succeed.

```bash
git add scripts/security/users-pii-smoke.ts docs/architecture/database-schema.md
git commit -m "test(security): cover search_people in the users PII smoke test" -m "Documents the migration 037 search functions in the schema guide." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Push `feat/search-data` and open its PR. Update the tracker row for PR 3a, and note in it that migration 037 is applied.

---

# PR 3b — Search: web

**Branch:** `feat/search-web`, created from `master` after PR 3a merges **and** migration 037 is live.

**Outcome:**

- Typing in the top bar shows live suggestions (3 posts, 2 listings, 3 people), with a "N more" link per group.
- "See all results" and Enter open `/search`, which has tabs, counts, a metro scope toggle and infinite scroll.
- On phones, a search icon opens a full-screen overlay with the same behaviour.

| Path | Change | Responsibility |
|---|---|---|
| `apps/web/src/components/search/searchUrl.ts` (+ test) | Create | Parse / build `/search` URLs |
| `apps/web/src/hooks/useSearchSuggestions.ts` (+ test) | Create | Debounced, race-safe suggestions |
| `apps/web/src/components/search/SearchResultItem.tsx` (+ css, test) | Create | `Highlight`, result content, hrefs |
| `apps/web/src/components/search/SearchCombobox.tsx` (+ css, test) | Create | Mantine Combobox (dropdown or inline) |
| `apps/web/src/components/layout/breakpoints.ts` | Create | Shared phone media query |
| `apps/web/src/components/search/SearchOverlay.tsx`, `components/layout/SearchEntry.tsx` (+ test) | Create | Phone overlay / wide combobox switch |
| `apps/web/src/components/Layout.tsx`, `Layout.test.tsx` | Modify | Pass `SearchEntry` into `TopBar` |
| `apps/web/src/hooks/useSearchPage.ts` (+ test) | Create | Results page data |
| `apps/web/src/pages/search.page.tsx`, `styles/Search.module.css` (+ test) | Create | S1 results page |
| `apps/web/e2e/helpers/supabase-mock.ts`, `e2e/tests/12-search.spec.ts`, `e2e/visual/pages.ts` | Modify / Create | Search mocks, e2e, screenshots |
| `docs/product/features/search.md`, `docs/INDEX.md` | Create / Modify | Evergreen feature doc |

### Task 3b.1: URL helpers and `useSearchSuggestions`

**Files:**

- Create: `apps/web/src/components/search/searchUrl.ts`, `searchUrl.test.ts`
- Create: `apps/web/src/hooks/useSearchSuggestions.ts`, `useSearchSuggestions.test.tsx`

**Interfaces:**

- Consumes: `searchSuggestions`, `normalizeSearchInput`, `SEARCH_DEBOUNCE_MS`, `SearchTab`, `SearchSuggestions` (PR 3a).
- Produces:
  - `parseSearchParams(query: ParsedUrlQuery): { q: string; tab: SearchTab; allMetros: boolean }`
  - `buildSearchHref(params: { q: string; tab?: SearchTab; allMetros?: boolean }): string`
  - `useSearchSuggestions(input: string, scope: { metroId: string | null; allMetros: boolean }): { query: string | null; data: SearchSuggestions | null; loading: boolean; error: Error | null }`

- [ ] **Step 1: Create the PR branch**

```bash
git switch master && git pull --ff-only && git switch -c feat/search-web
```

- [ ] **Step 2: Write the failing tests**

`apps/web/src/components/search/searchUrl.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSearchHref, parseSearchParams } from './searchUrl';

describe('parseSearchParams', () => {
  it('reads q, tab and scope', () => {
    expect(parseSearchParams({ q: 'thapa', tab: 'people', scope: 'all' })).toEqual({ q: 'thapa', tab: 'people', allMetros: true });
  });

  it('defaults unknown or missing values', () => {
    expect(parseSearchParams({ tab: 'bogus' })).toEqual({ q: '', tab: 'all', allMetros: false });
    expect(parseSearchParams({ q: ['a', 'b'] })).toEqual({ q: 'a', tab: 'all', allMetros: false });
  });
});

describe('buildSearchHref', () => {
  it('omits defaults', () => {
    expect(buildSearchHref({ q: 'room' })).toBe('/search?q=room');
  });

  it('encodes the query and adds tab and scope', () => {
    expect(buildSearchHref({ q: "thapa's momo", tab: 'posts', allMetros: true })).toBe(
      "/search?q=thapa%27s+momo&tab=posts&scope=all"
    );
  });
});
```

`apps/web/src/hooks/useSearchSuggestions.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchSuggestionsResult } from '@nepally/shared';

const searchSuggestionsMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  searchSuggestions: searchSuggestionsMock,
}));

import { useSearchSuggestions } from './useSearchSuggestions';

const empty = { items: [], totalCount: 0, hasMore: false };
const result = (title: string): SearchSuggestionsResult => ({
  data: { posts: { items: [{ id: title, title } as never], totalCount: 1, hasMore: false }, listings: empty, people: empty },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const scope = { metroId: 'metro-nyc', allMetros: false };

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchSuggestionsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 250ms after typing before searching', async () => {
    searchSuggestionsMock.mockResolvedValue(result('Room'));
    const { result: hook } = renderHook(({ input }) => useSearchSuggestions(input, scope), { initialProps: { input: 'ro' } });

    expect(searchSuggestionsMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(searchSuggestionsMock).toHaveBeenCalledWith({}, 'ro', scope);
    expect(hook.current.data?.posts.items[0].title).toBe('Room');
    expect(hook.current.loading).toBe(false);
  });

  it('does not search below two characters', async () => {
    const { result: hook } = renderHook(() => useSearchSuggestions('r', scope));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(searchSuggestionsMock).not.toHaveBeenCalled();
    expect(hook.current.query).toBeNull();
    expect(hook.current.data).toBeNull();
  });

  it('ignores a slow response that arrives after a newer one', async () => {
    const slow = deferred<SearchSuggestionsResult>();
    const fast = deferred<SearchSuggestionsResult>();
    searchSuggestionsMock.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    const { result: hook, rerender } = renderHook(({ input }) => useSearchSuggestions(input, scope), {
      initialProps: { input: 'tha' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    rerender({ input: 'thapa' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      fast.resolve(result('Newest'));
    });
    await act(async () => {
      slow.resolve(result('Stale'));
    });

    expect(hook.current.query).toBe('thapa');
    expect(hook.current.data?.posts.items[0].title).toBe('Newest');
  });

  it('exposes errors', async () => {
    searchSuggestionsMock.mockResolvedValue({ error: new Error('offline') });
    const { result: hook } = renderHook(() => useSearchSuggestions('room', scope));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(hook.current.error?.message).toBe('offline');
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/search/searchUrl.test.ts src/hooks/useSearchSuggestions.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `searchUrl.ts`**

```ts
import type { ParsedUrlQuery } from 'querystring';
import type { SearchTab } from '@nepally/shared';

const TABS: SearchTab[] = ['all', 'posts', 'listings', 'people'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads /search?q=&tab=&scope= with safe defaults. */
export function parseSearchParams(query: ParsedUrlQuery): { q: string; tab: SearchTab; allMetros: boolean } {
  const tab = first(query.tab);
  return {
    q: first(query.q) ?? '',
    tab: TABS.includes(tab as SearchTab) ? (tab as SearchTab) : 'all',
    allMetros: first(query.scope) === 'all',
  };
}

/** Builds a shareable /search URL; defaults (tab=all, metro scope) are omitted. */
export function buildSearchHref({ q, tab = 'all', allMetros = false }: { q: string; tab?: SearchTab; allMetros?: boolean }): string {
  const params = new URLSearchParams({ q });
  if (tab !== 'all') params.set('tab', tab);
  if (allMetros) params.set('scope', 'all');
  return `/search?${params.toString()}`;
}
```

- [ ] **Step 4: Implement `apps/web/src/hooks/useSearchSuggestions.ts`**

```ts
import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { SEARCH_DEBOUNCE_MS, normalizeSearchInput, searchSuggestions } from '@nepally/shared';
import type { SearchSuggestions } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export interface SearchSuggestionsState {
  /** The normalized query the data belongs to (null when too short). */
  query: string | null;
  data: SearchSuggestions | null;
  loading: boolean;
  error: Error | null;
}

/** Live suggestions after a pause in typing; responses for stale queries are ignored. */
export function useSearchSuggestions(
  input: string,
  scope: { metroId: string | null; allMetros: boolean }
): SearchSuggestionsState {
  const [debounced] = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const query = normalizeSearchInput(debounced);
  const [state, setState] = useState<Omit<SearchSuggestionsState, 'query'>>({ data: null, loading: false, error: null });
  const latestRequest = useRef(0);
  const { metroId, allMetros } = scope;

  useEffect(() => {
    const requestId = ++latestRequest.current;
    if (!query) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));
    void searchSuggestions(supabase, query, { metroId, allMetros }).then((result) => {
      if (requestId !== latestRequest.current) return;
      setState({ data: result.data ?? null, loading: false, error: result.error ?? null });
    });
  }, [query, metroId, allMetros]);

  return { query, ...state };
}
```

- [ ] **Step 5: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/search/searchUrl.test.ts src/hooks/useSearchSuggestions.test.tsx`
Expected: all PASS.

```bash
git add apps/web/src/components/search/searchUrl.ts apps/web/src/components/search/searchUrl.test.ts apps/web/src/hooks/useSearchSuggestions.ts apps/web/src/hooks/useSearchSuggestions.test.tsx
git commit -m "feat(web): add search URL helpers and debounced suggestions hook" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3b.2: `Highlight` and `SearchResultItem`

**Files:**

- Create: `apps/web/src/components/search/SearchResultItem.tsx`, `SearchResultItem.module.css`, `SearchResultItem.test.tsx`

**Interfaces:**

- Consumes: `highlightSegments`, `formatRelativeTime`, `getShortMetroName`; `TagChip`, `ScopeBadge`, `TrustBadge`, `Avatar`.
- Produces:
  - `type SearchResult = { kind: 'post'; post: Post } | { kind: 'listing'; listing: MarketplaceListing } | { kind: 'person'; person: PersonSearchResult }`
  - `getSearchResultHref(result: SearchResult): string`
  - `Highlight({ text: string; query: string | null })`
  - `SearchResultItem({ result: SearchResult; query: string | null; compact?: boolean })`
- `SearchResultItem` renders **non-interactive** content, and the caller wraps it in an option or link.

- [ ] **Step 1: Write the failing test `SearchResultItem.test.tsx`**

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import type { MarketplaceListing, PersonSearchResult, Post } from '@nepally/shared';
import { Highlight, SearchResultItem, getSearchResultHref, type SearchResult } from './SearchResultItem';

const post = {
  id: 'p1',
  title: 'Thapa Catering: momo orders open',
  description: 'Dashain orders',
  created_at: new Date().toISOString(),
  is_global: false,
  author: { id: 'u1', full_name: 'Bikash Thapa', trust_level: 2, profile_photo: null },
  tags: [{ id: 't1', slug: 'jobs', name: 'Jobs' }],
} as unknown as Post;

const listing = {
  id: 'l1',
  title: "Thapa's NCLEX prep book set",
  price: '$40',
  photos: [],
  category: { name: 'Education' },
} as unknown as MarketplaceListing;

const person: PersonSearchResult = {
  id: 'u2',
  full_name: 'Anjali Thapa',
  profile_photo: null,
  trust_level: 1,
  metro_area_id: 'metro-nyc',
  follower_count: 34,
  is_local: true,
};

describe('Highlight', () => {
  it('wraps matching words in <mark>', () => {
    const { container } = render(<Highlight text="Thapa Catering" query="tha" />);
    expect(Array.from(container.querySelectorAll('mark')).map((mark) => mark.textContent)).toEqual(['Thapa']);
  });
});

describe('getSearchResultHref', () => {
  it.each<[SearchResult, string]>([
    [{ kind: 'post', post }, '/posts/p1'],
    [{ kind: 'listing', listing }, '/marketplace/listing/l1'],
    [{ kind: 'person', person }, '/users/u2'],
  ])('links %o to %s', (result, href) => {
    expect(getSearchResultHref(result)).toBe(href);
  });
});

describe('SearchResultItem', () => {
  it('shows a post with author and tag', () => {
    render(<SearchResultItem result={{ kind: 'post', post }} query="thapa" />);
    expect(screen.getByText('Catering: momo orders open', { exact: false })).toBeDefined();
    expect(screen.getByText(/Bikash Thapa/)).toBeDefined();
    expect(screen.getByText('Jobs')).toBeDefined();
  });

  it('shows a listing with its price', () => {
    render(<SearchResultItem result={{ kind: 'listing', listing }} query="thapa" />);
    expect(screen.getByText('$40')).toBeDefined();
  });

  it('shows a person with trust tier and locality', () => {
    render(<SearchResultItem result={{ kind: 'person', person }} query="thapa" />);
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByText(/In your metro/)).toBeDefined();
  });

  it('contains no interactive elements', () => {
    const { container } = render(<SearchResultItem result={{ kind: 'post', post }} query="thapa" />);
    expect(container.querySelector('a, button, input')).toBeNull();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/search/SearchResultItem.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `SearchResultItem.tsx`**

```tsx
import React from 'react';
import { formatRelativeTime, highlightSegments } from '@nepally/shared';
import type { MarketplaceListing, PersonSearchResult, Post } from '@nepally/shared';
import Avatar from '../Avatar';
import { ScopeBadge, TagChip, TrustBadge } from '../ui';
import styles from './SearchResultItem.module.css';

export type SearchResult =
  | { kind: 'post'; post: Post }
  | { kind: 'listing'; listing: MarketplaceListing }
  | { kind: 'person'; person: PersonSearchResult };

export function getSearchResultHref(result: SearchResult): string {
  if (result.kind === 'post') return `/posts/${result.post.id}`;
  if (result.kind === 'listing') return `/marketplace/listing/${result.listing.id}`;
  return `/users/${result.person.id}`;
}

export function Highlight({ text, query }: { text: string; query: string | null }) {
  return (
    <>
      {highlightSegments(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.mark}>
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </>
  );
}

export interface SearchResultItemProps {
  result: SearchResult;
  query: string | null;
  /** Dense single-line layout for the suggestion dropdown. */
  compact?: boolean;
}

/** Visual content of one result. Callers provide the link or combobox option around it. */
export function SearchResultItem({ result, query, compact = false }: SearchResultItemProps) {
  const rootClass = compact ? `${styles.root} ${styles.compact}` : styles.root;

  if (result.kind === 'post') {
    const { post } = result;
    const firstTag = post.tags?.[0];
    return (
      <div className={rootClass}>
        <div className={styles.body}>
          <span className={styles.title}>
            <Highlight text={post.title} query={query} />
          </span>
          <span className={styles.meta}>
            {post.author?.full_name ? `${post.author.full_name} · ` : ''}
            {formatRelativeTime(new Date(post.created_at))}
          </span>
          {!compact ? (
            <span className={styles.chips}>
              {post.tags?.map((tag) => <TagChip key={tag.id} slug={tag.slug} label={tag.name} />)}
              <ScopeBadge isGlobal={post.is_global} />
            </span>
          ) : null}
        </div>
        {compact && firstTag ? <span className={styles.aside}>{firstTag.name}</span> : null}
      </div>
    );
  }

  if (result.kind === 'listing') {
    const { listing } = result;
    const photo = listing.photos?.[0];
    return (
      <div className={rootClass}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.thumb} aria-hidden="true" />
        )}
        <div className={styles.body}>
          <span className={styles.title}>
            <Highlight text={listing.title} query={query} />
          </span>
          {!compact && listing.category?.name ? <span className={styles.meta}>{listing.category.name}</span> : null}
        </div>
        {listing.price ? <span className={styles.price}>{listing.price}</span> : null}
      </div>
    );
  }

  const { person } = result;
  return (
    <div className={rootClass}>
      <Avatar name={person.full_name} photoUrl={person.profile_photo} trustLevel={person.trust_level} size={compact ? 'small' : 'medium'} />
      <div className={styles.body}>
        <span className={styles.title}>
          <Highlight text={person.full_name} query={query} />
        </span>
        <span className={styles.meta}>
          {person.is_local ? 'In your metro · ' : ''}
          {person.follower_count} {person.follower_count === 1 ? 'follower' : 'followers'}
        </span>
      </div>
      <TrustBadge level={person.trust_level} />
    </div>
  );
}
```

- [ ] **Step 3: Create `SearchResultItem.module.css`**

```css
.root {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  line-height: var(--leading-snug);
  color: var(--text-1);
}

.compact .title {
  overflow: hidden;
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta,
.aside {
  font-size: var(--font-size-xs);
  color: var(--text-3);
}

.aside {
  flex-shrink: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-control);
  background: var(--surface-sunken);
  object-fit: cover;
}

.compact .thumb {
  width: 32px;
  height: 32px;
}

.price {
  flex-shrink: 0;
  font-weight: var(--font-weight-semibold);
  color: var(--action-bg);
}

.mark {
  padding: 0 2px;
  border-radius: var(--radius-chip);
  background: var(--accent-tint);
  color: inherit;
}
```

- [ ] **Step 4: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/search/SearchResultItem.test.tsx`
Expected: all PASS.

```bash
git add apps/web/src/components/search/SearchResultItem.tsx apps/web/src/components/search/SearchResultItem.module.css apps/web/src/components/search/SearchResultItem.test.tsx
git commit -m "feat(web): add search result rendering with match highlighting" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3b.3: `SearchCombobox`

**Files:**

- Create: `apps/web/src/components/search/SearchCombobox.tsx`, `SearchCombobox.module.css`, `SearchCombobox.test.tsx`

**Interfaces:**

- Consumes: `useSearchSuggestions` and `buildSearchHref` (3b.1); `SearchResultItem` and `getSearchResultHref` (3b.2); `useLocation`; `getShortMetroName`.
- Produces `SearchCombobox({ layout?: 'dropdown' | 'inline'; autoFocus?: boolean; onNavigate?: () => void })`.
  - The input is labelled "Search Nepally".
  - Option values are `post:<id>`, `listing:<id>`, `person:<id>`, `more:posts|listings|people`, `scope:all` and `all`.

- [ ] **Step 1: Write the failing test `SearchCombobox.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchSuggestions } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useSearchSuggestions: vi.fn(),
}));

vi.mock('next/router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({ activeLocation: { metro_area_id: 'metro-nyc', metro_name: 'New York-Newark-Jersey City' } }),
}));
vi.mock('../../hooks/useSearchSuggestions', () => ({ useSearchSuggestions: mocks.useSearchSuggestions }));

import { SearchCombobox } from './SearchCombobox';

const empty = { items: [], totalCount: 0, hasMore: false };
const suggestions: SearchSuggestions = {
  posts: {
    items: [{ id: 'p1', title: 'Thapa Catering', created_at: new Date().toISOString(), tags: [] } as never],
    totalCount: 4,
    hasMore: true,
  },
  listings: empty,
  people: {
    items: [{ id: 'u1', full_name: 'Bikash Thapa', profile_photo: null, trust_level: 2, metro_area_id: 'metro-nyc', follower_count: 3, is_local: true }],
    totalCount: 1,
    hasMore: false,
  },
};

function typeQuery(text: string) {
  const input = screen.getByRole('textbox', { name: 'Search Nepally' });
  fireEvent.change(input, { target: { value: text } });
  return input;
}

describe('SearchCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchSuggestions.mockImplementation((input: string) => ({
      query: input.trim().length >= 2 ? input.trim() : null,
      data: input.trim().length >= 2 ? suggestions : null,
      loading: false,
      error: null,
    }));
  });

  it('shows grouped suggestions for the current metro', async () => {
    render(<SearchCombobox />);
    typeQuery('thapa');
    expect(await screen.findByText('Posts in New York-Newark')).toBeDefined();
    expect(screen.getByText('People')).toBeDefined();
    expect(screen.getByRole('option', { name: /3 more posts/ })).toBeDefined();
  });

  it('opens a result', async () => {
    const onNavigate = vi.fn();
    render(<SearchCombobox onNavigate={onNavigate} />);
    typeQuery('thapa');
    fireEvent.click(await screen.findByRole('option', { name: /Bikash Thapa/ }));
    expect(mocks.push).toHaveBeenCalledWith('/users/u1');
    expect(onNavigate).toHaveBeenCalled();
  });

  it('opens the results page on the matching tab from "more"', async () => {
    render(<SearchCombobox />);
    typeQuery('thapa');
    fireEvent.click(await screen.findByRole('option', { name: /3 more posts/ }));
    expect(mocks.push).toHaveBeenCalledWith('/search?q=thapa&tab=posts');
  });

  it('goes to all results on Enter with nothing highlighted', async () => {
    render(<SearchCombobox />);
    const input = typeQuery('thapa');
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/search?q=thapa'));
  });

  it('opens the highlighted option with arrow keys and Enter', async () => {
    render(<SearchCombobox />);
    const input = typeQuery('thapa');
    await screen.findByRole('option', { name: /Thapa Catering/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/posts/p1'));
  });

  it('offers all metros when nothing matches locally', async () => {
    mocks.useSearchSuggestions.mockImplementation((input: string, scope: { allMetros: boolean }) => ({
      query: input.trim() || null,
      data: scope.allMetros ? suggestions : { posts: empty, listings: empty, people: empty },
      loading: false,
      error: null,
    }));
    render(<SearchCombobox />);
    typeQuery('zzz');
    expect(await screen.findByText('No matches in New York-Newark')).toBeDefined();
    fireEvent.click(screen.getByRole('option', { name: 'Search all metros' }));
    await waitFor(() =>
      expect(mocks.useSearchSuggestions).toHaveBeenLastCalledWith('zzz', { metroId: 'metro-nyc', allMetros: true })
    );
  });
});
```

(`getShortMetroName('New York-Newark-Jersey City')` returns `New York-Newark`: it drops the last hyphenated segment.)

Run: `npm run test --workspace=apps/web -- src/components/search/SearchCombobox.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `SearchCombobox.tsx`**

```tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Combobox, Loader, Text, TextInput, useCombobox } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getShortMetroName } from '@nepally/shared';
import type { SearchTab } from '@nepally/shared';
import { useLocation } from '../../hooks/useLocation';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import { SearchResultItem, getSearchResultHref, type SearchResult } from './SearchResultItem';
import { buildSearchHref } from './searchUrl';
import styles from './SearchCombobox.module.css';

export interface SearchComboboxProps {
  /** `dropdown` floats under the top-bar input; `inline` lists results below it (phone overlay). */
  layout?: 'dropdown' | 'inline';
  autoFocus?: boolean;
  /** Called after navigating away, e.g. to close the phone overlay. */
  onNavigate?: () => void;
}

const GROUP_NOUNS: Record<Exclude<SearchTab, 'all'>, string> = { posts: 'posts', listings: 'listings', people: 'people' };

export function SearchCombobox({ layout = 'dropdown', autoFocus = false, onNavigate }: SearchComboboxProps) {
  const router = useRouter();
  const { activeLocation } = useLocation();
  const [value, setValue] = useState('');
  const [allMetros, setAllMetros] = useState(false);
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const metroId = activeLocation?.metro_area_id ?? null;
  const metroLabel = activeLocation ? getShortMetroName(activeLocation.metro_name) : 'your area';
  const { query, data, loading, error } = useSearchSuggestions(value, { metroId, allMetros });

  const results = new Map<string, SearchResult>();
  data?.posts.items.forEach((post) => results.set(`post:${post.id}`, { kind: 'post', post }));
  data?.listings.items.forEach((listing) => results.set(`listing:${listing.id}`, { kind: 'listing', listing }));
  data?.people.items.forEach((person) => results.set(`person:${person.id}`, { kind: 'person', person }));
  const isEmpty = Boolean(data) && results.size === 0;

  const navigate = (href: string) => {
    combobox.closeDropdown();
    onNavigate?.();
    void router.push(href);
  };

  const handleOptionSubmit = (optionValue: string) => {
    if (!query) return;
    if (optionValue === 'all') return navigate(buildSearchHref({ q: query, allMetros }));
    if (optionValue === 'scope:all') {
      setAllMetros(true);
      return;
    }
    if (optionValue.startsWith('more:')) {
      return navigate(buildSearchHref({ q: query, tab: optionValue.slice(5) as SearchTab, allMetros }));
    }
    const result = results.get(optionValue);
    if (result) navigate(getSearchResultHref(result));
  };

  const renderGroup = (tab: Exclude<SearchTab, 'all'>, label: string) => {
    const group = data?.[tab];
    if (!group || group.items.length === 0) return null;
    const prefix = tab === 'posts' ? 'post' : tab === 'listings' ? 'listing' : 'person';
    return (
      <Combobox.Group label={label}>
        {group.items.map((item) => {
          const key = `${prefix}:${item.id}`;
          return (
            <Combobox.Option key={key} value={key} className={styles.option}>
              <SearchResultItem result={results.get(key)!} query={query} compact />
            </Combobox.Option>
          );
        })}
        {group.hasMore ? (
          <Combobox.Option value={`more:${tab}`} className={styles.more}>
            {group.totalCount - group.items.length} more {GROUP_NOUNS[tab]} →
          </Combobox.Option>
        ) : null}
      </Combobox.Group>
    );
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSubmit}
      withinPortal={layout === 'dropdown'}
      position="bottom-start"
      width={layout === 'dropdown' ? 520 : undefined}
      classNames={layout === 'inline' ? { dropdown: styles.inlineDropdown } : undefined}
    >
      <Combobox.Target>
        <TextInput
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            if (layout === 'dropdown') combobox.closeDropdown();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && query && combobox.getSelectedOptionIndex() === -1) {
              event.preventDefault();
              navigate(buildSearchHref({ q: query, allMetros }));
            }
          }}
          placeholder="Search posts, listings, people"
          aria-label="Search Nepally"
          leftSection={<IconSearch size={16} aria-hidden="true" />}
          rightSection={loading ? <Loader size="xs" /> : null}
          autoFocus={autoFocus}
          className={styles.input}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={!query}>
        <Combobox.Options className={styles.options}>
          {error ? <Combobox.Empty>Search is unavailable right now</Combobox.Empty> : null}
          {renderGroup('posts', allMetros ? 'Posts' : `Posts in ${metroLabel}`)}
          {renderGroup('listings', 'Listings')}
          {renderGroup('people', 'People')}
          {isEmpty && !loading ? (
            <>
              <Combobox.Empty>{allMetros ? 'No matches anywhere yet' : `No matches in ${metroLabel}`}</Combobox.Empty>
              {!allMetros ? (
                <Combobox.Option value="scope:all" className={styles.more}>
                  Search all metros
                </Combobox.Option>
              ) : null}
            </>
          ) : null}
          {query && !isEmpty ? (
            <Combobox.Option value="all" className={styles.seeAll}>
              See all results for “{query}”
            </Combobox.Option>
          ) : null}
        </Combobox.Options>
        {layout === 'dropdown' ? (
          <Combobox.Footer>
            <Text size="xs" c="dimmed">
              ↑ ↓ to move · Enter to open · Esc to close
            </Text>
          </Combobox.Footer>
        ) : null}
      </Combobox.Dropdown>
    </Combobox>
  );
}
```

- [ ] **Step 3: Create `SearchCombobox.module.css`**

```css
.input {
  width: 100%;
}

.options {
  max-height: min(70vh, 520px);
  overflow-y: auto;
}

.option {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
}

.option[data-combobox-selected] {
  background: var(--surface-2);
  box-shadow: inset 3px 0 0 var(--accent);
}

.more,
.seeAll {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--action-bg);
}

.seeAll {
  margin-top: var(--space-1);
  border-top: 1px solid var(--border-subtle);
}

/* Phone overlay: results flow under the input instead of floating. */
.inlineDropdown {
  position: static !important;
  width: 100% !important;
  margin-top: var(--space-3);
  border: none;
  box-shadow: none;
  transform: none !important;
}
```

- [ ] **Step 4: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components/search/SearchCombobox.test.tsx`
Expected: 6 PASS.

```bash
git add apps/web/src/components/search/SearchCombobox.tsx apps/web/src/components/search/SearchCombobox.module.css apps/web/src/components/search/SearchCombobox.test.tsx
git commit -m "feat(web): add keyboard-accessible search combobox with live suggestions" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3b.4: Phone overlay and top-bar search entry

**Files:**

- Create: `apps/web/src/components/layout/breakpoints.ts`
- Create: `apps/web/src/components/search/SearchOverlay.tsx`
- Create: `apps/web/src/components/layout/SearchEntry.tsx`, `SearchEntry.test.tsx`
- Modify: `apps/web/src/components/layout/NotificationBell.tsx`, `apps/web/src/pages/feed.page.tsx` (use the shared query)
- Modify: `apps/web/src/components/Layout.tsx`, `apps/web/src/components/Layout.test.tsx`

**Interfaces:**

- Produces `PHONE_MEDIA_QUERY = '(max-width: 47.99em)'`.
- Produces `SearchOverlay({ opened: boolean; onClose(): void })`.
- Produces `SearchEntry()`. On phones it is a "Search" icon button that opens the overlay; on wider screens it is the inline `SearchCombobox`.
- `Layout` passes `<SearchEntry />` to `TopBar`'s `search` slot.

- [ ] **Step 1: Share the phone media query**

Create `apps/web/src/components/layout/breakpoints.ts`:

```ts
/** Matches phones: below $mantine-breakpoint-sm (48em). Use for behaviour, not styling. */
export const PHONE_MEDIA_QUERY = '(max-width: 47.99em)';
```

- In `NotificationBell.tsx`, delete `const PHONE_QUERY = '(max-width: 47.99em)';` and its comment, add `import { PHONE_MEDIA_QUERY } from './breakpoints';`, and use `useMediaQuery(PHONE_MEDIA_QUERY)`.
- In `feed.page.tsx`, add `import { PHONE_MEDIA_QUERY } from '../components/layout/breakpoints';` and change `useMediaQuery('(max-width: 47.99em)')` to `useMediaQuery(PHONE_MEDIA_QUERY)`.

- [ ] **Step 2: Write the failing test `SearchEntry.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../search/SearchCombobox', () => ({
  SearchCombobox: ({ layout, onNavigate }: { layout?: string; onNavigate?: () => void }) =>
    React.createElement(
      'div',
      null,
      React.createElement('input', { 'aria-label': 'Search Nepally', 'data-layout': layout ?? 'dropdown' }),
      React.createElement('button', { type: 'button', onClick: onNavigate }, 'Pick result')
    ),
}));

import { SearchEntry } from './SearchEntry';

function mockPhone(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  );
}

describe('SearchEntry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dropdown combobox on wide screens', () => {
    mockPhone(false);
    render(<SearchEntry />);
    expect(screen.getByRole('textbox', { name: 'Search Nepally' }).getAttribute('data-layout')).toBe('dropdown');
  });

  it('opens a full-screen overlay from an icon on phones and closes it after navigation', async () => {
    mockPhone(true);
    render(<SearchEntry />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-layout="inline"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pick result' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
```

Run: `npm run test --workspace=apps/web -- src/components/layout/SearchEntry.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `SearchOverlay` and `SearchEntry`**

`apps/web/src/components/search/SearchOverlay.tsx`:

```tsx
import React from 'react';
import { Modal } from '@mantine/core';
import { SearchCombobox } from './SearchCombobox';

export interface SearchOverlayProps {
  opened: boolean;
  onClose: () => void;
}

/** Full-screen search for phones; results list inline under the input. */
export function SearchOverlay({ opened, onClose }: SearchOverlayProps) {
  return (
    <Modal opened={opened} onClose={onClose} fullScreen title="Search" radius={0} transitionProps={{ transition: 'fade', duration: 120 }}>
      <SearchCombobox layout="inline" autoFocus onNavigate={onClose} />
    </Modal>
  );
}
```

`apps/web/src/components/layout/SearchEntry.tsx`:

```tsx
import React from 'react';
import { ActionIcon } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { SearchCombobox } from '../search/SearchCombobox';
import { SearchOverlay } from '../search/SearchOverlay';
import { PHONE_MEDIA_QUERY } from './breakpoints';

/** Top-bar search: inline combobox on wide screens, icon + overlay on phones. */
export function SearchEntry() {
  const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);
  const [opened, { open, close }] = useDisclosure(false);

  if (!isPhone) return <SearchCombobox />;

  return (
    <>
      <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Search" onClick={open}>
        <IconSearch size={22} aria-hidden="true" />
      </ActionIcon>
      <SearchOverlay opened={opened} onClose={close} />
    </>
  );
}
```

- [ ] **Step 4: Wire it into Layout**

In `Layout.tsx`, add `import { SearchEntry } from './layout/SearchEntry';` and pass `search={<SearchEntry />}` to `<TopBar …>`.

In `Layout.test.tsx`, add next to the other mocks:

```tsx
vi.mock('./layout/SearchEntry', () => ({
  SearchEntry: () => React.createElement('input', { 'aria-label': 'Search Nepally' }),
}));
```

and add inside `describe('signed in')`:

```tsx
    it('puts search in the top bar', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByRole('textbox', { name: 'Search Nepally' })).toBeDefined();
    });
```

- [ ] **Step 5: Run and commit**

Run: `npm run test --workspace=apps/web -- src/components`
Expected: all PASS.

```bash
git add apps/web/src/components/layout/breakpoints.ts apps/web/src/components/layout/SearchEntry.tsx apps/web/src/components/layout/SearchEntry.test.tsx apps/web/src/components/layout/NotificationBell.tsx apps/web/src/components/search/SearchOverlay.tsx apps/web/src/components/Layout.tsx apps/web/src/components/Layout.test.tsx apps/web/src/pages/feed.page.tsx
git commit -m "feat(web): add search to the top bar with a full-screen phone overlay" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3b.5: Results page

**Files:**

- Create: `apps/web/src/hooks/useSearchPage.ts`, `useSearchPage.test.tsx`
- Create: `apps/web/src/pages/search.page.tsx`, `apps/web/src/pages/search.test.tsx`, `apps/web/src/styles/Search.module.css`

**Interfaces:**

- Consumes: `searchSuggestions`, `searchPosts`, `searchListings`, `searchPeople`, `SEARCH_PAGE_SIZE`; `parseSearchParams`, `buildSearchHref`, `SearchResultItem`, `getSearchResultHref`; `useInfiniteScroll`; `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`.
- Produces `useSearchPage(options: { query: string | null; tab: SearchTab; allMetros: boolean; metroId: string | null }): SearchPageState`, where `SearchPageState = { preview: SearchSuggestions | null; counts: { posts: number; listings: number; people: number } | null; items: SearchResult[]; loading: boolean; loadingMore: boolean; hasMore: boolean; error: Error | null; loadMore(): void; retry(): void }`.
- Produces the route `/search?q=&tab=&scope=`.

- [ ] **Step 1: Write the failing hook test `apps/web/src/hooks/useSearchPage.test.tsx`**

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchSuggestions: vi.fn(),
  searchPosts: vi.fn(),
  searchListings: vi.fn(),
  searchPeople: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  ...mocks,
}));

import { useSearchPage } from './useSearchPage';

const group = (items: unknown[], totalCount: number) => ({ items, totalCount, hasMore: totalCount > items.length });
const base = { query: 'thapa', allMetros: false, metroId: 'metro-nyc' };

describe('useSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchSuggestions.mockResolvedValue({
      data: { posts: group([{ id: 'p1' }], 4), listings: group([], 0), people: group([{ id: 'u1' }], 1) },
    });
    mocks.searchPosts.mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], totalCount: 4, hasMore: true });
  });

  it('loads the preview and counts for the All tab', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'all' }));
    await waitFor(() => expect(result.current.counts).toEqual({ posts: 4, listings: 0, people: 1 }));
    expect(mocks.searchPosts).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('loads the first page of a type tab', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(mocks.searchPosts).toHaveBeenCalledWith({}, 'thapa', { metroId: 'metro-nyc', allMetros: false, limit: 20, offset: 0 });
    expect(result.current.items[0]).toEqual({ kind: 'post', post: { id: 'p1' } });
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    mocks.searchPosts.mockResolvedValueOnce({ data: [{ id: 'p3' }, { id: 'p4' }], totalCount: 4, hasMore: false });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(mocks.searchPosts).toHaveBeenLastCalledWith({}, 'thapa', expect.objectContaining({ offset: 2 }));
    expect(result.current.hasMore).toBe(false);
  });

  it('searches people without a metro filter flag', async () => {
    mocks.searchPeople.mockResolvedValue({ data: [{ id: 'u1' }], totalCount: 1, hasMore: false });
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'people' }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mocks.searchPeople).toHaveBeenCalledWith({}, 'thapa', { metroId: 'metro-nyc', limit: 20, offset: 0 });
  });

  it('surfaces errors and retries', async () => {
    mocks.searchPosts.mockResolvedValueOnce({ error: new Error('offline') });
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });

  it('does nothing without a query', () => {
    renderHook(() => useSearchPage({ ...base, query: null, tab: 'all' }));
    expect(mocks.searchSuggestions).not.toHaveBeenCalled();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/hooks/useSearchPage.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `apps/web/src/hooks/useSearchPage.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_PAGE_SIZE, searchListings, searchPeople, searchPosts, searchSuggestions } from '@nepally/shared';
import type { SearchPage, SearchSuggestions, SearchTab } from '@nepally/shared';
import type { SearchResult } from '../components/search/SearchResultItem';
import { supabase } from '../lib/supabase';

type TypeTab = Exclude<SearchTab, 'all'>;
type FetchOptions = { metroId: string | null; allMetros: boolean; limit: number; offset: number };

const FETCH_TAB: Record<TypeTab, (query: string, options: FetchOptions) => Promise<SearchPage<SearchResult>>> = {
  posts: async (query, options) => {
    const page = await searchPosts(supabase, query, options);
    return { ...page, data: page.data?.map((post): SearchResult => ({ kind: 'post', post })) };
  },
  listings: async (query, options) => {
    const page = await searchListings(supabase, query, options);
    return { ...page, data: page.data?.map((listing): SearchResult => ({ kind: 'listing', listing })) };
  },
  people: async (query, { metroId, limit, offset }) => {
    const page = await searchPeople(supabase, query, { metroId, limit, offset });
    return { ...page, data: page.data?.map((person): SearchResult => ({ kind: 'person', person })) };
  },
};

export interface UseSearchPageOptions {
  query: string | null;
  tab: SearchTab;
  allMetros: boolean;
  metroId: string | null;
}

export interface SearchPageState {
  preview: SearchSuggestions | null;
  counts: Record<TypeTab, number> | null;
  items: SearchResult[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  retry: () => void;
}

/** Data for /search: top results + counts for every tab, and a paged list for the active type tab. */
export function useSearchPage({ query, tab, allMetros, metroId }: UseSearchPageOptions): SearchPageState {
  const [preview, setPreview] = useState<SearchSuggestions | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previewRequest = useRef(0);
  const listRequest = useRef(0);

  useEffect(() => {
    const requestId = ++previewRequest.current;
    setError(null);
    if (!query) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    void searchSuggestions(supabase, query, { metroId, allMetros }).then((result) => {
      if (requestId !== previewRequest.current) return;
      setPreviewLoading(false);
      setPreview(result.data ?? null);
      if (result.error) setError(result.error);
    });
  }, [query, metroId, allMetros, attempt]);

  useEffect(() => {
    const requestId = ++listRequest.current;
    setItems([]);
    setHasMore(false);
    setLoadingMore(false);
    if (!query || tab === 'all') {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    void FETCH_TAB[tab](query, { metroId, allMetros, limit: SEARCH_PAGE_SIZE, offset: 0 }).then((page) => {
      if (requestId !== listRequest.current) return;
      setListLoading(false);
      if (page.error) {
        setError(page.error);
        return;
      }
      setItems(page.data ?? []);
      setHasMore(Boolean(page.hasMore));
    });
  }, [query, tab, metroId, allMetros, attempt]);

  const loadMore = useCallback(() => {
    if (!query || tab === 'all' || loadingMore || !hasMore) return;
    const requestId = listRequest.current;
    setLoadingMore(true);
    void FETCH_TAB[tab](query, { metroId, allMetros, limit: SEARCH_PAGE_SIZE, offset: items.length }).then((page) => {
      if (requestId !== listRequest.current) return;
      setLoadingMore(false);
      if (page.error) {
        setError(page.error);
        return;
      }
      setItems((previous) => [...previous, ...(page.data ?? [])]);
      setHasMore(Boolean(page.hasMore));
    });
  }, [query, tab, metroId, allMetros, loadingMore, hasMore, items.length]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return {
    preview,
    counts: preview
      ? { posts: preview.posts.totalCount, listings: preview.listings.totalCount, people: preview.people.totalCount }
      : null,
    items,
    loading: tab === 'all' ? previewLoading : listLoading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    retry,
  };
}
```

Run: `npm run test --workspace=apps/web -- src/hooks/useSearchPage.test.tsx`
Expected: 6 PASS.

- [ ] **Step 3: Write the failing page test `apps/web/src/pages/search.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  useSearchPage: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('../hooks/useSearchPage', () => ({ useSearchPage: mocks.useSearchPage }));
vi.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ activeLocation: { metro_area_id: 'metro-nyc', metro_name: 'New York-Newark-Jersey City' } }),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    ({ href, children, ...rest }, ref) => React.createElement('a', { href, ref, ...rest }, children)
  ),
}));

import SearchPage from './search.page';

const post = { id: 'p1', title: 'Thapa Catering', created_at: new Date().toISOString(), is_global: false, tags: [] };
const state = (overrides = {}) => ({
  preview: {
    posts: { items: [post], totalCount: 4, hasMore: true },
    listings: { items: [], totalCount: 0, hasMore: false },
    people: { items: [], totalCount: 0, hasMore: false },
  },
  counts: { posts: 4, listings: 0, people: 0 },
  items: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null,
  loadMore: vi.fn(),
  retry: vi.fn(),
  ...overrides,
});

function setRoute(query: Record<string, string>) {
  mocks.useRouter.mockReturnValue({ query, replace: mocks.replace, pathname: '/search' });
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: 'u1' } });
    mocks.useSearchPage.mockReturnValue(state());
    setRoute({ q: 'thapa' });
  });

  it('redirects signed-out visitors to login', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<SearchPage />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('prompts for a query when q is missing', () => {
    setRoute({});
    render(<SearchPage />);
    expect(screen.getByRole('heading', { name: 'Search Nepally' })).toBeDefined();
  });

  it('shows the query, counts and the All preview', () => {
    render(<SearchPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Results for “thapa”' })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Posts\s*4/ })).toBeDefined();
    expect(screen.getByRole('link', { name: /Thapa Catering/ }).getAttribute('href')).toBe('/posts/p1');
    expect(mocks.useSearchPage).toHaveBeenCalledWith({ query: 'thapa', tab: 'all', allMetros: false, metroId: 'metro-nyc' });
  });

  it('switches tabs through the URL', () => {
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Posts/ }));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=thapa&tab=posts', undefined, { shallow: true, scroll: false });
  });

  it('widens the scope through the URL', () => {
    render(<SearchPage />);
    fireEvent.click(screen.getByLabelText('All metros'));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=thapa&scope=all', undefined, { shallow: true, scroll: false });
  });

  it('lists a type tab and offers all metros when empty', () => {
    setRoute({ q: 'zzz', tab: 'listings' });
    mocks.useSearchPage.mockReturnValue(state({ items: [] }));
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Search all metros' }));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=zzz&tab=listings&scope=all', undefined, { shallow: true, scroll: false });
  });

  it('offers retry on error', () => {
    const retry = vi.fn();
    mocks.useSearchPage.mockReturnValue(state({ error: new Error('offline'), retry }));
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
```

Run: `npm run test --workspace=apps/web -- src/pages/search.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `apps/web/src/pages/search.page.tsx`**

```tsx
import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, SegmentedControl, Tabs } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getShortMetroName, normalizeSearchInput } from '@nepally/shared';
import type { SearchSuggestions, SearchTab } from '@nepally/shared';
import { SearchResultItem, getSearchResultHref, type SearchResult } from '../components/search/SearchResultItem';
import { buildSearchHref, parseSearchParams } from '../components/search/searchUrl';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useLocation } from '../hooks/useLocation';
import { useSearchPage } from '../hooks/useSearchPage';
import styles from '../styles/Search.module.css';

type TypeTab = Exclude<SearchTab, 'all'>;

const TABS: SearchTab[] = ['all', 'posts', 'listings', 'people'];
const TAB_LABELS: Record<SearchTab, string> = { all: 'All', posts: 'Posts', listings: 'Listings', people: 'People' };

function resultKey(result: SearchResult): string {
  if (result.kind === 'post') return `post:${result.post.id}`;
  if (result.kind === 'listing') return `listing:${result.listing.id}`;
  return `person:${result.person.id}`;
}

function previewResults(preview: SearchSuggestions, tab: TypeTab): SearchResult[] {
  if (tab === 'posts') return preview.posts.items.map((post) => ({ kind: 'post', post }));
  if (tab === 'listings') return preview.listings.items.map((listing) => ({ kind: 'listing', listing }));
  return preview.people.items.map((person) => ({ kind: 'person', person }));
}

function ResultList({ results, query }: { results: SearchResult[]; query: string }) {
  return (
    <ul className={styles.list}>
      {results.map((result) => (
        <li key={resultKey(result)}>
          <Link href={getSearchResultHref(result)} className={styles.resultLink}>
            <SearchResultItem result={result} query={query} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();
  const { q, tab, allMetros } = parseSearchParams(router.query);
  const query = normalizeSearchInput(q);
  const metroLabel = activeLocation ? getShortMetroName(activeLocation.metro_name) : 'My metro';
  const state = useSearchPage({ query, tab, allMetros, metroId: activeLocation?.metro_area_id ?? null });
  const { sentinelRef } = useInfiniteScroll({ hasMore: state.hasMore, loading: state.loadingMore, onLoadMore: state.loadMore });

  useEffect(() => {
    if (!user) void router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const updateUrl = (next: { tab?: SearchTab; allMetros?: boolean }) => {
    void router.replace(
      buildSearchHref({ q: query ?? '', tab: next.tab ?? tab, allMetros: next.allMetros ?? allMetros }),
      undefined,
      { shallow: true, scroll: false }
    );
  };

  const allMetrosAction = allMetros ? undefined : (
    <Button variant="default" onClick={() => updateUrl({ allMetros: true })}>
      Search all metros
    </Button>
  );

  if (!query) {
    return (
      <>
        <Head>
          <title>Search - Nepally</title>
        </Head>
        <PageHeader title="Search" />
        <EmptyState
          icon={<IconSearch size={22} />}
          title="Search Nepally"
          description="Use the search bar to find posts, marketplace listings and people."
        />
      </>
    );
  }

  const totalCount = state.counts ? state.counts.posts + state.counts.listings + state.counts.people : null;

  return (
    <>
      <Head>
        <title>{`Search: ${query} - Nepally`}</title>
      </Head>
      <PageHeader
        title={`Results for “${query}”`}
        actions={
          <SegmentedControl
            aria-label="Search scope"
            value={allMetros ? 'all' : 'metro'}
            onChange={(value) => updateUrl({ allMetros: value === 'all' })}
            data={[
              { value: 'metro', label: metroLabel },
              { value: 'all', label: 'All metros' },
            ]}
          />
        }
      />

      {state.error ? <ErrorState message="We couldn't load search results." onRetry={state.retry} /> : null}

      <Tabs value={tab} onChange={(value) => value && updateUrl({ tab: value as SearchTab })} keepMounted={false}>
        <Tabs.List aria-label="Result types" className={styles.tabs}>
          {TABS.map((key) => {
            const count = key === 'all' ? totalCount : state.counts?.[key] ?? null;
            return (
              <Tabs.Tab
                key={key}
                value={key}
                rightSection={count === null ? null : <Badge variant="light" color="ink" size="sm">{count}</Badge>}
              >
                {TAB_LABELS[key]}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        <Tabs.Panel value="all" className={styles.panel}>
          {state.loading || !state.preview ? (
            <LoadingState label="Searching…" />
          ) : totalCount === 0 ? (
            <EmptyState title={`Nothing matches “${query}”`} description={allMetros ? undefined : `Nothing in ${metroLabel} yet.`} action={allMetrosAction} />
          ) : (
            (['posts', 'listings', 'people'] as TypeTab[]).map((key) => {
              const group = state.preview![key];
              if (group.items.length === 0) return null;
              return (
                <section key={key} aria-labelledby={`search-${key}`} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 id={`search-${key}`} className={styles.sectionTitle}>
                      {TAB_LABELS[key]}
                    </h2>
                    {group.hasMore ? (
                      <Button variant="subtle" size="compact-sm" onClick={() => updateUrl({ tab: key })}>
                        See all {group.totalCount} {TAB_LABELS[key].toLowerCase()} →
                      </Button>
                    ) : null}
                  </div>
                  <ResultList results={previewResults(state.preview!, key)} query={query} />
                </section>
              );
            })
          )}
        </Tabs.Panel>

        {(['posts', 'listings', 'people'] as TypeTab[]).map((key) => (
          <Tabs.Panel key={key} value={key} className={styles.panel}>
            {state.loading ? (
              <LoadingState label="Searching…" />
            ) : state.items.length === 0 ? (
              <EmptyState
                title={`No ${TAB_LABELS[key].toLowerCase()} match “${query}”`}
                description={allMetros ? undefined : `Nothing in ${metroLabel} yet.`}
                action={allMetrosAction}
              />
            ) : (
              <>
                <ResultList results={state.items} query={query} />
                <div ref={sentinelRef} />
                {state.loadingMore ? <LoadingState count={1} label="Loading more…" /> : null}
              </>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/styles/Search.module.css`**

```css
.tabs {
  margin-bottom: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sectionHeader {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.sectionTitle {
  font-size: var(--font-size-xl);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.resultLink {
  display: block;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-1);
  color: inherit;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.resultLink:hover {
  border-color: var(--border-solid);
}
```

- [ ] **Step 6: Run and commit**

Run: `npm run test --workspace=apps/web -- src/hooks/useSearchPage.test.tsx src/pages/search.test.tsx && npm run type-check --workspace=apps/web`
Expected: all PASS; no type errors.

```bash
git add apps/web/src/hooks/useSearchPage.ts apps/web/src/hooks/useSearchPage.test.tsx apps/web/src/pages/search.page.tsx apps/web/src/pages/search.test.tsx apps/web/src/styles/Search.module.css
git commit -m "feat(web): add /search results page with tabs, counts and metro scope" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3b.6: E2E, screenshots, feature doc, verification

**Files:**

- Create: `apps/web/e2e/helpers/search-mock.ts`
- Create: `apps/web/e2e/tests/12-search.spec.ts`, `apps/web/e2e/tests/phone/search.spec.ts`
- Modify: `apps/web/e2e/visual/pages.ts`, `apps/web/e2e/visual/pages.visual.spec.ts`
- Create: `docs/product/features/search.md`
- Modify: `docs/INDEX.md`

**Interfaces:**

- Produces `mockSearchRoutes(page: Page): Promise<void>`.
- `VisualPage` gains an optional `projects?: Array<'visual-desktop' | 'visual-phone'>`.

- [ ] **Step 1: Create `apps/web/e2e/helpers/search-mock.ts`**

```ts
import type { Page } from '@playwright/test';
import { MOCK_METRO_ID, MOCK_POSTS } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Deterministic search_* RPC responses: 1 of 4 posts, no listings, 1 person. Call after mockSupabaseLoggedIn. */
export async function mockSearchRoutes(page: Page): Promise<void> {
  await page.route('**/rest/v1/rpc/search_posts**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([{ id: MOCK_POSTS[0].id, rank: 0.8, created_at: MOCK_POSTS[0].created_at, total_count: 4 }]),
    });
  });
  await page.route('**/rest/v1/rpc/search_listings**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: '[]' });
  });
  await page.route('**/rest/v1/rpc/search_people**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([
        {
          id: 'person-e2e-001',
          full_name: 'Bikash Thapa',
          profile_photo: null,
          trust_level: 2,
          metro_area_id: MOCK_METRO_ID,
          follower_count: 12,
          is_local: true,
          rank: 0.5,
          total_count: 1,
        },
      ]),
    });
  });
}
```

- [ ] **Step 2: Create `apps/web/e2e/tests/12-search.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { MOCK_POSTS } from '../fixtures/mock-data';
import { mockSearchRoutes } from '../helpers/search-mock';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';

test.describe('Global search', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockSearchRoutes(page);
    await page.goto('/feed');
  });

  test('suggests results while typing and opens one', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
    const option = page.getByRole('option', { name: new RegExp(MOCK_POSTS[0].title) });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await expect(page).toHaveURL(new RegExp(`/posts/${MOCK_POSTS[0].id}$`));
  });

  test('"more posts" opens the Posts tab', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
    await page.getByRole('option', { name: /3 more posts/ }).click();
    await expect(page).toHaveURL(/\/search\?q=thapa&tab=posts/);
    await expect(page.getByRole('tab', { name: /Posts/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('Enter opens all results and the scope toggle updates the URL', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Search Nepally' });
    await input.fill('thapa');
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10_000 });
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=thapa$/);
    await expect(page.getByRole('heading', { name: 'Results for “thapa”' })).toBeVisible();
    await page.getByText('All metros', { exact: true }).click();
    await expect(page).toHaveURL(/scope=all/);
  });
});
```

- [ ] **Step 3: Create `apps/web/e2e/tests/phone/search.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../../fixtures/auth';
import { mockSearchRoutes } from '../../helpers/search-mock';
import { mockSupabaseLoggedIn } from '../../helpers/supabase-mock';

test('phone search opens a full-screen overlay with suggestions', async ({ page }) => {
  await injectAuthSession(page);
  await mockSupabaseLoggedIn(page);
  await mockSearchRoutes(page);
  await page.goto('/feed');

  await page.getByRole('button', { name: 'Search' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
  await expect(dialog.getByRole('option', { name: /Bikash Thapa/ })).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole('option', { name: /Bikash Thapa/ }).click();
  await expect(page).toHaveURL(/\/users\/person-e2e-001$/);
  await expect(dialog).toBeHidden();
});
```

Run: `npm run test:e2e --workspace=apps/web`
Expected: all specs PASS, including `12-search` (chromium) and `phone/search` (phone).

- [ ] **Step 4: Add search screenshots**

In `apps/web/e2e/visual/pages.ts`:

- Add `import { mockSearchRoutes } from '../helpers/search-mock';`.
- Add `projects?: Array<'visual-desktop' | 'visual-phone'>;` to `VisualPage`, with the comment `/** Limit to these projects (default: both). */`.
- Append these entries to `VISUAL_PAGES`:

```ts
  {
    name: 'search-results',
    path: '/search?q=thapa',
    signedIn: true,
    setup: mockSearchRoutes,
    ready: (page) => heading(page, /results for “thapa”/i),
  },
  {
    name: 'search-dropdown',
    path: '/feed',
    signedIn: true,
    projects: ['visual-desktop'],
    setup: mockSearchRoutes,
    ready: async (page) => {
      await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
      await expect(page.getByRole('option', { name: /Bikash Thapa/ })).toBeVisible(READY_TIMEOUT);
    },
  },
```

In `pages.visual.spec.ts`, add as the first line inside the test body:

```ts
    test.skip(Boolean(entry.projects && !entry.projects.includes(testInfo.project.name as 'visual-desktop' | 'visual-phone')), 'Not captured for this project');
```

Run:

```bash
npm run test:visual:docker --workspace=apps/web -- --update
npm run test:visual:docker --workspace=apps/web
npm run test:visual:docker --workspace=apps/web -- --write-a11y-baseline
git diff apps/web/e2e/visual/a11y-baseline.json
```

Expected:

- New `search-results` PNGs for desktop and phone, and a desktop `search-dropdown` PNG.
- The second run PASSES.
- The a11y diff adds **no** entries for the new search pages and removes nothing else. If it adds any, fix those violations in the search components, re-run, and do not keep them in the baseline.

- [ ] **Step 5: Write `docs/product/features/search.md`**

```markdown
# Feature: Global Search

**Status:** Approved
**Phase:** 1
**Last Updated:** 2026-09-15
**Priority:** Medium

---

## Overview

Signed-in members can search community posts, marketplace listings and people from anywhere on the web app. Results default to the member's current metro, so local, practical content like rooms and jobs stays on top. One toggle widens the search to every metro.

## User stories

- As a member, I want suggestions while I type, so I can jump straight to a post, listing or person.
- As a member, I want a full results page with a tab per type, so I can scan everything that matches.
- As a member, I want to widen a search to all metros when nothing local matches.
- As a member on a phone, I want search to take the full screen so results are readable.

## Behaviour

| Surface | Behaviour |
|---|---|
| Top bar (≥48em) | Combobox. Suggestions after 2+ characters and a 250ms pause: Posts (3), Listings (2), People (3). Each group links "N more …" to its results tab. "See all results" and Enter (with nothing highlighted) open `/search`. ↑/↓, Enter and Esc work from the keyboard |
| Phone (<48em) | A search icon opens a full-screen overlay with the same suggestions |
| No local matches | "No matches in {metro}" with a **Search all metros** option |
| `/search?q=&tab=&scope=` | Tabs All · Posts · Listings · People with counts. "All" previews each type; type tabs scroll infinitely. Tab and scope live in the URL (shareable, Back-safe). Matching words are highlighted |

**Scope rules:**
- Posts and listings show the member's metro plus global items, or every metro with `scope=all`.
- People are searched nationwide, with members in the viewer's metro first.
- Only active posts and listings appear. Banned members never appear.
- Search is for signed-in members only.

**Matching:** full-text prefix matching, so "tha" finds "Thapa". Post titles rank above body text. Names are matched without stemming.

## Technical

- **Database:** `supabase/migrations/037_search.sql`. See [architecture/database-schema.md](../../architecture/database-schema.md) → "Global search".
- **Shared API:** `packages/shared/src/api/search.ts` (`searchPosts`, `searchListings`, `searchPeople`, `searchSuggestions`); helpers in `utils/searchQuery.ts`.
- **Web:**
  - `components/search/*` and `components/layout/SearchEntry.tsx`
  - `hooks/useSearchSuggestions.ts` and `hooks/useSearchPage.ts`
  - `pages/search.page.tsx`
- **Privacy:** `search_people` returns public profile columns only (`npm run test:security:users-pii`).
- **Not yet:** events search, mobile app UI, and search for signed-out visitors.
```

In `docs/INDEX.md` → **Feature specs**, add after the `post-likes-and-comments.md` line:

```markdown
- [product/features/search.md](product/features/search.md) — global search: suggestions, results page, metro scope
```

- [ ] **Step 6: Shrink allowlists, full verification, commit, push**

```bash
node scripts/guard-css-tokens.js --write-allowlist
node apps/web/eslint/write-raw-element-allowlist.mjs
git diff scripts/guard-css-tokens.allowlist.json apps/web/eslint/raw-element-allowlist.mjs
npm run lint
npm run lint:guards
npm run type-check
npm run test
npm run test:e2e:web
npm run test:visual:web
npm run docs:check
```

Expected: the allowlist diffs are empty or only remove entries, and every command succeeds.

```bash
git add apps/web/e2e docs/product/features/search.md docs/INDEX.md scripts/guard-css-tokens.allowlist.json apps/web/eslint/raw-element-allowlist.mjs
git commit -m "test(web): cover global search in e2e and visual tests; document the feature" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Confirm with the user that migration 037 is live on the target project. Then push `feat/search-web` and open its PR. Update the tracker row for PR 3b.

---

# PR 3c — Search follow-ups

The review of PR #65 left five small search defects open (decision 21). Web does not show the first one, because PR 3b avoids it. Mobile search (launch plan W4, UX-02) will use the same shared API, though, so **land this PR before UX-02**. That way mobile does not have to copy the web workarounds. The PR does not depend on PRs 4–10.

**Branch:** `fix/search-follow-ups`, stacked on `docs/web-ui-overhaul-gaps` (PR #78), which adds this section. The draft PR targets that branch, as #66 targeted #65's, and moves to `master` when #78 merges.

**Scope:** shared code, its tests, and docs. No migration and no web component changes. The visual baselines stay valid, because the visual tests search `thapa`, which has no ending to strip.

## PR 3c — Design (agreed 2026-09-19)

1. **Totals on empty pages.** `fetchRankedIds` and `searchPeople` read the total from `rows[0]`, so a page past the end reports `totalCount: 0`. Web never reads totals from later pages (decisions 13 and 22), but `SearchPage.totalCount` promises the total "across all pages", and mobile will call the same API.
   - **Fix:** one helper, `fetchRankedPage(run, offset, limit)`, where `run(from, to)` builds the ordered RPC query. When a page after the first comes back empty, it runs the query again for one row (`run(0, 0)`) and reads the total from that. A normal page makes no extra request. Posts, listings and people all use the helper, which replaces the three `rows[0]?.total_count` reads.
   - **Rejected:** returning `totalCount: undefined` for those pages. It is cheaper, but it pushes an "unknown" case onto every caller.
2. **`EMPTY_PAGE`** becomes `emptyPage()`, which returns a new object on every call. No caller mutates the shared object today; this makes that impossible rather than a convention.
3. **Truncation counts code points.** `normalizeSearchInput` uses `Array.from` instead of UTF-16 units, both for the 100-character cut and for the 2-character minimum. The web input has no `maxLength`, so today a pasted long query can end in half an emoji. Side effect: a single emoji is no longer long enough to search.
4. **Highlighting follows common English endings.** A private `highlightStem(word)` changes only words made of a–z, so Devanagari and mixed words are untouched. It:
   - strips one ending: `-ies` becomes `-i`, else `-es`, else `-s` (not after another `s`), else `-ing`, else `-ed` (not `-eed`), and never leaves fewer than 3 letters;
   - after `-ing` or `-ed`, undoubles a final `bb`/`dd`/`ff`/`gg`/`mm`/`nn`/`pp`/`rr`/`tt` (`running` → `run`), again never below 3 letters;
   - then turns a final `y` into `i` or drops a final `e`, but only on words longer than 3 letters.

   A word is highlighted when it starts with a query word (today's rule, needed while typing) **or** its stem equals that query word's stem. Stems are compared for equality, not as prefixes, so `ride` does not mark `ridge`.

   - **Evidence:** stems read from `nusa-staging` with `ts_lexize('english_stem', …)` group room/rooms, job/jobs, house/houses/housing, rent/rents/renting/rented, city/cities, share/shared/sharing, nurse/nurses/nursing, study/studies/studying, class/classes, ride/rides/riding, hire/hiring/hired, move/moving/moved, park/parking and clean/cleaning. A simulation of the rules above puts every group on one stem, and keeps sold/sell and cleaner/cleaning apart, as Postgres does. These pairs are the test table.
   - **Accepted over-highlights:** `news` marks `new`, and `buses` marks `bus` (Postgres stems them `news`/`new` and `buse`/`bus`). Each needs a result that already matched on another word.
5. **Count cost: deferred, no change in this PR.** An `EXPLAIN` on `nusa-staging` (2026-09-19) shows `Function Scan on search_posts` under the sort and limit. `SET search_path` stops Postgres from inlining the functions, so every call returns all matches whatever the count does, and dropping `count(*) OVER ()` would only save one pass over rows already in memory.
   - **The real fix:** move ordering, paging and a capped count into the functions. That means new signatures, a migration (`039` became the storage-policy fix and the launch plan's reserved migration moved to `040`) and "100+" labels in the combobox and tabs.
   - **When:** once monitoring shows search latency climbing, for example a p95 above 300 ms. At launch scale a search takes a few milliseconds.

**Done when:** shared and web tests pass, `npm run ci:local` passes, `docs:check` passes, the "Matching" line in [search.md](../../product/features/search.md) says highlighting follows plurals and `-ing`/`-ed` forms, and the PR 3c tracker row says Merged.

## PR 3c — Task breakdown

Work on `fix/search-follow-ups`, branched from `docs/web-ui-overhaul-gaps`. Tasks are independent, so they can be done in any order, but the commits read best in this one.

Two notes before starting:

- `packages/shared/src/api/search.ts`, `searchQuery.ts` and their tests do not satisfy Prettier today (`printWidth` is 100, several lines are longer), and no lint rule enforces it. Match the style around your change; do not reformat existing lines, which would bury the change in noise.
- The visual baselines do not move. The visual tests search `thapa`, which has no ending to strip, so no screenshot changes and no baseline run is needed.

### Task 3c.1: Count query length in code points

**Files:**

- Modify: `packages/shared/src/utils/searchQuery.ts:6-11`
- Test: `packages/shared/src/utils/searchQuery.test.ts`

**Interfaces:** `normalizeSearchInput(raw: string | null | undefined): string | null` keeps its signature. Both the 100-character cut and the 2-character minimum count code points.

- [ ] **Step 1: Add the failing tests** to the end of the `describe('normalizeSearchInput', …)` block

```ts
  it('never splits an emoji at the length limit', () => {
    expect(normalizeSearchInput(`${'x'.repeat(99)}😀tail`)).toBe(`${'x'.repeat(99)}😀`);
  });

  it('counts the limits in code points, not UTF-16 units', () => {
    expect(Array.from(normalizeSearchInput('😀'.repeat(150)) ?? '')).toHaveLength(100);
    expect(normalizeSearchInput('😀')).toBeNull();
  });

  it('counts a Devanagari vowel sign as its own character', () => {
    expect(normalizeSearchInput('रा')).toBe('रा');
  });
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`

Expected: FAIL. The first test cuts at 100 UTF-16 units and ends in a lone `\uD83D`; the second keeps only 50 emoji and treats one emoji as long enough to search. The Devanagari test passes already and guards the new code.

- [ ] **Step 3: Replace `normalizeSearchInput`**

```ts
/**
 * Trims, collapses whitespace and truncates; null when too short to search.
 * Lengths count code points, so a cut never leaves half an emoji.
 */
export function normalizeSearchInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const normalized = Array.from(collapsed).slice(0, SEARCH_MAX_QUERY_LENGTH).join('').trim();
  return Array.from(normalized).length >= SEARCH_MIN_QUERY_LENGTH ? normalized : null;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`

Expected: PASS, including the older truncation and minimum-length tests.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/utils/searchQuery.ts packages/shared/src/utils/searchQuery.test.ts
git commit -m "fix(search): count query length in code points" -m "slice() counted UTF-16 units, so truncating a pasted query could leave half an emoji, and a single emoji counted as two characters." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3c.2: Highlight plurals and -ing/-ed forms

**Files:**

- Modify: `packages/shared/src/utils/searchQuery.ts:18-46`
- Test: `packages/shared/src/utils/searchQuery.test.ts`

**Interfaces:** `highlightSegments(text, query)` keeps its signature. A new module-private `highlightStem(word: string): string` is not exported, so it is tested through `highlightSegments`.

- [ ] **Step 1: Add the failing tests** at the end of the test file

```ts
describe('highlightSegments with English word endings', () => {
  // Each pair shares one Postgres `english` stem, read with
  // ts_lexize('english_stem', …) on nusa-staging (2026-09-19), so the database
  // already matches these to each other.
  const SAME_STEM: Array<[query: string, word: string]> = [
    ['rooms', 'Room'],
    ['jobs', 'Job'],
    ['houses', 'Housing'],
    ['housing', 'house'],
    ['renting', 'rented'],
    ['cities', 'City'],
    ['sharing', 'shared'],
    ['nurses', 'Nursing'],
    ['studies', 'studying'],
    ['classes', 'class'],
    ['riding', 'rides'],
    ['hiring', 'Hired'],
    ['moving', 'move'],
    ['parking', 'Park'],
    ['cleaning', 'clean'],
    ['running', 'run'],
    ['speeds', 'speed'],
  ];

  it.each(SAME_STEM)('"%s" highlights "%s"', (query, word) => {
    expect(highlightSegments(word, query)).toEqual([{ text: word, match: true }]);
  });

  // The database keeps these apart: irregular forms, a different suffix, and a
  // word that would only match if a stem were allowed to shrink below 3 letters.
  const DIFFERENT_STEM: Array<[query: string, word: string]> = [
    ['sold', 'sell'],
    ['cleaner', 'cleaning'],
    ['ride', 'ridge'],
    ['bed', 'be'],
  ];

  it.each(DIFFERENT_STEM)('"%s" does not highlight "%s"', (query, word) => {
    expect(highlightSegments(word, query)).toEqual([{ text: word, match: false }]);
  });

  it('marks inflected words inside a sentence', () => {
    expect(highlightSegments('Room for rent in Queens', 'rooms renting')).toEqual([
      { text: 'Room', match: true },
      { text: ' for ', match: false },
      { text: 'rent', match: true },
      { text: ' in Queens', match: false },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`

Expected: FAIL — the 17 `SAME_STEM` cases and the sentence test. None of those words starts with its query word, which is all today's rule checks. The four `DIFFERENT_STEM` cases pass already and guard against over-matching.

- [ ] **Step 3: Replace everything from `const WORD` to the end of the file**

```ts
const WORD = /[\p{L}\p{M}\p{N}]+/u;
const TOKENS = /[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu;

/** Below this, a stem is left whole, so "is" or "bed" cannot match everything. */
const MIN_STEM_LENGTH = 3;
const LATIN_WORD = /^[a-z]+$/;
const DOUBLED_FINAL = /([bdfgmnprt])\1$/;

interface EndingRule {
  ending: string;
  replacement: string;
  /** -ing and -ed can leave a doubled consonant: running → runn → run. */
  undouble: boolean;
  /** A longer ending that blocks the rule: "class" is no plural, "speed" no past tense. */
  unless?: string;
}

/** Checked in order; the first rule that applies is the only one applied. */
const ENDING_RULES: readonly EndingRule[] = [
  { ending: 'ies', replacement: 'i', undouble: false },
  { ending: 'es', replacement: '', undouble: false },
  { ending: 's', replacement: '', undouble: false, unless: 'ss' },
  { ending: 'ing', replacement: '', undouble: true },
  { ending: 'ed', replacement: '', undouble: true, unless: 'eed' },
];

function stripEnding(word: string): { stem: string; undouble: boolean } {
  const rule = ENDING_RULES.find(
    (candidate) => word.endsWith(candidate.ending) && !(candidate.unless && word.endsWith(candidate.unless))
  );
  if (!rule) return { stem: word, undouble: false };

  const stem = word.slice(0, -rule.ending.length) + rule.replacement;
  return stem.length >= MIN_STEM_LENGTH ? { stem, undouble: rule.undouble } : { stem: word, undouble: false };
}

function undoubleFinal(stem: string): string {
  return stem.length > MIN_STEM_LENGTH && DOUBLED_FINAL.test(stem) ? stem.slice(0, -1) : stem;
}

function normalizeFinal(stem: string): string {
  if (stem.length <= MIN_STEM_LENGTH) return stem;
  if (stem.endsWith('y')) return `${stem.slice(0, -1)}i`;
  if (stem.endsWith('e')) return stem.slice(0, -1);
  return stem;
}

/**
 * Approximates the `english` stems the database matches on, so "rooms" marks
 * "Room" and "houses" marks "Housing". It covers plurals and -ing/-ed forms of
 * lowercase a–z words; every other word is returned unchanged.
 */
function highlightStem(word: string): string {
  if (!LATIN_WORD.test(word)) return word;
  const { stem, undouble } = stripEnding(word);
  return normalizeFinal(undouble ? undoubleFinal(stem) : stem);
}

/**
 * Splits text into matched / unmatched runs for rendering <mark>. A word
 * matches when it starts with any query word, mirroring the database's prefix
 * matching ("tha" highlights "Thapa"), or when it shares a query word's stem
 * ("rooms" highlights "Room"). Adjacent runs with the same state merge.
 */
export function highlightSegments(text: string, query: string | null): HighlightSegment[] {
  if (!text) return [];
  const queryWords = (query ?? '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (queryWords.length === 0) return [{ text, match: false }];
  const queryStems = new Set(queryWords.map(highlightStem));

  const segments: HighlightSegment[] = [];
  for (const [token] of text.matchAll(TOKENS)) {
    const lower = token.toLocaleLowerCase();
    const match =
      WORD.test(token) &&
      (queryWords.some((word) => lower.startsWith(word)) || queryStems.has(highlightStem(lower)));
    const previous = segments[segments.length - 1];
    if (previous && previous.match === match) {
      previous.text += token;
    } else {
      segments.push({ text: token, match });
    }
  }
  return segments;
}
```

- [ ] **Step 4: Run the shared tests and watch them pass**

Run: `npm run test --workspace=packages/shared -- src/utils/searchQuery.test.ts`

Expected: PASS, all cases including the earlier Devanagari and multi-word tests.

- [ ] **Step 5: Run the web search tests, which render the highlights**

Run: `npm run test --workspace=apps/web -- src/components/search`

Expected: PASS, unchanged. Those tests query for "tha", which behaves exactly as before.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/searchQuery.ts packages/shared/src/utils/searchQuery.test.ts
git commit -m "feat(search): highlight plural and -ing/-ed forms of query words" -m "The database matches English stems, so \"rooms\" returned \"Room for rent\" with nothing marked. Highlighting now also compares a light stem of each word, covering plurals and -ing/-ed forms." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3c.3: Return a new empty page for each empty query

**Files:**

- Modify: `packages/shared/src/api/search.ts:28` and the three `return EMPTY_PAGE;` lines (68, 90, 112)
- Test: `packages/shared/src/api/search.test.ts`

**Interfaces:** module-private `emptyPage<T>(): SearchPage<T>` replaces the `EMPTY_PAGE` constant. No exported signature changes.

- [ ] **Step 1: Add the failing test** at the end of `search.test.ts`, and add `import type { SearchPage } from '../types/search';` below the existing type import

```ts
describe('queries below the minimum length', () => {
  const searches: Array<[name: string, search: (supabase: SupabaseClient) => Promise<SearchPage<unknown>>]> = [
    ['searchPosts', (supabase) => searchPosts(supabase, 'a', pageOptions)],
    ['searchListings', (supabase) => searchListings(supabase, 'a', pageOptions)],
    ['searchPeople', (supabase) => searchPeople(supabase, 'a', { metroId: null, limit: 3, offset: 0 })],
  ];

  it.each(searches)('%s returns a new empty page every call', async (_name, search) => {
    const mock = createSupabase({});

    const first = await search(mock.supabase);
    const second = await search(mock.supabase);

    expect(first).toEqual({ data: [], totalCount: 0, hasMore: false });
    expect(second).not.toBe(first);
    expect(second.data).not.toBe(first.data);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test --workspace=packages/shared -- src/api/search.test.ts`

Expected: FAIL on all three cases at `expect(second).not.toBe(first)`, because every empty result is the same `EMPTY_PAGE` object.

- [ ] **Step 3: Replace the constant with a function**

Replace `const EMPTY_PAGE = { data: [], totalCount: 0, hasMore: false };` with:

```ts
/** A new object per call, so no caller can change what another empty search returns. */
function emptyPage<T>(): SearchPage<T> {
  return { data: [], totalCount: 0, hasMore: false };
}
```

Then change the three early returns, giving each its own type argument:

- in `searchPosts`: `if (!normalized) return emptyPage<Post>();`
- in `searchListings`: `if (!normalized) return emptyPage<MarketplaceListing>();`
- in `searchPeople`: `if (!normalized) return emptyPage<PersonSearchResult>();`

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm run test --workspace=packages/shared -- src/api/search.test.ts`

Expected: PASS, including the older "skips the database for queries shorter than 2 characters" tests.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/search.ts packages/shared/src/api/search.test.ts
git commit -m "fix(search): return a new empty page for each empty query" -m "All three search functions returned one shared EMPTY_PAGE object, so a caller that changed it would change what every other empty search returns." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3c.4: Report the real total on a page past the end

**Files:**

- Modify: `packages/shared/src/api/search.ts:41-140` (`fetchRankedIds` and all three search functions)
- Test: `packages/shared/src/api/search.test.ts` (the `createSupabase` helper and three new tests)

**Interfaces (both module-private):**

- `type RankedQuery = (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>`
- `fetchRankedPage<Row extends { total_count: number }>(run: RankedQuery, offset: number, limit: number): Promise<{ rows: Row[]; totalCount: number }>` replaces `fetchRankedIds`
- `rankedIdsQuery(supabase, fn, query, options, tiebreaker): RankedQuery` builds the ordered posts/listings query

- [ ] **Step 1: Let the mock give successive calls different results**

Replace the `MockConfig` interface and `createSupabase` function at the top of `search.test.ts` with:

```ts
type Result = { data: Rows | null; error?: { message: string } | null };

interface MockConfig {
  /** An array gives each successive call to that function its own result. */
  rpc?: Record<string, Result | Result[]>;
  tables?: Record<string, Result>;
}

function createSupabase(config: MockConfig) {
  const rpcBuilders: Record<string, { order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }> = {};
  const tableBuilders: Record<string, { select: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> }> = {};
  const rpcCallCounts: Record<string, number> = {};

  const rpc = vi.fn((fn: string) => {
    const configured = config.rpc?.[fn];
    const call = rpcCallCounts[fn] ?? 0;
    rpcCallCounts[fn] = call + 1;
    const result = (Array.isArray(configured) ? configured[call] : configured) ?? { data: [] };
    const builder = { order: vi.fn(), range: vi.fn() };
    builder.order.mockReturnValue(builder);
    builder.range.mockResolvedValue({ data: result.data, error: result.error ?? null });
    rpcBuilders[fn] = builder;
    return builder;
  });

  const from = vi.fn((table: string) => {
    const result = config.tables?.[table] ?? { data: [] };
    const builder = { select: vi.fn(), in: vi.fn() };
    builder.select.mockReturnValue(builder);
    builder.in.mockResolvedValue({ data: result.data, error: result.error ?? null });
    tableBuilders[table] = builder;
    return builder;
  });

  return { supabase: { rpc, from } as unknown as SupabaseClient, rpc, from, rpcBuilders, tableBuilders };
}
```

`rpcBuilders[fn]` now holds the builder from the most recent call, which is what the new tests assert on.

- [ ] **Step 2: Add the failing tests**

In `describe('searchPosts', …)`, add this line to the end of the existing "ranks via search_posts, then hydrates rows in rank order" test, to pin that a normal page makes one request:

```ts
    expect(mock.rpc).toHaveBeenCalledTimes(1);
```

Then add three tests to the same block:

```ts
  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: [
          { data: [] },
          { data: [{ id: 'p1', rank: 1, created_at: '2026-09-14T00:00:00Z', total_count: 21 }] },
        ],
      },
    });

    const result = await searchPosts(mock.supabase, 'room', { ...pageOptions, limit: 20, offset: 20 });

    expect(mock.rpc).toHaveBeenCalledTimes(2);
    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 0);
    expect(mock.from).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], totalCount: 21, hasMore: false });
  });

  it('trusts an empty first page without a second request', async () => {
    const mock = createSupabase({ rpc: { search_posts: { data: [] } } });

    const result = await searchPosts(mock.supabase, 'room', pageOptions);

    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: [], totalCount: 0, hasMore: false });
  });

  it('returns an Error when re-reading the total fails', async () => {
    const mock = createSupabase({
      rpc: { search_posts: [{ data: [] }, { data: null, error: { message: 'total failed' } }] },
    });

    const result = await searchPosts(mock.supabase, 'room', { ...pageOptions, offset: 20 });

    expect(result.error?.message).toBe('total failed');
  });
```

In `describe('searchListings', …)`:

```ts
  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_listings: [
          { data: [] },
          { data: [{ id: 'l1', rank: 1, refreshed_at: '2026-09-14T00:00:00Z', total_count: 4 }] },
        ],
      },
    });

    const result = await searchListings(mock.supabase, 'desk', { ...pageOptions, offset: 3 });

    expect(mock.rpcBuilders.search_listings.range).toHaveBeenCalledWith(0, 0);
    expect(result).toEqual({ data: [], totalCount: 4, hasMore: false });
  });
```

In `describe('searchPeople', …)`:

```ts
  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_people: [
          { data: [] },
          {
            data: [
              {
                id: 'u1',
                full_name: 'Bikash Thapa',
                profile_photo: null,
                trust_level: 2,
                metro_area_id: 'metro-nyc',
                follower_count: 128,
                is_local: true,
                rank: 0.6,
                total_count: 3,
              },
            ],
          },
        ],
      },
    });

    const result = await searchPeople(mock.supabase, 'thapa', { metroId: 'metro-nyc', limit: 20, offset: 20 });

    expect(mock.rpc).toHaveBeenCalledTimes(2);
    expect(mock.rpcBuilders.search_people.range).toHaveBeenCalledWith(0, 0);
    expect(result).toEqual({ data: [], totalCount: 3, hasMore: false });
  });
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npm run test --workspace=packages/shared -- src/api/search.test.ts`

Expected: FAIL on the four new "re-reads the total" / "returns an Error when re-reading" tests. Each empty page reports `totalCount: 0` after a single request, so the counts mismatch and `range(0, 0)` was never called. The other tests pass.

- [ ] **Step 4: Replace `fetchRankedIds` with the paging helper**

Delete `fetchRankedIds` and add, after `inRankOrder`:

```ts
/** One ordered search RPC, fetching rows `from` to `to` inclusive. */
type RankedQuery = (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * Fetches one page of a ranked search. The window total rides on every row, so
 * a page past the end carries no row to read it from; only then is the query
 * run again for a single row. A page with rows costs one request.
 */
async function fetchRankedPage<Row extends { total_count: number }>(
  run: RankedQuery,
  offset: number,
  limit: number
): Promise<{ rows: Row[]; totalCount: number }> {
  const { data, error } = await run(offset, offset + limit - 1);
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  if (rows.length > 0 || offset === 0) {
    return { rows, totalCount: Number(rows[0]?.total_count ?? 0) };
  }

  const first = await run(0, 0);
  if (first.error) throw first.error;
  const [firstRow] = (first.data ?? []) as Row[];
  return { rows, totalCount: Number(firstRow?.total_count ?? 0) };
}

function rankedIdsQuery(
  supabase: SupabaseClient,
  fn: 'search_posts' | 'search_listings',
  query: string,
  options: SearchPageOptions,
  tiebreaker: 'created_at' | 'refreshed_at'
): RankedQuery {
  return (from, to) =>
    supabase
      .rpc(fn, { p_query: query, p_metro_id: options.metroId, p_all_metros: options.allMetros })
      .order('rank', { ascending: false })
      .order(tiebreaker, { ascending: false })
      // Each page is a separate query, so without a unique final key rows tied on
      // rank and timestamp can repeat on one page and never appear on another.
      .order('id', { ascending: true })
      .range(from, to);
}
```

Add `type PersonRow = PersonSearchResult & { rank: number; total_count: number };` next to the existing `RankedIdRow` type.

- [ ] **Step 5: Point the three search functions at the helper**

In `searchPosts`, replace the `fetchRankedIds` call and the `ids.length` check with:

```ts
    const { rows, totalCount } = await fetchRankedPage<RankedIdRow>(
      rankedIdsQuery(supabase, 'search_posts', normalized, options, 'created_at'),
      options.offset,
      options.limit
    );
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };
```

In `searchListings`, the same with the listings function and tiebreaker:

```ts
    const { rows, totalCount } = await fetchRankedPage<RankedIdRow>(
      rankedIdsQuery(supabase, 'search_listings', normalized, options, 'refreshed_at'),
      options.offset,
      options.limit
    );
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };
```

In `searchPeople`, replace the whole `supabase.rpc(…)` call and the two lines that read `rows` and `totalCount` with:

```ts
    const { rows, totalCount } = await fetchRankedPage<PersonRow>(
      (from, to) =>
        supabase
          .rpc('search_people', { p_query: normalized, p_metro_id: options.metroId })
          .order('is_local', { ascending: false })
          .order('rank', { ascending: false })
          .order('follower_count', { ascending: false })
          // `simple` applies no weights, so every two-token name matching one query
          // token scores identically; without a unique final key, offset paging
          // duplicates and drops members.
          .order('id', { ascending: true })
          .range(from, to),
      options.offset,
      options.limit
    );
```

The rest of each function is unchanged: hydrate, restore rank order, and return `hasMore: options.offset + ids.length < totalCount` (`rows.length` for people).

- [ ] **Step 6: Run the tests, the type check and the lint**

Run: `npm run test --workspace=packages/shared -- src/api/search.test.ts`

Expected: PASS, every test in the file.

Run: `npm run type-check --workspace=packages/shared && npm run lint --workspace=packages/shared`

Expected: both exit 0. If the builder does not satisfy `RankedQuery`, widen the type to `PromiseLike<{ data: unknown; error: unknown }>` at the call site rather than casting the builder.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/api/search.ts packages/shared/src/api/search.test.ts
git commit -m "fix(search): report the real total on a page past the end" -m "The total rides on every row, so an empty page reported 0 matches. One helper now pages all three searches and re-reads the total from a single row only when a page after the first comes back empty." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 3c.5: Document, verify and open the draft PR

**Files:**

- Modify: `docs/product/features/search.md`
- Modify: `docs/plans/active/2026-09-14-web-ui-overhaul.md` (the PR 3c tracker row)

- [ ] **Step 1: Update `search.md`**

Set `**Last Updated:** 2026-09-19`. Replace the `**Matching:**` paragraph under "Behaviour" with:

```markdown
**Matching:** full-text prefix matching, so "tha" finds "Thapa". Post and listing text also matches other forms of an English word, so "houses" finds "Housing". Post titles rank above body text. Names are matched without stemming.

**Highlighting:** a word is marked when it starts with a query word, or when it is a plural or -ing/-ed form of one, so "rooms" marks "Room". Less regular forms, such as "sold" against "sell", can match without being marked.
```

In "Technical", change the Database bullet to name both migrations:

```markdown
- **Database:** `supabase/migrations/037_search.sql`, with the prefix and performance fixes in `038_search_prefix_fix.sql`. See [architecture/database-schema.md](../../architecture/database-schema.md) → "Global search".
```

- [ ] **Step 2: Check the docs**

Run: `npm run docs:check`

Expected: `docs:check - clean, 0 violations.`

- [ ] **Step 3: Run the full local pipeline**

Run: `npm run ci:local`

Expected: every step passes — lint, lint guards, type check, unit tests with coverage, and the web E2E suite. The E2E run includes the search specs, which use the query "thapa".

- [ ] **Step 4: Confirm the diff is only what this PR intends**

Run: `git status --short && git ls-files --eol packages/shared/src/api/search.ts packages/shared/src/utils/searchQuery.ts`

Expected: no unexpected modified files, and both files still report `i/lf`. A scripted edit that leaves `i/crlf` or `i/mixed` shows up as a whole-file diff.

- [ ] **Step 5: Commit the docs**

```bash
git add docs/product/features/search.md
git commit -m "docs(search): describe stemmed matching and highlighting" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Push and open the draft PR**

```bash
git push -u origin fix/search-follow-ups
gh pr create --draft --base docs/web-ui-overhaul-gaps --head fix/search-follow-ups \
  --title "fix(search): follow-ups from the PR #65 review" --body-file <path to a written body>
```

The base is `docs/web-ui-overhaul-gaps` because this branch is stacked on PR #78; retarget to `master` once #78 merges. Fill `.github/pull_request_template.md`: Summary lists the four fixes and says the `count(*) OVER ()` item is deferred with the reason; Scope ticks `packages/shared`; Testing ticks the shared and web workspace runs plus the monorepo validation; Notes for Reviewers records the two accepted over-highlights ("news" marks "new", "buses" marks "bus") and that no visual baselines change.

- [ ] **Step 7: Request Copilot's review and confirm it registered**

```bash
gh pr edit <number> --add-reviewer @copilot
gh api repos/shashesh/nepally/issues/<number>/timeline --jq '[.[] | select(.event=="review_requested") | .requested_reviewer.login]'
```

Expected: the timeline lists `Copilot`. `gh pr view --json reviewRequests` shows an empty list even when the request worked, so check the timeline instead.

- [ ] **Step 8: Leave the PR in draft**

The user marks it ready once Copilot's review is done, and that is what starts CI.

---

# PRs 4–10 — Area migrations (scoped)

These PRs depend on the primitives and shell shipped in PR 2, so their task-level steps are written **when each PR starts**, not now.

## Starting an area PR

1. `git switch master && git pull --ff-only && git switch -c <branch from the tracker>`.
2. **Inventory the area**, and paste the output into the new section:

   ```bash
   # CSS Modules still using literals / legacy tokens
   node -e "const {findViolations}=require('./scripts/guard-css-tokens.js');const fs=require('fs');for(const f of process.argv.slice(1)){const v=findViolations(fs.readFileSync(f,'utf8'));console.log(f, v.length)}" <area .module.css files>
   # Native dialogs
   grep -rn "confirm(\|alert(\|prompt(" <area page/component files>
   # Raw form elements (\b, not [[:space:]>/], so a tag that ends its line still counts — PR 7 inventory)
   grep -rnE "<(button|input|select|textarea)\b" <area .tsx files>
   ```

3. **Write the task breakdown.** Invoke `superpowers:writing-plans` and append a "PR N — Task breakdown" section under that PR below. Use the same task format as PRs 0–3b: files, interfaces, TDD steps with full code, commands, and commits.
4. **Build the tasks in this order:**
   1. extract sub-components (tests first)
   2. adopt primitives
   3. replace native dialogs
   4. move the CSS Modules to semantic tokens
   5. fix accessibility
   6. update and re-baseline
5. Meet the **definition of done** below, then push and open the PR.

## Definition of done (every area PR)

- [ ] The area's CSS Modules are removed from `scripts/guard-css-tokens.allowlist.json`: no colour literals and no legacy tokens.
- [ ] The area's files are removed from `apps/web/eslint/raw-element-allowlist.mjs`.
- [ ] No `confirm(` / `alert(` / `prompt(` remains in the area; `useConfirm` / `usePrompt` are used instead.
- [ ] No nested interactive elements, and no `<Link>` wrapping a `<Button>` (use `<Button component={Link}>`).
- [ ] Page files are about 350 lines or less; inline sub-components are extracted into `components/<domain>/`.
- [ ] Loading, empty and error UI use `LoadingState` / `EmptyState` / `ErrorState`, and lists use `useInfiniteScroll`.
- [ ] Unit tests for every extracted component. Tests query by role, label or text, with no class substrings or Mantine `data-*`.
- [ ] A keyboard walk-through of the area's flows (Tab, Shift+Tab, Enter, Space, Escape, arrow keys in menus and tabs).
- [ ] The area's pages are re-baselined (`npm run test:visual:docker --workspace=apps/web -- --update`), and every changed PNG is reviewed.
- [ ] `--write-a11y-baseline` removes the area's entries from `a11y-baseline.json`, and the diff only deletes lines.
- [ ] `npm run lint`, `lint:guards`, `type-check`, `test`, `test:e2e:web`, `test:visual:web` and `docs:check` all pass.
- [ ] `docs/architecture/web-ui-system.md` lists any new shared component.
- [ ] If the area PR changes behaviour, the feature doc under `docs/product/features/` is updated.

## PR 4 — split into 4a and 4b (2026-09-19)

One PR covering both pages came to about 4,000 lines of source, too much for one review. It is now two PRs. **4a** builds the shared post components and migrates the feed; **4b** adopts those components in post detail. Each re-baselines its own pages, which costs two screenshot runs instead of one.

**Inventory** (run on `master` at 0119883, the "Starting an area PR" commands):

| File | CSS violations | Raw form elements | Native dialogs |
|---|---|---|---|
| `pages/feed.page.tsx` (1323 lines) | — | 6 | 3 |
| `styles/Feed.module.css` (1085) | 289 (252 legacy tokens, 33 literals, 4 named) | — | — |
| `pages/posts/[id].page.tsx` (1008) | — | 17 | 5 |
| `styles/PostDetail.module.css` (656) | 170 (160 legacy tokens, 9 literals, 1 named) | — | — |
| `components/LocationSwitcher.module.css` | 9 (8 legacy tokens, 1 literal) | 0 in `.tsx` | — |
| `components/pulse/PulseCard.module.css` | 6 literals | 2 in `.tsx` | — |
| `components/pulse/MetroPulseStrip.module.css` | 0 | 0 | — |

The dialogs are `alert` on copy-link and delete failure, and `confirm` before deleting a post (feed 569, 574, 579; post detail 320, 332, 338) or a comment (post detail 210, 224).

## PR 4a — Post components + feed (`feat/web-ui-feed`)

- **Pages:** `pages/feed.page.tsx`.
- **CSS:** `styles/Feed.module.css`, `components/LocationSwitcher.module.css`, `components/pulse/PulseCard.module.css`.
- **Also here, because both render on the feed:** `components/LocationSwitcher` (it also renders in `TopBar`) and `components/pulse/PulseCard` (two raw `<button>`s). Both sit on the allowlists, which PR 10 cannot empty until they are migrated.
- **Build (first adopters):**
  - `components/ui/ImageLightbox`: Mantine `Modal` `fullScreen`, focus trap, Escape, ←/→ keys, labelled prev/next/close buttons. It replaces the two ~210-line copies (feed 373–488/821–916, posts/[id] 369–487/887–980).
  - `components/ui/PhotoCarousel`: CSS scroll-snap, labelled prev/next buttons, position announced as "Photo 2 of 3". It replaces the carousels in feed 1189–1250 and posts/[id] 620–679.
- **Extract into `components/posts/`:**
  - `PostCard`, a stretched-link card replacing today's `<Link>` wrapping buttons (feed 1040–1288)
  - `PostActions`, with inline SVG icons (1255–1281) moved to Tabler
  - `PostMeta` (tag chips, `ScopeBadge`, metro)
  - `PostComposer`, the feed's composer row
  - the feed's sponsored rail and upcoming-events widget
- **Also:**
  - Add `components/ui/notify.ts` (`notify.success(message)`, `notify.error(message)` over `@mantine/notifications`, with tests) and adopt it for the feed's toasts.
  - Replace the feed's native dialogs (report, delete) with `useConfirm`.
- **Build `components/users/UserMenuTrigger`** here, not in 4b: the feed's post card has the same hand-rolled avatar dropdown (feed 1075–1119, `useClickOutside`) that post detail has.
- **Hands to 4b:** `ImageLightbox`, `PhotoCarousel`, `PostCard`, `PostActions`, `PostMeta`, `UserMenuTrigger` and `notify`.

## PR 4a — Task breakdown

Work on `feat/web-ui-feed`, branched from `master` at 0119883. Tasks 4a.1–4a.8 build components and can each merge mentally on their own; 4a.9 is the page rewrite that adopts them; 4a.10–4a.12 finish the CSS, tests and baselines.

**Conventions to follow** (from `components/ui/`, confirmed on 2026-09-19):

- Named function export plus an exported `…Props` interface, both re-exported from `components/ui/index.ts`. Components under `components/posts/` and `components/users/` have no barrel; import them by path.
- Icons come from `@tabler/icons-react` with an explicit `size` and `aria-hidden="true"`.
- CSS Modules colocated per component, semantic tokens only, no colour literals.
- A colocated `X.test.tsx` per component using `render` from `../../test-utils` (it wraps `MantineProvider env="test"` and `ModalsProvider`). Query by role, label or text — never by class name or `data-*`.
- Mantine is 8.3.18. Respect the Mantine 9 readiness list in Global Constraints.
- When a step says "move" markup, keep its current structure unless the step says what changes. Do not reformat untouched lines.

**Primitives that exist and are still unused in production:** `ActionMenu`, `useConfirm`, `usePrompt`. PR 4a is their first adopter, so read `ActionMenu.test.tsx` and `dialogs.test.tsx` for the exact call shapes before writing against them.

### Task 4a.1: `notify` helper

**Files:**

- Create: `apps/web/src/components/ui/notify.ts`, `apps/web/src/components/ui/notify.test.ts`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

```ts
export const notify: {
  success(message: string): void;
  error(message: string): void;
};
```

Both call `notifications.show` from `@mantine/notifications`. `success` passes `{ message, color: 'green', autoClose: 2500 }`, `error` passes `{ message, color: 'red', autoClose: 5000 }`. No title, because every current caller passes a bare sentence.

- [ ] **Step 1: Write the failing test** in `notify.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';

const show = vi.fn();
vi.mock('@mantine/notifications', () => ({ notifications: { show: (...args: unknown[]) => show(...args) } }));

const { notify } = await import('./notify');

describe('notify', () => {
  it('shows a green success toast', () => {
    notify.success('Link copied to clipboard');
    expect(show).toHaveBeenCalledWith({ message: 'Link copied to clipboard', color: 'green', autoClose: 2500 });
  });

  it('shows a red error toast that stays longer', () => {
    notify.error('Failed to delete post. Please try again.');
    expect(show).toHaveBeenCalledWith({
      message: 'Failed to delete post. Please try again.',
      color: 'red',
      autoClose: 5000,
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test --workspace=apps/web -- src/components/ui/notify.test.ts`

Expected: FAIL, `Cannot find module './notify'`.

- [ ] **Step 3: Write `notify.ts`**

```ts
/**
 * Toasts for the whole web app. Callers pass a sentence; colour and duration
 * are decided here so success and failure always look the same.
 */
import { notifications } from '@mantine/notifications';

export const notify = {
  success(message: string): void {
    notifications.show({ message, color: 'green', autoClose: 2500 });
  },
  error(message: string): void {
    notifications.show({ message, color: 'red', autoClose: 5000 });
  },
};
```

- [ ] **Step 4: Export it** by adding `export { notify } from './notify';` to `components/ui/index.ts`, keeping the file's alphabetical order.

- [ ] **Step 5: Run the test again**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/notify.ts apps/web/src/components/ui/notify.test.ts apps/web/src/components/ui/index.ts
git commit -m "feat(web): add the notify toast helper" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 4a.2: `UserMenuTrigger`

Replaces the hand-rolled avatar dropdown at feed 1075–1119 (`useClickOutside`, absolute positioning, two `<button>`s).

**Files:**

- Create: `apps/web/src/components/users/UserMenuTrigger.tsx`, `apps/web/src/components/users/UserMenuTrigger.test.tsx`

**Interfaces:**

```ts
export interface UserMenuTriggerProps {
  userId: string;
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;            // re-exported type from '../Avatar'
  onChat?: (userId: string, name: string) => void;
}
```

Renders `ActionMenu` with `target` set to a Mantine `UnstyledButton` wrapping `<Avatar>`. The trigger's accessible name is "Options for " plus the name. `ActionMenu` already handles outside clicks, Escape and roving focus, so no `useClickOutside` here. The items:

```ts
const items: ActionMenuItem[] = [
  { key: 'profile', label: 'View profile', href: `/users/${userId}` },
  ...(onChat ? [{ key: 'chat', label: 'Chat', onClick: () => onChat(userId, name) }] : []),
];
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { UserMenuTrigger } from './UserMenuTrigger';

describe('UserMenuTrigger', () => {
  it('opens a menu with a profile link and a chat action', async () => {
    const onChat = vi.fn();
    render(<UserMenuTrigger userId="u1" name="Bikash Thapa" onChat={onChat} />);

    await userEvent.click(screen.getByRole('button', { name: 'Options for Bikash Thapa' }));

    expect(screen.getByRole('menuitem', { name: 'View profile' })).toHaveAttribute('href', '/users/u1');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Chat' }));
    expect(onChat).toHaveBeenCalledWith('u1', 'Bikash Thapa');
  });

  it('omits Chat when no handler is given', async () => {
    render(<UserMenuTrigger userId="u1" name="Bikash Thapa" />);
    await userEvent.click(screen.getByRole('button', { name: 'Options for Bikash Thapa' }));
    expect(screen.queryByRole('menuitem', { name: 'Chat' })).toBeNull();
  });
});
```

Check whether `@testing-library/user-event` is already a dependency of `apps/web`; if it is not, use `fireEvent.click` from `../../test-utils` instead of adding a dependency.

- [ ] **Step 2: Run it and watch it fail.** Run: `npm run test --workspace=apps/web -- src/components/users/UserMenuTrigger.test.tsx`

- [ ] **Step 3: Write the component**, importing `ActionMenu` from `../ui`, `Avatar` (default export) from `../Avatar`, and `UnstyledButton` from `@mantine/core`.

- [ ] **Step 4: Run the test again.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/users/UserMenuTrigger.tsx apps/web/src/components/users/UserMenuTrigger.test.tsx
git commit -m "feat(web): add UserMenuTrigger over ActionMenu" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

### Task 4a.3: `PostMeta`

Replaces feed 1120–1156: author line, relative time, tag buttons (`tag.name.toUpperCase()` in a raw `<button>`) and the Global/Local Mantine `Badge`.

**Files:**

- Create: `apps/web/src/components/posts/PostMeta.tsx`, `PostMeta.module.css`, `PostMeta.test.tsx`

**Interfaces:**

```ts
export interface PostMetaProps {
  post: Post;                                  // from '@nepally/shared'
  metroLabel?: string;
  onTagClick?: (slug: string) => void;
}
```

Renders the author name, `formatRelativeTime(post.created_at)` inside a `<time dateTime={post.created_at}>`, one `TagChip` per `post.tags`, and `<ScopeBadge isGlobal={post.is_global} metroLabel={metroLabel} />`.

**Two deliberate changes, both visible:**

- Tag labels lose the uppercasing. `TagChip` renders the label it is given, so "HOUSING" becomes "Housing". `feed.test.tsx:267` expects `{ name: 'HOUSING' }` and must change with it.
- When `onTagClick` is given, each chip sits inside `<button type="button" aria-label={`Filter by ${tag.name}`}>`; a `Badge` is not interactive on its own. Without the handler the chips render bare, which is what 4b needs on post detail.

- [ ] **Step 1: Write the failing test** covering: the author name and relative time render; three tags render as chips with their original case; clicking a chip calls `onTagClick` with the slug; `ScopeBadge` shows "Global" for `is_global` and `Local · Dallas` otherwise; and with no `onTagClick` the chips are not buttons (`queryByRole('button')` is null).
- [ ] **Step 2: Run it and watch it fail.** Run: `npm run test --workspace=apps/web -- src/components/posts/PostMeta.test.tsx`
- [ ] **Step 3: Write the component and its CSS Module** (semantic tokens only).
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(web): extract PostMeta with TagChip and ScopeBadge`.

### Task 4a.4: `PostActions`

Replaces the footer at feed 1285–1320, whose four icons are hand-written SVG. Today the like and comment icons are display-only `<span>`s with counts; **keep them display-only**. Turning them into buttons is a behaviour change and belongs to a feature PR, not this migration.

**Files:**

- Create: `apps/web/src/components/posts/PostActions.tsx`, `PostActions.module.css`, `PostActions.test.tsx`

**Interfaces:**

```ts
export interface PostActionsProps {
  likeCount: number;
  commentCount: number;
  onShare: () => void;
  detailHref: string;
}
```

Counts use `IconHeart` and `IconMessageCircle` inside a `<span>` with an accessible text label (`` `${likeCount} likes` ``) so screen readers do not read a bare number. Share is a Mantine `ActionIcon` with `aria-label="Share post"` and `IconShare`. "View details" is an `Anchor component={Link}` to `detailHref`.

- [ ] **Step 1: Write the failing test**: counts render with their labels, the share button calls `onShare`, the details link points at `detailHref`, and neither count is a button.
- [ ] **Step 2: Run it and watch it fail.**
- [ ] **Step 3: Write the component and CSS Module.**
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(web): extract PostActions with Tabler icons`.

### Task 4a.5: `PhotoCarousel`

Replaces feed 1222–1283 (and post detail 620–679 in 4b): `next/image` slides, a counter, prev/next `div`s with `role="button"`, and a 40px touch-swipe threshold.

**Files:**

- Create: `apps/web/src/components/ui/PhotoCarousel.tsx`, `PhotoCarousel.module.css`, `PhotoCarousel.test.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

```ts
export interface PhotoCarouselProps {
  photos: string[];
  alt: string;                       // e.g. `Photo from ${authorName}'s post`
  onPhotoClick?: (index: number) => void;
}
```

Requirements: real `<button>`s for previous and next, labelled "Previous photo" and "Next photo", disabled at each end; position announced in a `<p aria-live="polite">` as "Photo 2 of 3"; CSS scroll-snap for the track; keyboard ←/→ move when the track has focus; the existing 40px swipe threshold is kept; a single photo renders without controls.

- [ ] **Step 1: Write the failing test**: a three-photo carousel starts at "Photo 1 of 3" with Previous disabled; Next advances the announcement; the end disables Next; clicking a photo calls `onPhotoClick` with its index; one photo renders no buttons.
- [ ] **Step 2: Run it and watch it fail.**
- [ ] **Step 3: Write the component and CSS Module.** Keep `next/image` with the existing `fill` usage and sizes.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(web): add the PhotoCarousel primitive`.

### Task 4a.6: `ImageLightbox`

Replaces feed 856–951 plus its state and handlers (`:70–74`, `:393–441`, `:443–516`): overlay, close button, zoom levels `[1, 1.25, 1.5, 2, 2.5, 3, 4]`, chrome that auto-hides after 1500ms, Escape and ←/→ keys, wheel zoom.

**Files:**

- Create: `apps/web/src/components/ui/ImageLightbox.tsx`, `ImageLightbox.module.css`, `ImageLightbox.test.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**

```ts
export interface ImageLightboxProps {
  photos: string[];
  startIndex?: number;               // default 0
  opened: boolean;
  onClose: () => void;
  alt?: string;                      // default 'Post photo'
}
```

Built on Mantine `Modal` with `fullScreen`, `withCloseButton={false}` and its own labelled close `ActionIcon`, so Mantine owns the focus trap, Escape and scroll lock instead of the page. Keep the zoom levels and the 1500ms chrome timer as exported module constants. Prev/next are real buttons, and the counter reads "Photo 2 of 3".

- [ ] **Step 1: Write the failing test**: opening renders the photo at `startIndex`; ←/→ move and the counter follows; the close button calls `onClose`; zoom in and out step through the levels and clamp at each end; `opened={false}` renders nothing.
- [ ] **Step 2: Run it and watch it fail.**
- [ ] **Step 3: Write the component and CSS Module.**
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(web): add the ImageLightbox primitive`.

### Task 4a.7: `PostCard`

Moves feed 972–1323 into its own file, composing the four components above. This is the task that removes the nested-interactive violation.

**Files:**

- Create: `apps/web/src/components/posts/PostCard.tsx`, `PostCard.module.css`, `PostCard.test.tsx`
- Modify: `apps/web/src/pages/feed.page.tsx` (delete the inline component; import the new one)

**Interfaces:** the same 13 props the inline component takes today (feed 986–1000), as a named exported `PostCardProps` interface, with one addition, `metroLabel?: string`, passed through to `PostMeta`.

**The card stops being a link wrapper.** Today `<Link>` wraps the whole card and every interactive child calls `preventDefault()` and `stopPropagation()`. Replace it with a stretched link:

```tsx
<article className={styles.postCard}>
  <Link href={`/posts/${post.id}`} className={styles.stretchedLink}>
    <span className={styles.visuallyHidden}>{post.title}</span>
  </Link>
  {/* header, body, carousel, actions — each with position: relative and z-index 1 */}
</article>
```

```css
.stretchedLink::after {
  content: '';
  position: absolute;
  inset: 0;
}
```

Every interactive child then sits beside the link rather than inside it, so no `preventDefault()`/`stopPropagation()` calls remain, and no interactive element nests in another. The post "⋯" menu becomes an `ActionMenu`: for the author `Edit`, `Share`, `Delete` (`danger: true`); otherwise `Save`/`Unsave`, `Share`, `Report`.

- [ ] **Step 1: Write the failing test** in `PostCard.test.tsx`: the title links to `/posts/:id`; the author menu lists Edit, Share and Delete; a non-author sees Save, Share and Report; choosing Delete calls `onDeletePost`; the tag chip calls `onTagClick`; and no `<a>` contains a `<button>` (assert `container.querySelectorAll('a button').length === 0` — the one place a structural query is right, because the rule is structural).
- [ ] **Step 2: Run it and watch it fail.** Run: `npm run test --workspace=apps/web -- src/components/posts/PostCard.test.tsx`
- [ ] **Step 3: Move the markup** from feed 972–1323, swapping in `PostMeta`, `PhotoCarousel`, `PostActions` and `UserMenuTrigger`, and deleting `useClickOutside`, both menu states and the touch handlers that `PhotoCarousel` now owns.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** as `refactor(web): extract PostCard as a stretched-link card`.

### Task 4a.8: Feed widgets

**Files:**

- Create: `apps/web/src/components/feed/PostComposer.tsx` + `.module.css` + test (from feed 662–685)
- Create: `apps/web/src/components/feed/SponsoredRail.tsx` + `.module.css` + test (from feed 794–854, including the upcoming-events widget at 813–853)
- Modify: `apps/web/src/pages/feed.page.tsx`

`PostComposer` props, **as built**: `{ fullName: string | null; photoUrl?: string | null; trustLevel: number }`. The first name and whether posting is allowed are derived from those, rather than passed as a separate `canPost` flag that could disagree with `trustLevel`. It renders the avatar, the link-styled prompt and either "Create Post" or "Verify to Post", which is what `feed.test.tsx:155,166` asserts.

`SponsoredRail` props, **as built**: `{ stickyListings: SponsoredListing[]; events: Event[] }`. The component maps sticky listings to cards and falls back to the placeholder ads itself, which is why it takes the raw listings; `metroAreaId` turned out unused in the markup. Keep the rail's `<aside>` element and the "Sponsored" and "Upcoming Events" headings, because `04-feed.spec.ts` locates them by `aside` and by heading text; the e2e file is updated in 4a.12, so keep the structure stable here.

- [ ] **Step 1: Write failing tests** for both components: the composer shows "Verify to Post" at trust level 0 and "Create Post" above it; the rail renders each sponsored listing, the three events with their formatted dates, the "View All" link, and no past events.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Move the markup** and wire both into `feed.page.tsx`.
- [ ] **Step 4: Run the tests again**, plus `npm run test --workspace=apps/web -- src/pages/feed.test.tsx`. The feed suite must stay green: this task only moves markup.
- [ ] **Step 5: Commit** as `refactor(web): extract the feed composer and sponsored rail`.

### Task 4a.9: Rewrite the feed page over the primitives

**Files:** `apps/web/src/pages/feed.page.tsx`, `apps/web/src/pages/feed.test.tsx`

- [ ] **Step 1: Update the feed tests first** for the four behaviour changes: loading uses `LoadingState` (`role="status"`, so `getByTestId('feed-loading')` becomes `getByRole('status')`), the error state uses `ErrorState`, the empty state uses `EmptyState`, and the delete flow uses `useConfirm` plus `notify` rather than `confirm()` and `alert()`. The delete test must now click the confirm button in the modal.
- [ ] **Step 2: Run the feed suite and watch the updated tests fail.** Run: `npm run test --workspace=apps/web -- src/pages/feed.test.tsx`
- [ ] **Step 3: Make the changes:**
  - Replace the inline skeletons (695–704) with `<LoadingState variant="card" count={3} label="Loading posts…" />`.
  - Replace the inline error (705–713) with `<ErrorState message={loadError} onRetry={handleRetryLoad} />`.
  - Replace the inline empty state (714–732) with `<EmptyState>`, keeping the existing CTA as its `action`.
  - Delete the hand-rolled `IntersectionObserver` (298–313) and use `useInfiniteScroll({ hasMore: hasMorePosts, loading: loadingMorePosts, onLoadMore: loadMorePosts })`, attaching its `sentinelRef`.
  - Replace `confirm()` (574) with `useConfirm()` — title "Delete post", message "This cannot be undone.", `danger: true` — and both `alert()` calls (569, 579) plus `showSaveToast` (361) and the report toast (178) with `notify`.
  - Delete the lightbox state and handlers (70–74, 393–441, 443–516) in favour of `<ImageLightbox opened={lightboxPhotos.length > 0} …>`.
- [ ] **Step 4: Run the feed suite again.** Expected: PASS.
- [ ] **Step 5: Check the page shrank.** Run: `node -e "console.log(require('fs').readFileSync('apps/web/src/pages/feed.page.tsx','utf8').split('\n').length)"`. Expected: about 350 lines or fewer, which is the area-PR definition of done.
- [ ] **Step 6: Commit** as `refactor(web): rebuild the feed page on the shared primitives`.

### Task 4a.10: `LocationSwitcher` and `PulseCard`

**Files:** `components/LocationSwitcher.tsx` + `.module.css`, `components/pulse/PulseCard.tsx` + `.module.css`, and both test files.

- [ ] **Step 1: Move `PulseCard`'s two raw `<button>`s** to a Mantine `UnstyledButton` (the card) and an `ActionIcon` (dismiss, `aria-label={`Dismiss ${headline}`}`). Update `PulseCard.test.tsx` to query by role instead of `pulse-card-dismiss-fx_rate`, keeping the existing behaviour assertions.
- [ ] **Step 2: Replace the 6 colour literals** in `PulseCard.module.css` and the 8 legacy tokens plus 1 literal in `LocationSwitcher.module.css` with semantic tokens from `tokens.css`.
- [ ] **Step 3: Run the guards.** Run: `node -e "const {findViolations}=require('./scripts/guard-css-tokens.js');const fs=require('fs');for(const f of ['apps/web/src/components/pulse/PulseCard.module.css','apps/web/src/components/LocationSwitcher.module.css'])console.log(f, findViolations(fs.readFileSync(f,'utf8')).length)"`. Expected: `0` for both.
- [ ] **Step 4: Remove all three files** from `scripts/guard-css-tokens.allowlist.json` and remove `src/components/pulse/PulseCard.tsx` from `apps/web/eslint/raw-element-allowlist.mjs`, then run `npm run lint:guards`. Expected: pass. The guards fail on an allowlisted file that is already clean, so the entries must go in this commit.
- [ ] **Step 5: Run the tests.** Run: `npm run test --workspace=apps/web -- src/components/pulse src/components/LocationSwitcher.test.tsx`
- [ ] **Step 6: Commit** as `refactor(web): move LocationSwitcher and PulseCard onto tokens`.

### Task 4a.11: `Feed.module.css` onto semantic tokens

289 violations across 1085 lines: 252 legacy tokens, 33 colour literals, 4 named colours.

- [ ] **Step 1: List them** with `node -e "const {findViolations}=require('./scripts/guard-css-tokens.js');const fs=require('fs');console.table(findViolations(fs.readFileSync('apps/web/src/styles/Feed.module.css','utf8')))"`.
- [ ] **Step 2: Replace them** using the semantic token table in spec §4.1. Legacy `var(--color-*)` names map through `legacy-aliases.css`; find each one's new name there rather than guessing. Rules that moved into a component's CSS Module in tasks 4a.3–4a.8 are deleted here, not converted.
- [ ] **Step 3: Check.** Run the same `findViolations` command. Expected: `0`.
- [ ] **Step 4: Remove `apps/web/src/styles/Feed.module.css`** from the allowlist and run `npm run lint:guards`. Expected: pass.
- [ ] **Step 5: Commit** as `style(web): move the feed stylesheet onto semantic tokens`.

### Task 4a.12: Tests, accessibility, baselines and the PR

- [ ] **Step 1: Update the e2e feed spec** `apps/web/e2e/tests/04-feed.spec.ts` for the new DOM. Replace `page.locator('a').filter({ hasText: title })` (65, 77, 87) and `page.locator('section')` (47) with role-based locators, and `page.locator('aside')` (112, 121, 132, 141, 154) with `getByRole('complementary')`. Keep `a[href="/feed?tags=housing"]` if the filter bar still renders that link; check rather than assume.
- [ ] **Step 2: Run the e2e suite.** Run: `npm run test:e2e --workspace=apps/web -- e2e/tests/04-feed.spec.ts`. Expected: PASS.
- [x] **Step 3: Keyboard walk-through** of the feed: Tab order through composer, tag chips, post menus and the rail; Enter and Space on each menu; Escape closes menus and the lightbox; ←/→ move the carousel and the lightbox. Fix what does not work.
- [ ] **Step 4: Run the whole local pipeline.** Run: `npm run ci:local`. Expected: exit 0.
- [ ] **Step 5: Regenerate the visual baselines.** There is no local Docker (Decision 1), so push with `[visual-baselines]` in the commit message, download the `visual-baselines` artifact from the workflow run, review every changed PNG, and commit the screenshots plus the `a11y-baseline.json` diff. The feed, post-card and phone-feed screenshots all change, because the tag chips lose their uppercase and the card markup is new.
- [ ] **Step 6: Clear the feed's accessibility entries.** Run the visual suite with `--write-a11y-baseline` and check the `a11y-baseline.json` diff only deletes lines. The feed pages are not in the baseline today, so this should be a no-op; if it adds an entry, fix the violation instead of recording it.
- [ ] **Step 7: Update the docs.** Add `ImageLightbox`, `PhotoCarousel`, `notify`, `PostCard`, `PostMeta`, `PostActions`, `PostComposer`, `SponsoredRail` and `UserMenuTrigger` to `docs/architecture/web-ui-system.md`. Set the PR 4a tracker row to Merged when it lands. Run `npm run docs:check`.
- [ ] **Step 8: Push and open the draft PR** against `master`, fill `.github/pull_request_template.md`, then `gh pr edit <number> --add-reviewer @copilot` and confirm the request in the timeline. Leave it in draft.

## PR 4b — Post detail (`feat/web-ui-post-detail`)

Branched from `feat/web-ui-feed` (PR #80), the way PR 3b branched from 3a, so it could adopt what 4a built without waiting for the merge. #80 merged on 2026-09-20 and PR #81 was retargeted to `master` then.

**Inventory** (run on the branch point, 2026-09-19):

| File | Lines | CSS violations | Raw form elements | Native dialogs |
|---|---|---|---|---|
| `pages/posts/[id].page.tsx` | 1008 | — | 17 | 5 |
| `styles/PostDetail.module.css` | 656 | 170 (160 legacy tokens, 9 literals, 1 named) | — | — |

- **Pages:** `pages/posts/[id].page.tsx` (1008 lines, 17 raw form elements, 5 native dialogs).
- **CSS:** `styles/PostDetail.module.css` (170 violations).
- **Adopt from 4a:** `ImageLightbox` (replacing posts/[id] 369–487/887–980), `PhotoCarousel` (620–679), `PostActions`, `ScopeBadge`, `TagChip` and `notify`. Not `PostMeta`: see the task breakdown.
- **Extract into `components/posts/`:** `CommentThread`, `CommentComposer`.
- **Adopt `UserMenuTrigger`** (built in 4a) for the hand-positioned `ref.style` menus (posts/[id] 139) and their manual `mousedown` listeners. PR 9 reuses it for the messages pages.
- **Tests to rewrite:**
  - `pages/posts/[id].test.tsx:441` (anchored dropdown class and inline style) → assert `menuitem`s.
  - `e2e/tests/09-avatar-menu.spec.ts:59,102` (`div[class*="avatarDropdownAnchored"]`) → `getByRole('menu')`.
- **Also:** replace the post and comment delete dialogs with `useConfirm`.

## PR 4b — Task breakdown

Work on `feat/web-ui-post-detail`, branched from `feat/web-ui-feed`. Same conventions as PR 4a: test first, commit per task, query by role, semantic tokens only, no inline styles, and `UnstyledButton`/`ActionIcon` rather than raw elements outside `components/ui/`.

**What the recon changed** (page read on 2026-09-19):

- The page has **no sub-components at all** — 1008 lines in one function with 24 helper functions. Everything is extraction.
- `PostActions` as 4a shipped it **does not fit here**. Detail has a working like toggle, a scroll-to-comments button and a save button; 4a's version has none of those callbacks and adds a "View Details" cue that detail must not show. Task 4b.1 extends it rather than duplicating the row.
- `PostMeta` bundles author, time, scope and tags, but detail also renders `location_city`/`location_state`, which `PostMeta` has no slot for. That span stays on the page.
- The page **swallows two failures**: a failed comments fetch and a failed `createComment` both do nothing at all (no toast, no message). Task 4b.3 gives them `notify.error`, which is a small behaviour change and deliberate.

### Task 4b.1: Make `PostActions` serve both surfaces

**Files:** `components/posts/PostActions.tsx`, `PostActions.module.css`, `PostActions.test.tsx`, and `components/posts/PostCard.tsx` (the feed's caller).

**Interface:**

```ts
export interface PostActionsProps {
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  saved?: boolean;
  /** Given: the count becomes a button. Omitted: it stays text. */
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
  onShare: () => void;
  /** The feed card's "View Details →" cue; detail omits it. */
  showViewDetails?: boolean;
}
```

Counts render as text when their callback is missing (the feed today) and as `UnstyledButton`s when it is present (detail). Labels stay "3 likes" / "2 comments"; the like button is `aria-pressed={liked}`, the save button reads "Save post" / "Unsave post".

- [ ] **Step 1: Extend the tests** — the existing four still pass unchanged; add: a like button appears only with `onLike` and reports `aria-pressed`; clicking it calls back; the same for comment and save; "View Details" renders only with `showViewDetails`.
- [ ] **Step 2: Run and watch the new cases fail.** `npm run test --workspace=apps/web -- src/components/posts/PostActions.test.tsx`
- [ ] **Step 3: Implement**, and pass `showViewDetails` from `PostCard`.
- [ ] **Step 4: Run the posts and feed suites.** Both must stay green: the feed's behaviour does not change.
- [ ] **Step 5: Commit** as `feat(web): let PostActions carry like, comment and save`.

### Task 4b.2: `CommentComposer`

**Files:** create `components/posts/CommentComposer.tsx`, `.module.css`, `.test.tsx`.

```ts
export interface CommentComposerProps {
  replyingToName?: string;       // shows the reply banner
  onCancelReply?: () => void;
  onSubmit: (text: string) => Promise<void> | void;
  submitting?: boolean;
}
```

Replaces page 750–773. The raw `<input>` (761–767, which has no label) becomes a Mantine `TextInput` with a real label, and the form keeps submit-on-enter. The submit button is disabled while empty or submitting.

- [ ] **Step 1: Write the failing test**: the field has an accessible name; submitting passes the text and clears the field; an empty or whitespace-only value cannot be submitted; the reply banner names the person and Cancel calls back.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add CommentComposer`.

### Task 4b.3: `CommentThread`

**Files:** create `components/posts/CommentThread.tsx`, `.module.css`, `.test.tsx`.

```ts
export interface CommentThreadProps {
  thread: PostCommentThread;     // from '@nepally/shared'
  currentUserId?: string;
  onReply: (parentId: string, authorName: string) => void;
  onDelete: (commentId: string) => Promise<void> | void;
  onChat?: (userId: string, name: string) => void;
}
```

Replaces page 780–866: one parent plus its replies behind a "Show replies (n)" toggle. Each author avatar is a `UserMenuTrigger`, except your own, which renders a plain `Avatar` as `PostCard` does. Delete appears only on your own comments and goes through `useConfirm` ("Delete comment", danger), replacing the `confirm()` at page 210. The `alert()` at 224 becomes `notify.error`.

- [ ] **Step 1: Write the failing test**: parent renders with author, time and body; replies hide until the toggle is pressed and the toggle names the count; Reply calls back with the parent id; Delete shows only on your own comment, opens the confirm dialog and calls back when confirmed; another member's avatar opens the menu and your own does not.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add CommentThread`.

### Task 4b.4: Adopt the media primitives on the page

**Files:** `pages/posts/[id].page.tsx`.

Delete the lightbox (JSX 911–1004; state 76–79; effects and helpers 393–511) in favour of `ImageLightbox`, and the carousel (JSX 644–703; state 74–75, 80; helpers 351–391, 513–540) in favour of `PhotoCarousel`. Roughly 260 lines go.

- [ ] **Step 1: Update the tests that name these controls.** `[id].test.tsx:210` uses "Next image"; the primitives say "Next photo". The carousel-reset test (199) covers state the component now owns — rewrite it to assert the first photo renders after a route change.
- [ ] **Step 2: Run and watch those fail.**
- [ ] **Step 3: Make the swap.**
- [ ] **Step 4: Run the page suite.** Expected: green, minus the tests later tasks touch.
- [ ] **Step 5: Commit** as `refactor(web): use the shared lightbox and carousel on post detail`.

### Task 4b.5: Adopt the menus

**Files:** `pages/posts/[id].page.tsx`, `pages/posts/[id].test.tsx`.

Replace the post options menu (597–637) with `ActionMenu`, and all three avatar triggers (569–584, 783–802, 831–850) plus the shared dropdown (870–898) with `UserMenuTrigger`. That deletes the outside-click effect (139–157), the positioning effect (159–163), `openAvatarMenu` (231–255) with its four magic constants, and five pieces of state (68–71, 81–82).

- [ ] **Step 1: Rewrite the affected tests.** `[id].test.tsx:528` asserts a CSS-module class substring (`div[class*="avatarDropdownAnchored"]`) and two inline pixel offsets; that test goes, because the anchored dropdown does. Menu names change: the trigger reads "Options for {name}" rather than "User options", the item reads "View profile" rather than "View Profile", and it is a link, so the `mockPush` assertion at 580 becomes an `href` check.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Make the swap.**
- [ ] **Step 4: Run the page suite.**
- [ ] **Step 5: Commit** as `refactor(web): use ActionMenu and UserMenuTrigger on post detail`.

### Task 4b.6: Adopt the rest, and wire the comment components

**Files:** `pages/posts/[id].page.tsx`, `pages/posts/[id].test.tsx`.

- Loading (542–544) → `LoadingState variant="detail"`; not-found (546–555) → `EmptyState` with the feed link as its `action`; no comments (775–778) → `EmptyState`.
- Scope badge (593–595) and tags (728–741) → **`ScopeBadge` and `TagChip` directly, not `PostMeta`**. `PostMeta` also renders author and time, which this page lays out in its own header, and it has no slot for the location line that sits beside the tags. Both badges lose their emoji, so `[id].test.tsx:248, 256, 264` change.
- Action bar (705–726) → the extended `PostActions`.
- Comments (750–866) → `CommentComposer` and `CommentThread`.
- `handleDeletePost` (330–343): `confirm()` → `useConfirm`, `alert()` → `notify.error`. `handleShare` (320) → `notify.success`. The silent `createComment` failure (202–206) and the swallowed comments-fetch error (98–101) → `notify.error`.

- [ ] **Step 1: Update the tests** for the new strings and roles.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Make the changes.**
- [ ] **Step 4: Run the page suite, then the whole web suite.**
- [ ] **Step 5: Check the page size.** Expected: about 350 lines or fewer.
- [ ] **Step 6: Commit** as `refactor(web): rebuild post detail on the shared components`.

### Task 4b.7: `PostDetail.module.css` onto semantic tokens

170 violations in 656 lines, and most classes will be orphaned once the markup moves, exactly as on the feed.

- [ ] **Step 1: List the classes the page still references**, with the same node one-liner used for `Feed.module.css` in Task 4a.11.
- [ ] **Step 2: Delete the orphans, convert the rest**, mapping legacy names through `legacy-aliases.css`.
- [ ] **Step 3: Check with the guard.** Expected: `0`.
- [ ] **Step 4: Remove the file from `scripts/guard-css-tokens.allowlist.json`**, remove `src/pages/posts/[id].page.tsx` from the raw-element allowlist, and run `npm run lint:guards`.
- [ ] **Step 5: Commit** as `style(web): move the post detail stylesheet onto semantic tokens`.

### Task 4b.8: E2E, accessibility, docs and the PR

- [x] **Step 1: Rewrite `e2e/tests/09-avatar-menu.spec.ts`.** Both tests key off `div[class*="avatarDropdownAnchored"]` and a bounding-box proximity check. Mantine positions the menu itself, so assert the menu opens from the right trigger and contains View profile and Chat, by role. Drop the geometry.
- [x] **Step 2: Run the e2e suite.** `npm run test:e2e --workspace=apps/web -- e2e/tests/09-avatar-menu.spec.ts` — both pass by role.
- [ ] **Step 3: Keyboard walk-through** of post detail: Tab through the carousel, action bar, menus, composer and comment actions; Enter and Space on each; Escape closes menus, the lightbox and the confirm dialog; ←/→ page the carousel and lightbox.
- [x] **Step 4: Run `npm run ci:local`.** Exits 0.
- [x] **Step 5: Check the accessibility baseline.** The premise here was wrong: `a11y-baseline.json` has never held entries for post detail, so there is nothing to delete. What matters is that the regenerated baseline gains none, and it does — the file is unchanged. Every colour pair the new CSS uses was checked against AA first, after the feed composer shipped a 4.25:1 pair in PR 4a.
- [x] **Step 6: Docs.** `web-ui-system.md` lists `CommentThread`, `CommentComposer` and the extended `PostActions`; `docs:check` is clean.
- [x] **Step 7: Push and open the draft PR**, request Copilot, leave it in draft. It was opened against `feat/web-ui-feed` while 4a was in review and retargeted to `master` when #80 merged.
- [x] **Step 8: Regenerate and review the visual baselines.** Done from this branch's head (run 35527351030 checked out `eb849d7`): only the two post-detail screenshots move, and `a11y-baseline.json` is unchanged.
  - Dispatch against a short-lived copy of the branch, not the PR branch, so the PR spends one CI run rather than two. Record the commit the run checked out, because `workflow_dispatch` reports the workflow file's ref (`master`) as the run's head, not the branch it built.

## PR 5 — Create flows (`feat/web-ui-create-flows`)

- **Pages:** `pages/posts/create.page.tsx` (729), `pages/marketplace/create.page.tsx` (483), `pages/events/create.page.tsx` (591).
- **CSS:** `styles/CreatePost.module.css` (`outline: none` at 33, 53), `pages/events/createEvent.module.css` (54 hex), and the create sections of `pages/marketplace/marketplace.module.css`.
- **Install** `@mantine/dropzone@^8.3.18` and build `components/ui/ImageUploader`: drop, pick, reorder with keyboard-accessible move up/down, remove, count and size limits from shared constants. It replaces 4 uploaders (posts/create 609–701, marketplace/create ~295–330, events/create 485–525, and profile in PR 6).
- **Fields:** move every raw input (10 in events/create) to Mantine `TextInput` / `Textarea` / `Select` / `Switch`, with `label`, `description` and `error`. Character counters use `Textarea` `description`.
- **Shared:** consolidate the duplicated post photo upload logic (posts/create 369–439 vs 447–509) into one shared API function in `packages/shared/src/api/storage.ts`, with tests.
- **Also:** replace native dialogs in posts/create and marketplace/create.

### PR 5 — Area inventory

Run on `master` at `4f6b96d` (the "Starting an area PR" commands), 2026-09-20.

| File | Lines | CSS violations | Raw form elements | Native dialogs |
|---|---|---|---|---|
| `pages/posts/create.page.tsx` | 760 | — | 7 | 1 |
| `styles/CreatePost.module.css` | 267 | 53 (51 legacy tokens, 2 literals) | — | — |
| `pages/marketplace/create.page.tsx` | 483 | — | 7 | 3 |
| `pages/marketplace/marketplace.module.css` | 1011 | 192 (124 literals, 54 legacy tokens, 14 named) | — | — |
| `pages/events/create.page.tsx` | 599 | — | 13 | 0 |
| `pages/events/createEvent.module.css` | 347 | 59 (57 literals, 2 legacy tokens) | — | — |

`outline: none` sits at `CreatePost.module.css` 33 and 53, `createEvent.module.css` 69, and `marketplace.module.css` 46.

The dialogs are `confirm` before discarding an unsaved post (posts/create 237) and `alert` on a failed photo upload, create and update (marketplace/create 220, 232, 243).

**What the recon changed** (the three pages read on 2026-09-20):

1. **The shared upload consolidation has already landed.** `packages/shared/src/api/storage.ts` exports `uploadPostPhoto(s)`, `uploadListingPhoto(s)`, `uploadEventPhoto`, `deletePostPhotos`, `deleteListingPhotos` and `getPostPhotoPathFromUrl`, all with tests, and all three pages already call them. What is still duplicated is the **web-side call site**: posts/create builds the same `File[] → PostPhotoUploadInput[]` `Promise.all` block twice (edit branch 403–421, create branch 484–500). That block is DOM-bound (`File.arrayBuffer`), so it belongs in `apps/web`, not in `packages/shared`. Task 5.2 extracts it there and the plan's "one shared API function" item is closed as already done.

2. **`marketplace.module.css` cannot come off the allowlist in this PR.** It is one 1011-line file serving six pages; PR 8 owns the other five. A class-usage pass shows a clean split, though: **19 classes are create-only** — `createFormContainer`, `formSection`, `formLabel`, `toggleGroup`, `toggleButton(Active)`, `categoryChips`, `categoryChip(Active)`, `errorText`, `photoPreviewGrid`, `photoThumb`, `photoThumbImg`, `photoRemoveBtn`, `addPhotoBtn`, `addPhotoIcon`, `addPhotoText`, `hiddenFileInput`, `photoHint` — and only `title` and `backLink` are shared with the PR 8 pages. Task 5.9 moves the 19 into a new token-clean `pages/marketplace/createListing.module.css` and gives it its own `title` and `backLink` rules, so the create page stops importing the allowlisted file. `marketplace.module.css` stays on the allowlist for PR 8.

3. **Two of the three pages are not screenshotted.** `VISUAL_PAGES` has `create-post` but no create-listing or create-event entry, and `a11y-baseline.json` has no `create-post` key, so that page is already free of serious and critical violations. Task 5.12 adds the two missing pages. New pages may not add baseline entries — any violation they surface gets fixed, not recorded.

4. **The three pages disagree about everything.** posts/create uses raw `<input>`/`<textarea>` with `aria-label` and no `<form>`; marketplace/create already uses Mantine `TextInput`/`Textarea` inside a real `<form>`; events/create uses raw inputs with `<label htmlFor>` inside a `<form>`. Only events/create validates with a zod schema on submit and shows per-field errors; posts/create derives validity inline and marketplace/create maps zod issues to a `Record<string, string>`. The breakdown converges them on Mantine fields with `label`/`description`/`error`, but does **not** unify the three validation models — that is a bigger change than this PR's remit and none of it is user-visible.

5. **Photo handling differs three ways, and the uploader must absorb all three.** posts/create: up to `MAX_PHOTOS_PER_POST`, drag-and-drop reorder plus ←/→ buttons (edit mode only), mixes already-uploaded URLs with newly picked `File`s. marketplace/create: up to `MAX_PHOTOS_PER_LISTING`, **client-side resize to 1200px wide JPEG at 0.8 quality** before upload (`resizeImageFile`, 122–178), no reorder. events/create: exactly one photo, no reorder. `ImageUploader` therefore needs `max`, an optional `transformFile` hook, and optional reorder — see Task 5.1.

6. **`resizeImageFile` has no test and silently drops failures.** `handleFileChange` catches per-file and continues with `// Skip photos that fail to process`, so a user who picks four photos and sees two appear gets no explanation. Task 5.1 keeps the resize but surfaces the skipped count with `notify.error`, which is a small deliberate behaviour change.

7. **marketplace/create swallows its category error and has no submit-time feedback path.** `errors.category_id` renders, but the three `alert()` calls are the only failure channel for upload/create/update. They become `notify.error`, matching the feed and post detail.

## PR 5 — Task breakdown

Work on `feat/web-ui-create-flows`, branched from `master` at `4f6b96d`. Same conventions as PR 4a and 4b: test first, one commit per task, query by role, label or text, semantic tokens only, no inline styles, and Mantine components rather than raw elements outside `components/ui/`. `ImageUploader` lands first because all three pages adopt it.

**Decisions this breakdown locks in:**

1. **Toggle chips stay buttons.** Post tags (posts/create 602–639) and event types (events/create 372–392) are toggle groups. A Mantine `Chip` would make them checkboxes and break `e2e/tests/05-create-post.spec.ts:52` (`role=button`, name `/Housing tag/`) and `e2e/tests/10-events.spec.ts:365–370` (`role=button`, `/Cultural/i`). They become Mantine `UnstyledButton` with `aria-pressed`, keeping today's accessible names (`"Housing tag"`, `"🎭 Cultural"`). Dropping `", selected"` / `", not selected"` from the name is the accessibility gain: the platform announces the state instead of the name carrying it.
2. **Listing type and condition become `SegmentedControl`.** Those two (marketplace/create 273–289, 438–456) are single-select and mutually exclusive, so a radio group is the correct semantic. Nothing queries them by role — `create.test.tsx:113–114` uses `getByText`, which `SegmentedControl` still satisfies.
3. **The date and time fields keep their ids.** `10-events.spec.ts:389–392` and `:410–413` drive `#event-start-date` and `#event-start-time` through `page.locator()`. Mantine `TextInput` forwards `id`, so pass it explicitly rather than letting Mantine generate one. The same holds for `#event-title`, `#event-location-name`, `#event-location-address`, `#event-description` and `#event-is-global`.
4. **Placeholders are load-bearing.** Eleven unit and e2e assertions look a field up by placeholder (`'e.g. Dashain Celebration 2026'`, `"Tell people about your event..."`, `'What are you listing?'`, `'Describe your listing in detail...'`, `'e.g. Dallas Convention Center'`, `'Your business name'`). Keep every placeholder string byte-for-byte.
5. **`ImageUploader` owns object URLs.** It creates one preview URL per picked file and revokes it on remove and on unmount. The pages stop calling `URL.createObjectURL` and `revokeObjectURL` altogether, which deletes the preview-ref dance at events/create 110–115 and 163–170 and `clearSelectedPhotos` at posts/create 389–394.
6. **The three validation models stay as they are.** posts/create derives validity inline, marketplace/create maps zod issues into a `Record<string, string>`, events/create validates a zod schema on submit. Converging them is a larger change than this PR's remit and none of it is user-visible; the fields simply render whatever error string their page already computes.
7. **One PR, not a 5a/5b split** (decided with the user, 2026-09-20). The diff lands near 3,000 lines, close to what split PR 4, but splitting would cost a second Visual baselines run and Actions minutes are the scarcer budget. Tasks 5.1–5.4 build the shared pieces first, so a primitive that is wrong shows up before three pages depend on it.

**Files this PR creates:**

| Path | Responsibility |
|---|---|
| `apps/web/src/components/ui/ImageUploader.tsx`, `.module.css`, `.test.tsx` | Drop, pick, remove, reorder; count, type and size limits |
| `apps/web/src/components/ui/ToggleChipGroup.tsx`, `.module.css`, `.test.tsx` | A labelled group of `aria-pressed` toggle chips, single or multi-select |
| `apps/web/src/components/events/DateTimeField.tsx`, `.module.css`, `.test.tsx` | The paired date + time inputs, used twice on create event |
| `apps/web/src/lib/resizeImage.ts`, `.test.ts` | Downscale a picked image to a 1200px-wide JPEG |
| `apps/web/src/lib/photoUploads.ts`, `.test.ts` | `File[]` → upload inputs for the shared storage API |
| `apps/web/src/lib/postSubmit.ts`, `.test.ts` | The two create-post submit paths, as pure functions |
| `apps/web/src/pages/marketplace/createListing.module.css` | The 19 create-only classes, on semantic tokens |

**One chip component, three call sites.** Post tags, event types and marketplace categories are the same control three times: a labelled group of toggle chips, multi-select with a cap in one case and single-select in the other two. Task 5.4 builds `ToggleChipGroup` once in `components/ui/` rather than three near-identical selectors, and PR 7's event filters and PR 8's marketplace filters inherit it.

**Where the pages land.** The definition of done asks for roughly 350 lines a page. Measured after Task 5.13:

| Page | Before | After | Under ~350? |
|---|---|---|---|
| `pages/marketplace/create.page.tsx` | 483 | 332 | yes |
| `pages/posts/create.page.tsx` | 760 | 431 | no |
| `pages/events/create.page.tsx` | 599 | 448 | no |

Two miss, and both are deliberate. What is left on each is one form, its edit-mode loader and its submit path — not inline sub-components. Every repeated piece has already been extracted: the photo picker, the chip group and the date pair are components, and create post's two submit branches are pure functions in `lib/postSubmit.ts`. Splitting what remains would mean cutting a single screen's JSX across files, which costs a reader more than it saves. `events/create` is the larger of the two because it carries a nine-field form plus the local-to-ISO date conversion its API needs.

### Task 5.1: Install `@mantine/dropzone` and build `ImageUploader`

**Files:** `apps/web/package.json`, `TECH-VERSIONS.md`; create `components/ui/ImageUploader.tsx`, `.module.css`, `.test.tsx`; modify `components/ui/index.ts`.

**Interface:**

```ts
/** One slot in the uploader: a photo already in storage, or a file just picked. */
export type UploaderPhoto =
  | { kind: 'stored'; url: string }
  | { kind: 'picked'; id: string; previewUrl: string; file: File };

export interface ImageUploaderProps {
  photos: UploaderPhoto[];
  onChange: (photos: UploaderPhoto[]) => void;
  /** Total slots across stored and picked photos. */
  max: number;
  maxBytes: number;
  /** Group label, e.g. "Photos". Also names the add button: "Add photos". */
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  /** MIME types; defaults to JPEG, PNG and WEBP. */
  accept?: string[];
}
```

The component renders `<div role="group" aria-labelledby aria-describedby>` around a Mantine `Dropzone` and a `<ul>` of thumbnails. Each thumbnail carries a "Remove photo N" button. Over-count, wrong-type and over-size files are rejected with a message inside the group, not a toast — the member is looking at the control. The count reads `"{n}/{max} photos"`, matching today's marketplace copy so `create.test.tsx:140` keeps passing.

- [ ] **Step 1: Install and record the dependency.** `npx npm@12 install --workspace=apps/web @mantine/dropzone@^8.3.18` (the lockfile is npm 12 format — plain `npm install` strips libc fields). It pins `@mantine/core`/`@mantine/hooks` to exactly `8.3.18`, which matches the app. Add the row to `TECH-VERSIONS.md` beside the other `@mantine/*` packages.
- [ ] **Step 2: Read the installed types before writing against them.** `node_modules/@mantine/dropzone/lib/Dropzone.d.ts`. Confirm how to give the hidden file input an accessible name (`inputProps`) and how to open the file dialog programmatically (`openRef`). If `inputProps` is absent in 8.3.18, name the control with an explicit Mantine `Button` wired to `openRef` instead, and say so in the task notes.
- [ ] **Step 3: Write the failing test.** `ImageUploader.test.tsx`: the group has the accessible name from `label`; picking two files calls `onChange` with two `picked` entries carrying the files; a file over `maxBytes` is rejected with a visible message and no `onChange`; a file whose type is not in `accept` is likewise rejected; picking past `max` accepts only the remaining slots and says so; "Remove photo 2" calls `onChange` without that entry; the count text reads `"2/3 photos"`; a `stored` entry renders its URL and can be removed the same way.
- [ ] **Step 4: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/ui/ImageUploader.test.tsx`
- [ ] **Step 5: Implement**, colocating `ImageUploader.module.css` on semantic tokens, and export both the component and `UploaderPhoto` from `components/ui/index.ts`.
- [ ] **Step 6: Run and watch it pass**, then `npm run lint --workspace=apps/web`.
- [ ] **Step 7: Commit** as `feat(web): add ImageUploader over Mantine Dropzone`.

### Task 5.2: Reordering and the transform hook

**Files:** `components/ui/ImageUploader.tsx`, `.module.css`, `.test.tsx`.

**Added props:**

```ts
  /** Shows "Move photo N left" / "Move photo N right" on every thumbnail. */
  reorderable?: boolean;
  /** Runs on each accepted file before it enters state, e.g. downscaling. */
  transformFile?: (file: File) => Promise<File>;
```

Reorder replaces posts/create's ←/→ buttons (`movePhotoAtIndex` 323–331, JSX 700–722) and its drag-and-drop (`handlePhotoDragStart` 351–392, state 61–62). **Drag-and-drop is dropped**: it was edit-mode only, had no keyboard equivalent beyond the arrow buttons that survive, and no test or e2e covers it. Task 5.4 removes the "Reorder photos by drag-and-drop, or use ← and → controls" hint (posts/create 729–731) in favour of "Use the ← and → buttons to reorder photos."

When `transformFile` rejects for a file, that file is skipped and the group shows `"{n} photo(s) could not be processed."` — today marketplace/create swallows those silently (`// Skip photos that fail to process`, 152–154).

- [ ] **Step 1: Extend the tests** — the move buttons appear only with `reorderable`; "Move photo 2 left" calls `onChange` with 1 and 2 swapped; the first photo's left button and the last photo's right button are disabled; a live region announces `"Photo 2 moved to position 1"`; `transformFile` output replaces the picked file; a rejecting `transformFile` skips that file, keeps the others and shows the count that failed.
- [ ] **Step 2: Run and watch the new cases fail.** `npm run test --workspace=apps/web -- src/components/ui/ImageUploader.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): let ImageUploader reorder and transform photos`.

### Task 5.3: `resizeImage` and `photoUploads` helpers

**Files:** create `apps/web/src/lib/resizeImage.ts`, `resizeImage.test.ts`, `photoUploads.ts`, `photoUploads.test.ts`.

```ts
// resizeImage.ts — moved out of marketplace/create.page.tsx 34–59, returning a File
export const MAX_IMAGE_WIDTH_PX = 1200;
export const JPEG_QUALITY = 0.8;
export async function resizeImage(file: File): Promise<File>;

// photoUploads.ts — replaces the block duplicated at posts/create 403–421 and 484–500
export interface PhotoUploadInput {
  user_id: string;
  file_data: ArrayBuffer;
  mime_type: string;
  size_bytes: number;
  file_name: string;
}
export function toPhotoUploadInputs(files: File[], userId: string): Promise<PhotoUploadInput[]>;
```

`PhotoUploadInput` is structurally what `uploadPostPhotos`, `uploadListingPhotos` and `uploadEventPhoto` already accept, so all three pages feed it straight through. `resizeImage` returns a `File` rather than the old `NewPhotoWeb` record, which is what `ImageUploader`'s `transformFile` takes; the ArrayBuffer conversion happens once, at submit, in `toPhotoUploadInputs`.

- [ ] **Step 1: Write the failing tests.** `resizeImage.test.ts`: an image wider than 1200px comes back scaled to 1200 with the aspect ratio kept and `type === 'image/jpeg'`; a narrower image is not upscaled; the returned `File` keeps the original name; a missing 2D context rejects. Stub `createImageBitmap` and `HTMLCanvasElement.prototype.toBlob` in the test — jsdom has neither. `photoUploads.test.ts`: three files map to three inputs in order, each carrying the user id, the file's bytes, type, size and name; a file with an empty `type` falls back to `'image/jpeg'`, matching posts/create 407 today; an empty array resolves to an empty array.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/lib/resizeImage.test.ts src/lib/photoUploads.test.ts`
- [ ] **Step 3: Implement.** `marketplace/create.page.tsx` keeps its own `resizeImageFile` (34–59) and `NewPhotoWeb` (26–32) until Task 5.8, which deletes both as it adopts `ImageUploader`. Adapting the page to `resizeImage` here would mean writing a `File` → `NewPhotoWeb` shim that Task 5.8 immediately deletes; the build is green either way, so the duplication stands for two commits instead.
- [ ] **Step 4: Run and watch them pass**, then `npm run type-check`.
- [ ] **Step 5: Commit** as `refactor(web): extract the image resize and upload-input helpers`.

### Task 5.4: `ToggleChipGroup`

**Files:** create `components/ui/ToggleChipGroup.tsx`, `.module.css`, `.test.tsx`; modify `components/ui/index.ts`.

**Interface:**

```ts
export interface ToggleChipOption {
  value: string;
  /** Rendered inside the chip; may carry an emoji. */
  label: ReactNode;
  /** Accessible name, when the label is decorated. Defaults to `label` as text. */
  name?: string;
}

export interface ToggleChipGroupProps {
  /** Names the group for assistive technology, e.g. "Tags". */
  label: string;
  options: ToggleChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Single-select clears the previous pick; multi keeps both. Default 'multiple'. */
  mode?: 'single' | 'multiple';
  /** Multi-select cap. Unselected chips go disabled once it is reached. */
  max?: number;
  description?: ReactNode;
  error?: string;
  disabled?: boolean;
}
```

One `<div role="group" aria-labelledby>` of Mantine `UnstyledButton` chips, each with `aria-pressed`. This is the third copy of the same control in the codebase (posts/create 616–632, events/create 376–390, marketplace/create 356–367), so it is built once here.

Every chip also renders `data-value={option.value}`, so a caller's stylesheet can colour individual chips without the component knowing any domain colours. Task 5.13 uses that hook to give the five event types their tokens, replacing today's `TYPE_ACTIVE_CLASS` map (events/create 25–31).

Per decision 1, chips are buttons rather than Mantine `Chip` checkboxes, because three e2e assertions and four unit assertions look them up by `role=button`.

- [ ] **Step 1: Write the failing test.** The group carries the accessible name from `label`; a chip reports `aria-pressed="false"` until pressed, then `"true"`; multi-select keeps both picks and single-select replaces; at `max` the unselected chips are disabled and the selected ones are not; pressing a selected chip deselects it even at `max`; `name` overrides the accessible name when the label carries an emoji; `error` renders and is linked to the group with `aria-describedby`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/ui/ToggleChipGroup.test.tsx`
- [ ] **Step 3: Implement**, with `ToggleChipGroup.module.css` on semantic tokens, and export it from `components/ui/index.ts`.
- [ ] **Step 4: Run and watch it pass**, then `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `feat(web): add ToggleChipGroup`.

### Task 5.5: posts/create adopts `ImageUploader`, and its submit paths move out

**Files:** `pages/posts/create.page.tsx`, `create.test.tsx`; create `lib/postSubmit.ts`, `postSubmit.test.ts`.

About 200 lines of photo code go. Deleted: `SelectedPhoto` and `EditablePhoto` (32–39), the photo state (51–53, 61–62), `handlePhotoInputChange` (249–280), `removeSelectedPhoto` (282–290), `removeExistingPhoto` (292–301), `getCombinedEditablePhotos` (303–308), `applyCombinedEditablePhotos` (310–321), `movePhotoAtIndex` (323–331), `movePhotoToIndex` (333–349), the four drag handlers (351–392), `clearSelectedPhotos` (389–394) and the photo JSX (640–732).

What replaces them: one `photos: UploaderPhoto[]` state and

```tsx
<ImageUploader
  photos={photos}
  onChange={setPhotos}
  reorderable
  max={MAX_PHOTOS_PER_POST}
  maxBytes={MAX_POST_PHOTO_BYTES}
  label="Photos"
  description="Optional. JPG, PNG or WEBP up to 5MB each."
/>
```

`removedExistingPhotoPaths` stops being its own state. On submit, diff the `stored` URLs against `initialForm.existingPhotos` and run each dropped URL through the existing `getPostPhotoPathFromUrl`, which still feeds the `deletePostPhotos` cleanup.

`handleSubmit` (396–537) is 141 lines of two near-identical branches. Both move into `lib/postSubmit.ts` as pure async functions that take everything they need and return a result, so the page keeps only the state plumbing:

```ts
export interface SubmitResult {
  ok: boolean;
  /** Set when ok is false; the page renders it in its error Alert. */
  message?: string;
  /** Set by submitNewPost when the post went to a moderator instead of the feed. */
  pendingModeration?: boolean;
}

export interface NewPostParams {
  userId: string;
  title: string;
  description: string;
  tagIds: string[];
  /** In display order. `picked` entries are uploaded; there are no `stored` ones yet. */
  photos: UploaderPhoto[];
  isGlobal: boolean;
  metroAreaId: string;
  locationZipCode: string;
  locationCity: string;
  locationState: string;
  requiresModeration: boolean;
}

export interface EditedPostParams {
  postId: string;
  userId: string;
  title: string;
  description: string;
  tagIds: string[];
  /** In display order, mixing `stored` and `picked`. */
  photos: UploaderPhoto[];
  isGlobal: boolean;
  /** The post's photo URLs as loaded, so dropped ones can be deleted. */
  originalPhotoUrls: string[];
}

export function submitNewPost(supabase: SupabaseClient, params: NewPostParams): Promise<SubmitResult>;
export function submitEditedPost(supabase: SupabaseClient, params: EditedPostParams): Promise<SubmitResult>;
```

Both call `toPhotoUploadInputs` for the picked files, then `uploadPostPhotos`, and both keep today's rollback: on a failed `createPost` / `updatePost` they call `deletePostPhotos` for anything they just uploaded (456–458, 519–521). `submitEditedPost` keeps the `uploadedUrlByPhotoId` ordering step (406, 424–430) so a reordered mix of stored and new photos is written in display order.

- [ ] **Step 1: Write the failing tests for `postSubmit.ts`** — a new post with no photos calls `createPost` with `photos: []`; with two picked files it uploads first and passes both URLs; a failed `createPost` deletes the uploaded photos and returns `ok: false` with the message; an edit that reorders one stored and one new photo writes them in display order; an edit that drops a stored photo deletes that path only after `updatePost` succeeds.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/lib/postSubmit.test.ts`
- [ ] **Step 3: Implement `postSubmit.ts`, then rewrite the page against it and `ImageUploader`.** `create.test.tsx` asserts `'Add post photos'`, which no longer exists; rewrite those cases against the "Photos" group and the "Remove photo 1" button.
- [ ] **Step 4: Run both suites.** `npm run test --workspace=apps/web -- src/lib/postSubmit.test.ts src/pages/posts/create.test.tsx`
- [ ] **Step 5: Commit** as `refactor(web): use ImageUploader on create post and lift its submit paths out`.

### Task 5.6: posts/create fields, chips, dialog and toasts

**Files:** `pages/posts/create.page.tsx`, `create.test.tsx`.

- The title `<input>` (563–571) becomes a Mantine `TextInput` and the body `<textarea>` (583–591) a `Textarea` with `autosize minRows={6}`. Both keep their placeholders and their accessible names — pass `aria-label="Post title, required"` and `aria-label="Post body, required"`, because `create.test.tsx:100–101` and six later cases look them up that way.
- The two character counters (572–576, 592–596) move into each field's `description`. They still appear only from `TITLE_COUNTER_THRESHOLD` / `BODY_COUNTER_THRESHOLD` upward, and still turn red near the limit, so nothing changes on screen. The gain is that `description` is wired to the input through `aria-describedby`, where today's loose `<Text>` is announced to nobody.
- The inline validity messages (577–579, 597–599) become each field's `error` prop.
- The tag grid (602–639) becomes `<ToggleChipGroup label="Tags" mode="multiple" max={MAX_TAGS_PER_POST} />`, with each option's `name` set to `` `${tag.name} tag` `` so `05-create-post.spec.ts:52` still matches. `toggleTag` (225–233) goes; the cap now lives in the component.
- `handleCancel`'s `confirm()` (235–247) becomes `useConfirm({ title: 'Discard this post?', message: 'You have unsaved changes.', confirmLabel: 'Discard', danger: true })`.
- The emergency-post `notifications.show` (519–524, now inside `postSubmit`) becomes `notify.success` at the page's call site.

- [ ] **Step 1: Write the failing tests** — Cancel with a dirty form opens the dialog and stays put when dismissed, and navigates when confirmed; a selected tag reports `aria-pressed="true"`; selecting a third tag disables the rest; the title field shows its counter in the description past 120 characters.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/posts/create.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `refactor(web): move create post onto Mantine fields and the shared dialog`.

### Task 5.7: `CreatePost.module.css` onto semantic tokens

**Files:** `styles/CreatePost.module.css`, `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs`.

53 violations: 51 legacy `var(--color-*)` tokens and 2 colour literals. The rules whose markup Tasks 5.5 and 5.6 deleted go with it — `titleInput`, `bodyInput`, `tagChip*`, `photoRowButton`, `photoRow`, `photoIcon`, `photoLabel`, `photoCount`, `hiddenFileInput`, `photoPreview*`, `photoRemoveBtn`, `photoReorder*`. `outline: none` at 33 and 53 belonged to the two fields that are now Mantine's, so both disappear rather than needing a focus ring.

- [ ] **Step 1: Map every legacy token to its semantic replacement** using the spec §4.1 table, and delete the rules whose markup is gone.
- [ ] **Step 2: Remove `apps/web/src/styles/CreatePost.module.css` from `scripts/guard-css-tokens.allowlist.json` and `src/pages/posts/create.page.tsx` from `RAW_ELEMENT_ALLOWLIST`**, in this same commit — the CSS guard fails on an allowlisted file that is already clean (implementation decision 7).
- [ ] **Step 3: Run the guards.** `npm run lint:guards` and `npm run lint --workspace=apps/web`. Both must pass.
- [ ] **Step 4: Run the web suite.** `npm run test --workspace=apps/web`
- [ ] **Step 5: Commit** as `style(web): move the create post stylesheet onto semantic tokens`.

### Task 5.8: marketplace/create adopts `ImageUploader`

**Files:** `pages/marketplace/create.page.tsx`, `create.test.tsx`.

`existingPhotoUrls` and `newPhotos` (73–74) collapse into one `photos: UploaderPhoto[]`. `handleFileChange` (135–159), `handleRemoveExisting` (161–163), `handleRemoveNew` (165–171), the revoke effect (128–133), `fileInputRef` (68) and the photo JSX (290–350) all go, replaced by

```tsx
<ImageUploader
  photos={photos}
  onChange={setPhotos}
  max={MAX_PHOTOS_PER_LISTING}
  maxBytes={MAX_LISTING_PHOTO_BYTES}
  accept={[...ALLOWED_LISTING_PHOTO_MIME_TYPES]}
  transformFile={resizeImage}
  label="Photos"
/>
```

Not `reorderable`: the page has no reorder today, and listing detail shows photos in stored order.

`handleSubmit` (173–251) keeps its two branches but feeds `toPhotoUploadInputs` instead of hand-mapping `newPhotos` (205–212). The three `alert()` calls (220, 232, 243) become `notify.error`.

- [ ] **Step 1: Update the tests.** `create.test.tsx:140` asserts `'0/5 photos'`; `ImageUploader` renders the same string, so check that case survives unchanged rather than assuming it. Add: a failed upload calls `notify.error` and leaves the member on the page; a failed create does the same; a picked file is passed through `resizeImage` before upload.
- [ ] **Step 2: Run and watch the new cases fail.** `npm run test --workspace=apps/web -- src/pages/marketplace/create.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `refactor(web): use ImageUploader and notify on create listing`.

### Task 5.9: marketplace/create fields

**Files:** `pages/marketplace/create.page.tsx`, `create.test.tsx`.

- Listing type (273–289) and condition (438–456) become Mantine `SegmentedControl`, with `data` built from `LISTING_TYPE_LABELS` and `ITEM_CONDITION_LABELS` (decision 2).
- The category chips (353–370) become `<ToggleChipGroup label="Category" mode="single" />`, with `error={errors.category_id}` replacing the loose `<p className={styles.errorText}>` at 369.
- The `<form>` (272) stays; it is already correct.

- [ ] **Step 1: Write the failing tests** — the listing type control is a radio group with "Business" selected by default; choosing "Individual" reveals Condition and hides Business Name; a selected category reports `aria-pressed="true"`; submitting with no category renders the error inside the category group.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/marketplace/create.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `refactor(web): move create listing onto Mantine form controls`.

### Task 5.10: Split `createListing.module.css` out of the marketplace stylesheet

**Files:** create `pages/marketplace/createListing.module.css`; modify `pages/marketplace/create.page.tsx`, `marketplace.module.css`, `apps/web/eslint/raw-element-allowlist.mjs`.

`marketplace.module.css` is 1011 lines serving six pages and PR 8 owns the other five, so it cannot leave the CSS allowlist here. The 19 create-only classes move to a new file that is token-clean from the start. Tasks 5.8 and 5.9 delete the markup behind `toggleGroup`, `toggleButton`, `toggleButtonActive`, `photoPreviewGrid`, `photoThumb`, `photoThumbImg`, `photoRemoveBtn`, `addPhotoBtn`, `addPhotoIcon`, `addPhotoText`, `hiddenFileInput` and `photoHint`, so those twelve are not carried over at all. Seven still have markup: `createFormContainer`, `formSection`, `formLabel`, `categoryChips`, `categoryChip`, `categoryChipActive` and `errorText` — and of those, the last four may also fall out once `ToggleChipGroup` brings its own styles, so check before copying. `title` and `backLink` are shared with the PR 8 pages, so the new file gets its own copies and `marketplace.module.css` keeps the originals.

- [ ] **Step 1: Create `createListing.module.css`** with the classes that still have markup, on semantic tokens, plus its own `title` and `backLink`, and point `create.page.tsx`'s import at it.
- [ ] **Step 2: Delete the 19 create-only class blocks from `marketplace.module.css`.** Keep `title` and `backLink` there for the PR 8 pages.
- [ ] **Step 3: Verify the split.** `node scripts/guard-css-tokens.js apps/web/src/pages/marketplace/createListing.module.css` reports zero violations, and `marketplace.module.css`'s count drops but the file stays allowlisted.
- [ ] **Step 4: Remove `src/pages/marketplace/create.page.tsx` from `RAW_ELEMENT_ALLOWLIST`**, then run `npm run lint --workspace=apps/web`, `npm run lint:guards` and `npm run test --workspace=apps/web`.
- [ ] **Step 5: Commit** as `style(web): give create listing its own token-clean stylesheet`.

### Task 5.11: `DateTimeField`

**Files:** create `components/events/DateTimeField.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface DateTimeFieldProps {
  /** Group label, e.g. "Start Date & Time *". */
  label: string;
  /** Local `YYYY-MM-DDTHH:mm`, or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Ids for the two inputs; e2e drives them directly. */
  dateId: string;
  timeId: string;
  /** Accessible names, e.g. "Start date" / "Start time". */
  dateLabel: string;
  timeLabel: string;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  minDate?: string;
  error?: string;
}
```

Replaces the two near-identical blocks at events/create 393–420 and 422–449, and absorbs `getDatePart`, `getTimePart` and `combineDateAndTime` (70–84) along with `handleDateChange` and `handleTimeChange` (206–216). It keeps today's rule that the time input does nothing until a date is set.

Per decision 3, `dateId` and `timeId` are passed straight to Mantine `TextInput`'s `id`, because `10-events.spec.ts` drives `#event-start-date` and `#event-start-time` with `page.locator()`.

- [ ] **Step 1: Write the failing test.** Both inputs carry the given ids and accessible names; typing a date emits `YYYY-MM-DDT00:00`; typing a time with a date already set emits the combined value; typing a time with no date set emits nothing; a value round-trips into the two inputs split correctly; `minDate` reaches the date input's `min`; `error` renders once for the pair.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/events/DateTimeField.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add DateTimeField`.

### Task 5.12: events/create fields and photo

**Files:** `pages/events/create.page.tsx`, `create.test.tsx`.

The largest field conversion: 13 raw elements go.

| Today | Becomes |
|---|---|
| `#event-title` input (359–366) | `TextInput` with the same `id`, placeholder and `maxLength`; `error={errors.title}`; the 150-counter moves into `description` |
| Event type buttons (376–390) | `<ToggleChipGroup label="Event Type" mode="single" />`, options built from `EVENT_TYPE_ICONS` and `EVENT_TYPE_LABELS` exactly as today: `"🎭 Cultural"`, `"🕌 Religious"`, `"🎉 Social"`, `"💼 Career"`, `"📌 Other"` |
| Start and end date/time blocks (393–449) | two `<DateTimeField>`s |
| `#event-location-name` (454–461) | `TextInput`, `error={errors.location_name}` |
| `#event-location-address` (468–474) | `TextInput` |
| `#event-description` textarea (481–488) | `Textarea autosize minRows={4}`, counter into `description` |
| Two file inputs (509–514, 524–529) | one `<ImageUploader max={1} maxBytes={MAX_EVENT_PHOTO_BYTES} label="Event photo" description="Optional. Max 2MB — JPG, PNG or WEBP." />` |
| RSVP radios (540–552) | Mantine `Radio.Group` + `Radio`, labels unchanged |
| Error-dismiss `<button>` (578) | Mantine `Alert` with `withCloseButton`, keeping `role="alert"` |

The photo swap also deletes `selectedPhoto` and `selectedPhotoPreview` (107–108), the preview ref and its effect (110–115), `handlePhotoChange` (218–243) and `handleRemovePhoto` (245–252). `handleSubmit` (254–262) reads the single `picked` file out of `photos` and still calls `toPhotoUploadInputs`; `resolvedPhotoUrl` (271–273) keeps its "a stored URL survives an edit with no new pick" behaviour by reading the `stored` entry instead.

`TYPE_ACTIVE_CLASS` (25–31) goes: the per-type colours become the tokens Task 5.13 adds, applied by `ToggleChipGroup`'s `data-value` attribute rather than five class names.

`isFormValid` (338–344) is unchanged — it reads `form`, not the photo state.

- [ ] **Step 1: Write the failing tests** — every field keeps its placeholder and id; a selected event type reports `aria-pressed="true"`; the RSVP group is a radio group with "public" selected; picking a photo shows a remove button and removing it restores the picker; in edit mode an event that already has `photo_url` shows it as a stored photo, and submitting without touching it keeps that URL.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/events/create.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass**, then check `10-events.spec.ts`'s `#event-start-date` and `#event-start-time` locators still resolve.
- [ ] **Step 5: Commit** as `refactor(web): move create event onto Mantine fields and ImageUploader`.

### Task 5.13: `createEvent.module.css` onto semantic tokens

**Files:** `pages/events/createEvent.module.css`, `apps/web/src/styles/tokens.css`, `tokens.test.ts`, `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs`.

59 violations: 57 colour literals and 2 legacy tokens. The five `typeChipActive*` variants carry per-type colours; they become the `--event-<type>-fg` and `--event-<type>-bg` semantic tokens that **PR 7 also needs**. Add them to `tokens.css` here, and note in PR 7's section that the tokens already exist. `outline: none` at 69 belonged to `.input`, which is now Mantine's, so it goes.

The source values are already shared: `EVENT_TYPE_COLORS` in `packages/shared/src/constants/events.ts:16–22` pairs a text and a background hex per type (cultural `#E65100`/`#FFF3E0` through other `#424242`/`#F5F5F5`). Convert those ten to oklch for `tokens.css`. **Leave the shared constant alone** — mobile styles its event chips from it, and `packages/shared` has no access to web tokens.

- [ ] **Step 1: Add the ten event-type tokens to `tokens.css`** — a foreground and a background for each of `cultural`, `religious`, `social`, `career` and `other`, converted from `EVENT_TYPE_COLORS` — and extend the token contrast test to cover each pair.
- [ ] **Step 2: Run the contrast test.** `npm run test --workspace=apps/web -- src/styles/tokens.test.ts`. Shrink any chroma that fails 4.5:1, the way implementation decision 4 did.
- [ ] **Step 3: Rewrite `createEvent.module.css`** on semantic tokens and delete the rules whose markup Tasks 5.11 and 5.12 removed.
- [ ] **Step 4: Remove the stylesheet from `guard-css-tokens.allowlist.json` and `src/pages/events/create.page.tsx` from `RAW_ELEMENT_ALLOWLIST`**, then run `npm run lint:guards`, `npm run lint --workspace=apps/web` and `npm run test --workspace=apps/web`.
- [ ] **Step 5: Commit** as `style(web): move the create event stylesheet onto semantic tokens`.

### Task 5.14: E2E, screenshots, accessibility, docs and the PR

**Files:** `apps/web/e2e/visual/pages.ts`, `apps/web/e2e/tests/05-create-post.spec.ts`, `10-events.spec.ts`, `11-marketplace.spec.ts`, `docs/architecture/web-ui-system.md`.

Two of the three pages have no screenshot today (inventory finding 3). Add them to `VISUAL_PAGES`:

```ts
{ name: 'create-listing', path: '/marketplace/create', signedIn: true, ready: (page) => heading(page, /create listing/i) },
{ name: 'create-event', path: '/events/create', signedIn: true, ready: (page) => heading(page, /create event/i) },
```

`a11y-baseline.json` has no `create-post` key, so that page is already free of serious and critical violations and must stay that way. The two new pages may **not** add entries — whatever axe reports on them is fixed here.

- [ ] **Step 1: Add the two visual pages** and run the smoke pass, which needs no Docker: `node scripts/visual/smoke.mjs`.
- [ ] **Step 2: Run the e2e suite.** `npm run test:e2e:web`. Fix any selector the earlier tasks moved; the known risks are the tag and event-type chip names and the four date/time ids.
- [ ] **Step 3: Check the definition of done's structural items.** No `confirm(`, `alert(` or `prompt(` left in the three pages; no `<Link>` wrapping a `<Button>`; both allowlists have lost all three pages and their two stylesheets; page line counts are near the figures in the preamble.
- [ ] **Step 4: Regenerate the baselines.** Push a commit whose message contains `[visual-baselines]` to run the Visual baselines workflow (implementation decision 1), download the `visual-baselines` artifact, review **every** changed PNG, and commit the screenshots plus the a11y diff. The a11y diff must contain no added lines.
- [ ] **Step 5: Document the new components.** Add `ImageUploader`, `ToggleChipGroup` and `DateTimeField` to `docs/architecture/web-ui-system.md`, with their props, plus the three helpers in `src/lib/`. No feature doc changes: nothing user-facing changes except the dropped drag-and-drop reorder and the new failure messages, both recorded here.
- [ ] **Step 6: Run the full gate.** `npm run lint`, `npm run lint:guards`, `npm run type-check`, `npm run test`, `npm run test:e2e:web`, `npm run test:visual:web` and `npm run docs:check`.
- [ ] **Step 7: Walk the keyboard** through all three forms: Tab, Shift+Tab, Enter, Space and Escape, including the uploader's move and remove buttons, the chip groups and the confirm dialog.
- [ ] **Step 8: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then `gh pr edit <number> --add-reviewer @copilot`. Update the Live tracker row to `In Review (PR #NN)`.

## PR 6 — Profile + public profile (`feat/web-ui-profile`)

- **Pages:** `pages/profile.page.tsx` (778), `pages/users/[id].page.tsx` (678), `pages/profile/locations.page.tsx`.
- **CSS:** `styles/Profile.module.css`, `styles/PublicProfile.module.css`, `styles/ManageLocations.module.css` (`outline: none` at 64), `components/profile/AboutYouSection.module.css`, `components/users/FollowButton.module.css`.
- **Profile:**
  - Mantine `Tabs` with full ARIA and arrow keys replace the plain tab buttons (profile 663–692) and the custom tablist in users/[id] 615–673.
  - `TrustBadge` replaces `trustBadge` / `trustChip`.
  - `usePrompt` replaces `window.prompt` (profile 183, 215).
  - An `ActionMenu` replaces the hamburger menu (profile 553–600).
  - The photo upload uses `ImageUploader`.
- **Public profile:**
  - Use `Avatar` instead of the custom img/initials and local `getInitials`. Single-word names now show two letters.
  - Adopt `EmptyState` and `LoadingState`, replacing the custom skeleton (users/[id] 199–217).
- **Locations:** replace native dialogs in `profile/locations`.

### PR 6 — Area inventory

Run on `master` at `e685317` (the "Starting an area PR" commands), 2026-09-21.

| File | Lines | CSS violations | Raw form elements | Native dialogs |
|---|---|---|---|---|
| `pages/profile.page.tsx` | 800 | — | 5 | 2 |
| `styles/Profile.module.css` | 422 | 104 (94 legacy tokens, 9 literals, 1 named) | — | — |
| `pages/users/[id].page.tsx` | 678 | — | 2 | 0 |
| `styles/PublicProfile.module.css` | 786 | 202 (192 legacy tokens, 10 literals) | — | — |
| `pages/profile/locations.page.tsx` | 302 | — | 4 | 2 |
| `styles/ManageLocations.module.css` | 158 | 16 (15 legacy tokens, 1 named) | — | — |
| `components/profile/AboutYouSection.tsx` / `.module.css` | 117 / 29 | 11 literals | 4 | — |
| `components/users/FollowButton.tsx` / `.module.css` | 74 / 12 | 5 literals | 1 | — |

`outline: none` sits at `ManageLocations.module.css` 64 and 93. The dialogs are `window.prompt` for the name and the bio (profile 188, 220), and `alert` on a duplicate location name and `confirm` before removing a location (locations 101, 111). `a11y-baseline.json` holds four entries for this area: `color-contrast` on `profile` and `public-profile`, at both widths.

`pages/profile/notifications.page.tsx` lives under `profile/` and is on the raw-element allowlist, but it is the notification preferences page and belongs to PR 9.

**What the recon changed** (the three pages read on 2026-09-21):

1. **The profile photo does not fit `ImageUploader`.** Picking a file uploads it at once, the avatar is the preview, and the file is centre-cropped to a 500px square first (profile 281–333). `ImageUploader` holds files in form state for a later submit, and adds a dropzone, a thumbnail and a "0/1 photos" count that the avatar already covers. See decision 1.
2. **Removing a profile photo never cleared it**, on web or on mobile. Both send `updateUserProfile(..., { profile_photo: undefined })` (profile 342, mobile `EditProfileScreen.tsx` 205). `JSON.stringify` drops `undefined`, so the update writes only `updated_at`. The file is deleted from storage while `users.profile_photo` still points at it. Task 6.2 adds a shared `removeProfilePhoto` that writes `null`, and both apps call it.
3. **The public profile queries `metro_areas` from the page** (users/[id] 102–106), which the shared-first rule forbids. Task 6.1 adds `getMetroAreaById` to `packages/shared/src/api/metroArea.ts`. `contexts/LocationContext.tsx:81` runs the same raw query; it is not a UI file, so it stays.
4. **The two pages render the same rows two ways.** Both list a member's posts and listings, with different markup, different copy ("❤️ 3" against "3 likes", "📍 Local" against "Local") and different prices: the profile prints the free-text `price` column as stored, while the public profile parses it and hides anything that is not a number. Tasks 6.3–6.5 build one row per kind. The public profile's text-only style wins, because its tests already rule out the emoji (`[id].test.tsx:380`). Events get a row too, which fixes "18 goings" (users/[id] 362, asserted at `[id].test.tsx:411`).
5. **The listing status badge is an inline style.** profile 492–497 and 514 pass six hex literals through Mantine's `styles` prop, which neither guard can see. Task 6.5 moves status onto `--success`, `--warning` and `--danger`, which `tokens.contrast.test.ts` already clears for AA on `--surface-1`.
6. **The "expiring soon" rule exists four times:** `daysUntilExpiry <= 14 && status === 'active'` in web profile 499, web my-listings 118, mobile `ProfileScreen.tsx` 323 and mobile `MyListingsScreen.tsx` 136. Task 6.1 adds `isListingExpiringSoon` to shared. This PR adopts it on the profile only; PR 8 and mobile pick it up later.
7. **The profile's tab tests look for buttons.** 14 cases in `profile.test.tsx`, 3 in `e2e/tests/06-profile.spec.ts` and `11-marketplace.spec.ts:101–102` find the tabs by `role=button`. Mantine `Tabs` makes them `role=tab`, so all of them change. The public profile's tests already use `role=tab`.
8. **Manage Locations fails silently three times.** Rename, remove and set-default await the shared call and ignore its `error` (locations 104, 112, 118). Task 6.19 reports each failure with `notify.error`.
9. **Manage Locations has no screenshot.** Task 6.20 adds it to `VISUAL_PAGES`. As with every new page, it may not add baseline entries.
10. **Storage deletes do nothing on staging** (found in Task 6.2 review, 2026-09-21). Migration 027 dropped the only SELECT policies on `storage.objects`, and `remove()` needs SELECT as well as DELETE, so avatar, post, listing and event photo deletes report success and delete nothing; an upsert over an existing avatar most likely fails for the same reason. `pg_policies` on nusa-staging confirms no SELECT policy exists. The fix is an additive migration `039` granting each member SELECT on their own objects only (avatars: `name = auth.uid() || '.jpg'`; the other buckets: first folder = `auth.uid()`), which does not reopen the listing that 027 closed. It is raised with the user and kept out of this PR unless they decide otherwise.

## PR 6 — Task breakdown

Work on `feat/web-ui-profile`, branched from `master` at `e685317`. Same conventions as PRs 4a–5: test first, one commit per task, query by role, label or text, semantic tokens only, no inline `style={{}}` and no colour literals passed through Mantine's `styles` prop (spacing props such as `mt` and `c="dimmed"` are fine, as elsewhere in the app), and Mantine components rather than raw elements outside `components/ui/`. No new dependencies: `Tabs`, `FileButton`, `NativeSelect` and `NumberInput` all ship in `@mantine/core`.

**Decisions this breakdown locks in:**

1. **The profile photo uses Mantine `FileButton`, not `ImageUploader`** (recon 1). `FileButton` replaces the raw `<input type="file">` and keeps today's flow: pick, crop, upload. `ImageUploader` was planned to replace four uploaders, "and profile in PR 6" (PR 5 section). That last one is closed as not taken, so `ImageUploader` has three callers.
2. **Photo feedback becomes toasts.** The status line under the avatar (profile 645–652) stays on screen until the next action. Success and failure go through `notify` instead, like the name and bio edits next to it.
3. **Tabs stay in component state, not the URL.** Search keeps its tab in the URL, but nothing links to a profile tab. Driving the tab from the URL would also need a stateful router mock in the two dozen cases that switch tabs.
4. **`Tabs` use `keepMounted={false}`, as search does.** Otherwise Mantine keeps inactive panels in the DOM, hidden, and `profile.test.tsx:168` asserts that the posts empty text is gone on the About tab.
5. **Hometown district is a `NativeSelect`.** 77 districts suit the platform picker on a phone, and a native `<select>` keeps working for the two About You tests that set it by value (`profile.test.tsx:415`, `432–434`).
6. **Trust shows only through `TrustBadge`.** "Level 1: Verified" and "Level 1 · Verified" become the badge's "Verified", as on every post. Four unit assertions change (`profile.test.tsx:117`, `[id].test.tsx:223`, `233`, `244`). The e2e regex `/level 1|verified/i` already matches.
7. **Name and bio are validated inside the dialog.** With `usePrompt`'s `validate`, the dialog stays open showing the shared `fullNameSchema` or `bioSchema` message (e.g. "Name must be at least 2 characters"). Today the prompt closes and a toast reports the problem.
8. **`FollowButton` keeps its text while loading.** Its tests assert `textContent === '…'` while the status loads. Mantine's `loading` prop would hide the label behind a spinner and force `disabled`. *(Corrected in review: in 8.3.18 the label stays in the DOM, hidden by CSS, so `textContent` would survive; `loading` is still avoided because a disabled button loses keyboard focus.)* The button shows '…' with `aria-label="Loading follow status"` only while its initial status loads. While a follow or unfollow saves, it stays focusable (`aria-disabled`, not `disabled`) and shows the new state at once, so a keyboard user keeps focus and hears the change. Its label reads "Follow" / "Following" alongside `aria-pressed`, which repeats the state rather than contradicting it. That is a deliberate exception to `web-ui-system.md`'s rule that toggle state belongs to the platform, following the social-app convention.
9. **One PR, with the public profile first.** Tasks 6.3–6.10 finish the public profile before 6.11–6.19 touch the own profile and Manage Locations. If the diff runs long, the PR can split cleanly after 6.10. The default is one PR, as with PR 5, because each PR costs a Visual baselines run.
10. **No `useInfiniteScroll` here.** The definition of done asks lists to use it, but none of these lists are paged. Each is one request capped at 30 (posts, saved posts, listings) or 50 (organised events), with no "load more" today. Adding pagination would be a behaviour change and a new API cursor, which is more than this PR's remit. The caps stay as they are.
11. **Rows lift with a border, not a shadow** (settled in Task 6.3 review). `web-ui-system.md` keeps `--shadow-float` for floating layers, so every summary row takes `border-color: var(--border-solid)` on `:hover` and `:focus-within`, as `PulseCard` and `SponsoredRail` already do. `PostCard` and the feed's inline sponsored card still lift with a shadow; PR 10's cleanup moves them over.

**Files this PR creates:**

| Path | Responsibility |
|---|---|
| `packages/shared/src/utils/listingPrice.ts`, `.test.ts` | `formatListingPrice`: the free-text price column, for display |
| `packages/shared/src/api/metroArea.test.ts` | Tests for the new `getMetroAreaById` (the file had none) |
| `packages/shared/src/utils/text.ts`, `.test.ts` | `pluralize(count, singular, plural?)`, shared by the summary rows *(added in review, 3ea26a3)* |
| `apps/web/src/components/ui/SummaryRow.tsx`, `.module.css`, `.test.tsx` | The shell every summary row shares: stretched title link, badge, leading, menu, dotted meta lines *(added in review, Task 6.5a)* |
| `apps/web/src/components/posts/PostSummaryRow.tsx`, `.module.css`, `.test.tsx` | One post as a row: title link, scope, excerpt, counts |
| `apps/web/src/components/events/EventSummaryRow.tsx`, `.module.css`, `.test.tsx` | One event as a row: date, place, going count, past or cancelled |
| `apps/web/src/components/marketplace/ListingSummaryRow.tsx`, `.module.css`, `.test.tsx` | One listing as a row, with an owner view for status, stats and expiry |
| `apps/web/src/components/users/PublicProfileHeader.tsx`, `.module.css`, `.test.tsx` | The public profile card: avatar, name, trust, bio, follow, chips, message button |
| `apps/web/src/hooks/usePublicProfile.ts`, `.test.ts` | Loads a member's profile, metro, posts, events, listings and helper score |
| `apps/web/src/lib/profilePhoto.ts`, `.test.ts` | `replaceProfilePhoto`: crop, then the shared `setProfilePhoto` |
| `apps/web/src/components/profile/ProfilePhotoControl.tsx`, `.module.css`, `.test.tsx` | The avatar with Add/Change/Remove photo |
| `packages/shared/src/utils/bytes.ts`, `.test.ts` | `formatMegabytes`, shared by `ProfilePhotoControl` and `ImageUploader` *(added in review, Task 6.12)* |
| `apps/web/src/hooks/useProfileEditing.ts`, `.test.tsx` | Edit name, edit bio and change password, through `usePrompt` and `notify` |
| `apps/web/src/hooks/useOwnProfileContent.ts`, `.test.ts` | Loads the signed-in member's posts, saved posts and listings; `unsave` with rollback |
| `apps/web/src/hooks/useUserList.ts`, `.test.ts` | One user-scoped list with loading, error and `reload`; reusable by PR 10 *(added in review, Task 6.14)* |
| `apps/web/src/components/profile/AccountDetails.tsx`, `.module.css`, `.test.tsx` | The About tab's read-only Bio, Account Info and Activity sections |
| `apps/web/src/components/profile/AboutYouSection.test.tsx` | Tests for a component that had none |

**Where the pages should land.** Each page keeps its state plumbing and its layout. Every list, card and handler group moves out.

| Page | Before | Target |
|---|---|---|
| `pages/profile.page.tsx` | 800 | ~320 |
| `pages/users/[id].page.tsx` | 678 | ~300 |
| `pages/profile/locations.page.tsx` | 302 | ~290 |

### Task 6.1: Shared helpers — metro by id, listing price, expiry warning

**Files:** `packages/shared/src/api/metroArea.ts`; create `packages/shared/src/api/metroArea.test.ts`; `packages/shared/src/constants/marketplace.ts`; `packages/shared/src/logic/marketplace/listingAge.ts`, `listingAge.test.ts`; create `packages/shared/src/utils/listingPrice.ts`, `listingPrice.test.ts`; `packages/shared/src/utils/index.ts`.

**Interface:**

```ts
// api/metroArea.ts
/** One metro's display fields by id; an error when no such metro exists. */
export async function getMetroAreaById(
  supabase: SupabaseClient,
  metroAreaId: string
): Promise<MetroAreaResult>;

// constants/marketplace.ts, beside LISTING_SOFT_EXPIRY_DAYS
/** How close to soft expiry an active listing gets before its owner is warned. */
export const LISTING_EXPIRY_WARNING_DAYS = 14;

// logic/marketplace/listingAge.ts
export function isListingExpiringSoon(
  listing: Pick<MarketplaceListing, 'status' | 'refreshed_at'>,
  now: Date
): boolean;

// utils/listingPrice.ts
/**
 * `price` is a free-text column. A value that looks like a US price ("80",
 * "80.50", "$1,200") reads as dollars; anything else ("Negotiable", "80 OBO")
 * is shown as typed.
 */
export function formatListingPrice(price: string | number | null | undefined): string | null;
```

`getMetroAreaById` selects `id, name, state, population` from `metro_areas` with `.eq('id', …).single()`, in the style of `searchMetroAreas` beside it. `formatListingPrice` formats a string only when it matches a US price: an optional `$`, digits with optional thousands separators, and optional cents. So `"$1,200"` stays `"$1,200"`, while `"80,50"`, `"-5"` and `"1e3"` are shown as typed rather than reparsed. It uses whole dollars when the rounded value is whole and cents otherwise, which matches `formatPrice` (users/[id] 45–55), the function it replaces. Test data passes `price: 80` as a number, so the parameter accepts one. *(Tightened in review, `7f1ed61`.)*

- [ ] **Step 1: Write the failing tests.** `metroArea.test.ts`, with the `makeChain` pattern from `follows.test.ts`: selects from `metro_areas` filtered by id and returns the row; a PostgREST error comes back as `error`. `listingAge.test.ts`: active and 80 days since refresh (10 left) is expiring; active with 20 left is not; exactly 14 left is; inactive at 80 days is not. `listingPrice.test.ts`: `80` → `"$80"`, `"80"` → `"$80"`, `"80.5"` → `"$80.50"`, `"$1,200"` → `"$1,200"`, `"Negotiable"` → `"Negotiable"`, `"  "` → `null`, `null` → `null`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/api/metroArea.test.ts src/logic/marketplace/listingAge.test.ts src/utils/listingPrice.test.ts`
- [ ] **Step 3: Implement**, and export `listingPrice` from `utils/index.ts`. `logic/index.ts` already re-exports `./marketplace`; confirm `isListingExpiringSoon` reaches `@nepally/shared` through it.
- [ ] **Step 4: Run and watch them pass**, then `npm run type-check`.
- [ ] **Step 5: Commit** as `feat(shared): add getMetroAreaById, formatListingPrice and isListingExpiringSoon`.

### Task 6.2: Removing a profile photo clears it

**Files:** `packages/shared/src/api/users.ts`, `users.test.ts`; `apps/mobile/src/screens/profile/EditProfileScreen.tsx`, `EditProfileScreen.test.tsx`.

**Interface:**

```ts
/**
 * Clears the member's photo. The column is cleared first, so a storage delete
 * that fails leaves an orphaned file rather than a profile pointing at nothing.
 */
export async function removeProfilePhoto(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: Error }>;
```

It calls `updateUserProfile(supabase, userId, { profile_photo: null })`. On success it calls `deleteProfilePhoto` and ignores that call's error: the file is named `<userId>.jpg`, and the next upload overwrites it. `users.ts` imports `deleteProfilePhoto` from `./storage`. `storage.ts` does not import `users.ts`, so this adds no cycle.

This is the fix for recon 2. It is a bug on both apps, so mobile adopts it here. Web adopts it in Task 6.16.

- [ ] **Step 1: Write the failing tests** in `users.test.ts`. On success, `from('users').update` receives `profile_photo: null`, and then storage removes `<userId>.jpg`. When the update fails, the error comes back and storage is not touched. When the storage delete fails, the result is still success.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/api/users.test.ts`
- [ ] **Step 3: Implement**, then switch mobile's `handleRemovePhoto` (`EditProfileScreen.tsx` 195–222) from the `deleteProfilePhoto` + `updateUserProfile` pair to `removeProfilePhoto`. In `EditProfileScreen.test.tsx`, mock `removeProfilePhoto` where `deleteProfilePhoto` is mocked (line 46), and add a case where removing the photo calls it.
- [ ] **Step 4: Run both suites.** `npm run test --workspace=packages/shared -- src/api/users.test.ts` and `npm run test --workspace=apps/mobile -- EditProfileScreen`
- [ ] **Step 5: Commit** as `fix: clear profile_photo when a member removes their photo`.

### Task 6.3: `PostSummaryRow`

**Files:** create `components/posts/PostSummaryRow.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface PostSummaryRowProps {
  post: Pick<Post, 'id' | 'title' | 'description' | 'is_global' | 'created_at' | 'likes_count' | 'comments_count'>;
  /** Sits beside the link, never inside it — e.g. an ActionMenu. */
  menu?: ReactNode;
}
```

A stretched link, like `PostCard`: the title is the only link, and its `::after` covers the row, so a menu can sit beside it without being nested. The row shows the title, a `ScopeBadge`, the description clamped to two lines when there is one, and "2h ago · 3 likes · 1 comment". It replaces profile 445–483, the saved-post copy at 395–443, and users/[id] 280–309.

- [ ] **Step 1: Write the failing test.** The link's accessible name is the title and it points to `/posts/<id>`. The badge reads "Local" or "Global". The description renders only when non-empty. Counts pluralise ("1 like", "2 comments"). A `menu` renders outside the link (`link.contains(menuButton)` is false).
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/posts/PostSummaryRow.test.tsx`
- [ ] **Step 3: Implement**, with the module on semantic tokens.
- [ ] **Step 4: Run and watch it pass**, then `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `feat(web): add PostSummaryRow`.

### Task 6.4: `EventSummaryRow`

**Files:** create `components/events/EventSummaryRow.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface EventSummaryRowProps {
  event: Pick<Event, 'id' | 'title' | 'start_date' | 'end_date' | 'location_name' | 'rsvp_count' | 'is_global' | 'status'>;
  /** From useNow(), so every row agrees on what is past — and tests can fix it. */
  now: Date;
}
```

This replaces users/[id] 324–367, and uses the same stretched link as `PostSummaryRow`. The second line reads "Mar 5, 2026 · Dallas Convention Center". The meta line reads "18 going", fixing "18 goings", and adds "Cancelled" or "Past" when either applies. PR 7's event lists can use it.

- [ ] **Step 1: Write the failing test.** Link name and href. The date and place line. "18 going". "Cancelled" for a cancelled event, even an upcoming one. "Past" when `end_date` is before `now`, or `start_date` when there is no end date. Neither label for an upcoming event.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/events/EventSummaryRow.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add EventSummaryRow`.

### Task 6.5a: `SummaryRow` shell *(added in review of 6.4)*

**Files:** create `components/ui/SummaryRow.tsx`, `.module.css`, `.test.tsx`; modify `components/ui/index.ts`, `components/posts/PostSummaryRow.tsx` / `.module.css`, `components/events/EventSummaryRow.tsx` / `.module.css`.

After Tasks 6.3 and 6.4, about 50 of `EventSummaryRow.module.css`'s 80 lines copy `PostSummaryRow.module.css` word for word. That includes the stretched link, the no-shrink badge wrapper, the border hover (decision 11) and the `content: '·' / ''` separator. `ListingSummaryRow` would be the third copy. This task moves the shared part into one shell, so the rule "only the title is a link, and the menu sits outside it" lives in one place.

**Interface:**

```ts
export interface SummaryRowProps {
  /** The row's only link. Its `::after` covers the row. */
  href: string;
  title: string;
  /** Beside the title, e.g. a ScopeBadge or a status chip. It never shrinks. */
  badge?: ReactNode;
  /** Before the text, e.g. a thumbnail. Outside the link. */
  leading?: ReactNode;
  /** Beside the row, above the link's overlay, e.g. an ActionMenu. A falsy value renders no slot. */
  menu?: ReactNode;
  /** The lines under the title. */
  children?: ReactNode;
}

/** One line of items separated by a dot that screen readers skip. */
export interface SummaryRowMetaProps {
  children: ReactNode;
  /** `detail` is the body-size line under a title; `meta` is the smaller, quieter one. Default `meta`. */
  variant?: 'detail' | 'meta';
}
```

`PostSummaryRow` becomes `SummaryRow` with a `ScopeBadge` badge, its clamped description, and a `SummaryRowMeta`. `EventSummaryRow` becomes `SummaryRow` with two `SummaryRowMeta` lines. Each row keeps only its own rules: the description clamp for posts, and nothing much for events. `overflow-wrap: anywhere` moves into `SummaryRowMeta`, so every row gets it. `PostCard` is left alone, because its hover is PR 10's (decision 11).

- [ ] **Step 1: Write the failing test** for `SummaryRow`. The only link is named by `title` and points to `href`. `badge`, `leading` and `menu` each render outside the link. `menu={false}` renders no slot (the article has one fewer child). `SummaryRowMeta` renders each item in its own element.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/ui/SummaryRow.test.tsx`
- [ ] **Step 3: Implement**, export both from `components/ui/index.ts`, and move the two rows onto it. **Their existing tests are the specification and must pass unchanged.**
- [ ] **Step 4: Run all three suites**, then `npm run lint --workspace=apps/web`, `npm run lint:guards` and `npm run type-check --workspace=apps/web`.
- [ ] **Step 5: Commit** as `refactor(web): share one SummaryRow shell between the summary rows`.

### Task 6.5: `ListingSummaryRow`

**Files:** create `components/marketplace/ListingSummaryRow.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface ListingSummaryRowProps {
  listing: MarketplaceListing;
  /** The owner's view: status, view/save/contact counts and the expiry warning. */
  owner?: { now: Date };
}
```

This replaces profile 485–537 and users/[id] 392–439. Both views show:

- a 64px thumbnail: the first photo through `next/image` with `alt=""`, since the title follows, or the category emoji on `--surface-sunken`
- the title, as a stretched link to `/marketplace/listing/<id>`
- `formatListingPrice` and the category name

The public view adds the relative time. The owner view adds:

- a status chip
- "12 views · 3 saves · 1 contact", built with the shared `pluralize` (`packages/shared/src/utils/text.ts`) rather than a local copy
- "Expires in 10 days", when `isListingExpiringSoon` is true

The status chip is text with a 1px border, in `--success` (active), `--warning` (inactive) or `--danger` (removed), on `--surface-1`. A `data-status` attribute selects the colour (recon 5). PR 8's my-listings page can adopt both the row and `isListingExpiringSoon`.

*(Tightened in review, `ffed30a` and after.)* The status labels are the shared `LISTING_STATUS_LABELS`, not a local map, and the chip carries a visually hidden "Status: " prefix. The expiry line is coloured `--warning` through `data-tone="warning"`. Its wording comes from the shared `getListingExpiryNotice(listing, now)`: at 0 days left an active listing is already past soft expiry, so it reads "Refresh to stay visible in search" rather than "Expires in 0 days", which today's profile and my-listings show forever. `photos` may be null in the database, so the row reads `photos?.[0]`.

Build it on `SummaryRow` (Task 6.5a): the thumbnail is `leading`, the owner view's status chip is `badge` (the public view has none), and the lines are `SummaryRowMeta`s. Its own stylesheet then holds only the thumbnail and the status chip.

- [ ] **Step 1: Write the failing test.** Link name and href. `price: 80` shows "$80", and "Negotiable" shows as typed. No price when it is `null`. The category emoji when there are no photos. The public view shows the relative time and no status. The owner view shows "Active" and the three counts. "Expires in 10 days" appears at 80 days since refresh, and not for an inactive listing.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/marketplace/ListingSummaryRow.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add ListingSummaryRow`.

### Task 6.6: `FollowButton` onto Mantine `Button`

**Files:** `components/users/FollowButton.tsx`, `FollowButton.module.css`, `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs`.

The raw `<button>` (63–72) becomes `Button` with `variant={following ? 'default' : 'filled'}`, `radius="xl"` and `size="sm"`. It keeps `data-testid="follow-button"`, `aria-pressed` and the `'…'` label while loading (decision 8). The theme's ink replaces the hard-coded red (`#c8102e`). The stylesheet shrinks to one rule, `min-inline-size: 7rem`, so the button does not change width when `'…'` becomes "Follow". The five colour literals go.

- [ ] **Step 1: Run the existing tests first** — `npm run test --workspace=apps/web -- src/components/users/FollowButton.test.tsx` — and confirm they pass. They are the specification for this change.
- [ ] **Step 2: Implement**, and remove `FollowButton.module.css` from the CSS allowlist and `src/components/users/FollowButton.tsx` from `RAW_ELEMENT_ALLOWLIST` in the same commit.
- [ ] **Step 3: Run the tests again** — unchanged, all eight pass — then `npm run lint:guards` and `npm run lint --workspace=apps/web`.
- [ ] **Step 4: Commit** as `refactor(web): build FollowButton on Mantine Button`.

### Task 6.7: `PublicProfileHeader`

**Files:** create `components/users/PublicProfileHeader.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface PublicProfileHeaderProps {
  profileUser: PublicUser;
  metroName: string | null;
  helperScore: number | null;
  isOwnProfile: boolean;
  viewerId: string | null;
  messaging: boolean;
  onMessage: () => void;
}
```

This takes over users/[id] 494–612, the derived values at 242–257, and the local `getInitials` at 34–39.

| Today | Becomes |
|---|---|
| hand-built avatar, 88px image or initials (499–514) | `Avatar` at `xlarge` (80px). The shared `getInitials` gives single-word names two letters |
| `trustChip` (518–521) | `TrustBadge` (decision 6) |
| raw message `<button>` (601–608) | `Button onClick={onMessage}`, with the same labels ("Message Bikal S.", "Sign in to message", "Opening conversation…") and `disabled` while messaging |
| "Edit profile →" link (597–599) | `Button component={Link} href="/profile" variant="default"` |
| identity chip spans (572–587) | a `<ul>` of chips on tokens |

The banner stays, as a decorative `aria-hidden` block on tokens. The header's rules go into `PublicProfileHeader.module.css`, written on semantic tokens from the start.

- [ ] **Step 1: Write the failing test.** The `h1` is the public name. `TrustBadge` shows "Verified" at level 1. The new-member hint appears at level 0, and only on someone else's profile. The bio shows when set, and "Add a short bio" appears only on your own profile. The message button labels (signed in, signed out, busy) and `onMessage`. The "Edit profile" link on your own profile. The follower counts. Identity chips appear only for the fields that are set. The helper badge appears at `HELPER_SCORE_VISIBILITY_THRESHOLD` and not below it.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/users/PublicProfileHeader.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add PublicProfileHeader`.

### Task 6.8: `usePublicProfile`

**Files:** create `hooks/usePublicProfile.ts`, `.test.ts`.

**Interface:**

```ts
export interface PublicProfileState {
  profileUser: PublicUser | null;
  metroName: string | null;
  posts: Post[];
  events: Event[];
  listings: MarketplaceListing[];
  helperScore: number | null;
  /** The profile itself; the three lists load on their own flags. */
  loading: boolean;
  postsLoading: boolean;
  eventsLoading: boolean;
  listingsLoading: boolean;
  error: string | null;
}

export function usePublicProfile(id: string | undefined): PublicProfileState;
```

This moves users/[id] 62–152 out of the page, calling `getMetroAreaById` instead of the raw query (recon 3). Otherwise nothing changes: the same five requests, the same cancel-on-unmount guard, and the same "We couldn’t find this member. They may have deleted their account." message.

*(Changed in review, 2026-09-21.)* One deliberate departure from a straight move. The Pages Router keeps this page mounted when you go from one member to another, and the old effect never cleared the previous member's state. A member with no metro therefore showed the previous member's location permanently, and the previous profile painted for one frame under the new URL. The hook resets its state during render when `id` changes, following the "adjust state when a prop changes" pattern `useSearchPage` uses.

- [ ] **Step 1: Write the failing test** with `renderHook`. It loads the profile, "Dallas-Fort Worth, TX", the three lists and the helper score. A missing member sets the error message. A member with no `metro_area_id` leaves `metroName` null and never calls `getMetroAreaById`. An `undefined` id requests nothing.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/usePublicProfile.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `refactor(web): load the public profile through usePublicProfile`.

### Task 6.9: The public profile page on the new pieces

**Files:** `pages/users/[id].page.tsx`, `[id].test.tsx`.

| Today | Becomes |
|---|---|
| Skeleton (192–220) | `<LoadingState variant="detail" label="Loading profile…" />`; the test at 174 still finds `aria-busy` |
| Error notice (222–239) | `EmptyState` titled "Member not found", with the hook's message as its description and a `Button component={Link} href="/"` "Back to feed" |
| Profile card (494–612) | `PublicProfileHeader` |
| `role="tablist"` rail (614–673) | Mantine `Tabs` with `keepMounted={false}` (decision 4) and `Tabs.List aria-label="Profile sections"`. Counts render as a `rightSection` badge when above zero, as on search |
| `renderPosts` / `renderEvents` / `renderListings` (260–440) | `LoadingState`, then `EmptyState` with today's sentences, or the rows from Tasks 6.3–6.5. Your own empty profile gets `Button component={Link}` actions, "Start a post" and "Post a listing", in place of the inline links at 269 and 381 |
| `renderAbout` (442–483) | stays in the page, as a `<dl>`. `TrustBadge` replaces its trust chip |

`formatPrice` (45–55) and `pluralize` (41–43) are deleted.

- [ ] **Step 1: Update the tests first.** The three trust assertions (223, 233, 244) read "Verified", "New Member" and "Contributor". "18 goings" becomes "18 going" (411). Add these cases: loading shows a `status`; not-found shows a "Back to feed" link to `/`; the tab list is named "Profile sections" and has four tabs; ArrowRight on the Posts tab moves focus to Events.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/users/[id].test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass**, and check that the page is near its ~300-line target.
- [ ] **Step 5: Commit** as `refactor(web): rebuild the public profile on shared rows and Mantine Tabs`.

### Task 6.10: `PublicProfile.module.css` onto semantic tokens

**Files:** `styles/PublicProfile.module.css`, `scripts/guard-css-tokens.allowlist.json`, `pages/users/[id].page.tsx` (the `Tabs` `classNames` hook only).

The file has 202 violations (192 legacy tokens, 10 literals), and most of it is deleted rather than converted:

- `skeleton*`, `@keyframes shimmer` and its reduced-motion block go, because `LoadingState` replaces them
- `tab*` goes to Mantine `Tabs`
- `trust*` and `avatar*` go to `TrustBadge` and `Avatar`
- `row*` and `listing*` go to the rows
- the card rules moved to `PublicProfileHeader.module.css` in Task 6.7

The rules left over (`page`, `container`, `content`, `rowList`, `about*`) are rewritten on tokens. Expect the file to drop from 786 lines to well under 200.

*(Added from the Task 6.9 review.)* Three layout fixes belong here, because this task owns the page wrappers:

- **Tabs must not wrap on a phone.** Mantine's `Tabs.List` wraps, and with three count badges the four tabs need about 400px against about 311px at 375px. Pass `classNames={{ list: styles.tabList }}` with `flex-wrap: nowrap; overflow-x: auto`, which matches the old rail's horizontal scroll.
- **The loading and not-found states need a top gap.** The old notice and skeleton had one.
- **Space between header and tabs.** Restore `--space-4` between the header card and the tabs (`.content` currently has 8px).

`users/[id].page.tsx` already left `RAW_ELEMENT_ALLOWLIST` in `2c1f849`, so only the CSS allowlist changes here.

- [ ] **Step 1: Delete the dead rules.** Diff the class list against `grep -o "styles\.[a-zA-Z]*" src/pages/users/[id].page.tsx`, and confirm with grep that nothing else imports the stylesheet.
- [ ] **Step 2: Map the rest** to semantic tokens using the spec §4.1 table.
- [ ] **Step 3: Remove `apps/web/src/styles/PublicProfile.module.css` from the CSS allowlist** in this commit, and apply the three layout fixes above.
- [ ] **Step 4: Run the guards and the suite.** `npm run lint:guards`, `npm run lint --workspace=apps/web` and `npm run test --workspace=apps/web`.
- [ ] **Step 5: Commit** as `style(web): move the public profile stylesheet onto semantic tokens`.

### Task 6.11: `cropToSquare` and `replaceProfilePhoto`

**Files:** `lib/resizeImage.ts`, `resizeImage.test.ts`; create `lib/profilePhoto.ts`, `profilePhoto.test.ts`.

**Interface:**

```ts
// resizeImage.ts
/** Avatars are shown at 80px; 500px leaves room for high-density screens. */
export const PROFILE_PHOTO_SIZE_PX = 500;
/** Centre-crops to the largest square, scales it to `size`, and encodes JPEG. */
export async function cropToSquare(file: File, size?: number): Promise<File>;

// profilePhoto.ts
/** Crop, upload, and point the profile at the new photo. */
export async function replaceProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ error: string | null }>;
```

`cropToSquare` is profile 286–306, lifted out and made to close its bitmap, which the page never does. `replaceProfilePhoto` is 309–323 without the UI: `cropToSquare`, `arrayBuffer()`, `uploadProfilePhoto`, then `updateUserProfile({ profile_photo: url })`. It returns the thrown message, or "Failed to upload photo". Removal needs nothing here, because the shared `removeProfilePhoto` from Task 6.2 covers it.

*(As built, after review: `b433b2d`, `c787aa3` and the follow-up.)*

- **Upload step.** The upload-then-save step is the shared `setProfilePhoto(supabase, userId, bytes)`, which sits beside `removeProfilePhoto` in `packages/shared/src/api/users.ts`. `replaceProfilePhoto` is crop → `arrayBuffer()` → `setProfilePhoto`.
- **Size constant.** `PROFILE_PHOTO_SIZE_PX` lives in `packages/shared/src/constants/users.ts`, not in `resizeImage.ts`. Import it from `@nepally/shared`.
- **Crop failures** log `profile_photo_crop_failed` and return fixed copy. Shared-API messages pass through unchanged.
- **Image quality.** Both `cropToSquare` and `resizeImage` matte transparency to white, use high-quality smoothing and name their output `.jpg`. `cropToSquare` never upscales.
- **Marketplace listings.** These `resizeImage` changes also affect listing photos, so the PR description must say so.

- [ ] **Step 1: Write the failing tests.** Stub `createImageBitmap` and `HTMLCanvasElement.prototype.toBlob` as `resizeImage.test.ts` already does. `cropToSquare` on a 1000×600 image draws the source rectangle (200, 0, 600, 600) into (0, 0, 500, 500); on 600×1000 it draws (0, 200, 600, 600). The result is `image/jpeg`. The bitmap is closed on success and on a failed encode. A missing 2D context rejects. `replaceProfilePhoto`: success uploads the bytes, writes the URL and returns `error: null`. An upload error returns its message and never touches the profile. A profile write error returns its message.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/lib/resizeImage.test.ts src/lib/profilePhoto.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `refactor(web): extract the profile photo crop and upload`.

### Task 6.12: `ProfilePhotoControl`

**Files:** create `components/profile/ProfilePhotoControl.tsx`, `.module.css`, `.test.tsx`; `packages/shared/src/constants/users.ts` (`MAX_PROFILE_PHOTO_SOURCE_BYTES`); `packages/shared/src/utils/bytes.ts` (`formatMegabytes`, moved out of `ImageUploader` in review).

**Interface:**

```ts
export interface ProfilePhotoControlProps {
  name: string;
  photoUrl: string | null | undefined;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}
```

This replaces profile 606–652:

- **Avatar.** `Avatar` at `xlarge`. While `busy`, a scrim with a Mantine `Loader`, and a visually hidden "Updating photo…" in a `role="status"`.
- **Picking a file.** `FileButton` with `accept={DEFAULT_IMAGE_MIME_TYPES.join(',')}` and `inputProps={{ 'aria-label': 'Upload profile photo' }}`. The input is `display: none`, so this name is only a test and e2e locator; the visible button carries the name and the `aria-describedby`. It also takes a `resetRef`, reset after each pick so the same file can be chosen twice (today's `e.target.value = ''`, 364). Its child is `Button variant="light" size="compact-sm"`, labelled "Add Photo" or "Change Photo".
- **Removing.** "Remove" appears only when there is a photo.
- **While busy.** Both buttons are `aria-disabled` and ignore presses, but stay focusable (decision 8). Removing a photo moves focus to the file button.

The narrower `accept` replaces today's `image/*`. iOS converts HEIC to JPEG for an input that lists specific image types, and `createImageBitmap` cannot decode HEIC anyway.

*(Added from the Task 6.11 review.)* Cap the source file size at the picker. A 48–50MP photo decodes to about 200MB before the crop, and iOS Safari can kill the tab. Add a shared `MAX_PROFILE_PHOTO_SOURCE_BYTES` (e.g. 15MB) beside the other photo limits in `packages/shared/src/constants`. `ProfilePhotoControl` should reject a larger file with friendly copy ("That photo is too large. It must be 15MB or smaller.") before calling `onPick`. It should also reject an unsupported type or an empty file ("That file is not a supported image. Use JPG, PNG or WEBP."), as `ImageUploader` does.

- [ ] **Step 1: Read the installed types.** In `node_modules/@mantine/core/lib/components/FileButton/FileButton.d.ts`, confirm `inputProps` and `resetRef` exist in 8.3.18. If `inputProps` is missing, give the input its name through the `FileButton` render prop's `{...props}` instead, and note it here.
- [ ] **Step 2: Write the failing test.** "Add Photo" shows without a photo, and "Change Photo" plus "Remove" with one. Choosing a file on the "Upload profile photo" input calls `onPick` with it. "Remove" calls `onRemove`. `busy` disables both buttons and announces "Updating photo…".
- [ ] **Step 3: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/profile/ProfilePhotoControl.test.tsx`
- [ ] **Step 4: Implement**, then run and watch it pass.
- [ ] **Step 5: Commit** as `feat(web): add ProfilePhotoControl`.

### Task 6.13: `useProfileEditing`

**Files:** create `hooks/useProfileEditing.ts`, `.test.tsx`.

**Interface:**

```ts
export interface ProfileEditing {
  editName: () => Promise<void>;
  editBio: () => Promise<void>;
  changePassword: () => Promise<void>;
  /** True while a write (and its refresh) is in flight; Task 6.16 disables the menu items. */
  saving: boolean;
}

export function useProfileEditing(
  user: Pick<User, 'id' | 'email' | 'full_name' | 'bio'> | null,
  refreshUser: () => Promise<void>
): ProfileEditing;
```

This replaces `handleEditName`, `handleEditBio` and `handleChangePassword` (profile 185–274), and all nine `setMenuOpen(false)` calls in them, since `ActionMenu` closes itself.

- **`editName`** opens `usePrompt({ title: 'Edit name', label: 'Full name', initialValue, maxLength: FULL_NAME_MAX_LENGTH, validate })`. `validate` returns the shared `fullNameSchema`'s first issue message: 2–100 characters after trimming, with control characters stripped and no letters-only rule. It then writes `fullNameSchema.parse(value)`. *(Changed in review: the first draft only rejected blanks, and nothing anywhere capped `full_name`.)*
- **`editBio`** opens ``usePrompt({ title: 'Edit bio', label: `Bio (up to ${BIO_MAX_LENGTH} characters)`, initialValue, multiline: true, validate })``. `validate` returns `bioSchema`'s first issue message, or null (decision 7). It then writes `bioSchema.parse(value)`.
- **`changePassword`** is today's `resetPasswordForEmail` call.
- **Messages.** Every toast keeps today's words ("Profile updated", "Bio updated", "Bio cleared", "Password reset email sent", and the three failures), sent through `notify`.

- [ ] **Step 1: Write the failing test.** Render a harness with three buttons inside `test-utils`, which provides `ModalsProvider`. Mock `@mantine/notifications` the way `profile.test.tsx` does. Cases:
  - Dismissing the name dialog writes nothing.
  - A blank or one-character name shows "Name must be at least 2 characters" inside the dialog and writes nothing.
  - `"  Sita Gurung "` saves "Sita Gurung", refreshes and toasts "Profile updated".
  - A failed write toasts the error.
  - A 201-character bio shows the schema message in the dialog.
  - Emptying the bio writes `null` and toasts "Bio cleared".
  - `changePassword` toasts both outcomes.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useProfileEditing.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useProfileEditing over the shared prompt dialog`.

### Task 6.14: `useOwnProfileContent`

**Files:** create `hooks/useOwnProfileContent.ts`, `.test.ts`, and the internal `hooks/useUserList.ts`, `.test.ts` (added in review).

**Interface:**

```ts
export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export interface ListResource<T> extends ListState<T> {
  reload: () => void;
}

export interface OwnProfileContent {
  posts: ListResource<Post>;
  saved: ListResource<Post>;
  listings: ListResource<MarketplaceListing>;
  /** Hides the post at once, deletes the save, and shows it again in the same place if the delete fails. */
  unsave: (postId: string) => Promise<{ error?: Error }>;
}

export function useOwnProfileContent(userId: string | null): OwnProfileContent;
```

This moves profile 49–56 and 91–148 out of the page, with two small fixes:

- **Lists start loading.** With a user, each list starts in `loading: true`. Today they start idle, so "You have not created any posts yet." flashes for one render before the request begins.
- **A failed listings load says so.** It reports "Failed to load your listings" instead of falling through to "No marketplace listings yet." (today's `result.data || []`, 137).

*(Changed in review, 2026-09-21.)*

- **Loading helper.** Each list comes from a small internal `useUserList<T>(userId, fetchList, fallbackError)` in `hooks/useUserList.ts`. Each list has its own `reload`, so `ErrorState` can offer a retry. PR 10's public-profile list-errors item can reuse the helper.
- **Unsave.** The first draft's one-way `dropSaved` became `unsave`, which owns the whole mutation. It hides the post through a set of hidden ids and restores it in place if `unsavePost` fails. Today the page toasts "Failed to unsave post." while the post stays gone.

- [ ] **Step 1: Write the failing test** with `renderHook`.
  - `useUserList` covers the mechanism: loading, success, error and fallback, reload, stale responses, and user changes.
  - `useOwnProfileContent` covers the wiring: posts are requested with `includeOwnPending` true, and a failed listings load reports "Failed to load your listings".
  - It also covers `unsave`: it hides at once, and restores the post in place on failure.
  - A user change un-hides a post the previous user was unsaving.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useOwnProfileContent.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `refactor(web): load the profile's lists through useOwnProfileContent`.

### Task 6.15: `AccountDetails`

**Files:** create `components/profile/AccountDetails.tsx`, `.module.css`, `.test.tsx`.

**Interface:**

```ts
export interface AccountDetailsProps {
  user: Pick<User, 'bio' | 'email' | 'phone' | 'zip_code' | 'created_at' | 'posts_count' | 'helpful_votes_received'>;
  /** Opens the bio editor (useProfileEditing().editBio). */
  onEditBio?: () => void;
  /** useProfileEditing().saving: the button stays focusable but inert. */
  editBioBusy?: boolean;
}
```

This replaces profile 720–771. It renders the Bio, Account Info and Activity sections, each under an `h2`. Account Info and Activity are `<dl>`s, and the bio is a paragraph that keeps its line breaks. It keeps today's "Not set" and the long "Member Since" date.

*(Changed in review.)* The empty bio no longer reads "No bio set. Tap the menu → Edit Bio to add one.": that is touch wording, screen readers read the arrow aloud, and the menu is an unlabelled ⋯ icon. It now reads "No bio yet." with an "Add a bio" button when `onEditBio` is given, and an existing bio gets an "Edit bio" button.

- [ ] **Step 1: Write the failing test.** The three headings. "Not set" for a missing phone and ZIP code. The formatted member-since date. The bio, and its fallback text when there is none.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/profile/AccountDetails.test.tsx`
- [ ] **Step 3: Implement**, then run and watch it pass.
- [ ] **Step 4: Commit** as `feat(web): add AccountDetails`.

### Task 6.16: The profile page on the new pieces

**Files:** `pages/profile.page.tsx`, `profile.test.tsx`, `e2e/tests/06-profile.spec.ts`, `e2e/tests/11-marketplace.spec.ts`, `apps/web/eslint/raw-element-allowlist.mjs` (the page leaves it here, as `users/[id]` did in 6.9), and the shared scrolling-tabs module (see the Tabs row), which `pages/users/[id].page.tsx` and `PublicProfile.module.css` switch to.

| Today | Becomes |
|---|---|
| Top bar, hamburger, overlay (545–602) | `PageHeader title="Profile"`, whose `actions` hold `<ActionMenu label="Open profile menu">`. Its items are Edit Name, Edit Bio and Change Password from `useProfileEditing`, each with `disabled: saving`, then Logout (`danger`) |
| Avatar, file input, photo buttons, status line (606–652) | `ProfilePhotoControl`. `onPick` calls `replaceProfilePhoto`, and `onRemove` calls the shared `removeProfilePhoto` (Task 6.2). Both then refresh and toast "Photo updated" / "Photo removed", or the error (decision 2) |
| `trustBadge` span and `trustClass` (163–171, 657–661) | `TrustBadge` |
| four tab `<button>`s (664–693) | Mantine `Tabs` with `keepMounted={false}` and `Tabs.List aria-label="Profile sections"`: "Posts", "Listings", "Saved Posts", "About". They use the same scrolling treatment as the public profile's tabs (Task 6.10), moved into a shared `components/ui/scrollingTabs.module.css` plus a `scrollFocusedTabIntoView` handler. That module now has two callers, and search adopts it in PR 10 |
| list state and load effect (49–56, 91–148) | `useOwnProfileContent(user?.id ?? null)` (Task 6.14) |
| `handleUnsave` (385–393) | `const { error } = await unsave(postId)`, then `notify.error('Failed to unsave post.')` or `notify.success('Post unsaved.')`. The hook restores the post if the delete fails |
| `renderPostList` / `renderSavedPostList` / `renderListingsList` (395–537) | `LoadingState`, `ErrorState` with `onRetry={list.reload}`, or `EmptyState` with today's sentences ("Start a post" and "Post a listing" as actions). Otherwise `PostSummaryRow`s, saved ones with `menu={<ActionMenu label="Post options" items={[{ key: 'unsave', label: 'Unsave Post', … }]} />}`, and `ListingSummaryRow owner={{ now }}` |
| About's read-only sections (720–771) | `AccountDetails` with `onEditBio={editBio}` and `editBioBusy={saving}` |
| `notifications.show` in sign-out, About You save and unsave | `notify` |

Deleted along the way: `menuOpen`, `unsaveMenuId` and its `mousedown` listener (150–157), `fileInputRef`, `photoStatus`, and `getErrorMessage`, which `lib/profilePhoto.ts` now owns. The "Settings & more" nav from PR 2 stays as it is.

`profile.test.tsx` mocks `@mantine/notifications`. `notify` calls `notifications.show`, so the `objectContaining({ message })` assertions keep working.

- [ ] **Step 1: Update the tests first.**
  - Every `getByRole('button', { name: 'Posts' | 'Listings' | 'Saved Posts' | 'About' })` becomes `'tab'` (14 cases; recon 7).
  - `/Level 1/` becomes "Verified".
  - `'Loading...'` becomes `getByRole('status')`.
  - "Unsave Post" and "Logout" are found as `menuitem`s after opening their menus.
  - Add: Edit Name opens a dialog titled "Edit name". Removing the photo calls `removeProfilePhoto` and toasts "Photo removed". A failed upload toasts its error.
  - In the e2e suite, `06-profile.spec.ts` 58, 64 and 72 and `11-marketplace.spec.ts` 101–102 switch to `getByRole('tab', …)`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/profile.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass**, and check that the page is near its ~320-line target.
- [ ] **Step 5: Commit** as `refactor(web): rebuild the profile page on shared rows, Tabs and the prompt dialog`.

### Task 6.17: `AboutYouSection` onto Mantine fields

**Files:** `components/profile/AboutYouSection.tsx`, `AboutYouSection.module.css`; create `AboutYouSection.test.tsx`; the two allowlists.

| Today | Becomes |
|---|---|
| `<select id="about-district">` (41–57) | `NativeSelect` labelled "Hometown district", with `[{ value: '', label: '— Select —' }, ...NEPAL_DISTRICTS]` (decision 5) |
| `<input id="about-college">` (62–75) | `TextInput` labelled "College / university", same placeholder, `maxLength={100}` |
| `<input type="number" id="about-years">` (78–95) | `NumberInput` labelled "Years in the US", `min={0}`, `max={99}`, `allowDecimal={false}`, `allowNegative={false}`, `clampBehavior="strict"` |
| language `<button>`s (98–114) | `ToggleChipGroup label="Languages you speak" mode="multiple"`, options from `SUPPORTED_LANGUAGES` and `LANGUAGE_LABELS` |
| `h3` "About You" (33) | `h2`, since it follows the page's `h1` and precedes `AccountDetails`' `h2`s |

The orphan `<label>` at 97, which labelled nothing, goes too. The stylesheet shrinks to the section, title and subtitle, on tokens.

- [ ] **Step 1: Write the failing test.** Each field, found by label, shows its value. Picking a district emits it, and "— Select —" emits `null`. Emptying college emits `null`. Typing 5 years emits `5`, and emptying emits `null`. Pressing Nepali emits `['nepali']`, and pressing it again removes it. `disabled` disables every control.
- [ ] **Step 2: Run and watch it fail**, alongside the page. `npm run test --workspace=apps/web -- src/components/profile/AboutYouSection.test.tsx src/pages/profile.test.tsx`. The two page tests that set the district by value must still pass.
- [ ] **Step 3: Implement.** Remove the stylesheet from the CSS allowlist and `src/components/profile/AboutYouSection.tsx` from `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 4: Run both suites and the guards.** `npm run lint:guards`, `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `refactor(web): move About You onto Mantine fields and ToggleChipGroup`.

### Task 6.18: `Profile.module.css` onto semantic tokens

**Files:** `styles/Profile.module.css`, `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs`.

The file has 104 violations (94 legacy tokens, 9 literals, 1 named colour). The rules whose markup Tasks 6.12–6.16 removed are deleted:

- `topBar`, `pageTitle`, `menuWrap`, `menuOverlay` and `hamburger*` (now `PageHeader` and `ActionMenu`)
- `menuTab*` (now `Tabs`)
- `trust*` (now `TrustBadge`)
- `hiddenInput`, `avatarWrapper`, `avatarOverlay` and `photoActions` (now `ProfilePhotoControl`)
- `postList`, `postItem*` and `savedPost*` (now `PostSummaryRow`)
- `listing*` (now `ListingSummaryRow`)
- `info*` (now `AccountDetails`). Keep `sectionTitle`: the "Settings & more" `h2` still uses it

What remains (`profilePage`, `profileCard`, `profileHeader`, `profileName`, `profileEmail`, `tabContent`, `saveAboutRow`, `sectionTitle`, and the `settings*` rules PR 2 already wrote on tokens) is mapped with the spec §4.1 table. *(From the Task 6.16 review.)* On a phone the rows sit in a card inside a card: about 277px wide against the public profile's 327px, so titles cut off at about 12 characters. Reduce `.profileCard`'s padding on phones, or move the tabs out of the card as the public profile does, and check it at 375px. Map `tabContent` (the Tabs panel class since Task 6.16) to `--space-4` top padding, matching the public profile's panels. `saveAboutRow`'s `margin-top: 24px` becomes `--space-5`, the same as the Mantine `lg` gap between the About block and `AccountDetails`. *(From the Task 6.17 review.)* The same nested card squeezes the About tab: `AboutYouSection` is 222px wide at 320 and 277px at 375, so the language chips wrap onto 4 and 3 rows. The card-padding fix above covers it, so check the About tab at 320 as well. Any `rgba(var(--color-primary-rgb), α)` becomes `color-mix(in oklch, …)`.

- [ ] **Step 1: Delete the dead rules**, after checking each class against `grep -o "styles\.[a-zA-Z]*" src/pages/profile.page.tsx`.
- [ ] **Step 2: Map the rest to semantic tokens.**
- [ ] **Step 3: Remove `apps/web/src/styles/Profile.module.css` from the CSS allowlist.** The page already left `RAW_ELEMENT_ALLOWLIST` in Task 6.16.
- [ ] **Step 4: Run** `npm run lint:guards`, `npm run lint --workspace=apps/web` and `npm run test --workspace=apps/web`.
- [ ] **Step 5: Commit** as `style(web): move the profile stylesheet onto semantic tokens`.

### Task 6.19: Manage Locations

**Files:** `pages/profile/locations.page.tsx`, `locations.test.tsx`, `styles/ManageLocations.module.css`, the two allowlists.

| Today | Becomes |
|---|---|
| `h1` plus count (128–133) | `PageHeader title="Manage Locations"`, with ``description={`${n} of ${MAX_SAVED_LOCATIONS_PREMIUM}`}`` and `backHref="/profile"` / `backLabel="Profile"`. The test's "2 of 5" still matches |
| rename `<input>` (150–161) | `TextInput size="sm"` named "Rename location {label}", still saving on blur and Enter, with `maxLength={30}`. Escape now cancels, which today does nothing |
| `alert` on a duplicate rename (101) | that field's `error`, with the edit left open |
| ✏️ / 🗑️ `ActionIcon`s (169–190) | `IconPencil` / `IconTrash`, named "Rename {label}" and "Remove {label}". Today every row's buttons are just "Rename" and "Remove" |
| `confirm` before removing (111) | ``useConfirm({ title: 'Remove this location?', message: `"${label}" will no longer appear in your location switcher.`, confirmLabel: 'Remove', danger: true })`` |
| search `<input>` (216–225) | `TextInput` with the same `aria-label` and placeholder, "Search by metro name or ZIP code" |
| label `<input>` (250–258) plus loose error `Text` (259–261) | `TextInput` labelled "Name this location", `maxLength={30}`, `error={addError}` |
| suggestion `<button>`s (262–275) | `ToggleChipGroup label="Suggestions" mode="single"`, whose value is `[newLabel]` when it matches a suggestion |
| `h3` "Add a Location" (212) | `h2` |
| ignored `error` from rename, remove and set-default (104, 112, 118) | `notify.error` (recon 8) |

The default ⭐ stays, as `<span role="img" aria-label="Default location">`. The test at 107 still finds it by text. `outline: none` at 64 and 93 goes with the `editInput` and `input` rules, since both fields are now Mantine's.

- [ ] **Step 1: Update the tests first.** The two `getByTitle('Search by metro name or ZIP code')` lookups become `getByLabelText`. Add these cases:
  - Remove opens the dialog. Confirming calls `deleteSavedLocation`, and cancelling does not.
  - A duplicate rename shows the error on the field and never calls `updateSavedLocation`.
  - Escape cancels a rename.
  - A failed set-default toasts.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/profile/locations.test.tsx`
- [ ] **Step 3: Implement**, rewrite `ManageLocations.module.css` on tokens, and remove the stylesheet and `src/pages/profile/locations.page.tsx` from their allowlists.
- [ ] **Step 4: Run and watch them pass**, then `npm run lint:guards` and `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `refactor(web): rebuild Manage Locations on Mantine fields and the shared dialogs`.

### Task 6.19a: Mantine's CSS loads first in production *(added from the Task 6.16 review)*

**Files:** `apps/web/src/pages/_app.page.tsx`; whatever the check below turns up.

In production builds (`next build` / `next start`), the CSS chunk for `components/ui` loads before Mantine's core stylesheet. Mantine's single-class rules therefore beat our single-class module rules whenever the specificity is equal. The dev server loads them in the other order, so unit tests and dev-server checks don't see it. The committed baselines do:

- **Tabs wrap.** The shared scrolling tabs' `flex-wrap: nowrap` loses, so tabs wrap on phones (search's "People" already sits on a second row in `visual-phone/search-results.png`).
- **Badges lose their colour.** `TrustBadge`, `ScopeBadge` and `TagChip` lose their backgrounds; the feed's LOCAL and Housing badges render without tone.
- **Cased text.** The theme's Badge `text-transform: none` is ignored.

`_app.page.tsx` imports `Layout` and `mantine-theme` (which pulls in `mantine-components.module.css`) before `@mantine/core/styles.css`.

- [ ] **Step 1: Reproduce in a production build.** Run `next build` and `next start` against the e2e mocks. At 375px on `/users/<id>`, `/profile` and `/search`, record the computed `flex-wrap` of the tab list and the Verified badge's background. Also record the `cursor` of a busy button that carries `data-disabled` without native `disabled`: "Save About You" while saving, and the bio button. In the dev server it reads `pointer` rather than Mantine's `not-allowed` *(from the Task 6.17 review)*. If the fix below doesn't restore `not-allowed`, give `[data-disabled]` buttons `cursor: not-allowed` in `mantine-components.module.css`. Also check the profile's Sign out at 375 and 1280 and record its computed `color` and `padding-block` *(from the Task 6.18 review)*. Sign out is an `UnstyledButton` carrying `.settingsLink` and `.settingsDanger`. Those classes compete at equal specificity with Mantine's `padding: 0; border: 0; color: inherit`, so if Mantine loads last, Sign out loses its 12px padding and its danger colour.
- [ ] **Step 2: Try the low-risk fix first.** Move the `@mantine/*` stylesheet imports to the very top of `_app.page.tsx`, before any component import, as Mantine's docs require. Rebuild and re-check Step 1. The tabs should read `nowrap` and the badges should show their token backgrounds.
- [ ] **Step 3: If the order still isn't deterministic,** switch to Mantine's layered stylesheets (`@mantine/core/styles.layer.css`, plus the `notifications` and `dropzone` `.layer.css` files), so unlayered module CSS always wins. First audit `globals.css`: its unlayered element selectors (headings, `a`, `button`) would start beating Mantine's component classes too.
- [ ] **Step 4: Check the pages PR 6 doesn't own** at 375 and 1280 for regressions: feed, search, post detail, create post, events, marketplace. Every screenshot changes in Task 6.20's baseline run anyway, so list what to look for.
- [ ] **Step 5: Commit** as `fix(web): load Mantine's CSS before the app's so module overrides win in production`.

### Task 6.19b: Name the shared dialogs' close button *(added from the Task 6.19 review)*

**Files:** `apps/web/src/components/ui/dialogs.tsx`, `dialogs.test.tsx`, and the Modal `defaultProps` in `apps/web/src/styles/mantine-theme.ts`.

Every `useConfirm` and `usePrompt` dialog opens with focus on its close button, and that button has no accessible name: the aria snapshot reads `button: - img`. The axe baselines never open a dialog, so nothing has caught it. A destructive confirm, such as Remove this location, also puts focus somewhere Enter can reach the destructive button too easily.

- [ ] **Step 1: Write the tests first.**
  - The close button's accessible name is "Close".
  - A `danger: true` confirm opens with focus on Cancel.
  - A non-destructive confirm and a prompt keep today's initial focus. For a prompt, that's the text field.
- [ ] **Step 2: Name the close button.** Add `closeButtonProps: { 'aria-label': 'Close' }` to the theme's Modal `defaultProps`. Check that `modals.openConfirmModal` picks up the theme's Modal defaults. If it doesn't, pass `closeButtonProps` from `dialogs.tsx`.
- [ ] **Step 3: Focus Cancel first on destructive confirms.** Pass `cancelProps: { 'data-autofocus': true }` when `danger` is set.
- [ ] **Step 4: Run the checks.** Run `npm run test --workspace=apps/web`. `ReportPostModal`, `ImageLightbox` and every `useConfirm` / `usePrompt` caller must still pass. Then run `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `fix(web): name the dialogs' close button and focus Cancel first on destructive confirms`.

### Task 6.20: E2E, screenshots, accessibility, docs and the PR

**Files:** `apps/web/e2e/visual/pages.ts`, `apps/web/e2e/visual/a11y-baseline.json`, `docs/architecture/web-ui-system.md`.

Manage Locations gets a screenshot (recon 9):

```ts
{ name: 'manage-locations', path: '/profile/locations', signedIn: true, ready: (page) => heading(page, /manage locations/i) },
```

The own profile's About tab has no baseline either, because the `profile` shot covers the Posts tab *(from the Task 6.17 review)*. Add a `profile-about` page whose `ready` waits for the profile heading, clicks `getByRole('tab', { name: 'About' })`, and then waits for `heading(page, /about you/i)`.

Task 6.18 changed the `profile` baselines on purpose, so the review in Step 4 should expect these changes *(from the Task 6.18 review)*:

- **Desktop:** the card radius is 12px, down from 16px (`--radius-card`). The double hairline is a single border. Everything below the tab list moves 8px down, because `tabContent` padding went from 8px to 16px.
- **Phone (Pixel 7, 412px):**
  - The card is borderless, with 16px top padding and 8px side padding. Rows are about 364px wide, and all four tabs fit.
  - The header has a 16px gap and a 24px bottom margin. The name is 19px (`--font-size-lg`), as on the public profile.
  - The Settings card is inset 8px each side, with 16px padding, so it lines up with the rows.
- **Not covered by the mocks:** the mock email and name are short, so no baseline covers the long-email wrap Task 6.18 fixed. Check it by hand at 320px during the Step 7 walk.

Task 6.19a fixed the stylesheet order, so production now renders the module overrides that until now only the dev server showed. Nearly every signed-in shot changes. The baseline review should expect all of the following *(from Task 6.19a)*:

- **Header:**
  - The top bar is white (`--surface-1`), not cream.
  - The location switcher is a bordered pill, full width on the phone feed.
- **Avatars:**
  - Initials show their tone tints, not Mantine grey.
  - Every avatar is a circle. 64px and 80px avatars used to be rounded squares, because the theme's xl radius is 16px.
- **Badges:**
  - Mixed case with no letter-spacing, and weight 500 on tag chips.
  - Token backgrounds: Verified is green; Contributor and Local are marigold tint; tag chips are white with a solid border.
  - Rows reflow where badges narrowed. Post detail at 375 is 10–26px shorter.
- **Fields and dropdowns:**
  - Inputs and selects have the warm `--border-solid` border, and the create pages are 6–13px shorter.
  - Dropdowns have the `--border-subtle` border, and the search dropdown is about 20px taller.
- **Events:** card meta text is smaller, and category badges read "Cultural", not "CULTURAL".
- **PR 6 pages:**
  - Profile and public-profile tabs stay on one row.
  - Sign out is red with 12px padding.
  - The public profile's "Edit profile" button is full width on phones.
- **Unchanged apart from the header:** landing, listing detail at 375, messages and notifications.
- **Evidence:** before/after/diff composites are in the session scratchpad, `pw619a/shots/step4/`.

The a11y diff must **delete** the four `profile` and `public-profile` entries and add nothing. Any serious or critical violation on `manage-locations` is fixed here, not recorded.

- [ ] **Step 1: Add the visual page** and run the smoke pass, which needs no Docker: `node scripts/visual/smoke.mjs`.
- [ ] **Step 2: Run the e2e suite.** `npm run test:e2e:web`. The known risks are the tab roles (Task 6.16), the trust text, and the account menu that `06-profile.spec.ts:40` opens on the feed, which this PR does not touch.
- [ ] **Step 3: Check the definition of done's structural items.**
  - No `confirm(`, `alert(` or `prompt(` remains in the three pages.
  - No `<Link>` wraps a `<Button>`.
  - The CSS allowlist has lost all five stylesheets, and `RAW_ELEMENT_ALLOWLIST` has lost `profile.page.tsx`, `profile/locations.page.tsx`, `users/[id].page.tsx`, `AboutYouSection.tsx` and `FollowButton.tsx`. `profile/notifications.page.tsx` stays for PR 9.
  - The page line counts are near their targets.
- [x] **Step 4: Regenerate the baselines.** Push a commit whose message contains `[visual-baselines]`, download the `visual-baselines` artifact, review **every** changed PNG, and commit the screenshots and the a11y diff.
  - **What we did instead:** we ran the baselines locally in Docker with `npm run test:visual:docker --workspace=apps/web -- --update --write-a11y-baseline`. It uses the CI job's image, `mcr.microsoft.com/playwright:v1.63.0-noble`, and it spends no Actions minutes. The result was 33 changed PNGs and 4 new ones (commit 25d56ce). The a11y diff only deletes the four `profile` / `public-profile` entries.
  - **Side effects on pages PR 6 doesn't own:** some baseline changes there follow from Task 6.19a's CSS order and are routed to PR 7 and PR 10. They are event-detail's attendee button, post-detail's sizes, and the create-page labels.
- [ ] **Step 5: Document the new pieces** in `docs/architecture/web-ui-system.md`, with their props: `SummaryRow` and `SummaryRowMeta` in the "UI primitives (`components/ui`)" section (including the rule that only `menu` sits above the link's overlay), then `PostSummaryRow`, `EventSummaryRow`, `ListingSummaryRow`, the `Avatar` line's new `toneKey` and `decorative` props, the shared `scrollingTabs` module (`scrollingTabsClassNames` and `scrollFocusedTabIntoView`), `PublicProfileHeader`, `ProfilePhotoControl`, `AccountDetails`, the three hooks and `lib/profilePhoto.ts`. Record that `ImageUploader` has three callers (decision 1). No feature doc covers the profile. `dynamic-location-management.md` did need changes, because Task 6.19 changed the feature's behaviour. The doc now covers the remove confirmation, rename with Enter, blur or Escape, the refused duplicate, and "No metros match." for an unknown ZIP. It also says a default location can't be removed; the old text said the next location would be promoted (commit c71335f).
- [ ] **Step 6: Run the full gate.** `npm run lint`, `npm run lint:guards`, `npm run type-check`, `npm run test`, `npm run test:e2e:web`, `npm run test:visual:web` and `npm run docs:check`.
- [ ] **Step 7: Walk the keyboard** through all three pages: Tab, Shift+Tab, Enter, Space and Escape, the arrow keys in both tab lists and in the profile menu, the photo buttons, the name and bio dialogs, rename with Enter and Escape, and the remove dialog.
- [ ] **Step 8: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then run `gh pr edit <number> --add-reviewer @copilot`. Update the Live tracker row to `In Review (PR #NN)`.

## PR 7 — Events (`feat/web-ui-events`)

- **Pages:** `pages/events/index.page.tsx`, `pages/events/[id].page.tsx`.
- **Components:** `components/events/{EventCard, EventFilterBar, RsvpButton, AttendeeList, EventTypeBadge}`.
- **CSS:** `pages/events/events.module.css`, `eventDetail.module.css` (19 hex), `components/events/EventCard.module.css` (16), `EventFilterBar.module.css` (12).
- **Tokens:** event-type colours become semantic tokens (`--event-<type>-fg/-bg`), added to `tokens.css` with contrast pairs.
- **Also:** adopt `useInfiniteScroll` (events/index 110–125), `PageHeader` and `EmptyState`; replace `confirm()` in events/[id]; the filter search input uses a Mantine `TextInput`.
- **Also:** on create event, the chip-group and date labels are 15px semibold, but the text-input labels keep Mantine's size. Pick one label style for the form (found in PR 6's Task 6.19a check).
- **Also:** Task 6.19a's CSS order fix turned event detail's "12 people going" into a blue, underlined link-style button. That blue is a raw `#1565C0` literal (`eventDetail.module.css:185–189`), so move it onto a token. Also drop `AttendeeList.tsx`'s `closeButtonProps={{ 'aria-label': 'Close' }}`, which the theme's Modal default now covers (found in PR 6's Task 6.20 review).
- **Already built:** `EventSummaryRow` (PR 6, Task 6.4) renders an event as a compact row, for any list that does not need the full `EventCard`.
- **Also:** add a shared `isEventPast(event, now)` to `packages/shared/src/logic` and replace the eight inline copies of `new Date(end_date ?? start_date) < now` (four in web, three in mobile, one in `EventSummaryRow`) — found in PR 6's Task 6.4 review.

### PR 7 — Area inventory

Run on `master` at `3386a5d` (the "Starting an area PR" commands), 2026-09-22.

| File | Lines | CSS violations | Raw form elements | Native dialogs |
|---|---|---|---|---|
| `pages/events/index.page.tsx` | 333 | — | 1 | 0 |
| `pages/events/events.module.css` | 120 | 9 literals | — | — |
| `pages/events/[id].page.tsx` | 379 | — | 0 | 6 |
| `pages/events/eventDetail.module.css` | 223 | 21 literals | — | — |
| `components/events/EventCard.tsx` / `.module.css` | 164 / 168 | 21 literals | 3 | — |
| `components/events/EventFilterBar.tsx` / `.module.css` | 124 / 108 | 27 (12 literals, 12 legacy tokens, 3 named) | 2 | — |
| `components/events/RsvpButton.tsx` / `AttendeeList.tsx` / `EventTypeBadge.tsx` | 39 / 42 / 27 | — | 0 | — |

All six dialogs are on event detail. `alert` fires when an RSVP fails (116) and when a conversation can't start (171). Cancel and delete each run `confirm` first, then `alert` on failure (135/138 and 146/149). `outline: none` sits at `EventFilterBar.module.css` 31. `a11y-baseline.json` holds four entries for this area: `color-contrast` on `events` and `event-detail`, at both widths. PR 5 finished `create.page.tsx` and `createEvent.module.css`; only decision 9 touches create event again.

The raw-element grep first reported nothing. `[[:space:]>/]` needs a character after the tag name, and every one of these tags ends its line. The command in "Starting an area PR" now uses `\b`.

**What the recon changed** (the area read on 2026-09-22):

1. **Event detail treats "Interested" as "Going", then deletes it.** `hasUserRsvp` (shared `api/events.ts` 507) returns true for any `event_rsvps` row. A member who marked an event Interested on the list sees "Going ✓" on its page, and pressing it calls `unrsvpFromEvent`, which deletes the response. Mobile's `EventDetailScreen` (108, 131, 153–160) does the same. Task 7.2 adds `getUserEventResponse`, so both detail pages read the real status.
2. **"12 people going" opens a list that includes the interested.** `getEventAttendees` (201) has no status filter. Task 7.2 filters it to `going`, which fixes mobile's list too.
3. **The list pages oldest first.** `getEventsByMetro` orders by `start_date` ascending with no lower bound, 20 at a time.
   - The first page is the metro's 20 oldest events. An upcoming event appears only once paging reaches it, and it lands above everything already on screen. Past events read oldest first.
   - **This is live on `nusa-staging`:** metro 12060 has 29 events, all past (read-only count, 2026-09-22). The next event anyone creates there would sit behind 20 old ones.
   - Task 7.3 adds `getMetroEventsPage`, which pages upcoming events first and then past events newest first. Mobile's `EventsScreen` pages the same way and keeps `getEventsByMetro` until it adopts the new function (routed to PR 10).
4. **A filter can stall on "No Social events".** Type and text filters run over the loaded pages only. The empty branch renders no sentinel, so pages that might hold a match are never requested. Decision 3 fixes this.
5. **`EventCard` nests buttons inside its link.** The whole card is a `<Link>`, and the Interested/Going buttons inside it call `preventDefault` to stop navigation. The main button also shows a "▾", which promises a menu that doesn't exist. Task 7.6 rebuilds the card on the stretched link that `PostCard` and `SummaryRow` use.
6. **The list's rollback reads a value that may not exist yet.** `handleResponseChange` (index 141–201) captures `previous` inside a `setUserResponses` updater, then reads it on the next line. React runs an updater eagerly only when the fiber has no queued updates, so under batching `previous` can still be `null` when the counts are adjusted. The new hook reads the current response from a ref (Task 7.9).
7. **Event detail keeps the previous event when the id changes, and hides failures.** Like the public profile before Task 6.8, the page never resets when the Pages Router reuses it, and its load effect has no cancel guard. A failed attendee request shows "No attendees yet." Tasks 7.11 and 7.12 fix both.
8. **The same helpers live in several places.**
   - `formatEventDate` (web `EventCard` 18, mobile `EventCard` 29) and `formatFullDate` (web detail 175, mobile `EventDetailScreen` 45) are identical across the two apps.
   - The past-event test appears in six files: web `EventSummaryRow`, events index and event detail, and mobile `EventDetailScreen`, `EventsScreen` and `PublicProfileScreen`.
   - The count adjustment after a response change appears four times: forward and rollback, in web's index and in mobile's `EventsScreen`.

   Task 7.1 moves all three into shared.
9. **The contrast failures.** `EventTypeBadge` still colours itself from Mantine's `light` palette, not the `--event-<type>` tokens create event uses; `tokens.css` records the old cultural pair at 3.46:1. The detail's section titles are `#9E9E9E` on white (about 2.7:1), and past cards fade to `opacity: 0.6`. Task 7.4 moves the badge onto the tokens, and Tasks 7.6, 7.10 and 7.14 replace the rest.

## PR 7 — Task breakdown

Work on `feat/web-ui-events`, branched from `master` at `3386a5d`. Same conventions as PRs 4a–6:

- Test first, with one commit per task.
- Tests query by role, label or text.
- Semantic tokens only: no inline `style={{}}`, and no colour literals passed through Mantine's `styles` prop.
- Mantine components rather than raw elements outside `components/ui/`.
- No new dependencies. `Breadcrumbs`, `Alert`, `CloseButton` and `VisuallyHidden` ship in `@mantine/core`, and the icons in `@tabler/icons-react`.

**How this PR runs** *(agreed 2026-09-22, because PR 6's per-task reviews made it slow)*

The 15 tasks run in four chunks, and each chunk ends with something that works:

| Chunk | Tasks | Ends with |
|---|---|---|
| 1. Shared layer and leaf components | 7.1–7.5 | The shared helpers, API fixes and paging query, with mobile on the shared fixes. `EventTypeBadge` on tokens, and `EventResponseControl` |
| 2. Events list | 7.6–7.10 | The list page fully migrated, stylesheet included |
| 3. Event detail | 7.11–7.14 | The detail page fully migrated, stylesheet included |
| 4. Finish | 7.15 | e2e, baselines, a11y, docs and the draft PR |

**Inside a chunk,** each task follows its steps: write the failing test, run **only that task's tests**, implement, run them again, commit. There is no review and no full-suite run between tasks. One exception: a task that edits an allowlist also runs `npm run lint:guards`, because the guard fails on an allowlisted file that is clean (decision 7).

**At the end of each chunk,** run one gate:

1. **Tests and checks:** `npm run type-check`, `npm run lint`, `npm run lint:guards`, and the full unit suite of every workspace the chunk touched. That is `npm run test --workspace=packages/shared` and `--workspace=apps/web`, plus `--workspace=apps/mobile` in chunk 1. Web Vitest fails whole files from a lowercase `c:\` working directory, so run it from `C:\…`.
2. **Review:** one code-review agent reviews the chunk's whole diff (`git diff <chunk start>..HEAD`) against this breakdown and the definition of done.
3. **Fixes:** CRITICAL and HIGH findings are fixed in the chunk, in one `fix(web): address chunk N review` commit. Other findings that aren't defects in this PR's own code go to PR 10's list, or to the chunk's line in the tracker. **They never become new tasks.**
4. **Push, and record the chunk** in the tracker's Notes.

The e2e and visual suites run only in chunk 4. The e2e suite builds for production and takes minutes, and the unit gate catches regressions chunk by chunk. Tasks 7.10 and 7.14 edit the e2e selectors they change, and chunk 4 runs them.

**Decisions this breakdown locks in:**

1. **One response control on both surfaces** (recon 1).
   - `EventResponseControl` is a pair of toggle buttons, "Interested" and "Going". Each carries `aria-pressed` and a name that never changes, and pressing the pressed one clears the response.
   - The card and the detail page both use it, so **event detail gains "Interested"**. The list, and mobile's list, already offer it.
   - `RsvpButton` is deleted. Where a member can't respond, the detail page says why in a sentence instead of showing a disabled button, which can't take focus: "This event has passed.", "You're the organizer." or "Verify your account to respond."
2. **Upcoming first, then past, newest first** (recon 3).
   - Upcoming events page by `start_date` ascending, then past events by `start_date` descending. Each order breaks ties on `id` (decision 21's lesson), and past events used to read oldest first, so their order flips.
   - Both phases share one `now`, taken when the first page loads, so no event moves between phases mid-scroll.
   - When the first upcoming page comes back short, the first load also fetches the first past page. A metro with nothing upcoming, like staging's, then opens on its past events rather than on an empty list.
3. **Filters stay on the client** (recon 4).
   - **Why:** a metro holds dozens of events, not thousands, and a server-side text filter would need escaping for PostgREST's `or` syntax.
   - **Instead:** the sentinel stays mounted while a filter shows nothing, so paging continues until a match loads or the pages run out. "No Social events" appears only once paging is done.
4. **A failed "load more" stops and offers Try again.** Leaving `hasMore` set while the sentinel is on screen would retry in a tight loop (decision 22). The feed stops and shows a toast. Events also show "Couldn't load more events." with Try again, because the past events below would otherwise be unreachable until a reload.
5. **Cards use the stretched link** (recon 5).
   - The title is the only link, and its `::after` covers the card. The response control is the only thing above the overlay, like `SummaryRow`'s `menu`.
   - The cover is `alt=""`, because the title follows it.
   - Past cards drop `opacity: 0.6` for a "Past" label and a `--text-2` title (recon 9).
   - Cards lift with a `--border-solid` border on hover and focus-within, not a shadow (PR 6 decision 11).
6. **Busy controls stay focusable** (`web-ui-system.md`). While a response saves, both buttons in the control take `aria-disabled` and ignore presses, and the pressed state moves at once. Message Organizer does the same with a `Loader`, like the public profile's Message button.
   - **Amended 2026-09-22, on the user's call.** This decision first asked for `data-disabled` as well, but Mantine paints a `data-disabled` button flat grey, which hid the very state the member had just chosen. The control now follows `FollowButton`, the documented exception: `aria-disabled` only, so the pressed button stays visibly pressed while the write lands. It keeps Mantine's pointer cursor while busy, which `globals.css` would otherwise suppress.
7. **Event types colour from the tokens.** `EventTypeBadge` reads `--event-<type>-fg` / `-bg` through `data-type`, as create event's chips do through `data-value`. Its emoji becomes `aria-hidden`, so the badge reads "Cultural". Mobile keeps `EVENT_TYPE_COLORS`.
8. **The filter chips are a `ToggleChipGroup`.**
   - Single mode already makes pressing the current chip a no-op, which suits a filter that always has one pick.
   - `hideLabel` is a new prop that keeps the "Event type" name for assistive technology only.
   - `layout="scroll"` is another new prop. It keeps the chips on one line and scrolls them sideways on phones, as the filter bar does today.
9. **One label style on create event** (the bullet above). Mantine's field labels are 15px at weight 500, while `ToggleChipGroup` and `DateTimeField` labels are 15px at 600, so those two drop to 500. The chip-group labels on create post and create listing change too, and the baseline review should expect that.
10. **Mobile takes the shared fixes, not the list rewrite.** These land on mobile in Tasks 7.1 and 7.2:
    - the detail status fix (recon 1)
    - going-only attendees (recon 2)
    - the shared date and past helpers, and the count adjustment (recon 8)

    Mobile's detail keeps its single RSVP button. Moving mobile's list onto `getMetroEventsPage` changes `EventsScreen`'s paging, so it is routed to PR 10.

**Files this PR creates:**

| Path | Responsibility |
|---|---|
| `packages/shared/src/logic/events.ts`, `.test.ts` | `isEventPast`, and `applyEventResponseChange`: the counts after a response changes |
| `packages/shared/src/utils/eventDates.ts`, `.test.ts` | `formatEventDateShort` (cards) and `formatEventDateLong` (detail) |
| `apps/web/src/components/events/EventTypeBadge.module.css` | The per-type token colours |
| `apps/web/src/components/events/EventResponseControl.tsx`, `.module.css`, `.test.tsx` | The Interested / Going toggle pair |
| `apps/web/src/hooks/useEventFeed.ts`, `.test.ts` | A metro's events in two phases, the viewer's responses, and `respond` with rollback |
| `apps/web/src/hooks/useEventDetail.ts`, `.test.ts` | One event and the viewer's response, with `respond`, `cancel` and `remove`; resets when the id changes |
| `apps/web/src/components/events/EventAttendanceCard.tsx`, `.module.css`, `.test.tsx` | The detail sidebar's going count, attendee-list opener, response control and status line |
| `apps/web/src/components/events/EventOrganizerCard.tsx`, `.module.css`, `.test.tsx` | The detail sidebar's organizer and Message Organizer button |

**Files this PR deletes:** `components/events/RsvpButton.tsx` and `RsvpButton.test.tsx`.

**Where the pages should land:**

| Page | Before | Target |
|---|---|---|
| `pages/events/index.page.tsx` | 333 | ~180 |
| `pages/events/[id].page.tsx` | 379 | ~230 |

### Task 7.1: Shared event helpers

**Files:**

- **Create:** `packages/shared/src/logic/events.ts`, `events.test.ts`, `utils/eventDates.ts` and `eventDates.test.ts`.
- **Modify:** `logic/index.ts` and `utils/index.ts`.
- **Adopt the helpers in:** web `components/events/EventSummaryRow.tsx`, and mobile `components/events/EventCard.tsx`, `screens/EventDetailScreen.tsx`, `screens/EventsScreen.tsx` and `screens/profile/PublicProfileScreen.tsx`.

**Interface:**

```ts
// logic/events.ts
/** Past once its end has gone by, or its start when it has no end. */
export function isEventPast(event: Pick<Event, 'start_date' | 'end_date'>, now: Date): boolean;

export type EventResponseCounts = Pick<Event, 'rsvp_count' | 'interested_count'>;

/**
 * The counts after a member's response moves from `previous` to `next`;
 * either may be null. Never below zero. A rollback is the same call with the
 * two swapped. Returns a new object.
 */
export function applyEventResponseChange<T extends EventResponseCounts>(
  event: T,
  previous: RsvpStatus | null,
  next: RsvpStatus | null
): T;

// utils/eventDates.ts
/** "Thu, Mar 5 · 6:00 PM". A multi-day event reads "Mar 5 – Mar 7". */
export function formatEventDateShort(startDate: string, endDate?: string | null): string;
/** "Thursday, March 5 · 6:00 PM – 9:00 PM". A multi-day event reads "March 5 – March 7". */
export function formatEventDateLong(startDate: string, endDate?: string | null): string;
```

The formatters are today's web and mobile functions, moved without changes except that `endDate` also accepts `null`, which PostgREST sends for an event with no end. `isEventPast` matches every copy it replaces. `EventSummaryRow` keeps its own cancelled check in front of it.

Mobile adopts all three helpers here. The web pages pick them up in Tasks 7.6, 7.9 and 7.11, where their copies move into components and hooks anyway.

- [ ] **Step 1: Write the failing tests.**
  - **`isEventPast`:** an end before `now` is past. An end after `now` with a start before it is not past, because the event is still running. With no end, a start before `now` is past and one after it is not. An end exactly at `now` is not past.
  - **`applyEventResponseChange`:**
    - `null → going` adds one to `rsvp_count`.
    - `going → interested` moves one count across.
    - `interested → null` takes one from `interested_count`.
    - `going → null` at `rsvp_count: 0` stays at 0.
    - The result is a new object that keeps the event's other fields.
  - **Formatters:** a start alone, a same-day start and end, a multi-day range, and a `null` end treated as no end.
  - **Dates in the tests:** build them with the local-time constructor (`new Date(2026, 2, 5, 18, 0).toISOString()`), so the tests pass in any time zone. ICU puts U+202F before "PM", so match times with `\s` (`/6:00\sPM/`), never a literal space.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/logic/events.test.ts src/utils/eventDates.test.ts`
- [ ] **Step 3: Implement**, and export the helpers from `logic/index.ts` and `utils/index.ts`.
- [ ] **Step 4: Adopt them on mobile and in `EventSummaryRow`.**
  - Mobile's `EventCard` and `EventDetailScreen` delete their formatters.
  - `EventsScreen` swaps both halves of its count math (153–208) for `applyEventResponseChange`.
  - The three past checks become `isEventPast`.
  - Then run `npm run test --workspace=apps/mobile -- EventsScreen EventDetailScreen PublicProfileScreen EventCard` and `npm run test --workspace=apps/web -- src/components/events/EventSummaryRow.test.tsx`.
- [ ] **Step 5: Commit** as `refactor(shared): share isEventPast, the event date formats and the response counts`.

### Task 7.2: Shared events API — the real response, going-only attendees, not found

**Files:** `packages/shared/src/api/events.ts`, `events.test.ts` and `types/events.ts`; mobile `screens/EventDetailScreen.tsx` and `EventDetailScreen.test.tsx`; web `pages/events/[id].page.tsx` and `[id].test.tsx`.

**Interface:**

```ts
/** The member's response to one event, or null when they have none. */
export async function getUserEventResponse(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ data?: RsvpStatus | null; error?: Error }>;

// types/events.ts
export interface EventResult {
  data?: Event;
  error?: Error;
  /** Set when no such event exists, or it was removed; a failed request leaves it unset. */
  notFound?: boolean;
}
```

- **`getUserEventResponse`** selects `status` with `.eq('event_id', …).eq('user_id', …).maybeSingle()`.
- **`getEventAttendees`** adds `.eq('status', 'going')` (recon 2).
- **`getEventById`** sets `notFound: true` on both of its "Event not found" paths. The message stays the same, so mobile needs no change.
- **`hasUserRsvp`** loses its last two callers here, and is deleted with its tests.

On both detail pages "going" now means `response === 'going'`. RSVP upserts `going`, which also converts an Interested response, and un-RSVP happens only from Going. On web this is a stopgap until Task 7.14's control. The page swaps `hasUserRsvp` for `getUserEventResponse` and keeps its button, so every commit stays green.

- [ ] **Step 1: Write the failing tests.**
  - **`events.test.ts`:**
    - `getUserEventResponse` returns `'interested'` for an interested row.
    - It returns `null` when `maybeSingle` finds no row, and passes a PostgREST error through.
    - `getEventAttendees` filters on `status = going`.
    - `getEventById` sets `notFound` for `PGRST116` and not for a network error.
  - **Mobile `EventDetailScreen.test.tsx` and web `[id].test.tsx`:** an interested member sees the RSVP button, not "Going ✓", and pressing it calls `rsvpToEvent`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/api/events.test.ts`, `npm run test --workspace=apps/mobile -- EventDetailScreen` and `npm run test --workspace=apps/web -- src/pages/events/[id].test.tsx`.
- [ ] **Step 3: Implement.** Delete `hasUserRsvp`, then switch both detail pages to `getUserEventResponse`, and in their test mocks replace `hasUserRsvp` with it.
- [ ] **Step 4: Run all three suites again.**
- [ ] **Step 5: Commit** as `fix: read the member's real event response, and list only the people going`.

### Task 7.3: `getMetroEventsPage`

**Files:** `packages/shared/src/api/events.ts`, `events.test.ts` and `types/events.ts`.

**Interface:**

```ts
// types/events.ts
export type EventPeriod = 'upcoming' | 'past';

// api/events.ts
export interface MetroEventsPageOptions {
  period: EventPeriod;
  /** One instant for the whole scroll, so no event changes period between pages. */
  now: Date;
  limit?: number; // default 20
  offset?: number; // default 0
}

/**
 * One page of a metro's events: local and global, never removed.
 * Upcoming events haven't ended and come soonest first. Past events have ended
 * and come most recent first.
 */
export async function getMetroEventsPage(
  supabase: SupabaseClient,
  metroId: string,
  options: MetroEventsPageOptions
): Promise<EventsResult>;
```

**Filters.** Both periods apply `.neq('status', 'removed')` and `.or('metro_area_id.eq.<id>,is_global.eq.true')`, as `getEventsByMetro` does.

- **Upcoming** adds `.or('start_date.gte.<iso>,end_date.gte.<iso>')` and orders by `start_date` ascending, then `id` ascending.
- **Past** adds `.lt('start_date', <iso>)` and `.or('end_date.is.null,end_date.lt.<iso>')`, and orders by `start_date` descending, then `id` descending.

PostgREST ANDs repeated filters, two `or` parameters included, so the metro and period conditions combine. `createEventSchema` guarantees an end after the start, so the two periods split every event exactly as `isEventPast` does. `hasMore` is `rows.length === limit`, as today. `getEventsByMetro` stays for mobile (decision 10), and its doc comment says so.

- [ ] **Step 1: Write the failing tests** with the chain mock `events.test.ts` already uses.
  - The upcoming call filters on both `or` strings and orders `start_date` then `id`, both ascending.
  - The past call filters `start_date < now` and `end_date` null or before `now`, ordered descending.
  - Both call `range(offset, offset + limit - 1)`.
  - A full page sets `hasMore`, and an error comes back as `error`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/api/events.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(shared): page a metro's events upcoming first, then past newest first`.

### Task 7.4: `EventTypeBadge` onto the event tokens

**Files:** `components/events/EventTypeBadge.tsx` and `EventTypeBadge.test.tsx`; create `EventTypeBadge.module.css`.

The badge becomes `Badge variant="default"` with `className={styles.badge}` and `data-type={type}`. Five rules in the module set `color`, `background` and `border-color` from `--event-<type>-fg` / `-bg`. The emoji sits in an `aria-hidden` span (decision 7).

- [ ] **Step 1: Update the tests.** Each type's label reads as its text ("Cultural"), and the emoji is inside an element hidden from assistive technology.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/events/EventTypeBadge.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `style(web): colour event-type badges from the event tokens`.

### Task 7.5: `EventResponseControl`

**Files:** create `components/events/EventResponseControl.tsx`, `.module.css` and `.test.tsx`.

**Interface:**

```ts
export interface EventResponseControlProps {
  value: RsvpStatus | null;
  /** Pressing the pressed button passes null. */
  onChange: (next: RsvpStatus | null) => void;
  /** A change is saving: presses are ignored and focus stays put (decision 6). */
  busy?: boolean;
  /** Names the group. Cards pass "Your response to <title>", so many groups on one page stay distinguishable. */
  label?: string; // default "Your response"
  size?: 'sm' | 'md'; // default 'md'
}
```

It renders a `div role="group" aria-label={label}` holding two Mantine `Button`s, "Interested" (`IconStar`) and "Going" (`IconCheck`), with the icons `aria-hidden`. The pressed button is `variant="filled"`, the other `variant="default"`, and each has `aria-pressed`. While `busy`, both take `aria-disabled` and `data-disabled` and their handlers return early, and neither uses native `disabled` or `loading`.

- [ ] **Step 1: Write the failing test.**
  - The group is named by `label`.
  - Both buttons exist, and their `aria-pressed` follows `value`.
  - Pressing Going from `null` or from `'interested'` passes `'going'`, and pressing Going from `'going'` passes `null`. Interested works the same way.
  - While `busy`, both buttons are `aria-disabled`, a press calls nothing, and the focused button keeps focus.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/events/EventResponseControl.test.tsx`
- [ ] **Step 3: Implement.** The module only lays the pair out on one line with a `--space-2` gap.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add EventResponseControl`.

### Task 7.6: `EventCard` on the stretched link and the tokens

**Files:** `components/events/EventCard.tsx`, `EventCard.module.css` and `EventCard.test.tsx`; `pages/events/index.page.tsx`, for the renamed props only; `scripts/guard-css-tokens.allowlist.json`; `apps/web/eslint/raw-element-allowlist.mjs`.

**Interface:**

```ts
export interface EventCardProps {
  event: Event;
  /** From the section the card sits in; hides the control and adds the "Past" label. */
  past?: boolean;
  response?: RsvpStatus | null;
  /** Shows the response control. False for Level 0 members. */
  canRespond?: boolean;
  /** This card's response is saving. */
  busy?: boolean;
  onRespond?: (eventId: string, next: RsvpStatus | null) => void;
}
```

The card becomes an `<article>`, in this order:

- **Cover:** the photo through `next/image` with `fill` and `alt=""`, or an `aria-hidden` 📅 placeholder. The badges sit on it: `EventTypeBadge`; `ScopeBadge isGlobal` only when the event is global; and a "Cancelled" chip in `--danger` on `--surface-1`.
- **Title:** an `h3` holding the only link, a `Link` whose `::after` covers the card (decision 5).
- **Details:**
  - the date, as `<time dateTime={start_date}>{formatEventDateShort(…)}</time>`
  - the place
  - "10 interested · 5 going", with the shared `formatCount`, which replaces the local K formatter
  - "Past" on past cards
- **Footer:** a decorative `Avatar` and the public name, which is plain text as today. `EventResponseControl` appears in its own wrapper above the overlay when `canRespond`, the event is active and it isn't past.

Mantine `Text` gives way to plain elements styled by the module, which moves onto semantic tokens. The page passes the renamed props and nothing else on it changes until Task 7.10.

- [ ] **Step 1: Rewrite the tests.** Keep the cases that still hold: title, place, counts, organizer, "Unknown", global, cancelled, placeholder, type badge, multi-day date and large counts. Then:
  - The only link is named by the title and points to `/events/<id>`.
  - The response group is outside the link (`link.contains(group)` is false).
  - The control is hidden when `canRespond` is false, the event is cancelled or `past` is set.
  - "Past" appears only on past cards.
  - `onRespond` receives `('e1', null)` when the pressed button is pressed again.
  - The cover image has an empty `alt`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/events/EventCard.test.tsx`
- [ ] **Step 3: Implement.** In the same commit, remove `apps/web/src/components/events/EventCard.module.css` from the CSS allowlist and `src/components/events/EventCard.tsx` from `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 4: Run the card and page suites**, then `npm run lint:guards`.
- [ ] **Step 5: Commit** as `refactor(web): rebuild EventCard on a stretched link and semantic tokens`.

### Task 7.7: `ToggleChipGroup` gains `hideLabel` and `layout`; one label weight

**Files:** `components/ui/ToggleChipGroup.tsx`, `.module.css` and `.test.tsx`; `components/events/DateTimeField.module.css`.

**Interface** (added to `ToggleChipGroupProps`):

```ts
  /** Keeps the group's name for assistive technology only. */
  hideLabel?: boolean;
  /** 'scroll' keeps the chips on one line and scrolls them sideways below 40em. Default 'wrap'. */
  layout?: 'wrap' | 'scroll';
```

- **`hideLabel`** renders the label inside Mantine `VisuallyHidden`, keeping its `id`, so `aria-labelledby` still names the group.
- **`layout="scroll"`** sets `data-layout="scroll"` on the chip row. Below 40em it is `flex-wrap: nowrap; overflow-x: auto`, and the chips don't shrink.
  - Each chip takes `onFocus={scrollFocusedTabIntoView}` from `components/ui/scrollingTabs`, because Chromium leaves a partly clipped focused element clipped (as with the profile tabs).
- **Labels:** both `.label` rules drop to `var(--font-weight-medium)` (decision 9).

- [ ] **Step 1: Write the failing test.** With `hideLabel`, the group is still named by its label and a chip is still pressable. Without it, today's cases pass unchanged.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/ui/ToggleChipGroup.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the suite and the three create-page suites**, because the label weight reaches them: `npm run test --workspace=apps/web -- src/components/ui/ToggleChipGroup.test.tsx src/pages/posts/create.test.tsx src/pages/marketplace/create.test.tsx src/pages/events/create.test.tsx`
- [ ] **Step 5: Commit** as `feat(web): let ToggleChipGroup hide its label and scroll on phones`.

### Task 7.8: `EventFilterBar` on Mantine and the tokens

**Files:** `components/events/EventFilterBar.tsx`, `EventFilterBar.module.css` and `EventFilterBar.test.tsx`; the CSS allowlist; `RAW_ELEMENT_ALLOWLIST`.

| Today | Becomes |
|---|---|
| raw `<input role="searchbox">` with an absolutely placed 🔍 (83–94) | `TextInput` keeping `role="searchbox"`, the "Search events" label and the placeholder, with `leftSection={<IconSearch aria-hidden />}`. It stays `type="text"`: `type="search"` would add Chromium's own clear button beside ours |
| raw clear `<button>` (95–104) | `rightSection={searchText ? <CloseButton aria-label="Clear search" onClick={handleSearchClear} /> : null}` |
| raw chip buttons (106–121) | `ToggleChipGroup` with `label="Event type"`, `hideLabel`, `layout="scroll"` and `mode="single"`. Its value is `[value.type]`, and its options carry `label={<><span aria-hidden="true">{icon}</span> {label}</>}` and `name={label}` |

The debounce, the Enter shortcut, the clear and the external-value sync stay as they are. Most of the stylesheet is deleted, and only `.filterBar`'s column and gaps remain, on tokens. `outline: none` goes with the input rules.

- [ ] **Step 1: Update the tests.** The chip text assertions (35–40) become role queries: `getByRole('button', { name: 'Cultural' })` and the other types, with "All" pressed by default. Everything else must pass unchanged.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/events/EventFilterBar.test.tsx`
- [ ] **Step 3: Implement.** In the same commit, remove `apps/web/src/components/events/EventFilterBar.module.css` from the CSS allowlist and `src/components/events/EventFilterBar.tsx` from `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 4: Run the filter bar and events page suites**, then `npm run lint:guards`.
- [ ] **Step 5: Commit** as `refactor(web): build EventFilterBar on TextInput and ToggleChipGroup`.

### Task 7.9: `useEventFeed`

**Files:** create `hooks/useEventFeed.ts` and `useEventFeed.test.ts`.

**Interface:**

```ts
export interface EventFeedState {
  upcoming: Event[];
  past: Event[];
  /** The first load, which may chain the first past page (decision 2). */
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** More pages exist and paging isn't paused by a failure. */
  hasMore: boolean;
  responses: UserEventResponses;
  /** Ids whose response is saving. */
  pending: ReadonlySet<string>;
  reload: () => void;
  loadMore: () => void;
  /** Clears loadMoreError and loads the next page. */
  retryLoadMore: () => void;
  respond: (eventId: string, next: RsvpStatus | null) => void;
}

export function useEventFeed(metroId: string | null, userId: string | null): EventFeedState;
```

This moves index 31–201 out of the page and fixes recon 3 and 6.

- **First load:**
  - It takes `now` inside the effect, never in render (`react-hooks/purity`).
  - It requests the first upcoming page and the viewer's responses in parallel.
  - When the upcoming page comes back short, it requests the first past page before clearing `loading`.
- **`loadMore`:**
  - It requests the current period's next page. The offset is the number of rows that period has returned, and a short page ends the period.
  - Rows are deduplicated by id across both lists.
  - A failure sets `loadMoreError`, which reports `hasMore` false until `retryLoadMore` (decision 4).
  - A generation counter drops any page that lands after `reload`.
- **No metro:** a `null` metro requests nothing and reports not loading, as today.
- **`respond`:**
  - It reads the previous response from a ref, not from inside an updater (recon 6). It adds the id to `pending` and applies `applyEventResponseChange` at once.
  - It then calls `removeEventResponse` or `setEventResponse`.
  - On failure it applies the swap back and calls `notify.error("Couldn't update your response. Try again.")`.
  - A second `respond` for a pending id is ignored.

- [ ] **Step 1: Write the failing test** with `renderHook`.
  - **Paging:**
    - The first upcoming page fills `upcoming`.
    - A short upcoming page chains past page 0, whose rows fill `past` in the order returned.
    - `loadMore` asks for upcoming offset 20 after a full page, and for past after a short one.
    - A duplicate id is dropped.
  - **Failures:**
    - A failed `loadMore` sets `loadMoreError` and `hasMore` false, and a second `loadMore` requests nothing.
    - `retryLoadMore` resumes.
  - **No metro:** a `null` metro makes no requests.
  - **`reload`:** it requests page 0 again with a new `now`.
  - **`respond`:**
    - It moves the counts before `setEventResponse` resolves.
    - A failure restores them and raises the toast.
    - `null` calls `removeEventResponse`.
    - A second call while pending is ignored.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useEventFeed.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): load events upcoming first through useEventFeed`.

### Task 7.10: The events list on the new pieces, and its stylesheet

**Files:** `pages/events/index.page.tsx`, `index.test.tsx` and `events.module.css`; `apps/web/e2e/tests/10-events.spec.ts`; `apps/web/e2e/helpers/supabase-mock.ts`; `scripts/guard-css-tokens.allowlist.json`; `RAW_ELEMENT_ALLOWLIST`.

| Today | Becomes |
|---|---|
| `📅 Events` `h1` and "+ Create Event" (242–249) | `PageHeader title="Events"`, with `actions` holding `Button component={Link} href="/events/create" leftSection={<IconPlus aria-hidden />}` "Create event" for Level 1+ |
| Level 0 banner with a raw ✕ (252–264) | `Alert` with `withCloseButton` and `closeButtonLabel="Dismiss banner"`, and a module class on `--accent-tint` / `--text-1`. The copy becomes "Verify your account to respond to events and create them." |
| Six `Skeleton`s (270–278) | `LoadingState variant="card" count={6} label="Loading events…"` |
| Red text and Retry (279–285) | `ErrorState title="Couldn't load events" message={error} onRetry={reload}` |
| Empty block (286–291) | `EmptyState` with `getEmptyTitle()` and "Check back soon!", only once `hasMore` is false (decision 3) |
| One grid with a "Past Events" `div` (293–317) | Two `<section aria-labelledby>`s, each rendered only when it has cards. `h2` "Upcoming" and `h2` "Past events" each head a `<ul>` of `<li><EventCard /></li>`, so each card's `h3` sits under a section heading |
| Hand-rolled observer (124–139) and footer skeleton | `useInfiniteScroll({ hasMore, loading: loading \|\| loadingMore, onLoadMore: loadMore })`. The sentinel renders after the sections whenever `hasMore` is set, even while a filter shows nothing. `LoadingState variant="card" count={1} label="Loading more events…"` replaces the footer skeleton |
| — | `loadMoreError` shows `ErrorState title="Couldn't load more events" message={loadMoreError} onRetry={retryLoadMore}` |

The type and text filters stay in the page as a `useMemo` over `upcoming` and `past`. Each card gets `busy={pending.has(e.id)}`.

**The e2e mocks.** Once the page asks for two periods, a mock that returns every event for every GET would put past events under "Upcoming".

- `mockEventsEndpoints` in `10-events.spec.ts` answers the past request (its URL carries `start_date=lt.`) with the past events, and every other list request with the rest.
- The shared mock in `supabase-mock.ts` answers the past request with `[]`, so the `events` screenshot keeps its two upcoming events.

**The stylesheet.** Most of `events.module.css` is deleted rather than converted:

- `emptyState*` goes to `EmptyState`, and `errorContainer` to `ErrorState`.
- `divider` goes to the section headings.
- `level0BannerClose` goes to the `Alert`'s close button.
- `footerLoader` goes to `LoadingState`.

The rules left over (`container`, `grid`, `sectionTitle`, `level0Banner` and `loadSentinel`) are rewritten on tokens, with the spec §4.1 table.

- The container is `max-width: var(--layout-max-width)`.
- The page background is the shell's `--surface-0`, so `.page`'s `#F5F5F5` goes.
- The grid keeps three, two and one columns, breaking at 54em and 32.5em (today's 860px and 520px).

- [ ] **Step 1: Update the tests first.**
  - **Unit test:** mock `getMetroEventsPage` in place of `getEventsByMetro`, and `Retry` becomes `Try again` (182).
  - **New cases:** a metro with nothing upcoming shows its past events under "Past events"; the Upcoming heading is absent then.
  - **Paging:** a filter that matches nothing on page 1 keeps the sentinel, and shows the empty title only after the last page. Stub `IntersectionObserver` as `feed.test.tsx` does.
  - **Failures:** a failed second page shows "Couldn't load more events" with Try again.
  - **e2e:** "+ Create Event" becomes `/create event/i`, and "Past Events" becomes the heading `/past events/i`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/events/index.test.tsx`
- [ ] **Step 3: Implement the page**, and update both e2e mocks.
- [ ] **Step 4: Rewrite the stylesheet.** Delete the rules no class uses any more; `grep -o "styles\.[a-zA-Z]*" src/pages/events/index.page.tsx` lists the live ones. Remove `apps/web/src/pages/events/events.module.css` from the CSS allowlist and `src/pages/events/index.page.tsx` from `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 5: Run the page suite and `npm run lint:guards`**, and check that the page is near its ~180-line target.
- [ ] **Step 6: Commit** as `refactor(web): rebuild the events list on the design system`.

### Task 7.11: `useEventDetail`

**Files:** create `hooks/useEventDetail.ts` and `useEventDetail.test.ts`.

**Interface:**

```ts
export interface EventDetailState {
  event: Event | null;
  response: RsvpStatus | null;
  loading: boolean;
  error: string | null;
  /** getEventById said no such event; `error` alone means the request failed. */
  notFound: boolean;
  responding: boolean;
  reload: () => void;
  respond: (next: RsvpStatus | null) => void;
  /** Resolve to an error message, or null on success. The page owns the dialogs and toasts. */
  cancel: () => Promise<string | null>;
  remove: () => Promise<string | null>;
}

export function useEventDetail(id: string | undefined, userId: string | null): EventDetailState;
```

This moves detail 34–153 out of the page and fixes recon 7.

- **Loading:**
  - When `id` changes, the state resets during render, following Task 6.8's "adjust state when a prop changes" pattern.
  - The load requests `getEventById` and `getUserEventResponse` in parallel, where today it waits for one before the other, and drops a result that lands after the id has changed.
  - A failed response request leaves `response` null, as today.
- **`respond`:**
  - It sets `responding`, moves `response` and the counts at once with `applyEventResponseChange`, and writes with `setEventResponse` or `removeEventResponse`.
  - On failure it swaps both back and calls `notify.error("Couldn't update your response. Try again.")`.
  - Either way it then re-reads the event and the response, keeping today's server re-sync.
- **`cancel`:** on success it sets `status: 'cancelled'`.
- **`remove`:** it only reports the result, and the page navigates away.

- [ ] **Step 1: Write the failing test** with `renderHook`.
  - **Loading:**
    - The hook loads the event and the viewer's `'interested'`.
    - A `notFound` result sets `notFound`, and a network error sets only `error`.
    - Changing `id` clears the previous event before the new one loads.
    - An `undefined` id requests nothing.
  - **`respond`:**
    - `respond('going')` moves `rsvp_count` before the write resolves, then re-reads twice.
    - A failed write restores the count and raises the toast.
  - **`cancel` and `remove`:** `cancel` sets the cancelled status, and both return the shared error message on failure.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useEventDetail.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): load event detail through useEventDetail`.

### Task 7.12: `AttendeeList` states

**Files:** `components/events/AttendeeList.tsx` and `AttendeeList.test.tsx`.

**Interface:**

```ts
export interface AttendeeListProps {
  opened: boolean;
  attendees: EventRsvp[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}
```

The modal stays mounted and follows `opened`. Today it mounts only while open, which skips Mantine's transition and its focus return to the opener.

- **Title:** "People going", because Task 7.2 made the list exactly that.
- **States:** loading shows `LoadingState label="Loading attendees…"`, and an error shows `ErrorState title="Couldn't load attendees"` with `onRetry`. "No attendees yet." stays as the empty text.
- **Close button:** `closeButtonProps` goes, because the theme's `Modal` default already names the close button "Close" (the PR 7 bullet above).
- **Rows:** Avatar and public name, as today.

- [ ] **Step 1: Update the tests.** The title reads "People going". Loading shows a `status`, and an error shows its message and a Try again that calls `onRetry`. `opened={false}` renders no dialog. The existing name, avatar, close and "User" fallback cases must pass unchanged.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/events/AttendeeList.test.tsx`
- [ ] **Step 3: Implement.** The detail page passes `opened={attendeesOpen}`, `error={null}` and an `onRetry` that reloads the list, until Task 7.14 wires the real error state.
- [ ] **Step 4: Run the list and detail suites.**
- [ ] **Step 5: Commit** as `refactor(web): give AttendeeList loading, error and retry states`.

### Task 7.13: The detail sidebar cards — `EventAttendanceCard` and `EventOrganizerCard`

**Files:** create `components/events/EventAttendanceCard.tsx` and `EventOrganizerCard.tsx`, each with a `.module.css` and a `.test.tsx`.

**`EventAttendanceCard` interface:**

```ts
/** Why the member can't respond. `cancelled` renders no line, because the page's alert already says so. */
export type EventResponseBlock = 'cancelled' | 'past' | 'organizer' | 'unverified';

export interface EventAttendanceCardProps {
  event: Pick<Event, 'rsvp_count' | 'rsvp_visibility'>;
  isOrganizer: boolean;
  blockedBy: EventResponseBlock | null;
  response: RsvpStatus | null;
  responding: boolean;
  onRespond: (next: RsvpStatus | null) => void;
  onShowAttendees: () => void;
}
```

This takes over detail 289–313. It is a `<section aria-labelledby>` with `h2` "Attendance".

**The going count:**

- When the list is public, or the viewer is the organizer, and the count is above zero, the count is `Anchor component="button" type="button" aria-haspopup="dialog" onClick={onShowAttendees}`, reading "1 person going" or "12 people going". The theme's link colour replaces `#1565C0` (the PR 7 bullet above).
- At zero it reads "0 people going" as text.
- On a private list, for everyone but the organizer, it reads "12 going".

**Below the count:**

- With `blockedBy` null, the card shows `EventResponseControl` with `busy={responding}`.
- Otherwise it shows one line: "This event has passed.", "You're the organizer." or "Verify your account to respond."
- The hint lines "You are currently going." and "Tap RSVP if you plan to attend." go, because the pressed state already carries them.

**`EventOrganizerCard` interface:**

```ts
export interface EventOrganizerCardProps {
  organizer: NonNullable<Event['organizer']>;
  /** Members who aren't the organizer and are Level 1+. */
  canMessage: boolean;
  messaging: boolean;
  onMessage: () => void;
}
```

This takes over detail 316–345. It is a `<section aria-labelledby>` with `h2` "Organizer".

- **Avatar:** it becomes `decorative` with `toneKey={full_name}` and is no longer a link. Today the avatar and the name are two links to the same profile.
- **Name:** the public name is the one `Link` to `/users/<id>`.
- **Message Organizer:** it follows decision 6. While `messaging` it has `aria-disabled`, `data-disabled` and a `Loader` in `leftSection`, and presses are ignored.

- [ ] **Step 1: Write the failing tests.**
  - **`EventAttendanceCard`:**
    - The section is named "Attendance".
    - The count opens the list, and is a button only when the list is visible to the viewer.
    - The singular and plural forms are right, and private lists read "12 going".
    - The control shows only when `blockedBy` is null. Each block shows its line, with none for `cancelled`.
    - `onRespond` receives the control's value.
  - **`EventOrganizerCard`:**
    - The section is named "Organizer".
    - One link, named "Asha K.", points to `/users/u1`.
    - The avatar has no alt text.
    - The Message button appears only when `canMessage`, and calls `onMessage`. While `messaging` it is `aria-disabled`, ignores presses and keeps focus.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/events/EventAttendanceCard.test.tsx src/components/events/EventOrganizerCard.test.tsx`
- [ ] **Step 3: Implement both**, with the modules on semantic tokens.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(web): add the event detail sidebar cards`.

### Task 7.14: The detail page on the new pieces, and its stylesheet

**Files:** `pages/events/[id].page.tsx`, `[id].test.tsx` and `eventDetail.module.css`; `apps/web/e2e/tests/10-events.spec.ts`; `scripts/guard-css-tokens.allowlist.json`; delete `components/events/RsvpButton.tsx` and `RsvpButton.test.tsx`.

| Today | Becomes |
|---|---|
| "Loading..." text (193–201) | `LoadingState variant="detail" label="Loading event…"` |
| Red text and a back link (203–216) | `notFound`: `EmptyState title="Event not found"`, described as "It may have been deleted.", with `Button component={Link} href="/events"` "Back to events". Any other error: `ErrorState title="Couldn't load this event"` with `onRetry={reload}` |
| Breadcrumb `div` (226–230) | `<nav aria-label="Breadcrumb">` holding Mantine `Breadcrumbs`: an `Anchor component={Link}` "Events", then the title with `aria-current="page"` |
| Hero `alt={event.title}` | `alt=""`, because the `h1` follows; the placeholder is `aria-hidden` |
| `Alert color="red"` / `color="gray"` | The same two `Alert`s with module classes: cancelled on `--emergency-bg` / `--emergency-fg`, past on `--surface-2` / `--text-2` |
| `🌐 Global` light orange `Badge` | `ScopeBadge isGlobal`, only when the event is global |
| Emoji info icons | `IconCalendar` and `IconMapPin`, `aria-hidden`. The date is `<time dateTime>` holding `formatEventDateLong(…)` |
| Attendance and organizer cards (289–345) | `EventAttendanceCard` and `EventOrganizerCard`. `blockedBy` is `cancelled`, `past` (`isEventPast` with `useNow()`), `organizer` or `unverified`, checked in that order |
| Manage card with `confirm` / `alert` (133–153, 348–363) | Stays in the page, as a `section` with `h2` "Manage event" |
| `alert` when a conversation can't start (171) | `notify.error("Couldn't start a conversation. Try again.")` |
| `handleShowAttendees` (123–131) | The same lazy load with an `attendeesError`, and `onRetry` loads again |

**Manage event.** Both actions go through `useConfirm` with `danger: true`.

- **Cancel:** the dialog reads "Cancel this event?" / "Your attendees will see it as cancelled.", with "Cancel event" and "Keep event" as its buttons. It is followed by `notify.success('Event cancelled.')` or `notify.error(message)`.
- **Delete:** the dialog reads "Delete this event?" / "This can't be undone.", with "Delete" as its confirm button. On success the page runs `router.push('/events')` and `notify.success('Event deleted.')`. On failure it runs `notify.error(message)`.

**The stylesheet.** These rules in `eventDetail.module.css` are deleted:

- `rsvp*`, which moves to `EventAttendanceCard`
- `organizer*`, which moves to `EventOrganizerCard`
- `centered` and `backLink`, which move to the state components
- `breadcrumbLink`, which moves to `Anchor`
- `sectionTitle`, which the cards own now

The rest is rewritten on tokens with the spec §4.1 table: `container`, `layout`, `main`, `hero*`, `mainBody`, `badgeRow`, `title`, `editedLabel`, `infoRow`, `description`, `sidebar`, `sidebarCard` and the two alert classes.

- `sidebarCard` takes `--card-padding` and a `--border-subtle` border instead of the shadow.
- The two-column layout keeps its 320px aside and collapses at 64em (today's 1024px).

- [ ] **Step 1: Update the tests first.**
  - **Response:** the RSVP button cases become `getByRole('button', { name: 'Going' })` with `aria-pressed`. "toggles RSVP and re-syncs" now expects `setEventResponse(…, 'going')`, and two calls each to `getEventById` and `getUserEventResponse`.
  - **New cases:**
    - An interested viewer sees Interested pressed.
    - The organizer sees "You're the organizer." and no control.
    - `notFound` shows "Back to events" linking to `/events`, and a load error's Try again reloads.
    - Cancel opens a dialog, and confirming it shows the cancelled alert.
    - Delete confirmed navigates to `/events`.
    - A failed conversation raises the toast.
    - The breadcrumb `nav` is named "Breadcrumb".
  - **e2e:** `name: 'RSVP'` becomes `'Going'`, and "Manage Event" becomes the heading `/manage event/i`.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/events/[id].test.tsx`
- [ ] **Step 3: Implement the page**, and delete `RsvpButton`.
- [ ] **Step 4: Rewrite the stylesheet.** Delete the rules no class uses any more, and confirm that nothing else imports the stylesheet. Remove `apps/web/src/pages/events/eventDetail.module.css` from the CSS allowlist. `[id].page.tsx` was never on `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 5: Run the page suite and `npm run lint:guards`**, and check that the page is near its ~230-line target.
- [ ] **Step 6: Commit** as `refactor(web): rebuild event detail on the design system`.

### Task 7.15: E2E, screenshots, accessibility, docs and the PR

**Files:** `apps/web/e2e/visual/pages.ts`, `apps/web/e2e/visual/a11y-baseline.json`, `docs/architecture/web-ui-system.md`, `docs/product/features/events.md`, this plan.

The `events` shot's comment ("The h1 is "📅 Events"…") goes, because the heading is now plain "Events".

The baseline review should expect these changes:

- **Events list:**
  - The `PageHeader`, and the "Upcoming" heading above the cards.
  - Token badges.
  - Bordered cards without the lift, and the control pair in place of "★ Interested ▾".
  - The chip row, which now scrolls on the phone.
- **Event detail:**
  - The breadcrumb and the token alerts.
  - `ScopeBadge`, and tabler icons in place of emoji.
  - The "People going" link-button in the theme's link colour.
  - The Interested / Going pair in place of RSVP, and bordered sidebar cards.
- **Create post, create listing and create event:** chip-group and date labels at weight 500 (decision 9).

The a11y diff must **delete** the four `events` and `event-detail` entries and add nothing.

- [x] **Step 1: Run the smoke pass**, which needs no Docker: `node scripts/visual/smoke.mjs`.
- [x] **Step 2: Run the e2e suite.** `npm run test:e2e:web`. The known risks are the period-aware mock (Task 7.10), the renamed buttons, and `11-marketplace.spec.ts`, which shares `supabase-mock.ts`.
- [x] **Step 3: Check the definition of done's structural items.**
  - No `confirm(`, `alert(` or `prompt(` remains in the area.
  - No `<Link>` wraps a `<Button>` or a card.
  - The CSS allowlist has lost all four stylesheets, and `RAW_ELEMENT_ALLOWLIST` has lost `EventCard.tsx`, `EventFilterBar.tsx` and `events/index.page.tsx`.
  - The page line counts are near their targets.
- [x] **Step 4: Regenerate the baselines** locally in Docker, as PR 6 did, with `npm run test:visual:docker --workspace=apps/web -- --update --write-a11y-baseline`. Review **every** changed PNG against the list above, and commit the screenshots and the a11y diff.
- [x] **Step 5: Document the new pieces.**
  - **`web-ui-system.md`:**
    - `EventResponseControl` and its props, and the rule that event cards use the stretched link with the control above the overlay.
    - `ToggleChipGroup`'s `hideLabel` and `layout`.
    - `EventTypeBadge`'s `data-type` colours.
    - `EventAttendanceCard`, `EventOrganizerCard` and the two hooks.
    - Add the Message Organizer button to "Busy controls stay focusable".
  - **`events.md`:** the detail page offers Interested as well as Going, the list shows upcoming events and then past ones newest first, and the attendee list shows only the people going.
  - **Routed to PR 10's list:**
    - Mobile `EventsScreen` onto `getMetroEventsPage`. Mobile's list has recon 3's ordering bug until then.
    - Mobile's `EventCard` K formatter onto the shared `formatCount`.
    - Mobile event detail onto Interested / Going, for parity with web.
- [x] **Step 6: Run the full gate.** `npm run lint`, `npm run lint:guards`, `npm run type-check`, `npm run test`, `npm run test:e2e:web`, `npm run test:visual:web` and `npm run docs:check`.
- [x] **Step 7: Walk the keyboard** through both pages:
  - Tab and Shift+Tab through the cards, where each card should have one link stop followed by its two response buttons.
  - The chip row with Tab and Space, at 375px too, where the focused chip scrolls into view.
  - The search field, Enter and the clear button.
  - The response pair on detail.
  - The attendee dialog, where Escape returns focus to the count.
  - The cancel and delete dialogs, which should open on their Cancel button.
- [x] **Step 8: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then run `gh pr edit <number> --add-reviewer @copilot`. Update the Live tracker row to `In Review (PR #NN)`.

## PR 8 — split into 8a and 8b (2026-09-22)

The area comes to about 3,900 lines of source across six pages, four components and four stylesheets — PR 4's threshold for "too much for one review". It is now two PRs, on the seam between what a visitor browses and what a seller manages:

- **8a — browse + listing detail.** `index`, `[category]`, `listing/[id]`, and the three components. It owns both of the area's visual pages, so it carries the whole screenshot and accessibility cost and takes `a11y-baseline.json` to `{}`.
- **8b — the seller flow.** `my-listings`, the promote wizard, and `promote.module.css`. Neither page is in `pages.ts`, so **8b runs no baseline job at all**.

`marketplace.module.css` serves both halves, so it comes off the allowlist in 8b, not 8a (the `createListing.module.css` pattern from PR 5). 8b stacks on 8a for that file.

**The promotion success page is split between them.** Its stranding bug — every poll failing left a member who had already paid with no link, no error and no retry — was found during this recon and fixed on its own branch as PR #87, so the behaviour fix reached `master` without waiting for the migration. **PR #87 owns the behaviour; 8b owns the visual migration.** Neither is 8a's.

## PR 8 recon

Run on `master` at `aef9fca` (the "Starting an area PR" commands), 2026-09-22.

| File | Lines | CSS guard | `confirm(`/`alert(` | Raw elements |
|---|---|---|---|---|
| `pages/marketplace/index.page.tsx` | 330 | — | 0 | 0 |
| `pages/marketplace/[category].page.tsx` | 177 | — | 0 | 0 |
| `pages/marketplace/listing/[id].page.tsx` | 330 | — | 0 | 2 |
| `pages/marketplace/my-listings.page.tsx` | 216 | — | 2 | 6 |
| `pages/marketplace/listing/promote/[id].page.tsx` | 410 | — | 0 | 7 |
| `pages/marketplace/listing/promote/success.page.tsx` | 110 | — | 0 | 0 |
| `pages/marketplace/marketplace.module.css` | 837 | **159** | — | — |
| `pages/marketplace/listing/promote.module.css` | 841 | **107** | — | — |
| `components/marketplace/ListingStrip.tsx` / `.module.css` | 106 / 118 | 19 | 0 | 2 |
| `components/marketplace/FilterBar.tsx` / `.module.css` | 120 / 59 | 9 | 0 | 1 |
| `components/marketplace/ListingCard.tsx` | 79 | — (borrows the page module) | 0 | 0 |

`createListing.module.css` (PR 5) and `ListingSummaryRow.module.css` (PR 6) are already token-clean, so the CSS work is four allowlisted files, not six. `a11y-baseline.json` holds exactly four entries, all in this area — `color-contrast` on `marketplace` and `listing-detail` at both widths — so **8a empties it**, which the plan had pencilled in for PR 10.

**What the recon changed** (the area read on 2026-09-22):

1. **A failed fetch leaves the previous metro's listings frozen on screen, looking loaded.** `index.page.tsx` 142–152 only assigns inside `if (res.data)`, so on error `setFeatured` / `setRecent` / `setTrending` are never called, nothing is cleared, and `setLoadedQueryKey(queryKey)` still fires — `loading` flips false with stale rows in place. `[category].page.tsx` 86 is worse: `if (result.data) setListings(result.data)` has no `else`, so a failed category switch shows the **previous category's** listings under the new heading. Neither page has an `ErrorState`.
2. **Load-more failures are silent.** `index.page.tsx` 163–188 only does `setHasMore(false)` on error, so paging stops in a way no member can tell from reaching the end.
3. **The index hand-rolls its own `IntersectionObserver`** (190–205) instead of the shared `useInfiniteScroll`, which events already adopted.
4. **Seven of the twelve marketplace categories no longer exist.** Migration 016 consolidated them to five (`food-restaurants`, `immigration-legal`, `professional-services`, `remittance-finance`, `other`), but `marketplace.module.css` 354–412 still carries twelve `.categoryTheme*` blocks and `ListingCard.tsx` 7–20 still maps twelve slugs. The dead seven are the densest cluster of colour literals in the file.
5. **The whole listing card is one giant `<Link>`** (`ListingCard.tsx` 35–77), so its accessible name runs category, title, price, "Verified Seller", view count and "Contact Seller" together — and "Contact Seller" reads as a control but is inert decoration.
6. **Listing detail keeps the previous listing when the route id changes, and has no cancel guard.** `listing/[id].page.tsx` 53–79 never resets `listing`, `loading` or `photoIndex`, so a shorter new listing leaves `listing.photos[photoIndex]` undefined and `Image` gets a bad `src`. Its errors also render as "Listing not found." This is the same pair PR 6 fixed on the public profile and PR 7 on event detail.
7. **The photo gallery reinvents `PhotoCarousel`** (165–200) with raw buttons, no swipe and an unannounced `{n}/{total}`.
8. **`<Link>` wrapping `<Button>` in five places:** `index.page.tsx` 237–239 and 240–242 and 321–323, and `listing/[id].page.tsx` 136–141. (The plan's cited my-listings 90/101 has drifted; it is now 100–102 and 111–113, and belongs to 8b.)
9. **The 375px overflow is the header row.** `.header` (`marketplace.module.css` 8–13) is `display: flex; justify-content: space-between` with **no `flex-wrap`**, holding the `h1` and two Mantine `Button`s whose labels are `white-space: nowrap`. Nothing can shrink below min-content, so the row forces the document to 442px.
10. **About 17 rule blocks are dead**, including a `searchContainer` / `searchInput` / `searchIcon` set superseded by `FilterBar.module.css`, a `categoryGrid` cluster from a removed home grid, and a `listingCard` / `listingPhoto` / `listingTitle` / `listingPrice` set superseded by `ListingCard`'s own classes.
11. **Duplication.** `readQueryParam` / `parseSort` are defined twice and have drifted in signature (`index.page.tsx` 29–45 against `[category].page.tsx` 23–39). `isVerifiedSeller` — `(listing.owner?.trust_level ?? 0) >= 1` — exists three times: web `ListingCard.tsx` 31, mobile `ListingCard.tsx` 23 and mobile `ListingGridCard.tsx` 37.
12. **Every marketplace test mocks Mantine.** `Select`, `Button` and `Skeleton` are replaced with bare elements in all seven files, so real Mantine is never exercised — and `listing/[id].test.tsx` 28–35 collapses Mantine's `loading` prop to native `disabled`, which masks the "busy controls stay focusable" rule the design system requires.

**8b's findings**, recorded here so its breakdown does not have to re-read the area: my-listings never checks `result.error` on any of its four mutations and re-fetches the whole list instead of updating a row, so a failed deactivate silently re-renders unchanged; `getListingsByOwner` defaults to `limit: 50` and returns no `hasMore`, so an owner with 51+ listings loses the tail; its `next/image fill` thumbnail (123–128) has no positioned ancestor, because neither `.myListingCard` nor `.myListingThumb` sets `position: relative`; it re-implements `isListingExpiringSoon` inline (117–118) and prints "Expires in 1 days"; and `promote.module.css` is **two stylesheets concatenated** — 128 class declarations, with `.payButton` and `.continueButton` each declared six times, `.tierCard` and `.stepperButton` five, `.dot` four — so most of its 841 lines never renders and it should be rewritten from what actually applies rather than migrated rule by rule. The promote wizard's tier cards are `div role="button"` with no `aria-checked` and no radiogroup, and no client-side ownership check runs before a member completes all three steps for someone else's listing (the 403 only comes from the edge function).

---

# PR 8a — Marketplace: browse + listing detail

**Branch:** `feat/web-ui-marketplace`, created from `master` at `aef9fca`.

| File | Change | Why |
|---|---|---|
| `apps/web/src/styles/tokens.css` (+ its contrast test) | Modify | `--category-<slug>-fg` / `-bg` for the five live categories |
| `packages/shared/src/logic/marketplace/seller.ts` (+ test) | Create | `isVerifiedSeller`, today copied three times. **Web adopts it here; mobile's two copies stay** — this PR must not touch `apps/mobile/` — and are on PR 10's list |
| `apps/web/src/lib/marketplaceQuery.ts` (+ test) | Create | One `readQueryParam` / `parseSort` / `parseView`, today two drifted copies |
| `apps/web/src/components/marketplace/ListingCard.module.css` | Create | The card stops borrowing the 837-line page module |
| `apps/web/src/components/marketplace/{ListingCard,FilterBar,ListingStrip}.tsx` + tests | Modify | Stretched link, Mantine fields, real Mantine in tests |
| `apps/web/src/hooks/useMarketplaceFeed.ts` (+ test) | Create | Paging, filters and the three states, as `useEventFeed` does |
| `apps/web/src/components/marketplace/MarketplaceBrowse.tsx` (+ test) | Create | One browse view behind both routes |
| `apps/web/src/hooks/useListingDetail.ts` (+ test) | Create | Id reset, cancel guard, real error state |
| `apps/web/src/components/marketplace/{ListingActionsPanel,ListingBusinessDetails}.tsx` + tests | Create | Extracted from the 330-line detail page |
| `apps/web/src/pages/marketplace/browse.module.css` | Create | Token-clean; the browse classes leave `marketplace.module.css` |
| `apps/web/src/pages/marketplace/listingDetail.module.css` | Create | Token-clean; the detail classes leave `marketplace.module.css` |
| `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs` | Modify | `FilterBar` and `ListingStrip` come off both |

**How this PR runs.** Four chunks, as PR 7 ran. Inside a chunk each task writes its failing test, runs only that task's tests, implements, re-runs and commits, with no review between tasks. At each chunk boundary: `type-check`, `lint`, `lint:guards`, the full unit suite of every workspace touched (web Vitest must run from a `C:\…` cwd), then one code-review agent over the chunk's whole diff, CRITICAL and HIGH fixed in one `fix(web): address chunk N review` commit, everything else routed to PR 10's list or the tracker — **never to new tasks**. e2e and visual run only in chunk 4.

| Chunk | Tasks | Ends with |
|---|---|---|
| 1. Tokens and leaf components | 8a.1–8a.4 | Category tokens, the shared seller helper, and all three components migrated and off both allowlists |
| 2. Browse | 8a.5–8a.8 | Both browse routes on one hook and one view, stylesheet included |
| 3. Listing detail | 8a.9–8a.11 | The detail page fully migrated, stylesheet included |
| 4. Finish | 8a.12 | e2e, baselines, `a11y-baseline.json` to `{}`, docs and the draft PR |

**Decisions this breakdown locks in:**

1. **Both category routes stay, over one implementation** (recon 11). `/marketplace?category=slug` and `/marketplace/<slug>` are both live — the detail page's category chip and `[category]`'s own search switch use the second — so deleting either would break existing links. Both routes render `MarketplaceBrowse` over `useMarketplaceFeed`; only the thin page wrapper differs. The index's heading stops always reading "All Listings" and names the active category.
2. **Category colour becomes tokens, for the five live categories only** (recon 4). `tokens.css` gains `--category-<slug>-fg` / `-bg` mirroring `--event-<type>-*`, selected by a `data-category` attribute as `EventTypeBadge` does, and covered by Task 1.1's contrast test. The seven dead slugs and their twelve CSS blocks go. `MARKETPLACE_CATEGORIES[].color` stays put as mobile's source; web stops reading it.
3. **Error, empty and stale are three separate states** (recon 1 and 2). Every fetch path clears its rows on failure and renders `ErrorState` with a retry. `hasMore` goes false on error *and* records the error, so load-more failures are visible.
4. **`marketplace.module.css` stays on the allowlist through 8a.** my-listings is 8b's page, and the guard fails on an allowlisted file that is already clean, so the entry can only be removed once the last consumer is migrated.
5. **`ListingCard` keeps its single-target link but stops wrapping the card.** It moves to the stretched-link pattern `PostCard` and `EventCard` use: the title is the only link, everything else sits beside the overlay, and the inert "Contact Seller" text is dropped rather than promoted to a control (recon 5).

## PR 8a — Task breakdown

Same conventions as PRs 4a–7: test first, one commit per task, tests query by role, label or text, semantic tokens only, Mantine components rather than raw elements outside `components/ui/`, and no new dependencies.

### Task 8a.1: Category tokens and the shared seller helper

**Files:** `apps/web/src/styles/tokens.css` and `apps/web/src/styles/tokens.contrast.test.ts`; create `packages/shared/src/logic/marketplace/seller.ts` and `seller.test.ts`; export both from `packages/shared/src/logic/marketplace/index.ts`.

**Interface:**

```ts
/** A seller is "verified" at TrustLevel.VERIFIED or above. Three copies exist today. */
export function isVerifiedSeller(
  listing: Pick<MarketplaceListing, 'owner'>
): boolean;
```

`tokens.css` gains ten tokens, one pair per live category, in the same block as `--event-<type>-*`:

```text
--category-food-restaurants-fg / -bg
--category-immigration-legal-fg / -bg
--category-professional-services-fg / -bg
--category-remittance-finance-fg / -bg
--category-other-fg / -bg
```

- [ ] **Step 1: Write the failing tests.**
  - `isVerifiedSeller` is true at `trust_level` 1 and 2, false at 0, and false when `owner` is absent.
  - Extend `tokens.contrast.test.ts` so every `--category-*-fg` clears 4.5:1 on its `-bg` **and** on `--surface-0`, the way the event pairs are checked.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/logic/marketplace/seller.test.ts` and `npm run test --workspace=apps/web -- src/styles/tokens.contrast.test.ts`
- [ ] **Step 3: Implement.** Pick each pair inside sRGB; the four chromas that shrank in planning decision 4 are the precedent if a hue will not fit.
- [ ] **Step 4: Run both and watch them pass.**
- [ ] **Step 5: Commit** as `feat(shared): add isVerifiedSeller and marketplace category tokens`.

### Task 8a.2: `ListingCard` on the stretched link, its own stylesheet and the tokens

**Files:** `components/marketplace/ListingCard.tsx` and `.test.tsx`; create `ListingCard.module.css`.

**Interface:** unchanged — `{ listing: MarketplaceListing; sponsored?: boolean }`.

The card becomes an `<article data-category={slug}>`: the photo or an `aria-hidden` placeholder; the "Sponsored" badge; an `h3` holding the only link, whose `::after` covers the card; then price, category chip, the verified mark and the view count beside the overlay. `CATEGORY_THEME_CLASS_BY_SLUG` and its twelve entries are deleted, and the card reads `--category-<slug>-fg` / `-bg` through `data-category`, falling back to `other` for an unknown slug. The inert "Contact Seller" text is removed (decision 5). The decorative emoji and the verified star both get `aria-hidden`.

- [ ] **Step 1: Rewrite the tests.** Keep title, price, category, photo and sponsored coverage, then add:
  - The only link is named by the title alone and points to `/marketplace/listing/<id>`.
  - An unknown category slug still renders, with `data-category="other"`.
  - A verified seller's mark is `aria-hidden`, and the card's accessible name does not contain "Verified".
  - No element with the text "Contact Seller" remains.
  - The `.module.css` Proxy mock is deleted along with the raw elements it propped up.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/marketplace/ListingCard.test.tsx`
- [ ] **Step 3: Implement**, moving `featuredCard`, `cardImage`, `cardBody`, `cardCategoryChip`, `cardTitle`, `cardPrice`, `cardMetaLine`, `verifiedStar`, `metaDot` and `sponsoredBadge` out of `marketplace.module.css` into the new token-clean `ListingCard.module.css`. Delete the twelve `.categoryTheme*` blocks from the page module.
- [ ] **Step 4: Run the card suite and `npm run lint:guards`.**
- [ ] **Step 5: Commit** as `refactor(web): rebuild ListingCard on a stretched link and category tokens`.

### Task 8a.3: `FilterBar` onto Mantine fields

**Files:** `components/marketplace/FilterBar.tsx`, `.module.css` and `.test.tsx`; `scripts/guard-css-tokens.allowlist.json`; `apps/web/eslint/raw-element-allowlist.mjs`.

The raw `<input role="searchbox">` (107–116) and its emoji `searchIcon` become a Mantine `TextInput` with `leftSection={<IconSearch aria-hidden />}` and a `CloseButton` in `rightSection` that clears the field — the treatment `EventFilterBar` already established, which this control has never had. Both `Select`s become `NativeSelect` (implementation decision 26, taken during the chunk and recorded there). `outline: none` at `.module.css` 38 goes, and the field takes the theme focus ring.

- [ ] **Step 1: Rewrite the tests** against real Mantine, deleting the `Select` and `.module.css` mocks:
  - The search field is found by `getByRole('searchbox', { name: /search listings/i })`.
  - Typing and pressing Enter calls `onChange` with the query.
  - The clear button appears only when the field has text, clears it, and is named.
  - The sort `Select` is reachable by its accessible name and reports a change.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/marketplace/FilterBar.test.tsx`
- [ ] **Step 3: Implement.** In the same commit remove `FilterBar.module.css` from the CSS allowlist and `src/components/marketplace/FilterBar.tsx` from `RAW_ELEMENT_ALLOWLIST`.
- [ ] **Step 4: Run the suite, then `npm run lint:guards`.**
- [ ] **Step 5: Commit** as `refactor(web): rebuild FilterBar on Mantine fields and tokens`.

### Task 8a.4: `ListingStrip` arrows onto Mantine

**Files:** `components/marketplace/ListingStrip.tsx`, `.module.css` and `.test.tsx`; both allowlists.

The two raw arrow `<button>`s (63–71, 94–102) become Mantine `ActionIcon`s keeping their `Scroll <title> left` / `right` names and their `handleScrollBy(±320)` behaviour, so they pick up the theme focus ring that `.arrow` never defined. The module moves onto semantic tokens.

- [ ] **Step 1: Extend the tests.**
  - Both arrows are found by role and name, and clicking each scrolls by the expected offset.
  - Each arrow is focusable and shows a focus ring class-free assertion — query by role, then assert `document.activeElement`.
  - Keep the existing "Show All" gating coverage.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/marketplace/ListingStrip.test.tsx`
- [ ] **Step 3: Implement**, and remove `ListingStrip.module.css` and `src/components/marketplace/ListingStrip.tsx` from the two allowlists.
- [ ] **Step 4: Run the suite, then `npm run lint:guards`.**
- [ ] **Step 5: Commit** as `refactor(web): move ListingStrip arrows onto Mantine and tokens`.

**Chunk 1 gate.** `type-check`, `lint`, `lint:guards`, then `npm run test --workspace=packages/shared` and `--workspace=apps/web`. Review the diff `<chunk start>..HEAD`, fix CRITICAL and HIGH in one commit, route the rest, push, and record the chunk in the tracker.

### Task 8a.5: `parseMarketplaceQuery`

**Files:** create `apps/web/src/lib/marketplaceQuery.ts` and `marketplaceQuery.test.ts`.

One home for the parsing that `index.page.tsx` 29–48 and `[category].page.tsx` 23–39 both own and have drifted on. It stays in `apps/web/src/lib` rather than `packages/shared`, because its input is a Next router query.

```ts
/** Defined and exported here; it was a page-local type on the index before. */
export type DiscoveryView = 'featured' | 'trending' | null;

export interface MarketplaceQuery {
  view: DiscoveryView;
  category: string;
  q: string;
  sort: ListingSortBy;
}

export function parseMarketplaceQuery(query: ParsedUrlQuery): MarketplaceQuery;
```

- [ ] **Step 1: Write the failing test.** A repeated param takes its first value; an unknown `sort` falls back to `newest`; an unknown `view` falls back to `null`; a missing param is `''`; and both the array and the undefined forms are accepted, which is exactly where the two copies disagreed.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/lib/marketplaceQuery.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `refactor(web): extract parseMarketplaceQuery`.

### Task 8a.6: `useMarketplaceFeed`

**Files:** create `apps/web/src/hooks/useMarketplaceFeed.ts` and `useMarketplaceFeed.test.ts`.

Modelled on `useEventFeed`. It owns the home sections, the filtered grid, paging through `useInfiniteScroll`, and the three states decision 3 separates.

```ts
export interface MarketplaceFeedState {
  featured: MarketplaceListing[];
  recent: MarketplaceListing[];
  trending: MarketplaceListing[];
  sponsored: MarketplaceListing[];
  grid: MarketplaceListing[];
  loading: boolean;
  /** Non-null when the current query failed. Rows are cleared, never stale. */
  error: string | null;
  loadingMore: boolean;
  /** Non-null when a load-more failed, so the footer can say so and retry. */
  loadMoreError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** Clears loadMoreError and asks for the page again, as useEventFeed does. */
  retryLoadMore: () => void;
  reload: () => void;
}

export function useMarketplaceFeed(
  metroId: string | null,
  query: MarketplaceQuery
): MarketplaceFeedState;
```

- [ ] **Step 1: Write the failing test.**
  - A failed home-sections load clears every section and sets `error` — the stale-rows bug in recon 1.
  - A failed filtered load clears `grid` and sets `error`.
  - A failed load-more sets `loadMoreError`, leaves the loaded rows alone, and a retry clears it.
  - `hasMore` is false after a failed first load.
  - Changing metro or query resets rows and refetches.
  - A page that lands after a query change is dropped (the generation guard PR 7 needed).
  - Each test sets its own mocks in `beforeEach`, so no test leans on a previous one's queue — the exact fault PR 7's chunk 2 review found in `useEventFeed.test.ts`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useMarketplaceFeed.test.ts`
- [ ] **Step 3: Implement**, replacing the hand-rolled `IntersectionObserver` with `useInfiniteScroll` (recon 3).
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useMarketplaceFeed`.

### Task 8a.7: `MarketplaceBrowse`, and both routes on it

**Files:** create `components/marketplace/MarketplaceBrowse.tsx` and `.test.tsx`; rewrite `pages/marketplace/index.page.tsx` and `[category].page.tsx`; rewrite `index.test.tsx` and `[category].test.tsx`.

One view behind both routes (decision 1). It renders `FilterBar`, the four strips when unfiltered — Sponsored, Featured, Recently Added and Trending, with Sponsored hidden when it is empty — the category's own Featured strip when one is active, the grid, and `LoadingState` / `EmptyState` / `ErrorState`. A test asserts the Sponsored strip renders and is named, so following this breakdown cannot silently drop it. The pages become thin: each parses its query, resolves its metro, and renders the view with the right heading. `<Link><Button></Link>` at index 237–242 and 321–323 becomes `<Button component={Link} href=…>`.

- [ ] **Step 1: Write the failing tests.** For the view:
  - A failed load shows an error with a retry, and **not** the empty state — recon 1, asserted by text, not by class.
  - An empty result shows the empty state.
  - The heading names the active category when one is set, and "All Listings" only when none is.
  - No `<button>` is nested inside an `<a>`: assert `container.querySelector('a button')` is null.
  - Sections are found by `getByRole('region', { name })` and their cards by list item, not by `closest('section')` — the fault PR 7's chunk 2 review recorded.

  For each page: it renders the view for its route, and `/marketplace/<slug>` and `/marketplace?category=<slug>` produce the same heading and the same grid.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/marketplace/MarketplaceBrowse.test.tsx src/pages/marketplace/index.test.tsx src/pages/marketplace/[category].test.tsx`
- [ ] **Step 3: Implement.** Delete the Mantine mocks from both page tests (recon 12).
- [ ] **Step 4: Run the three suites.**
- [ ] **Step 5: Commit** as `refactor(web): put both marketplace browse routes on one view`.

### Task 8a.8: `browse.module.css`

**Files:** create `pages/marketplace/browse.module.css`; `pages/marketplace/marketplace.module.css`.

The browse classes — `container`, `header`, `headerActions`, `title`, `sectionTitle`, `listingGrid`, `loadSentinel`, `footerLoader`, `emptyState` and its icon and text, and `backLink` — move into a token-clean file of their own, with their own copies of the names `marketplace.module.css` shares with my-listings. **`.header` gains `flex-wrap: wrap` and a `--space-3` row gap**, which is recon 9's 375px overflow. The ~17 dead blocks in recon 10 are deleted in this commit. `marketplace.module.css` keeps only what my-listings and `listing/[id]` still use and stays on the allowlist (decision 4).

- [ ] **Step 1: Write the failing test.** Extend the guard's own test so `browse.module.css` is asserted clean, and confirm `findViolations` reports 0 for it.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement.** Check each moved class still has a consumer before copying it; do not carry a dead rule into a new file.
- [ ] **Step 4: Run `npm run lint:guards`** and the two page suites.
- [ ] **Step 5: Commit** as `refactor(web): move the marketplace browse styles onto semantic tokens`.

**Chunk 2 gate.** As chunk 1. Record the before and after line counts of both page files in the tracker.

### Task 8a.9: `useListingDetail`

**Files:** create `apps/web/src/hooks/useListingDetail.ts` and `useListingDetail.test.ts`.

**This needs a shared change first.** `getListingById` maps both a missing row and a malformed id to a plain `Error`, so a hook alone cannot tell either from a network failure. `ListingResult` gains `notFound`, set for `PGRST116` and `22P02` — a mistyped UUID no retry would fix — which is the convention `EventResult` already uses.

```ts
export interface ListingDetailState {
  listing: MarketplaceListing | null;
  loading: boolean;
  error: string | null;
  /** Distinct from `error`: the row genuinely is not there. */
  notFound: boolean;
  isSaved: boolean;
  saving: boolean;
  toggleSave: () => void;
  reload: () => void;
}

export function useListingDetail(
  id: string | undefined,
  viewer: Pick<User, 'id'> | null
): ListingDetailState;
```

- [ ] **Step 1: Write the failing test.**
  - A failed load sets `error` and leaves `notFound` false — recon 6, where a network failure reads as "Listing not found."
  - A genuinely missing row sets `notFound`.
  - A response for a previous id never lands after the id changed (the cancel guard the page has never had).
  - A failed `getUserSavedListingIds` does not silently leave `isSaved` wrong.
  - As in 8a.6, every test sets its own mocks in `beforeEach`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useListingDetail.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useListingDetail`.

### Task 8a.10: Listing detail on the new pieces

**Files:** `pages/marketplace/listing/[id].page.tsx` and `[id].test.tsx`; create `components/marketplace/ListingActionsPanel.tsx`, `ListingBusinessDetails.tsx` and their tests.

The page keys its view by id, as event detail does, so `photoIndex` cannot survive a route change (recon 6). The hand-rolled gallery is replaced outright by `PhotoCarousel` (recon 7). The breadcrumb becomes Mantine `Breadcrumbs`. `<Link><Button></Link>` at 136–141 becomes `<Button component={Link}>`. The owner row uses the shared `Avatar`. `sidebarContent`, defined once and rendered at two breakpoints, becomes `ListingActionsPanel` so the two render sites cannot drift. Heading order is repaired: the `h3`s at 245 and 302 become `h2`s under the page `h1`. Target about 170 lines.

- [ ] **Step 1: Rewrite the tests.**
  - The gallery is `PhotoCarousel`: "Photo 2 of 3" is announced, and prev/next are real buttons outside any link.
  - A load failure shows an error with a retry, distinct from the not-found copy.
  - Changing the route id clears the previous listing's photo.
  - No `<button>` inside an `<a>`.
  - Headings descend `h1 → h2` with no skip.
  - Delete the `Button` mock at 28–35, which was hiding Mantine's `loading` semantics (recon 12).
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/pages/marketplace/listing/[id].test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the detail and component suites.**
- [ ] **Step 5: Commit** as `refactor(web): rebuild listing detail on the design system`.

### Task 8a.11: `listingDetail.module.css`

**Files:** create `pages/marketplace/listingDetail.module.css`; `pages/marketplace/marketplace.module.css`.

The detail classes — `detailContainerWide`, `breadcrumb*`, `twoColumnGrid`, `mainColumn`, `detailSection`, `detailTitle`, `highlightsStrip`, `highlightChip`, `inlinePriceCard`, `sidebar`, `sidebarPrice`, `detailRow` and friends, `businessHourRow`, `ownerRow*` — move into a token-clean file. The `rgba(0,0,0,…)` and `white` literals in the gallery block go with the gallery itself, which `PhotoCarousel` now owns. `detailContainer` and `detailPrice`, superseded by their `Wide` and `sidebar` variants, are deleted.

- [ ] **Step 1: Write the failing test.** Assert `findViolations` reports 0 for the new file.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm run lint:guards`** and the detail suite.
- [ ] **Step 5: Commit** as `refactor(web): move listing detail styles onto semantic tokens`.

**Chunk 3 gate.** As chunk 1. Record the detail page's before and after line counts.

### Task 8a.12: E2E, screenshots, accessibility, docs and the PR

**Files:** `apps/web/e2e/tests/11-marketplace.spec.ts`; `apps/web/e2e/visual/pages.ts` if a ready check needs it; `apps/web/e2e/visual/__screenshots__/**`; `apps/web/e2e/visual/a11y-baseline.json`; `docs/architecture/web-ui-system.md`; `docs/product/features/marketplace.md`.

- [ ] **Step 1: Update the e2e selectors** in `11-marketplace.spec.ts` for the new roles and names, and check `01-unauthenticated.spec.ts`, which also visits the marketplace.
- [ ] **Step 2: Check the visual ready functions.** `marketplace` waits on its `h1`; make it wait on the first card too, so a strip is not half-rendered in the shot — the timing fault PR 7 hit on the feed.
- [ ] **Step 3: Run the e2e suite.** `npm run test:e2e:web`
- [ ] **Step 4: Regenerate the baselines in Docker** — `npm run test:visual:docker --workspace=apps/web -- --update` — then **review every changed PNG**, at both widths. Four screenshots are expected to change: `marketplace` and `listing-detail`, desktop and phone.
- [ ] **Step 5: Rewrite the accessibility baseline.** `--write-a11y-baseline` should leave `a11y-baseline.json` as `{}`. **The diff must only delete lines.** If any entry survives, the contrast it names is still failing and belongs in this PR, not PR 10.
- [ ] **Step 6: Update the docs.** Add `MarketplaceBrowse`, `ListingActionsPanel` and `ListingBusinessDetails` to `web-ui-system.md`, along with the category tokens and the `data-category` convention. In `marketplace.md`, correct anything the browse rewrite changed; note that the 12-category theming is now 5, matching migration 016.
- [ ] **Step 7: Run the full gate.** `npm run lint`, `lint:guards`, `type-check`, `test`, `test:e2e:web`, `test:visual:web` and `docs:check`.
- [ ] **Step 8: Walk the keyboard.**
  - Tab through the grid: each card is one link stop, with no trapped controls.
  - The filter bar: the search field, Enter, the clear button, then the sort `Select` with arrow keys and Escape.
  - The strips' arrows, which must show a focus ring.
  - The detail page's carousel with arrow keys, and its breadcrumb.
  - The header at 375px, which must wrap rather than overflow.
- [ ] **Step 9: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then `gh pr edit <number> --add-reviewer @copilot`. Update the tracker row to `In Review (PR #NN)`.

---

## PR 8b — Marketplace: seller flow (`feat/web-ui-marketplace-seller`)

**Branch:** `feat/web-ui-marketplace-seller`, created from `master` at `f632e79` (PR #88 merged).

The scope as the recon left it:

- **Pages:** `pages/marketplace/my-listings.page.tsx`, `listing/promote/[id].page.tsx`, `listing/promote/success.page.tsx`.
- **CSS:** `listing/promote.module.css` (rewrite, not migrate — 128 declarations with six-fold duplicates), and the last of `marketplace.module.css`, **which comes off the allowlist here**.
- **Correctness:** the four unchecked mutation results; `getListingsByOwner`'s silent 50-row ceiling; the thumbnail's missing positioned ancestor; the inline expiry check and its "Expires in 1 days" copy, which `isListingExpiringSoon` and `getListingExpiryNotice` already solve.
- **Accessibility:** the six raw action `<button>`s collapse into one `ActionMenu` passed to `ListingSummaryRow` through a new `menu` prop; the two native `confirm()`s become `useConfirm`, delete with `danger: true`; the promote wizard's seven raw elements become Mantine, with `NumberInput` absorbing the stepper pair; the tier cards become a real single-select group with `aria-checked`; the wizard gains an `h1`.
- **Also:** an owner guard before the promote wizard runs, so a member is not walked through three steps only to be refused by the edge function.
- **Mobile parity, routed to PR 10:** `MyListingsScreen` has the same inline expiry check and its own `STATUS_CONFIG`.

## PR 8b inventory

Run on `feat/web-ui-marketplace-seller` at `f632e79` (the "Starting an area PR" commands), 2026-09-23.

| File | Lines | CSS guard | `confirm(`/`alert(` | Raw elements |
|---|---|---|---|---|
| `pages/marketplace/my-listings.page.tsx` | 216 | — | 2 (65, 76) | 6 (164, 171, 178, 187, 194, 202) |
| `pages/marketplace/listing/promote/[id].page.tsx` | 410 | — | 0 | 7 (183, 269, 286, 295, 305, 343, 397) |
| `pages/marketplace/listing/promote/success.page.tsx` | 167 | — | 0 | 0 |
| `pages/marketplace/marketplace.module.css` | 193 | **32** | — | — |
| `pages/marketplace/listing/promote.module.css` | 841 | **107** | — | — |

What the inventory adds to the recon:

1. **`marketplace.module.css` has one consumer left: my-listings.** 8a moved browse and detail onto their own modules, and the two other files that mention it (`ListingCard.module.css`, `createListing.module.css`) only do so in comments. So once my-listings moves, the file is **deleted**, not cleaned — and its allowlist entry goes with it.
2. **The two promote pages use 51 of `promote.module.css`'s 128 class declarations**, so 60% of the file never renders, which confirms the rewrite.
3. **The success page grew from 110 to 167 lines** with PR #87's retry and "Go to My Listings" states. Its behaviour stays as #87 left it; only its markup and styles move.
4. **`getListingsByOwner` returns no `hasMore`**, unlike `getListingsByMetro` and the other paged reads, which all return one.
5. **The edge function checks ownership, trust level and a duplicate active promotion — but not listing status.** A member who reaches the wizard for an inactive listing can pay to promote a listing nobody can see. my-listings only shows Promote on active rows, so this takes a typed URL or a stale tab, but it is money.
6. **`handlePay` re-enables the Pay button while the browser is already leaving for Stripe.** `finally` clears `paymentLoading` right after `window.location.href` is assigned, so a second click during the navigation creates a second checkout session and a second `pending` promotion row.
7. **`11-marketplace.spec.ts` 86–101 drives my-listings through `page.once('dialog')`** and top-level buttons named Deactivate / Reactivate / Delete. Both go away here, so that test is rewritten, not patched.

| File | Change | Why |
|---|---|---|
| `packages/shared/src/api/marketplace.ts` (+ test) | Modify | `getListingsByOwner` returns `hasMore` (inventory 4) |
| `packages/shared/src/logic/marketplace/promotion.ts` (+ test, + `index.ts`) | Create | `getPromotionBlocker`, one rule for who may start the wizard |
| `apps/web/src/components/marketplace/ListingSummaryRow.tsx` (+ test) | Modify | A `menu` prop passed through to `SummaryRow` |
| `apps/web/src/hooks/useMyListings.ts` (+ test) | Create | Paging, the three states, and row-level mutations that check their result |
| `apps/web/src/components/marketplace/MyListingActions.tsx` (+ test) | Create | One `ActionMenu` per row, with `useConfirm` |
| `apps/web/src/pages/marketplace/myListings.module.css` | Create | Token-clean page layout; `marketplace.module.css` is deleted |
| `apps/web/src/hooks/usePromoteWizard.ts` (+ test) | Create | Listing load, blocker, step, tier, duration and checkout |
| `apps/web/src/components/marketplace/promote/{PromoteSteps,PromotionTierPicker,PromotionDurationStep,PromotionReview}.tsx` + tests + `.module.css` | Create | Extracted from the 410-line wizard |
| `apps/web/src/pages/marketplace/listing/promote.module.css` | Rewrite | Only what the two pages still use, on tokens |
| `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs` | Modify | Both marketplace entries off the first, both pages off the second |

**How this PR runs.** Three chunks, as PR 8a ran. Inside a chunk each task writes its failing test, runs only that task's tests, implements, re-runs and commits, with no review between tasks. At each chunk boundary: `type-check`, `lint`, `lint:guards`, the full unit suite of every workspace touched (web Vitest must run from a `C:\…` cwd), then one code-review agent over the chunk's whole diff, CRITICAL and HIGH fixed in one `fix(web): address chunk N review` commit, everything else routed to PR 10's list or the tracker — **never to new tasks**. e2e runs only in chunk 3. Neither page is in `pages.ts`, so **there is no baseline run**; `a11y-baseline.json` is already `{}` and must stay that way.

| Chunk | Tasks | Ends with |
|---|---|---|
| 1. My listings | 8b.1–8b.5 | my-listings rebuilt, `marketplace.module.css` deleted, the page off the raw-element allowlist |
| 2. Promote | 8b.6–8b.11 | The wizard and success page rebuilt, `promote.module.css` rewritten and off the allowlist |
| 3. Finish | 8b.12 | e2e, keyboard walk, docs and the draft PR |

**Decisions this breakdown locks in:**

1. **my-listings updates the row it changed; it stops re-fetching the list.** A successful deactivate sets `status: 'inactive'`; reactivate sets `status: 'active'` and `refreshed_at` to now (what the API writes); refresh sets `refreshed_at`; delete drops the row. A failed one leaves the row exactly as it was and says so with `notify.error`. Re-fetching after every action is what hid the unchecked results — a failed deactivate re-rendered unchanged, which looked like nothing happened.
2. **my-listings pages at 20 with `useInfiniteScroll`.** `getListingsByOwner` gains `hasMore` (`rows.length === limit`, as `getListingsByMetro` does). A delete removes a row the server will no longer return, so the next page's offset is **the rows fetched minus the rows deleted** — otherwise each delete would skip one listing. The profile's Listings tab keeps its fixed limit of 50; paging it is on PR 10's list with the rest of the profile list work.
3. **The row actions are one `ActionMenu`, named "Actions for <title>".** Items, in order: Edit (link), Promote (link, active only), Refresh (active only), Deactivate or Reactivate, Delete (`danger`). Items are disabled while that row's action is in flight. The emoji labels become Tabler icons.
4. **The wizard refuses up front, not at step 3.** `getPromotionBlocker(listing, viewer)` returns `'not_owner'`, `'inactive'` (inventory 5), `'unverified'`, or `null`, checked in that order — a stranger's listing is refused as not theirs before anything else. Any non-null blocker renders one `EmptyState` naming the reason with a link back to My Listings, instead of the steps. **This moves the Level 0 message from step 3 to the start** — the same rationale as the owner guard, since walking an unverified member through two steps to a banner is what the owner guard exists to stop. The edge function's checks stay the authority; this only stops the wizard wasting the member's time.
5. **Tier cards become Mantine `Radio.Card`s in a `Radio.Group`.** That gives `role="radio"`, `aria-checked` and a `radiogroup` with a name. The per-tier colours (`#FF9800`, `#1565C0`, `#DC143C` in `PROMOTION_TIERS[].color`) are dropped on web: the selected card takes `--accent`, and each tier keeps a Tabler icon (`IconStar`, `IconSpeakerphone`, `IconPin`). `PROMOTION_TIERS[].color` stays as mobile's source, as `MARKETPLACE_CATEGORIES[].color` did in 8a.
6. **Duration is one `NumberInput`** with `min`, `max`, `clampBehavior="strict"` and its own controls, replacing the −/input/+ trio. Arrow Up/Down step it from the keyboard.
7. **Each step has Back and Continue at its foot, and focus moves to the new step's `h2`** (`tabIndex={-1}`) when the step changes, so a keyboard or screen-reader user lands on the step they just opened rather than on a button that no longer exists. The page `h1` is "Promote listing" via `PageHeader`, whose back link goes to My Listings. Step 1's Back leaves the wizard for My Listings (it was `router.back()`, which could leave the site on a direct visit).
8. **Pay stays busy once checkout has a URL** (inventory 6). It is only released on failure. While busy it takes `aria-disabled` / `data-disabled` with a `Loader` in `leftSection`, not Mantine's `loading` — the "busy controls stay focusable" rule 8a's keyboard walk enforced.
9. **The step indicator is an `<ol aria-label="Progress">`** with `aria-current="step"` on the current step and a visually hidden "completed" on earlier ones. Not Mantine's `Stepper`, whose steps render as buttons that this wizard must not let a member click past.

## PR 8b — Task breakdown

### Task 8b.1: `getListingsByOwner` returns `hasMore`

**Files:** modify `packages/shared/src/api/marketplace.ts` (304–329) and its test.

```ts
// Signature unchanged; the result now always carries hasMore.
export async function getListingsByOwner(
  supabase: SupabaseClient,
  ownerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ListingsResult>; // { data, hasMore: data.length === limit } | { error }
```

- [ ] **Step 1: Write the failing test.** A full page (`limit` rows) returns `hasMore: true`; a short page returns `hasMore: false`; `range(offset, offset + limit - 1)` is called with the offset passed in; an error returns `{ error }` with no `hasMore`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=packages/shared -- src/api/marketplace.test.ts`
- [ ] **Step 3: Implement.** `const rows = (data || []) as MarketplaceListing[]; return { data: rows, hasMore: rows.length === limit };`
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(shared): report hasMore from getListingsByOwner`.

### Task 8b.2: `ListingSummaryRow` takes a `menu`

**Files:** modify `apps/web/src/components/marketplace/ListingSummaryRow.tsx` and its test.

```ts
export interface ListingSummaryRowProps {
  listing: MarketplaceListing;
  owner?: { now: Date };
  /** Beside the row, above the link's overlay — passed straight to SummaryRow's `menu`. */
  menu?: ReactNode;
}
```

- [ ] **Step 1: Write the failing test.** With `menu={<button type="button">Row menu</button>}` the button renders and is not inside the title link (`within(getByRole('link', { name: title })).queryByRole('button')` is null). Without it, no extra button renders.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/marketplace/ListingSummaryRow.test.tsx`
- [ ] **Step 3: Implement** — forward `menu` to `<SummaryRow menu={menu}>`.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): let ListingSummaryRow carry a row menu`.

### Task 8b.3: `useMyListings`

**Files:** create `apps/web/src/hooks/useMyListings.ts` and `useMyListings.test.ts`.

```ts
export const MY_LISTINGS_PAGE_SIZE = 20;

export type ListingAction = 'deactivate' | 'reactivate' | 'refresh' | 'delete';

export interface MyListingsState {
  listings: MarketplaceListing[];
  loading: boolean;
  /** The first page failed. Rows are empty, never stale. */
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retryLoadMore: () => void;
  reload: () => void;
  /** Ids with an action in flight, so their menus can disable. */
  pendingIds: ReadonlySet<string>;
  /** Runs the API call, then patches or drops the row. Resolves false on failure, row untouched. */
  runAction: (id: string, action: ListingAction) => Promise<boolean>;
}

export function useMyListings(userId: string | null, now: () => Date = () => new Date()): MyListingsState;
```

- [ ] **Step 1: Write the failing test.** Each test sets its own mocks in `beforeEach` (PR 7's chunk 2 lesson).
  - First load calls `getListingsByOwner(supabase, userId, 20, 0)`; a failure sets `error` and leaves `listings` empty and `hasMore` false.
  - `loadMore` requests offset 20; a failure sets `loadMoreError` and keeps the loaded rows; `retryLoadMore` clears it and asks again.
  - `deactivate` success sets that row's `status` to `'inactive'` and does **not** call `getListingsByOwner` again.
  - `reactivate` success sets `status: 'active'` and `refreshed_at` to the injected `now()`; `refresh` success sets only `refreshed_at`.
  - `delete` success drops the row, and the next `loadMore` asks for offset 19, not 20 (decision 2).
  - Any action's `{ error }` resolves `false` and leaves the row deep-equal to before.
  - `pendingIds` holds the id while the call is in flight and not after.
  - A changed `userId` resets the rows, and a page that lands after the change is dropped (the generation guard).
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useMyListings.test.ts`
- [ ] **Step 3: Implement**, modelled on `useMarketplaceFeed`: state resets during render on `userId` change, a generation ref drops late pages, rows are replaced immutably (`listings.map((l) => (l.id === id ? { ...l, ...patch } : l))`), and a `deletedCount` counter feeds the offset.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useMyListings`.

### Task 8b.4: `MyListingActions`

**Files:** create `apps/web/src/components/marketplace/MyListingActions.tsx` and `MyListingActions.test.tsx`.

```ts
export interface MyListingActionsProps {
  listing: MarketplaceListing;
  pending: boolean;
  onAction: (id: string, action: ListingAction) => Promise<boolean>;
}
```

It renders an `ActionMenu` labelled `Actions for ${listing.title}` with decision 3's items. Deactivate asks `useConfirm` ("Deactivate this listing?" / "It will be hidden from the marketplace until you reactivate it.", confirm "Deactivate"); Delete asks with `danger: true` ("Delete this listing?" / "This can't be undone.", confirm "Delete"). After the action resolves it calls `notify.success` ("Listing deactivated", "Listing reactivated", "Listing refreshed", "Listing deleted") or `notify.error` ("Couldn't <verb> this listing. Please try again.").

- [ ] **Step 1: Write the failing test** with real Mantine (no `@mantine/core` mock) inside the test-utils provider, opening the menu by its name.
  - An active listing shows Edit, Promote, Refresh, Deactivate, Delete; an inactive one shows Edit, Reactivate, Delete.
  - Edit links to `/marketplace/create?edit=<id>`; Promote to `/marketplace/listing/promote/<id>`.
  - Deactivate opens a dialog; Cancel does not call `onAction`, Confirm calls it with `'deactivate'`.
  - Delete's dialog starts focus on Cancel (the `danger` behaviour) and confirms with `'delete'`.
  - Reactivate and Refresh call `onAction` without a dialog.
  - `onAction` resolving `false` shows the error toast text; `true` shows the success text.
  - `pending` disables every item.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/marketplace/MyListingActions.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add MyListingActions`.

### Task 8b.5: Rebuild my-listings and delete `marketplace.module.css`

**Files:** modify `apps/web/src/pages/marketplace/my-listings.page.tsx` and `my-listings.test.tsx`; create `myListings.module.css`; delete `marketplace.module.css`; modify both allowlists.

The page becomes: `PageHeader` (title "My Listings", back link "Marketplace" to `/marketplace`, action `<Button component={Link} href="/marketplace/create">Create listing</Button>`), then `LoadingState` / `ErrorState` with retry / `EmptyState` ("You haven't listed anything yet", action "Create your first listing" as `Button component={Link}`) / a `<ul>` of `ListingSummaryRow owner={{ now }} menu={<MyListingActions …/>}` with a `useInfiniteScroll` sentinel and a load-more error line with retry. About 110 lines.

`myListings.module.css` holds only the page width (`--layout-content-width`), the list gap and the load-more footer, on tokens.

- [ ] **Step 1: Rewrite the page test** against the new page, with real Mantine and no `Button` mock (recon 12):
  - the `h1` "My Listings"; a loading state; an error with a working retry; the empty state's link to `/marketplace/create`;
  - each row's title link and its "Actions for <title>" menu;
  - the expiry notice reads "Expires in 1 day" for a listing 89 days old (the "1 days" bug), via the fixed `now` from `useNow`;
  - a signed-out visitor is redirected to `/login`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/pages/marketplace/my-listings.test.tsx`
- [ ] **Step 3: Implement.** Delete `marketplace.module.css`, remove it from `scripts/guard-css-tokens.allowlist.json`, and remove `src/pages/marketplace/my-listings.page.tsx` from `apps/web/eslint/raw-element-allowlist.mjs`.
- [ ] **Step 4: Run and watch it pass**, then `npm run lint:guards` and `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `refactor(web): rebuild my listings on the design system`.

**Chunk 1 gate.** `type-check`, `lint`, `lint:guards`, then `npm run test --workspace=packages/shared` and `--workspace=apps/web`. Review the diff `<chunk start>..HEAD`, fix CRITICAL and HIGH in one commit, route the rest, push, and record the chunk in the tracker with the page's before and after line counts.

### Task 8b.6: `getPromotionBlocker`

**Files:** create `packages/shared/src/logic/marketplace/promotion.ts` and `promotion.test.ts`; export from `logic/marketplace/index.ts`.

```ts
export type PromotionBlocker = 'not_owner' | 'inactive' | 'unverified';

/** Why this viewer can't promote this listing, or null when they can. Checked in the order above. */
export function getPromotionBlocker(
  listing: Pick<MarketplaceListing, 'owner_id' | 'status'>,
  viewer: { id: string; trust_level?: number | null }
): PromotionBlocker | null;

export const PROMOTION_BLOCKER_MESSAGES: Record<PromotionBlocker, { title: string; message: string }>;
```

Messages: `not_owner` — "You can only promote your own listings"; `inactive` — "Reactivate this listing to promote it" / "Inactive listings are hidden from the marketplace, so a promotion would reach no one."; `unverified` — "Verify your account to promote listings" / "Only verified members (Level 1 and above) can create promotions."

- [ ] **Step 1: Write the failing test.** Owner, active, Level 1 → `null`; another member's listing → `'not_owner'` even when it is also inactive and the viewer is Level 0 (order); owner + inactive → `'inactive'`; owner + active + Level 0 or `trust_level` null → `'unverified'`. It uses `TrustLevel.VERIFIED`, not a literal 1.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=packages/shared -- src/logic/marketplace/promotion.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(shared): add getPromotionBlocker`.

### Task 8b.7: `usePromoteWizard`

**Files:** create `apps/web/src/hooks/usePromoteWizard.ts` and `usePromoteWizard.test.ts`.

```ts
export type WizardStep = 1 | 2 | 3;

export interface PromoteWizardState {
  listing: MarketplaceListing | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => void;
  blocker: PromotionBlocker | null;
  step: WizardStep;
  tier: PromotionTierConfig | null;
  setTier: (tier: PromotionTierConfig) => void;
  days: number;
  /** Clamped to MIN/MAX_PROMOTION_DAYS; a non-number becomes MIN. */
  setDays: (value: number | string) => void;
  totalCents: number;
  endDate: Date;
  next: () => void;
  back: () => void;
  paying: boolean;
  payError: string | null;
  pay: () => Promise<void>;
}

export function usePromoteWizard(
  listingId: string | undefined,
  viewer: { id: string; trust_level?: number | null } | null,
  redirect: (url: string) => void = (url) => window.location.assign(url)
): PromoteWizardState;
```

The listing read uses `getListingById` (not `useListingDetail`, which counts a view). `ListingResult.notFound` separates gone from failed, as 8a made it do. `SUPABASE_URL` / `SUPABASE_ANON_KEY` move with `handlePay` from the page.

- [ ] **Step 1: Write the failing test.**
  - A failed read sets `error`; `notFound` from the API sets `notFound`; neither leaves a listing behind.
  - `blocker` comes from `getPromotionBlocker` once the listing loads, and is `null` while loading.
  - `next` from step 1 is a no-op without a tier; `back` never goes below 1.
  - `setDays('')` → 1, `setDays(500)` → 90, `setDays(0)` → 1; `totalCents` is `tier.daily_cost_cents * days`.
  - `pay` with no session sets "Please sign in again to continue." and clears `paying`.
  - `pay` with a checkout error sets `payError` to its message and clears `paying`.
  - `pay` with a `checkoutUrl` calls `redirect` with it and **leaves `paying` true** (decision 8); a second `pay` while `paying` does not call `createPromotionCheckout` again.
  - A thrown error sets "Something went wrong. Please try again."
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/usePromoteWizard.test.ts`
- [ ] **Step 3: Implement.** Guard double-pay with a ref, not state, so two clicks in one frame cannot both pass.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add usePromoteWizard`.

### Task 8b.8: `PromotionTierPicker`

**Files:** create `apps/web/src/components/marketplace/promote/PromotionTierPicker.tsx`, `.module.css` and `.test.tsx`.

```ts
export interface PromotionTierPickerProps {
  tiers: PromotionTierConfig[];
  value: PromotionTierConfig['type'] | null;
  onChange: (tier: PromotionTierConfig) => void;
}
```

A `Radio.Group` labelled "Promotion type" holding one `Radio.Card` per tier: `Radio.Indicator`, the Tabler icon (`aria-hidden`), name, "$1.99/day" via `formatCurrency`, description and the benefit list. The card's accessible name is the tier name; the price and description are its description (`aria-describedby`), so a screen reader hears "Featured Listing, radio, not checked, 1 of 3" first.

- [ ] **Step 1: Write the failing test** with real Mantine: a `radiogroup` named "Promotion type" with three `radio`s named by tier; clicking one calls `onChange` with that tier; `value` sets `aria-checked="true"` on exactly one; Space on a focused card selects it; arrow keys move between cards. **If Mantine's `Radio.Card` does not move on arrow keys, add a roving `onKeyDown` on the group and keep the test** — the APG radio pattern requires it.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/marketplace/promote/PromotionTierPicker.test.tsx`
- [ ] **Step 3: Implement.** Selected card: `border-color: var(--accent)` and `background: var(--accent-tint)`, keyed off `[data-checked]` on the card element, which is the component's own styling hook.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add PromotionTierPicker`.

### Task 8b.9: `PromotionDurationStep` and `PromotionReview`

**Files:** create `apps/web/src/components/marketplace/promote/{PromotionDurationStep,PromotionReview}.tsx`, one shared `promoteSummary.module.css`, and a test for each.

```ts
export interface PromotionDurationStepProps {
  tier: PromotionTierConfig;
  days: number;
  onDaysChange: (value: number | string) => void;
  totalCents: number;
  endDate: Date;
}

export interface PromotionReviewProps {
  listing: Pick<MarketplaceListing, 'title' | 'price'>;
  tier: PromotionTierConfig;
  days: number;
  startDate: Date;
  endDate: Date;
  totalCents: number;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
}
```

Both summaries are a `<dl>` (Daily rate / Duration / Total cost / Ends on; Promotion / Duration / Start date / End date / Total), so a screen reader pairs each value with its label. Duration uses `pluralize(days, 'day')`. `PromotionReview`'s Pay button reads "Pay $13.93", and while `paying` reads "Processing…" with `aria-disabled`, `data-disabled` and a `Loader` in `leftSection` (decision 8). `payError` renders in an `Alert` with `role="alert"`.

- [ ] **Step 1: Write the failing tests.**
  - Duration: a `spinbutton` named "Duration in days" with `aria-valuemin` 1 and `aria-valuemax` 90; typing calls `onDaysChange`; the summary reads "1 day" for 1 and "7 days" for 7; the total and end date are the formatted props.
  - Review: the `term` and `definition` roles come in matching order (`getAllByRole('term')[i]` names the value in `getAllByRole('definition')[i]`), so each value sits under its label; Pay calls `onPay`; while `paying` the button stays focusable, has `aria-disabled="true"`, and a click does not call `onPay`; `payError` shows as an alert.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/marketplace/promote`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(web): add the promotion duration and review steps`.

### Task 8b.10: Rebuild the promote wizard and rewrite `promote.module.css`

**Files:** create `apps/web/src/components/marketplace/promote/PromoteSteps.tsx` (+ test, + `.module.css`); modify `apps/web/src/pages/marketplace/listing/promote/[id].page.tsx` and `[id].test.tsx`; rewrite `apps/web/src/pages/marketplace/listing/promote.module.css`; modify both allowlists.

```ts
export interface PromoteStepsProps {
  labels: readonly string[]; // ['Type', 'Duration', 'Review & pay']
  current: number;           // 1-based
}
```

The page keys a `PromoteWizardView` by listing id (the 8a / PR 7 pattern), then renders: `PageHeader` ("Promote listing", back link "My Listings"); `LoadingState`; `ErrorState` with retry; `EmptyState` for not found; `EmptyState` from `PROMOTION_BLOCKER_MESSAGES` for a blocker (decision 4); otherwise `PromoteSteps`, the step's `h2` (focused on step change, decision 7), the step body, and a Back / Continue row. About 150 lines.

`promote.module.css` is written fresh with only the page width, the step `h2`, and the Back / Continue row, plus the success page's classes from Task 8b.11. Every value is a token.

- [ ] **Step 1: Write the failing tests.**
  - `PromoteSteps`: an ordered list named "Progress"; `aria-current="step"` on the current item only; earlier items carry the text "completed".
  - Page, with real Mantine: the `h1`; each blocker renders its title and a link to `/marketplace/my-listings`, and **no** radiogroup; Continue on step 1 is disabled until a tier is chosen; choosing a tier and continuing moves focus to the "Set duration" heading; Back on step 2 returns to step 1 with the tier still checked; Back on step 1 is a link to My Listings; step 3 shows the review and the Pay button.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- "src/pages/marketplace/listing/promote/\[id\].test.tsx" src/components/marketplace/promote/PromoteSteps.test.tsx`
- [ ] **Step 3: Implement.** Remove `src/pages/marketplace/listing/promote/[id].page.tsx` from `raw-element-allowlist.mjs`. `promote.module.css` stays on the guard allowlist until Task 8b.11 moves the success page onto it.
- [ ] **Step 4: Run and watch them pass**, then `npm run lint --workspace=apps/web`.
- [ ] **Step 5: Commit** as `refactor(web): rebuild the promote wizard on the design system`.

### Task 8b.11: Move the success page onto the design system

**Files:** modify `apps/web/src/pages/marketplace/listing/promote/success.page.tsx` and `success.test.tsx`; `promote.module.css`; `scripts/guard-css-tokens.allowlist.json`.

Behaviour stays exactly as PR #87 left it — the polling, the retry and the four headings. Only the markup moves: the ✅ / ⏳ emoji become `IconCircleCheck` / `IconHourglass` (`aria-hidden`), the "Processing..." text becomes a Mantine `Loader` with `aria-label="Processing payment"`, and both links become `Button component={Link}`.

- [ ] **Step 1: Update the test.** Keep every existing behavioural case; change only the queries the markup moves (the loader by its label, the links by role and name). It must still pass unchanged on the four headings and the retry.
- [ ] **Step 2: Run and watch it fail** on the new queries. `npm run test --workspace=apps/web -- src/pages/marketplace/listing/promote/success.test.tsx`
- [ ] **Step 3: Implement.** Add the success classes to `promote.module.css` on tokens, then remove `promote.module.css` from `scripts/guard-css-tokens.allowlist.json`.
- [ ] **Step 4: Run and watch it pass**, then `npm run lint:guards`.
- [ ] **Step 5: Commit** as `refactor(web): move the promotion success page onto tokens`.

**Chunk 2 gate.** As chunk 1. Record the wizard's before and after line counts and `promote.module.css`'s (841 → the rewrite).

### Task 8b.12: E2E, keyboard, docs and the PR

**Files:** `apps/web/e2e/tests/11-marketplace.spec.ts`; `docs/architecture/web-ui-system.md`; `docs/product/features/marketplace.md`.

- [ ] **Step 1: Rewrite the my-listings e2e** (inventory 7): open "Actions for <title>", choose Deactivate, confirm in the dialog, and assert the row's status reads Inactive; reactivate from the menu with no dialog; delete, confirm, and assert the title is gone. Check `01-unauthenticated.spec.ts`'s redirect still passes.
- [ ] **Step 2: Add a promote e2e** if the fixtures can serve the owner's listing: the wizard reaches step 3 with a tier chosen by keyboard. Stop before Pay — it leaves for Stripe.
- [ ] **Step 3: Run the e2e suite.** `npm run test:e2e:web`
- [ ] **Step 4: Update the docs.** Add `MyListingActions`, `PromoteSteps`, `PromotionTierPicker`, `PromotionDurationStep` and `PromotionReview` to `web-ui-system.md`. In `marketplace.md`, describe the row menu, paging, and the wizard's up-front refusal (decision 4).
- [ ] **Step 5: Run the full gate.** `npm run lint`, `lint:guards`, `type-check`, `test`, `test:e2e:web`, `test:visual:web` and `docs:check`. `a11y-baseline.json` must still be `{}`.
- [ ] **Step 6: Walk the keyboard.**
  - my-listings: Tab reaches each title link then its menu; Enter opens the menu, arrows move, Escape returns focus to the trigger; Delete's dialog opens on Cancel; after a delete, focus is not stranded on `<body>`.
  - The wizard: arrows move between tier cards and Space selects; Continue moves focus to the next heading; Arrow Up/Down change the duration; Pay while busy keeps focus.
  - At 375px: the page header and the Back / Continue row wrap rather than overflow.
- [ ] **Step 7: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then `gh pr edit <number> --add-reviewer @copilot`. Update the tracker row to `In Review (PR #NN)`.

## PR 9 — Messages, notifications, moderation (`feat/web-ui-messaging`)

The scope as written before the recon:

- **Pages:** `pages/messages/index.page.tsx`, `pages/messages/[id].page.tsx`, `pages/notifications.page.tsx`, `pages/profile/notifications.page.tsx`, `pages/moderation.page.tsx`.
- **CSS:** `styles/Messages.module.css`, `Notifications.module.css`, `NotificationPreferences.module.css`, `Moderation.module.css`.
- **Messages:** the avatar menus use `UserMenuTrigger`, replacing the manual `mousedown` listeners at messages/index 49 and messages/[id] 100.
- **Notifications:** adopt `NotificationItem` on the page, removing its `timeAgo` copy and the `<li onClick>` at ~252. Keep "Load more" or switch to `useInfiniteScroll`, and record which in the breakdown.
- **Also:** replace native dialogs in both messages pages and moderation. The moderation queue uses `EmptyState`, `LoadingState` and `ActionMenu`.

## PR 9 — split into 9a and 9b (2026-09-23)

The area is five pages (1,349 lines) and four stylesheets (837 lines, 188 guard violations), and the recon below found more real bugs than any area since PR 4. It is now two PRs, on the seam between chat and everything else:

- **9a — messages.** Both messages pages, `Messages.module.css`, the shared `getMessages` fix, and one `useStartConversation` hook adopted by the five pages that start a chat — which is how listing detail's dead "Contact seller" gets fixed. Owns the `messages` visual page.
- **9b — notifications, preferences and moderation.** Three pages and three stylesheets. Owns the `notifications` visual page. Its breakdown is written when it starts, from the recon kept below.

They share no files, so 9b branches from `master` after 9a merges.

## PR 9 recon

Run on `feat/web-ui-messaging` at `e59513a` (the "Starting an area PR" commands), 2026-09-23.

| File | Lines | CSS guard | `confirm(`/`alert(` | Raw elements |
|---|---|---|---|---|
| `pages/messages/index.page.tsx` | 153 | — | 1 (108) | 0 |
| `pages/messages/[id].page.tsx` | 336 | — | 1 (221) | 1 (315) |
| `pages/notifications.page.tsx` | 302 | — | 0 | 0 |
| `pages/profile/notifications.page.tsx` | 203 | — | 0 | 2 (117, 157) |
| `pages/moderation.page.tsx` | 355 | — | 1 (156) | 0 |
| `styles/Messages.module.css` | 293 | **74** | — | — |
| `styles/Notifications.module.css` | 214 | **45** | — | — |
| `styles/NotificationPreferences.module.css` | 164 | **31** | — | — |
| `styles/Moderation.module.css` | 166 | **38** | — | — |

`a11y-baseline.json` is already `{}`. `pages.ts` screenshots `messages` and `notifications` (list pages only), so each half re-baselines one page at both widths.

**Messages (9a):**

1. **A thread shows its oldest 100 messages, not its newest.** `getMessages` orders by `timestamp` ascending and then applies `limit`, so the 101st message and everything after it never appears. Mobile calls it with the default 50, so on mobile the cut is at 50.
2. **"Contact seller" is a dead end.** Listing detail (`listing/[id].page.tsx:62`) pushes `/messages?to=<owner id>`, and nothing reads `to`: the member lands on their inbox with no new conversation. `11-marketplace.spec.ts:67` asserts that URL, so the test pins the bug.
3. **Five pages start a chat, five ways.** Feed (`feed.page.tsx:416`), post detail (`posts/[id].page.tsx:317`), event detail (`events/[id].page.tsx:90`), public profile (`users/[id].page.tsx:172`) and listing detail each call `getOrCreateConversation` by hand. Feed and post detail drop a failure silently. Event detail and the public profile report it, with two different sentences. Only those two guard a double click.
4. **"View Profile" says profiles don't exist.** Both avatar menus `alert()` "User profiles will be available in a future update." Public profiles shipped in PR 6, and `ConversationWithParticipant` already carries `other_user_id`, so `UserMenuTrigger`'s View profile link works as-is.
5. **A failed load looks like an empty inbox.** `getConversations` returning `{ error }` stops the spinner and shows "No messages yet".
6. **A failed send says nothing.** `handleSend` only acts on success; on failure the text stays and the button re-enables, with no message.
7. **A conversation the viewer isn't in still opens.** A mistyped id, or one with a member they have blocked (which `getConversations` filters out), renders the header "Conversation", "No messages yet. Say hello!" and a working composer. Sending then fails on RLS, silently (6).
8. **`--nav-height` does not exist.** `.threadPage`'s `height: calc(100vh - var(--nav-height) - …)` is invalid, so the height falls back to `auto`: the list never scrolls on its own, the composer is not pinned, and `scrollIntoView` scrolls the window. This is the undefined-custom-property class PR 10's guard is for.
9. **Every message avatar opens the header's menu.** The in-thread avatars call the same `handleAvatarPress`, so clicking one toggles a dropdown in the header, and each message group adds a tab stop labelled "User options".
10. **The thread has no `h1`.** The name is a `span`. The composer is a raw `<input>` with only a placeholder for a label. Send is an "↑" glyph. Read receipts read aloud as "check mark check mark". Incoming messages are not announced.
11. **An unread count is a bare number.** The list's `Badge` reads "3" with nothing saying what it counts.
12. **Chat shows full names.** `conversation_participants.name` holds the full name given when the conversation began, and both pages print it, where every other web surface shows `formatPublicName` ("Bikal S.").
13. **The thread's effect depends on the `user` object**, not `user.id`, so any `AuthContext` refresh (a profile save, a token refresh that re-reads the row) reloads the messages and re-subscribes.
14. **The day-label logic exists four times:** `[id].page.tsx:126`, `notifications.page.tsx:30`, and mobile's `MessageThreadScreen.tsx:291` and `NotificationsScreen.tsx:48`.
15. **The thread loads the whole inbox to find one participant.** `getConversations` is five queries. It stays: the same call answers "is the viewer in this conversation, and not blocked" (7), which a single-row read would have to repeat.

**Notifications, preferences and moderation (9b):**

16. **Preferences can overwrite real settings with defaults.** When `getUserSettings` fails, the page shows `DEFAULT_SETTINGS`, and Save writes them over whatever the member had.
17. **None of the preference switches has a name.** Each `Switch` sits beside a `span` with no `label` or `aria-label` joining them. The two radio groups are raw `<input type="radio">`s with no group label.
18. **Save drops focus.** It uses Mantine's `loading`, and "✓ Saved" swaps the label for three seconds on a `setTimeout` that is never cleared.
19. **The notifications page accepts chat notifications from realtime.** Its INSERT handler keeps `type: 'message'` rows, which `getNotifications` and `getUnreadNotificationCount` exclude, so one appears, bumps the count, and vanishes on reload. `useNotificationsFeed` already guards this for the bell.
20. **Paging drifts.** "Load more" asks for `page * 20`, but realtime inserts push rows down (duplicates) and deletes pull them up (a skipped row). 8b's rule applies: the offset is the rows on screen.
21. **Mark read, mark all read, delete and load more all fail silently.** Delete logs to the console; the others don't check their result. Deleting an unread notification doesn't lower the count.
22. **The row is an `<li onClick>`** with a nested `CloseButton` labelled "Dismiss notification". `NotificationItem` (PR 2) replaces both and says "Delete notification".
23. **The bell goes stale on `/notifications`.** `Layout` turns the bell's polling off there, and nothing reloads it when polling comes back on, so after "Mark all as read" the bell keeps its old count for up to 30 seconds after leaving.
24. **The moderation queue reads a failed load as an empty one.** It shows a toast, then "No posts waiting for review." and "No open reports." A failed `getPostsByIds` turns every reported post into "Post no longer available".
25. **Moderation busy states drop focus.** Approve uses `loading`, and every other button gets native `disabled` while any action runs. The acted-on card then unmounts, so focus needs the 8b treatment.
26. **Remove and Remove post have no confirmation**; only Ban does, through `window.confirm`.
27. **Headings carry emoji.** "🔔 Notifications", "⚙️ Notification Preferences" and the "🛡️ Emergency Alerts" group heading all put the emoji into the accessible name, and the unread `Badge` sits inside the `h1`.

## PR 9a — Messages (`feat/web-ui-messaging`)

**Branch:** `feat/web-ui-messaging`, created from `master` at `e59513a` (PR #89 merged).

| File | Change | Why |
|---|---|---|
| `packages/shared/src/api/messages.ts` (+ test) | Modify | `getMessages` returns the newest `limit` (recon 1) |
| `packages/shared/src/utils/date.ts` (+ test) | Modify | `formatDayLabel`, one day label for web and mobile (recon 14) |
| `packages/shared/src/logic/chat.ts` (+ test, + `logic/index.ts`) | Create | `buildThreadDays`: day groups and sender runs |
| `apps/web/src/hooks/useStartConversation.ts` (+ test) | Create | One way to start a chat (recon 2, 3) |
| `apps/web/src/pages/{feed,posts/[id],events/[id],users/[id],marketplace/listing/[id]}.page.tsx` (+ tests) | Modify | Adopt the hook |
| `apps/web/src/components/users/UserMenuTrigger.tsx` (+ test) | Modify | An optional `toneKey`, passed to `Avatar` |
| `apps/web/src/hooks/useConversations.ts` (+ test) | Create | The inbox's load, error and reload |
| `apps/web/src/hooks/useMessageThread.ts` (+ test) | Create | Thread load, not-found, realtime and send |
| `apps/web/src/components/messages/{ConversationRow,ThreadHeader,MessageLog,MessageComposer}.tsx` + tests + `.module.css` | Create | Extracted from the two pages |
| `apps/web/src/pages/messages/{index,[id]}.page.tsx` (+ tests), `messages.module.css` | Rewrite / create | The pages over the hooks and components |
| `apps/web/src/styles/Messages.module.css` | Delete | Both consumers move off it |
| `scripts/guard-css-tokens.allowlist.json`, `apps/web/eslint/raw-element-allowlist.mjs` | Modify | `Messages.module.css` off the first, `messages/[id]` off the second |

**How this PR runs.** Three chunks, as PR 8b ran. Inside a chunk each task writes its failing test, runs only that task's tests, implements, re-runs and commits, with no review between tasks. At each chunk boundary: `type-check`, `lint`, `lint:guards`, the full unit suite of every workspace touched (web Vitest must run from a `C:\…` cwd), then one code-review agent over the chunk's whole diff, CRITICAL and HIGH fixed in one `fix(web): address chunk N review` commit, everything else routed to PR 10's list or the tracker — **never to new tasks**. e2e and the `messages` baseline run only in chunk 3.

| Chunk | Tasks | Ends with |
|---|---|---|
| 1. Shared + hooks | 9a.1–9a.6 | `getMessages` fixed, the shared helpers, `useStartConversation` adopted by five pages, `useConversations` and `useMessageThread` |
| 2. Pages | 9a.7–9a.11 | Both pages rebuilt, `Messages.module.css` deleted, `messages/[id]` off the raw-element allowlist |
| 3. Finish | 9a.12 | e2e, the `messages` re-baseline, keyboard walk, docs and the draft PR |

**Decisions this breakdown locks in:**

1. **`getMessages(supabase, id, limit)` returns the newest `limit` messages, oldest first**: `order('timestamp', { ascending: false }).limit(limit)`, then reversed. Web asks for 100, mobile keeps its 50. Loading earlier messages is not in scope; a thread longer than 100 shows its latest 100, which is what a member opening a chat wants.
2. **One `useStartConversation()` hook**, returning `{ start(partner), starting }`. It sends a signed-out viewer to `/login`, ignores the viewer's own id and a second press while one is in flight, pushes `/messages/<id>` on success, and on failure says "Couldn't start a conversation. Please try again." with `notify.error`. A result that lands after unmount is dropped. `starting` stays set after a success, until navigation unmounts the caller. Callers that render a button show `starting` with `aria-disabled` and a `Loader` (the busy-controls rule). Listing detail passes its `incrementListingContacts` call as `start`'s `beforeStart`, which runs inside the double-press guard, and `?to=` goes away.
3. **Chat shows public names** (recon 12): `formatPublicName(other_user_name)` in the list, the header, the `h1` and the composer's label. `UserMenuTrigger` gains an optional `toneKey`, and chat passes the full name there, so a member's avatar keeps the colour it has on posts.
4. **One avatar menu per thread**, in the header: `UserMenuTrigger` with View profile only (no Chat item — you are in it). The avatars beside message groups become `decorative` and are not buttons (recon 9). The list row keeps its own `UserMenuTrigger`; the rest of the row is the link to the thread.
5. **The window scrolls; the composer is sticky** (recon 8). No fixed-height thread: the composer is `position: sticky` at `bottom: 0`. A thread is a task route (`navItems.ts`), so there is no phone tab bar to clear. The page scrolls to its end — `window.scrollTo` to the document's height, not the last bubble into view, which would leave the sticky composer over it — on first load, and on a new message when the viewer sent it or was already within 120px of the bottom; a member reading back is not yanked down by an incoming message. (Chunk 2's review corrected this decision: it first lifted the composer above a tab bar the route doesn't have, and scrolled a sentinel into view, which stopped ~130px short of the end and so stopped following. It also found sticky never worked anywhere on the site — see the tracker.)
6. **The messages are a `role="log"` region** named `Messages with {name}`, so new ones are announced politely. Each day is a `section` with an `h2` day label ("Today", "Yesterday", "Mar 5", "Mar 5, 2025"). Read receipts are icons with a visually hidden "Sent" or "Read".
7. **The composer is a `TextInput`** labelled `Message {name}` (visually hidden) in a `form`; Enter sends. Send is an `ActionIcon` with `IconSend`, named "Send message": native `disabled` while the field is blank (a state the member didn't just cause by pressing it), `aria-disabled` while sending. After a send succeeds the text clears and focus returns to the field, so the button's switch to disabled never strands focus. After a failure the text stays and `notify.error` says "Couldn't send your message. Please try again."
8. **A conversation the viewer can't see renders `EmptyState`** "Conversation not found" / "It may have been removed, or you may not have access to it." with a link back to Messages, and no composer (recon 7). `notFound` means `getConversations` succeeded without this id; a failed `getConversations` is an error with a retry, not a not-found.
9. **The inbox is not paged.** `getConversations` has no `limit`/`offset`, and a member's conversation count is small, so there is no `useInfiniteScroll` here. This is the one definition-of-done item 9a does not meet, on purpose.
10. **The unread count is part of the row's name**: the badge shows the number, and a visually hidden " unread" follows it, so the link reads "Bikal S. … 3 unread".

## PR 9a — Task breakdown

### Task 9a.1: `getMessages` returns the newest messages

**Files:** modify `packages/shared/src/api/messages.ts` (8–30) and `messages.test.ts`.

```ts
/** The newest `limit` messages of a conversation, oldest first. */
export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 50
): Promise<{ data?: ChatMessage[]; error?: Error }>;
```

- [ ] **Step 1: Write the failing test.** The query calls `order('timestamp', { ascending: false })` then `limit(limit)`; rows returned newest-first (`[m3, m2, m1]`) come back as `[m1, m2, m3]`; an error returns `{ error }`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=packages/shared -- src/api/messages.test.ts`
- [ ] **Step 3: Implement.** `return { data: ((data || []) as ChatMessage[]).slice().reverse() };`
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `fix(shared): load a conversation's newest messages`.

### Task 9a.2: `formatDayLabel` and `buildThreadDays`

**Files:** modify `packages/shared/src/utils/date.ts` and `date.test.ts`; create `packages/shared/src/logic/chat.ts` and `chat.test.ts`; export from `logic/index.ts`.

```ts
// utils/date.ts — local calendar days.
/** "Today", "Yesterday", "Mar 5" this year, "Mar 5, 2025" otherwise. */
export function formatDayLabel(date: Date, now: Date = new Date()): string;

// logic/chat.ts
export interface ThreadMessage {
  message: ChatMessage;
  isOwn: boolean;
  /** Last message of a run from one sender within the day; the received run shows its avatar here. */
  endsRun: boolean;
}
export interface ThreadDay {
  /** `toDateString()` of the day, stable as a React key. */
  key: string;
  /** Timestamp of the day's first message, for formatDayLabel. */
  timestamp: string;
  messages: ThreadMessage[];
}
export function buildThreadDays(messages: ChatMessage[], viewerId: string): ThreadDay[];
```

- [ ] **Step 1: Write the failing tests.**
  - `formatDayLabel`: the same day → "Today"; the day before → "Yesterday", including across a month boundary (`now` = 1 March, date = 28 February); earlier this year → "Mar 5"; last year → "Mar 5, 2025". Build dates with `new Date(y, m, d, h)` so the test is timezone-safe.
  - `buildThreadDays`: `[]` → `[]`; three messages on two days → two days, in order; `isOwn` follows `viewerId`; within a day, A A B A marks `endsRun` on the 2nd, 3rd and 4th; a run that crosses midnight ends at the day boundary.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=packages/shared -- src/utils/date.test.ts src/logic/chat.test.ts`
- [ ] **Step 3: Implement.** Compare `new Date(y, m, d)` midnights for the day label; `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`, adding `year: 'numeric'` when the year differs from `now`'s. `buildThreadDays` is one pass that starts a new day when `toDateString()` changes and sets `endsRun` when the next message is on another day, from another sender, or absent.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(shared): add formatDayLabel and buildThreadDays`.

### Task 9a.3: `useStartConversation`

**Files:** create `apps/web/src/hooks/useStartConversation.ts` and `useStartConversation.test.ts`.

```ts
export interface ConversationPartner {
  id: string;
  /** Full name; stored on the conversation as the participant's name. */
  name: string;
}

export interface StartConversation {
  start: (partner: ConversationPartner) => Promise<void>;
  starting: boolean;
}

export function useStartConversation(): StartConversation;
```

It reads the viewer from `useAuth()` and the router from `useRouter()`.

- [ ] **Step 1: Write the failing test** (mock `useAuth`, `next/router`, `getOrCreateConversation`, and `notify`).
  - Success calls `getOrCreateConversation(supabase, viewer.id, viewer.full_name, partner.id, partner.name)` and pushes `/messages/<conversationId>`.
  - `{ error }` calls `notify.error("Couldn't start a conversation. Please try again.")` and does not navigate.
  - With no viewer it pushes `/login` and makes no call.
  - The viewer's own id makes no call and no navigation.
  - A second `start` while the first is pending makes no second call; `starting` is true between them and false after.
  - A result that lands after unmount neither navigates nor toasts.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useStartConversation.test.ts`
- [ ] **Step 3: Implement** with a `startingRef` for the double-press guard (state alone lags a render) and a `mountedRef` for the unmount guard.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useStartConversation`.

### Task 9a.4: Adopt `useStartConversation` on the five pages

**Files:** modify `feed.page.tsx`, `posts/[id].page.tsx`, `events/[id].page.tsx`, `users/[id].page.tsx`, `marketplace/listing/[id].page.tsx`, and each page's test.

- [ ] **Step 1: Update the tests first.**
  - Listing detail: Contact seller calls `incrementListingContacts`, then `getOrCreateConversation` with the owner, then pushes `/messages/<id>`; it never pushes a URL containing `?to=` (recon 2).
  - Feed and post detail: a failed `getOrCreateConversation` now shows the toast (they were silent).
  - Event detail and the public profile: the failure toast is the hook's sentence. Their existing busy-button tests keep passing, now driven by `starting`.
- [ ] **Step 2: Run and watch the changed cases fail.** `npm run test --workspace=apps/web -- src/pages/feed.test.tsx src/pages/posts src/pages/events src/pages/users src/pages/marketplace/listing`
- [ ] **Step 3: Implement.** Delete each page's handler body in favour of `start({ id, name })`. Keep what is page-specific: post detail's `viewActiveRef` check goes (the hook's unmount guard covers it); event detail's `messaging` state and the public profile's `messagingLoading` become `starting`; listing detail awaits `incrementListingContacts` first. Drop `getOrCreateConversation` from each page's imports.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `fix(web): start every chat through useStartConversation`.

### Task 9a.5: `UserMenuTrigger` takes a `toneKey`, and `useConversations`

**Files:** modify `apps/web/src/components/users/UserMenuTrigger.tsx` and its test; create `apps/web/src/hooks/useConversations.ts` and `useConversations.test.ts`.

```ts
// UserMenuTrigger: one new optional prop, passed straight to Avatar.
toneKey?: string;

// useConversations
export interface ConversationsState {
  conversations: ConversationWithParticipant[];
  loading: boolean;
  /** The load failed. The list is empty, never stale. */
  error: string | null;
  reload: () => void;
}
export function useConversations(userId: string | null): ConversationsState;
```

- [ ] **Step 1: Write the failing tests.**
  - `UserMenuTrigger` with `toneKey` passes it to `Avatar` (mock `Avatar` and assert the prop).
  - `useConversations`: success fills the list; `{ error }` sets `error` to "Couldn't load your messages." and leaves the list empty (recon 5); `reload` clears the error, sets `loading` and asks again; a changed `userId` resets, and a response for the previous user is dropped; a null `userId` makes no call.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/users/UserMenuTrigger.test.tsx src/hooks/useConversations.test.ts`
- [ ] **Step 3: Implement** `useConversations` modelled on `useUserList`: a reload key in state, a `cancelled` flag in the effect, and state reset during render when `userId` changes.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(web): add useConversations and UserMenuTrigger's toneKey`.

### Task 9a.6: `useMessageThread`

**Files:** create `apps/web/src/hooks/useMessageThread.ts` and `useMessageThread.test.ts`.

```ts
export interface MessageThreadState {
  messages: ChatMessage[];
  /** From getConversations; null until found. */
  partner: ConversationWithParticipant | null;
  loading: boolean;
  error: string | null;
  /** getConversations succeeded and this id is not among them (decision 8). */
  notFound: boolean;
  reload: () => void;
  /** Resolves false on failure, leaving the messages as they were. */
  send: (text: string) => Promise<boolean>;
}

export const THREAD_MESSAGE_LIMIT = 100;

export function useMessageThread(conversationId: string | null, userId: string | null): MessageThreadState;
```

- [ ] **Step 1: Write the failing test.** Each test sets its mocks in `beforeEach`, and `subscribeToMessages` is mocked to capture its two callbacks.
  - It subscribes first, then calls `getMessages(supabase, id, 100)` and `getConversations(supabase, userId)` together; `partner` is the matching row; only then does it call `markAsRead(supabase, id, userId)`. A message delivered during the load is merged in, not lost. (The task first said to subscribe after the load; chunk 1's review found that loses a message sent in that window, which the old page did not.)
  - `getMessages` failing sets `error` "Couldn't load this conversation."; `getConversations` failing does the same, not `notFound`.
  - `getConversations` succeeding without the id sets `notFound`, leaves the channel, and does not call `markAsRead`.
  - An INSERT from the partner appends the message and calls `markAsRead`; one from the viewer appends without it; a duplicate id is ignored; an UPDATE replaces by id.
  - `send('  hi  ')` calls `sendMessage` with `'hi'` and appends the result, resolving true; `{ error }` resolves false and leaves `messages` unchanged; blank text resolves false with no call.
  - The effect keys on `userId`, not the user object: re-rendering with the same id does not reload or re-subscribe (recon 13). Unmount and a changed id call `removeChannel`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/hooks/useMessageThread.test.ts`
- [ ] **Step 3: Implement.** A generation ref drops late results after the id changes; reload bumps a key; the subscription is only made after the partner is found.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add useMessageThread`.

### Task 9a.7: `ConversationRow`

**Files:** create `apps/web/src/components/messages/ConversationRow.tsx`, `ConversationRow.module.css`, `ConversationRow.test.tsx`.

```ts
export interface ConversationRowProps {
  conversation: ConversationWithParticipant;
}
```

A `li`-ready row: `UserMenuTrigger` (public name, `toneKey` the full name, no `onChat`), then a `Link` to `/messages/<id>` holding the public name, the relative time (`formatRelativeTime`, omitted when `last_message_time` is null), the last message (or "No messages yet") and, when `unread_count > 0`, a `Badge` with the count plus a `VisuallyHidden` " unread". An unread row's preview is `--text-1` and semibold; a read one `--text-2`.

- [ ] **Step 1: Write the failing test** with real Mantine in the test-utils provider.
  - The link is named with the public name ("Bikal S.", not "Bikal Shrestha") and points at `/messages/<id>`.
  - Opening "Options for Bikal S." shows a View profile item linking to `/users/<other_user_id>`, and no Chat item.
  - `unread_count: 3` puts "3 unread" in the link's name; `0` renders no badge.
  - A null `last_message` shows "No messages yet".
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/messages/ConversationRow.test.tsx`
- [ ] **Step 3: Implement**, with the CSS on semantic tokens only (the guard runs on new files).
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add ConversationRow`.

### Task 9a.8: Rebuild the messages list

**Files:** rewrite `apps/web/src/pages/messages/index.page.tsx` and `index.test.tsx`; create `apps/web/src/pages/messages/messages.module.css`.

The page is `PageHeader` "Messages", then one of: `LoadingState` (label "Loading conversations…"); `ErrorState` with `useConversations().error` and Try again → `reload`; `EmptyState` "No messages yet" / "Start a conversation from a member's profile, a post or a listing." with `IconMessageCircle`; or a `ul` of `ConversationRow`s. The login redirect stays.

- [ ] **Step 1: Rewrite the test** over a mocked `useConversations`: each of the four states renders; Try again calls `reload`; no `alert` is reachable (the row menu is `ConversationRow`'s, tested there); a signed-out visitor is sent to `/login`.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/pages/messages/index.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): rebuild the messages list`.

### Task 9a.9: `MessageLog`

**Files:** create `apps/web/src/components/messages/MessageLog.tsx`, `MessageLog.module.css`, `MessageLog.test.tsx`.

```ts
export interface MessageLogProps {
  messages: ChatMessage[];
  viewerId: string;
  partner: ConversationWithParticipant;
}
```

A `div role="log"` named `Messages with {public name}` over `buildThreadDays`. Each day is a `section` with an `h2` from `formatDayLabel`. Each message is a bubble with its text (`white-space: pre-wrap`), `formatRelativeTime`, and, on the viewer's own, `IconCheck` / `IconChecks` (`aria-hidden`) followed by a `VisuallyHidden` "Sent" or "Read". A received run's last message has a `decorative` `Avatar` beside it; the others keep an empty slot of the same width, so bubbles line up. The scroll rule (decision 5) lives here: an end sentinel scrolled into view with `block: 'end'` on first render with messages, and on a new last message when it is the viewer's own or the window was within 120px of the bottom before it arrived.

- [ ] **Step 1: Write the failing test.**
  - The log is `getByRole('log', { name: 'Messages with Bikal S.' })`.
  - Two days render two `h2`s, "Today" and "Yesterday" (fake the clock with `vi.setSystemTime`).
  - An own read message's text includes "Read"; an unread own one "Sent"; a received one neither.
  - No element in the log has role `button` (the avatars are decorative, decision 4).
  - `scrollIntoView` (stubbed on `Element.prototype`) runs once on first render; again after a rerender that appends an own message; not after one that appends a received message while `window.scrollY` puts the end more than 120px away.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- src/components/messages/MessageLog.test.tsx`
- [ ] **Step 3: Implement.** Measure "near the bottom" from `document.documentElement` (`scrollHeight - scrollY - innerHeight`) in a layout effect before the new message paints, keyed on the last message's id.
- [ ] **Step 4: Run and watch it pass.**
- [ ] **Step 5: Commit** as `feat(web): add MessageLog`.

### Task 9a.10: `ThreadHeader` and `MessageComposer`

**Files:** create `apps/web/src/components/messages/ThreadHeader.tsx`, `MessageComposer.tsx`, a shared `thread.module.css`, and a test for each.

```ts
export interface ThreadHeaderProps {
  partner: ConversationWithParticipant;
}

export interface MessageComposerProps {
  /** Public name, for the field's label. */
  partnerName: string;
  onSend: (text: string) => Promise<boolean>;
}
```

`ThreadHeader` is a back link "Messages" (`IconArrowLeft`) to `/messages`, then `UserMenuTrigger` (size `small`, public name, `toneKey` the full name, no `onChat`), then an `h1` with the public name. `MessageComposer` is decision 7: it owns its draft and `sending` state, trims nothing itself (the hook does), and refocuses its field after a successful send. The composer's wrapper is the sticky element (decision 5).

- [ ] **Step 1: Write the failing tests.**
  - Header: the `h1` is the public name; the back link goes to `/messages`; the menu offers View profile linking to `/users/<id>`.
  - Composer: the field is `getByRole('textbox', { name: 'Message Bikal S.' })`; Send is disabled while the field is blank or only spaces; typing and pressing Enter calls `onSend` with the text; while it is pending Send has `aria-disabled="true"` and is not `disabled`; resolving true clears the field and focuses it; resolving false keeps the text and shows "Couldn't send your message. Please try again."; a second Enter while pending makes no second call.
- [ ] **Step 2: Run and watch them fail.** `npm run test --workspace=apps/web -- src/components/messages/ThreadHeader.test.tsx src/components/messages/MessageComposer.test.tsx`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Commit** as `feat(web): add ThreadHeader and MessageComposer`.

### Task 9a.11: Rebuild the thread and delete `Messages.module.css`

**Files:** rewrite `apps/web/src/pages/messages/[id].page.tsx` and `[id].test.tsx`; delete `apps/web/src/styles/Messages.module.css`; modify `scripts/guard-css-tokens.allowlist.json` and `apps/web/eslint/raw-element-allowlist.mjs`.

The page reads `router.query.id` once `router.isReady` (a hard reload must not flash not-found, the 8a lesson), then renders from `useMessageThread`: `LoadingState variant="detail"`; `ErrorState` with retry; decision 8's `EmptyState`; or `ThreadHeader`, then `MessageLog` or, with no messages, a `Text` "No messages yet. Say hello!", then `MessageComposer`. The `<title>` is `{public name} - Messages - Nepally` once the partner is known.

- [ ] **Step 1: Rewrite the test** over a mocked `useMessageThread`: each state renders; not-found shows no textbox; the composer's `onSend` is the hook's `send`; no `alert` anywhere; the h1 is the public name.
- [ ] **Step 2: Run and watch it fail.** `npm run test --workspace=apps/web -- "src/pages/messages/[id].test.tsx"`
- [ ] **Step 3: Implement.** Then delete `Messages.module.css`, take it off the CSS allowlist and `src/pages/messages/[id].page.tsx` off the raw-element allowlist (regenerate with `node apps/web/eslint/write-raw-element-allowlist.mjs` and check the diff only deletes that line).
- [ ] **Step 4: Run the page tests, then `npm run lint:guards` and `npm run lint --workspace=apps/web`.** All pass; the raw-element list is down to 5 files and the CSS allowlist to 7.
- [ ] **Step 5: Commit** as `feat(web): rebuild the message thread`.

### Task 9a.12: E2E, baselines, keyboard, docs and the PR

**Files:** `apps/web/e2e/tests/11-marketplace.spec.ts`, a new `apps/web/e2e/tests/14-messages.spec.ts`, `apps/web/e2e/helpers/supabase-mock.ts` if its conversation routes need rows; `docs/architecture/web-ui-system.md`; `docs/product/features/in-app-chat.md`.

- [ ] **Step 1: Fix the pinned dead end.** `11-marketplace.spec.ts:67` asserts `/messages/<conversation id>` instead of `?to=`. Serve the `conversation_participants` / `conversations` rows `getOrCreateConversation` reads from the mock if it doesn't already.
- [ ] **Step 2: Add `14-messages.spec.ts`.** The inbox lists a conversation by public name with its unread count; opening it shows the `h1`, the log and the composer; typing and pressing Enter shows the sent message and clears the field; the header's menu has View profile; a mistyped id shows "Conversation not found" and no textbox. At 375px, sending leaves the composer pinned to the bottom of the viewport, and scrolling up in a long thread keeps it there.
- [ ] **Step 3: Run the e2e suite.** `npm run test:e2e:web`
- [ ] **Step 4: Re-baseline `messages`** in Docker (`npm run test:visual:docker --workspace=apps/web -- --update`), review both PNGs, and restore any other page that changed without cause, as 8a did. `a11y-baseline.json` stays `{}`.
- [ ] **Step 5: Update the docs.** Add `useStartConversation`, `ConversationRow`, `ThreadHeader`, `MessageLog` and `MessageComposer` to `web-ui-system.md`, and list the composer's Send and listing detail's Contact Seller among the busy-controls cases. In `in-app-chat.md`, record public names in chat, not-found, the failure messages, the newest-100 window, and that every "Message"/"Chat"/"Contact seller" entry point now opens the thread.
- [ ] **Step 6: Run the full gate.** `npm run lint`, `lint:guards`, `type-check`, `test`, `test:e2e:web`, `test:visual:web` and `docs:check`.
- [ ] **Step 7: Walk the keyboard.**
  - Inbox: Tab reaches each row's avatar menu, then its link; Enter opens the menu, arrows move, Escape returns focus to the avatar.
  - Thread: Tab goes back link → avatar menu → composer → Send, with no stop inside the log; Enter in the field sends and focus stays in the field; with the field blank, Send is skipped.
  - At 375px: nothing overflows, and a long unbroken message wraps inside its bubble.
- [ ] **Step 8: Push and open the draft PR** against `master`, filling `.github/pull_request_template.md`, then `gh pr edit <number> --add-reviewer @copilot`. Update the tracker row to `In Review (PR #NN)`.

**Routed to PR 10 at planning time:** mobile's two day-label copies (`MessageThreadScreen.tsx:291`, `NotificationsScreen.tsx:48`) onto `formatDayLabel`, and mobile's chat onto public names (recon 12, 14) — `apps/mobile/` is out of this overhaul's scope.

## PR 9b — Notifications, preferences, moderation (`feat/web-ui-notifications`)

Branches from `master` after 9a merges. Recon items 16–27 are its scope; the breakdown is written when it starts. What the recon settles already:

- **Notifications:** a `useNotificationsPage` hook owns the list, the count and the realtime INSERTs — dropping `type: 'message'` as the bell does (19) — and pages with `useInfiniteScroll` at an offset equal to the rows on screen (20). "Load more" goes. Rows are `NotificationItem`; every mutation checks its result and says so with `notify.error` (21, 22). Day labels come from `formatDayLabel` (9a.2). `useNotificationsFeed` reloads when polling turns back on (23). `PageHeader` "Notifications", with the unread count as its description rather than inside the `h1` (27).
- **Preferences:** a failed `getUserSettings` shows `ErrorState` with retry and no Save (16); every switch gets a `label`, the two radio groups become `Radio.Group`s with a `label` (17); Save follows the busy-controls rule and reports with `notify.success` (18).
- **Moderation:** a `useModerationQueue` hook with a real error state (24); `PendingPostCard` and `ReportCard` extracted; Remove and Ban confirm through `useConfirm` with `danger: true` (26); busy buttons stay focusable, and focus moves to the next card when an acted-on card leaves (25). Which report actions sit behind an `ActionMenu` is settled in its breakdown.

## PR 10 — Static pages + cleanup (`feat/web-ui-cleanup`)

- **Pages:** `pages/index.page.tsx`, `login`, `signup`, `verify-email`, `onboarding/zip`, `privacy`, `terms`, `guidelines`, `help`, `auth/callback`, `components/legal/LegalDocument.tsx`.
- **CSS:** `styles/Home.module.css`, `Auth.module.css`, `Legal.module.css`, `ComingSoon.module.css`.
- **Cleanup:**
  - [ ] Both allowlists are empty. Delete `scripts/guard-css-tokens.allowlist.json`, and remove the allowlist and `--write-allowlist` code from the guard and its tests.
  - [ ] Delete `apps/web/eslint/raw-element-allowlist.mjs` and `write-raw-element-allowlist.mjs`, and drop the ignore spread from `eslint.config.mjs`.
  - [ ] Delete `apps/web/src/styles/legacy-aliases.css` and `legacy-aliases.test.ts`, and remove the `@import` from `globals.css`. Then run the full suite and visual tests.
  - [ ] `a11y-baseline.json` is `{}`, meaning no known serious or critical violations remain.
  - [ ] Mark `docs/wireframes/00-design-system-foundation/00-design-system-foundation.md` as superseded, with a link to `docs/architecture/web-ui-system.md`.
  - [ ] Update `docs/product/roadmap.md` with the shipped web UI overhaul and search.
  - [ ] Move `PostCard`'s hover (`PostCard.module.css`) and the feed's `.inlineSponsoredCard:hover` (`Feed.module.css`) off `--shadow-float` onto the border treatment the summary rows use (PR 6 decision 11).
  - [ ] `PostActions`' save toggle (`PostActions.tsx:81-88`) pairs `aria-label="Unsave post"` with `aria-pressed={true}`, the contradiction APG warns about: keep one stable name ("Save post") and let `aria-pressed` carry the state (found in PR 6's Task 6.6 review).
  - [ ] Map Mantine's disabled palette (`--mantine-color-disabled`, `-disabled-color`, `-disabled-border`) onto tokens in `mantine-theme.ts`'s `cssVariablesResolver`; today every disabled Mantine control is a cool grey outside the palette (found in PR 6's Task 6.6 review).
  - [ ] Avatar alt text leaks full surnames: every `Avatar` caller except `PublicProfileHeader` passes `full_name`, so alt reads "Bikal Shrestha's avatar" on pages that otherwise show "Bikal S." Pass the public name (keeping `toneKey={full_name}` for the colour) or `decorative` where a name is already visible (found in PR 6's Task 6.7 review).
  - [ ] The public profile's follower count doesn't move when you follow or unfollow: wire `FollowButton`'s `onChange` into `PublicProfileHeader` so the count adjusts (found in PR 6's Task 6.7 review).
  - [ ] Public profile list failures look like empty lists: `usePublicProfile` turns a failed posts/events/listings request into `[]`, and any `getUserById` failure reads "They may have deleted their account". Expose per-list errors plus a reload by adopting `useUserList` from Task 6.14; events need their own limit of 50. Show `ErrorState` with retry, and separate "not found" from "couldn't load" (found in PR 6's Task 6.8 review).
  - [ ] `EmptyState` always renders an `h3`, so tab panels jump h1 → h3 and the public profile's "Member not found" page has no h1. Add a `titleOrder` prop (default 3) and use `order={1}` for page-level empty states (found in PR 6's Task 6.9 review).
  - [ ] Raw storage and RLS error text reaches users verbatim across web (e.g. "new row violates row-level security policy" from `postSubmit` and `replaceProfilePhoto`). Decide one policy: map shared-API failures to friendly copy and log the detail with `logClientEvent` (found in PR 6's Task 6.11 review).
  - [ ] Five private copies of `getErrorMessage(error, fallback)` exist: web `profile.page.tsx` and `lib/profilePhoto.ts`, and mobile `EditProfileScreen`, `ChangePasswordScreen` and `EmailSignupScreen`. Export one from `packages/shared/src/utils/` (found in PR 6's Task 6.11 review).
  - [ ] Mobile should adopt the shared `setProfilePhoto` and `PROFILE_PHOTO_SIZE_PX` (`EditProfileScreen.tsx` 129–147 duplicates both) (found in PR 6's Task 6.11 review).
  - [ ] Two more copies of the megabyte formula should use the shared `formatMegabytes`: mobile `CreatePostScreen.tsx` ~804 and shared `validation/post.ts` ~53 (found in PR 6's Task 6.12 review).
  - [ ] Mobile's `EditProfileScreen` (min-2 check ~240) and web signup's `validateFullName` should adopt the shared `fullNameSchema`. `users.full_name` also has no length limit in the database: add a `CHECK (char_length(full_name) <= 100)` in a new additive migration, which needs the user's go-ahead to apply (found in PR 6's Task 6.13 review).
  - [ ] Mobile About You still hard-codes its limits and saves raw values. `apps/mobile/src/screens/profile/components/AboutYouSection.tsx` uses `maxLength={100}` (75) and `n >= 0 && n <= 99` (89): switch these to the shared `COLLEGE_MAX_LENGTH`, `YEARS_IN_US_MIN` and `YEARS_IN_US_MAX`. `EditProfileScreen.tsx` (~280) sends `aboutYou` unparsed, so a whitespace-only college is stored as spaces. Run `extendedProfileUpdateSchema` before saving and write the parsed values, as web's `handleSaveAboutYou` has done since Task 6.17. Seed the form with the shared `getAboutYouFormValues(user)` first (`EditProfileScreen.tsx:55` seeds straight from `user` today), and replace the local `AboutYouValues` (`AboutYouSection.tsx:17`) with the shared `AboutYouFormValues`. The database accepts any district or language string, so without that step a saved value outside `NEPAL_DISTRICTS` or `SUPPORTED_LANGUAGES` would block every save (found in PR 6's Task 6.17 review).
  - [ ] Extract a `useFocusAfterUpdate(dep)` hook that returns `arm(getTarget)`. It would focus the target after the next commit, but only if focus is stranded (`lib/focus.ts` `isFocusStranded`). Three hand-rolled copies exist today: Manage Locations' pending-focus effects, `ProfilePhotoControl`'s restore after remove, and `profile.page.tsx`'s saved-panel refocus.
    - Manage Locations has two near-identical effects on `[savedLocations]`, `pendingFocusIdRef` and `pendingAddFocusRef`. One arm holding a lazy getter would merge them, so the newest action wins for adds too.
    - It would also cover an edge case. When an add succeeds but `refreshSavedLocations` fails, `savedLocations` never changes: the form closes, focus falls to `<body>`, and the arm stays set.

    (Found in PR 6's Task 6.19 reviews.)
  - [ ] Manage Locations row layout:
    - "Set as default"'s text starts 9px right of the label column, because of the button's padding. Its box is aligned but its text isn't.
    - The default row has no Remove button, so its pencil sits in the trash column, and the pencils don't line up across rows. Reserve the column (found in PR 6's Task 6.19 review).
  - [ ] Task 6.19a's CSS order fix exposed module rules that production had never shown. Review the new baselines for each (found in PR 6's Task 6.20 baselines):
    - **Post detail:** the action row spreads wider, the Help tag chip is taller, and "No comments yet" is larger. At 412px the top card got taller.
    - **Create post, create event and create listing:** some section labels, such as "Tags (1-3 required)", "Photos" and "Start Date & Time", are now smaller and bold. Create post's "Please select at least 1 tag" is now red. Red is the intended error style. The real bug is that `create.page.tsx:378–381` passes it as `error` before the member has done anything, so show it only after a submit attempt.
  - [ ] PR 6's own profile page is 388 lines against its ~320 target, and the public profile is 351 against ~300. For the own profile, extract its `ListPanel` / `ListingsPanel`; the shared list-states item above covers them. For the public profile, extract its `AboutPanel` (found in PR 6's Task 6.20).
  - [ ] `useProfileEditing.ts:~128` calls `supabase.auth.resetPasswordForEmail` directly. The code moved unchanged from master. Add a shared `requestPasswordReset(supabase, email, redirectTo)` and use it on web and mobile (found in PR 6's final review).
  - [ ] Feed card badges at 375 no longer sit together. Task 6.19a made the narrower mixed-case badges render in production, so `PostMeta`'s wrapping row now puts "Housing" beside the author name and leaves "Local" alone on the next line. Before, both sat below the name. Keep the badges together, for example as their own non-wrapping group (found in PR 6's Task 6.19a check).
  - [ ] Own profile widths:
    - `Profile.module.css` `.profilePage` still uses a raw `max-width: 600px`, while the public profile uses `--layout-content-width` (800px). Pick one width for both profile pages.
    - At desktop the profile card's content starts 8px further in than the Settings card's (`--space-6` against `--card-padding`). Align them.

    (Found in PR 6's Task 6.18 review.)
  - [ ] Share the list states: the own profile's `ListPanel` and the public profile's `RowList` nearly duplicate each other (loading → error with retry → empty → rows). Extract one `components/ui` component taking `{ loading, error, onRetry, isEmpty, empty, children }` when the public profile adopts `useUserList` (found in PR 6's Task 6.16 review).
  - [ ] One sign-out in `AuthContext`, with a `signingOut` flag that `Layout` treats like `loading` and renders its full-screen loader for. The steps are set the flag, `supabase.auth.signOut()`, `router.replace('/')`, then clear the flag. This replaces the "leave first, then sign out" order that `Layout.tsx` and `profile.page.tsx` each copy (Task 6.16). The member sees a spinner instead of their feed at `/` for the length of the request, and the feed no longer fires about 16 requests it then throws away (found in PR 6's Task 6.16 review).
  - [ ] Sign-out has three labels: "Logout" in the profile menu, "Sign out" in the Settings nav and "Sign Out" in `AccountMenu`. Pick one (found in PR 6's Task 6.16 review).
  - [ ] `SummaryRowMeta`'s separator dot starts the wrapped line on narrow rows ("· Food & Restaurants"), because the dot attaches to the following item. Keep the dot with the item before it, or hide a line-leading dot (found in PR 6's Task 6.16 review).
  - [ ] Extract `components/ui/DetailList` (`DetailList` + `DetailRow`) from the identical `dl > div > dt + dd` markup in the public profile's `AboutPanel` and `AccountDetails`. Add `white-space: pre-line` to `PublicProfile.module.css` `.aboutBio`, so visitors see a bio's line breaks as the member does (found in PR 6's Task 6.15 review).
  - [ ] Phone: web has no way to set or clear `users.phone`, so the own profile's Phone row always leads nowhere on web. Either show the row only when it is set, or add phone to web profile editing. Separately, mobile `EditProfileScreen.tsx:277` saves `phone: phone.trim() || undefined`, which the client drops, so a member can never clear their phone. This is the same class of bug Task 6.2 fixed for photos: write `null` (found in PR 6's Task 6.15 review).
  - [ ] Search's result `Tabs` (`search.page.tsx:125`) wrap on phones like the public profile's did. Give them the same `tabList`/`tab` treatment the public profile got: nowrap plus scroll, `flex-shrink: 0`, an inset focus ring, a token underline, and an `onFocus` `scrollIntoView({ inline: 'nearest' })`, because Chromium leaves a partly clipped focused tab clipped. Adopt `scrollingTabsClassNames` and `scrollFocusedTabIntoView` from `components/ui/scrollingTabs`, which PR 6 extracted for both profile pages (found in PR 6's Task 6.10 review).
  - [ ] **Guard undefined custom properties.** `guard-css-tokens.js` checks for colour literals and legacy token names, but nothing checks that a `var(--x)` resolves. PR 8a's chunk 1 shipped twelve references to tokens that do not exist — `--weight-semibold` for `--font-weight-semibold`, `--text-sm` and `--text-lg` for `--font-size-*` (where `--text-1/2/3` are *colours*), and `--radius-pill` for `--radius-full` — and every one silently fell back to the inherited value. A check comparing each `var()` in a module against `tokens.css` plus `legacy-aliases.css` would have caught all of them; a sweep of the whole app at that time found only four others, all pre-existing (`--tier-color`, `--color-background-subtle`, `--color-surface-muted`, and Mantine's own `--tabs-list-border-width`) (found in PR 8a's chunk 2 review).
  - [ ] **Both detail pages lose their breadcrumb landmark to Mantine.** `Breadcrumbs` renders a plain `div`, so event detail (PR 7) dropped the `<nav aria-label="Breadcrumb">` the old markup had. PR 8a wrapped listing detail's back in a `nav`; event detail still needs the same (found in PR 8a's chunk 3 review).
  - [ ] `PhotoCarousel` has no `priority` / `fetchpriority` prop, so every page that adopted it lost the hero image's LCP hint — listing detail and post detail both had `priority` before. Add an `eager` prop and pass it where the carousel is above the fold (found in PR 8a's chunk 3 review).
  - [ ] Add `--accent-ink` on `--surface-sunken` and `--success` on `--surface-sunken` to `tokens.contrast.test.ts`: PR 8b's tier icons and promotion success icon use them. Both icons are `aria-hidden` beside text that says the same thing, so they are not text-contrast failures, but the pairs are untested (found in PR 8b's chunk 2 review).
  - [ ] Listing detail shows the category and the item condition twice — once as a badge under the title, once as a chip in the highlights strip — because `getListingHighlights` returns chips for both. Pre-existing; decide which row owns them (found in PR 8a's chunk 4 screenshot review).
  - [ ] Listing detail renders `ListingActionsPanel` twice, with CSS showing one per breakpoint. `display: none` keeps the hidden copy out of the a11y tree and tab order, so it is correct, but it doubles the interactive DOM and forces the page tests onto `getAllByText`. One render placed by CSS `order` would be better (found in PR 8a's chunk 3 review).
  - [ ] A member with no metro area sees "No listings in your area yet", which reads as though their metro is empty rather than unset. Before PR 8a they saw a skeleton forever, so this is an improvement, but the copy should distinguish the two (found in PR 8a's chunk 2 review).
  - [ ] Mobile's `ListingCard.tsx:23` and `ListingGridCard.tsx:37` still inline `(listing.owner?.trust_level ?? 0) >= 1`. PR 8a added the shared `isVerifiedSeller` and adopted it on web, but could not touch `apps/mobile/` (found in PR 8a's chunk 1 review).
  - [ ] Settle whether the "query by role, label or text" rule carves out styling hooks. `EventTypeBadge`'s `data-type` and `ListingCard`'s `data-category` are the contract between a component and its stylesheet, and PR 7's review asked for the former to be asserted, but the written rule forbids `data-*` queries outright (found in PR 8a's chunk 1 review).
  - [ ] Mobile `EventsScreen` onto `getMetroEventsPage`. Until then mobile's list still pages every event by start date ascending, so a metro whose events are mostly past opens on the oldest of them (PR 7 recon 3).
  - [ ] Mobile's `EventCard` K formatter onto the shared `formatCount`, and mobile event detail onto Interested / Going, for parity with web (PR 7 decision 10).
  - [ ] `AttendeeList` rows pass `full_name` to a non-decorative `Avatar`, so the alt text reads "Bikal Shrestha's avatar" beside the masked "Bikal S." Pass the public name with `toneKey={full_name}`, or `decorative`, and update the `avatar-<name>` test id. This is the same class of leak as the Avatar item above (found in PR 7's chunk 3 review).
  - [ ] The attendee dialog caches its list per open, so after the viewer marks themselves going the count can read 13 while the reopened dialog lists 12. Reload when the count and the cached length disagree (found in PR 7's chunk 3 review).
  - [ ] `EventAttendanceCard`, `EventOrganizerCard` and event detail's Manage card define the same sidebar-card chrome and section title three times. Extract one primitive when a fourth appears (found in PR 7's chunk 3 review).
  - [ ] **Mobile's own realtime channels onto `uniqueChannelTopic`.** PR 9a gave shared `subscribeToMessages` and web's badge and bell channels a per-subscription topic suffix: realtime-js returns a still-leaving channel for a matching topic, and its `subscribe()` does nothing, so a quick resubscribe (StrictMode's dev remount, A → B → A) got no events. Mobile's `HomeScreen.tsx` (`chat-unread-mobile:`, `chat-messages-unread-mobile:`, `feed-posts-mobile:`) and `NotificationsScreen.tsx` (`notifications-mobile:`) still use fixed topics (found in PR 9a's chunk 1 review; the shared and web parts fixed in PR 9a).
  - [ ] Set this plan and the spec to `status: implemented` and `git mv` both into `docs/archive/plans/` and `docs/archive/specs/`. Update `docs/INDEX.md` (Specs back to "_None active._") and any links. Run `npm run docs:check`.

## After the overhaul — Mantine 9

This is a separate PR. The Expo SDK 57 migration landed React 19.2.3, so it is unblocked:

1. Bump every `@mantine/*` package, including `modals` and `dropzone`, to 9.x.
2. Set `<Notifications pauseResetOnHover="notification" />`.
3. Run unit, e2e and `test:visual:web`. **Expect zero screenshot diffs**; investigate any diff before re-baselining.
4. Remove the React 19.2 / Mantine 9 rows from `TECH-VERSIONS.md` → Deferred Upgrades.
