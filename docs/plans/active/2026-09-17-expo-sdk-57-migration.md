---
title: Expo SDK 54 → 57 migration — implementation plan
status: planned
created: 2026-09-17
---

# Expo SDK 54 → 57 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `apps/mobile` from Expo SDK 54 (React Native 0.81.5, React 19.1.4) to Expo SDK 57 (React Native 0.86.3, React 19.2.3). The app then runs in the Expo Go that the Play Store and App Store ship today, and the whole monorepo moves to React 19.2.3.

**Architecture:** This is a dependency and config migration with no feature work. Every `package.json` moves to SDK 57 versions in one commit, because npm refuses a half-moved state (the root `overrides` pin React). `npx npm@12` regenerates the lockfile. Two config fixes follow: the `splash` key and the Metro monorepo overrides. `expo-doctor`, the full CI gate (`npm run ci:local`) and a device smoke test in Expo Go SDK 57 verify the result.

**Tech Stack:** Expo SDK 57.0.23 · React Native 0.86.3 · React 19.2.3 · jest 29 + jest-expo 57 · @testing-library/react-native 13 · Next.js 16 (web, React bump only) · npm 12 for lockfile changes.

**Branch:** `chore/expo-sdk-57` (this plan is its first commit).

## Why now

Expo Go in the stores only runs the latest SDK. On 2026-09-17 the Android Expo Go auto-updated to SDK 57 and refused to open the project:

```text
ERROR  Project is incompatible with this version of Expo Go
• The installed version of Expo Go is for SDK 57.
• The project you opened uses SDK 54.
```

The workaround is to sideload Expo Go for SDK 54 and turn off auto-update, and it only lasts until the next reinstall. `TECH-VERSIONS.md` has listed this migration as a deferred upgrade since February.

## Global Constraints

- **Never commit on `master`.** Work on `chore/expo-sdk-57`. Commit, push and open the PR freely on this branch. Merging into `master` is the user's call.
- Commit messages follow Conventional Commits. The last paragraph is `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. The commit commands below pass it as a second `-m`.
- **Change the lockfile only with `npx -y npm@12 install`**, never bare `npm install`. The committed `package-lock.json` is npm 12 format. The local npm 11.6.2 strips `libc` fields that CI needs to pick native binaries. npm 12 warns that it wants Node ^24.15.0 on 24.13.0, and that warning is expected. Before every lockfile commit, `git diff --cached package-lock.json | grep -c '^-.*"libc"'` must print `0`.
- **Never stage `apps/web/next-env.d.ts`.** `next build` and `next dev` flip it between two forms; the committed form is the dev one.
- **No feature changes and no opportunistic API migrations.** Deprecated-but-working APIs such as `manipulateAsync`, `expo-file-system/legacy` and `@expo/vector-icons` stay as they are. They are listed under [Follow-ups](#follow-ups-out-of-scope).
- **The existing test suites are the safety net.** This plan adds no behaviour, so it adds no tests. If a suite fails and the fix changes app code, that fix keeps or adds a test that pins the behaviour, in the same commit.
- Shared-first rules are unaffected. `packages/shared` must not gain any `react-native` or `expo-*` import.
- Mobile styling rules still apply to any code fix: `StyleSheet.create()` only, no inline style objects.
- Docs: adding or moving a doc means updating `docs/INDEX.md` in the same commit. `npm run docs:check` passes before every push.

## Findings (researched 2026-09-17)

### Target versions

These come from `expo@57.0.23/bundledNativeModules.json` and `https://api.expo.dev/v2/versions/latest` (`sdkVersions["57.0.0"]`).

| Package | Now (installed) | SDK 57 |
|---|---|---|
| `expo` | 54.0.37 | `~57.0.23` |
| `react` / `react-dom` | 19.1.4 | `19.2.3` (exact; RN's renderer requires it) |
| `react-native` | 0.81.6 | `0.86.3` |
| `react-test-renderer` | 19.1.4 | `19.2.3` (jest-expo 57 depends on exactly this) |
| `jest-expo` | 54.0.18 | `~57.0.5` |
| `jest` / `@types/jest` | 29.7 / 29.5.14 | unchanged: SDK 57 still lists `~29.7.0` / `29.5.14` |
| `@types/react` | ~19.1.10 | `~19.2.4` or newer within 19.2 |
| `typescript` | 6.0.2 (alias wrapper) | `~6.0.3`; see decision 4 |
| `expo-auth-session` | 7.0.11 | `~57.0.12` |
| `expo-constants` | 18.0.14 | `~57.0.18` |
| `expo-file-system` | 19.0.x | `~57.0.7` |
| `expo-font` | 56.0.5 (peer of vector-icons) + 14.0.12 (nested) | `~57.0.4`; see decision 5 |
| `expo-image` | 3.0.x | `~57.0.5` |
| `expo-image-manipulator` | 14.0.x | `~57.0.18` |
| `expo-image-picker` | 17.0.x | `~57.0.18` |
| `expo-linear-gradient` | 15.0.x | `~57.0.2` |
| `expo-location` | 19.0.x | `~57.0.18` |
| `expo-notifications` | **0.29.14 (the SDK 52 version)** | `~57.0.19` |
| `expo-splash-screen` | not installed | `~57.0.9`; see decision 3 |
| `expo-status-bar` | 3.0.x | `~57.0.1` |
| `expo-web-browser` | 15.0.11 | `~57.0.3` |
| `@react-native-async-storage/async-storage` | 2.2.0 | `2.2.0` |
| `@react-native-community/datetimepicker` | 8.6.0 | `9.1.0` |
| `react-native-gesture-handler` | 2.28.0 | `~2.32.0` |
| `react-native-safe-area-context` | 5.6.2 | `~5.7.0` |
| `react-native-screens` | 4.16.0 | `~4.26.0` |
| `react-native-web` | 0.21.2 | `^0.21.2` |
| `@expo/vector-icons` | 15.1.1 | `^15.0.2` (no change needed) |
| `@babel/core` | 7.29.7 | `^7.29.0` |

Since SDK 55, Expo module versions track the SDK number (`expo-*@57.x`).

### Baseline `expo-doctor` on SDK 54: 15 of 18 checks pass

1. **Metro config:** `"watchFolders" does not contain all entries from Expo's defaults`. `metro.config.js` replaces Expo's monorepo defaults.
2. **Duplicate native modules:** `expo-constants` 18 + 17, `expo-application` 7 + 6, `expo-font` 56 + 14. The old expo-notifications 0.29 drags in the first two. `@expo/vector-icons` pulls in the third through its `expo-font >=14.0.4` peer.
3. **Version mismatches:** `typescript` (~5.9.2 expected, 6.0.2 found), `datetimepicker`, `expo-notifications`, and patch drift on `react` / `react-dom` / `react-native`.

In short, SDK 54 was never fully aligned. This migration fixes all three checks.

### Breaking changes in SDKs 55–57, checked against this codebase

| Change | SDK | Affects us? |
|---|---|---|
| Legacy Architecture removed; `newArchEnabled` removed from app config | 55 | No. `app.json` has no `newArchEnabled`, and Expo Go was already New Architecture. |
| `notification` app-config field removed | 55 | No. Notifications are configured through the `expo-notifications` plugin. |
| expo-notifications: push APIs **throw** in Expo Go on Android (they only warned before) | 55 | Already handled. `registerForPushNotificationsAsync` returns early when `isExpoGo` (`apps/mobile/src/services/notifications.ts:30`). Importing the module only logs `console.warn`. |
| expo-notifications 0.32 removed deprecated function exports | 54 (skipped by us) | No. We use `getPermissionsAsync`, `requestPermissionsAsync`, `getExpoPushTokenAsync` and `setNotificationHandler`, all current. `shouldShowAlert` is deprecated but still typed. |
| `expo-av` removed | 55 | Not used. |
| **Top-level `splash` app-config key removed** (only `web.splash` for PWAs remains) | 56 | **Yes.** `app.json` has a top-level `splash`. Task 3 moves it. |
| `expo/fetch` becomes `globalThis.fetch` (opt out with `EXPO_PUBLIC_USE_RN_FETCH=1`) | 56 | **Possibly.** supabase-js uses the global fetch. See Risks; the device smoke test in Task 7 covers it. |
| `expo-file-system` `copy()` / `move()` become async | 56 | No. Neither is called. `new File(uri).arrayBuffer()` and `expo-file-system/legacy` `readAsStringAsync` are unchanged, and `/legacy` is still exported in 57.0.7. |
| `expo` no longer depends on `@expo/vector-icons`, which is deprecated for `@react-native-vector-icons/*` | 56 | No. It is already a direct dependency. The replacement is a follow-up. |
| iOS minimum 16.4, Xcode 26.4 | 56 | Only for native builds, which this plan does not produce. |
| RN 0.86 "intended to have no breaking changes from 0.85" | 57 | No. |
| datetimepicker 9.0 removes `positiveButtonLabel` / `negativeButtonLabel` / `neutralButtonLabel` | 57 | No. `CreateEventScreen.tsx:613` passes none of them. |
| `manipulateAsync` deprecated | 52+ | Still exported in 57.0.18. Stays; follow-up. |
| `expo/src/launch/registerRootComponent` deep import (`apps/mobile/index.js`) | n/a | Still resolves in 57.0.23. Stays; follow-up. |
| Config plugin options for `expo-location`, `expo-image-picker`, `expo-notifications` | n/a | Every option in `app.json` still exists in the 57 plugin types. |
| Node minimum ^20.19.4 / ^22.13.0 / ^24.3.0 | 55 | OK: root `engines` is `>=22`, CI and local run Node 24. |

### Other facts the plan relies on

- `react-native-keyboard-aware-scroll-view` is in `dependencies` but nothing imports it. Removing it is cheaper than checking it against RN 0.86.
- React 19.2 changed the `useId` format. No web or mobile test matches on generated ids (a grep for `«`, `_r_` and `:r0:` in `apps/` and `packages/` finds nothing).
- No ESLint rule reports deprecated APIs (`no-deprecated` is off), so the deprecated calls do not fail lint.
- `@testing-library/react-native@13.3.3` peers are `react >=18.2.0` and `react-test-renderer >=18.2.0`, so 13 stays. `jest.setup.ts`'s RNTL 13 + React 19 cleanup workaround stays.
- jest-expo 57 has a new required peer, `@react-native/jest-preset@^0.86.3`. npm installs required peers automatically.
- The Maestro flows target `appId: us.nepally.app`, which exists only in a native build. They cannot run against Expo Go.
- The assets in `apps/mobile/assets/` are 1×1 placeholder PNGs, so the splash change has no visual impact yet.

## Decisions made while planning

1. **Jump straight from 54 to 57 instead of one SDK at a time.** Expo usually recommends single-SDK steps so breakage is easy to pin down. Here the only device runtime is store Expo Go, which runs only SDK 57, so SDKs 55 and 56 could only be checked by the automated suites. Every 55–57 breaking change was checked against the code above, and the app's native surface is small: image picker, image manipulator, file system, location, notifications, auth session and datetimepicker. **Fallback:** if Task 6 or Task 7 hits a failure that cannot be traced to a cause, reset to Task 2's parent commit and redo Task 2 twice, first at `expo@~55` and then at `expo@~56` (take versions from `bundledNativeModules.json` of `expo@55.0.31` / `expo@56.0.22`), running Task 6 after each.
2. **Edit `package.json` files by hand and regenerate the lockfile with npm 12, instead of running `npx expo install expo@^57 --fix`.** `expo install` runs the local npm 11, which corrupts the lockfile. It would also hit `EOVERRIDE`, because the root `overrides` pin React at 19.1.4 while it writes 19.2.3. The table above is the complete target, and `expo-doctor` confirms it in Task 5.
3. **Move `splash` into the `expo-splash-screen` config plugin and add `expo-splash-screen` as a dependency.** SDK 56 removed the top-level key. The plugin needs the package installed to resolve, and `expo` does not depend on it.
4. **Add `typescript` to `expo.install.exclude` in `apps/mobile/package.json`.** The `typescript` package name is the `@typescript/typescript6` alias wrapper (see TECH-VERSIONS). Its own version is 6.0.2 and has no newer release, so `expo-doctor` would always report it against SDK 57's `~6.0.3`. The real compiler behind it tracks `typescript@^6`, and TS 7 does the actual type-checking.
5. **Add `expo-font` as a direct dependency (`~57.0.4`).** Otherwise npm keeps satisfying `@expo/vector-icons`' `expo-font >=14.0.4` peer with the stale root copy (56.0.5) and nests the SDK copy under `expo`. That is the duplicate `expo-doctor` flags. It is also the documented setup since SDK 56, when `expo` stopped providing vector icons.
6. **Pin `react-native` exactly (`0.86.3`).** The `^0.81.5` caret let it drift to 0.81.6, which `expo-doctor` flagged.
7. **Stay on jest 29.** jest-expo 57.0.5 still depends on `babel-jest`, `@jest/globals` and `jest-environment-jsdom` `^29.2.1`, and SDK 57 lists `jest ~29.7.0`. The jest 30 row stays in Deferred Upgrades with a corrected reason.
8. **Web moves to React 19.2.3 in the same PR.** This is forced by the exact monorepo pin. Next 16 and Mantine 8.3 accept React 19.2, and the web unit, e2e and visual suites in CI are the check. The Mantine 9 upgrade is unblocked but stays a separate PR (see the web UI overhaul plan, "After the overhaul — Mantine 9").

## Decisions made during implementation

Record every deviation from this plan here, with the reason.

1. **Task 2, Step 5 is pending: the ESLint `settings.react.version` lines still say `19.1.4`.** A config-protection PreToolUse hook blocks every Edit/Write to files named `eslint.config.mjs`, and the agent did not work around it. The user decides whether to make the two one-line edits by hand, lift the hook for them, or leave them. The setting only tells eslint-plugin-react which React version to assume, and no rule result differs between 19.1 and 19.2.
2. **Task 2, Step 9's grep false-positives** on `@tabler/icons-react`, `@floating-ui/react-dom` and `@testing-library/react`, because the pattern is not anchored. An anchored scan of `package-lock.json` (every `packages` key ending in `node_modules/react` or `node_modules/react-dom`) found exactly one of each, at 19.2.3.
3. **`@react-native-async-storage/async-storage` `2.2.0` and `@react-native-community/datetimepicker` `9.1.0` are exact pins on purpose.** SDK 57's `bundledNativeModules.json` lists both without a range, so any patch drift would show up as an `expo-doctor` version mismatch. Bump them only with the next SDK.
4. **npm 12 blocks the `esbuild` and `unrs-resolver` postinstall scripts** (`install-scripts ... not covered by allowScripts`). This comes from npm 12's own install-script gating, not repo config, and those versions did not change. Their platform binaries (`@esbuild/win32-x64`, `@unrs/resolver-binding-win32-x64-msvc`) are installed and both packages load, so nothing breaks.
5. **React Native 0.86 removed `StyleSheet.absoluteFillObject`, which the audit missed.** Type-check caught 9 sites in 6 mobile files. At runtime the value is `undefined`, and spreading `undefined` or putting it in a style array fails silently, so all unit tests still passed while media overlays, the lightbox and sheet backdrops, the upload and menu overlays, and the reaction-dismiss layer lost `position: 'absolute'`. Fixed in 5750bd8 with `StyleSheet.absoluteFill`. The two inline `{ zIndex: 10 }` styles moved into `StyleSheet.create`. Regression tests pin the ReportPostSheet backdrop and the PostCard and PostDetailScreen reaction-dismiss overlays (d36acfd); each was seen failing without the fix. No other `StyleSheet` member the app uses was removed.
6. **The local web e2e first failed 101/101 for an environmental reason:** `@playwright/test` 1.63.0 (unchanged by this branch) needs chromium-headless-shell build 1243, and the machine only had 1223. `npx playwright install chromium` fixed it, and then all 101 passed on React 19.2.3.
7. **Task 8: two additions, and one stale line the plan missed.** TECH-VERSIONS' Expo SDK 57 section gained a `StyleSheet.absoluteFillObject` bullet (decision 5). The Web table's Mantine row still said "9.x waits for React 19.2"; it was fixed in 3a243cf. The web-UI-overhaul plan's lines 2839 and 2855 still say the same, but they are fenced records of text that completed PR 1 Task 1.6 wrote, so they stay as history. The setup guide has no `playwright install` step to annotate.
8. **`master` moved during implementation.** PR #68 (react-navigation 7.4.1 / 7.19.2 / core 7.22.1, which clears `decode-uri-component`) conflicted in `package-lock.json`. Merged in 6fa1792 by taking master's lockfile and re-running `npx -y npm@12 install`, which kept both the SDK 57 versions and the security bump. Re-verified afterwards: libc 0; one React; all expo-* on 57.x; type-check, lint (135/39/0), test:ci (523/768/514/12) and expo-doctor 21/21 all pass.

## Live tracker

One task is `In Progress` at a time. Update this table when a task starts and when it finishes.

| Task | Title | Status | Last updated | Notes |
|---|---|---|---|---|
| 1 | Baseline on SDK 54 | Completed | 2026-09-17 | type-check pass; lint 0 errors, warnings mobile 135 / web 39 / shared 0; test:ci mobile 520, web 768, shared 514, guards 12 all pass; expo-doctor 15/18 (the 3 Findings failures) |
| 2 | Move the monorepo to SDK 57 versions and React 19.2.3 | Completed (except Step 5) | 2026-09-17 | 15ea9b6; spec ✅, quality ✅; Step 5 (ESLint react.version) pending, see decision 1 |
| 3 | Move the splash config to the `expo-splash-screen` plugin | Completed | 2026-09-17 | be62548; spec ✅, quality ✅; introspect generates Android `splashscreen_background` #1565C0 and the iOS SplashScreen storyboard |
| 4 | Let Expo configure Metro for the monorepo | Completed | 2026-09-18 | 0f0c66c; spec ✅, quality ✅; Android + iOS `expo export` bundle cleanly (1511 / 1505 modules) with `packages/shared` code present; block list still prunes `apps/web` from the crawl |
| 5 | `expo-doctor` reports no issues | Completed | 2026-09-18 | `21/21 checks passed. No issues detected!` (baseline was 15/18); no changes needed |
| 6 | Automated gates: types, lint, unit, coverage, web build + e2e | Completed | 2026-09-18 | Fix 5750bd8 + test d36acfd (decision 5). Final: type-check pass; lint 0 errors, warnings 135/39/0 (= baseline); unit mobile 523, web 768, shared 514, guards 12; coverage thresholds met; web e2e 101/101 (decision 6) |
| 7 | Device smoke test in Expo Go SDK 57 | In Progress | 2026-09-18 | Waiting on the user's device run |
| 8 | Update the docs | Completed | 2026-09-18 | 066ffd2 + 3a243cf; spec ✅, quality ✅ (decision 7) |
| 9 | Close out the plan and ready the PR | Not Started | 2026-09-17 | |

## Files

| Path | Change | Responsibility |
|---|---|---|
| `package.json` (root) | Modify | React `overrides` 19.1.4 → 19.2.3 |
| `package-lock.json` | Regenerate (npm 12) | Resolved SDK 57 tree |
| `apps/mobile/package.json` | Modify | SDK 57 versions, add `expo-font` + `expo-splash-screen`, drop `react-native-keyboard-aware-scroll-view`, `expo.install.exclude` |
| `apps/web/package.json` | Modify | `react` / `react-dom` 19.2.3 |
| `eslint.config.mjs` | Modify | `settings.react.version` 19.2.3 |
| `apps/web/eslint.config.mjs` | Modify | `settings.react.version` 19.2.3 |
| `apps/mobile/app.json` | Modify | `splash` → `expo-splash-screen` plugin |
| `apps/mobile/metro.config.js` | Modify | Keep Expo's monorepo defaults; keep the `apps/web` block |
| `TECH-VERSIONS.md` | Modify | Versions, rationale, deferred upgrades, troubleshooting |
| `README.md`, `CLAUDE.md` | Modify | "Expo 54" / React 19.1.4 mentions |
| `apps/mobile/README.md`, `apps/web/README.md` | Modify | Tech stack lines |
| `docs/guides/setup-and-testing.md` | Modify | Expo Go SDK-match note |
| `docs/architecture/web-ui-system.md` | Modify | Mantine 9 is unblocked |
| `docs/plans/active/2026-09-14-web-ui-overhaul.md` | Modify | React pin constraint 19.1.4 → 19.2.3 |
| `docs/INDEX.md` | Modify | This plan's entry (added now, moved to archive in Task 9) |

No app source file changes are planned. If Task 6 or 7 forces one, add it to this table under "Decisions made during implementation".

---

### Task 1: Baseline on SDK 54

**Files:** none.

- [ ] **Step 1: Confirm the branch and a clean tree**

```bash
git branch --show-current
git status --short
```

Expected: `chore/expo-sdk-57`. The status may list only `apps/web/next-env.d.ts`, which is pre-existing churn that is never staged. Anything else must be committed or stashed first.

- [ ] **Step 2: Prove the suites are green before anything moves**

```bash
npm run type-check && npm run lint && npm run test:ci
```

Expected: all three pass. If anything fails on SDK 54, stop. That failure belongs in a separate fix on its own branch, not in this migration.

Write the lint warning total (the `✖ N problems` line, or `0`) into the Task 1 row's Notes. Task 6 compares against it.

- [ ] **Step 3: Record the doctor baseline**

```bash
cd apps/mobile && npx -y expo-doctor@latest; cd ../..
```

Expected: `15/18 checks passed. 3 checks failed.`, with the same three failures listed in Findings. Anything new goes into "Decisions made during implementation" before continuing.

No commit.

---

### Task 2: Move the monorepo to SDK 57 versions and React 19.2.3

All of these edits land in one commit. npm cannot install a state where the React override and a workspace's React disagree.

**Files:**
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`
- Modify: `eslint.config.mjs:59`
- Modify: `apps/web/eslint.config.mjs:46`
- Regenerate: `package-lock.json`

- [ ] **Step 1: Confirm `react-native-keyboard-aware-scroll-view` is unused**

```bash
grep -rln "keyboard-aware" apps/mobile/App.tsx apps/mobile/index.js apps/mobile/src apps/mobile/jest.setup.ts
```

Expected: no output. If a file shows up, keep the package and drop it from the Step 4 block.

- [ ] **Step 2: Root overrides**

In `package.json`, change the two React lines of `overrides`:

```json
  "overrides": {
    "react": "19.2.3",
    "react-dom": "19.2.3",
```

Leave the rest of `overrides` unchanged.

- [ ] **Step 3: Web React**

In `apps/web/package.json`:

```json
    "react": "19.2.3",
    "react-dom": "19.2.3"
```

`@types/react` (`^19.2.14`) and `@types/react-dom` (`^19.2.3`) already match.

- [ ] **Step 4: Mobile dependencies**

In `apps/mobile/package.json`, replace the `dependencies` and `devDependencies` objects with the following and add the `expo` block after them. `name`, `version`, `main`, `scripts` and `private` stay as they are.

```json
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@nepally/shared": "*",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/datetimepicker": "9.1.0",
    "@react-navigation/bottom-tabs": "^7.18.18",
    "@react-navigation/native": "^7.3.18",
    "@react-navigation/native-stack": "^7.18.10",
    "@supabase/supabase-js": "^2.95.3",
    "expo": "~57.0.23",
    "expo-auth-session": "~57.0.12",
    "expo-constants": "~57.0.18",
    "expo-file-system": "~57.0.7",
    "expo-font": "~57.0.4",
    "expo-image": "~57.0.5",
    "expo-image-manipulator": "~57.0.18",
    "expo-image-picker": "~57.0.18",
    "expo-linear-gradient": "~57.0.2",
    "expo-location": "~57.0.18",
    "expo-notifications": "~57.0.19",
    "expo-splash-screen": "~57.0.9",
    "expo-status-bar": "~57.0.1",
    "expo-web-browser": "~57.0.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-web": "^0.21.2"
  },
  "devDependencies": {
    "@babel/core": "^7.29.0",
    "@testing-library/react-native": "^13.3.3",
    "@types/jest": "^29.5.14",
    "@types/react": "~19.2.14",
    "@typescript/native": "npm:typescript@^7.0.2",
    "jest": "^29.7.0",
    "jest-expo": "~57.0.5",
    "react-test-renderer": "19.2.3",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  },
  "expo": {
    "install": {
      "exclude": [
        "typescript"
      ]
    }
  },
```

- [ ] **Step 5: ESLint's React version setting**

In `eslint.config.mjs` (line 59) and `apps/web/eslint.config.mjs` (line 46), change:

```js
      react: { version: '19.1.4' },
```

to:

```js
      react: { version: '19.2.3' },
```

The comment above the root setting ("Keep in step with the react version in package.json") explains why.

- [ ] **Step 6: Regenerate the lockfile with npm 12**

From the repo root:

```bash
npx -y npm@12 install
```

Expected: exits 0. An `EBADENGINE` warning about Node ^24.15.0 is fine. `EOVERRIDE` means a React version was missed in Steps 2–4. `ERESOLVE` means a peer range conflict: read the package it names, fix that version in Step 4 from the Findings table, and re-run. Never use `--legacy-peer-deps` or `--force`.

- [ ] **Step 7: Check the lockfile kept its npm 12 fields**

```bash
git diff package-lock.json | grep -c '^-.*"libc"'
```

Expected: `0`.

- [ ] **Step 8: Check the resolved versions**

```bash
node -e "for (const p of ['react','react-dom','react-native','expo','expo-notifications','expo-font','expo-splash-screen','jest-expo','react-test-renderer','@react-native/jest-preset','@react-native-community/datetimepicker']) { let v; try { v = require('./node_modules/' + p + '/package.json').version } catch { v = 'MISSING' } console.log(p.padEnd(40), v) }"
```

Expected: `react` and `react-dom` `19.2.3`, `react-native` `0.86.3`, `expo` `57.0.x`, `expo-notifications` `57.0.x`, `expo-font` `57.0.x`, `expo-splash-screen` `57.0.x`, `jest-expo` `57.0.x`, `react-test-renderer` `19.2.3`, `@react-native/jest-preset` `0.86.x`, datetimepicker `9.1.0`. Nothing may print `MISSING`.

- [ ] **Step 9: Check there is exactly one React**

```bash
npm ls react react-dom --all 2>&1 | grep -E "react(-dom)?@[0-9]" | grep -v "19.2.3"
```

Expected: no output. Any line means a second React copy, which fails at runtime with `Incompatible React versions` on mobile or an invalid hook call on web.

- [ ] **Step 10: Commit**

The suites run in Task 6, and this commit may still be red.

```bash
git add package.json package-lock.json apps/mobile/package.json apps/web/package.json eslint.config.mjs apps/web/eslint.config.mjs
git diff --cached package-lock.json | grep -c '^-.*"libc"'
git commit -m "chore(deps): upgrade Expo SDK 54 to 57 and React 19.1.4 to 19.2.3" -m "React Native 0.81.6 -> 0.86.3, jest-expo 57, expo-* on SDK-aligned 57.x versions. expo-notifications jumps from the stale SDK 52 line (0.29) to 57. Adds expo-font (dedupes the vector-icons peer) and expo-splash-screen (splash plugin); drops the unused react-native-keyboard-aware-scroll-view. Web follows the monorepo React pin. Lockfile regenerated with npm 12." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

The `grep -c` line must print `0` before the commit.

---

### Task 3: Move the splash config to the `expo-splash-screen` plugin

**Files:**
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Remove the top-level `splash` block**

Delete these lines from `apps/mobile/app.json`:

```json
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1565C0"
    },
```

- [ ] **Step 2: Add the plugin entry**

Append this entry to the end of the `plugins` array, after the `expo-notifications` entry, with a comma after that entry's closing `]`:

```json
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#1565C0"
        }
      ]
```

`imageWidth` 200 is the value Expo's templates use. The current asset is a 1×1 placeholder, so revisit the value when real artwork lands.

- [ ] **Step 3: Verify every config plugin evaluates**

```bash
cd apps/mobile && npx expo config --type introspect > "$TEMP/nepally-expo-introspect.json" && echo "introspect OK"; cd ../..
```

Expected: `introspect OK`. This runs every plugin's config mods (splash, notifications, location, image picker) without writing native folders. It is the closest check to a native build that this plan runs.

- [ ] **Step 4: Verify `splash` is gone and the plugin is registered**

```bash
cd apps/mobile && npx expo config --type public --json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const c=JSON.parse(d);console.log('top-level splash:', 'splash' in c);console.log('splash plugin:', JSON.stringify(c.plugins).includes('expo-splash-screen'))})"; cd ../..
```

Expected:

```
top-level splash: false
splash plugin: true
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app.json
git commit -m "fix(mobile): move splash config into the expo-splash-screen plugin" -m "SDK 56 removed the top-level splash key from the app config schema." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Let Expo configure Metro for the monorepo

Since SDK 52, `expo/metro-config` detects npm workspaces and sets `watchFolders` and `resolver.nodeModulesPaths` itself. The hand-written values replace Expo's defaults, and that is the Metro check `expo-doctor` fails. The `apps/web` block list stays, because it stops Metro from crawling `.next` build output.

**Files:**
- Modify: `apps/mobile/metro.config.js`

- [ ] **Step 1: Replace the file**

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Expo detects the npm workspace and sets watchFolders and nodeModulesPaths
// for the monorepo itself. Overriding them drops Expo's defaults.
const config = getDefaultConfig(projectRoot);

// Exclude the web app (especially .next build artifacts) from Metro's file watcher
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`${escapeRegex(path.resolve(workspaceRoot, 'apps', 'web'))}[\\\\/].*`),
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
```

The block list is now appended to Expo's default instead of replacing it.

- [ ] **Step 2: Bundle both platforms to prove resolution still works**

```bash
cd apps/mobile && npx expo export --platform android --output-dir "$TEMP/nepally-export-android" && npx expo export --platform ios --output-dir "$TEMP/nepally-export-ios" && echo "export OK"; cd ../..
```

Expected: `export OK`. Metro resolves `@nepally/shared` from `packages/shared` and every `expo-*` module, and no `Unable to resolve module` errors appear. The export reads `EXPO_PUBLIC_SUPABASE_*` from `apps/mobile/.env`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/metro.config.js
git commit -m "fix(mobile): keep Expo's monorepo Metro defaults" -m "expo/metro-config sets watchFolders and nodeModulesPaths for npm workspaces; overriding them failed expo-doctor's Metro check. The apps/web block list is kept and now appended to Expo's default." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `expo-doctor` reports no issues

**Files:** only if a check fails: `apps/mobile/package.json`, `package-lock.json`.

- [ ] **Step 1: Run the doctor**

```bash
cd apps/mobile && npx -y expo-doctor@latest; cd ../..
```

Expected: every check passes (`18/18 checks passed. No issues detected!` with today's doctor; the count may change between doctor releases).

- [ ] **Step 2: Resolve anything it still reports**

- **"packages match versions":** set each listed package in `apps/mobile/package.json` to the version in the doctor's `expected` column, run `npx -y npm@12 install`, then check `libc` as in Task 2 Step 7. `typescript` must not appear, because it is excluded (decision 4). If it does, the `expo.install.exclude` block is misplaced.
- **Duplicate native modules:** run `npm ls <module> --all` to find which package holds the second copy. If it is a peer range like `expo-font`, add the module to `apps/mobile/package.json` at its SDK 57 version from `bundledNativeModules.json`, and re-install with npm 12.
- **Metro config:** re-read Task 4. `watchFolders` and `nodeModulesPaths` must not be assigned anywhere in `metro.config.js`.

Re-run Step 1 until it is clean.

- [ ] **Step 3: Commit (only if Step 2 changed files)**

```bash
git add apps/mobile/package.json package-lock.json
git diff --cached package-lock.json | grep -c '^-.*"libc"'
git commit -m "chore(mobile): align remaining packages with Expo SDK 57" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Automated gates: types, lint, unit, coverage, web build + e2e

**Files:** only the ones a failing gate forces you to fix. Record each one in "Decisions made during implementation".

- [ ] **Step 1: Type-check every workspace**

```bash
npm run type-check
```

Expected: exits 0. Known candidates if it fails:
- `@types/react` 19.2 or RN 0.86 typings tightened a prop type. Fix the call site to the new type; never add `any` (the `guard-no-catch-any` lint guard forbids it).
- An `expo-*` type moved. Import it from the path the package's `build/index.d.ts` now exports.

- [ ] **Step 2: Lint and lint guards**

```bash
npm run lint && npm run lint:guards
```

Expected: exits 0 with the same warning count as the Task 1 baseline. `eslint-plugin-react-hooks` 7 may report new React Compiler findings for React 19.2. Log them in `docs/plans/active/react-compiler-lint-cleanup.md` instead of fixing them here, unless they are errors.

- [ ] **Step 3: Unit tests, CI mode**

```bash
npm run test:ci
```

Expected: mobile (jest-expo 57), web (Vitest) and shared all pass. Known candidates:
- `Cannot find module '@react-native/jest-preset'`: the peer was not installed. Add `"@react-native/jest-preset": "0.86.3"` to mobile `devDependencies` and re-install with npm 12.
- Hanging mobile tests: the RNTL cleanup workaround in `apps/mobile/jest.setup.ts` must stay. Follow the repo rule of `await act(async () => {})` after `render`. Never raise `testTimeout`.
- `transformIgnorePatterns` misses a new scoped package (for example `@react-native/*` helpers). The existing `@react-native(-community)?` alternative covers `@react-native/`, so extend the regex in `apps/mobile/jest.config.js` only for the package the error names.

- [ ] **Step 4: Coverage, CI mode**

```bash
npm run test:coverage:ci
```

Expected: thresholds met in all three workspaces.

- [ ] **Step 5: The full local CI gate (web production build + Playwright e2e included)**

```bash
npm run ci:local
```

Expected: `CI local run` finishes without `failed at step`. Afterwards run `git status --short`. If `apps/web/next-env.d.ts` changed, leave it unstaged.

- [ ] **Step 6: Commit any fixes**

Make one commit per root cause, using the `fix(mobile): …` / `fix(web): …` form, and include the test that pins each fix. Skip this step if nothing changed.

---

### Task 7: Device smoke test in Expo Go SDK 57

The automated suites mock every native module. This task is the only check of the real modules, of `expo/fetch` as the global fetch, and of React 19.2 on a device.

**Files:** this plan (tracker and decisions) only, unless a flow fails.

- [ ] **Step 1: Put store Expo Go on the device**

On Android, install or update **Expo Go** from the Play Store. If you sideloaded the SDK 54 build and the Play Store offers no update over it, uninstall it first. Re-enable auto-update if you turned it off. Open Expo Go → Settings and confirm the supported SDK is 57.

- [ ] **Step 2: Start Metro**

```bash
npm run mobile
```

Scan the QR code with Expo Go. Expected: the app loads with no red screen and no `Incompatible React versions` error. One yellow `expo-notifications functionality is not fully supported in Expo Go` warning in the terminal is expected.

- [ ] **Step 3: Walk the flows that exercise each native module**

| # | Flow | Exercises | Pass when |
|---|---|---|---|
| 1 | Sign in with email | supabase-js auth over `expo/fetch`, AsyncStorage session | Lands on the feed; kill and reopen Expo Go and you are still signed in |
| 2 | Sign in with Google | `expo-auth-session`, `expo-web-browser` | Browser opens, returns to the app signed in |
| 3 | Onboarding location step (new account) or the location switcher | `expo-location` permission + fix | Permission prompt appears; metro is resolved |
| 4 | Scroll the feed, open a post, like, comment | supabase REST over `expo/fetch`, `expo-image`, `expo-linear-gradient` | Images and gradients render; like and comment persist after pull-to-refresh |
| 5 | Create a post with a photo | `expo-image-picker` (`mediaTypes: ['images']`), `expo-file-system/legacy` base64 read, storage upload | Post appears with its photo |
| 6 | Create an event with a photo, date and time | `@react-native-community/datetimepicker` 9, legacy file-system read | Pickers open and close; the event saves with the chosen date and time |
| 7 | Create a marketplace listing with a photo | `expo-image-manipulator` `manipulateAsync`, `File#arrayBuffer` upload | Listing shows the compressed photo |
| 8 | Edit profile photo: camera, then library | `launchCameraAsync`, `manipulateAsync`, `File#arrayBuffer` | New avatar shows on the profile |
| 9 | Open a chat and send a message from a second account | Supabase Realtime (WebSocket) | Message arrives without a refresh |
| 10 | Sign out | push registration was skipped (`isExpoGo`) | No red screen and no uncaught `expo-notifications` error at any point |

If flows 1, 4, 5, 7 or 8 fail with a network or upload error that the same account does not produce on web, suspect `expo/fetch`. Add `EXPO_PUBLIC_USE_RN_FETCH=1` to `apps/mobile/.env`, restart Metro with `npx expo start -c`, and retry. If that fixes it, record the finding and the flag under "Decisions made during implementation", and add the variable to the setup guide's env list in Task 8.

- [ ] **Step 4: Record the result**

Put the pass/fail per flow in the Task 7 row of the Live tracker. A failed flow is fixed on this branch under the Task 6 Step 6 rules before moving on.

- [ ] **Step 5: Commit the tracker update**

```bash
git add docs/plans/active/2026-09-17-expo-sdk-57-migration.md
git commit -m "docs(plan): record Expo SDK 57 device smoke test" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

The Maestro flows (`npm run test:e2e:mobile`) target `us.nepally.app` and need a native build, so they are not part of this task.

---

### Task 8: Update the docs

**Files:**
- Modify: `TECH-VERSIONS.md`
- Modify: `README.md:41,46`
- Modify: `CLAUDE.md:14`
- Modify: `apps/mobile/README.md:105-107,115`
- Modify: `apps/web/README.md:7,29`
- Modify: `docs/guides/setup-and-testing.md` (after "### Test on Physical Device (Easiest):")
- Modify: `docs/architecture/web-ui-system.md:106`
- Modify: `docs/plans/active/2026-09-14-web-ui-overhaul.md:16,23,10228`

- [ ] **Step 1: `TECH-VERSIONS.md`**

Set `**Last Updated:**` to the day of the change. Then make these replacements:

Core table:

```markdown
| **react** | 19.2.3 | Both mobile & web | Unified version across platforms; exact match required by React Native 0.86.3 |
| **react-dom** | 19.2.3 | Web only | Matches React version |
```

Mobile table:

```markdown
| **react-native** | 0.86.3 | Ships with Expo SDK 57 |
| **expo** | ~57.0.23 | Latest stable (SDK 57) |
```

Web table `next` row notes: `Turbopack; works with React 19.2.3`.

Testing Stack table:

```markdown
| **jest** | ^29.7.0 | apps/mobile | Unit test runner for mobile (jest-expo 57 still depends on jest 29) |
| **jest-expo** | ~57.0.5 | apps/mobile | Expo preset for Jest |
```

Replace the section `### React 19.1.4 (Both Mobile & Web — exact pin)` with:

```markdown
### React 19.2.3 (Both Mobile & Web — exact pin)
- **Decision Date:** 2026-02-12 (19.1.4); moved to 19.2.3 with the Expo SDK 57 migration
- **Reason:** Both mobile and web use the exact same React version to avoid workspace conflicts and duplicate-React issues. Enforced via root `overrides`.
- **Why exact:** React Native bundles its own `react-native-renderer` and enforces an **exact** React version match at runtime (`Incompatible React versions` error). React Native 0.86.3 ships renderer 19.2.3. Change React only together with an Expo SDK upgrade, to that SDK's `facebookReactVersion` (see `https://api.expo.dev/v2/versions/latest`).
```

In the Next.js section, change `against the pinned React 19.1.4` to `against the pinned React 19.2.3`.

Replace the section `### Expo 54.0 (Not 53.x or earlier)` with:

```markdown
### Expo SDK 57 (upgraded from 54)
- **Reason:** Expo Go in the app stores only runs the latest SDK; SDK 54 stopped opening in store Expo Go.
- **Ships:** React Native 0.86.3, React 19.2.3. Expo modules now use SDK-aligned versions (`expo-*@57.x`).
- **App config:** the splash screen is configured through the `expo-splash-screen` plugin in `app.json` (SDK 56 removed the top-level `splash` key).
- **`expo.install.exclude: ["typescript"]`** in `apps/mobile/package.json`: the `typescript` alias wrapper reports 6.0.2 while SDK 57 expects `~6.0.3`; see the TypeScript row above.
- **Global fetch:** since SDK 56, `expo/fetch` is `globalThis.fetch` (supabase-js uses it). Opt out with `EXPO_PUBLIC_USE_RN_FETCH=1` if a network regression shows up.
- **Plan:** `docs/archive/plans/2026-09-17-expo-sdk-57-migration.md`
```

Replace the Deferred Upgrades table with:

```markdown
| Upgrade | Blocked by / Reason |
|---------|---------------------|
| **Mantine 9** | Unblocked by React 19.2.3; ships as its own PR after the web UI overhaul (see that plan's "After the overhaul — Mantine 9") |
| **jest / @types/jest 30** | jest-expo 57 still depends on jest 29 (`babel-jest`, `@jest/globals` `^29.2.1`); moves when a jest-expo release does |
```

In Version Update Policy, change `Example: the Expo SDK 54 → 56 migration (see Deferred Upgrades)` to `Example: the Expo SDK 54 → 57 migration`.

In "Package.json Configuration", update the three code blocks: root `overrides` to `"react": "19.2.3"` / `"react-dom": "19.2.3"`, the sentence below it to `React 19.2.3`, mobile to `"react": "19.2.3"`, `"react-native": "0.86.3"`, `"expo": "~57.0.23"`, and web to `"react": "19.2.3"`, `"react-dom": "19.2.3"`.

Replace the troubleshooting entry `### Symptom: "Incompatible React versions" at runtime (mobile)` body with:

```markdown
**Cause:** React was bumped away from the version React Native's bundled
`react-native-renderer` requires (19.2.3 for React Native 0.86.3).

**Solution:** Keep React pinned at 19.2.3 (root `overrides`). Change it only as
part of an Expo SDK upgrade, to that SDK's React version.
```

In References, replace the Expo 54 and React Native 0.81 lines with:

```markdown
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [React Native blog (0.86 release notes)](https://reactnative.dev/blog)
```

- [ ] **Step 2: `README.md` and `CLAUDE.md`**

`README.md`: `| **Mobile App** | React Native (Expo 57) |` and `| **React** | 19.2.3 (unified) |`.

`CLAUDE.md` line 14: `React Native (Expo 54)` → `React Native (Expo 57)`.

- [ ] **Step 3: App READMEs**

`apps/mobile/README.md` Tech Stack:

```markdown
- **React**: 19.2.3
- **React Native**: 0.86.3
- **Expo**: SDK 57
```

and the note: `> **Note:** Both mobile and web apps use React 19.2.3 for consistency across the monorepo.`

`apps/web/README.md`: `- **React:** 19.2.3`, and replace the note with:

```markdown
> **Note:** React is pinned to exactly **19.2.3** across the monorepo (root `overrides`) because React Native 0.86.3 requires an exact React match. Do not bump React independently — it moves only with an Expo SDK upgrade. See [TECH-VERSIONS.md](../../TECH-VERSIONS.md).
```

- [ ] **Step 4: Setup guide: the Expo Go SDK match**

In `docs/guides/setup-and-testing.md`, insert after step 3 (`**App loads on your device** with hot reload!`) of "### Test on Physical Device (Easiest):":

```markdown
> **Expo Go must match the project's Expo SDK (57).** The stores only carry Expo Go for the newest SDK. If Expo Go reports "Project is incompatible with this version of Expo Go", the phone and the project are on different SDKs. Either upgrade the project, or install the matching Expo Go from https://expo.dev/go and turn off store auto-update for it until the project catches up.
>
> **Push notifications do not work in Expo Go.** On Android the push APIs throw there, so the app skips push registration in Expo Go (`apps/mobile/src/services/notifications.ts`). Test push in a development or preview build.
```

If Task 7 needed `EXPO_PUBLIC_USE_RN_FETCH=1`, add it to the mobile env variables list in the same guide with a one-line reason.

- [ ] **Step 5: `docs/architecture/web-ui-system.md`**

Line 106 becomes:

```markdown
React 19.2.3 landed with the Expo SDK 57 migration, so the upgrade is unblocked; it ships as its own PR. When it happens, also set `<Notifications pauseResetOnHover="notification" />`.
```

- [ ] **Step 6: The web UI overhaul plan's React constraint**

In `docs/plans/active/2026-09-14-web-ui-overhaul.md`:
- Line 16 (Tech Stack): `React 19.1.4` → `React 19.2.3`.
- Line 23: `React stays at exactly \`19.1.4\`.` → `React stays at exactly \`19.2.3\` (the Expo SDK 57 pin).` Keep the Mantine sentences.
- Line 10228: `This is a separate PR, created once the Expo 54 → 56+ migration lands React 19.2+:` → `This is a separate PR. The Expo SDK 57 migration landed React 19.2.3, so it is unblocked:`.

- [ ] **Step 7: Check the docs**

```bash
npm run docs:check && npm run docs:test
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add TECH-VERSIONS.md README.md CLAUDE.md apps/mobile/README.md apps/web/README.md docs/guides/setup-and-testing.md docs/architecture/web-ui-system.md docs/plans/active/2026-09-14-web-ui-overhaul.md
git commit -m "docs: record the Expo SDK 57 and React 19.2.3 upgrade" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Close out the plan and ready the PR

**Files:**
- Move: `docs/plans/active/2026-09-17-expo-sdk-57-migration.md` → `docs/archive/plans/2026-09-17-expo-sdk-57-migration.md`
- Modify: `docs/INDEX.md`

- [ ] **Step 1: Finish the tracker**

Every row is `Completed` with today's date. "Decisions made during implementation" lists every deviation, or says `None.`

- [ ] **Step 2: Mark implemented and archive**

Set `status: implemented` in the frontmatter, then:

```bash
git mv docs/plans/active/2026-09-17-expo-sdk-57-migration.md docs/archive/plans/2026-09-17-expo-sdk-57-migration.md
```

- [ ] **Step 3: Update the index**

In `docs/INDEX.md`, delete this plan's line from "## Plans". In "## Archive", change `17 completed or abandoned plans` to `18 completed or abandoned plans`, and change the list's ending `and the Postgres 15→17 sync` to `the Postgres 15→17 sync, and the Expo SDK 54→57 migration`.

- [ ] **Step 4: Check and commit**

```bash
npm run docs:check
git add docs/INDEX.md docs/archive/plans/2026-09-17-expo-sdk-57-migration.md
git commit -m "docs(plan): archive the Expo SDK 57 migration plan" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Push and mark the PR ready**

```bash
git branch --show-current
git push
gh pr ready
```

The branch must be `chore/expo-sdk-57`. Update the PR body so the Testing section ticks every workspace run, and add the Task 7 flow results. CI must be green, including the `Web visual regression` job, where React 19.2 is expected to produce **zero** screenshot diffs. Investigate any diff before re-baselining. Merging is the user's call.

---

## Risks and mitigations

- **`expo/fetch` as the global fetch breaks a supabase-js call** (auth refresh, storage upload of `ArrayBuffer` bodies).
  - Mitigation: Task 7 flows 1, 4, 5, 7 and 8. The one-line opt-out is `EXPO_PUBLIC_USE_RN_FETCH=1`.
- **React 19.2 changes web behaviour.**
  - Mitigation: the web unit and Playwright suites (Task 6 Step 5) and the CI visual job. No test depends on `useId` output.
- **A breaking change in SDK 55 or 56 that the audit missed.**
  - Mitigation: `expo-doctor`, `expo config --type introspect`, `expo export` for both platforms, the full CI gate and the device walk. The fallback is decision 1's stepwise redo.
- **Native builds are not exercised.** The project has no dev client and no EAS build is part of this plan, so iOS 16.4 / Xcode 26.4 and the Android native code are untested.
  - Mitigation: introspect covers the config plugins. The first EAS build after merge is a tracked follow-up.
- **Lockfile corruption from npm 11.**
  - Mitigation: npm 12 only, plus the `libc` check before every lockfile commit.
- **Merge conflicts with the in-flight web UI overhaul branches** in `package.json`, `package-lock.json` and that plan.
  - Mitigation: resolve `package-lock.json` conflicts by taking either side and re-running `npx -y npm@12 install`, never by hand-editing. Coordinate merge order with the user.

## Follow-ups (out of scope)

1. **`configureForegroundNotificationHandler` is never called** (`apps/mobile/src/services/notifications.ts:61`), so notifications that arrive while the app is open are not shown. Wire it up in `App.tsx` and drop the deprecated `shouldShowAlert`.
2. **`getExpoPushTokenAsync()` has no `projectId`, and `app.json` has no `extra.eas.projectId`.** Push registration will throw `ERR_NOTIFICATIONS_NO_EXPERIENCE_ID` in standalone builds. The error is caught and returns `false`, so push silently never registers. Run `eas init`, or pass the project id.
3. **Development build:** add `expo-dev-client`. `eas.json`'s `development` profile already sets `developmentClient: true`. This decouples local testing from store Expo Go and makes push and Maestro testable.
4. First EAS build on SDK 57 (Android, then iOS), which checks the native side.
5. `manipulateAsync` → the `ImageManipulator.manipulate()` context API (`CreateListingScreen.tsx`, `EditProfileScreen.tsx`).
6. `expo-file-system/legacy` `readAsStringAsync` → the `File` API (`CreatePostScreen.tsx`, `CreateEventScreen.tsx`), matching the two screens that already use it.
7. `@expo/vector-icons` → `@react-native-vector-icons/*` (deprecated in SDK 56).
8. `apps/mobile/index.js`: the deep `expo/src/launch/registerRootComponent` import → `import { registerRootComponent } from 'expo'`.
9. Run `expo-doctor` in CI so SDK drift like the stale `expo-notifications` 0.29 cannot build up again.
10. Mantine 9 (web), per the web UI overhaul plan.
11. `userInterfaceStyle: "light"` does nothing on Android without `expo-system-ui`. `expo config --type introspect` warns `Install expo-system-ui in your project to enable this feature`. This was already true on SDK 54: the key and the missing package both predate this plan.
