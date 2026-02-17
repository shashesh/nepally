# Wireframe: Home Screen (Level 0)

**Screen Number:** 06
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 13
**User Story:** As a new Level 0 user who just completed onboarding, I want to browse local posts in my metro area so I can find relevant housing, jobs, emergencies, and travel coordination.
**Last Updated:** 2026-02-12
**Status:** Draft

---

## Screen Purpose

This is the success state of the onboarding journey - the main home screen (local feed). For Level 0 users, it shows:
- Local posts from their metro area
- Level 0 banner promoting verification
- Category tabs for filtering content
- Floating + button (slightly disabled for Level 0)

**Key Goals:**
- Show user that onboarding worked (seeing real local posts)
- Encourage verification through prominent banner
- Enable browsing and exploring content
- Set expectations for Level 0 limitations (view-only)
- Provide clear path to Level 1 verification

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│ Dallas-Fort Worth ▼    🔍  🔔           │ ← Top nav: 44px height
│                                         │    Location, Search, Notifications
├─────────────────────────────────────────┤
│ ⚠️  You're viewing only. Verify phone  │ ← Level 0 banner: 64px height
│    to post and message. [Verify Now] X │    Yellow bg (#FFF3E0), dismissible
├─────────────────────────────────────────┤
│ All  Housing  Jobs  Emergency  Travel   │ ← Category tabs: 48px height
│ ─── ───────── ────  ───────── ──────   │    Housing pre-selected (underline)
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │ ← Post Card 1 (Enhanced)
│  │ [SG] Sita Gurung ✓      2h ago    │ │    Author row with avatar
│  │                                   │ │
│  │ 🏠 Private Room in Richardson     │ │    Category + title
│  │ $650/month • Available March 1    │ │    Price + details
│  │ Looking for Nepali roommate to sh │ │    Description preview
│  │ are 2BR apartment...  View More   │ │    (150 chars, "View More")
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │    280x160px image
│  │                                   │ │
│  │ ───────────────────────────────── │ │    Action bar separator
│  │ ❤️ 24      💬 5      ✉️ Message    │ │    Like, Comment, Message
│  └───────────────────────────────────┘ │
│                                         │ ← 12px spacing
│  ┌───────────────────────────────────┐ │ ← Post Card 2
│  │ 🏠 2BR Apartment in Plano      ✓  │ │
│  │                                   │ │
│  │ $1,200/month • Available now      │ │
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │
│  │                                   │ │
│  │ Posted 5 hours ago • Dallas-FW    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │ ← Post Card 3
│  │ 🏠 Looking for Roommate (Nepali)✓ │ │
│  │                                   │ │
│  │ $500/month • Shared kitchen       │ │
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │
│  │                                   │ │
│  │ Posted 1 day ago • Dallas-FW      │ │
│  └───────────────────────────────────┘ │
│                                         │
│                                         │
│                                    [+] │ ← Floating action button
│                                         │    56x56px, bottom-right
│                                         │    50% opacity (Level 0)
│                                         │
└─────────────────────────────────────────┘
```

### Android Layout

```
┌─────────────────────────────────────────┐
│ Dallas-Fort Worth ▼    🔍  🔔           │ ← Top app bar: 56dp height
│                                         │
├─────────────────────────────────────────┤
│ ⚠️  You're viewing only. Verify phone  │ ← Level 0 banner: 72dp height
│    to post and message. [VERIFY NOW] X │    Yellow bg, ALL CAPS button
├─────────────────────────────────────────┤
│ ALL  HOUSING  JOBS  EMERGENCY  TRAVEL   │ ← Tabs: 48dp height
│ ─── ──────── ───── ───────── ──────────│    Material TabLayout
│                                         │    ALL CAPS labels
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │ ← Post Card 1
│  │ 🏠 Private Room in Richardson  ✓  │ │    Material Card, 8dp elevation
│  │                                   │ │    16dp padding
│  │ $650/month • Available March 1    │ │
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │    match_parent x 160dp
│  │                                   │ │
│  │ Posted 2 days ago • Dallas-FW     │ │    12sp caption, gray
│  └───────────────────────────────────┘ │
│                                         │ ← 12dp spacing
│  ┌───────────────────────────────────┐ │ ← Post Card 2
│  │ 🏠 2BR Apartment in Plano      ✓  │ │
│  │                                   │ │
│  │ $1,200/month • Available now      │ │
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │
│  │                                   │ │
│  │ Posted 5 hours ago • Dallas-FW    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │ ← Post Card 3
│  │ 🏠 Looking for Roommate (Nepali)✓ │ │
│  │                                   │ │
│  │ $500/month • Shared kitchen       │ │
│  │                                   │ │
│  │ [Photo thumbnail]                 │ │
│  │                                   │ │
│  │ Posted 1 day ago • Dallas-FW      │ │
│  └───────────────────────────────────┘ │
│                                         │
│                                    [+] │ ← FAB: 56x56dp
│                                         │    50% opacity (Level 0)
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Top Navigation Bar

**Type:** Navigation bar / App bar
**Height:** 44px (iOS) / 56dp (Android)
**Background:** White (#FFFFFF)
**Border:** 1px bottom border #E0E0E0 (iOS) or elevation 2dp (Android)

**Components (left to right):**

#### Location Dropdown
- **Label:** "Dallas-Fort Worth" (dynamic, user's metro area)
- **Icon:** Chevron down (▼), 16px/dp, #757575
- **Typography:** 17pt/16sp Semibold, #212121
- **Touch Target:** Full text + icon, minimum 44x44pt / 48x48dp
- **Interaction:** Tap to open metro area selector (future: change location)
- **Truncation:** Max 25 characters, truncate with "..." if longer

#### Search Icon
- **Icon:** Magnifying glass (🔍), 24x24px/dp
- **Position:** Top-right, 12px/dp from Notification icon
- **Touch Target:** 44x44pt / 48x48dp
- **Interaction:** Tap to open search screen
- **Color:** #757575 (Medium Gray)

#### Notification Bell Icon
- **Icon:** Bell (🔔), 24x24px/dp
- **Position:** Far top-right, 16px/dp from edge
- **Touch Target:** 44x44pt / 48x48dp
- **Badge:** Red dot (8px) if unread notifications
- **Interaction:** Tap to open notifications screen
- **Color:** #757575 (Medium Gray), badge: #DC143C (Accent Red)

**Accessibility:**
- Location: "Dallas-Fort Worth, button, change location"
- Search: "Search button"
- Notifications: "Notifications, [X unread]"

---

### 2. Level 0 Banner (Verification Prompt)

**Type:** Dismissible banner
**Height:** 64px (iOS) / 72dp (Android)
**Background:** #FFF3E0 (Light Amber, from design system)
**Padding:** 12px/16dp all around
**Border:** None or 1px bottom border #F57C00

**Components (left to right):**

#### Warning Icon
- **Icon:** ⚠️ (warning triangle), 20x20px/dp
- **Color:** #E65100 (Dark Amber)
- **Position:** Left side, 12px/dp from edge

#### Message Text
- **Content:** "You're viewing only. Verify phone to post and message."
- **Typography:** 15pt/14sp Regular, #E65100 (Dark Amber)
- **Max Lines:** 2 lines (wraps on narrow screens)
- **Alignment:** Left

#### Verify Now Button (Inline CTA)
- **Label:** "Verify Now"
- **Style:** Text button (not filled)
- **Typography:** 15pt/14sp Semibold, #1565C0 (Primary Blue)
- **Underline:** Yes (always visible)
- **Touch Target:** 44x44pt / 48x48dp minimum
- **Interaction:** Tap to start verification flow (Journey #02)

#### Dismiss Button (X)
- **Icon:** X (close), 16x16px/dp
- **Color:** #E65100 (Dark Amber)
- **Position:** Far right, 12px/dp from edge
- **Touch Target:** 44x44pt / 48x48dp
- **Interaction:** Tap to dismiss banner (hides for current session, reappears on next launch)

**States:**
- **Default:** Visible for Level 0 users
- **Dismissed:** Hidden until next app launch
- **Pressed (Verify Now):** Darken blue text color
- **Pressed (X):** Fade out banner (300ms)

**Accessibility:**
- Full text: "Warning. You're viewing only. Verify phone to post and message. Verify Now button. Close button."
- Verify Now: "Verify Now, button"
- Dismiss: "Close banner, button"

**Behavior:**
- Always shown on first home screen load for Level 0 users
- Dismissible per session (reappears on next app launch)
- Permanently hidden once user reaches Level 1

---

### 3. Category Tabs

**Type:** Horizontal tab bar
**Height:** 48px/dp
**Background:** White (#FFFFFF)
**Border:** 1px bottom border #E0E0E0 (or elevation on Android)

**Tab Labels:**
- All
- Housing (pre-selected on first load)
- Jobs
- Emergency
- Travel

**Tab Styling:**
- **Typography:** 15pt/14sp Semibold (iOS) / 14sp Medium ALL CAPS (Android)
- **Color:**
  - Active tab: #1565C0 (Primary Blue)
  - Inactive tabs: #757575 (Medium Gray)
- **Underline (Active):** 2px solid #1565C0, bottom of tab
- **Spacing:** 16px/dp between tabs
- **Scroll:** Horizontal scroll if all tabs don't fit (unlikely on phone)

**Interaction:**
- Tap tab → Filter feed to show only posts of that category
- Active tab has blue text + underline
- Smooth animation: Underline slides from old tab to new tab (200ms)

**Accessibility:**
- Each tab: "Housing tab, selected" or "Jobs tab"
- VoiceOver/TalkBack: Swipe to navigate between tabs

**Initial State:**
- "Housing" tab is pre-selected (based on persona's goal in journey)
- Feed shows only Housing posts initially

---

### 4. Post Feed (Scrollable List)

**Type:** Vertical scrollable list (RecyclerView on Android, UITableView/UICollectionView on iOS)
**Background:** #F5F5F5 (Light Gray, from design system)
**Padding:** 16px/dp on sides, 12px/dp between cards
**Pull-to-Refresh:** Yes (pulls down to refresh feed)

**Empty State:**
- If no posts in selected category: Show illustration + message
- Message: "No housing posts in your area yet. Check back soon!"
- Illustration: Empty state graphic (subtle mountain silhouette)

**Loading State:**
- Show skeleton cards (3 placeholder cards with shimmer animation)
- Or show spinner in center if first load

---

###5. Post Card (Enhanced - with Author, Description, Social Actions)

**Type:** Card component (tappable)
**Background:** White (#FFFFFF)
**Border:** 1px solid #E0E0E0 (iOS) or elevation 2dp (Android)
**Corner Radius:** 12px/dp
**Padding:** 16px/dp all around
**Margin:** 16px/dp left/right, 12px/dp between cards
**Shadow:** 0 2px 4px rgba(0,0,0,0.1) (iOS) or elevation 2dp (Android)

**Card Layout (top to bottom):**

#### Author Row (NEW)
- **Author Avatar:** 40x40px/dp circle, left-aligned
  - If profile photo exists: Display photo
  - If no photo: Display initials (e.g., "JD" for John Doe)
  - Background color based on trust level:
    - Level 0: #E0E0E0 (Light Gray)
    - Level 1: #4A90E2 (Blue)
    - Level 2: #7B61FF (Purple)
  - Text color: White, 16pt/14sp Semibold
  - Border: 1px solid #E0E0E0
- **Author Name:** "Sita Gurung" (14pt/13sp Medium, #212121)
  - Position: To right of avatar, vertically centered
  - Max width: Truncate if > 20 chars
- **Trust Badge:** ✓ (verified checkmark), 16x16px/dp, #2E7D32
  - Position: To right of name, only shown for Level 1+
  - Hidden for Level 0 users
- **Timestamp:** "2h ago" (12pt/11sp Regular, #757575)
  - Position: Far right, vertically centered with name
  - Relative time: "5m ago", "2h ago", "1d ago", "2w ago"
- **Layout:** [Avatar] [Name + Badge] ............ [Timestamp]
- **Margin:** 0-16px/dp from top (if first card element)

#### Header Row (Category + Title)
- **Icon:** Category emoji (🏠 for Housing), 20x20px/dp
- **Title:** "Private Room in Richardson" (17pt/16sp Semibold, #212121)
- **Layout:** Icon + Title (left-aligned, wraps to 2 lines max)
- **Margin:** 12px/dp from author row

#### Price & Details Row
- **Content:** "$650/month • Available March 1"
- **Typography:** 15pt/14sp Regular, #757575
- **Separator:** Bullet point (•) between price and details
- **Max Lines:** 1 line (truncate if too long)
- **Margin:** 4px/dp from title

#### Description Preview (NEW)
- **Content:** First 150 characters of post description
- **Typography:** 14pt/13sp Regular, #424242
- **Max Lines:** 2 lines with ellipsis if truncated
- **Truncation Logic:** Cut at last complete word before 150 chars
- **"View More" Link:** (NEW)
  - Display only if description is truncated (> 150 chars)
  - Text: "View More" (12pt/11sp Semibold, #1565C0 Primary Blue)
  - Position: Inline at end of truncated text
  - Underline: Yes
  - Interaction: Tap to navigate to post detail screen
- **Example:** "Looking for Nepali roommate to share 2BR apartment near UTD campus. Clean, quiet environment. Rent is $800/month including utilities. Move-in date flexible (March 1... View More"
- **Margin:** 8px/dp from price row, 12px/dp from action bar

#### Photo Thumbnail (if post has photo)
- **Dimensions:** Full card width x 160px/dp height
- **Corner Radius:** 8px/dp
- **Margin:** 12px/dp top and bottom
- **Placeholder:** Gray background (#F5F5F5) with house icon if no photo
- **Interaction:** Tap image to view full screen (Level 0: works normally)
- **Position:** After description preview and before action bar

#### Action Bar (NEW - Social Engagement)
- **Height:** 36px/dp
- **Background:** Transparent (part of card)
- **Border:** 1px top border #E0E0E0
- **Padding:** 8px/dp vertical
- **Layout:** Horizontal row with 3 actions, evenly spaced

**Action 1: Like Button**
- **Icon:** Heart outline (not liked) or Heart filled (liked)
  - Size: 20x20px/dp
  - Color: #757575 (outline), #DC143C Accent Red (filled)
- **Count:** Number next to icon (e.g., "24")
  - Typography: 14pt/13sp Regular, #757575
  - Position: 4px/dp to right of icon
  - Format: Exact number if < 1000, "1K" / "1.2K" if >= 1000
  - Default: "0" (always shown, even if no likes)
- **Touch Target:** 44x44pt / 48x48dp minimum
- **Level 0 Behavior:**
  - Icon grayed out (#BDBDBD)
  - Tap shows toast: "Verify your account to like posts"
  - Count still visible (user can see community engagement)
- **Level 1+ Behavior:**
  - Tap to like: Heart fills, count increments, animate (scale 1.2 → 1.0)
  - Tap to unlike: Heart unfills, count decrements
  - Optimistic UI update
- **Accessibility:** "Like button, [liked/not liked], 24 likes"

**Action 2: Comment Button**
- **Icon:** Chat bubble outline
  - Size: 20x20px/dp
  - Color: #757575
- **Count:** Number next to icon (e.g., "5")
  - Typography: 14pt/13sp Regular, #757575
  - Format: Exact number if < 1000, "1K" if >= 1000
  - Default: "0" (always shown)
- **Touch Target:** 44x44pt / 48x48dp minimum
- **Level 0 Behavior:**
  - Icon enabled (not grayed out)
  - Tap navigates to post detail screen, scrolls to comments
  - User can read comments but comment input is disabled
- **Level 1+ Behavior:**
  - Tap navigates to post detail screen, scrolls to comments section
  - User can read and write comments
- **Accessibility:** "Comment button, 5 comments"

**Action 3: Message Button**
- **Icon:** Direct message (paper plane or chat dots)
  - Size: 20x20px/dp
  - Color: #757575
- **Label:** "Message" (optional, or icon-only)
  - Typography: 14pt/13sp Regular, #757575 (if shown)
- **Touch Target:** 44x44pt / 48x48dp minimum
- **Level 0 Behavior:**
  - Icon grayed out (#BDBDBD)
  - Tap shows toast: "Verify your account to message"
- **Level 1+ Behavior:**
  - Tap opens/creates conversation with post author (existing chat feature)
  - Hidden if viewing own post
- **Accessibility:** "Message author button"

**Action Bar Layout:**
- [❤️ 24] ............ [💬 5] ............ [✉️ Message]
- Equal spacing between actions
- Left-aligned within card padding

**States:**
- **Default:** All icons outline, light gray
- **Like Active:** Heart filled, red color
- **Pressed (Like):** Scale animation, instant feedback
- **Pressed (Comment/Message):** Ripple effect (Android) or highlight (iOS)
- **Disabled (Level 0):** Like and Message icons grayed out, tooltips on tap

**Interaction:**
- **Tap card body:** Open post detail screen
- **Tap author avatar/name:** Show toast "Coming soon" (future: navigate to user profile)
- **Tap like button:** Toggle like (Level 1+), show verification toast (Level 0)
- **Tap comment button:** Navigate to post detail, scroll to comments
- **Tap message button:** Open chat conversation (Level 1+), show verification toast (Level 0)
- **Tap "View More":** Navigate to post detail screen

**Accessibility:**
- Full card structure:
  - "Posted by Sita Gurung, verified, 2 hours ago"
  - "Housing post. Private Room in Richardson. $650 per month. Available March 1."
  - "Description: Looking for Nepali roommate to share 2BR apartment..."
  - "24 likes, 5 comments. Like button. Comment button. Message button."
- Each action is individually focusable for screen readers
- VoiceOver/TalkBack can navigate through avatar, title, actions separately

---

### 6. Floating Action Button (FAB) - Create Post

**Type:** Floating Action Button
**Dimensions:** 56x56px/dp circle
**Position:** Bottom-right corner, 16px/dp from bottom and right edges
**Background:** #1565C0 (Primary Blue) at 50% opacity for Level 0
**Icon:** + (plus sign), 24x24px/dp, white
**Shadow:** 0 4px 8px rgba(0,0,0,0.2) (iOS) or elevation 6dp (Android)

**States:**
- **Level 0 (current):** 50% opacity, semi-transparent
- **Level 1+:** Full opacity (100%), bright blue
- **Pressed:** Scale 0.95, darker blue

**Interaction:**
- **Tap (Level 0):** Show modal with verification prompt
  - Modal title: "Verify Your Phone to Post"
  - Modal message: "You need to verify your phone number to create posts and message others."
  - Modal buttons: "Verify Now" (primary) and "Cancel" (secondary)
- **Tap (Level 1+):** Open "Create Post" screen (not in this journey)

**Accessibility:**
- Label: "Create post, button, requires verification"
- Hint: "Verify your phone to unlock posting"
- Trait: Button

**Visual Cue:**
- Semi-transparent appearance signals "not fully enabled"
- Users can still tap to learn why it's disabled

---

## Spacing & Layout Details

### Vertical Layout (Top to Bottom)
1. Top safe area: Auto
2. Top nav bar: 44px/56dp
3. Level 0 banner: 64px/72dp (dismissible)
4. Category tabs: 48px/dp
5. Feed padding: 12px/dp top
6. Post card 1: ~360px height (with photo)
7. Spacing: 12px/dp
8. Post card 2: ~360px height
9. Spacing: 12px/dp
10. Post card 3: ~360px height
11. Continue scrolling (infinite scroll or pagination)
12. Bottom padding: 80px/dp (for FAB clearance)

**Total Visible Height:** ~800px (fits 2-2.5 cards on screen at once)

### Horizontal Layout
- Screen margins: 16px/dp on both sides
- Post cards: Full width minus 32px/dp (16px margins × 2)
- Feed background: Full width (edge to edge)

---

## User Interactions

### Primary Flow (Browse Posts)
1. **User lands on home screen after onboarding**
2. **User sees Level 0 banner** → Reads message (5 seconds)
3. **User dismisses banner** (optional) → Tap X
4. **User browses Housing posts** → Scrolls through feed
5. **User taps post card** → Opens post detail screen
6. **User sees "Verify to Message" prompt on detail screen**
7. **User returns to home screen, taps "Verify Now" in banner**
8. **Navigate to Journey #02 (Trust Level Verification)**

### Alternative Flow (Create Post Attempt)
1. **User taps FAB (+ button)**
2. **Modal appears:** "Verify Your Phone to Post"
3. **User taps "Verify Now"** → Navigate to Journey #02
4. **User taps "Cancel"** → Modal closes, returns to feed

### Alternative Flow (Switch Category)
1. **User taps "Jobs" tab**
2. **Feed updates to show only Jobs posts** (loading spinner, then posts)
3. **Tab underline slides from Housing to Jobs** (animation)

### Alternative Flow (Search)
1. **User taps Search icon (top-right)**
2. **Navigate to Search screen** (out of scope for this journey)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Top Bar** | Navigation bar, 44px | App bar, 56dp |
| **Tab Labels** | Title case ("Housing") | ALL CAPS ("HOUSING") |
| **Post Card Shadow** | 0 2px 4px rgba shadow | Material elevation 2dp |
| **FAB** | iOS doesn't have official FAB pattern, but we'll use it for consistency | Material FAB (standard) |
| **Pull-to-Refresh** | Native iOS refresh control | Material SwipeRefreshLayout |
| **Scroll Behavior** | Smooth momentum scroll | Material scroll with edge glow |
| **Banner Dismiss** | Fade out animation | Fade out + swipe away |

---

## Error States & Edge Cases

### Edge Case: No Posts in Category
**Scenario:** User switches to "Emergency" tab, but no emergency posts in their metro area
**Behavior:**
- Show empty state illustration (mountain silhouette)
- Message: "No emergency posts in your area. That's good news!"
- Subtext: "Check back later or switch to another category."

---

### Edge Case: No Posts in Metro Area (First User)
**Scenario:** User is the first person in a new metro area, no posts at all
**Behavior:**
- Show empty state illustration
- Message: "Be the first to post in [Metro Name]!"
- CTA button: "Verify Phone to Post" (navigates to verification)

---

### Edge Case: Network Error (Feed Fails to Load)
**Scenario:** API call to fetch posts fails (timeout, no internet)
**Behavior:**
- Show error banner at top: "Could not load posts. Please check your connection and try again."
- Banner: Red background (#C62828), white text, "Retry" button
- Keep previous posts visible if cached

---

### Edge Case: User Taps Post Without Verification (Level 0)
**Scenario:** User taps post card to view details
**Behavior:**
- Navigate to post detail screen
- Show banner on detail screen: "Verify phone to contact poster"
- Contact info is hidden behind "Click to Reveal" (requires Level 1)
- Back button returns to home screen

---

### Edge Case: User Dismisses Banner Multiple Times
**Scenario:** User dismisses Level 0 banner repeatedly across sessions
**Behavior:**
- Banner reappears on each app launch (for first 7 days)
- After 7 days or 5 dismissals: Show less frequently (every 3rd launch)
- Banner permanently hides once user reaches Level 1

---

### Edge Case: Very Long Metro Area Name
**Scenario:** Metro name is >25 characters (e.g., "New York-Newark-Jersey City")
**Behavior:**
- Truncate in top nav: "New York-Newark-J..."
- Show full name in dropdown/tooltip on tap

---

### Edge Case: User Has Slow Internet (Images Don't Load)
**Scenario:** Post card images fail to load
**Behavior:**
- Show placeholder: Gray box with house icon
- "Image unavailable" text (caption)
- Card layout remains intact, rest of post visible

---

### Edge Case: User Scrolls to Bottom of Feed (Pagination)
**Scenario:** User reaches end of loaded posts
**Behavior:**
- Show loading spinner at bottom
- Load next 10 posts automatically (infinite scroll)
- If no more posts: Show "You've reached the end" message

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Home Screen, Dallas-Fort Worth"
- **Reading Order:**
  1. "Dallas-Fort Worth, button, change location"
  2. "Search button"
  3. "Notifications, 2 unread"
  4. "Warning. You're viewing only. Verify phone to post and message. Verify Now button. Close button."
  5. "Tab bar: All, Housing, Jobs, Emergency, Travel. Housing selected."
  6. "Housing post. Private Room in Richardson. Verified user. $650 per month. Available March 1. Posted 2 days ago. Button."
  7. [Repeat for each post card]
  8. "Create post, button, requires verification"

### Touch Targets
- All nav buttons (Location, Search, Notifications): 44x44pt / 48x48dp - ✓
- Banner buttons (Verify Now, X): 44x44pt / 48x48dp - ✓
- Category tabs: Full height (48px/dp), minimum 44x44pt / 48x48dp width
- Post cards: Full card is tappable, exceeds minimum
- FAB: 56x56px/dp - ✓

### Color Contrast
- Nav text (#212121 on #FFFFFF): 16.9:1 ✓
- Banner text (#E65100 on #FFF3E0): 5.8:1 ✓
- Tab text (active #1565C0 on #FFFFFF): 7.2:1 ✓
- Post card text (#212121 on #FFFFFF): 16.9:1 ✓
- Post metadata (#757575 on #FFFFFF): 4.6:1 ✓

### Focus Indicators
- All interactive elements have clear focus states
- iOS: VoiceOver yellow outline
- Android: TalkBack green rectangle

---

## Animations & Transitions

### Screen Entry (from Tutorial)
**Slide In:**
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)
- Feed cards fade in with stagger (100ms delay per card)

---

### Pull-to-Refresh
**Loading Animation:**
- Pull down from top of feed
- Show refresh indicator (spinner + "Fetching latest posts...")
- Feed updates, cards fade in (200ms per card)

---

### Tab Switch Animation
**Underline Slide:**
- Duration: 200ms
- Easing: Ease-in-out
- Underline slides from old tab to new tab position
- Feed cross-fades: Old posts fade out (100ms), new posts fade in (200ms delay)

---

### Post Card Tap
**Press Feedback:**
- Duration: 150ms
- Effect: Background color to light gray (#F5F5F5), scale 0.99
- Navigation to detail screen: Slide in from right (iOS) or shared element transition (Android)

---

### FAB Tap (Level 0 Modal)
**Modal Appear:**
- Background overlay: Fade in to 50% black (200ms)
- Modal: Slide up from bottom (iOS) or fade in (Android)
- Duration: 300ms, ease-out

---

### Banner Dismiss
**Fade Out:**
- Duration: 300ms
- Effect: Banner fades out + slides up
- Feed cards move up to fill space (animate layout change)

---

## Content Guidelines

### Copy Requirements
- **Banner Message:** Clear, concise (under 80 characters)
- **Empty State Messages:** Friendly, helpful (provide next steps)
- **Error Messages:** Specific, actionable (tell user what to do)
- **Post Metadata:** Relative time ("2 days ago" not "2024-02-10")

### Localization Notes
- String keys:
  - `home_nav_location`: "{metro_name}"
  - `home_banner_level0`: "You're viewing only. Verify phone to post and message."
  - `home_banner_verify_btn`: "Verify Now"
  - `home_tab_all`: "All"
  - `home_tab_housing`: "Housing"
  - `home_tab_jobs`: "Jobs"
  - `home_tab_emergency`: "Emergency"
  - `home_tab_travel`: "Travel"
  - `home_fab_hint`: "Create post"
  - `home_empty_housing`: "No housing posts in your area yet. Check back soon!"
  - `home_error_network`: "Could not load posts. Please check your connection and try again."

### Tone & Voice
- **Welcoming:** User just completed onboarding, celebrate their arrival
- **Helpful:** Banner guides user to next step (verification)
- **Transparent:** Explain why Level 0 is limited
- **Friendly:** Use casual language ("You're viewing only" not "Viewing mode: Read-only")

---

## Technical Notes

### Screen Identifier
- iOS: `HomeViewController` or `FeedViewController`
- Android: `HomeActivity` or `FeedFragment`
- Route name: `/home` or `/feed`

### State Management
**Screen State:**
- `selectedTab`: string ("all" | "housing" | "jobs" | "emergency" | "travel")
- `posts`: array of post objects
- `isLoading`: boolean
- `bannerDismissed`: boolean (session-scoped)
- `userTrustLevel`: number (0, 1, or 2)
- `metroAreaId`: string
- `metroName`: string

**Post Object:**
```javascript
{
  id: "post_123",
  category: "housing",
  title: "Private Room in Richardson",
  price: "$650/month",
  details: "Available March 1",
  photoUrl: "https://...",
  postedAt: "2024-02-10T10:30:00Z",
  metroAreaId: "dallas-fort-worth-arlington",
  authorVerified: true,
  authorTrustLevel: 1
}
```

---

### Navigation
**Entry Points:**
- From Screen 05 (Onboarding Tutorial) after tapping "Get Started"
- App launch (if user already onboarded)
- Deep link: `nusa://home` or `nusa://feed`

**Exit Points:**
- Tap "Verify Now" → Navigate to Journey #02 (Trust Level Verification)
- Tap post card → Navigate to Post Detail screen
- Tap Search icon → Navigate to Search screen
- Tap Notifications → Navigate to Notifications screen
- Tap FAB (Level 0) → Show verification modal → Navigate to Journey #02

---

### API Integration

**Endpoint:** `GET /posts?metro_area_id={id}&category={category}&limit=10&offset=0`
**Request Params:**
- `metro_area_id`: User's metro area ID (from user profile)
- `category`: "all" | "housing" | "jobs" | "emergency" | "travel"
- `limit`: Number of posts to fetch (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "posts": [
    {
      "id": "post_123",
      "category": "housing",
      "title": "Private Room in Richardson",
      "price": "$650/month",
      "details": "Available March 1",
      "photo_url": "https://...",
      "posted_at": "2024-02-10T10:30:00Z",
      "author": {
        "id": "user_456",
        "name": "Priya S.",
        "verified": true,
        "trust_level": 1
      }
    }
    // ... more posts
  ],
  "total": 47,
  "has_more": true
}
```

**Caching:**
- Cache posts in memory for current session
- Invalidate cache on pull-to-refresh
- Persist last 50 posts to disk for offline viewing

---

### Performance Considerations
- **Lazy load images:** Use progressive JPEG or WebP, load thumbnails first
- **Pagination:** Load 10 posts at a time (infinite scroll)
- **Skeleton loading:** Show placeholder cards while fetching
- **Debounce tab switches:** Wait 200ms before API call (prevent rapid tab tapping)
- **Cache posts:** Store in memory, reduce API calls

---

## Design References

### Inspiration
- **Nextdoor Feed:** Local posts with category tabs
- **Airbnb Listings:** Clean card-based feed with photos
- **Facebook Marketplace:** Category filtering, verified badges

### Design System Components Used
- Top Navigation Bar
- Banner (Level 0 warning)
- Tab Bar (Category tabs)
- Post Card (from design system)
- Floating Action Button (adapted for Level 0)

---

## Testing Checklist

### Functional Tests
- [ ] Feed loads posts from user's metro area
- [ ] Category tabs filter posts correctly
- [ ] Level 0 banner displays and is dismissible
- [ ] "Verify Now" button navigates to verification flow
- [ ] Post cards navigate to detail screen
- [ ] FAB shows verification modal for Level 0
- [ ] Pull-to-refresh updates feed
- [ ] Infinite scroll loads more posts

### Visual Tests
- [ ] All components display correctly
- [ ] Post cards have correct spacing and styling
- [ ] Banner has yellow background and warning icon
- [ ] FAB is semi-transparent (50% opacity)
- [ ] Category tabs show active underline
- [ ] Safe area insets respected

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Tab navigation works with screen reader

### Integration Tests
- [ ] API fetches posts correctly
- [ ] Posts filtered by category and metro area
- [ ] Images load and display properly
- [ ] Error states handled gracefully
- [ ] Empty states show correct messages

### Edge Case Tests
- [ ] No posts in category shows empty state
- [ ] Network error shows retry option
- [ ] Very long metro name truncates correctly
- [ ] Images fail gracefully (show placeholder)
- [ ] Pagination works smoothly

---

## Open Questions

- [ ] **Should we show "Featured" posts at top of feed?**
  - **Pro:** Highlights quality posts, rewards active users
  - **Con:** May feel like ads, reduces organic discovery
  - **Recommendation:** Not in Phase 1, consider for Phase 2

- [ ] **Should we allow filtering by distance? (e.g., within 10 miles)**
  - **Pro:** More precise local filtering
  - **Con:** Requires GPS permission, adds complexity
  - **Recommendation:** Add in Phase 2 as "Hyper-local" filter

- [ ] **Should we show post counts in category tabs? (e.g., "Housing (47)")**
  - **Pro:** Helps users prioritize active categories
  - **Con:** Clutters UI, may discourage exploring empty categories
  - **Recommendation:** A/B test - measure category engagement

- [ ] **Should banner be dismissible permanently or per session?**
  - **Current:** Per session (reappears on next launch)
  - **Alternative:** Permanent dismiss (only for 7 days, then reappears)
  - **Recommendation:** Per session, gradually reduce frequency after multiple dismissals

---

## Related Screens

**Previous Screen:** [05-onboarding-tutorial.md](./05-onboarding-tutorial.md)
**Next Screen:** Post Detail Screen (out of scope for this journey)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 13 (Success State)
- Journey #02: Trust Level Verification (user will likely proceed here next)
- Journey #07: Browse and Search Posts (user is already browsing)

---

**Wireframe Status:** Draft - Ready for Review
**Onboarding Journey Complete:** This is the final success state of Journey #01
