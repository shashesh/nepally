# Decision: Post Tags Redesign, Global Posts & Premium Subscription

**Date:** 2026-02-17  
**Status:** Proposed  
**Impact:** High — affects database schema, shared types, create post flow, home feed, product roadmap, wireframes, and user journeys  

---

## Context

The original NUSA post system was designed as a "Smart Post Engine" with 4 rigid categories (Housing, Jobs, Emergency, Travel), each with mandatory structured fields, category-specific validation, and auto-expiry rules. While this ensured high-quality structured data, it:

1. **Limited content variety** — users couldn't post general questions, discussions, or political topics
2. **Created high friction** — each category had 5-10 mandatory fields, making posting slow
3. **Was not scalable** — adding a new category required a PostgreSQL ENUM migration, code changes in shared types, new validation schemas, new UI forms for each platform

The new design shifts to a Reddit-style simplified posting model with a scalable tag system.

---

## Decisions

### 1. Replace Categories with Tags

**Old system:** `post_category` PostgreSQL ENUM → `'housing' | 'jobs' | 'emergency' | 'travel'`  
**New system:** `tags` lookup table + `post_tags` junction table (many-to-many)

- Posts can have **1-3 tags** (at least 1 mandatory)
- Tags are stored in a database table (not an enum), making them scalable without migrations
- Initial tags: **Housing, Jobs, Help, Question, Politics, Discussion, Emergency**
- Emergency tag is flagged as `requires_moderation = true` in the tags table
- Old `category` column on posts will be migrated to the new tags system, then dropped

### 2. Simplify Create Post (Reddit-Style)

**Old flow:** CategorySelect screen → Category-specific form with 5-10 mandatory fields  
**New flow:** Single screen with:
- **Title** (required, 5-200 chars)
- **Body** (required, 10-5000 chars)
- **Tag selector** (chip/pill buttons, 1-3 required)
- **Optional photo picker** (up to 3 photos)
- **Global toggle** (premium users only)

All category-specific structured fields (rent amount, move-in date, pay range, company name, travel route, airline, emergency contact, urgency) are **removed**. Users describe everything in the body text.

### 3. Remove Auto-Expiry

**Old:** Posts auto-expired based on category (30d, 7d, 2d)  
**New:** Posts remain active until manually deleted by the author or removed by moderators/reporting system. The `expiry_date` column and auto-expiry cron function are removed.

### 4. Global Posts (Premium Feature)

- New `is_global` boolean column on `posts` table (default: false)
- Global posts are **injected into all metro feeds** alongside local posts
- Post cards display a **badge/pill** indicating "🌐 Global" or "📍 Local"
- Only premium users can toggle the global option on create post

### 5. Premium Subscription Model

- New `is_premium` boolean column on `users` table (default: false)
- Premium perks (for now):
  - **Global posting** — create posts visible across all metro areas
  - **Multiple saved locations** — up to 5 (non-premium users get 1 only)
- Non-premium users:
  - Cannot create global posts (toggle hidden/disabled)
  - Cannot add multiple saved locations (limited to 1 home location)
  - Existing saved locations feature is gated behind premium
- Billing integration (Stripe/IAP) deferred — `is_premium` flag set manually or via admin for now

### 6. Home Feed Redesign

**Old:** Category tabs (All, Housing, Jobs, Emergency, Travel)  
**New:** Unified feed with **filter chips** for each tag
- Scrollable horizontal chip bar showing all available tags
- "All" chip selected by default
- Multiple chips can be selected for multi-tag filtering
- Global and local posts mixed together with badge indicators
- Post cards show tag pills and Local/Global badge

### 7. Emergency Tag Special Handling

Emergency remains as a tag with `requires_moderation = true`. When a user selects the Emergency tag:
- No extra structured fields (same Title + Body as other posts)
- Emergency disclaimer shown before submission: "This is NOT a replacement for 911"
- Post created with `status = 'pending'` instead of `'active'`
- Moderators must approve before it becomes visible
- Red Alert notification system remains a Phase 2 feature

---

## Database Changes Summary

### New Tables
- `tags` — Tag lookup table (id, name, slug, icon, color, description, is_system, requires_moderation, sort_order, created_at)
- `post_tags` — Junction table (post_id, tag_id)

### Modified Tables
- `posts` — Add `is_global` (boolean, default false); Remove `category`, `fields`, `expiry_date` after migration
- `users` — Add `is_premium` (boolean, default false)

### Removed
- `post_category` ENUM type (after migration completes)
- `expire-posts` Edge Function (no more auto-expiry)

---

## Files Affected

### Database
- New migration: `005_tags_and_premium.sql`

### Shared Package (`packages/shared/`)
- `src/types/post.ts` — Remove PostCategory, add Tag/PostTag types, update Post interface
- `src/types/user.ts` — Add is_premium to User
- `src/constants/postCategories.ts` → rename to `src/constants/tags.ts`
- `src/constants/appConfig.ts` — Remove POST_EXPIRY_DAYS
- `src/api/posts.ts` — Rewrite createPost, getPostsByMetroArea for tags + global
- `src/api/tags.ts` — New: getTags, getTagBySlug
- `src/validation/housing.ts` — Delete (no more structured validation)
- `src/validation/jobs.ts` — Delete (no more structured validation)
- `src/validation/post.ts` — New: generic post validation (title + body + tags)
- `src/validation/index.ts` — Update exports
- `src/utils/date.ts` — Remove calculateExpiryDate
- `src/index.ts` — Update exports

### Mobile App (`apps/mobile/`)
- `src/screens/post/CreatePostScreen.tsx` — Complete rewrite (Reddit-style)
- `src/screens/post/CategorySelectScreen.tsx` — Delete
- `src/screens/HomeScreen.tsx` — Replace category tabs with filter chips, add badges
- `src/components/cards/PostCard.tsx` — Add tag pills + Local/Global badge
- `src/types/navigation.ts` — Update PostStackParamList (remove CategorySelect)
- `src/navigation/` — Update post creation navigator

### Web App (`apps/web/`)
- `src/pages/feed.tsx` — Replace category tabs with filter chips, add badges
- New: `src/pages/posts/create.tsx` — Create post page
- `src/components/` — PostCard updates

### Documentation
- `docs/database-schema.md` — Add tags table, update posts table
- `product-roadmap.md` — Update Phase 1 sections B, C
- `docs/features/phase1-feature-breakdown.md` — Update post engine features
- `docs/wireframes/06-home-screen-level-0.md` — Update feed layout
- New: `docs/wireframes/14-create-post.md` — Reddit-style create post wireframe
- `docs/user-journeys/post-creation/` — Update/create post creation journey
- `CLAUDE.md` — Update Smart Post Engine description
- `docs/code-sharing-guide.md` — Minor updates if needed

### Supabase Functions
- `supabase/functions/expire-posts/` — Mark as deprecated/remove

---

## Migration Strategy

1. Create `tags` table with 7 seeded tags
2. Create `post_tags` junction table
3. Add `is_global` to posts (default false)
4. Add `is_premium` to users (default false)
5. Migrate existing posts: map old `category` value → corresponding tag in `post_tags`
6. Drop `category` column, `fields` column, `expiry_date` column from posts
7. Drop `post_category` ENUM type
8. Update saved locations trigger to enforce 1 location for non-premium users

---

## Implementation Order

### Phase A: Database & Shared Layer (Foundation)
1. Write migration `005_tags_and_premium.sql`
2. Update shared types (Post, User, Tag, PostTag)
3. Update shared constants (tags config, remove post expiry)
4. Write new shared API functions (tags CRUD, updated post CRUD)
5. Write new shared validation schema (generic post)
6. Clean up deprecated shared code (housing/jobs validation, category-specific utils)

### Phase B: Mobile App
7. Rewrite CreatePostScreen (Reddit-style)
8. Remove CategorySelectScreen
9. Update navigation (PostStackParamList)
10. Update HomeScreen (filter chips + badges)
11. Update PostCard (tag pills + Local/Global badge)

### Phase C: Web App
12. Create post page
13. Update feed page (filter chips + badges)
14. Update PostCard component

### Phase D: Documentation
15. Update database-schema.md
16. Update product-roadmap.md
17. Update phase1-feature-breakdown.md
18. Create new wireframe (create-post)
19. Update home screen wireframe
20. Create decision document (this file)
21. Update user journeys

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Losing structured data quality (no mandatory rent/pay fields) | Users self-describe in body text; can add optional structured fields per-tag in future |
| Emergency posts without contact fields | Body text serves as free-form description; moderator reviews before publishing |
| Tag spam (users selecting irrelevant tags) | Moderator reporting system; future: auto-moderation |
| Premium gating confusion | Clear UI differentiation; premium badge; upsell prompts |
| Migration breaks existing posts | Careful SQL migration with rollback; test on staging first |
