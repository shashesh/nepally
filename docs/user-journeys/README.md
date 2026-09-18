# Nepally User Journeys - Phase 1

**Last Updated:** 2026-09-08
**Journeys written:** 7 of 14 planned
**Status:** Planning

This document indexes all user journeys for the Nepally app. Each journey documents a specific user flow from start to finish, including pain points, decision trees, and success metrics.

> **Seven of the fourteen journeys below are not written yet.** Their rows say
> `_not yet written_` in the File column rather than linking to a file that does
> not exist. Until 2026-09-08 this README linked to all fourteen, so ten of its
> links 404'd — the rows are kept because the plan is real, but a link is a
> promise that the document exists.

---

## How to Use This Index

1. **Find the journey** you want to understand
2. **Check prerequisites** - some journeys require completing others first
3. **Follow the links** to detailed journey documentation
4. **Review related journeys** to understand the complete user experience

---

## Journey Organization

Journeys are organized by user intent. **Planned** is the original 14-journey
scope; **written** is what exists on disk today.

| Category | Planned | Written | Purpose |
|----------|---------|---------|---------|
| **Onboarding** | 2 | 1 | Getting started with Nepally |
| **Post Creation** | 4 | 1 | Creating posts (one unified tag-based form, not four separate flows) |
| **Discovery** | 3 | 2 | Finding posts, responding, and discovering events |
| **Communication** | 1 | 1 | In-app chat and messaging |
| **Safety** | 2 | 0 | Reporting content and moderation |
| **Management** | 2 | 1 | Managing posts and events |
| **Location** | — | 1 | Location permission, detection, and switching |
| **Total** | **14** | **7** | |

`location/` was added after the original scope was drawn and is not part of the
14. `safety/` has no directory yet — nothing has been written for it.

---

## All Journeys (Alphabetical)

### Onboarding

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 01 | **Signup and Onboarding** | New User (Level 0) | 🚧 Draft | [onboarding/01-signup-and-onboarding.md](./onboarding/01-signup-and-onboarding.md) |
| 02 | **Trust Level Verification** | New User (Level 0 → Level 1) | 📝 Not Started | _not yet written_ |

**Purpose:** These journeys cover how new users discover Nepally, create accounts, verify their identity, and become trusted members of the community.

**Key Features:**

- ZIP code to metro area mapping
- Phone verification (SMS OTP)
- Social media account linking
- Trust level progression (Level 0 → Level 1)

---

### Post Creation

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 03 | **Housing Post Creation** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |
| 04 | **Job Post Creation** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |
| 05 | **Emergency Post Creation** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |
| 06 | **Travel Post Creation** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |

**Purpose:** Creating tag-based posts (title + body + 1-3 tags) with optional photos — the Reddit-style format used for all post types.

**Key Features:**

- Single unified form: title, body, tag selector (1-3 tags), optional photos (up to 3)
- Tags: Housing, Jobs, Help, Question, Politics, Discussion, Emergency
- Photo upload (max 3, auto-compressed to 2MB, reorderable)
- Metro area tagging (automatic from user's location)
- Emergency tag requires moderator approval before post becomes visible
- Global toggle (premium users only) — visible across all metro areas
- Trust level enforcement (Level 1+ to create)
- No auto-expiry — posts remain active until deleted by author or removed by moderators

**Prerequisites:**

- Journey #01: Signup (must have account)
- Journey #02: Trust Level Verification (must be Level 1+)

---

### Discovery

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 07 | **Browse and Search Posts** | Any User (Level 0+) | 📝 Not Started | _not yet written_ |
| 08 | **Respond to a Post** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |
| 13 | **Event Discovery & RSVP** | Any User (Level 0 browse; Level 1+ RSVP) | ✅ Reviewed | [discovery/13-event-discovery-and-rsvp.md](./discovery/13-event-discovery-and-rsvp.md) |

**Purpose:** Finding relevant posts and events in the local metro area, initiating contact with post authors, and RSVPing to community events.

**Key Features:**

- Metro-first local feed (default view) — local + global posts mixed
- Tag filter chips (All, Housing, Jobs, Help, Question, Politics, Discussion, Emergency)
- 📍 Local / 🌐 Global badges on post cards and events
- Like, comment, and message actions on post cards and post detail
- Initiate private chat with post author (Level 1+ required)
- Tap author avatar to view public profile
- Events feed with type filter chips (Cultural, Religious, Social, Career, Other)
- One-tap RSVP with optimistic UI (Level 1+ required)

**Prerequisites:**

- Journey #01: Signup (viewing posts)
- Journey #02: Trust Level Verification (responding to posts - Level 1+ required)

---

### Communication

| # | Journey Name | User Persona | Status | File |
|---|--------------|--------------|--------|------|
| 09 | **In-App Chat Conversation** | Verified User (Level 1+) | ✅ Reviewed | [communication/09-in-app-chat.md](./communication/09-in-app-chat.md) |

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
| 10 | **Report Content or User** | Any User (Level 0+) | 📝 Not Started | _not yet written_ |
| 11 | **Moderator Review Flow** | Moderator | 📝 Not Started | _not yet written_ |

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
| 12 | **Renew or Edit an Expired Post** | Verified User (Level 1+) | 📝 Not Started | _not yet written_ |
| 14 | **Event Creation & Management** | Verified User (Level 1+) as Organizer | ✅ Reviewed | [management/14-event-creation-and-management.md](./management/14-event-creation-and-management.md) |

**Purpose:** Managing post and event lifecycle — editing, renewing, cancelling, and deleting content.

**Key Features (Posts):**

- Edit post title, body, tags, photos at any time (owner only)
- Delete post (owner only)
- Renew or repost expired posts (Journey #12 — planned)

**Key Features (Events):**

- Edit event details after publish (organizer only)
- Cancel event — marks as cancelled, remains visible to attendees
- Delete event — removes from all feeds (soft delete)
- Organizer controls accessible via ⋮ kebab menu on event detail

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

```text
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

```text
/user-journey [journey-name]
```

**Example:**

```text
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

**Last Updated:** 2026-03-10
**Maintained By:** Product Team
**Review Cycle:** After each journey is created or updated
