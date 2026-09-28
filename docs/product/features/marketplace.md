# Feature: Marketplace

**Status:** Phase 1 MVP Implemented
**Last Updated:** 2026-09-27 (mobile browsing, location, saved state and price formatting)
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
- **Moderation:** Auto-publish + community reporting (using existing reports infra). 100 reports remove a listing (migration 047), and only a moderator can restore a removed listing; an owner's own delete is permanent too.
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
  - `views_count`: one per member, per listing, per UTC day. `contacts_count`: one per member, per listing, ever. The owner never counts on their own listing, only active listings count, and signed-out calls count nothing. `increment_listing_views` / `increment_listing_contacts` enforce this through the internal `listing_views` / `listing_contacts` tables (migrations 042–044), so repeat opens or taps can't inflate `trending_score` (`views + saves × 3 + contacts × 5`). `saves_count` is already one per member, because `saved_listings` is unique per member and listing.
- `refreshed_at` — for soft expiry (90-day threshold)

### Migration

- File: `supabase/migrations/014_marketplace.sql`
- Includes: tables, enums, indexes (including GIN full-text search), RLS policies, triggers, RPC functions, seed data

---

## Screens & Pages

### Mobile (React Native)

All in `apps/mobile/src/screens/marketplace/`:

- **MarketplaceHomeScreen** — Web-style rows: search, category tiles, then Sponsored, Featured, Recently Added and Trending strips (each hidden when empty) above the paged All listings grid; FAB for creating
- **MarketplaceCategoryScreen** — Category-filtered listing list with search and pagination
- **ListingDetailScreen** — Full listing view: photo carousel with a full-screen viewer, contact links, seller card, Contact/Save/Share actions
- **CreateListingScreen** — Create/edit form: Individual/Business toggle, photos with a cover, Zod validation
- **MyListingsScreen** — User's listings with status badges; Edit and Refresh in each row, Deactivate/Reactivate and Delete under More
- **SavedListingsScreen** — The member's saved listings; the heart unsaves and removes the card
- **BrowseCategoriesScreen**, **MarketplaceRulesScreen** — Category tiles; static marketplace rules

**Browsing (mobile).** The home screen loads through `useMarketplaceFeed`, as web's `MarketplaceBrowse` does:

- Nothing narrowing the view: the four strips plus the All listings grid.
- A category: the grid and that category's featured strip. A search: the grid only.
- "Nothing in your metro yet" appears only when the metro has no listings at all.
- A failed load says "Couldn't load listings." with Try again, and a failed next page says so at the foot of the list. The category screen, My Listings, Saved and listing detail do the same; detail shows "Listing not found" only when the listing is really gone.
- A failed pull-to-refresh keeps what is on screen and shows a compact "Couldn't refresh" note.
- Coming back to the screen refreshes quietly, keeping the scroll position.

**Location (mobile).** The marketplace follows the member's active location, a saved place or a visit, exactly as Home does (`useActiveMetro`). New listings go to that metro, as new posts do. The home header shows the metro, and tapping it, the menu's Change Location, or the empty state's Change location opens the location switcher in place.

**Saved hearts and prices (mobile).**

- Saving or unsaving shows at once everywhere (`useSavedListingIds`). A failure puts the heart back and says so.
- Prices go through the shared `formatListingPrice`, so "80" reads "$80" and "Negotiable" stays as typed, as on web.
- Sort options read "Price: low to high" and "Price: high to low".

**Creating and editing a listing (mobile).**

- A new listing starts as Individual. The type not picked saves nothing for its fields, so switching Business to Individual doesn't keep the business name.
- Every field shows its own error, and a failed submit scrolls to the first one and moves the screen reader there. A website typed without `https://` gets it.
- The return key moves to the next field. Phone, email, address and website autofill.
- Swipe-down, ✕ or Android back on a changed form asks "Discard this listing?" or "Discard your changes?" first.
- Creating opens the new listing. Saving an edit goes back to the listing, which refetches so the edits show.
- If the categories or the listing being edited fail to load, the form says so with Try again rather than showing empty fields.
- Photos come from the system picker, which needs no photo permission, or from the camera. The first photo is the cover (badged Cover), and "Make cover" moves another to the front. Photos that fail to process are counted in an alert.
- A failed save deletes the photos it just uploaded, but only when the server refused it; if the connection dropped, the listing may have saved, so they stay. A saved edit deletes the files of photos it dropped. Deleting a listing keeps its photos, since moderators can restore it.

**Listing detail (mobile).**

- Phone, email, website and address are links: they open the dialer, mail, the browser, and Maps (Apple Maps on iOS, the `geo:` handler on Android, else Google Maps in the browser). The shared `contactLinks` builds the URLs and allows only http and https websites. Plain values, such as the business name, can be selected.
- Contact Seller opens the chat with an editable draft, "Hi, is “{title}” still available?", so the seller knows which listing it's about. The button is busy while the conversation starts, and the contact count goes up only once the chat opens.
- The seller card shows the seller's photo and trust badge, and opens their public profile (your own Profile tab on your own listing). The marketplace stack carries `PublicProfileView` and `PostDetail` for this.
- Tapping a photo opens Galeria's full-screen viewer: pinch and double-tap to zoom, swipe between photos, swipe down to close. Galeria is native, so it's loaded only outside Expo Go; in Expo Go the photos show but don't open.
- Save is a heart, as on the grid. Counts read "1 view", hours read "9:00 AM – 5:00 PM", and Share sends the listing's web page (`listingWebUrl`) until the app has deep links.
- Each listing is its own screen (`getId`), so opening another listing from a profile pushes it rather than replacing the one below.

**My Listings (mobile).** Edit and Refresh stay in each row with 44pt targets; Deactivate or Reactivate and Delete sit under More (an action sheet on iOS, an alert on Android). Each change says when it failed, Refresh confirms it worked, and a listing ignores taps while a change is on its way. The empty state offers Create only from Trust Level 1, as Home does.

**Screen readers (mobile).** Listing cards read their title, category, price, seller and freshness. VoiceOver can't reach the heart inside a grid card, so the card offers Save or Unsave as a custom action. On My Listings the card's open button doesn't wrap the actions, so each is its own element.

### Web (Next.js)

All in `apps/web/src/pages/marketplace/`:

- **index.page.tsx** — Marketplace home: the Featured, Recently Added and Trending strips, plus the grid
- **[category].page.tsx** — Category filtered view, supports search mode
- **listing/[id].page.tsx** — Full listing detail page
- **create.page.tsx** — Create/edit listing form. A new listing starts as Individual, as on mobile. It shows every field's error, adds `https://` to a website, saves nothing for the type not picked, and tidies photos as mobile does
- **my-listings.page.tsx** — My listings management page

Both browse routes are thin wrappers over one `MarketplaceBrowse` component, so `/marketplace?category=<slug>` and `/marketplace/<slug>` show the same thing; only the heading, the back link and where a filter change navigates differ. The grid names the active category rather than always reading "All Listings". See [web-ui-system.md](../../architecture/web-ui-system.md) for the components and hooks behind it.

Category colour comes from the `--category-<slug>` design tokens, for the five categories that exist; the web CSS carried themed blocks for all twelve until the UI overhaul.

**Browse and listing detail (web).** A member with no metro yet sees "Choose your area to see listings" and a Set your area link to `/onboarding/zip`, not an endless loading grid. Listing detail shows the category and the item condition once, as badges under the title (the highlights strip no longer repeats them, on mobile too). Its price and actions render once, beside the listing on wide screens and between the photos and the description on narrow ones. A failed load reads "Couldn't load this listing." with Try again, never the server's own error text.

**My Listings (web).** Each listing's actions sit in one menu: Edit, Promote and Refresh (active listings), Deactivate or Reactivate, and Delete. Deactivate and Delete ask first. An action updates only its own row and says whether it worked; a failure leaves the row as it was. The list pages 20 at a time as the member scrolls, so an owner with more than 50 listings sees them all.

**Promoting a listing (web).** `/marketplace/listing/promote/<id>` runs three steps — type, duration, review and pay — then hands off to Stripe Checkout. Before the first step it refuses, with the reason, a listing the member does not own, an inactive listing, and a member below Trust Level 1. The `create-promotion-checkout` edge function is the authority on all three: it refuses another member's listing (403), a listing that is not active (409) and a member below Level 1 (403). The wizard checks first so a member is not walked through three steps to be refused, and checks the listing again when the member presses Pay, so one deactivated or deleted in another tab meanwhile gets the refusal screen rather than a bare checkout error. Pay stays busy once checkout has a URL, so a second click cannot open a second checkout session. `/marketplace/listing/promote/success` then polls the promotion until it goes active.

**Promoting a listing (mobile).** Not offered in the app for v1.0. Promotions are bought on the web (Apple 3.1.1), and promoted and sponsored listings still show in the app.

**Reporting a listing (mobile).** The flag on a listing opens the report sheet (reason plus optional details) and files a `listing` report that moderators see in the queue. Owners don't see the flag, and members below Trust Level 1 are asked to verify first, because the reports policy requires Level 1.

### Profile Integration

Both mobile and web profile pages include a "Listings" tab showing the user's marketplace listings alongside their posts and saved posts.

---

## Shared Package

All business logic in `packages/shared/`:

- **Types:** `src/types/marketplace.ts`
- **Constants:** `src/constants/marketplace.ts` (categories config, limits, labels)
- **Validation:** `src/validation/marketplace.ts` (Zod schemas: `createListingSchema`, `updateListingSchema`)
- **Form logic:** `src/logic/marketplace/listingForm.ts` (`buildListingFormInput`, `withUrlScheme`, `listingFieldErrors`, `isSameListingForm`) and `src/logic/listingPhotoCleanup.ts` (`cleanUpListingPhotos`, `cleanUpAfterFailedListingWrite`, `droppedListingPhotoPaths`)
- **API:** `src/api/marketplace.ts` (16 functions accepting `SupabaseClient` via DI)

### API Functions

| Function                   | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `getCategories`            | Fetch all categories sorted by sort_order                                |
| `getListingsByMetro`       | Active listings for metro area (with filters)                            |
| `getListingById`           | Single listing with owner/category joins                                 |
| `getListingsByOwner`       | Owner's listings for My Listings / profile. Returns `hasMore` for paging |
| `createListing`            | Create new listing                                                       |
| `updateListing`            | Update listing fields                                                    |
| `deactivateListing`        | Set status = inactive                                                    |
| `reactivateListing`        | Set status = active, reset refreshed_at                                  |
| `deleteListing`            | Soft delete (status = removed)                                           |
| `refreshListing`           | Reset refreshed_at to now()                                              |
| `saveListing`              | Bookmark a listing (idempotent)                                          |
| `unsaveListing`            | Remove bookmark                                                          |
| `getUserSavedListingIds`   | Get saved listing IDs for a user                                         |
| `getSavedListingsByUser`   | Full saved listings with details                                         |
| `incrementListingViews`    | Non-critical view counter; counts once per member per day                |
| `incrementListingContacts` | Contact counter; counts once per member per listing                      |

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
