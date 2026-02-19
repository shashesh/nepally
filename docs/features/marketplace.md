# Feature: Marketplace

**Status:** Phase 1 (Documentation Only - Implementation Deferred)
**Last Updated:** 2026-02-19
**Priority:** Medium

---

## Overview

The Marketplace feature serves as a dedicated space for businesses, services, and classified ads within the Nepalese diaspora community. It separates commercial content from peer-to-peer community posts, providing a cleaner experience for both consumers and business owners.

---

## Purpose

- **Business Promotion:** Give local Nepalese businesses visibility within the community
- **Service Discovery:** Help community members find trusted Nepalese-owned services
- **Revenue Foundation:** Establish infrastructure for future paid promotions (Phase 3)
- **Content Separation:** Keep commercial content separate from community discussions

---

## MVP Scope (Phase 1 Documentation)

### Business Listings
- Browse local businesses and services
- View business details: name, category, description, contact
- See business location and operating hours
- Filter by business category

### Business Categories
- Restaurants & Food
- Grocery & Markets
- Professional Services (Legal, Tax, Immigration)
- Health & Wellness
- Education & Tutoring
- Transportation
- Beauty & Personal Care
- Home Services
- Other

### Display
- Grid or list view of business cards
- Business cards showing: name, category, rating (future), location
- "Coming Soon" placeholder in Phase 1 implementation

### Future Features (Post-MVP)
- Business profile creation and management
- Review and rating system
- Photo galleries for businesses
- Verified business badge
- Paid promotion tiers
- Analytics dashboard for business owners
- Appointment booking integration
- Deal/coupon posting

---

## User Stories

### As a community member, I want to:
- Find Nepalese restaurants and grocery stores in my area
- Discover professional services (lawyers, accountants, consultants)
- Read reviews before visiting a business
- Contact businesses directly through the app

### As a business owner (future), I want to:
- Create a profile for my business
- Showcase my products/services with photos
- Receive and respond to customer inquiries
- Track views and engagement on my listing
- Promote my business to reach more customers

### As a premium user, I want to:
- See businesses across all my saved locations
- Access exclusive deals from partner businesses

---

## Data Model

```typescript
interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  metro_area_id: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: BusinessHours;
  photos: string[];
  owner_id: string;
  is_verified: boolean;
  is_premium_listing: boolean;
  rating_average: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
}
```

---

## UI/UX

### Navigation
- Marketplace tab in bottom navigation bar
- Icon: `storefront-outline` (Ionicons)
- Position: 5th tab (Home, Post, Events, Marketplace, Profile)

### Marketplace Screen
- Header: "Marketplace" with metro area context
- Category filter chips or tabs
- Search bar for business name/keyword
- Business cards in grid or list layout
- Empty state for no businesses in area

### Business Card Design
- Business name (bold, primary text)
- Category badge
- Star rating + review count (future)
- Location/distance
- Thumbnail photo

### Business Detail Screen (future)
- Full business information
- Photo gallery
- Reviews section
- Contact actions (Call, Message, Directions)
- Share business button

---

## Technical Considerations

### Database
- New `businesses` table with RLS policies
- `business_categories` reference table
- `reviews` table for ratings
- Full-text search index on business name/description

### API Endpoints
- `GET /businesses?metro_area_id={id}&category={cat}` - List businesses
- `GET /businesses/{id}` - Get business details
- `POST /businesses` - Create business listing (future)
- `GET /businesses/{id}/reviews` - Get reviews
- `POST /businesses/{id}/reviews` - Submit review (future)

### Search
- Full-text search on business name, description, category
- Location-based filtering by metro area
- Future: Distance-based search using coordinates

---

## Phase 1 Implementation

For Phase 1, the Marketplace tab will show a "Coming Soon" placeholder screen with:
- Illustration indicating the feature is in development
- Brief description: "Discover local Nepalese businesses and services"
- Optional interest form for business owners who want to be listed

---

## Revenue Model (Phase 3)

### Free Listings
- Basic business profile
- Standard placement in search results
- Contact information display

### Premium Listings
- Featured placement in search results
- Enhanced profile with more photos
- Analytics dashboard
- Priority customer support

### Promoted Listings
- Top-of-category placement
- Cross-metro visibility
- Banner ads in relevant sections

---

## Success Metrics

### Phase 1
- [ ] Marketplace tab visible in navigation
- [ ] "Coming Soon" placeholder renders correctly
- [ ] No navigation errors

### Future Phases
- [ ] 100+ business listings per major metro
- [ ] 50% of businesses receive at least 1 review
- [ ] 20% of users browse Marketplace weekly
- [ ] 10% conversion from browse to contact
- [ ] Revenue from premium/promoted listings (Phase 3)

---

## Related Documentation

- [Home Screen Wireframe](../wireframes/06-home-screen-level-0.md) - Bottom navigation context
- [Product Roadmap](../../product-roadmap.md) - Phase planning
- [Peer vs Business Distinction](../../product-roadmap.md#b-peer-vs-business-distinction) - Business profiles context
