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

### Smart Post Engine (Structured Content)
Posts are category-based with mandatory fields and auto-expiry:
- **Housing**: Rent, move-in date, room type (expires in 30 days)
- **Jobs**: Title, pay, employment type (expires in 30 days)
- **Emergency**: Type, location, contact info (expires in 7 days)
- **Travel**: Date, route, airline (expires 2 days after travel)

### Two-Step Red Alert System
Emergency broadcasts require moderator verification:
1. User submits emergency post
2. Local community leads receive verification notification
3. Upon moderator verification, push notification sent to entire metro area

### Peer vs. Business Content
- **Peer Posts**: Free individual listings (roommates, travel buddies)
- **Business Profiles**: Dedicated profiles with review/rating system for restaurants, consultancies, etc.

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

### 2. Planning (Always use EnterPlanMode for non-trivial work)
- Map documentation to code structure
- Identify all components, screens, services needed
- Define file structure and implementation order
- Create validation checklist against documentation

### 3. Implementation (Only after plan approval)
- **Foundation First**: Create design tokens (colors, typography, spacing) from design system
- **Shared Components**: Build reusable UI components (buttons, inputs, cards)
- **Screens**: Implement screens matching wireframes exactly (pixel-perfect)
- **Services**: Implement API clients and business logic
- **Navigation**: Connect screens following user journey flow
- **Error Handling**: Implement all edge cases from documentation

### 4. Validation (Before marking complete)
- Verify implementation matches wireframes pixel-perfect
- Test all interactive states (default, pressed, disabled, error, loading)
- Verify all validation rules from wireframes applied
- Test all edge cases from user journey
- Demo to user and iterate based on feedback

### Available Skills
- `/design-feature [feature-name]` - Create feature specification
- `/user-journey [journey-name]` - Document user flow
- `/wireframe [screen-name]` - Create screen wireframe
- `/implement-feature [feature-name]` - Guided feature implementation with full context

**Never start coding without first reading the relevant documentation. Context-first development prevents misalignment and rework.**

## Key Safety Features to Implement

- **PII Masking**: Sensitive emergency data hidden behind "Click to Reveal" for logged-in users only
- **AI Moderation**: Automated scanning for scam-related keywords (crypto, "fast cash")
- **Explicit Disclaimers**: Clear TOS stating the platform is a community notice board, not a professional emergency/legal/medical service

## Development Phases

### Phase 1: Utility Core & Trust Foundation
Focus on identity verification, structured posting forms, metro-based feeds, and in-app chat.

### Phase 2: Community Safety & Growth
Implement the Red Alert system, peer vs. business distinction, and hyper-local filtering.

### Phase 3: Sustainability & Ecosystem
Build self-service ad portal, AI moderation, and resource wiki for immigration/tax/legal guides.
