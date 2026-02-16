# Wireframe: Conversation List Screen

**Screen Number:** 07
**Feature Reference:** [in-app-chat.md](../features/in-app-chat.md) - Feature 8.3
**User Story:** As a verified user, I want to see all my conversations in one place so I can track ongoing discussions about posts.
**Last Updated:** 2026-02-15
**Status:** Draft

---

## Screen Purpose

The Messages tab content. Shows all active conversations sorted by most recent message. Each row displays the other participant's name, last message preview, timestamp, unread badge, and linked post context. This is the hub for all in-app communication.

**Key Goals:**
- Quick overview of all ongoing conversations
- Easy identification of unread messages
- Post context visible so user remembers what the conversation is about
- One-tap access to any conversation thread

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│  Messages                               │ ← Header: 44px, "Messages" title
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │ ← Conversation Row 1 (unread)
│  │  [RK]  Ram K.              2m ago │  │    Avatar initials, name, timestamp
│  │        🏠 Private Room in Rich... │  │    Post context: category icon + title
│  │        Is the room still avail... │  │    Last message preview (50 chars)
│  │                              (2)  │  │    Unread badge: blue circle
│  ├───────────────────────────────────┤  │    Divider line
│  │  [PS]  Priya S.            1h ago │  │ ← Conversation Row 2 (unread)
│  │        💼 Part-Time at Nep...     │  │
│  │        What hours are you lo...   │  │
│  │                              (1)  │  │
│  ├───────────────────────────────────┤  │
│  │  [AJ]  Anuj J.          Yesterday │  │ ← Conversation Row 3 (read)
│  │        ✈️ Travel: DFW → KTM      │  │
│  │        Sounds good, let's mee...  │  │
│  │                                   │  │    No unread badge
│  ├───────────────────────────────────┤  │
│  │  [SM]  Sita M.           Feb 12   │  │ ← Conversation Row 4 (read)
│  │        🏠 2BR Apartment in Pl...  │  │
│  │        Thank you for the info!    │  │
│  │                                   │  │
│  ├───────────────────────────────────┤  │
│  │  [BT]  Bikash T.        Feb 10    │  │ ← Conversation Row 5 (read)
│  │        🚨 Medical: Irving Ho...   │  │
│  │        He's doing much better...  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
  [Home]  [Search]  [Post]  [Msg(3)]  [Me]   ← Tab bar: Messages has badge "3"
```

### Empty State

```
┌─────────────────────────────────────────┐
│  Messages                               │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│                                         │
│            💬                           │
│                                         │
│       No messages yet                   │
│                                         │
│    Browse posts and tap the message     │
│    icon to start a conversation.        │
│                                         │
│    ┌─────────────────────────────┐      │
│    │     Browse Posts            │      │
│    └─────────────────────────────┘      │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
  [Home]  [Search]  [Post]  [Msg]  [Me]
```

---

## Component Details

### 1. Header

**Type:** Navigation bar
**Height:** 44px (iOS) / 56dp (Android)
**Background:** White (#FFFFFF)
**Border:** 1px bottom border #E0E0E0

**Title:**
- **Text:** "Messages"
- **Typography:** 34pt Bold (iOS large title) / 22sp Medium (Android)
- **Color:** #212121
- **Alignment:** Left (iOS large title style)

---

### 2. Conversation Row

**Type:** Tappable list item
**Height:** 88px (iOS) / 88dp (Android)
**Background:** White (#FFFFFF)
**Padding:** 16px horizontal, 12px vertical
**Divider:** 1px #E0E0E0, inset 72px from left (after avatar)

**Layout (left to right):**

#### Avatar (Initials)
- **Shape:** Circle, 48x48px/dp
- **Background:** #1565C0 (Primary Blue) at 15% opacity
- **Text:** First letters of first + last name (e.g., "RK")
- **Typography:** 16pt/16sp Semibold, #1565C0
- **Position:** Left, vertically centered

#### Content Area (middle, flex)

**Line 1: Name + Timestamp**
- **Name:** "Ram K." (17pt/16sp Semibold for unread, Regular for read)
- **Color:** #212121 (unread) / #757575 (read)
- **Timestamp:** "2m ago" (13pt/12sp Regular, #757575)
- **Position:** Name left-aligned, timestamp right-aligned

**Line 2: Post Context**
- **Content:** Category icon + post title (truncated)
- **Format:** "🏠 Private Room in Rich..."
- **Typography:** 13pt/12sp Regular, #757575
- **Max chars:** 30 (truncate with "...")

**Line 3: Last Message + Unread Badge**
- **Content:** Last message preview (truncated)
- **Typography:** 15pt/14sp Regular
- **Color:** #212121 (unread, semibold) / #757575 (read)
- **Max chars:** 35 (truncate with "...")
- **Prefix for own messages:** "You: " in #757575

#### Unread Badge
- **Shape:** Circle, 24x24px/dp
- **Background:** #1565C0 (Primary Blue)
- **Text:** Unread count (e.g., "2")
- **Typography:** 12pt/12sp Bold, #FFFFFF
- **Position:** Right side, vertically centered with Line 3
- **Visibility:** Only shown when unread_count > 0

**States:**
- **Unread:** Name bold, last message bold, badge visible
- **Read:** Name regular weight, last message gray, no badge
- **Pressed:** Background #F5F5F5
- **Swiped left (future):** Reveal "Delete" action

**Accessibility:**
- "Conversation with Ram K. about Housing post: Private Room in Richardson. Last message: Is the room still available? 2 minutes ago. 2 unread messages. Button."

---

### 3. Empty State

**Visible when:** User has zero conversations

**Components:**
- **Icon:** Chat bubble (💬), 64x64px, #BDBDBD
- **Title:** "No messages yet"
- **Typography:** 22pt/22sp Semibold, #212121
- **Subtitle:** "Browse posts and tap the message icon to start a conversation."
- **Typography:** 15pt/14sp Regular, #757575
- **Alignment:** Center
- **CTA Button:** "Browse Posts"
  - Style: Secondary button (outline)
  - Action: Switch to Home tab
  - Width: 200px, centered

---

### 4. Tab Bar Badge

**Position:** On the Messages tab icon in bottom tab navigator
**Badge:**
- **Shape:** Red circle, min 18px diameter (grows for 2+ digits)
- **Background:** #DC143C (Accent Red)
- **Text:** Total unread count across all conversations
- **Typography:** 10pt/10sp Bold, #FFFFFF
- **Position:** Top-right of Messages icon, offset (-4, -4)
- **Visibility:** Only when total unread > 0
- **Max display:** "99+" for counts over 99

---

## Interaction Details

### Primary Flow (Open Conversation)
1. User taps Messages tab in bottom nav
2. Conversation list loads (sorted by last_message_time DESC)
3. User sees unread conversations at top (bold text, badge)
4. User taps a conversation row
5. Navigate to MessageThreadScreen with conversation_id

### Pull-to-Refresh
- Pull down to refresh conversation list
- Spinner appears at top
- List updates with latest data

### Swipe Actions (future enhancement)
- Swipe left: "Delete" (archive conversation)
- Swipe right: "Mark as Read" / "Mark as Unread"
- Not in initial implementation

---

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| No conversations | Show empty state with "Browse Posts" CTA |
| Post was deleted | Show "Post no longer available" in post context line |
| Other user deleted account | Show "[Deleted User]" as name, gray avatar |
| Network error on load | Show error banner: "Could not load messages. Pull to retry." |
| 50+ conversations | Paginate: load 20 at a time, infinite scroll |
| Very long user name | Truncate at 20 chars with "..." |
| Message is from you | Prefix: "You: message text..." |

---

## Data Requirements

**API Query:**
```sql
SELECT c.*, cp.unread_count,
  other_cp.name as other_name, other_cp.user_id as other_user_id
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
JOIN conversation_participants other_cp ON c.id = other_cp.conversation_id
WHERE cp.user_id = {current_user_id}
  AND other_cp.user_id != {current_user_id}
ORDER BY c.last_message_time DESC
LIMIT 20;
```

**Data per row:**
- `conversation_id` — for navigation
- `other_user_name` — display name
- `other_user_id` — for avatar initials
- `post_id`, `post_category`, `post_title` — post context
- `last_message` — preview text
- `last_message_time` — timestamp
- `unread_count` — badge number

---

## Navigation

**Entry Points:**
- Tap Messages tab in bottom navigation
- Deep link: `nusa://messages`

**Exit Points:**
- Tap conversation row → MessageThreadScreen
- Tap "Browse Posts" (empty state) → Home tab
- Tap other bottom tabs

---

## Accessibility

- [ ] Screen title announced: "Messages"
- [ ] Each conversation row is a single tappable element
- [ ] Unread count announced with each row
- [ ] Empty state text readable by screen reader
- [ ] Touch targets: full row height (88px) exceeds 44pt minimum
- [ ] Color contrast: all text meets WCAG AA

---

## Related Screens

**Next Screen:** [08-message-thread.md](./08-message-thread.md) (tap conversation)
**Related:** [06-home-screen-level-0.md](./06-home-screen-level-0.md) (Browse Posts CTA)
**Feature:** [in-app-chat.md](../features/in-app-chat.md)

---

**Wireframe Status:** Draft - Ready for Review
