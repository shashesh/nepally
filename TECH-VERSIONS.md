# Nepally Technology Versions

**Last Updated:** 2026-06-05

This document serves as the single source of truth for all technology versions used in the Nepally project.

## Core Dependencies

### Frontend (Mobile & Web)

| Package | Version | Location | Notes |
|---------|---------|----------|-------|
| **react** | 19.1.4 | Both mobile & web | Unified version across platforms |
| **react-dom** | 19.1.4 | Web only | Matches React version |

### Mobile App (`apps/mobile`)

| Package | Version | Notes |
|---------|---------|-------|
| **react-native** | 0.81.5 | Compatible with Expo 54 |
| **expo** | ~54.0.0 | Latest stable |
| **@react-navigation/native** | 6.x | Navigation library |
| **@react-navigation/bottom-tabs** | 6.x | Tab navigation |
| **@react-navigation/native-stack** | 6.x | Stack navigation |

### Web App (`apps/web`)

| Package | Version | Notes |
|---------|---------|-------|
| **next** | 16.2.7 | Turbopack; works with React 19.1.4 |
| **eslint-config-next** | 15.x | Pinned at 15: v16 requires ESLint 9 (flat config); see Deferred Upgrades |

### Shared Package (`packages/shared`)

| Package | Version | Notes |
|---------|---------|-------|
| **typescript** | 6.0.x | Shared across monorepo |
| **zod** | 4.x | Schema validation |

## Backend & Services

| Service | Version/Plan | Notes |
|---------|--------------|-------|
| **Supabase** | Latest | Backend, database, auth, storage |
| **@supabase/supabase-js** | ^2.x (2.107+) | Client SDK |
| **PostgreSQL** | 15+ | Via Supabase |
| **Node.js** | >=20.19.0 | Required minimum (raised for vitest 4 / jsdom 29) |
| **npm** | >=10.0.0 | Package manager |

## Development Tools

| Tool | Version | Notes |
|------|---------|-------|
| **TypeScript** | 6.0.x | Type checking |
| **ESLint** | 8.57.x | Linting (8 is EOL; flat-config migration deferred) |
| **Prettier** | 3.x | Code formatting |
| **eslint-config-prettier** | 10.x | Disables formatting-related ESLint rules |

## Testing Stack

| Tool | Version | Location | Notes |
|------|---------|----------|-------|
| **vitest** | ^4.1.8 | Root / web / shared | Unit test runner for web and shared |
| **@vitest/coverage-v8** | ^4.1.8 | Root | Coverage provider for Vitest |
| **jest** | ^29.7.0 | apps/mobile | Unit test runner for mobile (pinned by jest-expo 54) |
| **jest-expo** | ^54.0.14 | apps/mobile | Expo preset for Jest |
| **@testing-library/react-native** | ^13.3.3 | apps/mobile | Hook/component testing utilities |
| **@testing-library/react** | ^16.2.0 | apps/web | Hook/component testing utilities |
| **@testing-library/dom** | ^10.4.1 | apps/web | Required peer of @testing-library/react 16 |
| **jsdom** | ^29.1.1 | apps/web | Browser-like test environment for web |
| **@playwright/test** | ^1.49.0 | apps/web | E2E (runs against a production build — see playwright.config.ts) |

## Why These Versions?

### React 19.1.4 (Both Mobile & Web — exact pin)
- **Decision Date:** 2026-02-12
- **Reason:** Expo 54 requires React 19. Both mobile and web use the exact same React version (19.1.4) to avoid workspace conflicts and duplicate-React issues. Enforced via root `overrides`.
- **Why not React 19.2.x:** React Native 0.81 bundles `react-native-renderer@19.1.x` and enforces an **exact** React version match at runtime (`Incompatible React versions` error). React 19.2 is therefore blocked until the Expo SDK 54→56 migration (which ships RN 0.85 + renderer 19.2). This also blocks Mantine 9 (requires React ^19.2). See Deferred Upgrades.

### Next.js 16.2.7 (upgraded from 15, 2026-06-05)
- **Reason:** Next 16 (Turbopack) builds and runs cleanly against the pinned React 19.1.4 — the earlier 16.x build failures are resolved. Verified: production build of all routes, plus the full unit + E2E suites.
- **Historical note:** The project previously pinned Next 15.5.12 because an early Next 16 + React 19 combination failed during build (`Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`). That is no longer the case.
- **`eslint-config-next` stays at 15:** v16 requires ESLint 9 (flat config); kept at 15 until the ESLint 8→9 migration. It still lints Next 16 code fine.

### Expo 54.0 (Not 53.x or earlier)
- **Reason:** Latest stable version with React 19 support
- **Required by:** React Native 0.81.5

## Deferred Upgrades

These are intentionally held and should be done as dedicated efforts:

| Upgrade | Blocked by / Reason |
|---------|---------------------|
| **Expo SDK 54 → 56** | Coordinated migration; unlocks React 19.2, RN 0.85, React Navigation 7, jest 30 |
| **React 19.2 / Mantine 9** | RN 0.81 renderer requires exact React match → needs Expo 56 first |
| **ESLint 8 → 10 (flat config)** | EOL; pulls in eslint-config-next 16 + eslint-plugin-react-hooks 7 (React Compiler ruleset) |
| **jest / @types/jest 30** | jest-expo 54 peer-requires jest 29; moves with Expo 56 |

## Version Update Policy

### When to Update

**Minor/Patch Updates:** Update monthly or as security patches are released
- Example: Next.js 16.2.7 → 16.2.8
- Risk: Low
- Process: Update, test, deploy

**Major Updates:** Evaluate carefully, test thoroughly
- Example: the Expo SDK 54 → 56 migration (see Deferred Upgrades)
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
    "react": "19.1.4",
    "react-dom": "19.1.4"
  }
}
```

This ensures React 19.1.4 is used throughout the entire monorepo, overriding any peer dependency requirements.

### Mobile package.json

```json
{
  "dependencies": {
    "react": "19.1.4",
    "react-native": "0.81.5",
    "expo": "~54.0.0"
  }
}
```

### Web package.json

```json
{
  "dependencies": {
    "react": "19.1.4",
    "react-dom": "19.1.4",
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

**Cause:** React was bumped above 19.1.4 while React Native 0.81 ships
`react-native-renderer@19.1.x`, which requires an exact match.

**Solution:** Keep React pinned at 19.1.4 (root `overrides`) until the Expo SDK
54→56 migration. Do not bump `react`/`react-dom` independently.

## References

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo 54 Release Notes](https://blog.expo.dev/)
- [React Native 0.81 Release Notes](https://reactnative.dev/)

---

**Maintained by:** Development Team
**Review Frequency:** Monthly or after major dependency updates
