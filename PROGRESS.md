# NUSA Development Progress

**Last Updated:** 2026-02-13

---

## Phase 1: Utility Core & Trust Foundation

### A. Identity & Account Levels

| Task | Status | Notes |
|------|--------|-------|
| Email signup/login | Done | EmailSignupScreen with signup/login toggle |
| Supabase Auth integration | Done | Session persistence via AsyncStorage |
| AuthContext (session, refresh, signOut) | Done | Listens to auth state changes |
| Google OAuth signup | Stub | Button exists, navigates to ZIP entry with temp ID |
| Phone SMS signup | Stub | Button exists, no implementation |
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
| Posts service (getPostsByMetroArea) | **Bug** | Column mismatch: uses `expires_at`/`metadata` vs DB `expiry_date`/`fields` |
| Posts service (createPost) | **Bug** | Missing required DB columns: `location_zip_code`, `location_city`, `location_state` |
| Pull-to-refresh | Done | RefreshControl wired |
| Empty state | Done | "No posts yet" with icon |
| Metro area name in header | Partial | Shows "Your Metro Area" placeholder, not actual name |

### E. Post Creation

| Task | Status | Notes |
|------|--------|-------|
| CreatePostScreen | Not started | Need category selection + category-specific forms |
| Housing form fields | Not started | Rent, move-in date, room type |
| Jobs form fields | Not started | Title, pay, employment type, company |
| Emergency form fields | Not started | Type, location, description + disclaimer |
| Travel form fields | Not started | Date, route, airline |
| Post expiry calculation | Not started | Auto-set based on category |
| FAB → CreatePost navigation | Not started | FAB exists, handler is a stub |
| Post tab → CreatePost navigation | Not started | Tab exists, screen is null |

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

### G. Navigation

| Task | Status | Notes |
|------|--------|-------|
| RootNavigator | Done | Onboarding ↔ Main switch |
| OnboardingNavigator | Done | All onboarding screens |
| MainTabNavigator | Done | 5 tabs (Home, Search, Post, Messages, Profile) |
| Search tab screen | Stub | Returns null |
| Post tab screen | Stub | Returns null |
| Messages tab screen | Stub | Returns null |
| Profile tab screen | Stub | Returns null |

### H. In-App Chat

| Task | Status | Notes |
|------|--------|-------|
| Chat UI | Not started | |
| Supabase Realtime subscription | Not started | |
| Conversation list | Not started | |
| Message sending/receiving | Not started | |

### I. Photo Upload

| Task | Status | Notes |
|------|--------|-------|
| Image picker | Not started | |
| Supabase Storage upload | Not started | |
| Photo compression/resize | Not started | |

### J. Reporting System

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
