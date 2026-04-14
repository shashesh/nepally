# Wireframe: Conversation List Screen

> **Screen:** 07 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [in-app-chat](../features/in-app-chat.md) - Feature 8.3
> **Story:** As a verified user, I want to see all my conversations in one place so I can track ongoing conversations with other members.

---

## Screen Purpose

The Messages tab content. Shows all active conversations sorted by most recent message. Each row displays the other participant's name, last message preview, timestamp, and unread badge. This is the hub for all in-app communication.

**Key Goals:**
- Quick overview of all ongoing conversations
- Easy identification of unread messages
- One-tap access to any conversation thread

---

## Visual Wireframe

### Conversation List (Active State)

::: card
**Messages**
:::

::: card {state:unread}
[RK] **Ram K.** `2m ago`
**Is the room still avail...** (2)
:::

::: card {state:unread}
[PS] **Priya S.** `1h ago`
**What hours are you lo...** (1)
:::

::: card
[AJ] Anuj J. `Yesterday`
Sounds good, let's mee...
:::

::: card
[SM] Sita M. `Feb 12`
Thank you for the info!
:::

::: card
[BT] Bikash T. `Feb 10`
He's doing much better...
:::

[[ Home | Search | Post | *Messages(3)* | Profile ]]

---

### Empty State

::: hero
💬

# No messages yet

Tap any user's avatar on a post to start chatting.

[Browse Posts]{.outline}
:::

[[ Home | Search | Post | Messages | Profile ]]

---

### Error State

::: alert error
:warning: **Could not load messages.** Pull to retry.
:::

---

## Component Specifications

### 1. Header

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation bar | App bar |
| **Height** | 44px | 56dp |
| **Background** | #FFFFFF (White) | #FFFFFF |
| **Border** | 1px bottom #E0E0E0 | 1px bottom #E0E0E0 |
| **Title Text** | 34pt Bold, San Francisco | 22sp Medium, Roboto |
| **Title Color** | #212121 | #212121 |
| **Alignment** | Left (large title style) | Left |

---

### 2. Conversation Row

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Tappable list item | Tappable list item |
| **Height** | 72px | 72dp |
| **Background** | #FFFFFF (White) | #FFFFFF |
| **Padding** | 16px horizontal, 12px vertical | 16dp horizontal, 12dp vertical |
| **Divider** | 1px #E0E0E0, inset 72px from left | 1px #E0E0E0, inset 72dp from left |

#### Avatar (Initials)

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Circle | Circle |
| **Size** | 48×48px | 48×48dp |
| **Background** | #1565C0 at 15% opacity | #1565C0 at 15% opacity |
| **Text** | First + last initial (e.g., "RK") | First + last initial |
| **Font** | 16pt Semibold, #1565C0 | 16sp Semibold, #1565C0 |
| **Position** | Left, vertically centered | Left, vertically centered |

#### Line 1: Name + Timestamp

| Property | iOS | Android |
|----------|-----|---------|
| **Name Font (unread)** | 17pt Semibold, San Francisco | 16sp Semibold, Roboto |
| **Name Font (read)** | 17pt Regular, San Francisco | 16sp Regular, Roboto |
| **Name Color (unread)** | #212121 | #212121 |
| **Name Color (read)** | #757575 | #757575 |
| **Timestamp Font** | 13pt Regular | 12sp Regular |
| **Timestamp Color** | #757575 | #757575 |
| **Layout** | Name left-aligned, timestamp right-aligned | Same |

#### Line 2: Last Message + Unread Badge

| Property | iOS | Android |
|----------|-----|---------|
| **Font (unread)** | 15pt Semibold | 14sp Semibold |
| **Font (read)** | 15pt Regular | 14sp Regular |
| **Color (unread)** | #212121 | #212121 |
| **Color (read)** | #757575 | #757575 |
| **Max Chars** | 35 (truncate with "...") | 35 |
| **Own Msg Prefix** | "You: " in #757575 | Same |

#### Unread Badge

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Circle | Circle |
| **Size** | 24×24px | 24×24dp |
| **Background** | #1565C0 (Primary Blue) | #1565C0 |
| **Text** | Unread count (e.g., "2") | Same |
| **Font** | 12pt Bold, #FFFFFF | 12sp Bold, #FFFFFF |
| **Position** | Right, vertically centered with Line 3 | Same |
| **Visibility** | Only when unread_count > 0 | Same |

**States:**
- **Unread:** Name bold, last message bold, badge visible
- **Read:** Name regular weight, last message gray, no badge
- **Pressed:** Background #F5F5F5
- **Swiped left (future):** Reveal "Delete" action

**a11y:** "Conversation with Ram K. Last message: Is the room still available? 2 minutes ago. 2 unread messages. Button."

---

### 3. Empty State

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | 💬 chat bubble, 64×64px, #BDBDBD | 💬, 64×64dp, #BDBDBD |
| **Title Font** | 22pt Semibold, San Francisco | 22sp Semibold, Roboto |
| **Title Color** | #212121 | #212121 |
| **Subtitle Font** | 15pt Regular, San Francisco | 14sp Regular, Roboto |
| **Subtitle Color** | #757575 | #757575 |
| **Alignment** | Center | Center |
| **CTA Style** | Outline button, 200px wide | Outline button, 200dp wide |
| **CTA Action** | Switch to Home tab | Switch to Home tab |
| **Visibility** | When user has zero conversations | Same |

---

### 4. Tab Bar Badge

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Red circle, min 18px diameter | Red circle, min 18dp diameter |
| **Background** | #DC143C (Accent Red) | #DC143C |
| **Font** | 10pt Bold, #FFFFFF | 10sp Bold, #FFFFFF |
| **Position** | Top-right of Messages icon, offset (-4, -4) | Same |
| **Max Display** | "99+" for counts over 99 | Same |
| **Visibility** | Only when total unread > 0 | Same |

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Header ("Messages") | 44px / 56dp | 0 |
| 3 | Conversation Row × N | 72px/dp each | 0 (dividers only) |
| 4 | Bottom safe area (iOS) | Auto | — |

### Empty State Layout

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Chat icon | 64px/dp | 16px/dp |
| 2 | Title "No messages yet" | ~28px | 8px/dp |
| 3 | Subtitle text | ~40px | 24px/dp |
| 4 | "Browse Posts" button | 48px / 56dp | — |

**Horizontal:** 16px/dp margins. Content area centered vertically for empty state.

---

## User Interactions

### Primary Flow (Open Conversation)
1. User taps Messages tab in bottom nav
2. Conversation list loads (sorted by `last_message_time` DESC)
3. User sees unread conversations at top (bold text, badge)
4. User taps a conversation row
5. Navigate to MessageThreadScreen with `conversation_id`

### Pull-to-Refresh
- Pull down to refresh conversation list
- Spinner appears at top
- List updates with latest data

### Swipe Actions (future enhancement)
- Swipe left: "Delete" (archive conversation)
- Swipe right: "Mark as Read" / "Mark as Unread"
- Not in initial implementation

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Header Height** | 44px (large title) | 56dp (Material app bar) |
| **Header Title** | 34pt Bold, left-aligned large title | 22sp Medium, Roboto |
| **Row Press Feedback** | Background #F5F5F5 | Ripple effect from tap point |
| **Typography** | San Francisco | Roboto |
| **Tab Bar** | iOS tab bar | Material bottom navigation |
| **Status Bar** | Light content | Translucent |
| **Safe Area** | Respect notch insets | Respect status bar height |
| **Pull-to-Refresh** | UIRefreshControl spinner | SwipeRefreshLayout |
| **Screen Transition** | Slide from right (300ms) | Slide up (300ms) |

---

## Error States & Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No conversations | Show empty state with "Browse Posts" CTA |
| Other user deleted account | Show "[Deleted User]" as name, gray avatar |
| Network error on load | Show error banner: "Could not load messages. Pull to retry." |
| 50+ conversations | Paginate: load 20 at a time, infinite scroll |
| Very long user name | Truncate at 20 chars with "..." |
| Message is from you | Prefix: "You: message text..." |

---

## Accessibility

### Screen Reader Order
1. "Messages" (screen title)
2. Each conversation row as single tappable element with full context
3. Empty state text (when applicable)

### Touch Targets
- Full row height (72px/dp) exceeds 44pt/48dp minimum

### Color Contrast (WCAG)
| Element | Ratio | Level |
|---------|-------|-------|
| Name unread (#212121 on #FFFFFF) | 17.2:1 | AAA ✓ |
| Name read (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |
| Unread badge (#FFFFFF on #1565C0) | 7.2:1 | AAA ✓ |
| Tab badge (#FFFFFF on #DC143C) | 4.5:1 | AA ✓ |

### Checklist
- [ ] Screen title announced: "Messages"
- [ ] Each conversation row is a single tappable element
- [ ] Unread count announced with each row
- [ ] Empty state text readable by screen reader
- [ ] Touch targets: full row height (72px) exceeds 44pt minimum
- [ ] Color contrast: all text meets WCAG AA

---

## Animations & Transitions

### On Screen Load
| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Header | 0ms | 0ms | Instant render |
| 2 | Conversation rows | 0ms | 200ms | Fade in (ease-out) |

### Row Interaction
- **Press:** Background change to #F5F5F5 (100ms)
- **iOS:** Subtle haptic on tap
- **Android:** Ripple from tap point (200ms)

### Pull-to-Refresh
- Spinner fade in (150ms) on pull threshold
- Rows refresh in place (no flicker)

---

## Content & Localization

### String Keys
| Key | Value |
|-----|-------|
| `messages_title` | Messages |
| `messages_empty_title` | No messages yet |
| `messages_empty_subtitle` | Tap any user's avatar on a post to start chatting. |
| `messages_empty_cta` | Browse Posts |
| `messages_error_load` | Could not load messages. Pull to retry. |
| `messages_deleted_user` | [Deleted User] |
| `messages_you_prefix` | You: |

---

## Technical Notes

### Identifiers
- Route: `/messages`
- iOS: `ConversationListScreen`
- Android: `ConversationListFragment`

### Data Requirements

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
- `last_message` — preview text
- `last_message_time` — timestamp
- `unread_count` — badge number

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Tap Messages tab in bottom nav | This screen |
| Entry | Deep link `nepally://messages` | This screen |
| Exit | Tap conversation row | `/message-thread` (Screen 08) with `conversation_id` |
| Exit | Tap "Browse Posts" (empty state) | Home tab |
| Exit | Tap other bottom tabs | Respective tab |

### State Management
- Real-time subscription to conversations table for new message updates
- Unread count synced from `conversation_participants.unread_count`
- Pagination: 20 items per page, infinite scroll

---

## Testing Checklist

### Functional Tests
- [ ] Messages tab navigates to conversation list
- [ ] Conversations sorted by most recent message
- [ ] Tapping row navigates to MessageThreadScreen
- [ ] Unread badge shows correct count
- [ ] Pull-to-refresh updates list
- [ ] "Browse Posts" CTA switches to Home tab (empty state)
- [ ] Pagination loads next 20 conversations on scroll

### Visual Tests
- [ ] Unread rows render bold name + bold message
- [ ] Read rows render regular weight + gray text
- [ ] Avatar initials display correctly
- [ ] Tab bar badge shows total unread count
- [ ] Empty state centered with icon, text, and CTA
- [ ] Dividers inset correctly after avatar

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads full conversation context per row
- [ ] Touch targets: full row height (72px) meets minimum
- [ ] Color contrast meets WCAG AA
- [ ] Empty state readable by screen reader
- [ ] Screen title announced on tab switch

### Edge Case Tests
- [ ] Zero conversations shows empty state
- [ ] Deleted user shows "[Deleted User]" with gray avatar
- [ ] Network error shows error banner
- [ ] 99+ unread shows "99+" badge
- [ ] Long names truncate at 20 chars

---

## Open Questions

- [ ] **Real-time updates:** Use Supabase real-time subscription or polling? → **Rec:** Real-time for new messages, polling for list refresh
- [ ] **Conversation archiving:** Allow users to archive/delete conversations? → **Rec:** Defer to Phase 2
- [ ] **Online status indicator:** Show if other user is online? → **Rec:** Defer to Phase 2
- [ ] **Group conversations:** Support multi-user threads? → **Rec:** No, 1:1 only for Phase 1
- [ ] **Message search:** Allow searching within conversations? → **Rec:** Defer to Phase 2

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [06-home-screen-level-0.md](./06-home-screen-level-0.md) (Messages tab / Browse Posts CTA) |
| Next | [08-message-thread.md](./08-message-thread.md) (tap conversation) |
| Feature | [in-app-chat.md](../features/in-app-chat.md) |

---

**Status:** Draft — Ready for Review
