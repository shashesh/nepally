# Nepally Technology Versions

**Last Updated:** 2026-02-24

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
| **next** | 15.5.12 | Downgraded from 16 for React 19 stability |
| **eslint-config-next** | 15.x | Matches Next.js version |

### Shared Package (`packages/shared`)

| Package | Version | Notes |
|---------|---------|-------|
| **typescript** | 5.3.3+ | Shared across monorepo |

## Backend & Services

| Service | Version/Plan | Notes |
|---------|--------------|-------|
| **Supabase** | Latest | Backend, database, auth, storage |
| **PostgreSQL** | 15+ | Via Supabase |
| **Node.js** | >=18.0.0 | Required minimum |
| **npm** | >=9.0.0 | Package manager |

## Development Tools

| Tool | Version | Notes |
|------|---------|-------|
| **TypeScript** | 5.3.3+ | Type checking |
| **ESLint** | 8.57.x | Linting |
| **Prettier** | 3.2.5+ | Code formatting |

## Testing Stack

| Tool | Version | Location | Notes |
|------|---------|----------|-------|
| **vitest** | ^3.2.4 | Root / web / shared | Unit test runner for web and shared |
| **@vitest/coverage-v8** | ^3.2.4 | Root | Coverage provider for Vitest |
| **jest** | ^29.7.0 | apps/mobile | Unit test runner for mobile |
| **jest-expo** | ^54.0.14 | apps/mobile | Expo preset for Jest |
| **@testing-library/react-native** | ^13.3.3 | apps/mobile | Hook/component testing utilities |
| **@testing-library/react** | ^16.2.0 | apps/web | Hook/component testing utilities |
| **jsdom** | ^26.1.0 | apps/web | Browser-like test environment for web |

## Why These Versions?

### React 19.1.4 (Both Mobile & Web)
- **Decision Date:** 2026-02-12
- **Reason:** Expo 54 requires React 19. To maintain consistency and avoid dependency conflicts, both mobile and web use the exact same React version (19.1.4).
- **Alternative Considered:** Using React 18 for web and React 19 for mobile
- **Why Not:** Causes npm workspace dependency conflicts and makes maintenance harder

### Next.js 15.5.12 (Not 16.x)
- **Decision Date:** 2026-02-12
- **Reason:** Next.js 16 with Turbopack has compatibility issues with React 19 (runtime errors during build). Next.js 15 has stable, production-ready React 19 support.
- **Alternative Considered:** Next.js 16.1.6 with Turbopack
- **Why Not:** Build failures with `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')` errors

### Expo 54.0 (Not 53.x or earlier)
- **Reason:** Latest stable version with React 19 support
- **Required by:** React Native 0.81.5

## Version Update Policy

### When to Update

**Minor/Patch Updates:** Update monthly or as security patches are released
- Example: Next.js 15.5.12 → 15.5.13
- Risk: Low
- Process: Update, test, deploy

**Major Updates:** Evaluate carefully, test thoroughly
- Example: Next.js 15 → 16 (when React 19 support is stable)
- Risk: High
- Process: Research, plan, test in branch, review breaking changes

### Update Process

1. **Check compatibility** - Ensure all packages work together
2. **Update package.json** - Use exact versions for critical dependencies
3. **Test locally** - Build and run both mobile and web apps
4. **Update this document** - Keep TECH-VERSIONS.md current
5. **Update docs** - Update README.md, TECH-VERSIONS.md, SETUP-AND-TESTING-GUIDE.md
6. **Commit with clear message** - Example: "chore: upgrade Next.js 15.5.12 → 15.6.0"

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
    "next": "15.5.12"
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

### Symptom: Next.js build fails with React errors

**Solution:**
Verify you're using Next.js 15, not 16:
```bash
cd apps/web
npm list next
# Should show next@15.5.12

# If not, downgrade:
npm install next@15 eslint-config-next@15 --legacy-peer-deps
```

## References

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Expo 54 Release Notes](https://blog.expo.dev/)
- [React Native 0.81 Release Notes](https://reactnative.dev/)

---

**Maintained by:** Development Team
**Review Frequency:** Monthly or after major dependency updates
