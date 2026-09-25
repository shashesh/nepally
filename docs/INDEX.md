# Documentation Index

> Flat list of every active document in `docs/` with a one-line purpose.
> **Coding agents:** this is your map — grep it for keywords to find the right doc fast.
> **Humans:** also see [README.md](README.md) for the folder overview.

**Last verified:** 2026-09-09

**This file is CI-enforced.** `npm run docs:check` fails if a doc under `docs/` is
missing from this index, or if an entry here points at something that does not exist.
Add, move, or retire a doc → update this file in the same commit. See
[guides/documentation-workflow.md](guides/documentation-workflow.md) for the full
procedure.

Plan and spec status lives in each file's frontmatter, not here — one source, not two.

## Repo root

- [../README.md](../README.md) — project overview and quickstart
- [../CLAUDE.md](../CLAUDE.md) — rules for coding agents working in this repo
- [../TECH-VERSIONS.md](../TECH-VERSIONS.md) — canonical tech stack versions

## Guides (how to work in this repo)

- [README.md](README.md) — what lives in which folder, and the conventions
- [guides/setup-and-testing.md](guides/setup-and-testing.md) — environment setup, running apps, testing policy, CI-aligned local checks, security smoke tests
- [guides/code-sharing.md](guides/code-sharing.md) — shared-first architecture rules and examples
- [guides/deployment.md](guides/deployment.md) — deploying web (Vercel) and mobile (EAS)
- [guides/feature-development.md](guides/feature-development.md) — 7-stage feature development workflow (design → plan → implement → validate)
- [guides/documentation-workflow.md](guides/documentation-workflow.md) — which doc to update when, the frontmatter contract, what `docs:check` enforces, quarterly sweep

## Architecture (how the system is built)

- [architecture/monorepo-structure.md](architecture/monorepo-structure.md) — packages/apps layout and import rules
- [architecture/database-schema.md](architecture/database-schema.md) — tables, RLS policies, migration numbering
- [architecture/supabase-setup.md](architecture/supabase-setup.md) — project config, auth providers, storage
- [architecture/migration-workflow.md](architecture/migration-workflow.md) — how migrations are authored/applied (manual/MCP, numeric prefixes); 2026-06-07 tracker realignment + before-snapshot
- [architecture/web-ui-system.md](architecture/web-ui-system.md) — web design tokens, fonts, Mantine theme, components and hooks, guards

## Product

- [product/roadmap.md](product/roadmap.md) — phases, current status, what's next

### Feature specs (evergreen — what each feature is today)

- [product/features/phase1-feature-breakdown.md](product/features/phase1-feature-breakdown.md) — Phase 1 feature index
- [product/features/events.md](product/features/events.md) — events feature spec
- [product/features/events-feature-breakdown.md](product/features/events-feature-breakdown.md) — events feature sub-breakdown
- [product/features/in-app-chat.md](product/features/in-app-chat.md) — in-app chat feature spec
- [product/features/notifications.md](product/features/notifications.md) — notifications: bell, page, paging, preferences (web today)
- [product/features/moderation.md](product/features/moderation.md) — moderator queue: pending posts, reports, confirmations, bans (web today)
- [product/features/marketplace.md](product/features/marketplace.md) — marketplace Phase 1 spec
- [product/features/marketplace-future-features.md](product/features/marketplace-future-features.md) — marketplace Phase 2+ backlog
- [product/features/dynamic-location-management.md](product/features/dynamic-location-management.md) — location switcher feature spec
- [product/features/post-likes-and-comments.md](product/features/post-likes-and-comments.md) — post engagement feature spec
- [product/features/search.md](product/features/search.md) — global search: suggestions, results page, metro scope
- [product/features/sign-up-and-log-in.md](product/features/sign-up-and-log-in.md) — sign-up, log-in, email verification, the auth callback and ZIP onboarding: error sentences, existing accounts (web today)

## Plans (in-flight only — finished plans move to `archive/plans/`)

- [plans/_template.md](plans/_template.md) — template for new implementation plans
- [plans/active/2026-09-18-production-launch.md](plans/active/2026-09-18-production-launch.md) — 12-week production launch (public launch Dec 1, 2026): prod environment, store compliance, monitoring, support operations, six launch markets, week-by-week tracker
- [plans/active/mobile-usability-security-hardening.md](plans/active/mobile-usability-security-hardening.md) — mobile usability and security hardening
- [plans/active/phase1-remediation-checklist.md](plans/active/phase1-remediation-checklist.md) — live tracker for Phase 1 post-audit remediation (security, moderation, notifications, auth)

## Specs (point-in-time designs — archived when the work ships)

_None active._

Shipped designs live in [archive/specs/](archive/specs/).

## User journeys

Index and category breakdown: [user-journeys/README.md](user-journeys/README.md) — 7 written of 14 planned.

- [user-journeys/onboarding/01-signup-and-onboarding.md](user-journeys/onboarding/01-signup-and-onboarding.md) — account creation through metro assignment
- [user-journeys/location/01-location-permission-and-detection.md](user-journeys/location/01-location-permission-and-detection.md) — location permission, detection, and switching
- [user-journeys/post-creation/03-creating-a-post.md](user-journeys/post-creation/03-creating-a-post.md) — the unified tag-based post creation flow
- [user-journeys/discovery/02-browsing-and-engaging-with-posts.md](user-journeys/discovery/02-browsing-and-engaging-with-posts.md) — feed browsing, likes, comments
- [user-journeys/discovery/13-event-discovery-and-rsvp.md](user-journeys/discovery/13-event-discovery-and-rsvp.md) — finding events and RSVPing
- [user-journeys/communication/09-in-app-chat.md](user-journeys/communication/09-in-app-chat.md) — starting and holding a conversation
- [user-journeys/management/14-event-creation-and-management.md](user-journeys/management/14-event-creation-and-management.md) — creating and managing an event

## Wireframes

Each folder holds a markdown spec plus an HTML preview.

- [wireframes/00-design-system-foundation/00-design-system-foundation.md](wireframes/00-design-system-foundation/00-design-system-foundation.md) — colors, spacing, typography, component primitives (superseded on web by architecture/web-ui-system.md)
- [wireframes/01-welcome-screen/01-welcome-screen.md](wireframes/01-welcome-screen/01-welcome-screen.md) — first-run welcome
- [wireframes/02-signup-method-selection/02-signup-method-selection.md](wireframes/02-signup-method-selection/02-signup-method-selection.md) — email vs Google sign-up
- [wireframes/03-zip-code-entry/03-zip-code-entry.md](wireframes/03-zip-code-entry/03-zip-code-entry.md) — ZIP entry for metro mapping
- [wireframes/04-metro-confirmation/04-metro-confirmation.md](wireframes/04-metro-confirmation/04-metro-confirmation.md) — confirm detected metro area
- [wireframes/05-onboarding-tutorial/05-onboarding-tutorial.md](wireframes/05-onboarding-tutorial/05-onboarding-tutorial.md) — first-run tutorial carousel
- [wireframes/06-home-screen-level-0/06-home-screen-level-0.md](wireframes/06-home-screen-level-0/06-home-screen-level-0.md) — home feed as seen by a Level 0 account
- [wireframes/07-conversation-list/07-conversation-list.md](wireframes/07-conversation-list/07-conversation-list.md) — chat inbox
- [wireframes/08-message-thread/08-message-thread.md](wireframes/08-message-thread/08-message-thread.md) — single conversation thread
- [wireframes/09-post-detail/09-post-detail.md](wireframes/09-post-detail/09-post-detail.md) — post detail with comments
- [wireframes/10-profile-photo-upload/10-profile-photo-upload.md](wireframes/10-profile-photo-upload/10-profile-photo-upload.md) — avatar upload and crop
- [wireframes/11-location-permission-screen/11-location-permission-screen.md](wireframes/11-location-permission-screen/11-location-permission-screen.md) — OS location permission prompt
- [wireframes/12-location-change-prompt/12-location-change-prompt.md](wireframes/12-location-change-prompt/12-location-change-prompt.md) — prompt when detected metro differs from saved
- [wireframes/13-location-switcher/13-location-switcher.md](wireframes/13-location-switcher/13-location-switcher.md) — switching between saved locations
- [wireframes/14-create-post/14-create-post.md](wireframes/14-create-post/14-create-post.md) — post composer with tag selector
- [wireframes/15-notifications/15-notifications.md](wireframes/15-notifications/15-notifications.md) — notification list and deep links
- [wireframes/16-events-list/16-events-list.md](wireframes/16-events-list/16-events-list.md) — events browse list
- [wireframes/16-create-event/16-create-event.md](wireframes/16-create-event/16-create-event.md) — event creation form
- [wireframes/17-event-detail/17-event-detail.md](wireframes/17-event-detail/17-event-detail.md) — event detail with RSVP

Exploratory HTML/CSS prototypes (marketplace layout options, design-taste notes) live
in `wireframes/_prototypes/`. The underscore prefix keeps them out of this index.

## Decisions (ADRs)

- [decisions/2026-02-06-facebook-bridge-removal.md](decisions/2026-02-06-facebook-bridge-removal.md) — why we dropped the Facebook group bridge
- [decisions/2026-02-16-shared-types-snake-case.md](decisions/2026-02-16-shared-types-snake-case.md) — shared types use snake_case to match Supabase columns
- [decisions/2026-02-17-post-tags-redesign-and-premium.md](decisions/2026-02-17-post-tags-redesign-and-premium.md) — post tags redesign and premium toggle
- [decisions/2026-09-18-long-lived-sessions.md](decisions/2026-09-18-long-lived-sessions.md) — sessions stay signed in until sign-out (Facebook/Reddit style); re-authenticate for sensitive actions; replaces the 30-minute mobile timeout
- [decisions/2026-09-19-ci-actions-minute-budget.md](decisions/2026-09-19-ci-actions-minute-budget.md) — GitHub Actions minutes: draft PRs and docs-only changes run no CI, fewer jobs, deploy timeouts, prod guard tolerates docs-only commits

## Archive

Completed plans, shipped specs, and historical progress docs. Kept rather than deleted
so "how did we do X" stays answerable. Indexed at folder granularity — individual
archived files are exempt from the index check, but their links are still verified.

See [archive/](archive/):

- `archive/PROGRESS.md` — historical implementation tracker (superseded by roadmap)
- `archive/marketplace-category-consolidation-plan.md` — shipped as migration 016
- `archive/plans/` — 20 completed or abandoned plans, including events, public-profile-view, promote-listing, promotion-lifecycle, drop-is-featured, fix-promotions-display, the 2026-04 docs reorganization, marketplace UX + listing-details + mobile redesigns, the "Your Community Today" PR trilogy, notifications, the Postgres 15→17 sync, the Expo SDK 54→57 migration, the React Compiler lint cleanup, and the web UI overhaul (PRs 0–10c; its "Open follow-ups (after the overhaul)" section is the post-overhaul backlog, and "After the overhaul — Mantine 9" is the next step)
- `archive/specs/` — 8 design specs for shipped features, including the web UI overhaul design
