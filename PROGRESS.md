# NUSA Development Progress

**Last Updated:** 2026-02-15

---

## Phase 1: Utility Core & Trust Foundation

### A. Identity & Account Levels

| Task | Status | Notes |
|------|--------|-------|
| Email signup/login | Done | EmailSignupScreen with signup/login toggle |
| Supabase Auth integration | Done | Session persistence via AsyncStorage |
| AuthContext (session, refresh, signOut) | Done | Listens to auth state changes, pause/resume support |
| Password validation | Done | Uses APP_CONFIG.minPasswordLength (8 chars) |
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
| Onboarding completion persistence | Done | AsyncStorage flag |

### C. Database & Backend

| Task | Status | Notes |
|------|--------|-------|
| Schema migration (001_schema.sql) | Done | All tables, indexes, RLS, triggers (consolidated from 7 files) |
| `full_name` column fix | Done | Was `name`, fixed to match app code |
| Teardown block for re-runnable migrations | Done | DROP IF EXISTS at top |
| Metro areas + ZIP codes tables | Done | Static data, user must seed manually |
| Supabase Edge Function (get-metro-by-zip) | Done | |
| RLS policies | Done | All tables covered |

### D. Home Feed

| Task | Status | Notes |
|------|--------|-------|
| HomeScreen layout | Done | Header, category tabs, post list, FAB |
| Category filter tabs | Done | All, Housing, Jobs, Emergency, Travel |
| PostCard component | Done | Category icon, title, metadata, timestamp |
| Level0Banner | Done | Verify prompt for trust level 0 users |
| Posts service (getPostsByMetroArea) | Done | Fixed column names to match DB schema |
| Posts service (createPost) | Done | Includes all required DB columns |
| Pull-to-refresh | Done | RefreshControl wired |
| Empty state | Done | "No posts yet" with icon |
| Metro area name in header | Done | Loads from cache with Supabase fallback |

### E. Post Creation

| Task | Status | Notes |
|------|--------|-------|
| CategorySelectScreen | Done | Grid of 4 categories with icons |
| CreatePostScreen | Done | Dynamic form based on category |
| Housing form fields | Done | Rent, move-in date, room type |
| Jobs form fields | Done | Title, pay range, employment type, company |
| Emergency form fields | Done | Type, location, description |
| Travel form fields | Done | Date, route, airline |
| Post expiry calculation | Done | Auto-set based on category constants |
| PostNavigator | Done | CategorySelect → CreatePost stack |
| Post tab navigation | Done | Tab wired to PostNavigator |

### F. Shared Components & Design System

| Task | Status | Notes |
|------|--------|-------|
| Colors (colors.ts) | Done | Full palette |
| Typography (typography.ts) | Done | h1-h3, body, caption, button |
| Spacing (spacing.ts) | Done | Spacing scale, heights, borderRadius, shadows |
| PrimaryButton | Done | With loading state |
| SecondaryButton | Done | |
| TextButton | Done | |
| ZipCodeInput | Done | 5-digit validation |
| TextInput (generic) | Done | |
| TrustBadge | Done | |
| StatusBadge | Done | |
| PostCard | Done | |
| Level0Banner | Done | |
| TutorialCard | Done | |

### G. User Profile & Account Management

| Task | Status | Notes |
|------|--------|-------|
| ProfileScreen | Done | Avatar with initials, name, email, trust badge, metro area, settings menu |
| EditProfileScreen | Done | Edit name, phone, ZIP with auto metro lookup |
| ChangePasswordScreen | Done | Current password verify, new + confirm, eye toggles |
| ProfileNavigator | Done | ProfileView → EditProfile / ChangePassword stack |
| Log out with confirmation | Done | Alert confirmation → signOut → back to Welcome |

### H. Navigation

| Task | Status | Notes |
|------|--------|-------|
| RootNavigator | Done | Onboarding ↔ Main switch |
| OnboardingNavigator | Done | All onboarding screens |
| MainTabNavigator | Done | 5 tabs (Home, Search, Post, Messages, Profile) |
| PostNavigator | Done | CategorySelect → CreatePost stack |
| ProfileNavigator | Done | ProfileView → EditProfile / ChangePassword stack |
| HomeNavigator | Done | HomeMain → PostDetail stack |
| ChatNavigator | Done | ConversationList → MessageThread stack |
| Search tab screen | Stub | ComingSoonScreen placeholder |
| Messages tab screen | Done | Replaced stub with ChatNavigator |

### I. In-App Chat

| Task | Status | Notes |
|------|--------|-------|
| blocked_users migration (002) | Done | Table, RLS policies, message send policy update |
| Conversations API service | Done | getConversations, getOrCreateConversation, blockUser, isBlocked |
| Messages API service | Done | getMessages, sendMessage, markAsRead, subscribeToMessages, getTotalUnreadCount |
| ConversationItem component | Done | Avatar, name, post context, last message, timestamp, unread badge |
| MessageBubble component | Done | Sent/received, read receipts (check marks) |
| ChatInput component | Done | Multi-line, 1000 char limit, send button |
| ConversationListScreen | Done | FlatList, pull-to-refresh, empty state with "Browse Posts" CTA |
| MessageThreadScreen | Done | Realtime subscription, optimistic send, date separators, kebab menu |
| PostDetailScreen | Done | Full post details, field rows, author info, "Contact Author" CTA |
| PostCard message icon | Done | chatbubble-outline icon, hidden on own posts |
| Read receipts | Done | Mark read on open, single/double check display |
| Block user | Done | Kebab menu → confirmation → block → navigate back |
| Unread badge on Messages tab | Done | Polls every 30s, shows count on tab icon |
| Chat RLS policies | **DISABLED** | See Security TODO below |

### J. Photo Upload

| Task | Status | Notes |
|------|--------|-------|
| Image picker | Not started | |
| Supabase Storage upload | Not started | |
| Photo compression/resize | Not started | |

### K. Post Interactions (Likes & Comments) - NEW

| Task | Status | Notes |
|------|--------|-------|
| Enhanced PostCard UI | Not started | Author avatar, description preview, action bar |
| Avatar component | Not started | Photo or initials, trust-level colored background |
| post_likes table (migration 003) | Not started | Individual like tracking |
| post_comments table (migration 003) | Not started | Public comment threads |
| likes_count, comments_count columns | Not started | Cached counters on posts table |
| Database triggers for counters | Not started | Auto-increment/decrement counts |
| Like button component | Not started | Heart icon, toggle like/unlike |
| Comment list component | Not started | Display comments with avatars |
| Comment input component | Not started | Multi-line input, 1000 char limit |
| Likes API (like, unlike, getUserLikes) | Not started | |
| Comments API (get, create, delete) | Not started | |
| RLS policies (post_likes) | Not started | |
| RLS policies (post_comments) | Not started | |
| Level 0 disabled states | Not started | Show verification prompts |
| "View More" link on PostCard | Not started | Navigate to detail when description truncated |

### L. Profile Photo Upload - NEW

| Task | Status | Notes |
|------|--------|-------|
| Photo picker (camera/library) | Not started | iOS/Android permissions |
| Image cropping UI | Not started | Square crop, zoom/pan |
| Supabase Storage upload (avatars bucket) | Not started | Auto-compress to 500KB, 500x500px |
| Avatar component with fallback | Not started | Photo or initials, trust-level colors |
| Profile photo display (EditProfileScreen) | Not started | 64x64px with "Change Photo" button |
| Remove photo option | Not started | Delete from Storage, set field to null |
| Avatar in PostCard (author) | Not started | 40x40px |
| Avatar in comments | Not started | 32x32px |
| Avatar in chat | Not started | 40x40px (conversation list, thread) |
| Avatar in profile screen | Not started | 64x64px |

### M. Reporting System

| Task | Status | Notes |
|------|--------|-------|
| Report button on posts | Not started | |
| Report categories UI | Not started | |
| Moderator queue | Not started | |

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
| Resource Wiki | Not started |

---

## TODO: Security Vulnerabilities

> These must be resolved before any production/beta release.

| Issue | Tables Affected | Details | Priority |
|-------|----------------|---------|----------|
| **Chat RLS disabled** | `conversations`, `messages`, `conversation_participants` | RLS was disabled during development because policies were not being enforced despite correct definitions. Supabase PostgREST schema cache (`NOTIFY pgrst, 'reload schema'`) did not resolve it. Policies exist in migration files but are not active. **Any authenticated user can currently read/write all chat data.** | Critical |
| **blocked_users RLS** | `blocked_users` | RLS is enabled and policies are defined in `001_schema.sql`, but not tested end-to-end. Verify after fixing chat RLS. | High |

**To re-enable chat RLS:**
1. `ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;`
2. `ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`
3. `ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;`
4. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'messages', 'conversation_participants');`
5. If policies were dropped, re-run the relevant RLS sections from `001_schema.sql`
6. Run `NOTIFY pgrst, 'reload schema';` and test
7. If still failing, investigate Supabase project-level RLS settings or recreate policies via Dashboard UI
