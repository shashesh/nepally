# Feature: Marketplace

**Status:** Phase 1 MVP Implemented
**Last Updated:** 2026-03-27
**Priority:** High

---

## Overview

The Marketplace is a Craigslist/FB Marketplace-style listing system where businesses and individuals can advertise services, products, and businesses to the local Nepali diaspora community. The marketplace is separate from the peer-to-peer post system: posts are person-to-person; marketplace is business/service-oriented.

---

## Key Decisions

- **Core Model:** Individual listings (not persistent business profiles)
- **Seller Types:** Both Business and Individual (toggle)
- **Contact Flow:** In-app chat as primary action
- **Categories:** 12 Nepali-tailored categories
- **Expiration:** Universal soft expiry (90 days without refresh = deprioritized)
- **Scope:** Metro-area scoped (multi-metro/global = Phase 3 paid feature)
- **Moderation:** Auto-publish + community reporting (using existing reports infra)
- **Trust Level:** Level 1+ required to create; Level 0 can browse/save/contact
- **Engagement:** Save/bookmark + Contact only (no likes, comments, reviews)
- **My Listings:** Accessible from both profile tab and marketplace screen

---

## Categories (12)

1. Food & Restaurants (🍜)
2. Grocery & Specialty (🛒)
3. Professional Services (💼)
4. Immigration & Legal (⚖️)
5. Remittance & Finance (💸)
6. Health & Wellness (🏥)
7. Education & Tutoring (🎓)
8. Transportation (🚗)
9. Home Services (🏠)
10. Beauty & Wellness (💇)
11. Cultural Services (🎭)
12. Other (📦)

---

## Data Model

### Tables
- **`marketplace_categories`** — Seeded reference table (12 categories)
- **`marketplace_listings`** — Core listing data with structured fields
- **`saved_listings`** — User bookmark junction table

### Enums
- `listing_type`: business, individual
- `listing_status`: active, inactive, removed
- `item_condition`: new, used

### Key Fields (marketplace_listings)
- `owner_id`, `metro_area_id`, `category_id`
- `listing_type`, `status`, `title`, `description`, `photos`
- `price` (free-form text)
- Business fields: `business_name`, `address`, `business_hours`, `website_url`
- Individual fields: `item_condition`
- Contact: `phone`, `email`
- Counters: `views_count`, `saves_count`, `contacts_count`
- `refreshed_at` — for soft expiry (90-day threshold)

### Migration
- File: `supabase/migrations/014_marketplace.sql`
- Includes: tables, enums, indexes (including GIN full-text search), RLS policies, triggers, RPC functions, seed data

---

## Screens & Pages

### Mobile (React Native)
All in `apps/mobile/src/screens/marketplace/`:
- **MarketplaceHomeScreen** — Category grid, search bar, recent listings, FAB for creating
- **MarketplaceCategoryScreen** — Category-filtered listing list with search and pagination
- **ListingDetailScreen** — Full listing view, photo carousel, structured fields, Contact/Save actions
- **CreateListingScreen** — Create/edit form with Business/Individual toggle, Zod validation
- **MyListingsScreen** — User's listings with status badges, refresh/deactivate/delete actions

### Web (Next.js)
All in `apps/web/src/pages/marketplace/`:
- **index.page.tsx** — Marketplace home with category grid, search, recent listings
- **[category].page.tsx** — Category filtered view, supports search mode
- **listing/[id].page.tsx** — Full listing detail page
- **create.page.tsx** — Create/edit listing form
- **my-listings.page.tsx** — My listings management page

### Profile Integration
Both mobile and web profile pages include a "Listings" tab showing the user's marketplace listings alongside their posts and saved posts.

---

## Shared Package

All business logic in `packages/shared/`:
- **Types:** `src/types/marketplace.ts`
- **Constants:** `src/constants/marketplace.ts` (categories config, limits, labels)
- **Validation:** `src/validation/marketplace.ts` (Zod schemas: `createListingSchema`, `updateListingSchema`)
- **API:** `src/api/marketplace.ts` (16 functions accepting `SupabaseClient` via DI)

### API Functions
| Function | Purpose |
|----------|---------|
| `getCategories` | Fetch all categories sorted by sort_order |
| `getListingsByMetro` | Active listings for metro area (with filters) |
| `getListingById` | Single listing with owner/category joins |
| `getListingsByOwner` | Owner's listings for My Listings / profile |
| `createListing` | Create new listing |
| `updateListing` | Update listing fields |
| `deactivateListing` | Set status = inactive |
| `reactivateListing` | Set status = active, reset refreshed_at |
| `deleteListing` | Soft delete (status = removed) |
| `refreshListing` | Reset refreshed_at to now() |
| `saveListing` | Bookmark a listing (idempotent) |
| `unsaveListing` | Remove bookmark |
| `getUserSavedListingIds` | Get saved listing IDs for a user |
| `getSavedListingsByUser` | Full saved listings with details |
| `incrementListingViews` | Non-critical view counter |
| `incrementListingContacts` | Contact counter |

---

## Phasing

### Phase 1 (Implemented)
- Full CRUD for listings
- Category browsing and search
- Save/bookmark listings
- Contact via in-app chat
- My Listings management
- Profile integration (Listings tab)
- Soft expiry (90 days)

### Phase 2 (Planned)
- Nepali-Owned badge
- Community Favorites
- Share to social
- Listing Analytics dashboard

### Phase 3 (Planned)
- Promote to feed (native feed card)
- Sponsored sidebar section
- Multi-metro / global listings (paid)
- Payment integration

---

## Test Coverage

- **Shared validation:** 42 tests (`packages/shared/src/validation/marketplace.test.ts`)
- **Shared API:** 50 tests (`packages/shared/src/api/marketplace.test.ts`)
- **Mobile screens:** 5 tests (`apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx`)
- **Web pages:** 6 tests (`apps/web/src/pages/marketplace/index.test.tsx`)

---

## Related Documentation

- [Product Roadmap](../../product-roadmap.md) — Phase planning
- [Code Sharing Guide](../code-sharing-guide.md) — Shared-first architecture
- [Database Schema](../database-schema.md) — Full schema reference
