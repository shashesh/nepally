# Nepally - US Nepal Help Network

A utility-first community platform for the Nepali diaspora in the USA, providing structured, location-based services for housing, jobs, emergencies, and travel coordination.

## Quick Start

```bash
# Install dependencies
npm install

# Start mobile app
npm run mobile

# Start web app (in another terminal)
npm run web
```

For detailed setup instructions, see [Setup & Testing Guide](./docs/guides/setup-and-testing.md).

## Core Features

- **Housing** - Find roommates, apartments, and housing opportunities
- **Jobs** - Discover job openings and career opportunities
- **Emergency** - Get urgent help from the community (Red Alert system)
- **Travel** - Find travel companions and coordinate trips
- **Chat** - Direct messaging between community members
- **Public Profiles** - Reddit-style user profiles with post/comment history

## Key Differentiators

- **Metro-First Location Model** - Content tagged with US Census Metro Area IDs
- **Trust & Safety System** - Multi-tiered account system (Level 0-2)
- **Tag-Based Post Engine** - Reddit-style posts with scalable tag system (Housing, Jobs, Help, etc.)
- **Two-Step Red Alert System** - Moderator-verified emergency broadcasts
- **Premium Subscription** - Global posting + multiple saved locations

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Mobile App** | React Native (Expo 54) |
| **Web App** | Next.js 16 |
| **Backend** | Supabase (PostgreSQL, Realtime, Auth, Storage) |
| **Auth** | Supabase Auth (email + Google OAuth; phone SMS removed 2026-03-25) |
| **Language** | TypeScript |
| **React** | 19.1.0 (unified) |
| **Node** | 20 (CI) |

See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for full version details.

## Repository Structure

```
nepally/
├── apps/
│   ├── mobile/          # React Native mobile app (Expo)
│   └── web/             # Next.js web app
├── packages/
│   └── shared/          # Shared TypeScript code (types, utils, API, validation)
├── supabase/            # Supabase configuration, migrations, Edge Functions
├── docs/                # Documentation
└── package.json         # Root package.json (npm workspaces monorepo)
```

See [Monorepo Structure](./docs/architecture/monorepo-structure.md) for details.

## Documentation

### Getting Started
- [Setup & Testing Guide](./docs/guides/setup-and-testing.md) - Complete development setup
- [TECH-VERSIONS.md](./TECH-VERSIONS.md) - Technology version source of truth

### Architecture
- [Monorepo Structure](./docs/architecture/monorepo-structure.md) - Codebase organization
- [Code Sharing Guide](./docs/guides/code-sharing.md) - What to share between mobile/web
- [Database Schema](./docs/architecture/database-schema.md) - PostgreSQL tables and schema

### Backend
- [Supabase Setup](./docs/architecture/supabase-setup.md) - Configure Supabase project

### Deployment
- [Deployment Guide](./docs/guides/deployment.md) - Deploy to production

### Product
- [Product Roadmap](./docs/product/roadmap.md) - Feature roadmap and phases
- [Feature Specs](./docs/product/features/) - Detailed feature specifications
- [User Journeys](./docs/user-journeys/) - User flow documentation
- [Wireframes](./docs/wireframes/) - Screen wireframe documentation

### Claude Code
- [CLAUDE.md](./CLAUDE.md) - Claude Code instructions

## CI/CD

CI runs on GitHub Actions. All jobs run on `ubuntu-latest` with Node 20.

[![CI](https://github.com/shashesh/nepally/actions/workflows/ci.yml/badge.svg)](https://github.com/shashesh/nepally/actions/workflows/ci.yml)
[![Deploy Dev](https://github.com/shashesh/nepally/actions/workflows/deploy-vercel-dev.yml/badge.svg)](https://github.com/shashesh/nepally/actions/workflows/deploy-vercel-dev.yml)
[![Deploy Prod](https://github.com/shashesh/nepally/actions/workflows/deploy-vercel-prod.yml/badge.svg)](https://github.com/shashesh/nepally/actions/workflows/deploy-vercel-prod.yml)

### Automatic (on PR merge to `master`)

The pipeline triggers when a pull request is merged into `master`. All jobs run in parallel after a merge gate:

| Job | Command |
|-----|---------|
| Lint | `npm run lint` |
| Lint guards | `npm run lint:guards` |
| Type check | `npm run type-check` |
| Unit tests | `npm run test` |
| Coverage | `npm run test:coverage` |
| Web E2E | `npm run test:e2e --workspace=apps/web` |

Web E2E tests use Playwright and inject Supabase env vars from GitHub repository secrets/variables.

### Manual (`workflow_dispatch`)

The **CI Manual** workflow can be triggered from the GitHub Actions UI on any branch. Same jobs, same commands — useful for validating feature branches before merging.

### Deploy Workflows

- **Deploy Web Dev (Vercel)**: automatic on push to `master`
- **Deploy Web Production (Vercel)**: manual `workflow_dispatch` with `production` environment approvals

## Testing

- Every new feature must include unit tests in the same change.
- Any behavior change must include corresponding test updates.
- Test placement:
  - `packages/shared/src/**` → `packages/shared/src/**/*.test.ts`
  - `apps/web/src/**` → `apps/web/src/**/*.test.ts(x)`
  - `apps/mobile/src/**` → `apps/mobile/src/**/*.test.ts(x)`
- A feature is not complete until tests and coverage pass for the touched workspaces, then at monorepo level.

## Available Scripts

```bash
# Development
npm run mobile               # Start mobile app
npm run web                  # Start web app

# Code quality
npm run lint                 # Lint all code
npm run lint:guards          # Run shared-first architecture lint guards
npm run format               # Format all code
npm run type-check           # Type check all packages

# Testing
npm run test                 # Run all workspace unit tests
npm run test:coverage        # Run all workspace coverage checks
npm run test:e2e             # Run all workspace e2e tests (if present)
npm run test:e2e:web         # Run web e2e tests only
npm run test:e2e:web:headed  # Run web e2e in headed browser mode
npm run test:e2e:web:ui      # Open Playwright UI for web e2e
npm run test:e2e:web:report  # Run web e2e and open HTML report
npm run test:e2e:mobile      # Run mobile e2e tests only

# Live security smoke tests (need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
npm run test:security:chat-rls          # Chat tables: cross-user isolation
npm run test:security:users-privilege   # Users table: privileged columns cannot be self-escalated (migration 034)
npm run test:security:emergency-post    # Pending (Emergency) posts, moderator approve/ban, report auto-hide (migration 035)
```

## Development Phases

### Phase 1: Utility Core & Trust Foundation (Current)

**Shipped:**
- Onboarding and metro-area assignment
- Home feed with tag-based posts (Housing, Jobs, Help, Question, Politics, Discussion, Emergency)
- Profile management and profile photos
- Location management (saved locations, ZIP-to-metro lookup)
- In-app chat (direct messaging)
- Likes and comments
- Premium subscription scaffolding (global posting, multiple saved locations)
- Web navigation revamp
- Reddit-style profile experience (tabs + hamburger menu)
- Save/bookmark posts
- Avatar menus (cross-platform)
- Chat sender avatars (Messenger-style)
- Public profile view
- Notifications UI scaffold (mobile screens + preferences)

**Next up:** Post photo upload, reporting system, admin dashboard, full notifications system

### Phase 2: Community Safety & Growth
- Red Alert system (two-step moderator verification)
- Peer vs. business distinction (business profiles + reviews)
- Hyper-local filtering (radius-based search)

### Phase 3: Sustainability & Ecosystem
- Self-service ad portal
- AI moderation (scam keyword scanning)
- Billing integration (Stripe/IAP)
- Resource wiki (immigration, tax, legal guides)

## License

MIT License

---

**Built for the Nepalese diaspora community**
