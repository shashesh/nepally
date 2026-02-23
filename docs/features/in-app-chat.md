# In-App Chat System

**Status:** Draft
**Phase:** 1 (Utility Core & Trust Foundation)
**Last Updated:** 2026-02-15

---

## Overview

Real-time one-on-one messaging between users, initiated from post listings. All post inquiries flow through in-app chat rather than exposing phone numbers or email addresses. Built on Supabase Realtime for instant message delivery.

## Problem Statement

Users who find relevant housing, job, travel, or emergency posts need a private, secure way to contact the post author. Without in-app messaging, users would need to share personal contact info publicly, creating privacy and safety risks. Chat completes the core utility loop: **discover post → contact author → coordinate**.

## User Stories

**Primary:**
- As a verified user, I want to message a post author so that I can inquire about their listing privately.
- As a post author, I want to receive and respond to inquiries so that I can connect with interested people.

**Secondary:**
- As a user, I want to see all my conversations in one place so that I can track ongoing discussions.
- As a user, I want to know when my messages have been read so that I know the other person saw my inquiry.
- As a user, I want to block abusive users so that I can protect myself from harassment.

---

## Scope (Features 8.1–8.7)

| Feature | Description | Priority |
|---------|-------------|----------|
| 8.1 Chat Data Model | DB tables for conversations and messages | Must-have |
| 8.2 Initiate Chat from Post | "Contact Author" button → opens/creates conversation | Must-have |
| 8.3 Conversation List | Messages tab showing all active chats | Must-have |
| 8.4 Message Thread View | Chronological message display with real-time updates | Must-have |
| 8.5 Send Message | Text input, send, real-time delivery | Must-have |
| 8.6 Read Receipts | Mark messages as read, show read status | Should-have |
| 8.7 Block User | Block abusive users from messaging | Should-have |

**Out of scope (this iteration):**
- 8.8 Report Conversation (depends on Reporting System)
- Image messages (Phase 1 Photo Upload feature)
- Group chats (not in roadmap)
- Push notifications for new messages (separate Notifications feature 12.2)

---

## Requirements

### Functional Requirements

**Chat Initiation (8.2):**
- [ ] "Message" icon on PostCard in home feed (quick action)
- [ ] "Contact Author" button on PostDetailScreen (full action)
- [ ] Check if conversation already exists between these two users for this post
- [ ] If exists → navigate to existing conversation
- [ ] If new → create conversation record + navigate to thread
- [ ] Only Level 1+ users can initiate conversations
- [ ] Level 0 users see "Verify to Message" prompt
- [ ] Cannot message yourself (hide button on own posts)

**Conversation List (8.3):**
- [ ] List all conversations sorted by most recent message (newest first)
- [ ] Display other participant's name and initials avatar
- [ ] Display last message preview (first 50 chars, truncated)
- [ ] Display timestamp of last message (relative: "2m ago", "3h ago", "Yesterday")
- [ ] Display unread count badge per conversation
- [ ] Display post context (category icon + title snippet)
- [ ] Empty state when no conversations
- [ ] Tap conversation → navigate to message thread
- [ ] Total unread count on Messages tab badge

**Message Thread (8.4):**
- [ ] Display messages in chronological order (oldest at top, newest at bottom)
- [ ] Differentiate sent vs. received messages (right/left alignment, different colors)
- [ ] Show message timestamp (group by day: "Today", "Yesterday", "Feb 14")
- [ ] Auto-scroll to bottom on load and when new messages arrive
- [ ] Header shows other user's name + trust badge
- [ ] Header shows linked post context (category + title, tappable)
- [ ] Real-time updates: new messages appear instantly via Supabase Realtime subscription

**Send Message (8.5):**
- [ ] Text input at bottom of thread (multi-line, max 1000 chars)
- [ ] Send button (disabled when input is empty)
- [ ] Message appears in thread immediately (optimistic UI)
- [ ] Message sent to database via Supabase insert
- [ ] Update conversation's `last_message` and `last_message_time`
- [ ] Increment other participant's `unread_count`
- [ ] Keyboard avoidance: input stays above keyboard

**Read Receipts (8.6):**
- [ ] Mark all messages as "read" when recipient opens the conversation thread
- [ ] Show read status on sent messages (single check = sent, double check = read)
- [ ] Update read status in real-time via Supabase subscription
- [ ] Reset unread_count to 0 for current user when thread is opened

**Block User (8.7):**
- [ ] "Block" option accessible from thread header (menu/kebab icon)
- [ ] Confirmation dialog: "Block [Name]? They won't be able to message you."
- [ ] Blocked user cannot send new messages (RLS policy enforces)
- [ ] Conversation hidden from both users' conversation lists
- [ ] Unblock option in profile settings (future enhancement, not in this scope)

### Non-Functional Requirements

- [ ] Messages load in < 1 second for conversations with < 500 messages
- [ ] Real-time delivery latency < 2 seconds
- [ ] Conversation list loads in < 500ms
- [ ] Offline behavior: show cached conversations, queue messages for send when back online (stretch goal)
- [ ] Chat history retained for 90 days after last message (per roadmap)

---

## Database Schema

The schema is already defined in `docs/database-schema.md` and `supabase/migrations/001_schema.sql`. Key tables:

### Existing Tables (verify they exist in migration)

**`conversations`** — One per user-pair-per-post
- `id` UUID PK
- `post_id` UUID FK → posts (nullable, SET NULL on delete)
- `last_message` TEXT
- `last_message_time` TIMESTAMPTZ
- `created_at`, `updated_at`

**`conversation_participants`** — Junction table (2 rows per conversation)
- `id` BIGSERIAL PK
- `conversation_id` UUID FK → conversations
- `user_id` UUID FK → users
- `name` TEXT (denormalized for fast display)
- `photo` TEXT
- `unread_count` INTEGER (default 0)
- `joined_at` TIMESTAMPTZ
- UNIQUE(conversation_id, user_id)

**`messages`** — Individual messages
- `id` UUID PK
- `conversation_id` UUID FK → conversations
- `sender_id` UUID FK → users
- `text` TEXT
- `type` message_type ENUM ('text', 'image', 'system')
- `read` BOOLEAN (default false)
- `read_at` TIMESTAMPTZ
- `timestamp` TIMESTAMPTZ

### New Table Needed

**`blocked_users`** — Block list
```sql
CREATE TABLE blocked_users (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
```

### Realtime Configuration

Enable Supabase Realtime on `messages` table for the `INSERT` event so new messages are pushed to subscribers in real-time.

---

## User Flow

### Flow 1: Initiate Chat from Post Card

```
1. User browses home feed
2. User taps message icon on PostCard
   → OR taps post card → PostDetailScreen → "Contact Author" button
3. System checks: conversation exists between these users for this post?
   → YES: Navigate to existing MessageThread
   → NO: Create conversation + 2 participant records → Navigate to MessageThread
4. User types message in input
5. User taps Send
6. Message appears in thread instantly (optimistic)
7. Message stored in database
8. Conversation list_message + last_message_time updated
9. Recipient's unread_count incremented
10. If recipient has thread open: message appears in real-time
```

### Flow 2: View Conversations

```
1. User taps Messages tab in bottom nav
2. ConversationListScreen loads
3. Displays all conversations sorted by last_message_time DESC
4. Each row shows: other user name, last message preview, timestamp, unread badge
5. User taps a conversation → navigate to MessageThread
```

### Flow 3: Block User

```
1. User is in MessageThread
2. User taps kebab menu (⋮) in header
3. Selects "Block User"
4. Confirmation dialog appears
5. User confirms
6. blocked_users record created
7. Conversation hidden from both users
8. User navigated back to conversation list
```

---

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| No internet during send | Show error toast, keep message in input, retry on reconnect |
| Post deleted while chatting | Conversation persists, post context shows "Post no longer available" |
| Other user blocked you | Cannot send message, show "Unable to send message" |
| Conversation with yourself | "Contact Author" hidden on own posts |
| Level 0 user taps message icon | Show "Verify to Message" alert with verify CTA |
| Empty conversation list | Show empty state illustration + "No messages yet" |
| Very long message (>1000 chars) | Truncate at 1000, show character counter |
| Rapid message sending | Rate limit: max 30 messages/minute |
| User deleted their account | Show "[Deleted User]" in conversation list, messages preserved |

---

## Trust & Safety Considerations

- **Level 1+ requirement**: Only verified users can initiate chats, preventing spam from unverified accounts
- **Block functionality**: Users can immediately stop unwanted contact
- **No PII exposure**: Phone numbers and emails never shared; all contact through in-app messaging
- **Post context**: Every conversation links to a post, providing context for moderation
- **Future: Report**: Feature 8.8 (separate scope) will allow flagging conversations for moderator review
- **Message retention**: 90-day retention after last message aligns with privacy expectations

---

## Implementation Plan

### New Files to Create

**Services:**
- `apps/mobile/src/services/api/conversations.ts` — CRUD for conversations, participants
- `apps/mobile/src/services/api/messages.ts` — Send, fetch, mark read, realtime subscription

**Screens:**
- `apps/mobile/src/screens/chat/ConversationListScreen.tsx` — Messages tab content
- `apps/mobile/src/screens/chat/MessageThreadScreen.tsx` — Individual chat thread
- `apps/mobile/src/screens/PostDetailScreen.tsx` — Full post view with "Contact Author" button

**Navigation:**
- `apps/mobile/src/navigation/ChatNavigator.tsx` — Stack: ConversationList → MessageThread

**Components:**
- `apps/mobile/src/components/chat/ConversationItem.tsx` — Row in conversation list
- `apps/mobile/src/components/chat/MessageBubble.tsx` — Individual message bubble
- `apps/mobile/src/components/chat/ChatInput.tsx` — Text input + send button
- `apps/mobile/src/components/chat/EmptyChatState.tsx` — Empty state illustration

### Files to Modify

- `apps/mobile/src/types/navigation.ts` — Add ChatStackParamList, update MainTabParamList
- `apps/mobile/src/navigation/MainTabNavigator.tsx` — Replace Messages stub with ChatNavigator
- `apps/mobile/src/components/cards/PostCard.tsx` — Add message icon button
- `apps/mobile/src/screens/HomeScreen.tsx` — Handle message icon press, navigate to chat
- `supabase/migrations/002_chat_and_blocks.sql` — Verify chat tables exist, add blocked_users table

### Implementation Order

1. **Database verification** — Confirm chat tables exist in migration, add `blocked_users`
2. **Navigation types** — Add ChatStackParamList, update MainTabParamList
3. **Services** — conversations.ts and messages.ts (API layer)
4. **ConversationListScreen** — Messages tab (replace stub)
5. **MessageThreadScreen** — Chat thread with send + realtime
6. **ChatNavigator** — Wire up stack navigation
7. **PostDetailScreen** — Full post view with "Contact Author"
8. **PostCard update** — Add message icon to card
9. **HomeScreen update** — Handle navigation to chat from post card/detail
10. **Read receipts** — Mark read on open, display status
11. **Block user** — Block flow + RLS updates
12. **Tab badge** — Unread count on Messages tab icon

---

## Success Metrics

- **Adoption**: 50+ chat messages per day across platform (Phase 1 target)
- **Engagement**: >30% of post viewers initiate a conversation
- **Response rate**: >60% of conversations receive a reply within 24 hours
- **Safety**: <1% of conversations result in a block action
- **Performance**: Message delivery < 2 seconds p95

---

## Open Questions

- [x] Scope: Core + Safety (8.1-8.7) — decided
- [x] Entry points: Post Card + Detail — decided
- [ ] Should we auto-generate a first system message? (e.g., "John is interested in your post: 1BR in Richardson")
- [ ] Should conversation list show post thumbnail/photo if available?
- [ ] Keyboard behavior: should we use KeyboardAvoidingView or react-native-keyboard-aware-scroll-view?

---

## Related Features

- **Post Detail Screen** (5.4) — Needs to be built as part of this feature for "Contact Author" CTA
- **Photo Upload** (7.x) — Image messages are out of scope but schema supports `type: 'image'`
- **Reporting System** (9.x) — Feature 8.8 (Report Conversation) deferred to that scope
- **Push Notifications** (12.2) — Chat message notifications deferred to Notifications feature
- **Trust Level System** (4.x) — Enforces Level 1+ requirement for chat initiation
