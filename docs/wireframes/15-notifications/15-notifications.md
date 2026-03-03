# Wireframe: Notifications

> **Screen:** 15 | **Status:** Draft | **Updated:** 2026-03-03
> **Feature Spec:** `docs/features/phase1-feature-breakdown.md` — Features 12.1–12.4
> **Story:** As a user, I want to receive and manage notifications so I can stay informed about activity that matters to me.

---

## Screen Purpose

Delivers real-time notifications to users across web and mobile platforms via push delivery (Expo Push on mobile, Web Push API on web) and an in-app notification center. Covers four capabilities: push infrastructure setup (12.1), chat message notifications (12.2), in-app notification list (12.3), and notification preferences (12.4).

**Key Goals:**
- Notify users of chat messages, comments, likes, and emergency alerts in real time
- Provide a persistent in-app notification list with unread/read state
- Let users control which notification types they receive
- Respect push permission state on both platforms

---

## Screen A — Web: Bell Icon + Nav Dropdown (State: Unread Notifications)

::: card
[[ :home: Home | :magnifying-glass: Explore | :pencil: Post | :bell: **🔴3** | :user: Profile | [Log Out] ]]

---

::: card
### :bell: Notifications {.dropdown}

---

::: card
:red_circle: **EMERGENCY** · 2m ago
:shield: **Gas leak reported near Finney Ave, Dallas TX**
Tap to view full emergency post →
:::

---

::: card
:speech_balloon: **New Message** · 14m ago
**Rajan Thapa** sent you a message:
*"Hey, is the room still availab..."*
[View Conversation]
:::

---

::: card
:speech_balloon: **Comment** · 1h ago
**Priya Sharma** commented on your post *"2BR room in Queens..."*:
*"Is this still available?"*
[View Post]
:::

---

::: card
:heart: **Likes** · 3h ago
**3 people** liked your post *"Looking for travel buddy..."*
[View Post]
:::

---

::: card
:envelope: **System** · 1d ago
Your account has been verified. You can now post freely.
:::

---

[Mark all as read]  [See all notifications →]*

:::

:::

---

## Screen B — Web: Bell Icon + Nav Dropdown (State: All Read)

::: card
[[ :home: Home | :magnifying-glass: Explore | :pencil: Post | :bell: Notifications | :user: Profile | [Log Out] ]]

---

::: card
### :bell: Notifications

---

*All caught up! No new notifications.*

[See all notifications →]*
:::

:::

---

## Screen C — Web: Full Notifications List Page (`/notifications`)

::: card
[[ :home: Home | :magnifying-glass: Explore | :pencil: Post | :bell: **🔴3** | :user: Profile | [Log Out] ]]

[[ Home > *Notifications* ]]

# :bell: Notifications

[Mark all as read]  [:gear: Preferences]{.outline}

---

**Today**

---

::: alert error
:shield: **Emergency Alert** · Dallas Metro · 2 minutes ago
**Gas leak reported near Finney Ave, Dallas TX**
A community moderator has verified this emergency. Stay safe and follow official guidance.

[View Post →]*
:::

---

::: card
**Unread**

:speech_balloon: **Rajan Thapa** sent you a message · 14 minutes ago
*"Hey, is the room still available? I'm looking to move in next month..."*

[Open Chat]*  [Dismiss]
:::

---

::: card
**Unread**

:speech_balloon: **Priya Sharma** commented on your post · 1 hour ago
*"2BR room in Queens, near subway — $950/mo"*
Comment: *"Is this still available? Can we schedule a visit?"*

[View Post]*  [Dismiss]
:::

---

**Yesterday**

---

::: card
:heart: **3 people** liked your post · 3 hours ago
*"Looking for travel buddy to Nepal — December 2026"*

[View Post]*
:::

---

::: card
:speech_balloon: **Suman KC** commented on your post · 5 hours ago
*"Looking for travel buddy to Nepal — December 2026"*
Comment: *"I'm interested! What dates are you thinking?"*

[View Post]*
:::

---

**Earlier**

---

::: card
:envelope: **System** · 2 days ago
Your account has been verified (Level 1). You now have full posting rights.
:::

---

[Load more notifications]

:::

---

## Screen D — Web: Full Notifications List Page (Empty State)

::: card
[[ :home: Home | :magnifying-glass: Explore | :pencil: Post | :bell: Notifications | :user: Profile | [Log Out] ]]

# :bell: Notifications

---

::: card
:bell:

**No notifications yet**
When someone messages you, comments on your post, or an emergency alert is issued in your area, it will appear here.

[:gear: Manage Preferences]{.outline}
:::

:::

---

## Screen E — Mobile: Notifications Screen (Tab)

[[ :home: Home | :magnifying-glass: Search | :heavy_plus_sign: Post | :bell: **●** Alerts | :user: Profile ]]

---

**Notifications**  [:gear:]{.outline}

---

**Today**

---

::: alert error
:shield: Emergency Alert — Dallas Metro
**Gas leak reported near Finney Ave, Dallas TX**
Verified by community moderator · 2 min ago
[View →]*
:::

---

::: card
**Unread ●**

:speech_balloon: **New Message**
Rajan Thapa · 14 min ago
*"Hey, is the room still availab..."*

[Open]*
:::

---

::: card
**Unread ●**

:speech_balloon: **New Comment**
Priya Sharma commented on your post
*"2BR room in Queens, near subway — $950/mo"*
*"Is this still available?"* · 1 hr ago

[View Post]*
:::

---

**Yesterday**

---

::: card
:heart: **Likes** · 3 hr ago
3 people liked *"Looking for travel buddy to Nepal..."*

[View]*
:::

---

::: card
:speech_balloon: **Comment** · 5 hr ago
Suman KC commented on *"Looking for travel buddy..."*
*"I'm interested! What dates are you thinking?"*

[View]*
:::

---

::: card
:envelope: System · 2 days ago
Your account is now Level 1 Verified. Full posting rights unlocked.
:::

---

[[ :home: Home | :magnifying-glass: Search | :heavy_plus_sign: Post | :bell: **●** Alerts | :user: Profile ]]

---

## Screen F — Mobile: Notifications Screen (Empty State)

[[ :home: Home | :magnifying-glass: Search | :heavy_plus_sign: Post | :bell: Alerts | :user: Profile ]]

---

**Notifications**  [:gear:]{.outline}

---

::: card
:bell:

**All caught up!**

No new notifications. Messages, comments, likes, and local emergency alerts will appear here.

[:gear: Manage Preferences]{.outline}
:::

---

[[ :home: Home | :magnifying-glass: Search | :heavy_plus_sign: Post | :bell: Alerts | :user: Profile ]]

---

## Screen G — Mobile: Push Permission Prompt (First Launch)

::: modal
## :bell: Stay in the Loop

Get notified when someone messages you, comments on your post, or when there's an emergency in your local area.

- [x] Chat messages
- [x] Comments & likes
- [x] Local emergency alerts

[Allow Notifications]*

[Not now]{.outline}
:::

---

## Screen H — Mobile: Push Permission Denied Banner (In-App)

::: alert error
:warning: **Notifications are disabled**
Enable them in Settings → NUSA to receive messages and emergency alerts.

[Open Settings]  [Dismiss]
:::

---

## Screen I — Web: Browser Push Permission Prompt (System)

::: modal
## :bell: Enable Push Notifications

NUSA wants to send you push notifications for:
- Chat messages when the app is closed
- Emergency alerts in your metro area

*(Your browser will ask for permission.)*

[Enable Push]*  [No thanks]{.outline}
:::

---

## Screen J — Notification Preferences (Web — Settings Page Section)

::: card
[[ Home > Settings > *Notifications* ]]

# :gear: Notification Preferences

---

## Push Notifications

::: card
**Push notifications are enabled** :white_check_mark:
You'll receive alerts even when the app is closed.

[Disable push notifications]{variant:danger}
:::

---

## Notification Types

::: card

**Chat Messages**
Get notified when someone sends you a message.
- (*) Every message
- ( ) Batched (every 30 min)
- ( ) Off

---

**Comments**
Get notified when someone comments on your post.
- (*) On
- ( ) Off

---

**Likes**
Get notified when people like your posts.
- ( ) Every like
- (*) When 5+ likes received
- ( ) Off

---

**Emergency Alerts**
Metro-wide alerts verified by community moderators.
*(Cannot be disabled while push is enabled — for your safety)*
- [x] Emergency alerts (required)

:::

---

[:floppy_disk: Save Preferences]*  [Cancel]{.outline}

:::

---

## Screen K — Notification Preferences (Mobile — Settings Screen)

**← Settings**

**Notification Preferences**

---

::: card

**Push Notifications**
Receive alerts when app is in background
- [x] Enabled

*(Tap to open device settings if permissions are denied)*
[Open iOS/Android Settings]{.outline}

:::

---

::: card

**Notification Types**

---

**:speech_balloon: Chat Messages**
New messages from conversations
- (*) Every message
- ( ) Batched (every 30 min)
- ( ) Off

---

**:speech_balloon: Comments**
When someone comments on your post
- (*) On
- ( ) Off

---

**:heart: Likes**
When people like your posts
- ( ) Every like
- (*) When 5+ likes received
- ( ) Off

---

**:shield: Emergency Alerts**
Verified metro-wide emergency broadcasts
*(Required — cannot be disabled)*
- [x] Emergency alerts

:::

---

[Save Preferences]*

---

## Component Specifications

### 1. Bell Icon + Unread Badge (Web Nav)

| Property | Value |
|----------|-------|
| **Icon** | Bell (outline → filled when unread) |
| **Badge** | Red circle, 18px diameter, white text |
| **Badge count** | Shows 1–9, then "9+" |
| **Position** | Top-right corner of bell icon |
| **Click** | Toggle dropdown open/close |
| **Dropdown width** | 360px |
| **Dropdown max-height** | 480px, scrollable |

**States:**
- No unread: Outline bell, no badge
- 1–9 unread: Filled bell, red badge with count
- 9+ unread: Filled bell, red "9+" badge

---

### 2. Bell Tab Icon + Unread Dot (Mobile Tab Bar)

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | SF Symbol bell | Material Icons notifications |
| **Unread dot** | Red circle 8px, top-right of icon | Same |
| **Tab label** | "Alerts" | "Alerts" |
| **Tab active color** | #1565C0 | #1565C0 |

---

### 3. Notification List Item (Both Platforms)

| Property | Web | Mobile |
|----------|-----|--------|
| **Height** | Auto (min 72px) | Auto (min 72dp) |
| **Unread background** | #F0F4FF (light blue tint) | #F0F4FF |
| **Read background** | #FFFFFF | #FFFFFF |
| **Unread indicator** | Blue left border (4px) | Blue dot (8px) left |
| **Avatar/Icon** | 40px circle or emoji icon | 40dp circle or emoji |
| **Title font** | 14px Semibold | 15sp Medium |
| **Body font** | 14px Regular, max 2 lines | 14sp Regular, max 2 lines |
| **Timestamp** | 12px, #757575 | 12sp, #757575 |
| **Tap action** | Navigate to source content | Navigate to source content |
| **Swipe/dismiss** | — (web: Dismiss button) | Swipe left → dismiss |

---

### 4. Emergency Alert Item

| Property | Value |
|----------|-------|
| **Background** | #FFEBEE (light red) |
| **Left border** | 4px #DC143C (accent red) |
| **Icon** | :shield: |
| **Title** | Bold, #C62828 |
| **Priority** | Always first in list, above "Today" group |

---

### 5. Notification Type Icons

| Type | Icon | Color |
|------|------|-------|
| Chat message | :speech_balloon: | #1565C0 |
| Comment | :speech_balloon: | #1565C0 |
| Like | :heart: | #DC143C |
| Emergency | :shield: | #DC143C |
| System | :envelope: | #757575 |

---

### 6. Web Dropdown Notification Row

| Property | Value |
|----------|-------|
| **Padding** | 12px horizontal, 10px vertical |
| **Separator** | 1px #EEEEEE |
| **Hover state** | #F5F5F5 background |
| **Max lines body** | 2 lines, ellipsis |
| **Footer row** | "Mark all as read" (left) + "See all →" button (right) |

---

## Spacing & Layout (Mobile Notification Screen)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Status bar (safe area) | 44pt | — |
| 2 | Screen title "Notifications" | 28pt | 8pt |
| 3 | Section header ("Today") | 16pt | 8pt |
| 4 | Emergency alert card | Auto | 8pt |
| 5 | Notification list item | Min 72dp | 8pt |
| 6 | Section header ("Yesterday") | 16pt | 8pt |
| 7 | Notification list items | Min 72dp each | 8pt |
| 8 | Bottom tab bar | 83pt (safe area) | — |

---

## User Interactions

### Primary Flow — Receiving a Chat Notification (Mobile Push)
1. User is in background or device locked
2. Expo Push sends notification via APNs/FCM
3. System shows banner: "Rajan Thapa: Hey, is the room still availab..."
4. User taps → app opens → navigates directly to MessageThreadScreen with Rajan
5. Notification marked as read automatically

### Primary Flow — Receiving a Chat Notification (Web Push)
1. User has browser open (different tab or minimized)
2. Service worker receives push event via Web Push API
3. Browser shows OS notification: "NUSA — Rajan Thapa: Hey, is the room..."
4. User clicks → browser focuses NUSA tab → navigates to `/messages/:conversationId`
5. Notification marked as read

### Primary Flow — In-App Bell Dropdown (Web)
1. User clicks bell icon in nav
2. Dropdown opens with last 8 notifications, sorted newest first
3. Unread items shown with blue left border + unread background
4. User clicks a notification → navigates to source content → dropdown closes
5. Notification marked as read
6. "Mark all as read" → all items turn read state
7. "See all notifications →" → navigates to `/notifications` full page

### Primary Flow — Viewing Notifications List (Mobile)
1. User taps "Alerts" tab in bottom tab bar
2. Notifications list loads, grouped by day
3. Emergency alerts pinned at top
4. Unread items shown with blue dot + tinted background
5. User taps item → navigates to source (chat, post, etc.)
6. Notification auto-marked as read on tap
7. Swipe left on item → "Dismiss" red button → removes from list

### Primary Flow — Enabling Push (Mobile First Launch)
1. User opens app for first time (or after sign-in)
2. System modal shown: "Stay in the Loop"
3. User taps "Allow Notifications" → OS permission dialog (iOS/Android) shown
4. On allow: device token registered in `device_tokens` table, linked to user
5. On deny: banner shown in-app for next 3 sessions offering to re-enable

### Primary Flow — Enabling Browser Push (Web)
1. User signs in to web app
2. After 30s delay, soft prompt shown: "Enable Push Notifications"
3. User clicks "Enable Push" → browser permission dialog
4. On allow: service worker subscribes, push subscription stored server-side
5. On deny: no repeat prompt for 7 days

### Alternative Flows
- **Chat active (mobile):** Supabase Realtime delivers message in-app; push NOT sent if user is currently viewing that conversation (suppress logic)
- **Emergency alert:** Always delivered via push regardless of preferences, shown first in list with red styling
- **Preferences change:** User disables "Likes" → no new like notifications from that point, existing ones remain in list

---

## Platform-Specific Differences

| Aspect | Web | Mobile |
|--------|-----|--------|
| **Push delivery** | Web Push API + Service Worker | Expo Push (APNs + FCM) |
| **Dismiss gesture** | Dismiss button | Swipe left |
| **Badge count** | Bell icon badge in nav | Native app badge on app icon |
| **Permission prompt** | In-app soft prompt → browser dialog | In-app modal → OS dialog |
| **Notification entry** | Bell icon in nav bar | "Alerts" tab in bottom tab bar |
| **Full list route** | `/notifications` page | Dedicated tab screen |

---

## Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Push permission denied | In-app banner with "Open Settings" link |
| Push token expired | Silent re-registration on next app open |
| User views active conversation | Do NOT send push for new messages in that thread |
| Emergency alert | Always delivered regardless of preferences |
| Notification for deleted post | Show "This post has been removed" on tap |
| Notification for deleted message | Show "Message deleted" in chat thread |
| No internet (mobile) | Cached list shown, "Offline — notifications may be delayed" banner |
| Backend error loading list | "Couldn't load notifications. Try again." with retry button |
| 9+ unread | Badge shows "9+" cap |

---

## Accessibility

### Screen Reader Order (Mobile Notifications Screen)
1. Screen title: "Notifications"
2. Settings gear button: "Notification preferences"
3. Section header: "Today"
4. Each notification: type + sender + preview + time ago + read/unread status

### Touch Targets
- All notification items: min 44×44pt (iOS) / 48×48dp (Android)
- Bell icon: min 44×44pt tap target with padding
- Dismiss / action buttons: min 44×44pt

### Color Contrast (WCAG AA)
| Element | Ratio | Level |
|---------|-------|-------|
| Title text on white | 7:1 | AAA ✓ |
| Body text on white | 5.2:1 | AA ✓ |
| Body text on #F0F4FF | 4.8:1 | AA ✓ |
| Emergency text on #FFEBEE | 6.2:1 | AA ✓ |
| Timestamp (#757575) on white | 4.6:1 | AA ✓ |

### Additional A11y
- Badge count announced by screen reader: "3 unread notifications"
- Unread items: accessibility label includes "Unread" prefix
- Emergency items: announced with "Emergency alert" prefix

---

## Animations & Transitions

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Web dropdown open | 0ms | 150ms | Fade in + slide down 8px |
| 2 | Web dropdown close | 0ms | 100ms | Fade out |
| 3 | Mark as read | 0ms | 300ms | Background color transition to white |
| 4 | Dismiss item (mobile) | 0ms | 250ms | Slide left + fade out, list collapses |
| 5 | New notification arrives (realtime) | 0ms | 200ms | Slide in from top of list |
| 6 | Badge count update | 0ms | 200ms | Bounce scale animation on badge |

---

## Technical Notes

### Routes & Identifiers

| Platform | Route / Screen |
|----------|---------------|
| Web list page | `/notifications` |
| Web preferences | `/settings/notifications` |
| Mobile screen | `NotificationsScreen` (tab) |
| Mobile preferences | `NotificationPreferencesScreen` (from Settings) |

### Data Requirements

**Supabase `notifications` table** (already exists in `001_schema.sql`):
```
id, user_id, type (message|post_response|emergency_alert|system),
title, body, data (JSONB), read, read_at, sent_at
```

**New table needed — `device_tokens`** (to be added to `001_schema.sql`):
```
id, user_id, token (TEXT), platform (expo|web_push),
endpoint (TEXT, for web push), p256dh (TEXT), auth_key (TEXT),
created_at, last_used_at
```

**Notification triggers (Supabase Edge Functions or DB triggers):**
- New message inserted in `messages` → insert into `notifications` → push delivery
- New comment inserted in `comments` → insert into `notifications` → push delivery
- New like inserted in `likes` → batch/check threshold → insert into `notifications`
- Emergency post verified → insert into `notifications` for all metro users → push delivery

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry (Web) | Click bell icon | Dropdown appears |
| Entry (Web) | Click "See all" | `/notifications` |
| Entry (Mobile) | Tap "Alerts" tab | NotificationsScreen |
| Exit — Chat | Tap message notification | MessageThreadScreen |
| Exit — Post | Tap comment/like notification | PostDetailScreen |
| Exit — Emergency | Tap emergency notification | PostDetailScreen (emergency post) |
| Exit — Preferences | Tap gear icon | NotificationPreferencesScreen / `/settings/notifications` |

### Push Delivery Architecture

**Mobile (Expo Push):**
1. App registers with Expo → gets `ExponentPushToken[xxx]`
2. Token stored in `device_tokens` table
3. Edge Function sends via `https://exp.host/--/api/v2/push/send`
4. Handles APNs (iOS) + FCM (Android) transparently

**Web (Web Push API):**
1. Service worker subscribes → gets `PushSubscription` (endpoint + keys)
2. Subscription stored in `device_tokens` (endpoint, p256dh, auth columns)
3. Edge Function sends VAPID-signed push to browser endpoint
4. Service worker `push` event handler shows notification

---

## Testing Checklist

### Functional Tests
- [ ] Unread badge count increments on new notification (web + mobile)
- [ ] Badge resets to 0 when all notifications marked as read
- [ ] Tapping notification navigates to correct screen
- [ ] Push not sent when user is actively viewing that conversation
- [ ] Emergency notifications always delivered (ignores mute prefs)
- [ ] "Mark all as read" marks all items as read
- [ ] Dismissing an item removes it from the list
- [ ] Preferences save correctly and new notifications respect them
- [ ] Realtime: new notification appears at top of list without page refresh
- [ ] Device token registered on first push permission grant
- [ ] Device token cleaned up / refreshed on token expiry

### Visual Tests
- [ ] Unread items show blue left border and tinted background
- [ ] Emergency items show red styling and always appear first
- [ ] Badge shows "9+" when more than 9 unread
- [ ] Web dropdown truncates body to 2 lines
- [ ] Empty state shown when no notifications
- [ ] Section grouping (Today / Yesterday / Earlier) correct

### Accessibility Tests
- [ ] Badge count announced as "X unread notifications"
- [ ] Screen reader reads notification type + sender + preview + time
- [ ] All tap targets meet 44×44pt (iOS) / 48×48dp (Android)
- [ ] Color contrast AA compliant for all text elements
- [ ] Emergency items announced with "Emergency alert" prefix

### Edge Case Tests
- [ ] Notification for deleted post shows graceful message
- [ ] 0 notifications shows empty state (not blank screen)
- [ ] Offline state shows cached list with offline banner
- [ ] Push permission denied shows in-app prompt to open settings
- [ ] Web push subscription updates if browser endpoint changes

---

## Open Questions

- [ ] Should likes batch into a single notification ("5 people liked your post") or show individually? → **Rec:** Batch when 5+ within 1 hour window
- [ ] Should there be a "Clear all" / delete-all option or just dismiss-per-item? → **Rec:** Start with dismiss-per-item only; clear-all in a later iteration
- [ ] Emergency notifications: Should web also show a persistent banner on the home feed (not just push)? → **Rec:** Yes, banner on HomeScreen too (Phase 2 Red Alert)
- [ ] Web push: Should service worker prompt appear on every sign-in or only the first? → **Rec:** First sign-in only, with 7-day cooldown on dismiss

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Entry (chat notification) | [07 Conversation List](../07-conversation-list/07-conversation-list.md) |
| Entry (post notification) | [09 Post Detail](../09-post-detail/09-post-detail.md) |
| Settings entry | Profile / Settings screen |
| Phase 2 dependency | Red Alert emergency broadcast system |

---

**Status:** Draft — Ready for Review
