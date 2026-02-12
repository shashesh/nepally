# NUSA User Journeys - Phase 1

**Last Updated:** 2026-02-11
**Total Journeys:** 12
**Status:** Planning

This document indexes all user journeys for the NUSA app. Each journey documents a specific user flow from start to finish, including pain points, decision trees, and success metrics.

---

## How to Use This Index

1. **Find the journey** you want to understand
2. **Check prerequisites** - some journeys require completing others first
3. **Follow the links** to detailed journey documentation
4. **Review related journeys** to understand the complete user experience

---

## Journey Organization

Journeys are organized into **6 categories** based on user intent:

| Category | Journey Count | Purpose |
|----------|---------------|---------|
| **Onboarding** | 2 | Getting started with NUSA |
| **Post Creation** | 4 | Creating housing, job, emergency, and travel posts |
| **Discovery** | 2 | Finding and responding to posts |
| **Communication** | 1 | In-app chat and messaging |
| **Safety** | 2 | Reporting content and moderation |
| **Management** | 1 | Managing existing posts |

---

## All Journeys (Alphabetical)

### Onboarding

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 01 | **Signup and Onboarding** | New User (Level 0) | 🚧 Draft | [onboarding/01-signup-and-onboarding.md](./onboarding/01-signup-and-onboarding.md) |
| 02 | **Trust Level Verification** | New User (Level 0 → Level 1) | 📝 Not Started | [onboarding/02-trust-level-verification.md](./onboarding/02-trust-level-verification.md) |

**Purpose:** These journeys cover how new users discover NUSA, create accounts, verify their identity, and become trusted members of the community.

**Key Features:**
- ZIP code to metro area mapping
- Phone verification (SMS OTP)
- Social media account linking
- Trust level progression (Level 0 → Level 1)

---

### Post Creation

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 03 | **Housing Post Creation** | Verified User (Level 1+) | 📝 Not Started | [post-creation/03-housing-post-creation.md](./post-creation/03-housing-post-creation.md) |
| 04 | **Job Post Creation** | Verified User (Level 1+) | 📝 Not Started | [post-creation/04-job-post-creation.md](./post-creation/04-job-post-creation.md) |
| 05 | **Emergency Post Creation** | Verified User (Level 1+) | 📝 Not Started | [post-creation/05-emergency-post-creation.md](./post-creation/05-emergency-post-creation.md) |
| 06 | **Travel Post Creation** | Verified User (Level 1+) | 📝 Not Started | [post-creation/06-travel-post-creation.md](./post-creation/06-travel-post-creation.md) |

**Purpose:** Creating structured posts with category-specific mandatory fields, photo uploads, and auto-expiry rules.

**Key Features:**
- Category-specific forms (Housing: rent/room type, Jobs: pay/employment type, etc.)
- Photo upload (max 3, auto-compressed to 2MB)
- Metro area tagging
- Auto-expiry (Housing/Jobs: 30 days, Emergency: 7 days, Travel: 2 days after travel)
- Trust level enforcement (Level 1+ only)

**Prerequisites:**
- Journey #01: Signup (must have account)
- Journey #02: Trust Level Verification (must be Level 1+)

---

### Discovery

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 07 | **Browse and Search Posts** | Any User (Level 0+) | 📝 Not Started | [discovery/07-browse-and-search.md](./discovery/07-browse-and-search.md) |
| 08 | **Respond to a Post** | Verified User (Level 1+) | 📝 Not Started | [discovery/08-respond-to-post.md](./discovery/08-respond-to-post.md) |

**Purpose:** Finding relevant posts in the local metro area and initiating contact with post authors.

**Key Features:**
- Metro-first local feed (default view)
- Category filtering (Housing, Jobs, Emergency, Travel)
- Search by keywords, price range, date
- Hyper-local radius filtering (within X miles)
- Initiate chat with post author

**Prerequisites:**
- Journey #01: Signup (viewing posts)
- Journey #02: Trust Level Verification (responding to posts - Level 1+ required)

---

### Communication

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 09 | **In-App Chat Conversation** | Verified User (Level 1+) | 📝 Not Started | [communication/09-in-app-chat.md](./communication/09-in-app-chat.md) |

**Purpose:** Real-time messaging between users for inquiries about posts, follow-ups, and coordination.

**Key Features:**
- One-on-one real-time chat (Supabase Realtime)
- Conversation list (inbox view)
- Read receipts
- Push notifications for new messages
- Block/report abusive users
- Chat history retained for 90 days

**Prerequisites:**
- Journey #02: Trust Level Verification (Level 1+ to initiate chats)
- Journey #08: Respond to a Post (typical entry point)

---

### Safety

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 10 | **Report Content or User** | Any User (Level 0+) | 📝 Not Started | [safety/10-report-content.md](./safety/10-report-content.md) |
| 11 | **Moderator Review Flow** | Moderator | 📝 Not Started | [safety/11-moderator-review.md](./safety/11-moderator-review.md) |

**Purpose:** Maintaining community safety through user reporting and moderator review of flagged content.

**Key Features:**
- Report button on all posts and chat messages
- Report categories: Spam, Scam, Inappropriate Content, Harassment
- Auto-hide threshold: 3+ reports triggers moderation queue
- Moderator dashboard (admin panel)
- Moderator actions: Approve, Remove, Ban user
- Activity logs and audit trail

**Prerequisites:**
- Journey #10: None (anyone can report)
- Journey #11: Moderator account with email whitelist access

---

### Management

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 12 | **Renew or Edit an Expired Post** | Verified User (Level 1+) | 📝 Not Started | [management/12-renew-edit-post.md](./management/12-renew-edit-post.md) |

**Purpose:** Managing post lifecycle - renewing expiring posts or editing expired posts to reactivate them.

**Key Features:**
- Notification 3 days before expiry
- One-time renewal option (must update at least one field)
- Edit and repost expired posts
- View expired posts via "Show Expired" filter
- Permanent deletion 90 days after expiry

**Prerequisites:**
- Journey #03-06: User must have created a post previously

---

## Journey Status Legend

| Icon | Status | Description |
|------|--------|-------------|
| 📝 | Not Started | Journey needs to be documented |
| 🚧 | Draft | Journey is being written |
| ✅ | Reviewed | Journey is complete and reviewed |
| 🔒 | Approved | Journey is locked and ready for wireframing |

---

## Journey Dependencies (Prerequisite Map)

This diagram shows which journeys must be completed before others:

```
┌──────────────────────────────────────────────────┐
│           ENTRY POINT                            │
│                                                  │
│  Journey #01: Signup & Onboarding                │
│  (New users start here)                          │
└──────────┬───────────────────────────────────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────┐            ┌─────────────────────┐
│ Journey #07:         │            │ Journey #02:        │
│ Browse & Search      │            │ Trust Level         │
│ (Level 0+ can view)  │            │ Verification        │
└──────────────────────┘            │ (Level 0 → Level 1) │
                                    └──────────┬──────────┘
                                               │
           ┌───────────────────────────────────┴────────────────┬──────────────┐
           │                                                    │              │
           ▼                                                    ▼              ▼
┌─────────────────────┐                           ┌──────────────────────────────┐
│ Journey #03-06:     │                           │ Journey #08:                 │
│ Post Creation       │                           │ Respond to Post              │
│ (Housing, Job,      │                           │ (Initiate chat)              │
│  Emergency, Travel) │                           └──────────┬───────────────────┘
└──────────┬──────────┘                                      │
           │                                                 ▼
           │                                    ┌──────────────────────┐
           │                                    │ Journey #09:         │
           │                                    │ In-App Chat          │
           │                                    └──────────────────────┘
           │
           ├─────────────────────────────────────────────────┐
           │                                                 │
           ▼                                                 ▼
┌──────────────────────┐                       ┌────────────────────────┐
│ Journey #12:         │                       │ Journey #10:           │
│ Renew/Edit Post      │                       │ Report Content         │
│ (After post expires) │                       │ (Flag spam/scams)      │
└──────────────────────┘                       └────────────────────────┘


┌────────────────────────┐
│ Journey #11:           │
│ Moderator Review       │
│ (Admin Dashboard)      │
│ (Separate flow)        │
└────────────────────────┘
```

---

## Cross-Journey Patterns

### Common User Flows

**1. New User → First Post**
- Journey #01: Signup & Onboarding
- Journey #02: Trust Level Verification
- Journey #03: Housing Post Creation

**2. Existing User → Find & Respond**
- Journey #07: Browse & Search Posts
- Journey #08: Respond to a Post
- Journey #09: In-App Chat Conversation

**3. Post Author → Manage Post Lifecycle**
- Journey #03: Create Post
- Journey #12: Renew/Edit Expired Post

**4. Safety & Moderation**
- Journey #10: Report Content (any user)
- Journey #11: Moderator Review (moderator)

---

## Next Steps

1. **Start with Onboarding:** Document Journeys #01 and #02 first (foundation for all other journeys)
2. **Then Post Creation:** Document Journeys #03-06 (core utility features)
3. **Then Discovery:** Document Journeys #07-08 (how users find posts)
4. **Finally Support Features:** Document Journeys #09-12 (chat, safety, management)

After all journeys are documented:
- Create wireframes for each journey's key screens
- Define API requirements
- Plan user testing scenarios
- Validate against product roadmap

---

## Questions & Assumptions

### Assumptions
- All journeys assume US-based metro areas with ZIP code coverage
- Users have smartphones (iOS or Android)
- Users have stable internet connection
- Push notifications are enabled (for chat and post expiry)

### Open Questions
- [ ] Should Journey #08 (Respond to Post) and Journey #09 (In-App Chat) be combined?
- [ ] Do we need separate journeys for editing vs renewing posts?
- [ ] Should we create a Journey #13 for "View My Posts" (user's post history)?
- [ ] Do business users need separate journeys in Phase 1 or Phase 2?

---

## How to Create a New Journey

Use the `/user-journey` skill to create comprehensive journey documentation.

**Command:**
```
/user-journey [journey-name]
```

**Example:**
```
/user-journey signup-and-onboarding
```

The skill will guide you through:
1. Defining scope and prerequisites
2. Mapping the step-by-step journey
3. Documenting pain points and metrics
4. Creating visual flow diagrams
5. Linking related journeys
6. Updating this index

See [.claude/skills/user-journey/SKILL.md](../../.claude/skills/user-journey/SKILL.md) for full documentation.

---

**Last Updated:** 2026-02-11
**Maintained By:** Product Team
**Review Cycle:** After each journey is created or updated
