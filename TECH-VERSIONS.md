# Nepally Technology Versions

**Last Updated:** 2026-09-20

This document serves as the single source of truth for all technology versions used in the Nepally project.

## Core Dependencies

### Frontend (Mobile & Web)

| Package       | Version | Location          | Notes                                                                         |
| ------------- | ------- | ----------------- | ----------------------------------------------------------------------------- |
| **react**     | 19.2.3  | Both mobile & web | Unified version across platforms; exact match required by React Native 0.86.3 |
| **react-dom** | 19.2.3  | Web only          | Matches React version                                                         |

### Mobile App (`apps/mobile`)

| Package                            | Version  | Notes                  |
| ---------------------------------- | -------- | ---------------------- |
| **react-native**                   | 0.86.3   | Ships with Expo SDK 57 |
| **expo**                           | ~57.0.23 | Latest stable (SDK 57) |
| **@react-navigation/native**       | 7.x      | Navigation library     |
| **@react-navigation/bottom-tabs**  | 7.x      | Tab navigation         |
| **@react-navigation/native-stack** | 7.x      | Stack navigation       |

### Web App (`apps/web`)

| Package                                                              | Version | Notes                                                                                                                                                                                                |
| -------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **next**                                                             | 16.3.x  | Turbopack; works with React 19.2.3                                                                                                                                                                   |
| **eslint-config-next**                                               | 16.x    | Flat config, exported as a config array; requires ESLint >= 9                                                                                                                                        |
| **@mantine/core / hooks / form / notifications / modals / dropzone** | 8.3.x   | All on one version; 9.x is unblocked by React 19.2.3 but ships as its own PR (see Deferred Upgrades). `dropzone` arrived with the web UI overhaul's `ImageUploader` and pulls in `react-dropzone` 15 |

### Shared Package (`packages/shared`)

| Package        | Version | Notes                                                                           |
| -------------- | ------- | ------------------------------------------------------------------------------- |
| **typescript** | 7.0.x   | Shared across monorepo; installed side by side with 6.0 (see Development Tools) |
| **zod**        | 4.x     | Schema validation                                                               |

## Backend & Services

| Service                   | Version/Plan                        | Notes                                                                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**              | Latest                              | Backend, database, auth, storage                                                                                                                                                                                                                                                |
| **@supabase/supabase-js** | ^2.x (2.116+)                       | Client SDK                                                                                                                                                                                                                                                                      |
| **PostgreSQL**            | 17.6.x                              | Via Supabase (remote on 17 GA; local `config.toml` `major_version` synced to 17 on 2026-06-07)                                                                                                                                                                                  |
| **Node.js**               | ^22.13.0 \|\| ^24.3.0 \|\| >=25.0.0 | The 22 floor dates from 2026-09-11 (@supabase/supabase-js 2.116 declares `engines.node >=22`). React Native 0.86.3 and Metro 0.84 (Expo SDK 57) accept only `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| >=25`, so 22.0–22.12, 23.x and 24.0–24.2 are out. CI and `.nvmrc` run 24. |
| **npm**                   | >=10.0.0                            | Package manager                                                                                                                                                                                                                                                                 |

## Development Tools

| Tool                       | Version | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript**             | 7.0.x   | Type checking. TS 7 is installed as the npm alias `@typescript/native` → `typescript@^7`. The `typescript` package name is aliased to `@typescript/typescript6` (6.0.x) because 7.0 ships no JS compiler API, and typescript-eslint and the Expo CLI still `require('typescript')`. That wrapper hoists real TypeScript 6 into the root `node_modules`, and its `tsc` bin collides with TS 7's, so the `type-check`/`build`/`dev` scripts call `node ../../node_modules/@typescript/native/bin/tsc` directly. Use `npm run type-check`, not a bare `npx tsc` (which may be 6.0). `next build` type-checks with `tsc6`. Drop both aliases and restore plain `tsc` once those tools support TS 7 (expected with 7.1). |
| **ESLint**                 | 10.x    | Linting, flat config (`eslint.config.mjs`). 8 and 9 are both EOL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Prettier**               | 3.x     | Code and Markdown formatting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **eslint-config-prettier** | 10.x    | Disables formatting-related ESLint rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **markdownlint-cli2**      | 0.23.x  | Markdown lint (`npm run lint:md`, `.markdownlint-cli2.jsonc`); extends markdownlint's Prettier style                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Testing Stack

| Tool                              | Version | Location            | Notes                                                                                 |
| --------------------------------- | ------- | ------------------- | ------------------------------------------------------------------------------------- |
| **vitest**                        | ^4.1.8  | Root / web / shared | Unit test runner for web and shared                                                   |
| **@vitest/coverage-v8**           | ^4.1.8  | Root                | Coverage provider for Vitest                                                          |
| **jest**                          | ^29.7.0 | apps/mobile         | Unit test runner for mobile (jest-expo 57 still depends on jest 29)                   |
| **jest-expo**                     | ~57.0.5 | apps/mobile         | Expo preset for Jest                                                                  |
| **@testing-library/react-native** | ^13.3.3 | apps/mobile         | Hook/component testing utilities                                                      |
| **@testing-library/react**        | ^16.2.0 | apps/web            | Hook/component testing utilities                                                      |
| **@testing-library/dom**          | ^10.4.1 | apps/web            | Required peer of @testing-library/react 16                                            |
| **jsdom**                         | ^29.1.1 | apps/web            | Browser-like test environment for web                                                 |
| **@playwright/test**              | ^1.49.0 | apps/web            | E2E (runs against a production build — see playwright.config.ts)                      |
| **@axe-core/playwright**          | ^4.13.0 | apps/web            | Axe scans in the visual projects; known violations in `e2e/visual/a11y-baseline.json` |
| **culori**                        | ^4.0.2  | apps/web            | Colour maths for token contrast and theme-sync tests                                  |

## Why These Versions?

### React 19.2.3 (Both Mobile & Web — exact pin)

- **Decision Date:** 2026-02-12 (19.1.4); moved to 19.2.3 with the Expo SDK 57 migration
- **Reason:** Both mobile and web use the exact same React version to avoid workspace conflicts and duplicate-React issues. Enforced via root `overrides`.
- **Why exact:** React Native bundles its own `react-native-renderer` and enforces an **exact** React version match at runtime (`Incompatible React versions` error). React Native 0.86.3 ships renderer 19.2.3. Change React only together with an Expo SDK upgrade, to that SDK's `facebookReactVersion` (see `https://api.expo.dev/v2/versions/latest`).

### Next.js 16 (upgraded from 15, 2026-06-05)

- **Reason:** Next 16 (Turbopack) builds and runs cleanly against the pinned React 19.2.3 — the earlier 16.x build failures are resolved. Verified: production build of all routes, plus the full unit + E2E suites.
- **Historical note:** The project previously pinned Next 15.5.12 because an early Next 16 + React 19 combination failed during build (`Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`). That is no longer the case.
- **Patch level:** on 16.3.x since 2026-09-10 (16.2.7 → 16.3.4, pulled in by in-range
  security bumps). The exact version lives in the dependency table above — this heading
  stays at the major so it does not go stale on every patch release.
- **`eslint-config-next` moved to 16** alongside the ESLint 10 flat-config migration (2026-09-10).
- **`apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are generated, and committed on
  purpose.** `next dev` writes them when it detects an AI coding agent, via
  `node_modules/next/dist/server/lib/generate-agent-files.js` (the path the generated
  block itself cites; `dist/esm/...` is the same module's ESM build). The block is
  delimited by `<!-- BEGIN:nextjs-agent-rules -->` markers and upserted in place, so a
  Next upgrade rewrites it and shows up as a normal diff. With both files committed and
  current, `next dev` writes nothing. Leave the markers alone — content outside them is
  preserved.

  The two files do **not** share a lifecycle, so deleting them is not symmetric:

  | Deleted          | What the next `next dev` does                                                                  |
  | ---------------- | ---------------------------------------------------------------------------------------------- |
  | Both             | Recreates both — `AGENTS.md` with the block, `CLAUDE.md` with `@AGENTS.md`                     |
  | `CLAUDE.md` only | Leaves it deleted. `AGENTS.md` exists, so the shim is skipped and Claude Code loses the import |
  | `AGENTS.md` only | Leaves it deleted, and writes the block **into `CLAUDE.md`** instead                           |

  So deleting only `CLAUDE.md` is a silent, non-self-healing loss, and deleting only
  `AGENTS.md` relocates the block rather than restoring it. Delete both or neither.

### ESLint 10 + flat config (upgraded from 8, 2026-09-10)

- **Reason:** ESLint 8 is EOL and npm-deprecated, and so is 9 (it is the
  `maintenance` tag), so 10 was the only non-deprecated target. Config moved from
  `.eslintrc.json` to `eslint.config.mjs` at the repo root and in `apps/web`.
- **`settings.react.version` is pinned, not `'detect'`:** eslint-plugin-react's
  version detection calls `context.getFilename()`, which ESLint 10 removed, and
  crashes the whole run. Keep the pin in step with the React version.
- **`eslint-plugin-react` needs an override:** its peer range stops at ESLint 9.7.
  `overrides["eslint-plugin-react"].eslint` points it at the root ESLint. Drop the
  override once upstream declares ESLint 10 support.
- **The `--ext` flags are gone** from the lint scripts; flat config selects files
  through the `files` patterns each config object declares.
- **eslint-plugin-react-hooks 7** brings the React Compiler rule set, which flagged
  169 pre-existing findings. They were `warn` until the cleanup
  (`docs/archive/plans/react-compiler-lint-cleanup.md`, 2026-09-18) fixed every
  finding and returned them to the plugin's default, `error`. The React Compiler
  itself is not enabled; only its lint rules are.

### React Navigation 7 (upgraded from 6, 2026-09-10)

- **Reason:** the whole v6 line is npm-deprecated ("This version is no longer
  supported") — native, bottom-tabs, native-stack, core, elements and routers.
- **No code changes were needed.** The app only uses the dynamic API
  (`createNativeStackNavigator` / `createBottomTabNavigator` / `useNavigation`),
  which v7 keeps source-compatible; type-check passed against v7 with zero
  errors across the 72 files that touch it. `NavigationContainer` uses only
  `onReady`/`onStateChange`, both still supported, and the removed `independent`
  prop was never used.
- **Peers were already satisfied:** v7 needs react-native-screens >= 4
  (on 4.16) and react-native-safe-area-context >= 4 (on 5.6).
- **Added `src/navigation/navigationIntegration.test.tsx`.** Every other
  navigation-touching test mocks `@react-navigation/native`, so none of them
  would notice the navigators failing to construct — which is precisely how a
  major upgrade breaks. That test uses the real library.
- **`decode-uri-component` cleared (2026-09-17):** `@react-navigation/core`
  7.22.1 (released 2026-09-15) dropped its `query-string` dependency, the only
  path that pulled `decode-uri-component` in. Fixed by an in-range lockfile
  bump (native 7.4.1, bottom-tabs / native-stack 7.19.2); package.json ranges
  unchanged.

### Expo SDK 57 (upgraded from 54)

- **Reason:** Expo Go in the app stores only runs the latest SDK; SDK 54 stopped opening in store Expo Go.
- **Ships:** React Native 0.86.3, React 19.2.3. Expo modules now use SDK-aligned versions (`expo-*@57.x`).
- **App config:** the splash screen is configured through the `expo-splash-screen` plugin in `app.json` (SDK 56 removed the top-level `splash` key).
- **`expo.install.exclude: ["typescript"]`** in `apps/mobile/package.json`: the `typescript` alias wrapper reports 6.0.2 while SDK 57 expects `~6.0.3`; see the TypeScript row above.
- **Global fetch:** since SDK 56, `expo/fetch` is `globalThis.fetch` (supabase-js uses it). Opt out with `EXPO_PUBLIC_USE_RN_FETCH=1` if a network regression shows up.
- **Never import `expo-notifications` at module scope.** Importing it registers a push-token listener as a side effect, and since SDK 55 that throws in Expo Go on Android, which crashes the app at startup. `apps/mobile/src/services/notifications.ts` loads it lazily, after its `isExpoGo` check. Route new notification code through that service.
- **`StyleSheet.absoluteFillObject` is gone** (React Native 0.86). Use `StyleSheet.absoluteFill`, a plain object you can spread. The old name is `undefined` at runtime, so spreading it fails silently; `npm run type-check` catches it.
- **Plan:** `docs/archive/plans/2026-09-17-expo-sdk-57-migration.md`

## Deferred Upgrades

These are intentionally held and should be done as dedicated efforts:

| Upgrade                   | Blocked by / Reason                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Mantine 9**             | Unblocked by React 19.2.3; ships as its own PR after the web UI overhaul (see that plan's "After the overhaul — Mantine 9") |
| **jest / @types/jest 30** | jest-expo 57 still depends on jest 29 (`babel-jest`, `@jest/globals` `^29.2.1`); moves when a jest-expo release does        |

## Version Update Policy

### When to Update

**Minor/Patch Updates:** Update monthly or as security patches are released

- Example: Next.js 16.2.7 → 16.2.8
- Risk: Low
- Process: Update, test, deploy

**Major Updates:** Evaluate carefully, test thoroughly

- Example: the Expo SDK 54 → 57 migration
- Risk: High
- Process: Research, plan, test in branch, review breaking changes

### Update Process

1. **Check compatibility** - Ensure all packages work together
2. **Update package.json** - Use exact versions for critical dependencies
3. **Test locally** - Build and run both mobile and web apps
4. **Update this document** - Keep TECH-VERSIONS.md current
5. **Update docs** - Update README.md, TECH-VERSIONS.md, docs/guides/setup-and-testing.md
6. **Commit with clear message** - Example: "chore: upgrade Next.js 16.2.7 → 16.3.0"

## Package.json Configuration

### Root package.json

```json
{
  "overrides": {
    "react": "19.2.3",
    "react-dom": "19.2.3"
  }
}
```

This ensures React 19.2.3 is used throughout the entire monorepo, overriding any peer dependency requirements.

### Mobile package.json

```json
{
  "dependencies": {
    "react": "19.2.3",
    "react-native": "0.86.3",
    "expo": "~57.0.23"
  }
}
```

### Web package.json

```json
{
  "dependencies": {
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "next": "^16.2.7"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

## Test & Coverage Scripts (Current)

### Root (`package.json`)

```json
{
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "test:watch": "npm run test:watch --workspaces --if-present",
    "test:coverage": "npm run test:coverage --workspaces --if-present"
  }
}
```

### Mobile (`apps/mobile/package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Web (`apps/web/package.json`)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Shared (`packages/shared/package.json`)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Troubleshooting Version Conflicts

### Symptom: "Cannot find module 'react'" or version conflicts

**Solution:**

```bash
# Clean all dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json

# Reinstall with legacy peer deps (handles React version overrides)
npm install --legacy-peer-deps
```

### Symptom: TypeScript errors about React types

**Solution:**
Ensure `@types/react` and `@types/react-dom` are version 19 in web app:

```bash
cd apps/web
npm install --save-dev @types/react@^19 @types/react-dom@^19
```

### Symptom: "Incompatible React versions" at runtime (mobile)

**Cause:** React was bumped away from the version React Native's bundled
`react-native-renderer` requires (19.2.3 for React Native 0.86.3).

**Solution:** Keep React pinned at 19.2.3 (root `overrides`). Change it only as
part of an Expo SDK upgrade, to that SDK's React version.

## References

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [React Native blog (release notes)](https://reactnative.dev/blog)

---

**Maintained by:** Development Team
**Review Frequency:** Monthly or after major dependency updates
