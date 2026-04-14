# Feature: Marketplace — Future Feature Recommendations

**Status:** Planning / Backlog
**Last Updated:** 2026-03-31
**Priority:** TBD per phase

---

## Overview

This document captures innovative feature recommendations for Nepally's multi-sided marketplace, organized by the three distinct user journeys the platform serves: Casual Browsers, Individual Sellers, and Business Advertisers. Each feature includes a value proposition and ecosystem benefit.

These recommendations build on Phase 1 (implemented) and inform prioritization for Phase 2 and Phase 3.

---

## User Journey 1: The Casual Browser

*Goal: Reduce time-to-discovery and minimize the "cold start" anxiety of a new marketplace.*

### 1.1 Metro-Radius Feed with Visual Price Heat Maps
Show listing density and price clusters on a map scoped to the user's metro area and ZIP radius. Browsers see supply and value signals at a glance without querying.

**Value proposition:** Surfaces geographic demand gaps to sellers; gives browsers a spatial context unavailable from a flat list.

### 1.2 "Community Picks" Shelf
A weekly curated row of listings voted on by trusted Level 2 Contributors, surfaced at the top of the marketplace home screen.

**Value proposition:** Builds social proof without algorithmic black boxes — critical for a trust-first diaspora community. Increases engagement for high-quality listings.

### 1.3 Saved Search Alerts (Push + Email)
Users set a search with filters (category, price, metro) and receive a notification when a matching listing appears.

**Value proposition:** Converts passive browsers into high-intent return visitors. Reactivates dormant users without requiring ad spend.

### 1.4 Bilingual Listing Previews
One-tap toggle between English and Nepali on listing cards and detail pages.

**Value proposition:** Reduces friction for first-generation users who prefer Nepali; directly expands the addressable audience with no additional listings required.

### 1.5 "Recently Viewed by People Near You"
A shelf showing listings that other users in the same metro area have recently viewed.

**Value proposition:** Drives discovery through community behavior rather than cold algorithmic recommendations. Builds a sense of shared local activity.

---

## User Journey 2: The Individual Seller

*Goal: Make listing creation fast, optimize for inquiry rates, and reduce ghosting.*

### 2.1 AI Listing Assistant
Seller inputs bullet points about their item or service; an AI model drafts a full description, suggests up to 3 relevant tags, and flags missing required fields (no price, no photos).

**Value proposition:** Reduces the listing quality gap between experienced and new sellers. Increases the average quality of listings without enforcement overhead.

**Implementation note:** Leverages the Claude API; fits naturally into the `CreateListingScreen` form flow.

### 2.2 Photo Checklist + Reorder UI
A step-by-step prompt during listing creation: "Add a front view, close-up, and dimension shot." Users can drag to reorder photos before submitting.

**Value proposition:** Listings with 3+ photos see significantly lower inquiry abandonment. The `listing-photos` storage bucket (migration `015`) is already in place — this is a pure UI feature.

### 2.3 Inquiry Response Templates
Pre-written reply starters surfaced when a seller opens a chat initiated from a listing: "Item still available!", "Can meet at [location]", "Price is firm."

**Value proposition:** Reduces response latency, which is the primary driver of completed sales in C2C marketplaces. Reduces the effort cost of staying responsive.

### 2.4 Listing Performance Nudges
After a configurable period with no views (e.g. 72 hours), the seller receives an in-app notification: "Your listing has low visibility — try adding a photo or adjusting your price."

**Value proposition:** Actionable feedback loop that keeps sellers engaged and improves average listing quality over time. Reduces silent listing churn.

### 2.5 "Bump" Visibility Boost (Premium)
A one-tap action from My Listings that re-ranks a listing to the top of the metro feed. Available once per listing per 7-day window for Premium users.

**Value proposition:** Monetization lever that gives sellers clear value without feeling predatory. Seller controls timing, preserving trust. Ties into Phase 3 Premium feature set.

---

## User Journey 3: The Business Advertiser

*Goal: Give businesses measurable ROI and tools to build community credibility, not just ad reach.*

### 3.1 Sponsored Metro Banner (CPM)
A geo-targeted banner slot visible only in the advertiser's metro area, surfaced at the top of the marketplace home screen and category feeds.

**Value proposition:** Keeps ad spend hyper-local and relevant — a Nepali grocery in Dallas doesn't pay for Denver eyeballs. Directly aligns with the platform's Metro-First location model.

### 3.2 Business Verified Badge + Profile
An extension of the existing trust system (Level 3: Business Verified). Displays business registration number, years in operation, and community reviews on the listing and seller profile.

**Value proposition:** Converts advertising spend into lasting reputation capital. Trusted businesses convert browsers to buyers faster, increasing platform transaction volume.

### 3.3 Post Boosting from Business Profile
Businesses can promote an existing community post (e.g. a job listing or event) as a "Promoted Post" — a native ad format surfaced in the regular feed with a "Sponsored" label.

**Value proposition:** Native ad formats consistently outperform banners in CTR. Keeps the ad experience aligned with the platform's community feel.

### 3.4 Engagement Analytics Dashboard
Per-listing metrics: views, saves, inquiry-to-contact rate, weekly trend lines. Available to Business Verified accounts.

**Value proposition:** Gives advertisers data to justify budget, iterate on listing content, and measure ROI — the primary reason businesses churn after a first paid cycle.

### 3.5 "Community Partner" Program
Businesses that sponsor local events or contribute to Emergency-tagged posts receive a visible "Community Partner" badge on their listings and profile page for 30 days.

**Value proposition:** Incentivizes businesses to give back to the community, which strengthens the platform's reputation and differentiates Nepally from generic classifieds. Creates a virtuous cycle between advertiser spend and community trust.

---

## Cross-Cutting Ecosystem Feature

### Trust-Gated Listing Tiers

Extend the existing trust level model to marketplace listing visibility:

| Trust Level | Listing Scope |
|---|---|
| Level 0 (New) | Browse only — cannot create listings |
| Level 1 (Verified) | Listings visible in local metro feed |
| Level 2 (Contributor) | Listings visible metro-wide; eligible for Community Picks |
| Level 2 + Premium | Global toggle enabled (Phase 3) |

**Value proposition:** Creates a natural upgrade path for sellers and keeps marketplace quality high as the platform scales. Consistent with the trust model already governing the post system.

---

## Prioritization Guidance

Features recommended for earliest implementation based on current codebase readiness:

| Feature | Why Now |
|---|---|
| Photo Checklist + Reorder UI (2.2) | `listing-photos` storage bucket already built in migration `015` — pure UI work |
| Saved Search Alerts (1.3) | Notification scaffold (mobile screens + preferences) already exists |
| Listing Performance Nudges (2.4) | Low backend cost; high impact on seller retention |
| Inquiry Response Templates (2.3) | In-app chat already implemented; templates are a chat UI addition |

---

## Related Documentation

- [Marketplace Feature (Phase 1)](./marketplace.md) — Implemented feature spec
- [Product Roadmap](../../product-roadmap.md) — Phase planning
- [Code Sharing Guide](../code-sharing-guide.md) — Shared-first architecture
- [Database Schema](../database-schema.md) — Full schema reference
