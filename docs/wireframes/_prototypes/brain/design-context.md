# Design Context — Nepally

Generated: 2026-04-03

## App Overview

Nepally (US-Nepal Help Network) is a utility-first community platform for the Nepalese diaspora in the USA. It combines a local community feed, in-app messaging, events, and a marketplace — all organized around US Census Metro Areas. Users are mapped to metros via ZIP code during onboarding, and content defaults to a local feed with tag-based filtering.

## Target Platform

Both (responsive) — React Native (Expo) mobile app + Next.js web app sharing a Supabase backend.

## Layout Patterns

### Mobile

- Full-width card-based layout, 16px horizontal padding
- Bottom tab bar with 5 tabs: Home, Post, Events, Marketplace, Profile
- Stack navigators per tab for drill-down screens
- Cards: white background, subtle rounded corners (8-12px radius), minimal shadow
- Media grids: 2px gap, supporting 1-4 images in responsive grid

### Web

- Sticky 60px top header (brand left, location center, search/notifications/messages/account right)
- Left sidebar rail: 220px fixed, with community branding, category nav links, "+ Create Post" CTA, footer links
- Main content: flexible center column (max ~900px)
- Right rail: 300px "Sponsored" widget area (sticky)
- Responsive breakpoint at 980px (sidebar hidden), 640px (reduced padding)
- Feed layout: two-column grid (main + sponsored rail)

### Spacing System (8pt Grid)

- xxs: 4px, xs: 8px, s: 16px, m: 24px, l: 32px, xl: 48px

### Border Radius

- Buttons/Inputs: 8px
- Cards/Modals: 12-14px
- Badges/Pills: 16px
- Full circle: 9999px

## Navigation

### Mobile

- **Primary**: Bottom tab bar (Home, Post, Events, Marketplace, Profile)
  - Active: `#1565C0` blue, Inactive: `#757575` gray
  - Tab bar height: 56px
- **Secondary**: Stack navigators within each tab
- **Header**: Screen title left-aligned (bold), optional action icons right
- **Back navigation**: Left arrow icon
- **Hamburger menu**: On Profile screen — Edit Profile, Change Password, Logout

### Web

- **Primary**: Sticky top header
  - Left: "Nepally" brand text in `#00408b`
  - Center: Location pin + metro name dropdown
  - Right: Search input, bell icon, chat icon, avatar dropdown
- **Secondary**: Left sidebar with category links
  - Feed, Housing, Jobs, Help, Question, Discussion, Emergency, Events, Marketplace
  - Active link: blue background highlight with primary icon color
- **CTA**: "+ Create Post" button in sidebar (gradient blue)
- **Footer**: Privacy Policy, Guidelines, Help Center, copyright

## Color Palette

### Primary

- Mobile primary: `#1565C0` (deep blue)
- Web primary: `#00408b` (deeper blue)
- Primary light: `#E3F2FD`
- Primary dark: `#104D99`

### Secondary

- Orange accent: `#F7941D`
- Secondary light: `#FDE7C7`

### Semantic

- Success/Verified: `#2E7D32` (green)
- Warning: `#F57C00` (amber)
- Error: `#C62828` (red)
- Accent red: `#DC143C` (hearts, emergency)

### Neutrals

- Text primary: `#1A2332` / `#1a1d21`
- Text secondary: `#757575` / `#5f6368`
- Text tertiary: `#9E9E9E` / `#9aa0a6`
- Background: `#F5F5F5` / `#f7f9fb`
- Surface: `#FFFFFF`
- Border: `rgba(0, 64, 139, 0.10)`

### Tag Colors

- Housing: `#4CAF50` green
- Jobs: `#2196F3` blue
- Help: `#FF9800` orange
- Question: `#9C27B0` purple
- Discussion: `#00BCD4` cyan
- Emergency: `#F44336` red

### Event Type Colors

- Cultural: `#E65100` on `#FFF3E0`
- Religious: `#6A1B9A` on `#F3E5F5`
- Social: `#1B5E20` on `#E8F5E9`
- Career: `#0D47A1` on `#E3F2FD`

### Trust Level Colors

- Level 0 (New): `#94A3B8` gray
- Level 1 (Verified): `#2E7D32` green
- Level 2 (Contributor): `#00408b` blue

## Typography

### Mobile

- Platform fonts (San Francisco / Roboto)
- H1: 36px/800, H2: 24px/700, H3: 20px/600
- Body: 15px/400, line-height 1.55
- Small: 13px, Caption: 12px
- Screen titles: bold, left-aligned, ~24-28px

### Web

- Headings: system sans-serif, 700 weight
- Body: 14-16px system sans-serif
- Sidebar links: 14px with icon + label
- Post cards: title 16-18px bold, body 14px regular

## Page Types

### Feed (Home)

- **Mobile**: Location header (metro + icons for search/chat/notifications) → tag filter pills (scrollable, gradient active state) → composer card (avatar + input + "Post" button) → post cards (full-width) → FAB for create
- **Web**: Composer row (avatar + input + "Create Post" button) → post cards (with tag badges, Local/Global pill, action bar, "View Details" link) → sponsored sidebar cards

### Post Detail

- **Mobile**: Back arrow → author row (avatar + name + verification badge + time + more menu) → title (bold, large) → body text → media grid (2px gap) → like/comment counts → action bar (Like, Comment, Save, Share) → tag pills + Local/Global badge + metro → Comments section → comment input bar
- **Web**: Similar card layout within main content area

### Profile

- **Mobile**: "Profile" title + hamburger → card with centered avatar (large circle, initials + color), name, email, "Level 1 — Verified" badge (green pill) → tab bar (Posts, Listings, Saved Posts, About) with blue underline on active → tab content
- **Web**: Horizontal layout — avatar left, name/email/trust right, "Add Photo" link, tabs below

### Messages

- **Mobile list**: "Messages" title + back arrow → conversation items (avatar + name + preview + date)
- **Mobile thread**: Back arrow + avatar + name + verification badge → message bubbles (blue sent right-aligned, light gray received left-aligned, timestamps, read checkmarks) → input bar with send button
- **Web list**: "Messages" title → conversation rows (avatar + name + preview + date)
- **Web thread**: "Back" link + avatar + name → message bubbles (dark blue sent, light gray received) → input bar

### Notifications

- **Mobile**: "Notifications" title + "Mark all read" + settings gear → date group headers ("TODAY") → notification cards (icon + text + blue unread dot + dismiss X, blue left border + light blue bg for unread)
- **Web page**: Notifications heading + Preferences button → date group → notification items (avatar icon + action text + context + time)
- **Web dropdown**: Popover from bell icon with notification items + "See all notifications" link

### Events

- **Mobile**: "Events" title + "+ Create" button → filter pills (All, Cultural, Religious, Social, scrollable) → section headers (PAST EVENTS) → event cards (thumbnail left + type badge + title + date/time + location + organizer avatar + attendee count)
- **Web**: "Events" title + "+ Create Event" button → filter sidebar (All, Cultural, Religious, Social, Career, Other as vertical list) → event cards (thumbnail left + type badge + title + date + location + organizer + attendee count)

### Marketplace

- **Mobile**: "Marketplace" title + filter icon → search input → "Categories" section with category cards (emoji + label, colored borders) → "Recently Added" section with listing cards (thumbnail + title + category badge + price + seller + stats)
- **Web**: "Marketplace" title + "My Listings" + "Create Listing" buttons → search input → Categories grid (emoji icon cards) → "Recently Added" with listing rows

## Component Patterns

### Avatar

- Circular, initials-based with deterministic color from name hash
- Sizes: small (32px), medium (40px), large (64px), xlarge (80-100px)
- Verification badge: green checkmark circle overlapping bottom-right

### Post Card

- Author row → title → body preview (truncatable) → media grid → engagement counts → action bar → tag pills + scope badge

### Action Bar

- Like (heart outline), Comment (speech bubble), Save (bookmark), Share (share icon)
- Evenly spaced, icon + label

### Tag Pills

- Colored background (15% opacity) + colored text + emoji prefix
- Rounded (16px radius), compact padding

### Filter Pills

- Horizontal scrollable row
- Active: filled background (gradient on mobile, solid on web), white text
- Inactive: white/transparent background, border, dark text

### Trust Badge

- Green pill: "Level 1 — Verified" with checkmark icon
- Displayed on profile cards and next to usernames

### Notification Item

- Unread: blue left border + light blue background + blue dot
- Read: no border, white/transparent background
- Structure: icon/avatar + action text + context + timestamp + dismiss X

### Browser Chrome Dots (wireframe system)

- Gray in wireframe mode
- Red/yellow/green in color variants

## Shadows

- Small: `0 1px 3px rgba(0, 64, 139, 0.04), 0 1px 2px rgba(0, 64, 139, 0.03)`
- Medium: `0 4px 16px rgba(0, 64, 139, 0.07), 0 2px 4px rgba(0, 64, 139, 0.04)`
- Large: `0 8px 32px rgba(0, 64, 139, 0.10), 0 4px 12px rgba(0, 64, 139, 0.05)`

## Glassmorphism Tokens

- Glass bg: `rgba(255, 255, 255, 0.82)`
- Glass strong: `rgba(255, 255, 255, 0.94)`
- Glass blur: `blur(20px) saturate(1.6)`
- Glass border: `1px solid rgba(255, 255, 255, 0.5)`

## Screenshot Observations

### Mobile Home Feed

- Location header with metro name + chevron, search/chat/notification icons
- Tag filter pills in horizontally scrollable row with gradient active state
- Composer card with avatar + placeholder text + "Post" button
- Post cards are full-width with clear content hierarchy
- Blue FAB (floating action button) for quick create

### Mobile Profile

- Large centered avatar with initials, email below name
- Green "Level 1 — Verified" pill badge
- Four-tab layout: Posts, Listings, Saved Posts, About
- About tab shows location details + activity counts
- Hamburger menu triggers dropdown (Edit Profile, Change Password, Logout)

### Mobile Chat

- Messenger-style bubbles: blue right-aligned (sent), light gray left-aligned (received)
- Timestamps on each message, read checkmarks on sent messages
- Conversation list shows avatar + name + preview + date

### Mobile Notifications

- Date-grouped sections
- Unread: light blue card with blue left border + blue dot + dismiss X
- Notification icon (speech bubble) in light circle

### Mobile Events

- Horizontal filter pills with emoji prefixes
- Event cards: thumbnail, type badge, title, date/time, location pin, organizer avatar, attendee count
- Section headers (PAST EVENTS)

### Mobile Marketplace

- Search bar at top
- Category cards with emoji icons and colored borders (orange for Food, purple for Immigration)
- Listing cards with photo, title, category badge, price in blue, seller name, view/save stats
- Blue FAB for create

### Web Feed

- Three-column layout: sidebar + feed + sponsored rail
- Composer row at top of feed
- Post cards with tag badges inline with author row
- Local/Global scope pills
- "View Details" link at bottom-right of each card
- Notification dropdown popover from bell icon

### Web Profile

- Horizontal avatar + info layout
- Same four tabs as mobile
- More compact card styling

### Web Events

- Vertical filter sidebar (replaces horizontal pills)
- Event cards in list format with thumbnails

### Web Marketplace

- Category grid (4 columns of emoji cards)
- Account dropdown with avatar, name, email, View Profile, Manage Locations, Sign Out

## UX Conventions

- Trust system visually present everywhere (badge on profile, verification checkmark on names)
- Local/Global scope always visible on posts
- Tag-based filtering is primary content organization
- Metro location prominent in headers
- Consistent bottom tab bar on mobile, left sidebar on web
- Blue as primary action color throughout
- Cards with subtle borders/shadows as main content containers
- Glassmorphism on dropdowns and overlays
