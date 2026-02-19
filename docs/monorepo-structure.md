# NUSA Monorepo Structure

This document explains the organization of the NUSA codebase.

## Overview

NUSA uses a **monorepo** structure powered by **npm workspaces**. This means all related projects (mobile app, web app, shared code) live in one repository.

## Directory Structure

```
nusa/
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml        # Continuous integration
│       └── deploy.yml    # Deployment workflows
│
├── apps/                 # Application projects
│   ├── mobile/           # React Native mobile app (Expo)
│   │   ├── src/
│   │   │   ├── screens/      # Screen components
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── navigation/   # Navigation configuration
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── services/     # API services
│   │   │   └── config/       # App configuration
│   │   ├── App.tsx       # Root component
│   │   ├── app.json      # Expo configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/              # Next.js web app
│   │   ├── src/
│   │   │   ├── pages/        # Next.js pages (routes)
│   │   │   ├── components/   # Reusable React components
│   │   │   ├── lib/          # Utilities and API clients
│   │   │   └── styles/       # CSS modules
│   │   ├── public/       # Static assets
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/            # Admin dashboard (future)
│       └── ...
│
├── packages/             # Shared packages
│   ├── shared/           # Shared TypeScript code
│   │   ├── src/
│   │   │   ├── api/          # API client functions
│   │   │   ├── types/        # TypeScript types/interfaces
│   │   │   ├── utils/        # Utility functions
│   │   │   ├── validation/   # Zod validation schemas
│   │   │   ├── constants/    # Constants
│   │   │   └── index.ts      # Main entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui-mobile/        # Mobile UI components (future)
│   └── ui-web/           # Web UI components (future)
│
├── supabase/             # Supabase configuration
│   ├── functions/        # Edge Functions
│   │   ├── expire-posts/
│   │   ├── verify-emergency-post/
│   │   └── get-metro-by-zip/
│   ├── migrations/       # Database migrations
│   ├── seed.sql          # Seed data
│   ├── config.toml       # Supabase configuration
│   └── README.md
│
├── docs/                 # Documentation
│   ├── README.md
│   ├── supabase-setup.md
│   ├── monorepo-structure.md
│   ├── code-sharing-guide.md
│   ├── deployment-guide.md
│   ├── database-schema.md
│   ├── features/         # Feature specifications
│   ├── decisions/        # Architecture decision records
│   ├── user-journeys/    # User journey maps
│   └── wireframes/       # UI wireframes
│
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── tsconfig.json         # Base TypeScript config
├── package.json          # Root package.json (workspaces)
├── CLAUDE.md             # Instructions for Claude Code
├── TECH-VERSIONS.md      # Technology version source of truth
├── SETUP-AND-TESTING-GUIDE.md  # Development setup guide
├── product-roadmap.md    # Product roadmap
└── README.md             # Main README
```

## Workspace Configuration

The root `package.json` defines workspaces:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

This tells npm that:
- All folders in `apps/` are workspaces
- All folders in `packages/` are workspaces

## Benefits of Monorepo

### 1. Code Sharing
- Share TypeScript types between mobile and web
- Share business logic and utilities
- Share validation schemas
- Single source of truth

### 2. Coordinated Changes
- Update shared code and both apps in one commit
- No version conflicts between packages
- Atomic changes across the stack

### 3. Simplified Development
- One `git clone` gets entire codebase
- One `npm install` installs all dependencies
- Run all apps from root directory

### 4. Consistent Tooling
- Same ESLint, Prettier, TypeScript config everywhere
- Shared CI/CD configuration
- Unified testing strategy

## How Workspaces Work

### Installing Dependencies

```bash
# Install dependencies for all workspaces
npm install

# Install dependency in specific workspace
npm install <package> --workspace=apps/mobile
npm install <package> --workspace=packages/shared
```

### Running Scripts

```bash
# Run script in specific workspace
npm run dev --workspace=apps/web
npm run build --workspace=packages/shared

# Run script in all workspaces
npm run lint --workspaces
npm run type-check --workspaces
```

### Shortcuts (defined in root package.json)

```bash
# Start mobile app
npm run mobile

# Start web app
npm run web

# Lint all code
npm run lint

# Format all code
npm run format
```

## Package Linking

Workspaces are automatically linked. When you import `@nusa/shared`:

```typescript
import { PostCategory } from '@nusa/shared';
```

npm resolves it to `packages/shared` (no need for `npm link`).

## Adding a New App

1. Create folder in `apps/`:
   ```bash
   mkdir apps/admin
   ```

2. Initialize package:
   ```bash
   cd apps/admin
   npm init -y
   ```

3. Update `package.json`:
   ```json
   {
     "name": "@nusa/admin",
     "version": "1.0.0",
     "private": true,
     ...
   }
   ```

4. Install from root:
   ```bash
   cd ../..
   npm install
   ```

## Adding a New Package

1. Create folder in `packages/`:
   ```bash
   mkdir packages/ui-mobile
   ```

2. Initialize package:
   ```bash
   cd packages/ui-mobile
   npm init -y
   ```

3. Update `package.json`:
   ```json
   {
     "name": "@nusa/ui-mobile",
     "version": "1.0.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     ...
   }
   ```

4. Install from root:
   ```bash
   cd ../..
   npm install
   ```

## Development Workflow

### Daily Development

1. **Start Supabase locally** (terminal 1):
   ```bash
   npx supabase start
   ```

2. **Build shared package in watch mode** (terminal 2):
   ```bash
   npm run dev --workspace=packages/shared
   ```

3. **Start mobile app** (terminal 3):
   ```bash
   npm run mobile
   ```

4. **Start web app** (terminal 4):
   ```bash
   npm run web
   ```

### Making Changes

#### Shared Package
1. Edit files in `packages/shared/src`
2. TypeScript auto-compiles (if in watch mode)
3. Mobile and web apps hot-reload

#### Mobile App
1. Edit files in `apps/mobile/src`
2. Expo hot-reloads automatically

#### Web App
1. Edit files in `apps/web/src`
2. Next.js hot-reloads automatically

### Testing Changes

```bash
# Lint all code
npm run lint

# Type check all packages
npm run type-check

# Format all code
npm run format
```

## Build Order

When building for production, follow this order:

1. **Shared package** (must be built first):
   ```bash
   npm run build --workspace=packages/shared
   ```

2. **Web app**:
   ```bash
   npm run build --workspace=apps/web
   ```

3. **Mobile app**:
   ```bash
   eas build --platform all
   ```

4. **Supabase Edge Functions**:
   ```bash
   npx supabase functions deploy
   ```

## CI/CD Pipeline

GitHub Actions automatically:
1. Installs all dependencies
2. Builds shared package
3. Lints and type-checks all code
4. Builds web app
5. Deploys to Vercel (web)
6. Builds mobile apps (Expo EAS)

See `.github/workflows/ci.yml` for details.

## Troubleshooting

### Issue: Module not found `@nusa/shared`

**Solution:** Build the shared package:
```bash
npm run build --workspace=packages/shared
```

### Issue: Changes in shared package not reflecting

**Solution:** Ensure shared package is in watch mode:
```bash
npm run dev --workspace=packages/shared
```

Or rebuild:
```bash
npm run build --workspace=packages/shared
```

### Issue: Conflicting dependencies

**Solution:** Delete all `node_modules` and reinstall:
```bash
npm run clean
npm install
```

## Best Practices

1. **Never use relative imports between workspaces**
   ```typescript
   // ❌ Bad
   import { Post } from '../../../packages/shared/src/types/post';

   // ✅ Good
   import { Post } from '@nusa/shared';
   ```

2. **Keep shared package pure**
   - No React Native or React dependencies
   - No platform-specific code
   - Only TypeScript types, utilities, and validation

3. **Version packages consistently**
   - Update all workspace versions together
   - Use `*` for internal dependencies

4. **Document breaking changes**
   - If you change `@nusa/shared`, update CHANGELOG.md
   - Test both mobile and web apps after changes

## Future Expansion

Potential additions:
- `packages/ui-mobile` - Shared mobile UI components
- `packages/ui-web` - Shared web UI components
- `packages/api-client` - API client (if we add REST API)
- `apps/admin` - Admin dashboard
- `apps/moderator` - Moderator portal

## Resources

- [npm Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Turborepo](https://turbo.build/repo) (future optimization)
