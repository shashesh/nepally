# Wireframe: Message Thread Screen

**Screen Number:** 08
**Feature Reference:** [in-app-chat.md](../features/in-app-chat.md) - Features 8.4, 8.5, 8.6, 8.7
**User Story:** As a verified user, I want to send and receive messages in a conversation so I can coordinate with other community members about posts.
**Last Updated:** 2026-02-15
**Status:** Draft

---

## Screen Purpose

Full chat thread between two users, linked to a specific post. Displays messages chronologically with real-time updates via Supabase Realtime. WhatsApp-inspired design with sent messages on the right (blue) and received on the left (gray).

**Key Goals:**
- Clear, familiar chat interface (WhatsApp-like)
- Real-time message delivery
- Post context always visible so users remember what they're discussing
- Easy send flow with keyboard management
- Read receipts for message status
- Block option for safety

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│  ← Ram K.  ✓                     ⋮     │ ← Header: back, name, trust badge, menu
├─────────────────────────────────────────┤
│  🏠 Private Room in Richardson  →       │ ← Post context bar (tappable)
├─────────────────────────────────────────┤
│                                         │
│         ── Today ──                     │ ← Date separator
│                                         │
│  ┌─────────────────────────┐            │ ← Received message (left, gray)
│  │ Hi! I saw your post     │            │
│  │ about the room. Is it   │            │
│  │ still available?        │            │
│  │              10:30 AM   │            │
│  └─────────────────────────┘            │
│                                         │
│            ┌─────────────────────────┐  │ ← Sent message (right, blue)
│            │ Yes! It's still         │  │
│            │ available. Would you    │  │
│            │ like to come see it?    │  │
│            │  10:32 AM          ✓✓   │  │    Double check = read
│            └─────────────────────────┘  │
│                                         │
│  ┌─────────────────────────┐            │ ← Received message
│  │ That would be great!    │            │
│  │ When are you free?      │            │
│  │              10:33 AM   │            │
│  └─────────────────────────┘            │
│                                         │
│            ┌─────────────────────────┐  │ ← Sent message
│            │ How about Saturday      │  │
│            │ afternoon around 2pm?   │  │
│            │  10:35 AM          ✓    │  │    Single check = sent (unread)
│            └─────────────────────────┘  │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────┐  ➤   │ ← Input bar: text field + send
│  │ Type a message...             │      │
│  └───────────────────────────────┘      │
└─────────────────────────────────────────┘
```

### Header Menu (⋮ kebab pressed)

```
┌─────────────────────────────────────────┐
│  ← Ram K.  ✓                     ⋮     │
├─────────────────────────────────────────┤
│                    ┌─────────────────┐  │
│                    │ View Profile    │  │
│                    ├─────────────────┤  │
│                    │ Block User      │  │ ← Red text
│                    └─────────────────┘  │
│                                         │
```

### Block Confirmation Dialog

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │       Block Ram K.?               │  │
│  │                                   │  │
│  │  They won't be able to message    │  │
│  │  you. You can unblock them        │  │
│  │  later in Settings.              │  │
│  │                                   │  │
│  │  ┌────────────┐ ┌────────────┐   │  │
│  │  │   Cancel   │ │   Block    │   │  │ ← Block button: red
│  │  └────────────┘ └────────────┘   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Header Bar

**Type:** Navigation bar with user info
**Height:** 44px (iOS) / 56dp (Android)
**Background:** White (#FFFFFF)
**Border:** 1px bottom #E0E0E0

**Components (left to right):**

#### Back Button
- **Icon:** ← (chevron left), 24px
- **Color:** #1565C0 (Primary Blue)
- **Touch target:** 44x44px
- **Action:** Navigate back to ConversationListScreen

#### User Info
- **Name:** "Ram K." (17pt Semibold, #212121)
- **Trust Badge:** ✓ (16px, #2E7D32 green) for Level 1+
- **Touch target:** Tap name → navigate to user profile (future)

#### Kebab Menu (⋮)
- **Icon:** Three dots vertical, 24px
- **Color:** #757575
- **Touch target:** 44x44px
- **Action:** Open dropdown menu

**Menu Items:**
| Item | Icon | Color | Action |
|------|------|-------|--------|
| View Profile | person-outline | #212121 | Navigate to public profile (future) |
| Block User | close-circle | #C62828 (Error Red) | Show block confirmation |

---

### 2. Post Context Bar

**Type:** Tappable info bar
**Height:** 48px
**Background:** #F5F5F5 (Light Gray)
**Padding:** 16px horizontal, 12px vertical
**Border:** 1px bottom #E0E0E0

**Components:**
- **Category Icon:** 🏠/💼/🚨/✈️ (16px)
- **Post Title:** "Private Room in Richardson" (15pt Regular, #212121)
- **Chevron:** → (16px, #757575) — indicates tappable
- **Truncation:** Max 30 chars, "..."
- **Action:** Tap → navigate to PostDetailScreen

**States:**
- **Post exists:** Category icon + title + chevron
- **Post deleted:** "Post no longer available" in #757575, no chevron, not tappable

**Accessibility:** "Related post: Housing, Private Room in Richardson. Button."

---

### 3. Date Separator

**Type:** Inline divider with date label
**Height:** 32px
**Margin:** 16px top, 8px bottom

**Layout:**
- **Line:** 1px #E0E0E0, extends from left to center gap
- **Label:** "Today" / "Yesterday" / "Feb 14" / "Feb 10, 2026"
- **Typography:** 12pt/12sp Regular, #757575
- **Background:** Rounded pill, #F5F5F5, 8px padding horizontal
- **Alignment:** Center

**Date format rules:**
- Today → "Today"
- Yesterday → "Yesterday"
- This week → Day name ("Monday")
- This year → "Feb 14"
- Older → "Feb 14, 2025"

---

### 4. Message Bubble — Received

**Type:** Chat bubble (left-aligned)
**Max width:** 75% of screen width
**Background:** #F0F0F0 (Light Gray)
**Corner radius:** 16px (top-left: 4px for tail effect)
**Padding:** 12px horizontal, 8px vertical
**Margin:** 16px left, 64px right (minimum), 4px between consecutive same-sender

**Text:**
- **Typography:** 16pt/16sp Regular, #212121
- **Max lines:** Unlimited (wraps)
- **Selectable:** Long-press to copy (future)

**Timestamp:**
- **Text:** "10:30 AM"
- **Typography:** 11pt/11sp Regular, #757575
- **Position:** Bottom-right of bubble, inline with last line if space allows

**Accessibility:** "Ram K. said: Hi! I saw your post about the room. Is it still available? 10:30 AM."

---

### 5. Message Bubble — Sent

**Type:** Chat bubble (right-aligned)
**Max width:** 75% of screen width
**Background:** #1565C0 (Primary Blue)
**Corner radius:** 16px (top-right: 4px for tail effect)
**Padding:** 12px horizontal, 8px vertical
**Margin:** 64px left (minimum), 16px right

**Text:**
- **Typography:** 16pt/16sp Regular, #FFFFFF (White)
- **Selectable:** Long-press to copy (future)

**Timestamp + Read Receipt:**
- **Timestamp:** "10:32 AM" (11pt Regular, rgba(255,255,255,0.7))
- **Read Receipt Icon:** Positioned after timestamp
  - ✓ (single check) = Sent, not yet read — rgba(255,255,255,0.7)
  - ✓✓ (double check) = Read — #FFFFFF (bright white)
- **Position:** Bottom-right of bubble

**Accessibility:** "You said: Yes! It's still available. Would you like to come see it? 10:32 AM. Read."

---

### 6. Message Input Bar

**Type:** Fixed bottom bar with text input and send button
**Height:** 56px minimum (grows with multi-line text, max 120px)
**Background:** White (#FFFFFF)
**Border:** 1px top #E0E0E0
**Padding:** 8px horizontal, 8px vertical
**Safe area:** Respects bottom safe area (iPhone notch)

**Components:**

#### Text Input
- **Placeholder:** "Type a message..."
- **Typography:** 16pt/16sp Regular, placeholder #BDBDBD, text #212121
- **Background:** #F5F5F5
- **Corner radius:** 24px (pill shape)
- **Padding:** 12px horizontal, 10px vertical
- **Height:** 40px default, grows to max 104px (4 lines)
- **Max chars:** 1000
- **Multi-line:** Yes, auto-grows
- **Keyboard:** Default text keyboard
- **Return key:** New line (not send)

#### Send Button
- **Icon:** Arrow up in circle (➤), 36x36px
- **Background (enabled):** #1565C0 (Primary Blue)
- **Background (disabled):** #E0E0E0 (Gray)
- **Icon color:** #FFFFFF
- **Touch target:** 44x44px
- **Position:** Right of text input, 8px gap
- **States:**
  - Disabled: Gray, when input is empty
  - Enabled: Blue, when input has text
  - Pressed: Darker blue (#104D99)
  - Sending: Brief scale animation (0.9 → 1.0)

**Keyboard behavior:**
- Input bar moves up with keyboard (KeyboardAvoidingView)
- Messages scroll up to keep newest visible
- Tap outside input or scroll dismisses keyboard

**Accessibility:**
- Input: "Message input field. Type a message."
- Send: "Send message, button. Disabled." / "Send message, button."

---

## Interaction Details

### Sending a Message
1. User taps text input → keyboard appears
2. Input bar slides up above keyboard
3. Message list scrolls to keep latest messages visible
4. User types message (send button activates)
5. User taps Send button
6. Message bubble appears immediately (optimistic UI, lighter opacity)
7. Message sent to Supabase
8. On success: bubble becomes full opacity, single check (✓) appears
9. On failure: show error indicator (red ! icon), tap to retry

### Receiving a Message (Real-time)
1. Supabase Realtime subscription fires INSERT event on messages table
2. New message bubble animates in from bottom
3. Message list auto-scrolls to bottom (if user was at bottom)
4. If user scrolled up: show "New message ↓" floating pill at bottom
5. Mark message as read (update `read` field, `read_at` timestamp)

### Read Receipt Updates
1. When recipient opens thread: all unread messages marked as read
2. Supabase Realtime fires UPDATE event
3. Sender's message bubbles update: ✓ → ✓✓

### "New Message" Indicator (scrolled up)
```
│                                         │
│  ┌─────────────────────────┐            │
│  │ Earlier messages...     │            │
│  └─────────────────────────┘            │
│                                         │
│         ┌─────────────────┐             │
│         │  New message ↓  │             │ ← Floating pill
│         └─────────────────┘             │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────┐  ➤   │
│  │ Type a message...             │      │
│  └───────────────────────────────┘      │
└─────────────────────────────────────────┘
```
- **Style:** Pill shape, #1565C0 background, white text, 12pt
- **Action:** Tap → scroll to bottom
- **Auto-dismiss:** When user scrolls to bottom

### Block User Flow
1. User taps ⋮ menu → "Block User"
2. Confirmation dialog appears
3. User taps "Block":
   - `blocked_users` record created
   - Navigate back to ConversationListScreen
   - Conversation removed from both users' lists
   - Toast: "User blocked"
4. User taps "Cancel": dialog closes

---

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| Message send fails (network) | Show red ! icon on bubble, "Tap to retry" tooltip |
| Post deleted | Post context bar: "Post no longer available" (gray, not tappable) |
| Other user blocked you | Input bar replaced with: "You can't message this user." |
| Very long message (>1000 chars) | Character counter appears at 900+, input stops at 1000 |
| Empty thread (just created) | Show system message: "You started a conversation about [post title]" |
| 500+ messages in thread | Paginate: load latest 50, "Load earlier messages" at top |
| Rapid send (spam) | Rate limit: 30 msgs/min, show "Slow down" toast if exceeded |
| Other user offline | Messages still sent (they'll see them when online). No presence indicator in V1 |
| Keyboard covers messages | KeyboardAvoidingView moves input up, scroll adjusts |

---

## Data Requirements

**Initial Load:**
```sql
SELECT * FROM messages
WHERE conversation_id = {conversation_id}
ORDER BY timestamp ASC
LIMIT 50 OFFSET (total - 50);
```

**Real-time Subscription:**
```typescript
supabase.channel('messages:conversation_id')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleMessageUpdate)
  .subscribe();
```

**Send Message:**
```typescript
await supabase.from('messages').insert({
  conversation_id,
  sender_id: currentUser.id,
  text: messageText,
  type: 'text',
});
```

**Mark as Read (on thread open):**
```typescript
await supabase.from('messages')
  .update({ read: true, read_at: new Date().toISOString() })
  .eq('conversation_id', conversationId)
  .neq('sender_id', currentUser.id)
  .eq('read', false);

await supabase.from('conversation_participants')
  .update({ unread_count: 0 })
  .eq('conversation_id', conversationId)
  .eq('user_id', currentUser.id);
```

---

## Navigation

**Entry Points:**
- Tap conversation row in ConversationListScreen
- Tap "Contact Author" on PostDetailScreen (creates conversation first)
- Tap message icon on PostCard (creates conversation first)

**Exit Points:**
- Back button → ConversationListScreen
- Tap post context bar → PostDetailScreen
- Block user → ConversationListScreen (conversation removed)

**Params received:**
- `conversationId: string` — which conversation to display
- `otherUserName: string` — for header display
- `otherUserTrustLevel: number` — for trust badge
- `postId?: string` — linked post (for context bar)
- `postTitle?: string` — for display
- `postCategory?: string` — for icon

---

## Accessibility

- [ ] Screen title announced: "Conversation with Ram K."
- [ ] Messages read in chronological order
- [ ] Each bubble announces sender, text, time, and read status
- [ ] Send button state (enabled/disabled) announced
- [ ] Post context bar announced as button
- [ ] Block confirmation dialog traps focus
- [ ] Keyboard navigation: Tab through input → send
- [ ] Color contrast: white text on blue (#1565C0) = 7.2:1 (passes AA)
- [ ] Touch targets: all buttons 44px+ minimum

---

## Related Screens

**Previous Screen:** [07-conversation-list.md](./07-conversation-list.md)
**Related:** [09-post-detail.md](./09-post-detail.md) (post context tap, Contact Author entry)
**Feature:** [in-app-chat.md](../features/in-app-chat.md)

---

**Wireframe Status:** Draft - Ready for Review
