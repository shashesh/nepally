# NUSA App: Product Roadmap

**Version:** 1.4
**Last Updated:** 2026-03-05 (Public Profile View: privacy-safe user profiles on mobile + web)

---

## Executive Summary

### Mission
Provide a reliable, structured, and localized utility platform that empowers the Nepalese diaspora in the USA to support one another through life transitions, emergencies, and community growth.

### Vision
Solve the "information noise" of Facebook by shifting from an algorithm-based feed to a **utility-first interface** with structured search and verified local relevance.

---

## Core Architecture: Metro-First Model

### Overview
To maintain relevance and prevent "feed fatigue," the app is built on a location-based hierarchy.

### How It Works
- **Content Tagging:** Every piece of content is tagged with a **Metro Area ID** (local posts) or marked as **Global** (premium feature)
- **Onboarding Flow:** Users enter their ZIP Code → App maps it to the official **US Census Metro Area** (e.g., *Dallas-Fort Worth-Arlington*)
- **Default View:** The home feed shows local posts from the user's metro area **plus** global posts, with a badge distinguishing 📍 Local vs 🌐 Global
- **Premium Users:** Can create global posts visible across all metro areas and save up to 5 locations

---

## Phase 1: Utility Core & Trust Foundation

**Goal:** Prove immediate value while establishing a safe, verified community.

### A. Identity & Account Levels

To prevent spam, accounts have "Trust Levels":

| Level | Name | Capabilities |
|-------|------|-------------|
| **0** | New | View-only or limited to 1 post/day |
| **1** | Verified | Phone/Social media verified; full posting rights |
| **2** | Contributor | High engagement/vouched for by others; higher visibility |

**Trust Level Progression Rules:**
- **Level 0 → Level 1:** Complete phone verification (SMS OTP via Supabase Auth) OR link social media account (email confirmation required)
- **Level 1 → Level 2:** Achieve 10+ approved posts with average 5+ upvotes each OR receive moderator endorsement
- **Demotion Policy:** Users flagged 5+ times with confirmed violations may be demoted or banned

### B. Tag-Based Post Engine (Reddit-Style)

Posts follow a simplified Reddit-style format: **Title + Body + Tags**. No structured category-specific fields — users describe everything in the body text. Tags are stored in the database for scalability (not enums).

**Create Post Flow (Single Screen):**
- **Title** (required, 5-200 characters)
- **Body** (required, 10-5000 characters)
- **Tags** (1-3 required, selectable chip/pill buttons)
- **Photos** (optional, up to 3 images)
- **Global toggle** (premium users only — makes post visible across all metro areas)
- **Edit mode:** Authors can reopen the same form to edit title/body/tags/photos and save changes

**Available Tags:**

| Tag | Icon | Description | Special Behavior |
|-----|------|-------------|------------------|
| 🏠 Housing | home | Rent, roommates, apartments, housing questions | None |
| 💼 Jobs | briefcase | Job postings, hiring, career questions | None |
| 🆘 Help | hand | Requests for help, assistance, favors | None |
| ❓ Question | question | General questions about life in the US | None |
| 🏛️ Politics | building | Community politics, policy discussions | None |
| 💬 Discussion | chat | Open discussions, opinions, community topics | None |
| 🚨 Emergency | warning | Emergencies requiring community coordination | Requires moderator approval; post starts as `pending` |

**Tag System Architecture:**
- Tags stored in a `tags` database table (scalable — new tags added without code changes)
- Posts linked to tags via `post_tags` junction table (many-to-many)
- Each tag has: name, slug, icon, color, description, requires_moderation flag
- New tags can be added by admins at any time

**Post Lifecycle:**
- No auto-expiry — posts remain active until manually deleted by author or removed by moderators
- Posts can be reported and auto-hidden with 3+ reports (pending moderator review)
- Authors can edit their own posts at any time (title, body, tags, global toggle, photos)
- Authors can delete their own posts at any time
- Author-owned post menus include **Edit Post**, **Delete Post**, and **Share Post** on mobile and web feed/detail views

**Contact Method:** All post inquiries handled via in-app chat system (Level 1+ can message post authors)

**Photo Specifications:**
- Max 3 photos per post (optional for all tags)
- Auto-compressed to 2MB max per photo
- Resized to 1200px width for optimal mobile viewing
- Stored in Supabase Storage
- In edit mode, authors can remove existing photos, add new photos, and reorder final photo sequence before saving

**Emergency Tag Safety:**
- Selecting the Emergency tag triggers moderator review (post created with `status = 'pending'`)
- Disclaimer shown before submission: "⚠️ This is NOT a replacement for 911. Call emergency services first for life-threatening situations."
- Moderators must approve before the post becomes visible in feeds
- Red Alert metro-wide push notification system remains a Phase 2 feature

### B2. Premium Subscription & Global Posts

**Premium Model:** Users can upgrade to premium for enhanced features.

| Feature | Free User | Premium User |
|---------|-----------|-------------|
| Create local posts | ✅ (Level 1+) | ✅ |
| Create global posts | ❌ | ✅ (toggle on create post) |
| Saved locations | 1 (Home only) | Up to 5 (Home, Work, custom) |
| Location switching | ❌ | ✅ |
| All other features | ✅ | ✅ |

**Global Posts:**
- Premium users see a "Global" toggle on the create post screen
- Global posts appear in **all metro area feeds** alongside local posts
- Post cards display a badge: 🌐 "Global" or 📍 "Local"
- Global posts have `is_global = true` in the database

**Premium Implementation:**
- `is_premium` boolean flag on users table (default: false)
- Billing integration (Stripe/IAP) deferred to Phase 3
- Premium status can be set by admins or via future billing webhook

**Saved Locations (Premium Gating):**
- Free users: 1 saved location (Home), set during onboarding
- Premium users: Up to 5 saved locations with custom labels
- Location switcher in home feed header only functional for premium users

### C. Social Engagement Features (NEW)

**Enhanced Post Cards:** Redesigned home feed for better discoverability and trust.

**Features:**
- **Author visibility:** Post cards show author name, profile photo (or initials), and trust badge
- **Description previews:** First 150 characters displayed on feed with "View More" link
- **Social signals:** Like and comment counts visible on every post
- **Action bar:** Quick actions for Like, Comment, and Message directly from feed

**Post Likes (Helpful Votes):**
- **Purpose:** Users can mark posts as helpful to bookmark and indicate quality
- **Visibility:** Like count displayed on post cards and detail screens
- **Access:** Level 1+ users can like posts; Level 0 users can view likes
- **Benefits:** Posts with 10+ likes receive "Helpful" badge, higher search ranking
- **Database:** Individual like tracking prevents duplicate likes per user

**Post Comments (Public Discussion):**
- **Purpose:** Public Q&A threads on posts, separate from private chat
- **Features:**
  - Comment on any post to ask questions visible to all users
  - Authors can reply publicly (benefits entire community)
  - Comment counter shown on post cards
  - Delete own comments
- **Access:** Level 1+ users can comment; Level 0 users can read comments
- **Moderation:** Comments can be reported and reviewed by moderators
- **Character limit:** 1000 characters per comment

**Profile Photos:**
- **Purpose:** Build trust and recognition through profile photos
- **Upload:** Users can upload profile photos from camera or photo library
- **Cropping:** Square (1:1) crop with zoom/pan controls
- **Storage:** Supabase Storage, auto-compressed to 500KB, 500x500px
- **Display:** Profile photos shown in post cards, comments, chat, profile screen
- **Fallback:** Initials displayed when no photo (colored by trust level)

**Benefits:**
- Increased trust through author visibility and social proof
- Reduced repetitive questions via public comments
- Better content discovery through likes and engagement metrics
- Stronger community identity through profile photos

**Level 0 User Experience:**
- Can view all likes and comments (read-only access)
- Like and comment buttons show verification prompts
- Encourages phone verification to unlock full engagement

### C2. Home Feed Design

**Unified Feed with Filter Chips:**
- Single scrollable feed showing all posts (local + global mixed)
- Horizontal filter chip bar above the feed with all available tags
- "All" chip selected by default; multiple chips can be selected for multi-tag filtering
- Each post card displays:
  - Tag pills (showing which tags the post has)
  - 📍 Local / 🌐 Global badge on each card
  - Author info, description preview, social engagement actions (likes, comments, message)

### D. In-App Communication System

**Real-Time Chat:** Built on Supabase Realtime for instant messaging between users.

**Features:**
- **One-on-one messaging:** Users can directly message post authors
- **Conversation list:** View all active chats in one place
- **Real-time delivery:** Messages appear instantly
- **Push notifications:** Get notified of new messages even when app is closed
- **Read receipts:** See when messages have been read

**Access Control:**
- Only Level 1+ (verified) users can initiate new conversations
- Post authors can respond to any inquiry regardless of their level
- Chat history retained for 90 days after last message

**Privacy:**
- Phone numbers and email addresses never displayed publicly
- All contact happens through secure in-app messaging
- Users can block abusive contacts
- Reported conversations flagged for moderator review

### E. Photo Upload & Storage

**Supabase Storage Integration:** Secure cloud storage for user-uploaded images.

**Upload Specifications:**
- Max 3 photos per post (Housing and Jobs primarily)
- Supported formats: JPEG, PNG
- Auto-compression: Max 2MB per photo
- Auto-resize: 1200px width (maintains aspect ratio)
- Thumbnail generation: 300px width for feed listings

**Storage Costs:** Estimated $10-20/month for 1,000 active users (~$0.026/GB)

**Moderation:**
- Photos flagged via reporting system reviewed by moderators
- Inappropriate images removed within 24 hours
- Repeat violators banned from photo uploads

### F. Basic Reporting System

**User Reporting:** Simple flagging mechanism for spam, scams, and inappropriate content.

**Features:**
- "Report" button on all posts and chat messages
- Report categories: Spam, Scam, Inappropriate Content, Harassment
- Auto-hide threshold: Posts/messages with 3+ reports hidden pending moderator review
- Moderator queue shows all flagged content with user report reasons

**Moderator Actions:**
- Approve (restore content, clear flags)
- Remove (delete content, notify poster)
- Ban user (permanent account suspension)

### G. Admin Dashboard

**Web-Based Interface:** Supabase Admin SDK for moderator tools.

**Core Features:**
- Review flagged posts and chat conversations
- Manage trust level changes (approve Level 2 promotions)
- Ban/unban users
- View platform statistics (user count, post count, spam rate)

**Access Control:**
- Moderators defined by email whitelist
- Activity logs for all moderator actions
- Audit trail for accountability

### G2. Profile Experience Refresh (Implemented)

**Goal:** Improve profile usability and account management discoverability with a Reddit-style menu view.

**Implemented UX (Web + Mobile):**
- Profile menu tabs: **Posts**, **Saved Posts**, **About**
- Top-right hamburger account menu with: **View Profile/Edit Profile**, **Change Password**, **Logout**
- Saved Posts tab is backed by user likes (post bookmarks)
- About tab consolidates account/location/activity details for quick scanning

**Data Layer (Shared-First):**
- Added shared profile APIs in `packages/shared/src/api/posts.ts`:
  - `getPostsByAuthorId(...)`
  - `getSavedPostsByUserId(...)`
- Both web and mobile profile screens consume the same shared API layer via dependency injection

**Outcome:**
- Stronger UX parity between web and mobile profile flows
- Improved content recall via explicit Posts/Saved Posts separation
- Cleaner account action discoverability via hamburger menu

### G3. Public Profile View (Implemented)

**Goal:** Allow users to view any author's public profile by tapping their avatar in the feed or post detail.

**Implemented (2026-03-04):**
- Shared `formatPublicName()` utility — formats full names as "Firstname L." to protect PII
- Mobile `PublicProfileScreen` accessible from feed and post detail; own-post avatar tap redirects to own Profile tab instead
- Web `/users/[id]` dynamic page with matching layout
- Both surfaces show: masked name, trust badge, metro city + state, "Member since [year]", post count, their public posts, and a "Message" button
- No email, phone, or ZIP exposed on public profiles
- Replaced all "Coming soon" avatar stubs in HomeScreen, PostDetailScreen (mobile) and feed, post detail (web)

**Data Layer:**
- Reuses existing `getUserById()` and `getPostsByAuthorId()` shared API functions — no DB changes needed
- `formatPublicName()` added to `packages/shared/src/utils/user.ts`, exported from shared index

---

### H. Events

**Purpose:** Community event discovery and coordination.

**Status:** Spec approved — implementation pending.

**Scope:**
- Chronological events feed with filter chips (Cultural, Religious, Social, Career, Other)
- Event creation by Level 1+ verified users (local by default; premium users can toggle global)
- Event detail: title, date/time, location, description, organizer info
- RSVP functionality with organizer-controlled privacy (public attendee list or count-only)
- Edit, cancel, and delete events (organizer only)
- Events visible on organizer's public profile
- Push notification reminders (deferred — depends on full notifications infrastructure)

See [Events Feature Spec](docs/features/events.md) and [Events Feature Breakdown](docs/features/events-feature-breakdown.md) for full details.

### I. Marketplace (Documentation Only)

**Purpose:** Business listings and service discovery for the community.

**Phase 1 Scope:**
- Bottom navigation tab with "Coming Soon" placeholder
- Feature specification documented for future implementation

**Future Features:**
- Browse local Nepalese businesses and services
- Business categories: Restaurants, Grocery, Professional Services, etc.
- Business profiles with photos, hours, contact info
- Review and rating system
- Verified business badges
- Paid promotion tiers (Phase 3 revenue)

See [Marketplace Feature Spec](docs/features/marketplace.md) for full details.

---

## Phase 2: Community Safety & Growth

**Goal:** Scale interactions and refine the "Red Alert" safety net.

### A. Two-Step Red Alert System

To prevent "The Boy Who Cried Wolf" syndrome and notification fatigue:

```
1. TRIGGER
   ↓ User submits an "Emergency Post"

2. VERIFICATION
   ↓ Notification sent to Local Community Leads (Moderators) in that Metro

3. BROADCAST
   ↓ Moderator clicks "Verify"
   ↓ Push Notification sent to entire Metro area
```

**Key Benefit:** Prevents spam and ensures real emergencies get immediate attention.

### B. Peer vs. Business Distinction

#### Peer Posts
- **Type:** Free listings for individuals
- **Examples:** Looking for a roommate, travel buddy
- **Features:** Basic contact info, profile verification

#### Business Profiles
- **Type:** Dedicated profiles for commercial entities
- **Examples:** Restaurants (Mustang Momo), consultancies, services
- **Features:** Review/Rating section, business verification badge, contact hours

### C. Hyper-Local Filtering

- Switch from "Metro" to **"Mile Radius"** filter
- Example: "Show me rooms within 10 miles of my current location"
- Uses GPS for precise location-based results

---

## Phase 3: Sustainability & Ecosystem

**Goal:** Monetization and long-term community value.

### Revenue Streams

#### Self-Service Ad Portal
- Businesses can pay to "Elevate" their job posts to the Global Feed
- Tiered pricing based on visibility duration and geographic reach

### Safety & Moderation

#### AI Moderation
- Automated scanning for scam-related keywords:
  - Crypto schemes
  - "Fast cash" promises
  - Suspicious consultancy claims
- Flag and hold posts for human review

### Community Resources

#### Resource Wiki
Structured guides on:
- US taxes for immigrants
- Immigration updates and policy changes
- Driver's License procedures by state
- Healthcare enrollment
- Banking and credit building

---

## Trust, Safety & Legal Protocols

### Data Privacy

#### PII Masking
- For emergency medical posts, sensitive data is protected:
  - Room numbers
  - Full medical details
  - Personal identifiers
- Hidden behind a **"Click to Reveal"** wall (logged-in members only)

### Application Process

#### The "Momo" Test
Job posts support two application modes:

1. **Call Directly** - For restaurants and immediate hiring
2. **Apply with Profile** - User's University/Experience sent as a mini-PDF to employer

**Emergency Post Disclaimer (Phase 1):**
Before first emergency post submission, users must acknowledge:
"I understand that this platform is for community coordination only. For life-threatening emergencies, I will call 911 or local emergency services first. NUSA is not a replacement for professional emergency, medical, or legal services."

### Legal Protection

#### Terms of Service
- Explicit disclaimer that the app is a **community notice board**
- Not a replacement for:
  - 911 emergency services
  - Professional legal advice
  - Professional medical services
- Clear liability limitations

---

## Technical Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Mobile** | React Native + Expo | Native performance, fast development, shared code |
| **Web** | Next.js (TypeScript) | SSR for SEO, React 19 support |
| **Backend** | Supabase (PostgreSQL) | Real-time subscriptions, RLS, generous free tier |
| **Auth** | Supabase Auth | Phone (SMS), email, social login |
| **Storage** | Supabase Storage | Built-in CDN, RLS for files |
| **Location** | Static ZIP-to-Metro dataset | HUD USPS Crosswalk, zero API costs |
| **Admin Dashboard** | Web-based interface | For moderators to approve alerts and manage content |

See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for exact versions.

---

## Success Metrics

### Phase 1 Targets
- [ ] 1,000 verified (Level 1+) users across 5 metro areas
- [ ] 500+ active listings (Housing + Jobs + Travel combined)
- [ ] <5% spam/scam rate (based on flagged posts)
- [ ] 200+ emergency help requests successfully coordinated
- [ ] Average 50+ chat messages per day (indicates engagement)
- [ ] 80%+ of Housing/Jobs posts include photos

### Phase 2 Targets
- [ ] 10+ verified community leads per major metro
- [ ] <30 second average emergency verification time
- [ ] 100+ business profiles with reviews

### Phase 3 Targets
- [ ] Self-sustaining revenue from ad portal
- [ ] 50+ wiki articles covering common topics
- [ ] 90%+ AI moderation accuracy

---

## Next Steps

### Immediate Actions
1. Implement post photo upload (DB field and placeholder UI exist, needs file picker, upload, and compression logic)
2. Build reporting system (DB schema exists, needs API functions and UI for report button, report categories, auto-hide threshold)
3. Design and build Admin Dashboard (moderator tools: flagged content queue, trust level management, ban/unban, platform stats)
4. Complete full notifications system (mobile UI screens exist; DB layer, shared API, web integration, and push delivery still needed — see `docs/implementation-plans/notifications-feature.md`)

### Research Needed
- Legal review of liability disclaimers
- Push notification strategy (Supabase Realtime for in-app, Expo Push for mobile background notifications)
