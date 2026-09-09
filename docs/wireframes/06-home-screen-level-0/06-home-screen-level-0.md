# Wireframe: Home Screen (Level 0)

> **Screen:** 06 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 13
> **Story:** As a new Level 0 user who just completed onboarding, I want to browse local and global posts in my metro area so I can find relevant community content tagged with Housing, Jobs, Help, and more.

---

## Screen Purpose + Key Goals

This is the success state of the onboarding journey - the main home screen (local feed). For Level 0 users, it shows:
- Local posts from their metro area + global posts from premium users
- Level 0 banner promoting verification
- Tag filter chips for filtering content (Housing, Jobs, Help, Question, Politics, Discussion, Emergency)
- Floating + button (slightly disabled for Level 0)

**Key Goals:**
- Show user that onboarding worked (seeing real local posts)
- Encourage verification through prominent banner
- Enable browsing and exploring content
- Set expectations for Level 0 limitations (view-only)
- Provide clear path to Level 1 verification
- Display Local/Global badges on post cards

---

## Visual Wireframe

::: nav
📍 New York-Newark-Jersey City ▼ {.location-dropdown}
&nbsp;&nbsp;&nbsp;&nbsp;🔍 {.icon-button} &nbsp; 💬 {.icon-button} &nbsp; 🔔 {.icon-button}
:::

::: alert warning
⚠️ You're viewing only. Verify phone to post and message. &nbsp; [Verify Now]{.outline} &nbsp; ✕ {.dismiss}
:::

::: nav
[*All*] &nbsp; [Housing] &nbsp; [Jobs] &nbsp; [Help] &nbsp; [More ▼]
:::

::: card
**[SG]** &nbsp; Sita Gurung ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 2h ago

### Looking for Nepali Roommate
📍 Local {.badge-local}

Looking for Nepali roommate to share 2BR apartment near UTD campus. Clean, quiet environment. Rent is $800/month including utilities... [View More]{.outline}

![Photo thumbnail](assets/placeholder.png)

`🏠 Housing` &nbsp; `❓ Question`

---

❤️ 24 &emsp;&emsp; 💬 5
:::

::: card
**[RK]** &nbsp; Rajesh K. ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 5h ago

### Hiring Line Cooks - Nepali Rest.
🌐 Global {.badge-global}

We're hiring experienced line cooks for our new Nepali restaurant...

`💼 Jobs` &nbsp; `🤝 Help`

---

❤️ 8 &emsp;&emsp; 💬 2
:::

[+]*{.fab state:semi-disabled}

[[ *Home* | Post | Events | Marketplace | Profile ]]

---

### Empty State (No Posts Matching Tags)

::: card
![Empty state illustration](assets/empty-mountain.png)

No posts matching your filters. That's okay!

Try different tags or check back later.
:::

---

### Empty State (First User in Metro)

::: card
![Empty state illustration](assets/empty-mountain.png)

Be the first to post in [Metro Name]!

[Verify Phone to Post]*
:::

---

### Network Error State

::: alert error
Could not load posts. Please check your connection and try again.

[Retry]*
:::

---

### FAB Verification Modal (Level 0)

::: modal
### Verify Your Phone to Post

You need to verify your phone number to create posts and message others.

[Verify Now]* &nbsp; [Cancel]{.secondary}
:::

---

## Component Specifications

### 1. Top Navigation Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation bar | App bar |
| **Height** | 44–56px (flexible for 2-line location) | 56–72dp (flexible for 2-line location) |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px bottom border #E0E0E0 | elevation 2dp |

**Components (left to right):**

#### Location Dropdown
- **Label:** User's metro area name (e.g., "New York-Newark-Jersey City")
- **Icon:** Location pin (📍) prefix, Chevron down (▼) suffix, 16px/dp, #757575
- **Typography:** 17pt/16sp Semibold, #212121
- **Touch Target:** Full text + icon, minimum 44x44pt / 48x48dp
- **Interaction:** Tap to open location switcher sheet
- **Multi-line:** Allow up to 2 lines for long metro names
- **Max Width:** 60% of screen width (to leave room for icons)
- **Visiting Indicator:** "(Visiting)" label shown when browsing temporarily

#### Search Icon
- **Icon:** Magnifying glass (🔍), 24x24px/dp
- **Position:** Top-right, first icon in icon group
- **Touch Target:** 44x44pt / 48x48dp
- **Interaction:** Tap to open search screen
- **Color:** #757575 (Medium Gray)

#### Messages Icon (NEW)
- **Icon:** Chat bubbles (💬), 24x24px/dp
- **Position:** Between Search and Notifications icons
- **Touch Target:** 44x44pt / 48x48dp
- **Badge:** Red circle with unread count (if > 0)
  - Shows number for 1-99, shows "99+" for higher
  - Badge size: 16px diameter minimum
  - Badge color: #DC143C (Accent Red)
  - Badge text: White, 10pt/9sp Bold
- **Interaction:** Tap to navigate to Messages/Conversations screen
- **Color:** #757575 (Medium Gray), badge: #DC143C (Accent Red)

#### Notification Bell Icon
- **Icon:** Bell (🔔), 24x24px/dp
- **Position:** Far top-right, 16px/dp from edge
- **Touch Target:** 44x44pt / 48x48dp
- **Badge:** Red dot (8px) if unread notifications
- **Interaction:** Tap to open notifications screen
- **Color:** #757575 (Medium Gray), badge: #DC143C (Accent Red)

**a11y:**
- Location: "Dallas-Fort Worth, button, change location"
- Search: "Search button"
- Notifications: "Notifications, [X unread]"

---

### 2. Level 0 Banner (Verification Prompt)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Dismissible banner | Dismissible banner |
| **Height** | 64px | 72dp |
| **Background** | #FFF3E0 (Light Amber) | #FFF3E0 (Light Amber) |
| **Padding** | 12px all around | 16dp all around |
| **Border** | None or 1px bottom #F57C00 | None or 1px bottom #F57C00 |

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
- Default: Visible for Level 0 users
- Dismissed: Hidden until next app launch
- Pressed (Verify Now): Darken blue text color
- Pressed (X): Fade out banner (300ms)

**a11y:**
- Full text: "Warning. You're viewing only. Verify phone to post and message. Verify Now button. Close button."
- Verify Now: "Verify Now, button"
- Dismiss: "Close banner, button"

**Behavior:**
- Always shown on first home screen load for Level 0 users
- Dismissible per session (reappears on next app launch)
- Permanently hidden once user reaches Level 1

---

### 3. Tag Filter Chips

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Non-scrollable chip bar | Non-scrollable chip bar |
| **Height** | 48px | 48dp |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px bottom border #E0E0E0 | elevation on Android |
| **Layout** | Flexbox row, no horizontal scroll | Flexbox row, no horizontal scroll |

**Visible Chips (4-5 based on screen width):**
- All (always first, always visible)
- Housing
- Jobs
- Help
- [More ▼] (always last, opens sheet with remaining tags)

**"More" Dropdown Sheet:**
- **Trigger:** Tap "More" chip
- **Type:** Bottom sheet modal
- **Content:** Grid/list of remaining tags (Question, Politics, Discussion, Emergency)
- **Multi-select:** Checkmarks indicate selected tags
- **Actions:** "Apply" button to confirm, "Clear" to deselect all
- **Close:** Tap outside, swipe down, or tap Apply

**Chip Styling:**
- **Shape:** Pill-shaped (border-radius: 20px/dp)
- **Height:** 32px/dp
- **Padding:** 12px/dp horizontal, 6px/dp vertical
- **Typography:** 14pt/13sp Medium
- **Colors:**
  - Active chip: White text on #1565C0 (Primary Blue) background
  - Inactive chips: #757575 text on #F5F5F5 background, 1px border #E0E0E0
  - "More" chip: #757575 text on #F5F5F5 background, chevron-down icon
  - "More" chip (with selections): #1565C0 text, shows count badge (e.g., "More +2")
- **Icon:** Optional tag emoji prefix (e.g., 🏠 Housing, 💼 Jobs)
- **Spacing:** 8px/dp between chips

**Interaction:**
- Tap visible chip → Toggle filter on/off (multi-select supported)
- Tap "More" chip → Open tag selector sheet
- "All" chip resets all filters (clears both visible and "More" selections)
- Active chips have filled blue background
- Smooth animation: Chip fills with color (150ms)
- Multiple chips can be active simultaneously (e.g., Housing + Jobs + Question)

**a11y:**
- Each chip: "Housing filter, selected" or "Jobs filter, not selected"
- "More" chip: "More filters, button, 2 selected" (if applicable)
- VoiceOver/TalkBack: Navigate between chips
- Sheet is fully accessible with focus trap

**Initial State:**
- "All" chip is active (no filtering)
- Feed shows all posts (local + global)
- "More" chip shows no badge (no additional filters active)

**Responsive Behavior:**
- On narrow screens: Show 4 chips + "More"
- On wider screens: Show 5 chips + "More"
- Chips don't wrap to second line

---

### 4. Post Feed (Scrollable List)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | UITableView / UICollectionView | RecyclerView |
| **Background** | #F5F5F5 (Light Gray) | #F5F5F5 (Light Gray) |
| **Padding** | 16px on sides, 12px between cards | 16dp on sides, 12dp between cards |
| **Pull-to-Refresh** | Native iOS refresh control | Material SwipeRefreshLayout |

**Empty State:**
- If no posts matching selected tags: Show illustration + message
- Message: "No posts matching your filters in this area. Try different tags!"
- Illustration: Empty state graphic (subtle mountain silhouette)

**Loading State:**
- Show skeleton cards (3 placeholder cards with shimmer animation)
- Or show spinner in center if first load

---

### 5. Post Card (Enhanced — with Author, Description, Tags, Badge, Social Actions)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Card component (tappable) | Material Card (tappable) |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px solid #E0E0E0 | elevation 2dp |
| **Corner Radius** | 12px | 12dp |
| **Padding** | 16px all around | 16dp all around |
| **Margin** | 16px L/R, 12px between cards | 16dp L/R, 12dp between cards |
| **Shadow** | 0 2px 4px rgba(0,0,0,0.1) | elevation 2dp |

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

#### Header Row (Title)
- **Title:** "Looking for Nepali Roommate" (17pt/16sp Semibold, #212121)
- **Layout:** Title only (left-aligned, wraps to 2 lines max)
- **Margin:** 12px/dp from author row

#### Local/Global Badge

| Property | Local | Global |
|----------|-------|--------|
| **Content** | 📍 Local | 🌐 Global |
| **Typography** | 12pt/11sp Medium | 12pt/11sp Medium |
| **Text Color** | #388E3C | #1565C0 |
| **Background** | #E8F5E9 | #E3F2FD |
| **Shape** | Pill (border-radius: 12px) | Pill (border-radius: 12px) |
| **Padding** | 6px H, 2px V | 6px H, 2px V |

- **Position:** Below title, left-aligned
- **Margin:** 4px/dp from title
- **Visibility:** Always shown on every post card

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
- **Example:** "Looking for Nepali roommate to share 2BR apartment near UTD campus. Clean, quiet environment. Rent is $800/month including utilities... View More"
- **Margin:** 8px/dp from badge

#### Photo Thumbnail (if post has photo)
- **Dimensions:** Full card width x 160px/dp height
- **Corner Radius:** 8px/dp
- **Margin:** 12px/dp top and bottom
- **Placeholder:** Gray background (#F5F5F5) with image icon if no photo
- **Interaction:** Tap image to view full screen (Level 0: works normally)
- **Position:** After description preview

#### Tag Pills Row (NEW)
- **Type:** Horizontal row of pill-shaped tag badges
- **Position:** Below photo (or below description if no photo)
- **Margin:** 8px/dp from photo, 12px/dp before action bar
- **Pill Styling:**
  - **Shape:** Pill (border-radius: 12px/dp)
  - **Height:** 24px/dp
  - **Padding:** 8px/dp horizontal, 4px/dp vertical
  - **Background:** Tag-specific color at 15% opacity (e.g., Housing green at 15%)
  - **Text:** Tag icon + name (e.g., "🏠 Housing")
  - **Typography:** 11pt/10sp Medium, tag-specific color
  - **Spacing:** 6px/dp between pills
- **Max Display:** Show up to 3 pills (all assigned tags)
- **Interaction:** Tap tag pill → Activate that tag in filter chips above
- **Examples:**
  - `[🏠 Housing]` `[❓ Question]`
  - `[💼 Jobs]` `[🤝 Help]`

#### Action Bar (NEW — Social Engagement)

| Property | iOS | Android |
|----------|-----|---------|
| **Height** | 36px | 36dp |
| **Background** | Transparent (part of card) | Transparent (part of card) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Padding** | 8px vertical | 8dp vertical |
| **Layout** | Horizontal row, 2 actions, evenly spaced | Horizontal row, 2 actions, evenly spaced |

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
- **a11y:** "Like button, [liked/not liked], 24 likes"

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
- **a11y:** "Comment button, 5 comments"

**Action Bar Layout:**
- [❤️ 24] ............ [💬 5]
- Equal spacing between actions
- Left-aligned within card padding

**States:**
- Default: All icons outline, light gray
- Like Active: Heart filled, red color
- Pressed (Like): Scale animation, instant feedback
- Pressed (Comment): Ripple effect (Android) or highlight (iOS)
- Disabled (Level 0): Like icon grayed out, tooltip on tap

**Interaction:**
- **Tap card body:** Open post detail screen
- **Tap author avatar/name:** Show popup menu with "View Profile" / "Chat" (hidden on own posts)
- **Tap like button:** Toggle like (Level 1+), show verification toast (Level 0)
- **Tap comment button:** Navigate to post detail, scroll to comments
- **Tap "View More":** Navigate to post detail screen

**a11y:**
- Full card structure:
  - "Posted by Sita Gurung, verified, 2 hours ago"
  - "Looking for Nepali Roommate. Local post."
  - "Description: Looking for Nepali roommate to share 2BR apartment..."
  - "Tags: Housing, Question."
  - "24 likes, 5 comments. Like button. Comment button."
- Each action is individually focusable for screen readers
- VoiceOver/TalkBack can navigate through avatar, title, actions separately

---

### 5a. Avatar Tap Menu

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Popup menu anchored to avatar | Popup menu anchored to avatar |
| **Background** | #FFFFFF (White) | #FFFFFF (White) |
| **Corner Radius** | 8px | 8dp |
| **Shadow** | 0 2px 8px rgba(0,0,0,0.15) | elevation 4dp |
| **Padding** | 8px vertical | 8dp vertical |

**Menu Options:**

| Option | Icon | Action |
|--------|------|--------|
| View Profile | person-outline, 20px/dp, #212121 | Navigate to user profile screen |
| Chat | chat-bubble-outline, 20px/dp, #212121 | Open/create 1:1 conversation |

**Option Row Styling:**
- Height: 44px / 48dp
- Padding: 16px/dp horizontal
- Font: 15pt/14sp Regular, #212121
- Icon: 20px/dp, left of label, 12px/dp gap
- Touch target: Full row width, 44px/48dp height

**Visibility Rules:**
- Chat option hidden on own posts
- Chat requires Level 1+; Level 0 users see "Verify to Message" prompt on tap
- Menu not shown when tapping own avatar (no Chat option means only "View Profile")

**Dismiss:** Tap outside the menu or tap a menu option

**a11y:** "User menu. View Profile, button. Chat, button."

---

### 6. Floating Action Button (FAB) — Create Post

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Floating Action Button | Material FAB (standard) |
| **Dimensions** | 56x56px circle | 56x56dp circle |
| **Position** | Bottom-right, 16px from edges | Bottom-right, 16dp from edges |
| **Background** | #1565C0 at 50% opacity (Level 0) | #1565C0 at 50% opacity (Level 0) |
| **Icon** | + (plus), 24x24px, white | + (plus), 24x24dp, white |
| **Shadow** | 0 4px 8px rgba(0,0,0,0.2) | elevation 6dp |

**States:**
- Level 0 (current): 50% opacity, semi-transparent
- Level 1+: Full opacity (100%), bright blue
- Pressed: Scale 0.95, darker blue

**Interaction:**
- **Tap (Level 0):** Show modal with verification prompt
  - Modal title: "Verify Your Phone to Post"
  - Modal message: "You need to verify your phone number to create posts and message others."
  - Modal buttons: "Verify Now" (primary) and "Cancel" (secondary)
- **Tap (Level 1+):** Open "Create Post" screen (not in this journey)

**a11y:**
- Label: "Create post, button, requires verification"
- Hint: "Verify your phone to unlock posting"
- Trait: Button

**Visual Cue:**
- Semi-transparent appearance signals "not fully enabled"
- Users can still tap to learn why it's disabled

---

### 7. Bottom Navigation Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Tab bar | Bottom navigation |
| **Height** | 56px + safe area | 56dp |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px top border #E0E0E0 | elevation 8dp |
| **Position** | Fixed at bottom | Fixed at bottom |

**Tabs (left to right):**

| Tab | Icon (Active) | Icon (Inactive) | Label | Active Color | Inactive Color | Notes |
|-----|---------------|-----------------|-------|-------------|----------------|-------|
| Home | Home filled | Home outline | "Home" | #1565C0 | #757575 | — |
| Create Post | Add circle | Add circle | "Post" | #1565C0 | #757575 | FAB provides same functionality |
| Events (NEW) | Calendar filled | Calendar outline | "Events" | #1565C0 | #757575 | Coming Soon placeholder in Phase 1 |
| Marketplace (NEW) | Storefront filled | Storefront outline | "Marketplace" | #1565C0 | #757575 | Coming Soon placeholder in Phase 1 |
| Profile | Person filled | Person outline | "Profile" | #1565C0 | #757575 | — |

**Note:** Search and Messages have been moved to the top navigation bar. Messages icon in top nav shows unread badge.

---

## Spacing & Layout

### Vertical Layout (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Top safe area | Auto | — |
| 2 | Top nav bar | 44px / 56dp | — |
| 3 | Level 0 banner | 64px / 72dp (dismissible) | — |
| 4 | Tag filter chips | 48px/dp | — |
| 5 | Feed padding | — | 12px/dp top |
| 6 | Post card 1 | ~400px (with photo, tags, badge) | 12px/dp |
| 7 | Post card 2 | ~400px | 12px/dp |
| 8 | Post card 3 | ~400px | 12px/dp |
| 9 | Continue scrolling | Infinite scroll or pagination | — |
| 10 | Bottom padding | 80px/dp (FAB clearance) | — |

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
4. **User browses posts** → Scrolls through feed (local + global mixed)
5. **User taps tag filter chip** (optional) → Feed filters by tag
6. **User taps post card** → Opens post detail screen
7. **User sees "Verify to Message" prompt on detail screen**
8. **User returns to home screen, taps "Verify Now" in banner**
9. **Navigate to Journey #02 (Trust Level Verification)**

### Alternative Flow (Create Post Attempt)
1. **User taps FAB (+ button)**
2. **Modal appears:** "Verify Your Phone to Post"
3. **User taps "Verify Now"** → Navigate to Journey #02
4. **User taps "Cancel"** → Modal closes, returns to feed

### Alternative Flow (Filter by Tag)
1. **User taps "Jobs" chip**
2. **Chip fills with blue** (selected state)
3. **Feed updates to show only posts tagged with Jobs** (loading spinner, then posts)
4. **User can tap additional chips** to further narrow (multi-select)
5. **User taps "All" chip** to reset all filters

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

### Edge Case: No Posts Matching Tags
**Scenario:** User selects "Emergency" filter chip, but no emergency-tagged posts in their metro area
**Behavior:**
- Show empty state illustration (mountain silhouette)
- Message: "No posts matching your filters. That's okay!"
- Subtext: "Try different tags or check back later."

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

## Accessibility

### Screen Reader Support
- **Screen Title:** "Home Screen, Dallas-Fort Worth"
- **Reading Order:**
  1. "Dallas-Fort Worth, button, change location"
  2. "Search button"
  3. "Notifications, 2 unread"
  4. "Warning. You're viewing only. Verify phone to post and message. Verify Now button. Close button."
  5. "Filter chips: All, Housing, Jobs, Help, Question, Politics, Discussion, Emergency. All selected."
  6. "Post. Looking for Nepali Roommate. Local. Verified user. Tags: Housing, Question. 24 likes, 5 comments. Button."
  7. [Repeat for each post card]
  8. "Create post, button, requires verification"

### Touch Targets
- All nav buttons (Location, Search, Notifications): 44x44pt / 48x48dp — ✓
- Banner buttons (Verify Now, X): 44x44pt / 48x48dp — ✓
- Category tabs: Full height (48px/dp), minimum 44x44pt / 48x48dp width
- Post cards: Full card is tappable, exceeds minimum
- Tag pills: Minimum 44x44pt / 48x48dp touch target
- FAB: 56x56px/dp — ✓

### Color Contrast

| Element | Ratio | Level |
|---------|-------|-------|
| Nav text (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Banner text (#E65100 on #FFF3E0) | 5.8:1 | AA ✓ |
| Tab text (active #1565C0 on #FFFFFF) | 7.2:1 | AAA ✓ |
| Post card text (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Post metadata (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |

### Focus Indicators
- All interactive elements have clear focus states
- iOS: VoiceOver yellow outline
- Android: TalkBack green rectangle

---

## Animations & Transitions

### Screen Entry (from Tutorial)

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen | 0ms | 300ms | iOS: Slide in from right; Android: Slide up from bottom |
| 2 | Feed cards | 100ms stagger per card | 200ms each | Fade in |

---

### Pull-to-Refresh
- Pull down from top of feed
- Show refresh indicator (spinner + "Fetching latest posts...")
- Feed updates, cards fade in (200ms per card)

---

### Tab Switch (Chip Toggle)
- **Duration:** 150ms
- **Easing:** Ease-in-out
- Chip fills with color (active) or returns to neutral (inactive)
- Feed cross-fades: Old posts fade out (100ms), new posts fade in (200ms delay)

---

### Post Card Tap
- **Duration:** 150ms
- **Effect:** Background color to light gray (#F5F5F5), scale 0.99
- Navigation to detail screen: Slide in from right (iOS) or shared element transition (Android)

---

### FAB Tap (Level 0 Modal)
- Background overlay: Fade in to 50% black (200ms)
- Modal: Slide up from bottom (iOS) or fade in (Android)
- **Duration:** 300ms, ease-out

---

### Banner Dismiss
- **Duration:** 300ms
- **Effect:** Banner fades out + slides up
- Feed cards move up to fill space (animate layout change)

---

## Content & Localization

### Copy Requirements
- **Banner Message:** Clear, concise (under 80 characters)
- **Empty State Messages:** Friendly, helpful (provide next steps)
- **Error Messages:** Specific, actionable (tell user what to do)
- **Post Metadata:** Relative time ("2 days ago" not "2024-02-10")

### String Keys

| Key | Value |
|-----|-------|
| `home_nav_location` | {metro_name} |
| `home_banner_level0` | You're viewing only. Verify phone to post and message. |
| `home_banner_verify_btn` | Verify Now |
| `home_chip_all` | All |
| `home_chip_{tag_slug}` | Dynamic from tags table |
| `home_fab_hint` | Create post |
| `home_empty_tags` | No posts matching your filters in this area. Try different tags! |
| `home_error_network` | Could not load posts. Please check your connection and try again. |
| `home_badge_local` | Local |
| `home_badge_global` | Global |

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
- `selectedTags`: string[] (tag slugs, empty = "All")
- `availableTags`: Tag[] (from tags table)
- `posts`: array of post objects (with tags and is_global)
- `isLoading`: boolean
- `bannerDismissed`: boolean (session-scoped)
- `userTrustLevel`: number (0, 1, or 2)
- `metroAreaId`: string
- `metroName`: string

**Post Object:**
```javascript
{
  id: "post_123",
  title: "Looking for Nepali Roommate",
  description: "Looking for Nepali roommate to share 2BR apartment near UTD campus...",
  tags: ["housing", "question"],
  tag_names: ["Housing", "Question"],
  is_global: false,
  photoUrl: "https://...",
  postedAt: "2026-02-10T10:30:00Z",
  metroAreaId: "dallas-fort-worth-arlington",
  author: {
    id: "user_456",
    name: "Sita Gurung",
    verified: true,
    trustLevel: 1
  },
  likes_count: 24,
  comments_count: 5
}
```

---

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | From Screen 05 (Onboarding Tutorial) — "Get Started" | This screen |
| Entry | App launch (if user already onboarded) | This screen |
| Entry | Deep link `nepally://home` or `nepally://feed` | This screen |
| Exit | Tap "Verify Now" | Journey #02 (Trust Level Verification) |
| Exit | Tap post card | Post Detail screen |
| Exit | Tap Search icon | Search screen |
| Exit | Tap Notifications | Notifications screen |
| Modal | Tap FAB (Level 0) | Verification modal → Journey #02 |

---

### API Integration

**Endpoint:** `GET /posts?metro_area_id={id}&tags={slugs}&limit=10&offset=0`

**Request Params:**
- `metro_area_id`: User's metro area ID (from user profile)
- `tags`: Comma-separated tag slugs (optional, empty = all tags)
- `limit`: Number of posts to fetch (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "posts": [
    {
      "id": "post_123",
      "title": "Looking for Nepali Roommate",
      "description": "Looking for Nepali roommate to share 2BR apartment near UTD...",
      "tags": [
        { "slug": "housing", "name": "Housing", "icon": "home", "color": "#4CAF50" },
        { "slug": "question", "name": "Question", "icon": "question", "color": "#9C27B0" }
      ],
      "is_global": false,
      "photo_url": "https://...",
      "posted_at": "2026-02-10T10:30:00Z",
      "likes_count": 24,
      "comments_count": 5,
      "author": {
        "id": "user_456",
        "name": "Sita Gurung",
        "verified": true,
        "trust_level": 1
      }
    }
  ],
  "total": 47,
  "has_more": true
}
```

**Note:** Feed includes both local posts (metro_area_id match) AND global posts (is_global = true) from any metro area. Global posts are mixed into the feed chronologically, not separated.

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
- **Reddit Feed:** Tag-based filtering with pill badges
- **Nextdoor Feed:** Local posts with community content
- **Airbnb Listings:** Clean card-based feed with photos
- **Facebook Marketplace:** Verified badges, card layout

### Design System Components Used
- Top Navigation Bar
- Banner (Level 0 warning)
- Filter Chips (Tag filter bar)
- Post Card (with tag pills, badge, social actions)
- Floating Action Button (adapted for Level 0)

---

## Testing Checklist

### Functional Tests
- [ ] Feed loads posts from user's metro area + global posts
- [ ] Tag filter chips filter posts correctly (multi-select)
- [ ] "All" chip resets filters
- [ ] Post cards show tag pills and Local/Global badge
- [ ] Level 0 banner displays and is dismissible
- [ ] "Verify Now" button navigates to verification flow
- [ ] Post cards navigate to detail screen
- [ ] FAB shows verification modal for Level 0
- [ ] Pull-to-refresh updates feed
- [ ] Infinite scroll loads more posts
- [ ] Tags load dynamically from database

### Visual Tests
- [ ] All components display correctly
- [ ] Post cards have correct spacing and styling
- [ ] Tag pills display with correct colors
- [ ] Local/Global badges display correctly
- [ ] Banner has yellow background and warning icon
- [ ] FAB is semi-transparent (50% opacity)
- [ ] Filter chips show active/inactive states correctly
- [ ] Safe area insets respected

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Tab navigation works with screen reader

### Integration Tests
- [ ] API fetches posts correctly
- [ ] Posts filtered by tags and metro area
- [ ] Global posts appear in local feed
- [ ] Tag data loads from tags table
- [ ] Images load and display properly
- [ ] Error states handled gracefully
- [ ] Empty states show correct messages

### Edge Case Tests
- [ ] No posts matching tags shows empty state
- [ ] Network error shows retry option
- [ ] Very long metro name truncates correctly
- [ ] Images fail gracefully (show placeholder)
- [ ] Pagination works smoothly
- [ ] Global posts display with correct badge
- [ ] Multiple tag filter selection works
- [ ] Posts with 1, 2, or 3 tags display correctly
- [ ] Tag pills don't overflow card width

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

| Relation | Screen |
|----------|--------|
| Previous | [05-onboarding-tutorial.md](../05-onboarding-tutorial/05-onboarding-tutorial.md) |
| Next | Post Detail Screen (out of scope for this journey) |
| Journey | [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 13 (Success State) |
| Related | Journey #02: Trust Level Verification (user will likely proceed here next) |
| Related | Journey #07: Browse and Search Posts (user is already browsing) |

---

**Status:** Draft — Ready for Review
**Onboarding Journey Complete:** This is the final success state of Journey #01
