# Wireframe: Message Thread Screen

> **Screen:** 08 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [in-app-chat.md](../../product/features/in-app-chat.md) - Features 8.4, 8.5, 8.6, 8.7
> **Story:** As a verified user, I want to send and receive messages in a conversation so I can coordinate with other community members.

---

## Screen Purpose

Full chat thread between two users (1:1 DM). Displays messages chronologically with real-time updates via Supabase Realtime. WhatsApp-inspired design with sent messages on the right (blue) and received on the left (gray).

**Key Goals:**

- Clear, familiar chat interface (WhatsApp-like)
- Real-time message delivery
- Easy send flow with keyboard management
- Read receipts for message status
- Block option for safety

---

## Visual Wireframe

::: navbar
[←] **Ram K.** ✓ [⋮]
:::

::: card {.date-separator}
── Today ──
:::

::: card {.bubble-received}
Hi! I saw your post about the room. Is it still available?

10:30 AM
:::

::: card {.bubble-sent}
Yes! It's still available. Would you like to come see it?

10:32 AM ✓✓
:::

::: card {.bubble-received}
That would be great! When are you free?

10:33 AM
:::

::: card {.bubble-sent}
How about Saturday afternoon around 2pm?

10:35 AM ✓
:::

::: footer
[Type a message...___] [➤]*
:::

---

### Header Menu (⋮ pressed)

::: dropdown
View Profile

[Block User]{.destructive}
:::

---

### Block Confirmation Dialog

::: modal
**Block Ram K.?**

They won't be able to message you. You can unblock them later in Settings.

[Cancel]{.outline} [Block]{.destructive}
:::

---

### New Message Indicator (when scrolled up)

::: card {.floating-pill}
New message ↓
:::

---

### Empty Thread State

::: card {.system-message}
Send a message to start the conversation
:::

---

### Send Failure State

::: card {.bubble-sent .error}
How about Saturday afternoon around 2pm?

10:35 AM ⚠️ Tap to retry
:::

---

### Blocked State

::: footer {state:disabled}
You can't message this user.
:::

---

### Error Banner

::: alert error
:warning: **Message failed to send.** Tap the message to retry.
:::

---

## Component Specifications

### 1. Header Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation bar with user info | Navigation bar with user info |
| **Height** | 44px | 56dp |
| **Background** | #FFFFFF | #FFFFFF |
| **Border** | 1px bottom #E0E0E0 | 1px bottom #E0E0E0 |

#### Back Button

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | ← chevron-left, 24px | ← arrow-left, 24dp |
| **Color** | #1565C0 (Primary Blue) | #1565C0 |
| **Touch Target** | 44×44px | 48×48dp |

**Action:** Navigate back to ConversationListScreen

#### User Info

| Property | iOS | Android |
|----------|-----|---------|
| **Name Font** | 17pt Semibold, San Francisco | 17sp Medium, Roboto |
| **Name Color** | #212121 | #212121 |
| **Trust Badge** | ✓ 16px, #2E7D32 (green) for Level 1+ | ✓ 16dp, #2E7D32 |

**Touch target:** Tap name → navigate to user profile (future)

#### Kebab Menu (⋮)

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | Three dots vertical, 24px | Three dots vertical, 24dp |
| **Color** | #757575 | #757575 |
| **Touch Target** | 44×44px | 48×48dp |

**Action:** Open dropdown menu

**Menu Items:**

| Item | Icon | Color | Action |
|------|------|-------|--------|
| View Profile | person-outline | #212121 | Navigate to public profile (future) |
| Block User | close-circle | #C62828 (Error Red) | Show block confirmation |

---

### 2. Date Separator

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Inline divider with date label | Inline divider with date label |
| **Height** | 32px | 32dp |
| **Margin** | 16px top, 8px bottom | 16dp top, 8dp bottom |
| **Line** | 1px #E0E0E0 | 1px #E0E0E0 |
| **Label Font** | 12pt Regular, San Francisco | 12sp Regular, Roboto |
| **Label Color** | #757575 | #757575 |
| **Label Background** | Rounded pill, #F5F5F5, 8px padding horizontal | Rounded pill, #F5F5F5, 8dp padding horizontal |
| **Alignment** | Center | Center |

**Date format rules:**

- Today → "Today"
- Yesterday → "Yesterday"
- This week → Day name ("Monday")
- This year → "Feb 14"
- Older → "Feb 14, 2025"

---

### 3. Message Bubble — Received

| Property | iOS | Android |
|----------|-----|---------|
| **Alignment** | Left-aligned | Left-aligned |
| **Max Width** | 75% screen width | 75% screen width |
| **Background** | #F0F0F0 (Light Gray) | #F0F0F0 |
| **Corner Radius** | 16px (top-left: 4px for tail) | 16dp (top-left: 4dp for tail) |
| **Padding** | 12px horizontal, 8px vertical | 12dp horizontal, 8dp vertical |
| **Margin** | 16px left, 64px right (min), 4px between consecutive | 16dp left, 64dp right (min), 4dp between consecutive |
| **Text Font** | 16pt Regular, San Francisco | 16sp Regular, Roboto |
| **Text Color** | #212121 | #212121 |
| **Max Lines** | Unlimited (wraps) | Unlimited (wraps) |
| **Timestamp Font** | 11pt Regular | 11sp Regular |
| **Timestamp Color** | #757575 | #757575 |
| **Timestamp Position** | Bottom-right of bubble, inline if space | Bottom-right of bubble, inline if space |

**a11y:** "Ram K. said: Hi! I saw your post about the room. Is it still available? 10:30 AM."

---

### 4. Message Bubble — Sent

| Property | iOS | Android |
|----------|-----|---------|
| **Alignment** | Right-aligned | Right-aligned |
| **Max Width** | 75% screen width | 75% screen width |
| **Background** | #1565C0 (Primary Blue) | #1565C0 |
| **Corner Radius** | 16px (top-right: 4px for tail) | 16dp (top-right: 4dp for tail) |
| **Padding** | 12px horizontal, 8px vertical | 12dp horizontal, 8dp vertical |
| **Margin** | 64px left (min), 16px right | 64dp left (min), 16dp right |
| **Text Font** | 16pt Regular, San Francisco | 16sp Regular, Roboto |
| **Text Color** | #FFFFFF (White) | #FFFFFF |
| **Timestamp Font** | 11pt Regular | 11sp Regular |
| **Timestamp Color** | rgba(255,255,255,0.7) | rgba(255,255,255,0.7) |

**Read Receipt Icon (after timestamp):**

- ✓ (single check) = Sent, not yet read — rgba(255,255,255,0.7)
- ✓✓ (double check) = Read — #FFFFFF (bright white)
- **Position:** Bottom-right of bubble

**a11y:** "You said: Yes! It's still available. Would you like to come see it? 10:32 AM. Read."

---

### 5. Message Input Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Fixed bottom bar | Fixed bottom bar |
| **Height** | 56px min (grows, max 120px) | 56dp min (grows, max 120dp) |
| **Background** | #FFFFFF | #FFFFFF |
| **Border** | 1px top #E0E0E0 | 1px top #E0E0E0 |
| **Padding** | 8px horizontal, 8px vertical | 8dp horizontal, 8dp vertical |
| **Safe Area** | Respects bottom safe area (notch) | Respects navigation bar |

#### Text Input

| Property | iOS | Android |
|----------|-----|---------|
| **Placeholder** | "Type a message..." | "Type a message..." |
| **Placeholder Color** | #BDBDBD | #BDBDBD |
| **Text Font** | 16pt Regular, San Francisco | 16sp Regular, Roboto |
| **Text Color** | #212121 | #212121 |
| **Background** | #F5F5F5 | #F5F5F5 |
| **Corner Radius** | 24px (pill shape) | 24dp (pill shape) |
| **Padding** | 12px horizontal, 10px vertical | 12dp horizontal, 10dp vertical |
| **Height** | 40px default, max 104px (4 lines) | 40dp default, max 104dp (4 lines) |
| **Max Chars** | 1000 | 1000 |
| **Multi-line** | Yes, auto-grows | Yes, auto-grows |
| **Keyboard** | Default text | Default text |
| **Return Key** | New line (not send) | New line (not send) |

**a11y:** "Message input field. Type a message."

#### Send Button

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | Arrow up in circle (➤), 36×36px | Arrow up in circle (➤), 36×36dp |
| **Icon Color** | #FFFFFF | #FFFFFF |
| **Touch Target** | 44×44px | 48×48dp |
| **Position** | Right of text input, 8px gap | Right of text input, 8dp gap |

**States:**

- **Disabled:** Background #E0E0E0 (Gray), when input is empty
- **Enabled:** Background #1565C0 (Primary Blue), when input has text
- **Pressed:** Background #104D99 (Darker blue)
- **Sending:** Brief scale animation (0.9 → 1.0)

**Keyboard behavior:**

- Input bar moves up with keyboard (KeyboardAvoidingView)
- Messages scroll up to keep newest visible
- Tap outside input or scroll dismisses keyboard

**a11y:** "Send message, button. Disabled." / "Send message, button."

---

### 6. New Message Floating Pill

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Pill | Pill |
| **Background** | #1565C0 | #1565C0 |
| **Text** | "New message ↓", 12pt, White | "New message ↓", 12sp, White |
| **Position** | Floating above input bar | Floating above input bar |

**Action:** Tap → scroll to bottom
**Auto-dismiss:** When user scrolls to bottom

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Header bar | 44px / 56dp | 0 |
| 3 | Message list (scrollable) | Flex | 0 |
| 4 | Input bar | 56px min / 56dp min | 0 |
| 5 | Bottom safe area (iOS) | Auto | — |

**Horizontal:** Messages have 16px/dp edge margin. Bubbles max 75% screen width. Input bar has 8px/dp padding.

---

## User Interactions

### Sending a Message

1. User taps text input → keyboard appears
2. Input bar slides up above keyboard
3. Message list scrolls to keep latest messages visible
4. User types message (send button activates)
5. User taps Send button
6. Message bubble appears immediately (optimistic UI, lighter opacity)
7. Message sent to Supabase
8. On success: bubble becomes full opacity, single check (✓) appears
9. On failure: show error indicator (red ⚠️ icon), tap to retry

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

## Error States & Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Message send fails (network) | Show red ⚠️ icon on bubble, "Tap to retry" tooltip |
| Other user blocked you | Input bar replaced with: "You can't message this user." |
| Very long message (>1000 chars) | Character counter appears at 900+, input stops at 1000 |
| Empty thread (just created) | Show system message: "Send a message to start the conversation" |
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
- Tap "Chat" on avatar menu (creates conversation first)

**Exit Points:**

- Back button → ConversationListScreen
- Block user → ConversationListScreen (conversation removed)

**Params received:**

- `conversationId: string` — which conversation to display
- `otherUserName: string` — for header display
- `otherUserTrustLevel: number` — for trust badge

---

## Accessibility

- [ ] Screen title announced: "Conversation with Ram K."
- [ ] Messages read in chronological order
- [ ] Each bubble announces sender, text, time, and read status
- [ ] Send button state (enabled/disabled) announced
- [ ] Block confirmation dialog traps focus
- [ ] Keyboard navigation: Tab through input → send
- [ ] Color contrast: white text on blue (#1565C0) = 7.2:1 (passes AA)
- [ ] Touch targets: all buttons 44px+ minimum

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [07-conversation-list.md](../07-conversation-list/07-conversation-list.md) |
| Related | [09-post-detail.md](../09-post-detail/09-post-detail.md) (avatar menu Chat entry) |
| Feature | [in-app-chat.md](../../product/features/in-app-chat.md) |

---

**Status:** Draft — Ready for Review
