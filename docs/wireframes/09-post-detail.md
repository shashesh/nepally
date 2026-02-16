# Wireframe: Post Detail Screen

**Screen Number:** 09
**Feature Reference:** [in-app-chat.md](../features/in-app-chat.md) - Feature 8.2 (entry point), [phase1-feature-breakdown.md](../features/phase1-feature-breakdown.md) - Feature 5.4
**User Story:** As a user, I want to see the full details of a post so I can decide whether to contact the author.
**Last Updated:** 2026-02-15
**Status:** Draft

---

## Screen Purpose

Full-detail view of a single post. Shows all post fields, author info, and provides the "Contact Author" CTA that initiates the chat flow. This screen bridges browsing (home feed) to communication (chat).

**Key Goals:**
- Display all post information clearly
- Prominent "Contact Author" button (primary CTA)
- Show author trust level for safety
- Display expiry countdown
- Link to chat with post author

---

## Visual Layout

### Housing Post Example

```
┌─────────────────────────────────────────┐
│  ←                              ⋮       │ ← Header: back + kebab menu
├─────────────────────────────────────────┤
│                                         │
│  🏠 Housing                             │ ← Category badge
│                                         │
│  Private Room in Richardson             │ ← Title (H2, bold)
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │ ← Photo placeholder (if photos)
│  │         [Photo 1 of 3]           │  │    Full width, 200px height
│  │                                   │  │    Swipeable carousel
│  │                        1 / 3      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Details ──────────────────────────  │
│                                         │
│  💰 Rent           $650/month           │ ← Field rows
│  📅 Move-in        March 1, 2026        │
│  🛏️ Room Type      Private Room         │
│  📍 Location       Richardson, TX       │
│  ⏰ Expires        in 28 days           │
│                                         │
│  ── Description ──────────────────────  │
│                                         │
│  Clean, furnished room in 2BR           │
│  apartment. Close to DART rail.         │
│  Utilities included. No smoking.        │
│                                         │
│  ── Posted By ────────────────────────  │
│                                         │
│  [RK]  Ram K.  ✓ Verified              │ ← Author info row
│        Member since Jan 2026            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      💬  Contact Author           │  │ ← Primary CTA button
│  └───────────────────────────────────┘  │
│                                         │
│  Posted Feb 1, 2026 • Dallas-Fort Worth │ ← Footer metadata
│                                         │
└─────────────────────────────────────────┘
```

### Level 0 User View

```
┌─────────────────────────────────────────┐
│  ←                              ⋮       │
├─────────────────────────────────────────┤
│  ⚠️ Verify phone to contact poster     │ ← Level 0 banner
│     [Verify Now]                        │
├─────────────────────────────────────────┤
│                                         │
│  🏠 Housing                             │
│                                         │
│  Private Room in Richardson             │
│                                         │
│  ... (same details as above) ...        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      💬  Verify to Message        │  │ ← Disabled CTA (gray)
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Header Bar

**Type:** Navigation bar
**Height:** 44px (iOS) / 56dp (Android)
**Background:** White (#FFFFFF)

**Components:**
- **Back button:** ← chevron, #1565C0, navigates to previous screen
- **Kebab menu (⋮):** 24px, #757575
  - Menu items: "Report Post" (future), "Share" (future)
  - For author's own post: "Edit Post", "Delete Post" (future)

---

### 2. Category Badge

**Type:** Inline label
**Layout:** Icon + category name
- **Icon:** Category emoji (🏠/💼/🚨/✈️), 20px
- **Text:** "Housing" / "Jobs" / "Emergency" / "Travel"
- **Typography:** 13pt/12sp Semibold, category color
- **Background:** Category color at 10% opacity, pill shape, 8px padding

---

### 3. Post Title

**Typography:** 28pt/28sp Bold (H2), #212121
**Max lines:** 3
**Margin:** 8px below category badge, 16px above photos

---

### 4. Photo Carousel (if photos exist)

**Height:** 200px
**Width:** Full screen width minus 32px padding
**Corner radius:** 12px
**Behavior:** Swipeable horizontally (dots indicator at bottom)
**Counter:** "1 / 3" pill at bottom-right
**Placeholder:** If no photos, section is hidden entirely

---

### 5. Details Section

**Section header:** "Details" with horizontal rule
**Typography:** 13pt Semibold, #757575, uppercase

**Field Rows:**
Each row is a horizontal layout:
- **Icon:** 20px, category-appropriate color
- **Label:** 15pt Regular, #757575, 120px fixed width
- **Value:** 15pt Semibold, #212121, flex

**Fields by Category:**

| Category | Fields Shown |
|----------|-------------|
| Housing | Rent, Move-in Date, Room Type, Location, Expires |
| Jobs | Pay Range, Employment Type, Company, Location, Expires |
| Emergency | Emergency Type, Urgency, Location, Expires |
| Travel | Travel Date, Route, Airline, Expires |

**Expiry display:**
- Active: "in 28 days" (#2E7D32 green)
- Expiring soon (≤3 days): "in 2 days" (#F57C00 amber)
- Expired: "Expired" (#C62828 red)

**Row height:** 40px, with 1px #F5F5F5 divider between rows

---

### 6. Description Section

**Section header:** "Description" with horizontal rule
**Typography:** 16pt/16sp Regular, #212121
**Line height:** 24px
**Max display:** 200 chars initially, "Read more" if longer
**"Read more":** Text button, #1565C0, expands to full text

---

### 7. Author Section

**Section header:** "Posted By" with horizontal rule

**Layout:**
- **Avatar:** 40x40px circle, initials, #1565C0 at 15% opacity
- **Name:** "Ram K." (17pt Semibold, #212121)
- **Trust badge:** ✓ Verified (16px, #2E7D32) or ✓✓ Contributor (#1565C0)
- **Subtitle:** "Member since Jan 2026" (13pt Regular, #757575)
- **Touch target:** Tap row → navigate to public profile (future)

---

### 8. Contact Author Button (Primary CTA)

**Type:** Primary button (full width)
**Height:** 48px
**Background:** #1565C0 (Primary Blue)
**Corner radius:** 8px
**Margin:** 24px top, 16px horizontal

**Content:**
- **Icon:** 💬 chat bubble, 20px, white
- **Text:** "Contact Author" (17pt Semibold, #FFFFFF)
- **Alignment:** Center, icon left of text with 8px gap

**States:**
| State | Background | Text | Condition |
|-------|-----------|------|-----------|
| Default | #1565C0 | White | Level 1+ user, not own post |
| Pressed | #104D99 | White | Tap feedback |
| Disabled (Level 0) | #BDBDBD | White | Level 0 user |
| Disabled (Own Post) | Hidden | — | Author viewing own post |
| Loading | #1565C0 + spinner | Hidden | Creating conversation |

**Level 0 text:** "Verify to Message" (instead of "Contact Author")
**Level 0 action:** Tap → show verification prompt alert

**Level 1+ action:**
1. Tap button
2. Show loading spinner in button
3. Check if conversation exists (user pair + post)
4. If exists: navigate to MessageThreadScreen
5. If new: create conversation + participants → navigate to MessageThreadScreen

**Accessibility:** "Contact Author, button" / "Verify to Message, button, disabled"

---

### 9. Footer Metadata

**Typography:** 13pt/12sp Regular, #757575
**Content:** "Posted Feb 1, 2026 • Dallas-Fort Worth"
**Alignment:** Center
**Margin:** 16px top, 32px bottom (scroll padding)

---

## Interaction Details

### Primary Flow (Contact Author)
1. User taps PostCard on HomeScreen → navigates here
2. User reviews post details (scrolls through fields, photos)
3. User taps "Contact Author"
4. Button shows loading spinner
5. System checks for existing conversation
6. Conversation created (or existing found)
7. Navigate to MessageThreadScreen

### PostCard Message Icon Flow
When user taps the message icon directly on PostCard (bypasses this screen):
1. Same logic as step 5-7 above
2. Navigate directly to MessageThreadScreen
3. Post context bar in thread shows post info

### Scroll Behavior
- Full page scroll (not nested scroll views)
- CTA button scrolls with content (not fixed at bottom)
- Bottom padding ensures CTA is visible when scrolled to bottom

---

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| Own post | "Contact Author" button hidden, show "Edit Post" instead (future) |
| Level 0 user | Banner at top, CTA says "Verify to Message" (gray) |
| Post expired | Show "Expired" badge, CTA still works (can still message) |
| Post removed by moderator | Show "This post has been removed" message, no CTA |
| Author account deleted | Author shows "[Deleted User]", CTA hidden |
| No photos | Photo carousel section hidden entirely |
| Network error | Show retry banner, cached data if available |
| Conversation creation fails | Show error toast, button resets to default state |
| Very long description | Truncate at 200 chars with "Read more" |

---

## Data Requirements

**Fetch post:**
```typescript
const { data } = await supabase
  .from('posts')
  .select(`*, author:users!posts_author_id_fkey (id, full_name, trust_level, created_at)`)
  .eq('id', postId)
  .single();
```

**Check existing conversation:**
```typescript
const { data } = await supabase
  .from('conversations')
  .select(`*, participants:conversation_participants(user_id)`)
  .eq('post_id', postId)
  .contains('participants', [{ user_id: currentUserId }, { user_id: authorId }]);
```

---

## Navigation

**Entry Points:**
- Tap PostCard on HomeScreen
- Tap post context bar in MessageThreadScreen
- Deep link: `nusa://post/{postId}`

**Exit Points:**
- Back button → previous screen (HomeScreen or MessageThreadScreen)
- "Contact Author" → MessageThreadScreen
- Author name → Public ProfileScreen (future)

**Params received:**
- `postId: string` — which post to display

---

## Accessibility

- [ ] Screen title: "Post detail"
- [ ] All field labels and values announced together
- [ ] Photos carousel announces "Photo 1 of 3"
- [ ] CTA button state clearly announced (enabled/disabled)
- [ ] Level 0 banner text readable
- [ ] Touch targets: all buttons 44px+ minimum
- [ ] Category colors have sufficient contrast with backgrounds

---

## Related Screens

**Previous:** [06-home-screen-level-0.md](./06-home-screen-level-0.md) (tap PostCard)
**Next:** [08-message-thread.md](./08-message-thread.md) (Contact Author)
**Feature:** [in-app-chat.md](../features/in-app-chat.md)

---

**Wireframe Status:** Draft - Ready for Review
