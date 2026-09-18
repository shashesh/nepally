# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow Rules (Non-Negotiable)

- **NEVER commit or push to `master`.** Always verify the current branch before `git commit` / `git push` / `gh pr create`. If HEAD is on `master`, stop and ask the user which branch to switch to (or create) before committing.
- **On a feature branch, commit, push and raise the PR without asking.** Commit as work progresses, `git push -u origin <branch>`, then open a PR against `master` with `gh pr create`, filling in `.github/pull_request_template.md`. Use clear, conventional commit messages.
- **Merging into `master` is the user's call.** Never merge a PR unless the user asks.
- Never force-push to `master` under any circumstance.

## Project Overview

Nepally (US Nepal Help Network) is a utility-first community platform for the Nepalese diaspora in the USA. Structured, location-based services for housing, jobs, emergencies, and travel coordination. Cross-platform monorepo: React Native (Expo 57) + Next.js 16, backed by Supabase. See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for exact versions.

## Finding Docs

The canonical map of every document in this repo is **[docs/INDEX.md](./docs/INDEX.md)**. It's a flat, greppable list — search it first before reading through the folder tree. The index covers guides, architecture, product specs, plans, and decisions. Completed plans live in `docs/archive/`.

**The canonical procedure is [docs/guides/documentation-workflow.md](./docs/guides/documentation-workflow.md)** — it holds the trigger matrix for which doc to update when.

Rules for keeping the index honest. The first three are **CI-enforced** — `npm run docs:check` fails the PR, it is not a reminder:

- Adding, moving, or retiring a doc? Update `docs/INDEX.md` in the same commit.
- Moving a doc that others link to? Fix the linking docs — broken relative links fail CI.
- Finishing a plan or spec? Set `status: implemented` in its frontmatter and `git mv` it to `docs/archive/`. Terminal status outside `archive/` fails CI.

Filing rules:

- Feature behavior → `docs/product/features/` (evergreen — what the feature IS today).
- One change's design → `docs/specs/` (dated, archived when it ships).
- Plans and specs carry frontmatter: `title`, `status` (`planned` | `in-progress` | `implemented` | `abandoned`), `created`.
- Superpowers brainstorming/writing-plans: save specs to `docs/specs/` and plans to `docs/plans/active/` (not `docs/superpowers/...`).

Run `npm run docs:check` before opening a PR.

## Core Architecture Principles

### Metro-First Location Model

- All content tagged with US Census Metro Area ID; users mapped via ZIP code during onboarding
- Default view = local feed; hyper-local filtering allows radius-based searches

### Trust & Safety System

- **Level 0 (New)**: View-only or 1 post/day — **Level 1 (Verified)**: Full posting — **Level 2 (Contributor)**: Elevated visibility

### Tag-Based Post Engine

- Title + Body + 1-3 Tags (Housing, Jobs, Help, Question, Politics, Discussion, Emergency)
- No structured fields, no auto-expiry. Emergency tag requires moderator approval.
- Premium users can toggle posts as global (visible in all metro feeds)

### Shared-First Code Architecture (MANDATORY)

**Golden Rule: Share business logic, keep UI separate.**

```text
Is it a UI component, screen, or page? → apps/mobile/ or apps/web/
Does it use platform-specific APIs?    → apps/mobile/ or apps/web/
Everything else                        → packages/shared/
```

- **`packages/shared/`**: Types (`src/types/`), API functions (`src/api/`), Validation (`src/validation/`), Utils (`src/utils/`), Constants (`src/constants/`), Business logic (`src/logic/`)
- **`apps/mobile/`**: RN components, screens, navigation, AsyncStorage config, StyleSheet
- **`apps/web/`**: Next.js pages, React components, CSS Modules, localStorage config
- Shared API functions accept `SupabaseClient` as parameter (dependency injection)
- Shared types use **snake_case** matching Supabase column names
- `apps/` MUST import from `@nepally/shared` — NEVER redefine types/validation/API/constants locally
- `packages/shared/` MUST NOT import from `react-native`, `expo-*`, `next`, or any platform package
- Before implementing features, read [docs/guides/code-sharing.md](./docs/guides/code-sharing.md) and [docs/architecture/monorepo-structure.md](./docs/architecture/monorepo-structure.md)

### Styling Rules

- **Web**: NEVER inline `style={{}}`. Always CSS Modules (`.module.css`), reference via `className={styles.x}`. Use semantic tokens from `apps/web/src/styles/tokens.css` — no colour literals (see [docs/architecture/web-ui-system.md](./docs/architecture/web-ui-system.md))
- **Mobile**: NEVER inline style objects. Always `StyleSheet.create()` at bottom of file

### Unit Testing Policy (MANDATORY)

- Every new functionality MUST include unit tests. Any behavior change MUST update tests.
- Shared → `packages/shared/src/**/*.test.ts` | Web → `apps/web/src/**/*.test.ts(x)` | Mobile → `apps/mobile/src/**/*.test.ts(x)`
- Feature not complete until workspace tests pass, then monorepo tests pass.

## Database Migrations

**CRITICAL: `001_schema.sql`, `002_seed_data.sql`, `003_storage.sql` are FROZEN. Never modify or re-run on a live database.** They contain destructive TEARDOWN (`DROP TABLE ... CASCADE`).

Every schema change = new incremental file: `004_<description>.sql`, `005_<description>.sql`, etc.

- Use `ALTER TABLE`, `CREATE INDEX`, `CREATE POLICY`, etc. — NEVER `DROP TABLE`/`DROP TYPE`
- Sequential numeric prefix only (never timestamps)
- When using `apply_migration` MCP tool, always write additive, non-destructive SQL
