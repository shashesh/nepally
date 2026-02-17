# NUSA App: Product Roadmap

**Version:** 1.1
**Last Updated:** 2026-02-06 (Phase 1 Refinement)

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
- **Content Tagging:** Every piece of content (except Global Ads) is tagged with a **Metro Area ID**
- **Onboarding Flow:** Users enter their ZIP Code → App maps it to the official **US Census Metro Area** (e.g., *Dallas-Fort Worth-Arlington*)
- **Default View:** The "Local Feed" is the home screen, ensuring users only see housing or jobs within their commuting distance

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

### B. Smart Post Engine (Structured Forms)

Each category has mandatory fields and auto-expiry to keep content fresh:

| Category | Mandatory Fields | Expiry | Access Level | Photos |
|----------|-----------------|--------|--------------|--------|
| 🏠 Housing | Rent amount, Move-in date, Room Type (dropdown: Private Room, Shared Room, Studio, 1BR, 2BR+), Metro Area | 30 days | Level 1+ | 1-3 photos |
| 💼 Jobs | Job Title, Pay range, Employment Type (dropdown: Full-Time, Part-Time, Contract, Internship, Gig), Company Name, Metro Area | 30 days | Level 1+ | 1-3 photos |
| 🚨 Emergency | Emergency Type (dropdown: Medical, Legal, Financial, Travel, Housing, Other), Location/Hospital, Brief Description, Metro Area | 7 days | **Level 1+ ONLY** | Optional |
| ✈️ Travel | Travel Date, Route (US Metro ↔ Nepal City dropdowns), Airline (optional), Metro Area (departure city) | 2 days after travel | Level 1+ | Optional |

**Contact Method:** All post inquiries handled via in-app chat system (Level 1+ can message post authors)

**Photo Specifications:**
- Max 3 photos per post (Housing and Jobs categories)
- Auto-compressed to 2MB max per photo
- Resized to 1200px width for optimal mobile viewing
- Stored in Supabase Storage

**Post Expiry Behavior:**
- Expired posts hidden from default feed but accessible via "Show Expired" filter
- Users receive notification 3 days before expiry
- One-time renewal option (must update at least one field)
- Posts permanently deleted 90 days after expiry

**Emergency Post Safety:**
- Restricted to Level 1+ (verified users only) to prevent spam
- Disclaimer shown before submission: "⚠️ This is NOT a replacement for 911. Call emergency services first for life-threatening situations."
- Emergency posts do NOT trigger metro-wide alerts (Red Alert system is Phase 2)

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
1. Define the User Journey for emergency posting
2. Design the Admin Dashboard features and permissions
3. Create wireframes for the structured post forms
4. Document in-app chat system architecture and message flow
5. Define photo upload UI/UX and compression workflow
6. Create emergency post disclaimer copy and placement

### Research Needed
- Legal review of liability disclaimers
- Supabase Realtime capabilities for push notifications
- ZIP Code to Metro Area mapping data sources
- Supabase Storage cost modeling for photo uploads at scale
