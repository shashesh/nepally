# User Journey #09: In-App Chat Conversation

**Journey Number:** 09
**Category:** Communication
**User Persona:** Verified User (Level 1+) initiating; any user receiving
**Last Updated:** 2026-03-10
**Status:** Reviewed

---

## Journey Overview

**Goal:** Contact a post author privately and exchange messages to coordinate around a housing, job, or community need.

**Trigger:** User sees a post they want to respond to and taps "Contact Author", the chat bubble icon on a post card, or the "Chat" option on an author's avatar menu.

**Success Criteria:** Both parties have exchanged at least one message and the user has the information they need to proceed (e.g., confirm room availability, schedule an interview, coordinate a meetup).

**Estimated Duration:** 2–5 minutes for a full back-and-forth exchange. Initial message: under 30 seconds.

---

## Prerequisites

**Must Complete First:**

- **Journey #01: Signup and Onboarding** — must have an account and be in a metro area
- **Journey #02: Trust Level Verification** — must be Level 1+ to *initiate* a conversation (post authors can reply at any level)

**Should Have:**

- **Journey #02: Browse and Engaging with Posts** — typically entering from a post the user found interesting

---

## User Persona Details

**Name:** Sanjay Thapa
**Age:** 28
**Background:** Software engineer who moved from Kathmandu to Dallas six months ago. Looking for a Nepali roommate after his current lease ends next month.
**Metro:** Dallas-Fort Worth-Arlington (CBSA 19100)
**Trust Level:** 1 (Verified — phone confirmed during onboarding)
**Tech Savviness:** High
**Primary Device:** iOS (iPhone 14), also uses web at work
**Context:** Sanjay found a Housing post — "Looking for a roommate in Plano, $750/month" — and wants to ask if the room is still available and whether the poster is Nepali.

---

## Step-by-Step Journey

### Phase 1: Initiating a Conversation

#### Step 1: Find a Post Worth Messaging About

**User Action:** Sanjay browses the home feed and taps on a Housing post that looks promising.
**System Response:** Opens `PostDetailScreen` — full post with title, body, tags, author avatar, like/comment/message action bar.
**User Sees:**

- Full post content
- Author's avatar (photo or initials), masked name ("Ramesh T."), trust badge
- Action bar at the bottom: Like · Comments · **Contact Author** button (blue, prominent)
- If Sanjay is the author: Contact Author button is hidden
**Duration:** ~30 seconds reading

**User Thoughts:**

- "This looks like a good match. Let me ask if the room's still available."
- "I notice the author is Level 1 verified — that's reassuring."

**Pain Points:**

- None at this step — the CTA is prominent and clear.
- **Severity:** Low

---

#### Step 2: Tap "Contact Author"

**User Action:** Taps the blue "Contact Author" button at the bottom of the post detail screen.
**System Response:**

- Calls `getOrCreateConversation(supabase, userId, userName, photoUrl, authorId)` in the background
- If no conversation exists: creates a new `conversations` record + two `conversation_participants` records
- If conversation already exists with this author: returns the existing conversation ID
- Navigates to `MessageThreadScreen` with `{ conversationId, otherUserId, otherUserName, otherUserTrustLevel, otherUserPhotoUrl }`
**User Sees:** `MessageThreadScreen` opens. Header shows: author's avatar (left), masked name ("Ramesh T."), trust badge. Kebab menu (⋮) top right. Empty message list if new.
**Duration:** < 1 second (navigation is instant; conversation created in background)

**User Thoughts:**

- "Good — I'm in the chat now. What do I say?"

**Pain Points:**

- If network is slow, conversation creation might lag. No loading indicator shown during navigation.
- **Severity:** Low

**Alternative Entry Points:**

- Tap the `chatbubble-outline` icon on a post card in the feed → same flow
- Tap author avatar on post card or post detail → avatar context menu appears with "Chat" option → same `getOrCreateConversation` flow
- Tap "Message" button on `PublicProfileScreen` → same flow
- Tap any existing conversation in `ConversationListScreen` (Messages tab) → goes directly to `MessageThreadScreen`, skipping creation

---

#### Step 3: Compose First Message

**User Action:** Taps the `ChatInput` text field at the bottom of the screen and types a message.
**System Response:** Keyboard rises. Input field expands up to ~4 lines. Character count is tracked internally (1000 char limit).
**User Sees:**

- Empty message thread (or previous messages if returning)
- Multi-line `ChatInput` with placeholder "Message..."
- Send button (→) appears once text is entered, greyed out when empty
- Keyboard pushes the input up (iOS: keyboard avoidance; Android: adjustResize)
**Duration:** ~30 seconds to compose

**User Thoughts:**

- "Let me be polite and introduce myself quickly."

**Validation/Constraints:**

- Max 1000 characters per message
- Cannot send empty message (send button disabled)
- No rich formatting — plain text only

---

#### Step 4: Send the Message

**User Action:** Taps the send button (→).
**System Response:**

- Optimistic send: message appears immediately in the thread as a sent bubble (right-aligned, blue)
- Calls `sendMessage(supabase, conversationId, senderId, text)` in the background
- Updates `conversations.last_message` and `conversations.last_message_time`
- Updates `conversation_participants.unread_count` for the recipient
- Supabase Realtime publishes the message to the recipient's subscription
**User Sees:**
- Message appears as a blue right-aligned bubble with a single grey checkmark (✓ = sent, not yet read)
- Input field clears, ready for more messages
- If send fails silently: message remains visible but no error is shown (known limitation — no retry UI)
**Duration:** < 0.5 seconds to appear (optimistic)

**User Thoughts:**

- "Sent. Now I wait."

---

### Phase 2: Waiting for a Reply

#### Step 5: Receive a Push Notification (Background)

*(This step occurs on Ramesh's device — the post author receiving the message)*

**System Response:**

- Supabase Realtime notifies Ramesh's active subscription, or (once push delivery is deployed) sends an Expo push notification to Ramesh's device
- Ramesh's Messages tab badge updates (unread count + 1, polled every 30s on iOS/Android)
**Note:** Push notification delivery is scaffolded but not yet live. Currently, the author only sees the message if they open the app and check the Messages tab.

---

#### Step 6: Return to App — Check for Reply

**User Action:** Sanjay opens the app later. Sees the Messages tab has an unread badge (e.g., "1").
**System Response:** Unread count polled on app focus from `getTotalUnreadCount(supabase, userId)`.
**User Sees:**

- Red badge on the Messages tab icon in the bottom nav
**Duration:** Instant on app open (polled every 30s)

---

#### Step 7: Open Conversation List

**User Action:** Taps the Messages tab (bottom nav).
**System Response:** `ConversationListScreen` loads via `useFocusEffect` → calls `getConversations(supabase, userId)`.
**User Sees:**

- List of conversations, most recent first
- Each `ConversationItem` shows:
  - Author's avatar (photo or colored initials)
  - Masked name ("Ramesh T.") + trust badge
  - Post context (which post this chat is about)
  - Last message preview (truncated ~40 chars)
  - Timestamp
  - Blue unread badge with count if unread
- Pull-to-refresh available
- Empty state with "Browse Posts" CTA if no conversations
**Duration:** < 1 second

**User Thoughts:**

- "Ramesh replied!"

---

#### Step 8: Open the Reply

**User Action:** Taps the conversation row for Ramesh.
**System Response:**

- Navigates to `MessageThreadScreen`
- Calls `getMessages(supabase, conversationId)` + `markAsRead(supabase, conversationId, userId)`
- Subscribes to `subscribeToMessages(supabase, conversationId, callback)` for real-time updates
**User Sees:**
- Full message thread, scrolled to bottom
- Sanjay's sent message: right-aligned blue bubble, now showing double checkmark (✓✓ = read) if Ramesh has opened it
- Ramesh's reply: left-aligned grey bubble, with Ramesh's avatar (Messenger-style) to the left of the bubble
- Date separators between messages from different days
**Duration:** < 1 second

**User Thoughts:**

- "Ramesh confirmed the room is available. Let me ask a follow-up."

---

### Phase 3: Ongoing Conversation

#### Step 9: Continue the Exchange

**User Action:** Sanjay types follow-up messages. Ramesh replies in real time.
**System Response:** `subscribeToMessages` callback fires when Ramesh sends a message — new bubble appears instantly at the bottom without requiring a refresh.
**User Sees:**

- New messages appear in real time at the bottom of the list
- Auto-scrolls to bottom when a new message arrives (if already near bottom)
- Ramesh's avatar only shown on the first bubble in a consecutive group (Messenger-style grouping)
**Duration:** As long as needed

**Pain Points:**

- No typing indicator — user doesn't know if the other person is composing
- **Severity:** Medium
- No image attachment support (text only for Phase 1)
- **Severity:** Medium

---

### Phase 4: Ending the Conversation

#### Step 10: Navigate Away

**User Action:** Sanjay taps the back arrow to return to `ConversationListScreen`, or navigates to another tab.
**System Response:** Real-time subscription is unsubscribed on unmount. Messages are saved server-side and will reload on next visit.
**User Sees:** Returns to previous screen or tab.

---

## Success State

**What User Sees:** Both parties have exchanged messages and Sanjay has confirmed the room details he needed.

**What User Feels:** Informed, connected, confident — the platform did its job as a private communication channel without exposing either party's personal contact info.

**System State:**

- `conversations` record exists with updated `last_message` + `last_message_time`
- `messages` table has all messages, ordered by `timestamp`
- `conversation_participants.unread_count` is 0 for both parties (after each reads)
- No email or phone number was ever exposed

**Notifications Sent:**

- (Scaffolded) Push notification to recipient when new message arrives. Currently only visible if app is open or if user checks Messages tab.

---

## Decision Points

```
User taps "Contact Author" or chat icon
  │
  ├─> Trust Level check
  │     ├─> Level 0: Show "Verify your account to send messages" prompt → Exit
  │     └─> Level 1+: Continue
  │
  ├─> Tapping own post?
  │     ├─> Yes: Contact Author button hidden — no action
  │     └─> No: Continue
  │
  ├─> getOrCreateConversation
  │     ├─> Conversation exists → navigate to existing thread
  │     └─> New conversation → create records → navigate to thread
  │
  └─> In thread
        ├─> Send message → optimistic update → Supabase write
        ├─> Receive real-time message → append to list
        └─> Kebab menu (⋮)
              └─> Block User → confirmation alert → blockUser() → navigate back
```

---

## Touchpoints

| Step | Touchpoint | Channel | Data Required | Data Stored |
|------|------------|---------|---------------|-------------|
| 1 | View post detail | Mobile / Web | Post ID | None |
| 2 | Tap Contact Author | Mobile / Web | `userId`, `authorId` | `conversations`, `conversation_participants` |
| 3 | Compose message | Mobile / Web | Message text | None (draft in UI state) |
| 4 | Send message | Mobile / Web | `conversationId`, `senderId`, `text` | `messages` record |
| 5 | Push notification | Push (Expo) | `recipientId`, message preview | `device_tokens` (for future push) |
| 7 | Open conversation list | Mobile / Web | `userId` | None (read only) |
| 8 | Open thread | Mobile / Web | `conversationId`, `userId` | `unread_count` reset to 0 |

---

## Platform Considerations

### Applies To

- [x] Mobile (iOS & Android)
- [x] Web (Desktop & Mobile Web)

### Platform Differences

| Step | Mobile Behavior | Web Behavior | Notes |
|------|----------------|--------------|-------|
| Step 2 (initiate) | "Contact Author" button in PostDetailScreen | "Contact" button in `/posts/[id]` page | Same API call |
| Step 3 (compose) | Native keyboard avoidance (iOS: padding; Android: adjustResize) | Browser text input, no keyboard avoidance needed | Mobile has more complexity |
| Step 4 (send) | Tap send icon (→) | Click send button or press Enter | Same API |
| Step 6 (badge) | Tab bar unread badge, polled every 30s | Browser tab title shows unread count (or badge in sidebar nav) | |
| Step 7 (list) | `ConversationListScreen` (dedicated screen) | `/messages` page | Same shared `getConversations` API |
| Step 8 (thread) | `MessageThreadScreen` with native keyboard handling | `/messages/[id]` page | Same shared `getMessages` + `subscribeToMessages` |
| Avatar menu | Long-tap or tap avatar → context menu popup | Click avatar → contextual menu | |

---

## Emotions & Experience

| Phase | Emotion | Confidence Level | Friction Level | Notes |
|-------|---------|------------------|----------------|-------|
| Finding post | Hopeful | Medium | Low | Post is there, CTA is clear |
| Initiating chat | Nervous | High | Low | One tap, immediate navigation |
| Composing first message | Thoughtful | Medium | Low | Open text, no structure required |
| Waiting for reply | Uncertain | Low | Medium | No push notifications yet |
| Receiving reply | Excited | High | Low | Real-time delivery feels instant |
| Ongoing exchange | Engaged | High | Low | Natural conversation rhythm |

---

## Pain Points & Friction

### Current Pain Points

1. **Pain Point:** No push notifications for new messages (infrastructure not yet deployed)
   - **Impact:** High — users miss replies unless they proactively open the app
   - **Frequency:** Every conversation
   - **Affected Users:** All users waiting for a reply
   - **Mitigation:** Unread badge on Messages tab (polled every 30s) provides passive awareness when app is open
   - **Solution:** Deploy push notification edge function (see `docs/plans/active/notifications-feature.md`)

2. **Pain Point:** No typing indicator
   - **Impact:** Medium — users don't know if the other party is composing, leading to uncertainty
   - **Frequency:** Common in active conversations
   - **Affected Users:** Both parties in conversation
   - **Mitigation:** Real-time message delivery compensates somewhat
   - **Solution:** Implement Supabase Realtime presence for typing state (Phase 2 consideration)

3. **Pain Point:** No image/file sharing in chat
   - **Impact:** Medium — users wanting to share photos (e.g., room photos, ID) must use external channels
   - **Frequency:** Relevant for Housing posts especially
   - **Affected Users:** Housing/Jobs post conversations
   - **Mitigation:** Post photos (up to 3) visible on the post detail screen
   - **Solution:** Phase 2 — image message type (`message_type = 'image'` already in DB schema)

4. **Pain Point:** No message send failure feedback
   - **Impact:** Medium — if send fails silently, user thinks message was delivered when it wasn't
   - **Frequency:** On poor network conditions
   - **Affected Users:** Users with intermittent connectivity
   - **Mitigation:** None currently
   - **Solution:** Add optimistic send error handling + retry button

5. **Pain Point:** Chat RLS is currently disabled
   - **Impact:** Critical (security) — any authenticated user can read all chat data server-side
   - **Frequency:** Always (all chat data)
   - **Affected Users:** All users (privacy risk)
   - **Mitigation:** None — this must be fixed before any public release
   - **Solution:** Re-enable RLS on `conversations`, `messages`, `conversation_participants` (see PROGRESS.md Security TODO)

---

## Success Metrics

- [ ] **Time to First Message:** < 30 seconds from tapping "Contact Author" to message sent
- [ ] **Conversation Completion Rate:** > 60% of initiated conversations receive at least one reply within 24h
- [ ] **Message Delivery Latency:** < 500ms for real-time delivery when both users are online
- [ ] **Thread Open Rate:** > 80% of users with unread messages open the thread within 24h
- [ ] **Block Rate:** < 2% of conversations result in a block (indicator of safety)

---

## Alternative Paths

### Path 1: Returning to an Existing Conversation

**Trigger:** User has already chatted with this author. Tapping "Contact Author" again routes to the existing thread (no duplicate conversations).
**How Journey Changes:** Steps 2–3 are instant; user lands in existing thread with message history already visible. No new `conversations` record created.
**Outcome:** Same as new conversation — user can send additional messages.

### Path 2: Author-Initiated Reply

**Trigger:** Post author receives a message and opens the app to reply.
**How Journey Changes:** Author enters via Messages tab → Conversation List → Thread (Steps 6–10). Author doesn't need to initiate — they respond. Trust Level 0 authors can still reply.
**Outcome:** Bidirectional conversation proceeds normally.

### Path 3: Level 0 User Attempts to Message

**Trigger:** Level 0 user taps "Contact Author" on a post.
**How Journey Changes:** System checks trust level. User sees a prompt: "Verify your phone number to send messages." Journey ends — user redirected to verification flow.
**Outcome:** User is prompted to complete trust level verification (Journey #02).

### Path 4: Blocking an Abusive User

**Trigger:** User receives harassing or unwanted messages.
**How Journey Changes:** In `MessageThreadScreen`, user taps kebab menu (⋮) → "Block User" → confirmation alert → `blockUser(supabase, userId, otherUserId)` → navigates back to conversation list. Blocked user can no longer message them.
**Outcome:** Conversation is effectively ended. Future messages from blocked user are prevented at the API layer.

### Path 5: Entering Chat from Public Profile

**Trigger:** User views another user's `PublicProfileScreen` and taps the "Message" button.
**How Journey Changes:** Same `getOrCreateConversation` flow as Path 1/2 — navigates to existing or new thread. No post context is attached to the conversation.
**Outcome:** Same as standard chat — bidirectional messaging.

---

## Error & Edge Cases

| Scenario | Expected Behavior | Recovery Path | User Message |
|----------|------------------|---------------|--------------|
| No internet on send | Message appears optimistically but write fails silently | Retry not currently shown; message state unclear | (None currently — improvement needed) |
| Network drops mid-conversation | Real-time subscription disconnects; no new messages received | Re-subscribe on reconnect (Supabase handles this automatically) | No visible indicator |
| Session timeout while in thread | Auth context refreshes session; if refresh fails, user is signed out | Re-authenticate, return to thread | Standard auth error handling |
| Messaging a banned user | `blockUser` or trust-level policies prevent send | API error returned; navigate back | "Unable to send message" |
| Conversation not found (invalid ID) | `getMessages` returns error | Navigate back to Conversation List | Silently fails — improvement needed |
| User attempts to message themselves | "Contact Author" button hidden on own posts | Not possible via UI | N/A |
| 1000 char limit reached | Send button remains disabled; text stops being accepted | User shortens message | Character counter visible in ChatInput |

---

## Related Journeys

### Before This Journey (Prerequisites)

- **Journey #01: Signup and Onboarding** — must have an account
- **Journey #02: Trust Level Verification** — must be Level 1+ to initiate
- **Journey #02: Browsing and Engaging with Posts** — typical entry point (found a post to respond to)

### After This Journey (Next Steps)

- **Journey #10: Report Content or User** — if user receives harassing messages, they can report the conversation

### Related/Parallel Journeys

- **Journey #08: Respond to a Post** — conceptually precedes this journey; browsing leads to messaging
- **Journey #10: Report Content** — safety escape hatch from chat

---

## Visual Flow Diagram

```
┌─────────────────────────┐
│       Entry Points      │
│  • "Contact Author" btn │
│  • Post card chat icon  │
│  • Avatar → "Chat"      │
│  • Public Profile msg   │
│  • Messages tab         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Trust Level Check     │─No─▶│  Show Verification      │
│   (Level 1+ required    │     │  Prompt & Exit          │
│   to initiate)          │     └─────────────────────────┘
└────────────┬────────────┘
             │ Yes
             ▼
┌─────────────────────────┐
│  getOrCreateConversation│
│  (shared API, dep inj.) │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌──────────┐   ┌──────────────┐
│  New     │   │  Existing    │
│  Thread  │   │  Thread      │
│(created) │   │(history kept)│
└────┬─────┘   └──────┬───────┘
     └────────┬────────┘
              │
              ▼
┌─────────────────────────┐
│   MessageThreadScreen   │
│   • Header: avatar,     │
│     name, trust badge,  │
│     kebab menu (⋮)      │
│   • Message list        │
│     (Messenger-style)   │
│   • Read receipts       │
│     (✓ sent, ✓✓ read)   │
│   • ChatInput at bottom │
└────────────┬────────────┘
             │
     ┌───────┴────────────┐
     │                    │
     ▼                    ▼
┌──────────┐       ┌──────────────┐
│  Send    │       │  Receive     │
│  Message │       │  (Realtime   │
│  (opt.)  │       │  subscription│
└──────────┘       └──────────────┘
             │
             ▼
┌─────────────────────────┐
│  Kebab Menu (⋮)         │
│  └─▶ Block User         │
│       → Confirmation    │
│       → blockUser()     │
│       → Navigate Back   │
└─────────────────────────┘
```

---

## Technical Requirements

### Shared API Functions Used

All in `packages/shared/src/api/` — dependency injection pattern (accept `supabase: SupabaseClient`):

- `getOrCreateConversation(supabase, userId, userName, photoUrl, otherUserId)` — idempotent conversation creation
- `getConversations(supabase, userId)` → `ConversationWithParticipant[]` — inbox list
- `getMessages(supabase, conversationId)` → `ChatMessage[]` — message history
- `sendMessage(supabase, conversationId, senderId, text)` — create message record
- `markAsRead(supabase, conversationId, userId)` — reset `unread_count` to 0
- `subscribeToMessages(supabase, conversationId, callback)` → real-time subscription
- `getTotalUnreadCount(supabase, userId)` → `number` — for Messages tab badge
- `blockUser(supabase, blockerId, blockedId)` — insert into `blocked_users`

### Database Tables

- `conversations` — one record per unique pair of users
- `conversation_participants` — two records per conversation (one per participant), tracks `unread_count`
- `messages` — one record per message, ordered by `timestamp`
- `blocked_users` — one record per block relationship

### Realtime Subscription

- Supabase Realtime channel: `messages:conversation_id=eq.{conversationId}`
- Fires on `INSERT` events → appends new bubble to list
- Unsubscribed on component unmount (`useEffect` cleanup)

### Permissions Required

- Trust Level 1+ to initiate a new conversation (enforced at UI + RLS layer)
- Trust Level 0 can receive and reply to messages (enforced at UI — Contact Author button hidden on own posts, but no Level 0 block on replies)

---

## Questions & Assumptions

### Assumptions

- Users identify each other by masked name ("Firstname L.") — no real name or contact info exposed
- Chat history is retained indefinitely (no 90-day expiry implemented yet, despite roadmap mention)
- One conversation per unique user pair — no multi-person group chats in Phase 1
- Post context (which post sparked the conversation) is stored in `conversation_participants.post_context` and shown in the conversation list item

### Open Questions

- [ ] Should blocked users be able to see historical messages before the block?
- [ ] Should there be a "mute conversation" option separate from block?
- [ ] What happens to a conversation if the linked post is deleted? (post context becomes stale)
- [ ] Should Level 0 users be able to see the Contact Author button but get a prompt, or should it be hidden entirely?
- [ ] When push notifications are live, should message preview be included in the notification payload (privacy consideration)?
