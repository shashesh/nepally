# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NUSA (Nepalese United Support Alliance) is a utility-first community platform designed for the Nepalese diaspora in the USA. The app shifts away from algorithm-based social media feeds to provide structured, location-based services for housing, jobs, emergencies, and travel coordination.

## Core Architecture Principles

### Metro-First Location Model
- Every piece of content is tagged with a US Census Metro Area ID
- Users are mapped to metro areas via ZIP code during onboarding
- Default view is always the local feed (content within the user's metro area)
- Hyper-local filtering allows radius-based searches (e.g., within 10 miles)

### Trust & Safety System
The platform uses a multi-tiered account system:
- **Level 0 (New)**: View-only or 1 post/day limit
- **Level 1 (Verified)**: Phone/social media verified, full posting rights
- **Level 2 (Contributor)**: High engagement/vouched, elevated visibility

### Tag-Based Post Engine (Reddit-Style)
Posts use a simplified Reddit-style format with a scalable tag system:
- **Title + Body + Tags**: All posts have a title, body, and 1-3 tags (mandatory)
- **Tags**: Housing, Jobs, Help, Question, Politics, Discussion, Emergency (stored in DB `tags` table, scalable)
- **No structured fields**: No category-specific mandatory fields (rent, pay range, etc.)
- **No auto-expiry**: Posts remain active until deleted by author or removed by moderators
- **Emergency tag**: Requires moderator approval before becoming visible
- **Global posts**: Premium users can toggle posts as global (visible in all metro feeds)
- **Badges**: Post cards show 📍 Local / 🌐 Global badge

### Premium Subscription
- `is_premium` flag on users (billing deferred)
- Premium perks: global posting + up to 5 saved locations
- Free users: local posts only, 1 saved location

### Two-Step Red Alert System
Emergency broadcasts require moderator verification:
1. User submits emergency post
2. Local community leads receive verification notification
3. Upon moderator verification, push notification sent to entire metro area

### Peer vs. Business Content
- **Peer Posts**: Free individual listings (roommates, travel buddies)
- **Business Profiles**: Dedicated profiles with review/rating system for restaurants, consultancies, etc.

### Shared-First Code Architecture (MANDATORY)

**Golden Rule: Share business logic, keep UI separate.**

This is a cross-platform monorepo (React Native + Next.js). ALL non-UI code MUST live in `packages/shared/` so both apps consume a single source of truth.

#### Code Placement Decision Tree
```
Is it a UI component, screen, or page?
  YES → apps/mobile/ (React Native) or apps/web/ (Next.js)
Does it use platform-specific APIs (AsyncStorage, react-native, next/router)?
  YES → apps/mobile/ or apps/web/
Everything else → packages/shared/
```

#### What MUST be in `packages/shared/`
- **Types & Interfaces** (`src/types/`) — ALL data models (User, Post, Message, etc.)
- **API Functions** (`src/api/`) — ALL Supabase query logic (CRUD, subscriptions)
- **Validation Schemas** (`src/validation/`) — ALL Zod schemas for forms
- **Utilities** (`src/utils/`) — Date formatting, phone formatting, ZIP validation, etc.
- **Constants** (`src/constants/`) — Enums, config objects, trust levels, post categories
- **Business Logic** (`src/logic/`) — Trust level calculation, expiry logic, etc.

#### What stays platform-specific
- `apps/mobile/`: React Native components, screens, navigation, AsyncStorage config, RN StyleSheet
- `apps/web/`: Next.js pages, React components, CSS/Tailwind styling, localStorage config
- Platform-specific Supabase client initialization (each app creates its own client and passes it to shared API functions)

#### Import Rules
- `apps/mobile/` and `apps/web/` MUST import from `@nusa/shared` — NEVER redefine types, validation, API calls, or constants locally
- `packages/shared/` MUST NOT import from `react-native`, `expo-*`, `next`, or any platform-specific package
- If you find yourself writing the same type/function/constant in two places, it belongs in `packages/shared/`

#### API Function Pattern (Dependency Injection)
Shared API functions accept a Supabase client as a parameter so each platform can pass its own initialized client:
```typescript
// packages/shared/src/api/posts.ts
import { SupabaseClient } from '@supabase/supabase-js';

export async function getPostsByMetro(supabase: SupabaseClient, metroId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('metro_area_id', metroId);
  if (error) throw error;
  return data;
}
```

#### Type Convention
- Shared types use **snake_case** matching Supabase database column names (since both platforms consume Supabase responses directly)
- This eliminates the need for case-conversion layers and prevents type divergence

#### Mandatory References
Before implementing ANY feature, read:
- `docs/code-sharing-guide.md` — Full guide with examples for shared vs platform-specific code
- `docs/monorepo-structure.md` — Package boundaries, build order, and import rules

## Tech Stack

- **Mobile**: React Native + Expo 54 (iOS & Android)
- **Web**: Next.js 15 (TypeScript)
- **Backend**: Supabase (PostgreSQL with real-time subscriptions, RLS, Edge Functions)
- **Auth**: Supabase Auth (phone SMS, email, Google OAuth)
- **Storage**: Supabase Storage (photos, CDN)
- **Location**: Static ZIP-to-Metro dataset (HUD USPS Crosswalk, zero API costs)
- **Language**: TypeScript across all packages
- **React**: 19.1.0 (unified across mobile and web)

See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for exact versions.

## Implementation Workflow

**CRITICAL: Always gather context before coding**

When implementing any feature, follow this mandatory sequence:

### 1. Context Gathering (Read ALL relevant documentation)
- **Feature Specification**: `docs/features/[feature-name].md` (if exists)
- **User Journey**: `docs/user-journeys/[category]/[number]-[journey-name].md`
  - Provides step-by-step user flow, pain points, edge cases, API requirements
- **Wireframes**: `docs/wireframes/[screen-name].md`
  - Provides exact layout, component specs, interactive states, validation rules
- **Design System**: `docs/wireframes/00-design-system-foundation.md`
  - Provides colors, typography, spacing, component library
- **Code Sharing Guide**: `docs/code-sharing-guide.md`
  - Provides decision tree for shared vs platform-specific code
- **Monorepo Structure**: `docs/monorepo-structure.md`
  - Provides package boundaries and import rules

### 2. Platform & Sharing Analysis (MANDATORY before planning)
- Determine target platforms: **Mobile only**, **Web only**, or **Both** (default: Both)
- For each code unit (types, API calls, validation, utils, constants, business logic):
  - Does it contain UI or platform-specific APIs? → `apps/{platform}/`
  - Everything else → `packages/shared/`
- List what goes in `packages/shared/` FIRST — this is the foundation both apps build on
- Check existing `packages/shared/src/` exports to avoid duplication

### 3. Planning (Always use EnterPlanMode for non-trivial work)
- Map documentation to code structure
- Identify all components, screens, services needed
- Define file structure and implementation order
- Create validation checklist against documentation

### 4. Implementation (Only after plan approval)
- **Shared Layer First**: Types, validation schemas, API functions, utils, constants in `packages/shared/`
- **Export from shared index**: Update `packages/shared/src/index.ts` with new exports
- **Mobile UI**: React Native components, screens, navigation importing from `@nusa/shared`
- **Web UI**: Next.js pages, components importing from `@nusa/shared`
- **Error Handling**: Implement all edge cases from documentation

### 5. Validation (Before marking complete)
- Verify implementation matches wireframes pixel-perfect
- Test all interactive states (default, pressed, disabled, error, loading)
- Verify all validation rules from wireframes applied
- Test all edge cases from user journey
- **Verify shared-first compliance**: Run `/shared-first-check` to ensure no duplicated types/logic
- Demo to user and iterate based on feedback

### Available Skills
- `/design-feature [feature-name]` - Create feature specification
- `/user-journey [journey-name]` - Document user flow
- `/wireframe [screen-name]` - Create screen wireframe
- `/implement-feature [feature-name]` - Guided feature implementation with full context
- `/shared-first-check` - Validate that code follows shared-first architecture (run after every implementation)

**Never start coding without first reading the relevant documentation. Context-first development prevents misalignment and rework.**

## Key Safety Features to Implement

- **PII Masking**: Sensitive emergency data hidden behind "Click to Reveal" for logged-in users only
- **AI Moderation**: Automated scanning for scam-related keywords (crypto, "fast cash")
- **Explicit Disclaimers**: Clear TOS stating the platform is a community notice board, not a professional emergency/legal/medical service

## Current Phase Status

**PHASE 1: Utility Core & Trust Foundation**
- Done: Onboarding, home feed, tag-based posts, profile management, location management, in-app chat, likes, comments
- Next up: Profile photo upload, post photo upload, reporting system, admin dashboard

## Development Phases

### Phase 1: Utility Core & Trust Foundation
Focus on identity verification, tag-based posting (Reddit-style), metro-based feeds with global post support, premium subscription scaffolding, and in-app chat.

### Phase 2: Community Safety & Growth
Implement the Red Alert system, peer vs. business distinction, and hyper-local filtering.

### Phase 3: Sustainability & Ecosystem
Build self-service ad portal, AI moderation, billing integration (Stripe/IAP), and resource wiki for immigration/tax/legal guides.
