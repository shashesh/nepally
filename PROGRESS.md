# NUSA Development Progress

**Last Updated:** 2026-03-10

---

## Recent Updates (2026-03-10)

### Events Feature (Web + Mobile)

| Task | Status | Notes |
|------|--------|-------|
| Events DB migration (006_events.sql) | Done | `events` + `event_rsvps` tables, enums, RLS policies |
| Events shared types | Done | `Event`, `EventRSVP`, `EventType`, `EventStatus` in `packages/shared/src/types/events.ts` |
| Events shared API | Done | `getEvents`, `getEventById`, `createEvent`, `updateEvent`, `cancelEvent`, `rsvpToEvent`, `unrsvpFromEvent`, `getEventAttendees` |
| Events constants | Done | `EVENT_TYPES`, `EVENT_STATUSES` in `packages/shared/src/constants/events.ts` |
| EventsScreen (mobile) | Done | Chronological feed with type filter chips |
| CreateEventScreen (mobile) | Done | Title, type, date/time, location, description; edit mode |
| EventDetailScreen (mobile) | Done | Full event info, RSVP button, attendee list, organizer controls |
| Events feed (web) | Done | `/events` with type filter chips |
| Create/edit event (web) | Done | `/events/create?edit=<eventId>` |
| Event detail (web) | Done | `/events/[id]` with RSVP, attendees |
| RSVP toggle (mobile + web) | Done | Toggle with optimistic update, organizer-controlled privacy |
| Attendee list privacy | Done | Public attendee list or count-only (organizer setting) |
| Organizer controls | Done | Edit, cancel, delete (organizer only) |
| Events tab in nav (mobile) | Done | 5th tab (replaced Marketplace stub) |
| Events in web nav | Done | Sidebar link |
| Unit tests | Done | All screens + API functions covered |

### Public Profile View (2026-03-04)

| Task | Status | Notes |
|------|--------|-------|
| `formatPublicName()` utility | Done | Formats "Firstname L." — in `packages/shared/src/utils/user.ts`, exported from shared index |
| Mobile `PublicProfileScreen` | Done | Masked name, trust badge, metro city/state, member since, post count, posts list, Message button |
| Web `/users/[id]` page | Done | Matching layout to mobile |
| Own-post avatar tap redirect | Done | Tapping own avatar redirects to own Profile tab instead of PublicProfile |
| Avatar taps wired in HomeScreen | Done | Mobile + web feed post cards |
| Avatar taps wired in PostDetailScreen | Done | Mobile + web post detail |
| No DB changes required | Done | Reuses existing `getUserById()` and `getPostsByAuthorId()` |
| Unit tests | Done | `PublicProfileScreen.test.tsx`, `users/[id].test.tsx` |

### Post Interactions: Likes & Comments (2026-03-10)

| Task | Status | Notes |
|------|--------|-------|
| Enhanced PostCard UI | Done | Author avatar, description preview, social action bar |
| Avatar component (mobile) | Done | Photo or initials, trust-level colored background, multiple sizes |
| Avatar component (web) | Done | `Avatar.tsx` with CSS Module, reused across feed/chat/profile |
| `post_likes` table | Done | In `001_schema.sql` — individual like tracking, unique per user per post |
| `post_comments` table | Done | In `001_schema.sql` — public comment threads |
| `likes_count`, `comments_count` columns | Done | Cached counters on `posts` table |
| DB triggers for counters | Done | Auto-increment/decrement on like/comment insert/delete |
| Like button (mobile + web) | Done | Heart icon, optimistic toggle, shows count |
| Comment list component | Done | Comments with avatars, timestamps, delete own |
| Comment input component | Done | Multi-line, 1000 char limit, send button |
| Likes API | Done | `likePost`, `unlikePost`, `getUserLikes` in `packages/shared/src/api/interactions.ts` |
| Comments API | Done | `getComments`, `createComment`, `deleteComment` in `packages/shared/src/api/interactions.ts` |
| RLS policies (post_likes) | Done | In `001_schema.sql` |
| RLS policies (post_comments) | Done | In `001_schema.sql` |
| Level 0 disabled states | Done | Like/comment buttons show verification prompts for Level 0 |
| Unit tests | Done | Shared API tests + component tests on both platforms |

### Post Photos (2026-03-10)

| Task | Status | Notes |
|------|--------|-------|
| Image picker (mobile) | Done | `expo-image-picker`, camera + library, iOS/Android permissions |
| Image picker (web) | Done | File input `accept="image/*"`, drag-and-drop support |
| Supabase Storage upload | Done | `uploadPostPhoto(...)` in `packages/shared/src/api/storage.ts` |
| Photo compression/resize | Done | 2MB max per photo, 1200px width resize |
| Max 3 photos per post | Done | Upload blocked after 3 photos |
| Photos in create flow | Done | Thumbnail tray in `CreatePostScreen` (mobile + web) |
| Photos in edit flow | Done | Existing URLs preloaded; can remove, add, reorder |
| Explicit reorder controls | Done | `←/→` thumbnail controls (mobile + web) |
| Drag-and-drop reorder (web) | Done | Web thumbnails support drag/drop with visual target state |
| `updatePost` photo persistence | Done | Accepts ordered `photos[]`, removes orphaned Storage files |
| Unit tests | Done | Upload flow, edit flow covered |

### Chat Sender Avatars & Avatar Menus (2026-03-10)

| Task | Status | Notes |
|------|--------|-------|
| Chat conversation list avatars | Done | Avatar component in `ConversationItem` |
| Chat message thread avatars | Done | Messenger-style (left-aligned received, no avatar on sent) |
| Avatar menus (mobile) | Done | Tap avatar in feed/chat/detail → navigate to PublicProfile (or own Profile) |
| Avatar menus (web) | Done | Click avatar → navigate to `/users/[id]` (or own profile) |

### Save Posts / Bookmarks (2026-03-10)

| Task | Status | Notes |
|------|--------|-------|
| `user_saved_posts` table | Done | `005_add_saved_posts.sql` migration |
| Save/unsave API | Done | Reuses `post_likes` for bookmarks via `getSavedPostsByUserId` |
| Save button on post cards | Done | Bookmark icon, toggled state |
| Saved Posts tab (profile) | Done | Mobile + web profile screen, shared API |
| Unit tests | Done | Covered by profile tab + API tests |

### Notifications UI Scaffold (2026-03-10)

| Task | Status | Notes |
|------|--------|-------|
| Notification preferences screen (mobile) | Done | Onboarding step + settings accessible from profile |
| Notification preferences screen (web) | Done | `/profile/notifications` |
| Notifications feed screen (mobile) | Done | List UI with empty state |
| Notifications feed screen (web) | Done | `/notifications` with preferences panel |
| `device_tokens` API | Done | `registerDeviceToken(...)` in `packages/shared/src/api/deviceTokens.ts` |
| Notifications shared API (skeleton) | In progress | `getNotifications`, `subscribeToNotifications` — not fully wired |
| DB migration for notifications table | Not started | See `docs/implementation-plans/notifications-feature.md` |
| Push delivery edge function | Not started | Supabase Edge Function for Expo push delivery |

---

## Phase 1: Utility Core & Trust Foundation

### A. Identity & Account Levels

| Task | Status | Notes |
|------|--------|-------|
| Email signup/login | Done | `EmailSignupScreen` with signup/login toggle |
| Supabase Auth integration | Done | Session persistence via AsyncStorage |
| AuthContext (session, refresh, signOut) | Done | Listens to auth state changes, pause/resume support, cold-start init |
| Password validation | Done | Uses `APP_CONFIG.minPasswordLength` (8 chars) |
| Google OAuth signup | Stub | Shows "Coming soon" alert, button dimmed |
| Phone SMS signup | Stub | Shows "Coming soon" alert, button dimmed |
| Change password | Done | Verify current → update → navigate back with alert |
| Trust Level 0 → 1 progression (phone verify) | Not started | |
| Trust Level 1 → 2 progression | Not started | |

### B. Onboarding Flow

| Task | Status | Notes |
|------|--------|-------|
| WelcomeScreen | Done | Sign Up + Log In buttons |
| SignupMethodScreen | Done | Google, Phone, Email options |
| EmailSignupScreen | Done | Full name, email, password, confirm |
| ZipCodeEntryScreen | Done | ZIP input with metro lookup |
| MetroConfirmationScreen | Done | Shows matched metro, confirm/change |
| TutorialScreen | Done | Onboarding tutorial cards |
| LocationPermissionScreen | Done | Location permission prompt |
| NotificationPreferencesScreen | Done | Notification opt-in (onboarding step) |
| Onboarding completion persistence | Done | AsyncStorage flag |
| Web onboarding (ZIP entry) | Done | `/onboarding/zip` |

### C. Database & Backend

| Task | Status | Notes |
|------|--------|-------|
| `001_schema.sql` — initial schema | Done | All tables, RLS, triggers, indexes — **FROZEN, do not modify** |
| `002_seed_data.sql` — initial seed | Done | Metro areas, tags — **FROZEN** |
| `003_storage.sql` — storage buckets | Done | `post-photos`, `avatars` buckets — **FROZEN** |
| `004_consolidated_chat_and_fixes.sql` | Done | Chat RLS policies, `blocked_users` table, message send policy |
| `005_add_saved_posts.sql` | Done | `user_saved_posts` table |
| `006_events.sql` | Done | `events`, `event_rsvps`, enums, RLS |
| Metro areas + ZIP codes tables | Done | Static data seeded |
| Supabase Edge Function (get-metro-by-zip) | Done | Deployed |
| RLS policies (all main tables) | Done | Covered in migration files |

### D. Home Feed

| Task | Status | Notes |
|------|--------|-------|
| HomeScreen layout | Done | Header with metro name, tag filter bar, post list, FAB |
| Tag filter chips | Done | All, Housing, Jobs, Help, Question, Politics, Discussion, Emergency |
| PostCard component | Done | Author avatar, tag pills, Local/Global badge, description preview, action bar |
| Level0Banner | Done | Verify prompt for Trust Level 0 users |
| Posts service (`getPostsByMetro`) | Done | Tag filtering, local + global posts mixed |
| Posts service (`createPost`) | Done | Title, body, tags, photos, global toggle |
| Pull-to-refresh | Done | `RefreshControl` wired |
| Empty state | Done | "No posts yet" with icon |
| Metro area name in header | Done | Loads from cache with Supabase fallback |
| Location switcher (web) | Done | Premium multi-location dropdown in header |

### E. Post Creation (Tag-Based)

| Task | Status | Notes |
|------|--------|-------|
| CreatePostScreen (mobile) | Done | Title, body, 1-3 tags (chip selector), photos (up to 3), global toggle (premium) |
| Create post page (web) | Done | `/posts/create` — same fields |
| Edit mode (mobile) | Done | Prefill title/body/tags/photos; save calls `updatePost(...)` |
| Edit mode (web) | Done | `/posts/create?edit=<postId>` |
| Tag selection chip UI | Done | Pill buttons, 1-3 selectable, visual selection state |
| Global toggle (premium gate) | Done | Toggle visible only to premium users |
| Emergency tag moderation note | Done | Disclaimer shown before submit; post created as `status = 'pending'` |
| Form validation | Done | Title (5-200 chars), body (10-5000 chars), 1-3 tags required |
| `createPost` shared API | Done | `packages/shared/src/api/posts.ts` |
| `updatePost` shared API | Done | Accepts title, body, tags, photos, global toggle |
| Post owner actions (mobile + web) | Done | Edit Post, Delete Post, Share Post on feed card + detail |
| Unit tests | Done | Create/edit flows covered |

### F. Shared Components & Design System

| Task | Status | Notes |
|------|--------|-------|
| Colors (`colors.ts`) | Done | Full palette |
| Typography (`typography.ts`) | Done | h1-h3, body, caption, button |
| Spacing (`spacing.ts`) | Done | Spacing scale, heights, borderRadius, shadows |
| PrimaryButton | Done | Loading state |
| SecondaryButton | Done | |
| TextButton | Done | |
| ZipCodeInput | Done | 5-digit validation |
| TextInput (generic) | Done | |
| TrustBadge | Done | |
| StatusBadge | Done | |
| PostCard | Done | Avatar, tag pills, badges, action bar |
| Avatar (mobile) | Done | Photo or initials, trust-level color, multiple sizes |
| Avatar (web) | Done | `Avatar.tsx` + `Avatar.module.css` |
| Level0Banner | Done | |
| TutorialCard | Done | |
| TagFilterBar (mobile) | Done | Horizontal scrollable filter chips |
| TagFilterBar (web) | Done | `TagFilterBar.tsx` + `TagFilterBar.module.css` |
| EventCard (web) | Done | Event listing card |
| EventTypeBadge (web) | Done | |
| RsvpButton (web) | Done | Toggle with optimistic update |
| AttendeeList (web) | Done | Organizer privacy control |
| LocationSwitcher (web) | Done | Premium multi-location dropdown |
| Layout (web) | Done | Sidebar nav, top nav, content wrapper |

### G. User Profile & Account Management

| Task | Status | Notes |
|------|--------|-------|
| ProfileScreen (mobile) | Done | Reddit-style tabs (Posts, Saved Posts, About) + top-right hamburger menu |
| ProfileScreen (web) | Done | Matching layout with tabs |
| EditProfileScreen | Done | Edit name, phone, ZIP with auto metro lookup |
| ChangePasswordScreen | Done | Current password verify, new + confirm, eye toggles |
| ProfileNavigator | Done | ProfileView → EditProfile / ChangePassword stack |
| Log out with confirmation | Done | Alert confirmation → signOut → back to Welcome |
| Profile posts tab data | Done | Shared API `getPostsByAuthorId(...)` |
| Saved posts tab data | Done | Shared API `getSavedPostsByUserId(...)` |
| Location management screen | Done | `ManageLocationsScreen` — view/delete saved locations |
| Add location screen | Done | `AddLocationScreen` — ZIP entry, metro lookup, label |
| Notification preferences (profile) | Done | Accessible from profile hamburger menu |

### H. Navigation

| Task | Status | Notes |
|------|--------|-------|
| RootNavigator | Done | Onboarding ↔ Main switch |
| OnboardingNavigator | Done | All onboarding screens |
| MainTabNavigator | Done | 5 tabs (Home, Events, Post, Messages, Profile) |
| PostNavigator | Done | CreatePost (tag-based, single screen) |
| ProfileNavigator | Done | ProfileView → EditProfile / ChangePassword / Locations stack |
| HomeNavigator | Done | HomeMain → PostDetail stack |
| ChatNavigator | Done | ConversationList → MessageThread stack |
| EventsNavigator | Done | EventsList → EventDetail → CreateEvent stack |
| Search tab screen | Stub | `ComingSoonScreen` placeholder |
| Messages tab screen | Done | Full `ChatNavigator` |

### I. In-App Chat

| Task | Status | Notes |
|------|--------|-------|
| `blocked_users` table | Done | `004_consolidated_chat_and_fixes.sql` |
| Conversations API | Done | `getConversations`, `getOrCreateConversation`, `blockUser`, `isBlocked` |
| Messages API | Done | `getMessages`, `sendMessage`, `markAsRead`, `subscribeToMessages`, `getTotalUnreadCount` |
| `ConversationItem` component | Done | Avatar, name, post context, last message, timestamp, unread badge |
| `MessageBubble` component | Done | Sent/received styling, read receipts (check marks) |
| `ChatInput` component | Done | Multi-line, 1000 char limit, send button |
| ConversationListScreen | Done | FlatList, pull-to-refresh, empty state with "Browse Posts" CTA |
| MessageThreadScreen | Done | Realtime subscription, optimistic send, date separators, kebab menu |
| PostDetailScreen | Done | Full post details, field rows, author info, "Contact Author" CTA |
| PostCard message icon | Done | `chatbubble-outline` icon, hidden on own posts |
| Read receipts | Done | Mark read on open; single/double check display |
| Block user | Done | Kebab menu → confirmation → block → navigate back |
| Unread badge on Messages tab | Done | Polls every 30s, shows count on tab icon |
| Sender avatars (Messenger-style) | Done | Left-aligned received messages show sender avatar |
| Chat web (`/messages`) | Done | Conversation list + message thread pages |
| Chat RLS policies | **DISABLED** | See Security TODO below |

### J. Post Photo Upload

| Task | Status | Notes |
|------|--------|-------|
| Image picker (mobile) | Done | `expo-image-picker`, camera + library, permissions handled |
| Image picker (web) | Done | `<input type="file" accept="image/*">`, drag-and-drop |
| Supabase Storage upload | Done | `uploadPostPhoto(...)` in shared storage API |
| Photo compression/resize | Done | 2MB max per photo, 1200px width |
| Max 3 photos per post | Done | Upload blocked at limit |
| Thumbnail tray (mobile + web) | Done | Visual tray with remove button |
| Explicit reorder controls | Done | `←/→` thumbnail controls (mobile + web) |
| Drag-and-drop reorder (web) | Done | Visual drop target state |
| Edit mode: keep existing photos | Done | Existing URLs preloaded |
| Edit mode: remove existing photos | Done | Orphaned Storage files cleaned up |
| Edit mode: add new photos | Done | Upload pipeline reused in edit flow |
| `updatePost` photo persistence | Done | Saves ordered `photos[]` array |

### K. Post Interactions (Likes & Comments)

| Task | Status | Notes |
|------|--------|-------|
| Enhanced PostCard UI | Done | Author avatar, description preview, like/comment/message action bar |
| `post_likes` table | Done | In `001_schema.sql` — unique per user per post |
| `post_comments` table | Done | In `001_schema.sql` — public comment threads |
| `likes_count`, `comments_count` columns | Done | Cached counters on `posts` table |
| DB triggers for counters | Done | Auto-increment/decrement on insert/delete |
| Like button (mobile + web) | Done | Heart icon, optimistic toggle, count display |
| Comment list component | Done | Avatars, timestamps, delete own comment |
| Comment input component | Done | Multi-line, 1000 char limit, send button |
| Likes API (`likePost`, `unlikePost`, `getUserLikes`) | Done | `packages/shared/src/api/interactions.ts` |
| Comments API (`getComments`, `createComment`, `deleteComment`) | Done | `packages/shared/src/api/interactions.ts` |
| RLS policies (`post_likes`) | Done | In `001_schema.sql` |
| RLS policies (`post_comments`) | Done | In `001_schema.sql` |
| Level 0 disabled states | Done | Verification prompt shown on like/comment attempt |

### L. Profile Photo Upload

| Task | Status | Notes |
|------|--------|-------|
| Avatar component (mobile) | Done | Photo or initials, trust-level colors, multiple sizes; shown in feed, chat, profile, comments |
| Avatar component (web) | Done | `Avatar.tsx` + `Avatar.module.css` |
| `uploadProfilePhoto(...)` shared API | Done | `packages/shared/src/api/storage.ts` — ready but not wired to a picker UI |
| Photo picker (camera/library) | Not started | iOS/Android permissions, UI not built |
| Image cropping UI | Not started | Square crop, zoom/pan |
| Profile photo display + "Change Photo" button | Not started | `EditProfileScreen` has no picker yet |
| Remove photo option | Not started | Delete from Storage, set field to null |

### M. Reporting System

| Task | Status | Notes |
|------|--------|-------|
| Report button on posts | Not started | |
| Report categories UI | Not started | Spam, Scam, Inappropriate Content, Harassment |
| Shared API for reports | Not started | |
| Auto-hide threshold (3+ reports) | Not started | |
| Moderator queue | Not started | |

### N. Events

| Task | Status | Notes |
|------|--------|-------|
| `events` + `event_rsvps` tables | Done | `006_events.sql` — RLS, indexes, enums |
| Shared types (`Event`, `EventRSVP`) | Done | `packages/shared/src/types/events.ts` |
| Shared API (full CRUD + RSVP) | Done | `packages/shared/src/api/events.ts` |
| EventsScreen (mobile) | Done | Chronological feed with type filter chips |
| CreateEventScreen (mobile) | Done | Title, type, date/time, location, description; edit mode |
| EventDetailScreen (mobile) | Done | Full event info, RSVP, attendees, organizer controls |
| Events feed (web `/events`) | Done | Type filter chips |
| Create/edit event (web) | Done | `/events/create?edit=<eventId>` |
| Event detail (web `/events/[id]`) | Done | RSVP, attendees, organizer controls |
| RSVP toggle (mobile + web) | Done | Optimistic update |
| Attendee list privacy | Done | Public list or count-only — organizer setting |
| Organizer controls | Done | Edit, cancel, delete |
| Push notification reminders | Not started | Deferred — depends on full notifications infrastructure |
| Events on public profile | Not started | Not yet surfaced on `/users/[id]` |

### O. Save Posts (Bookmarks)

| Task | Status | Notes |
|------|--------|-------|
| `user_saved_posts` table | Done | `005_add_saved_posts.sql` |
| Save/unsave API | Done | Backed by like mechanism, surfaced via `getSavedPostsByUserId` |
| Save button on post cards (mobile + web) | Done | Bookmark icon, toggled state |
| Saved Posts tab (profile, mobile + web) | Done | Fetches via shared API |

### P. Public Profile View

| Task | Status | Notes |
|------|--------|-------|
| `formatPublicName()` utility | Done | "Firstname L." — in shared utils, exported from index |
| Mobile `PublicProfileScreen` | Done | Masked name, trust badge, metro, member since, post list, Message button |
| Web `/users/[id]` page | Done | Matching layout |
| Avatar taps → public profile (feed + detail) | Done | Mobile + web |
| Own-avatar tap redirect | Done | Goes to own Profile tab, not PublicProfile |

### Q. Notifications

| Task | Status | Notes |
|------|--------|-------|
| Notification preferences screen (mobile) | Done | Onboarding step + profile settings |
| Notification preferences screen (web) | Done | `/profile/notifications` |
| Notifications feed screen (mobile) | Done | UI with empty state |
| Notifications feed screen (web) | Done | `/notifications` |
| Device token registration API | Done | `registerDeviceToken(...)` in shared API |
| Notifications shared API | In progress | Skeleton exists; not fully wired |
| Notifications DB migration | Not started | |
| Push delivery edge function | Not started | Expo push delivery via Supabase Edge Function |
| In-app notification delivery | Not started | |

### R. Admin Dashboard

| Task | Status | Notes |
|------|--------|-------|
| Flagged content queue | Not started | |
| Trust level management | Not started | |
| Ban/unban users | Not started | |
| Platform statistics view | Not started | |
| Moderator access control (email whitelist) | Not started | |

---

## Phase 2: Community Safety & Growth

| Task | Status |
|------|--------|
| Two-Step Red Alert System | Not started |
| Peer vs. Business Profiles | Not started |
| Hyper-Local Filtering (mile radius) | Not started |

## Phase 3: Sustainability & Ecosystem

| Task | Status |
|------|--------|
| Self-Service Ad Portal | Not started |
| AI Moderation | Not started |
| Billing Integration (Stripe/IAP) | Not started |
| Resource Wiki | Not started |

---

## TODO: Security Vulnerabilities

> These must be resolved before any production/beta release.

| Issue | Tables Affected | Details | Priority |
|-------|----------------|---------|----------|
| **Chat RLS disabled** | `conversations`, `messages`, `conversation_participants` | RLS was disabled during development because policies were not being enforced. Policies exist in migration files but are not active. **Any authenticated user can currently read/write all chat data.** | Critical |
| **blocked_users RLS** | `blocked_users` | RLS is enabled and policies are defined in `001_schema.sql`, but not tested end-to-end. Verify after fixing chat RLS. | High |

**To re-enable chat RLS:**
1. `ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;`
2. `ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`
3. `ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;`
4. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'messages', 'conversation_participants');`
5. If policies were dropped, re-run the relevant RLS sections from `001_schema.sql`
6. Run `NOTIFY pgrst, 'reload schema';` and test
7. If still failing, investigate Supabase project-level RLS settings or recreate policies via Dashboard UI
