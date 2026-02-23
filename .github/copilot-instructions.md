# Copilot Instructions for NUSA Monorepo

## Architecture You Must Respect
- NUSA is an npm-workspaces monorepo: `apps/mobile`, `apps/web`, `packages/shared`.
- Product behavior is metro-first (`metro_area_id` + ZIP mapping), and post feed behavior is metro-scoped + optional global.
- Backend is Supabase; each app owns its Supabase client and injects it into shared API functions.
- Posts are tag-based (title + description + `1-3` tags), not category-form-heavy.

## Shared-First Rules (Non-Negotiable)
- Put all non-UI logic in `packages/shared/src` (types, validation, constants, utils, API, business rules).
- Keep platform code in apps only:
  - `apps/mobile`: React Native UI, navigation, AsyncStorage/Expo APIs.
  - `apps/web`: Next.js `src/pages`, web UI, CSS Modules, browser routing.
- Never duplicate shared types/logic in app code; import from `@nusa/shared`.
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
- Read docs first: `docs/code-sharing-guide.md`, `docs/monorepo-structure.md`, then relevant `docs/features/*`, `docs/user-journeys/*`, `docs/wireframes/*`.
- Implement in this order for cross-platform changes:
  1) shared layer, 2) web/mobile adapters, 3) route/screen wiring.
- Keep edits surgical; preserve existing UX and file structure unless spec requires change.

## Commands and Validation
- Install all deps: `npm install`
- Web dev: `npm run web` (or `npm run dev --workspace=apps/web`)
- Mobile dev: `npm run mobile` (or `npm run start --workspace=apps/mobile`)
- Monorepo checks: `npm run lint` and `npm run type-check`
- Seed metro dataset when needed: `npm run seed:metro`
- For targeted checks during edits, run workspace-level scripts first (`apps/web` or `packages/shared`) before full monorepo validation.

## Environment + Runtime
- Web requires `apps/web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Mobile requires `apps/mobile/.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Expected runtime: Node `>=18`, npm `>=9`.

## Project-Specific Conventions
- Web route logic lives in `apps/web/src/pages/*` with providers in `apps/web/src/pages/_app.tsx`.
- Web styling uses CSS Modules; avoid introducing alternative styling systems.
- Preserve trust-level gating and metro-scoped behavior when changing feed/post flows.
- If a concern is used by both apps and does not depend on platform APIs, move it to `packages/shared`.
