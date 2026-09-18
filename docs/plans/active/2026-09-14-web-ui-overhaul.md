---
title: Web UI overhaul — implementation plan
status: planned
created: 2026-09-14
spec: docs/specs/2026-09-14-web-ui-overhaul-design.md
---

# Web UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web app's three visual languages with the H1 "Ink & Marigold" token system, a Mantine-8 component library that is ready for Mantine 9, a responsive shell with phone bottom tabs, and global search. It ships as a sequence of small PRs guarded by visual and accessibility regression tests.

**Architecture:** `tokens.css` is the single source of truth. A temporary `legacy-aliases.css` re-skins every existing CSS Module at once, and the Mantine theme mirrors the tokens (enforced by a sync test). The 630-line `Layout.tsx` becomes a composition of focused shell components over Mantine `AppShell`. Search is three `SECURITY INVOKER` Postgres functions that return ranked ids. Shared API functions wrap them and hydrate rows with the existing selects. On web, a Mantine `Combobox` and a `/search` page sit on top.

**Tech Stack:** Next.js 16.3 (pages router) · React 19.1.4 · Mantine 8.3.18 (+ `@mantine/modals` 8.3.18) · CSS Modules + postcss-preset-mantine · Vitest 4 + Testing Library · Playwright 1.63 (+ `@axe-core/playwright` 4.13) · culori 4 · Supabase Postgres 17 · TypeScript 7 (`npm run type-check`).

**Spec:** [docs/specs/2026-09-14-web-ui-overhaul-design.md](../../specs/2026-09-14-web-ui-overhaul-design.md)

## Global Constraints

- Web only. Do not change anything under `apps/mobile/`.
- React stays at exactly `19.1.4`. Every `@mantine/*` package stays on `^8.3.18`. Do not install Mantine 9.
- These are the only new dependencies this plan allows: `@mantine/modals@^8.3.18`, `@mantine/dropzone@^8.3.18` (PR 5), `@axe-core/playwright@^4.13.0`, `culori@^4.0.2`, `@types/culori@^4.0.1`.
- **Never commit on `master`.** Every PR starts with `git switch master && git pull --ff-only && git switch -c <branch>`. Commit, push and open the PR freely on the feature branch. Never push to or merge into `master`; merging is the user's call.
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

1. **No Docker locally.** Screenshot baselines are generated by the Visual baselines workflow. That workflow also runs on pushes to non-`master` branches whose head commit message contains `[visual-baselines]`. PRs are stacked branches, each pushed from its own feature branch.
2. **Native buttons keep a pointer cursor.** Task 1.3's `globals.css` includes `button:not(:disabled) { cursor: pointer; }`. The original rewrite had dropped the old `button { cursor: pointer; }` rule.
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
15. **`next-env.d.ts` churn is not committed.** Running the e2e suite builds for production, which rewrites the file's imports from `./.next/dev/types/…` to `./.next/types/…`; `next dev` flips them back. The committed version keeps the `dev` paths.
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
   - **Still open from that review:** `count(*) OVER ()` still materializes the whole match set for the window total; `totalCount` still comes from `rows[0]`, so an empty page reports 0; `EMPTY_PAGE` is still a shared mutable singleton; `.slice()` can still split a surrogate pair; highlighting still does not mirror stemming; and the indexes were created without `CONCURRENTLY`, which matters when this reaches production.
22. **The search UI shared one error field between two requests (Copilot, PR #66).** `useSearchPage` ran a preview request and a list request but exposed a single `error`, which only the preview effect cleared. That one gap produced four wrong states: a failed tab kept its error after switching tabs, a failed preview left the All tab on a permanent skeleton, a failed type tab rendered "No … match" beside the error, and a failed `loadMore` was never cleared by a later success. Preview and list errors are now separate and the hook returns the active tab's.
   - **Tight retry loop:** a failed `loadMore` left `hasMore` true while the sentinel was still on screen, so `useInfiniteScroll` re-fired as soon as `loadingMore` cleared. It now stops and waits for the explicit retry.
   - **Paging offset:** `items.length` was used as the next offset, but hydration drops rows that were deleted or hidden by RLS, so one dropped row made the next request start too early and repeat results. A ranked offset now advances by the page size regardless of how many rows survived.
   - **Signed-out requests:** `/search` ran its effects before the auth guard, calling RPCs that are revoked from `anon` before redirecting. The query is null until the viewer is known to be signed in.
   - **Metro race:** `activeLocation` loads asynchronously, so a direct `/search?q=` sent `metroId: null` with `allMetros: false` and matched global rows only. The page and the combobox now fall back to `user.metro_area_id`, as `FeedPage` already did.
   - **Stale highlighting:** the suggestions hook kept previous results while the next request was in flight but reported the new query, so marks described words the visible results never matched. It now returns `resultsQuery` alongside `query`.
   - **Not taken:** the missing-baselines finding was stale — all three PNGs are committed. Keyboard navigation is not broken: Mantine's `Combobox.Target` wires arrows and Escape, and a passing test covers ArrowDown + Enter. The range-aware e2e fixture was reverted, because its synthetic ids never hydrate, so it would also need post hydration mocks and a baseline regeneration for the least valuable finding in the set.

## Live tracker

One task is `In Progress` at a time. Update this table when a PR starts and when it merges.

| PR | Branch | Tasks | Status | Last updated | Notes |
|---|---|---|---|---|---|
| 0 Safety net | `test/web-visual-safety-net` | 0.1–0.6 | Completed (pushed, not merged) | 2026-09-15 | Linux baselines generated in CI (no local Docker) |
| 1 Foundation | `feat/web-design-tokens` (stacked on PR 0) | 1.1–1.7 | Completed (pushed, not merged) | 2026-09-15 | Linux baselines generated in CI (db52500) |
| 2 Shell + primitives | `feat/web-app-shell` (stacked on PR 1) | 2.1–2.12 | Completed (pushed, not merged) | 2026-09-15 | Linux baselines f19b133 (CI run 35016011832) |
| 3a Search: data + shared | `feat/search-data` (stacked on PR 2) | 3a.1–3a.4 | Completed (pushed, not merged) | 2026-09-15 | migration 037 applied to nusa-staging 2026-09-15; PII smoke test PASS |
| 3b Search: web | `feat/search-web` (stacked on PR 3a) | 3b.1–3b.6 | Completed (pushed, PR #66) | 2026-09-17 | Linux baselines f8c9ebd (CI run 35276325905); a11y baseline unchanged |
| 4 Feed + post detail | `feat/web-ui-feed` | breakdown at PR start | Not Started | 2026-09-14 | |
| 5 Create flows | `feat/web-ui-create-flows` | breakdown at PR start | Not Started | 2026-09-14 | |
| 6 Profile + public profile | `feat/web-ui-profile` | breakdown at PR start | Not Started | 2026-09-14 | |
| 7 Events | `feat/web-ui-events` | breakdown at PR start | Not Started | 2026-09-14 | |
| 8 Marketplace | `feat/web-ui-marketplace` | breakdown at PR start | Not Started | 2026-09-14 | |
| 9 Messages, notifications, moderation | `feat/web-ui-messaging` | breakdown at PR start | Not Started | 2026-09-14 | |
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

- [ ] **Step 5: Ask to push**

Show the user `git log --oneline master..HEAD` and `git diff --stat master...HEAD`, and ask for approval to push `test/web-visual-safety-net` and open the PR. Do not push without a yes. Update the tracker row for PR 0.

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

- [ ] **Step 5: Commit and ask to push**

```bash
git add apps/web/e2e/visual
git commit -m "test(web): re-baseline screenshots for the H1 design tokens" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Show `git log --oneline master..HEAD` and `git diff --stat master...HEAD`, and ask for approval to push `feat/web-design-tokens`. Update the tracker row for PR 1.

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

- [ ] **Step 7: Full verification, commit, ask to push**

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

Show `git log --oneline master..HEAD` and `git diff --stat master...HEAD`, and ask for approval to push `feat/web-app-shell`. Update the tracker row for PR 2.

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

- [ ] **Step 4: Full verification, commit, ask to push**

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

Show `git log --oneline master..HEAD` and `git diff --stat master...HEAD`, and ask for approval to push `feat/search-data`. Update the tracker row for PR 3a, and note in it that migration 037 is applied.

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

- [ ] **Step 6: Shrink allowlists, full verification, commit, ask to push**

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

Confirm with the user that migration 037 is live on the target project. Then show `git log --oneline master..HEAD` and `git diff --stat master...HEAD`, and ask for approval to push `feat/search-web`. Update the tracker row for PR 3b.

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
   # Raw form elements
   grep -rnE "<(button|input|select|textarea)[[:space:]>/]" <area .tsx files>
   ```

3. **Write the task breakdown.** Invoke `superpowers:writing-plans` and append a "PR N — Task breakdown" section under that PR below. Use the same task format as PRs 0–3b: files, interfaces, TDD steps with full code, commands, and commits.
4. **Build the tasks in this order:**
   1. extract sub-components (tests first)
   2. adopt primitives
   3. replace native dialogs
   4. move the CSS Modules to semantic tokens
   5. fix accessibility
   6. update and re-baseline
5. Meet the **definition of done** below, then ask to push.

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

## PR 4 — Feed + post detail (`feat/web-ui-feed`)

- **Pages:** `pages/feed.page.tsx` (1290 lines), `pages/posts/[id].page.tsx` (984).
- **CSS:** `styles/Feed.module.css`, `styles/PostDetail.module.css`.
- **Build (first adopters):**
  - `components/ui/ImageLightbox`: Mantine `Modal` `fullScreen`, focus trap, Escape, ←/→ keys, labelled prev/next/close buttons. It replaces the two ~210-line copies (feed 373–488/821–916, posts/[id] 369–487/887–980).
  - `components/ui/PhotoCarousel`: CSS scroll-snap, labelled prev/next buttons, position announced as "Photo 2 of 3". It replaces the carousels in feed 1189–1250 and posts/[id] 620–679.
- **Extract into `components/posts/`:**
  - `PostCard`, a stretched-link card replacing today's `<Link>` wrapping buttons (feed 1040–1288)
  - `PostActions`, with inline SVG icons (1255–1281) moved to Tabler
  - `PostMeta` (tag chips, `ScopeBadge`, metro)
  - `CommentThread`, `CommentComposer`
  - `components/users/UserMenuTrigger` (an `ActionMenu` with View Profile / Chat), replacing the hand-positioned `ref.style` menus (posts/[id] 139) and the manual `mousedown` listeners
  - the feed's sponsored rail and upcoming-events widget
- **Tests to rewrite:**
  - `pages/posts/[id].test.tsx:441` (anchored dropdown class and inline style) → assert `menuitem`s.
  - `e2e/tests/09-avatar-menu.spec.ts:59,102` (`div[class*="avatarDropdownAnchored"]`) → `getByRole('menu')`.
- **Also:**
  - Extract the feed composer row into `components/posts/PostComposer`.
  - Add `components/ui/notify.ts` (`notify.success(message)`, `notify.error(message)` over `@mantine/notifications`, with tests) and adopt it for the feed and post-detail toasts.
  - Replace native dialogs in the feed (report, delete) and in post detail.

## PR 5 — Create flows (`feat/web-ui-create-flows`)

- **Pages:** `pages/posts/create.page.tsx` (729), `pages/marketplace/create.page.tsx` (483), `pages/events/create.page.tsx` (591).
- **CSS:** `styles/CreatePost.module.css` (`outline: none` at 33, 53), `pages/events/createEvent.module.css` (54 hex), and the create sections of `pages/marketplace/marketplace.module.css`.
- **Install** `@mantine/dropzone@^8.3.18` and build `components/ui/ImageUploader`: drop, pick, reorder with keyboard-accessible move up/down, remove, count and size limits from shared constants. It replaces 4 uploaders (posts/create 609–701, marketplace/create ~295–330, events/create 485–525, and profile in PR 6).
- **Fields:** move every raw input (10 in events/create) to Mantine `TextInput` / `Textarea` / `Select` / `Switch`, with `label`, `description` and `error`. Character counters use `Textarea` `description`.
- **Shared:** consolidate the duplicated post photo upload logic (posts/create 369–439 vs 447–509) into one shared API function in `packages/shared/src/api/storage.ts`, with tests.
- **Also:** replace native dialogs in posts/create and marketplace/create.

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

## PR 7 — Events (`feat/web-ui-events`)

- **Pages:** `pages/events/index.page.tsx`, `pages/events/[id].page.tsx`.
- **Components:** `components/events/{EventCard, EventFilterBar, RsvpButton, AttendeeList, EventTypeBadge}`.
- **CSS:** `pages/events/events.module.css`, `eventDetail.module.css` (19 hex), `components/events/EventCard.module.css` (16), `EventFilterBar.module.css` (12).
- **Tokens:** event-type colours become semantic tokens (`--event-<type>-fg/-bg`), added to `tokens.css` with contrast pairs.
- **Also:** adopt `useInfiniteScroll` (events/index 110–125), `PageHeader` and `EmptyState`; replace `confirm()` in events/[id]; the filter search input uses a Mantine `TextInput`.

## PR 8 — Marketplace (`feat/web-ui-marketplace`)

- **Pages:** `pages/marketplace/index.page.tsx`, `[category].page.tsx`, `listing/[id].page.tsx`, `my-listings.page.tsx`, `listing/promote/[id].page.tsx`, `listing/promote/success.page.tsx`.
- **Components:** `components/marketplace/{ListingCard, ListingStrip, FilterBar}`.
- **CSS:** `pages/marketplace/marketplace.module.css` (112 hex), `pages/marketplace/listing/promote.module.css` (97 hex; `outline: none` at 596; local `--tier-*` vars become tokens), `ListingStrip.module.css`, `FilterBar.module.css`.
- **Accessibility:** fix `<Link>` wrapping `<Button>` (index 226/229/310, listing/[id] 136/139, my-listings 90/101).
- **Also:**
  - Replace native dialogs (my-listings, listing actions).
  - Adopt `useInfiniteScroll` (index 178–193), the carousel (listing/[id] ~166–195) and `LoadingState`.
  - Convert the Mantine component mocks in the 7 marketplace tests to role-based assertions against real Mantine.

## PR 9 — Messages, notifications, moderation (`feat/web-ui-messaging`)

- **Pages:** `pages/messages/index.page.tsx`, `pages/messages/[id].page.tsx`, `pages/notifications.page.tsx`, `pages/profile/notifications.page.tsx`, `pages/moderation.page.tsx`.
- **CSS:** `styles/Messages.module.css`, `Notifications.module.css`, `NotificationPreferences.module.css`, `Moderation.module.css`.
- **Messages:** the avatar menus use `UserMenuTrigger`, replacing the manual `mousedown` listeners at messages/index 49 and messages/[id] 100.
- **Notifications:** adopt `NotificationItem` on the page, removing its `timeAgo` copy and the `<li onClick>` at ~252. Keep "Load more" or switch to `useInfiniteScroll`, and record which in the breakdown.
- **Also:** replace native dialogs in both messages pages and moderation. The moderation queue uses `EmptyState`, `LoadingState` and `ActionMenu`.

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
  - [ ] Set this plan and the spec to `status: implemented` and `git mv` both into `docs/archive/plans/` and `docs/archive/specs/`. Update `docs/INDEX.md` (Specs back to "_None active._") and any links. Run `npm run docs:check`.

## After the overhaul — Mantine 9

This is a separate PR, created once the Expo 54 → 56+ migration lands React 19.2+:
1. Bump every `@mantine/*` package, including `modals` and `dropzone`, to 9.x.
2. Set `<Notifications pauseResetOnHover="notification" />`.
3. Run unit, e2e and `test:visual:web`. **Expect zero screenshot diffs**; investigate any diff before re-baselining.
4. Remove the React 19.2 / Mantine 9 rows from `TECH-VERSIONS.md` → Deferred Upgrades.
