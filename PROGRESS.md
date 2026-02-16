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
| Schema migration (001_initial_schema.sql) | Done | All tables, indexes, RLS, triggers |
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
| Search tab screen | Stub | ComingSoonScreen placeholder |
| Messages tab screen | Stub | ComingSoonScreen placeholder |

### I. In-App Chat

| Task | Status | Notes |
|------|--------|-------|
| Chat UI | Not started | |
| Supabase Realtime subscription | Not started | |
| Conversation list | Not started | |
| Message sending/receiving | Not started | |

### J. Photo Upload

| Task | Status | Notes |
|------|--------|-------|
| Image picker | Not started | |
| Supabase Storage upload | Not started | |
| Photo compression/resize | Not started | |

### K. Reporting System

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
