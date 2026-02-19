# Wireframe: Post Detail Screen

**Screen Number:** 09
**Feature Reference:** [in-app-chat.md](../features/in-app-chat.md) - Feature 8.2 (entry point), [phase1-feature-breakdown.md](../features/phase1-feature-breakdown.md) - Feature 5.4
**User Story:** As a user, I want to see the full details of a post so I can decide whether to contact the author.
**Last Updated:** 2026-02-17
**Status:** Draft

---

## Screen Purpose

Full-detail view of a single post. Shows title, full description, tags, author info, Local/Global badge, and provides the "Contact Author" CTA that initiates the chat flow. This screen bridges browsing (home feed) to communication (chat).

**Key Goals:**
- Display all post information clearly
- Show tags and Local/Global badge
- Prominent "Contact Author" button (primary CTA)
- Show author trust level for safety
- Link to chat with post author

---

## Visual Layout

### Post Example

```
┌─────────────────────────────────────────┐
│  ←                              ⋮       │ ← Header: back + kebab menu
├─────────────────────────────────────────┤
│                                         │
│  Looking for Nepali Roommate near UTD   │ ← Title (H2, bold)
│                                         │
│  📍 Local                                │ ← Local/Global badge
│                                         │
│  ┌─────────┐ ┌──────────┐              │
│  │🏠Housing│ │❓Question│              │ ← Tag pills
│  └─────────┘ └──────────┘              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │ ← Photo carousel (if photos)
│  │         [Photo 1 of 3]           │  │    Full width, 200px height
│  │                                   │  │    Swipeable
│  │                        1 / 3      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Description ──────────────────────  │
│                                         │
│  Clean, furnished room in 2BR           │ ← Full description
│  apartment. Close to DART rail.         │
│  $800/month including utilities.        │
│  Move-in date flexible. No smoking.     │
│                                         │
│  📍 Richardson, TX                       │ ← Location
│                                         │
│  ── Posted By ────────────────────────  │
│                                         │
│  [RK]  Ram K.  ✓ Verified              │ ← Author info row
│        Member since Jan 2026            │
│                                         │
│  ❤️ 12    💬 3                            │ ← Like + Comment counts
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      💬  Contact Author           │  │ ← Primary CTA button
│  └───────────────────────────────────┘  │
│                                         │
│  ── Comments ─────────────────────────  │ ← Comments section
│  Comments (3)                           │
│                                         │
│  [PK]  Priya K.  ✓                      │ ← Comment 1
│         Is parking included?            │
│         1h ago                           │
│                                         │
│  [SG]  Sita G.  ✓  (Author)            │ ← Comment 2 (by author)
│         Yes, one spot included!         │
│         50m ago                          │
│                                         │
│  [RM]  Ram P.  ✓                        │ ← Comment 3
│         Interested! Sending message.    │
│         30m ago                          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Add a comment...             [↑] │  │ ← Comment input (Level 1+)
│  │                          0/1000   │  │    Sticky, auto-expand
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
│  Looking for Nepali Roommate near UTD   │
│  📍 Local                                │
│                                         │
│  ┌─────────┐ ┌──────────┐              │
│  │🏠Housing│ │❓Question│              │
│  └─────────┘ └──────────┘              │
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

### 2. Tag Pills

**Type:** Horizontal row of pill-shaped tag badges
**Position:** Below Local/Global badge
**Margin:** 8px below badge, 16px above photos

**Pill Styling:**
- **Shape:** Pill (border-radius: 12px)
- **Height:** 24px
- **Padding:** 8px horizontal, 4px vertical
- **Background:** Tag-specific color at 15% opacity
- **Text:** Tag icon + name (e.g., "🏠 Housing")
- **Typography:** 12pt/11sp Medium, tag-specific color
- **Spacing:** 6px between pills

**Interaction:** Tap tag pill → Navigate to home screen filtered by that tag

---

### 3. Post Title

**Typography:** 28pt/28sp Bold (H2), #212121
**Max lines:** 3
**Margin:** 16px horizontal, 8px below header

---

### 3a. Local/Global Badge

**Type:** Inline pill badge
**Position:** Below title
**Margin:** 4px below title

**Styling:**
- 📍 Local: #388E3C text on #E8F5E9 background
- 🌐 Global: #1565C0 text on #E3F2FD background
- **Shape:** Pill (border-radius: 12px)
- **Typography:** 12pt/11sp Medium
- **Padding:** 6px horizontal, 2px vertical

---

### 4. Photo Carousel (if photos exist)

**Height:** 200px
**Width:** Full screen width minus 32px padding
**Corner radius:** 12px
**Behavior:** Swipeable horizontally (dots indicator at bottom)
**Counter:** "1 / 3" pill at bottom-right
**Placeholder:** If no photos, section is hidden entirely

---

### 5. Description Section

**Section header:** "Description" with horizontal rule
**Typography:** 16pt/16sp Regular, #212121
**Line height:** 24px
**Max display:** Full text shown (no truncation on detail screen)

**Location Row:**
- **Icon:** 📍 Pin, 20px
- **Text:** "Richardson, TX" (15pt Regular, #757575)
- **Margin:** 16px below description text

---

### 5a. Engagement Row

**Position:** Below description section
**Layout:** Horizontal row with like and comment counts
**Margin:** 16px top

**Components:**
- **Like Button:** ❤️ Heart + count (e.g., "12")
  - Tappable to toggle like (Level 1+)
  - Level 0: grayed out, tap shows verification toast
- **Comment Count:** 💬 Bubble + count (e.g., "3")
  - Tappable to scroll to comments section
- **Typography:** 15pt/14sp Regular, #757575

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

### 9. Comments Section (NEW)

**Type:** Scrollable list of comments with input
**Position:** Below Contact Author button, above footer
**Background:** White (#FFFFFF)
**Margin:** 24px top from button

#### Comments Header
**Section header:** "Comments (5)" with horizontal rule
**Typography:** 17pt/16sp Semibold, #212121
**Count:** Dynamic based on number of non-deleted comments
**Display:** "Comments (0)" if no comments

#### Empty State (if no comments)
**Message:** "No comments yet. Be the first to comment!"
**Icon:** 💬 (chat bubble), 40px, #BDBDBD
**Typography:** 15pt/14sp Regular, #757575
**Layout:** Center-aligned, 60px vertical padding

#### Comment List (if comments exist)
**Type:** Vertical list of comment items
**Max initial display:** 3 most recent comments
**"Show all comments":** Link if > 3 comments, expands to full list
**Spacing:** 16px between comment items

#### Comment Item Layout
Each comment is a horizontal row:

```
┌─────────────────────────────────────────┐
│  [PK]  Priya Kumari  ✓                  │ ← Avatar + name + badge
│        Is parking included?             │ ← Comment text
│        1h ago                 [🗑️]       │ ← Timestamp + delete (own only)
└─────────────────────────────────────────┘
```

**Components:**
- **Avatar:** 32x32px circle
  - If profile photo: display photo
  - If no photo: initials (e.g., "PK")
  - Background color by trust level (Level 0: gray, Level 1: blue, Level 2: purple)
- **Name:** "Priya Kumari" (14pt/13sp Medium, #212121)
  - Max width: Truncate if > 20 chars
  - Position: To right of avatar, top-aligned
- **Trust Badge:** ✓ (verified checkmark), 14x14px, #2E7D32
  - Only shown for Level 1+
  - Position: To right of name
- **Comment Text:** User's comment content
  - Typography: 14pt/13sp Regular, #424242
  - Line height: 20px
  - Max lines: Unlimited (full text shown)
  - Max length: 1000 characters (enforced at input)
  - Position: Below name, left-aligned with name
- **Timestamp:** "1h ago" (12pt/11sp Regular, #757575)
  - Relative time: "5m ago", "2h ago", "1d ago", "2w ago"
  - Position: Below comment text, left-aligned
- **Delete Button:** 🗑️ (trash icon), 18x18px, #C62828
  - Only visible to comment author
  - Position: Far right, vertically centered with timestamp
  - Touch target: 44x44px minimum
  - Tap action: Confirmation dialog → delete comment

**Delete Confirmation Dialog:**
- **Title:** "Delete Comment"
- **Message:** "Are you sure you want to delete this comment? This cannot be undone."
- **Buttons:** "Cancel" (gray), "Delete" (red destructive)

**States:**
- **Default:** White background
- **Pressed (delete):** Fade out animation (300ms)
- **Deleted:** Removed from list immediately

---

#### Comment Input (Level 1+ users only)

**Type:** Multi-line text input with send button
**Position:** Bottom of comments section, sticky when scrolling
**Height:** Auto-expand as user types (48px default, 120px max)
**Background:** #F5F5F5 (Light Gray)
**Border:** 1px solid #E0E0E0
**Corner radius:** 8px
**Padding:** 12px all around
**Margin:** 16px from comments list, 16px from footer

**Layout:**
```
┌─────────────────────────────────────────┐
│  Add a comment...                  [↑]  │ ← Input + send button
│                                         │
│                              0/1000     │ ← Character counter
└─────────────────────────────────────────┘
```

**Components:**
- **Text Input:**
  - Placeholder: "Add a comment..."
  - Typography: 15pt/14sp Regular, #424242
  - Max length: 1000 characters
  - Multi-line: Expands up to 5 lines before scrolling internally
  - Text color: #212121
  - Placeholder color: #BDBDBD
- **Send Button:** ↑ (up arrow / paper plane icon)
  - Size: 32x32px circle
  - Position: Bottom-right corner of input
  - Background: #1565C0 (Primary Blue) when enabled, #BDBDBD when disabled
  - Icon color: White
  - Touch target: 44x44px minimum
  - **Disabled state:** when input is empty
  - **Enabled state:** when input has 1-1000 chars
  - **Loading state:** Spinner replaces icon when posting
- **Character Counter:** "0/1000"
  - Typography: 12pt/11sp Regular, #757575
  - Position: Bottom-right below input
  - Color changes to #C62828 (red) when at 950+ chars (warning)

**States:**
| State | Input Border | Send Button | Behavior |
|-------|-------------|-------------|----------|
| Default (empty) | #E0E0E0 | Gray (#BDBDBD), disabled | User can type |
| Active (typing) | #1565C0 | Blue (#1565C0), enabled | User typing, can send |
| Loading | #1565C0 | Blue + spinner | Posting comment to DB |
| Error | #C62828 (red) | Blue, re-enabled | Show toast, allow retry |

**Interaction:**
1. User taps input → keyboard opens
2. User types comment (1-1000 chars)
3. Character counter updates in real-time
4. Send button enabled when > 0 chars
5. User taps send button
6. Button shows loading spinner
7. Comment posted to DB (optimistic UI: appears immediately in list)
8. Input clears, keyboard stays open
9. Post's `comments_count` increments
10. Section header updates: "Comments (5)" → "Comments (6)"

**Level 0 User Behavior:**
- Comment input is replaced with verification prompt:
- **Message:** "Verify your account to comment on posts"
- **CTA Button:** "Verify Now" (16pt Semibold, #1565C0, navigates to verification flow)
- **Background:** #FFF3E0 (Light Amber)
- **Icon:** ⚠️ (warning), 20px, #E65100
- **Height:** 64px

---

### 10. Footer Metadata

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
| Post expired | Removed. Posts no longer expire. |
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
  .select(`*, 
    author:users!posts_author_id_fkey (id, full_name, trust_level, created_at),
    post_tags(tag:tags(id, name, slug, icon, color))
  `)
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
- [ ] Tag pills announced with names
- [ ] Local/Global badge announced
- [ ] Photos carousel announces "Photo 1 of 3"
- [ ] CTA button state clearly announced (enabled/disabled)
- [ ] Level 0 banner text readable
- [ ] Touch targets: all buttons 44px+ minimum
- [ ] Tag colors have sufficient contrast with backgrounds

---

## Related Screens

**Previous:** [06-home-screen-level-0.md](./06-home-screen-level-0.md) (tap PostCard)
**Next:** [08-message-thread.md](./08-message-thread.md) (Contact Author)
**Feature:** [in-app-chat.md](../features/in-app-chat.md)

---

**Wireframe Status:** Draft - Ready for Review
