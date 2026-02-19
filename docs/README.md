# Documentation

This directory contains detailed documentation for the NUSA project.

## Guides

| File | Purpose |
|------|---------|
| [database-schema.md](./database-schema.md) | PostgreSQL tables, RLS policies, query patterns |
| [code-sharing-guide.md](./code-sharing-guide.md) | What to share between mobile/web apps |
| [monorepo-structure.md](./monorepo-structure.md) | Codebase organization and workspace setup |
| [supabase-setup.md](./supabase-setup.md) | Supabase project configuration |
| [deployment-guide.md](./deployment-guide.md) | Deploy to Vercel, App Store, Google Play |

## Subdirectories

### `/features`
Detailed feature specifications created using `/design-feature` skill.

### `/wireframes`
Screen wireframe documentation created using `/wireframe` skill. Includes design system foundation.

### `/user-journeys`
End-to-end user experience documentation created using `/user-journey` skill.

### `/decisions`
Architecture Decision Records (ADRs) documenting important choices.

## Creating New Documentation

- Use custom Claude skills (`/design-feature`, `/wireframe`, `/user-journey`)
- Follow templates provided by each skill
- Link related documents together
- Keep documents in sync with `product-roadmap.md`

## Document Status Labels

- **Draft** - Work in progress
- **In Review** - Ready for feedback
- **Approved** - Finalized, ready for implementation
- **Implemented** - Feature has been built
- **Deprecated** - No longer relevant
