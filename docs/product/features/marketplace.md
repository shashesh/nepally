# Feature: Marketplace

**Status:** Phase 1 MVP Implemented
**Last Updated:** 2026-04-13
**Priority:** High

---

## Overview

The Marketplace is a Craigslist/FB Marketplace-style listing system where businesses and individuals can advertise services, products, and businesses to the local Nepali diaspora community. The marketplace is separate from the peer-to-peer post system: posts are person-to-person; marketplace is business/service-oriented.

---

## Key Decisions

- **Core Model:** Individual listings (not persistent business profiles)
- **Seller Types:** Both Business and Individual (toggle)
- **Contact Flow:** In-app chat as primary action
- **Categories:** 5 Nepali-tailored categories (consolidated from original 12)
- **Expiration:** Universal soft expiry (90 days without refresh = deprioritized)
- **Scope:** Metro-area scoped (multi-metro/global = Phase 3 paid feature)
- **Moderation:** Auto-publish + community reporting (using existing reports infra)
- **Trust Level:** Level 1+ required to create; Level 0 can browse/save/contact
- **Engagement:** Save/bookmark + Contact only (no likes, comments, reviews)
- **My Listings:** Accessible from both profile tab and marketplace screen

---

## Categories (5)

Consolidated from 12 original categories via `016_consolidate_marketplace_categories.sql`.

1. Food & Restaurants (🍜) — includes grocery & specialty
2. Immigration & Legal (⚖️)
3. Professional Services (💼) — includes health, education, home services, transportation, beauty, cultural
4. Remittance & Finance (💸)
5. Other (📦)

---

## Data Model

### Tables

- **`marketplace_categories`** — Seeded reference table (5 categories)
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

- **index.page.tsx** — Marketplace home: the Featured, Recently Added and Trending strips, plus the grid
- **[category].page.tsx** — Category filtered view, supports search mode
- **listing/[id].page.tsx** — Full listing detail page
- **create.page.tsx** — Create/edit listing form
- **my-listings.page.tsx** — My listings management page

Both browse routes are thin wrappers over one `MarketplaceBrowse` component, so `/marketplace?category=<slug>` and `/marketplace/<slug>` show the same thing; only the heading, the back link and where a filter change navigates differ. The grid names the active category rather than always reading "All Listings". See [web-ui-system.md](../../architecture/web-ui-system.md) for the components and hooks behind it.

Category colour comes from the `--category-<slug>` design tokens, for the five categories that exist; the web CSS carried themed blocks for all twelve until the UI overhaul.

**My Listings (web).** Each listing's actions sit in one menu: Edit, Promote and Refresh (active listings), Deactivate or Reactivate, and Delete. Deactivate and Delete ask first. An action updates only its own row and says whether it worked; a failure leaves the row as it was. The list pages 20 at a time as the member scrolls, so an owner with more than 50 listings sees them all.

**Promoting a listing (web).** `/marketplace/listing/promote/<id>` runs three steps — type, duration, review and pay — then hands off to Stripe Checkout. Before the first step it refuses, with the reason, a listing the member does not own, an inactive listing, and a member below Trust Level 1. The `create-promotion-checkout` edge function is the authority on all three: it refuses another member's listing (403), a listing that is not active (409) and a member below Level 1 (403). The wizard checks first so a member is not walked through three steps to be refused, and checks the listing again when the member presses Pay, so one deactivated or deleted in another tab meanwhile gets the refusal screen rather than a bare checkout error. Pay stays busy once checkout has a URL, so a second click cannot open a second checkout session. `/marketplace/listing/promote/success` then polls the promotion until it goes active.

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
| `getListingsByOwner` | Owner's listings for My Listings / profile. Returns `hasMore` for paging |
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

- [Product Roadmap](../roadmap.md) — Phase planning
- [Code Sharing Guide](../../guides/code-sharing.md) — Shared-first architecture
- [Database Schema](../../architecture/database-schema.md) — Full schema reference
