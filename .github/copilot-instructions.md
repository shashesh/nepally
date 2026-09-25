# Copilot Instructions for Nepally Monorepo

## Architecture You Must Respect

- Nepally is an npm-workspaces monorepo: `apps/mobile`, `apps/web`, `packages/shared`.
- Product behavior is metro-first (`metro_area_id` + ZIP mapping), and post feed behavior is metro-scoped + optional global.
- Backend is Supabase; each app owns its Supabase client and injects it into shared API functions.
- Posts are tag-based (title + description + `1-3` tags), not category-form-heavy.

## Shared-First Rules (Non-Negotiable)

- Put all non-UI logic in `packages/shared/src` (types, validation, constants, utils, API, business rules).
- Keep platform code in apps only:
  - `apps/mobile`: React Native UI, navigation, AsyncStorage/Expo APIs.
  - `apps/web`: Next.js `src/pages`, web UI, CSS Modules, browser routing.
- Never duplicate shared types/logic in app code; import from `@nepally/shared`.
- Shared types stay `snake_case` to match Supabase rows directly.

## Key Integration Patterns

- Shared API functions use dependency injection:
  - Example: `getPostsByMetroArea(supabase, metroAreaId, ...)` in `packages/shared/src/api/posts.ts`.
- Supabase clients:
  - Web: `apps/web/src/lib/supabase.ts` (`NEXT_PUBLIC_SUPABASE_*`).
  - Mobile: `apps/mobile/src/config/supabase.ts` (Expo env + AsyncStorage session persistence).
- Export any new shared module through `packages/shared/src/index.ts`.
- Follow existing shared API return shape: `{ data }` or `{ error }`.

## Workflow for Feature Work

- Read docs first: `docs/guides/code-sharing.md`, `docs/architecture/monorepo-structure.md`, then relevant `docs/product/features/*`, `docs/user-journeys/*`, `docs/wireframes/*`.
- Implement in this order for cross-platform changes:
  1. shared layer, 2) web/mobile adapters, 3) route/screen wiring.
- Keep edits surgical; preserve existing UX and file structure unless spec requires change.

## Testing Requirement (Non-Negotiable)

- Every new functionality MUST include unit tests in the same change.
- Any changed functionality MUST update existing unit tests if behavior changed.
- Prefer tests closest to the changed logic:
  - `packages/shared`: unit tests for utils, validation, and API behavior (mock Supabase client).
  - `apps/web`: unit tests for hooks/contexts/lib logic.
  - `apps/mobile`: unit tests for hooks/services/utils and critical reusable components.
- Do not mark work complete until relevant test commands pass for touched workspaces.

## Commands and Validation

- Install all deps: `npm install`
- Web dev: `npm run web` (or `npm run dev --workspace=apps/web`)
- Mobile dev: `npm run mobile` (or `npm run start --workspace=apps/mobile`)
- Monorepo checks: `npm run lint`, `npm run type-check`, `npm run test`, and `npm run test:coverage`
- Seed metro dataset when needed: `npm run seed:metro`
- For targeted checks during edits, run workspace-level scripts first (`apps/web`, `apps/mobile`, or `packages/shared`) before full monorepo validation.

## Environment + Runtime

- Web requires `apps/web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Mobile requires `apps/mobile/.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Expected runtime: Node `>=18`, npm `>=9`.

## Database Migration Rules (Non-Negotiable)

- **Never modify or re-run** `001_schema.sql`, `002_seed_data.sql`, or `003_storage.sql` on a live database. These are destructive reset scripts (they `DROP TABLE ... CASCADE` everything) and exist only for bootstrapping a fresh database.
- **Every schema change** to an already-deployed database MUST be a new incremental file: `004_<description>.sql`, `005_<description>.sql`, etc.
- Incremental files must use only additive/non-destructive SQL: `ALTER TABLE`, `CREATE INDEX`, `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, etc.
- Never use `DROP TABLE` or `DROP TYPE` in an incremental migration unless explicitly confirmed safe with no live data.
- Never use timestamped filenames (e.g., `20260224_something.sql`). Use sequential numeric prefixes only.

## Git Workflow Rules (Non-Negotiable)

- **NEVER commit or push directly to the master branch.**
- Before every `git commit`, `git push` or `gh pr create`, verify the current branch is NOT master.
- If on master, create or switch to a feature branch first.
- All changes must go through feature branches and pull requests.
- On a feature branch, commit, push, and open a **draft** pull request against master without asking first.
- Never mark a pull request ready for review. The user does that, and it is what starts CI. Draft PRs and docs-only changes run no CI because Actions minutes are limited (`docs/decisions/2026-09-19-ci-actions-minute-budget.md`).
- Never merge a pull request into master unless the user asks.

## Project-Specific Conventions

- Web route logic lives in `apps/web/src/pages/*` with providers in `apps/web/src/pages/_app.tsx`.
- Web styling uses CSS Modules; avoid introducing alternative styling systems.
- **Hard rule for web (`apps/web/src`)**: never use JSX inline styles (`style={{ ... }}` or `style={...}`).
- For every visual/style change on web:
  - Add or update a `.module.css` file.
  - Use `className={styles.someClass}` only.
  - Reuse existing design tokens/variables; do not hardcode one-off inline style values in TSX.
- Before completing any web task, run a quick check to ensure no inline styles were added in web source.
  - Example search: `style=` in `apps/web/src/**`
- Preserve trust-level gating and metro-scoped behavior when changing feed/post flows.
- If a concern is used by both apps and does not depend on platform APIs, move it to `packages/shared`.
