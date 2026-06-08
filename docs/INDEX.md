# Documentation Index

> Flat list of every active document in `docs/` with a one-line purpose.
> **Coding agents:** this is your map — grep it for keywords to find the right doc fast.
> **Humans:** also see [README.md](README.md) for the folder overview.

**Last verified:** 2026-06-07
**If you add, move, or retire a doc, update this file in the same commit.**

## Repo root

- [../README.md](../README.md) — project overview and quickstart
- [../CLAUDE.md](../CLAUDE.md) — rules for coding agents working in this repo
- [../TECH-VERSIONS.md](../TECH-VERSIONS.md) — canonical tech stack versions

## Guides (how to work in this repo)

- [guides/setup-and-testing.md](guides/setup-and-testing.md) — environment setup, running apps, testing policy, CI-aligned local checks
- [guides/code-sharing.md](guides/code-sharing.md) — shared-first architecture rules and examples
- [guides/deployment.md](guides/deployment.md) — deploying web (Vercel) and mobile (EAS)
- [guides/feature-development.md](guides/feature-development.md) — 7-stage feature development workflow (design → plan → implement → validate)

## Architecture (how the system is built)

- [architecture/monorepo-structure.md](architecture/monorepo-structure.md) — packages/apps layout and import rules
- [architecture/database-schema.md](architecture/database-schema.md) — tables, RLS policies, migration numbering
- [architecture/supabase-setup.md](architecture/supabase-setup.md) — project config, auth providers, storage

## Product

- [product/roadmap.md](product/roadmap.md) — phases, current status, what's next
- [product/features/phase1-feature-breakdown.md](product/features/phase1-feature-breakdown.md) — Phase 1 feature index
- [product/features/events.md](product/features/events.md) — events feature spec
- [product/features/events-feature-breakdown.md](product/features/events-feature-breakdown.md) — events feature sub-breakdown
- [product/features/in-app-chat.md](product/features/in-app-chat.md) — in-app chat feature spec
- [product/features/marketplace.md](product/features/marketplace.md) — marketplace Phase 1 spec
- [product/features/marketplace-future-features.md](product/features/marketplace-future-features.md) — marketplace Phase 2+ backlog
- [product/features/dynamic-location-management.md](product/features/dynamic-location-management.md) — location switcher feature spec
- [product/features/post-likes-and-comments.md](product/features/post-likes-and-comments.md) — post engagement feature spec

## Plans (active implementation plans)

- [plans/_template.md](plans/_template.md) — template for new implementation plans
- [plans/active/2026-04-13-docs-reorganization.md](plans/active/2026-04-13-docs-reorganization.md) — this reorganization plan [status: in-progress]
- [plans/active/2026-04-14-mobile-marketplace-redesign.md](plans/active/2026-04-14-mobile-marketplace-redesign.md) — 14-task implementation plan for the mobile marketplace redesign
- [plans/active/marketplace-ux-redesign.md](plans/active/marketplace-ux-redesign.md) — marketplace filter bar + featured/recent/trending strips [status: planned]
- [plans/active/mobile-usability-security-hardening.md](plans/active/mobile-usability-security-hardening.md) — mobile usability and security hardening [status: planned]
- [plans/active/notifications-feature.md](plans/active/notifications-feature.md) — full notifications system (DB + shared API + push delivery) [status: planned]
- [plans/active/phase1-remediation-checklist.md](plans/active/phase1-remediation-checklist.md) — Phase 1 post-audit remediation tasks [status: planned]
- [plans/active/phase1-remediation-github-issues.md](plans/active/phase1-remediation-github-issues.md) — copy-paste GitHub issue cards for Phase 1 remediation
- [plans/active/2026-04-20-pr1-social-identity.md](plans/active/2026-04-20-pr1-social-identity.md) — PR 1 of "Your Community Today": follow graph + extended profile [status: planned]
- [plans/active/2026-04-20-pr2-metro-pulse.md](plans/active/2026-04-20-pr2-metro-pulse.md) — PR 2 of "Your Community Today": Metro Pulse card strip [status: implemented]
- [plans/active/2026-04-20-pr3-helper-score-social-cards.md](plans/active/2026-04-20-pr3-helper-score-social-cards.md) — PR 3 of "Your Community Today": helper score + find_your_people + top_helper cards [status: implemented]
- [plans/active/2026-06-07-postgres-15-to-17-upgrade.md](plans/active/2026-06-07-postgres-15-to-17-upgrade.md) — Postgres version sync note: remote already on 17 GA; local config.toml + docs synced to 17 [status: in-progress]

## Specs (active design specs)

- [specs/2026-04-13-docs-reorganization-design.md](specs/2026-04-13-docs-reorganization-design.md) — design spec for this docs reorganization
- [specs/2026-04-13-marketplace-listing-details-enhancement-design.md](specs/2026-04-13-marketplace-listing-details-enhancement-design.md) — marketplace listing detail page Split View redesign (web + mobile)
- [specs/2026-04-14-mobile-marketplace-redesign-design.md](specs/2026-04-14-mobile-marketplace-redesign-design.md) — spec for the 4-tab mobile marketplace home redesign (Sponsored · Featured · Trending · All Listings)
- [specs/2026-04-20-your-community-today-design.md](specs/2026-04-20-your-community-today-design.md) — "Your Community Today": Metro Pulse card strip + Social Identity (follow graph, extended profile, helper score)
- [plans/active/2026-04-13-marketplace-listing-details-enhancement.md](plans/active/2026-04-13-marketplace-listing-details-enhancement.md) — implementation plan for Split View listing detail redesign

## User journeys

Documented user flows for every major Phase 1 surface. See [user-journeys/README.md](user-journeys/README.md) for the full index across 14 journeys in 6 categories (onboarding, post creation, discovery, communication, safety, management).

## Wireframes

Screen-by-screen wireframes for Phase 1 UI. See [wireframes/](wireframes/) — 18+ screen folders, each with its own markdown spec plus HTML preview.

## Decisions (ADRs)

- [decisions/2026-02-06-facebook-bridge-removal.md](decisions/2026-02-06-facebook-bridge-removal.md) — why we dropped the Facebook group bridge
- [decisions/2026-02-16-shared-types-snake-case.md](decisions/2026-02-16-shared-types-snake-case.md) — shared types use snake_case to match Supabase columns
- [decisions/2026-02-17-post-tags-redesign-and-premium.md](decisions/2026-02-17-post-tags-redesign-and-premium.md) — post tags redesign and premium toggle

## Archive

Completed plans, shipped specs, historical progress docs. See [archive/](archive/). Notable contents:
- `archive/PROGRESS.md` — historical implementation tracker (superseded by roadmap + memory)
- `archive/marketplace-category-consolidation-plan.md` — shipped as migration 016
- `archive/plans/` — 6 completed plans (events, public-profile-view, promote-listing, promotion-lifecycle, drop-is-featured, fix-promotions-display)
- `archive/specs/` — 2 design specs for shipped features (drop-is-featured, fix-promotions-display)
