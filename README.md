# NUSA - Nepalese United Support Alliance

A utility-first community platform for the Nepalese diaspora in the USA, providing structured, location-based services for housing, jobs, emergencies, and travel coordination.

## Quick Start

```bash
# Install dependencies
npm install

# Start mobile app
npm run mobile

# Start web app (in another terminal)
npm run web
```

For detailed setup instructions, see [Setup & Testing Guide](./SETUP-AND-TESTING-GUIDE.md).

## Core Features

- **Housing** - Find roommates, apartments, and housing opportunities
- **Jobs** - Discover job openings and career opportunities
- **Emergency** - Get urgent help from the community (Red Alert system)
- **Travel** - Find travel companions and coordinate trips

## Key Differentiators

- **Metro-First Location Model** - Content tagged with US Census Metro Area IDs
- **Trust & Safety System** - Multi-tiered account system (Level 0-2)
- **Smart Post Engine** - Category-based posts with mandatory fields and auto-expiry
- **Two-Step Red Alert System** - Moderator-verified emergency broadcasts

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Mobile App** | React Native (Expo 54) |
| **Web App** | Next.js 15 |
| **Backend** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Language** | TypeScript |
| **React** | 19.1.0 (unified) |

See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for full version details.

## Repository Structure

```
nusa/
├── apps/
│   ├── mobile/          # React Native mobile app (Expo)
│   └── web/             # Next.js web app
├── packages/
│   └── shared/          # Shared TypeScript code (types, utils, validation)
├── supabase/            # Supabase configuration, migrations, Edge Functions
├── docs/                # Documentation
└── package.json         # Root package.json (npm workspaces monorepo)
```

See [Monorepo Structure](./docs/monorepo-structure.md) for details.

## Documentation

### Getting Started
- [Setup & Testing Guide](./SETUP-AND-TESTING-GUIDE.md) - Complete development setup
- [TECH-VERSIONS.md](./TECH-VERSIONS.md) - Technology version source of truth

### Architecture
- [Monorepo Structure](./docs/monorepo-structure.md) - Codebase organization
- [Code Sharing Guide](./docs/code-sharing-guide.md) - What to share between mobile/web
- [Database Schema](./docs/database-schema.md) - PostgreSQL tables and schema

### Backend
- [Supabase Setup](./docs/supabase-setup.md) - Configure Supabase project

### Deployment
- [Deployment Guide](./docs/deployment-guide.md) - Deploy to production

### Product
- [Product Roadmap](./product-roadmap.md) - Feature roadmap and phases
- [Feature Specs](./docs/features/) - Detailed feature specifications
- [User Journeys](./docs/user-journeys/) - User flow documentation
- [Wireframes](./docs/wireframes/) - Screen wireframe documentation

### Claude Code
- [QUICK-START.md](./QUICK-START.md) - Working with Claude Code on this project
- [CLAUDE.md](./CLAUDE.md) - Claude Code instructions

## Development Phases

### Phase 1: Utility Core & Trust Foundation (Current)
- Identity verification and trust levels
- Structured posting forms (Housing, Jobs, Emergency, Travel)
- Metro-based feeds
- In-app chat

### Phase 2: Community Safety & Growth
- Red Alert system
- Peer vs business distinction
- Hyper-local filtering

### Phase 3: Sustainability & Ecosystem
- Self-service ad portal
- AI moderation
- Resource wiki

## Available Scripts

```bash
npm run mobile         # Start mobile app
npm run web            # Start web app
npm run lint           # Lint all code
npm run format         # Format all code
npm run type-check     # Type check all packages
```

## License

MIT License

---

**Built for the Nepalese diaspora community**
