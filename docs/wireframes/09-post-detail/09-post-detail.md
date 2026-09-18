# Wireframe: Post Detail Screen

> **Screen:** 09 | **Status:** Draft | **Updated:** 2026-02-22
> **Journey:** [phase1-feature-breakdown.md](../../product/features/phase1-feature-breakdown.md) - Feature 5.4, [in-app-chat.md](../../product/features/in-app-chat.md) - Feature 8.2 (entry point)
> **Story:** As a user, I want to see the full details of a post so I can decide whether to contact the author.

---

## Screen Purpose

Full-detail view of a single post with an interaction-first hierarchy (similar to Reddit/Facebook). The screen prioritizes conversation context first, then engagement actions, then metadata. It bridges browsing (home feed) to public discussion and private chat.

**Key Goals:**

- Prioritize author + content + discussion over metadata clutter
- Keep engagement actions immediately under content (Like, Comments, Save, Share)
- Move metadata into a compact row so it does not overshadow conversation
- Support single-level replies with show/hide controls

---

## Visual Wireframe

### Post Detail (Level 1+ User)

[[ ← Post Detail | ⋮ ]]

::: card
::: row
![RK]{.avatar} **Ram K.** ✓ Verified
*2h ago*
:::

# Looking for Nepali Roommate near UTD

Clean, furnished room in 2BR apartment. Close to DART rail. $800/month including utilities. Move-in date flexible. No smoking.

❤️ 12 · 💬 3 · 🔖 Save (Coming soon) · ↗️ Share

`📍 Local`{.badge .green} `🏠 Housing`{.pill} `❓ Question`{.pill} `Richardson, TX`{.subtle}

::: carousel
![Photo 1 of 3](photo-placeholder)
1 / 3
:::
:::

::: section
**Comments (3)**
---

::: comment
![PK]{.avatar} **Priya K.** ✓
Is parking included?
*1h ago*
:::

::: comment
![SG]{.avatar} **Sita G.** ✓ `Author`{.badge}
Yes, one spot included!
*50m ago*
:::

[Reply]{.link} [Show replies (2)]{.link}

::: reply
![RK]{.avatar .small} **Ram K.** ✓
Thanks! Is visitor parking available?
*20m ago*
:::

::: comment
![RM]{.avatar} **Ram P.** ✓
Interested! Sending message.
*30m ago*
:::

[Add a comment...___] [↑]*{.icon}
0/1000
:::

::: footer
Posted Feb 1, 2026 • Dallas-Fort Worth
:::

---

### Level 0 User View

[[ ← Post Detail | ⋮ ]]

::: alert warning
⚠️ **Verify phone to contact poster**
[Verify Now]{.outline}
:::

::: card

# Looking for Nepali Roommate near UTD

`📍 Local`{.badge .green}

`🏠 Housing`{.pill} `❓ Question`{.pill}

*(same post details as above)*

❤️ 12 · 💬 3
:::

::: alert warning
⚠️ Verify your account to comment on posts
[Verify Now]{.outline}
:::

---

### Delete Comment Dialog

::: modal
**Delete Comment**

Are you sure you want to delete this comment? This cannot be undone.

[Cancel]{.outline} [Delete]{.destructive}
:::

---

## Component Specifications

### 1. Header Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation bar | Top app bar |
| **Height** | 44px | 56dp |
| **Background** | #FFFFFF | #FFFFFF |
| **Back Button** | ← chevron, #1565C0 | ← arrow, #1565C0 |
| **Kebab Menu** | ⋮ icon, 24px, #757575 | ⋮ icon, 24dp, #757575 |

**Kebab menu items:**

- "Report Post" (future), "Share" (future)
- For author's own post: "Edit Post", "Delete Post" (future)

**Interaction:** Back button → navigate to previous screen
**a11y:** Label "Back", Hint "Return to previous screen"

---

### 2. Tag Pills

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Pill (border-radius: 12px) | Pill (border-radius: 12dp) |
| **Height** | 24px | 24dp |
| **Padding** | 8px H, 4px V | 8dp H, 4dp V |
| **Background** | Tag-specific color at 15% opacity | Tag-specific color at 15% opacity |
| **Font** | 12pt Medium, San Francisco | 11sp Medium, Roboto |
| **Color** | Tag-specific color | Tag-specific color |
| **Spacing** | 6px between pills | 6dp between pills |

- Position: In compact metadata row below engagement actions
- Margin: 0 (row-level spacing controls)
- Content: Tag icon + name (e.g., "🏠 Housing")

**Interaction:** Tap tag pill → Navigate to home screen filtered by that tag

---

### 3. Post Title

| Property | iOS | Android |
|----------|-----|---------|
| **Font** | 28pt Bold, San Francisco (H2) | 28sp Medium, Roboto |
| **Color** | #212121 | #212121 |
| **Max Lines** | 3 | 3 |
| **Margin** | 16px H, 8px below header | 16dp H, 8dp below header |

---

### 3a. Local/Global Badge

| Property | iOS | Android |
|----------|-----|---------|
| **Shape** | Pill (border-radius: 12px) | Pill (border-radius: 12dp) |
| **Font** | 12pt Medium | 11sp Medium |
| **Padding** | 6px H, 2px V | 6dp H, 2dp V |
| **Position** | 4px below title | 4dp below title |

**Badge variants:**

| Badge | Text Color | Background |
|-------|-----------|------------|
| 📍 Local | #388E3C | #E8F5E9 |
| 🌐 Global | #1565C0 | #E3F2FD |

---

### 4. Photo Carousel

| Property | iOS | Android |
|----------|-----|---------|
| **Height** | 200px | 200dp |
| **Width** | Full width − 32px | Full width − 32dp |
| **Corner Radius** | 12px | 12dp |
| **Indicator** | Dots at bottom | Dots at bottom |
| **Counter** | "1 / 3" pill at bottom-right | "1 / 3" pill at bottom-right |

- Behavior: Swipeable horizontally
- If no photos: section is hidden entirely

**a11y:** Announces "Photo 1 of 3", swipe gestures described

---

### 5. Description Section

| Property | iOS | Android |
|----------|-----|---------|
| **Header** | "Description" with horizontal rule | "Description" with horizontal rule |
| **Font** | 16pt Regular, San Francisco | 16sp Regular, Roboto |
| **Color** | #212121 | #212121 |
| **Line Height** | 24px | 24dp |
| **Display** | Full text (no truncation) | Full text (no truncation) |

**Location Row:**

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | 📍 Pin, 20px | 📍 Pin, 20dp |
| **Font** | 15pt Regular | 14sp Regular |
| **Color** | #757575 | #757575 |
| **Margin** | 16px below description | 16dp below description |

---

### 5a. Engagement Row

| Property | iOS | Android |
|----------|-----|---------|
| **Position** | Below description section | Below description section |
| **Margin Top** | 16px | 16dp |
| **Font** | 15pt Regular | 14sp Regular |
| **Color** | #757575 | #757575 |

**Components:**

- **Like Button:** ❤️ Heart + count (e.g., "12")
  - Tappable to toggle like (Level 1+)
  - Level 0: grayed out, tap shows verification toast
- **Comment Count:** 💬 Bubble + count (e.g., "3")
  - Tappable to scroll to comments section
- **Save Button:** 🔖 Save
  - Disabled state in this iteration with text "Coming soon"
- **Share Button:** ↗️ Share
  - Opens native share sheet on mobile
  - Uses Web Share API (fallback: copy link) on web

---

### 7. Author Section

| Property | iOS | Android |
|----------|-----|---------|
| **Header** | None (author row appears at top of post card) | None (author row appears at top of post card) |
| **Avatar** | 40×40px circle, initials | 40×40dp circle, initials |
| **Avatar BG** | #1565C0 at 15% opacity | #1565C0 at 15% opacity |
| **Name Font** | 17pt Semibold | 16sp Medium |
| **Name Color** | #212121 | #212121 |
| **Sub Font** | 13pt Regular | 12sp Regular |
| **Sub Color** | #757575 | #757575 |

**Trust badge:** ✓ Verified (16px, #2E7D32) or ✓✓ Contributor (#1565C0)

**Interaction:** Tap author avatar → show popup menu with "View Profile" / "Chat"

**Avatar Tap Menu:**

- Position: Popup anchored to avatar
- Options: "View Profile" and "Chat"
- Chat option hidden on own posts
- Chat requires Level 1+; Level 0 users see "Verify to Message" prompt
- Dismiss: Tap outside the menu

**Placement:** First content block in post detail card, above title and description.

---

### 8. Comments Section

| Property | iOS | Android |
|----------|-----|---------|
| **Position** | Below photo carousel (or metadata row) | Below photo carousel (or metadata row) |
| **Margin Top** | 24px | 24dp |
| **Background** | #FFFFFF | #FFFFFF |
| **Header Font** | 17pt Semibold | 16sp Medium |
| **Header Color** | #212121 | #212121 |

**Header:** "Comments (N)" with horizontal rule — count is dynamic based on non-deleted comments. Shows "Comments (0)" if none.

#### Empty State

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | 💬, 40px, #BDBDBD | 💬, 40dp, #BDBDBD |
| **Message** | "No comments yet. Be the first to comment!" | Same |
| **Font** | 15pt Regular, #757575 | 14sp Regular, #757575 |
| **Layout** | Center-aligned, 60px V padding | Center-aligned, 60dp V padding |

#### Comment List

- Display full list by default
- Top-level comments sorted by most recent activity (latest comment or reply first)
- Spacing: 16px/dp between comment items

#### Comment Item

| Property | iOS | Android |
|----------|-----|---------|
| **Avatar** | 32×32px circle | 32×32dp circle |
| **Name Font** | 14pt Medium, #212121 | 13sp Medium, #212121 |
| **Name Max** | Truncate > 20 chars | Truncate > 20 chars |
| **Badge** | ✓, 14px, #2E7D32 (Level 1+) | ✓, 14dp, #2E7D32 |
| **Text Font** | 14pt Regular, #424242 | 13sp Regular, #424242 |
| **Text Line Height** | 20px | 20dp |
| **Text Max Length** | 1000 chars | 1000 chars |
| **Timestamp Font** | 12pt Regular, #757575 | 11sp Regular, #757575 |

**Avatar background by trust level:**

| Level | Color |
|-------|-------|
| Level 0 | Gray |
| Level 1 | Blue |
| Level 2 | Purple |

**Timestamp format:** "5m ago", "2h ago", "1d ago", "2w ago"

**Delete Button (own comments only):**

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | 🗑️, 18px, #C62828 | 🗑️, 18dp, #C62828 |
| **Position** | Far right, vertically centered with timestamp | Same |
| **Touch Target** | 44×44px min | 48×48dp min |

- Tap action: Confirmation dialog → delete comment
- Deleted state: Removed from list immediately with fade-out (300ms)

#### Replies (Single-Level)

- One reply level only (`parent_comment_id` references a top-level comment)
- Each top-level comment supports:
  - "Reply" action
  - "Show replies (N)" / "Hide replies"
- Replies use compact visual indentation and 28×28 avatar
- No nested replies inside replies in this iteration

---

### 8a. Comment Input (Level 1+ Only)

| Property | iOS | Android |
|----------|-----|---------|
| **Position** | Bottom of comments, sticky on scroll | Same |
| **Default Height** | 48px (auto-expand to 120px max) | 48dp (auto-expand to 120dp max) |
| **Background** | #F5F5F5 | #F5F5F5 |
| **Border** | 1px solid #E0E0E0 | 1dp solid #E0E0E0 |
| **Corner Radius** | 8px | 8dp |
| **Padding** | 12px all around | 12dp all around |
| **Placeholder** | "Add a comment...", 15pt Regular, #BDBDBD | "Add a comment...", 14sp Regular, #BDBDBD |
| **Text** | 15pt Regular, #212121 | 14sp Regular, #212121 |
| **Max Length** | 1000 chars | 1000 chars |
| **Multi-line** | Expands up to 5 lines then scrolls | Same |

**Send Button:**

| Property | iOS | Android |
|----------|-----|---------|
| **Icon** | ↑ arrow, 32×32px circle | ↑ arrow, 32×32dp circle |
| **Position** | Bottom-right of input | Bottom-right of input |
| **Enabled BG** | #1565C0 | #1565C0 |
| **Disabled BG** | #BDBDBD | #BDBDBD |
| **Icon Color** | White | White |
| **Touch Target** | 44×44px | 48×48dp |

**Character Counter:**

| Property | iOS | Android |
|----------|-----|---------|
| **Format** | "0/1000" | "0/1000" |
| **Font** | 12pt Regular, #757575 | 11sp Regular, #757575 |
| **Warning** | Red (#C62828) at 950+ chars | Same |
| **Position** | Bottom-right below input | Same |

**Input States:**

| State | Input Border | Send Button | Behavior |
|-------|-------------|-------------|----------|
| Default (empty) | #E0E0E0 | Gray (#BDBDBD), disabled | User can type |
| Active (typing) | #1565C0 | Blue (#1565C0), enabled | User typing, can send |
| Loading | #1565C0 | Blue + spinner | Posting comment to DB |
| Error | #C62828 (red) | Blue, re-enabled | Show toast, allow retry |

**Interaction flow:**

1. User taps input → keyboard opens
2. User types comment (1–1000 chars)
3. Character counter updates in real-time
4. Send button enabled when > 0 chars
5. User taps send button
6. Button shows loading spinner
7. Comment posted to DB (optimistic UI: appears immediately in list)
8. Input clears, keyboard stays open
9. Post's `comments_count` increments
10. Section header updates: "Comments (5)" → "Comments (6)"

**Level 0 replacement:**

| Property | iOS | Android |
|----------|-----|---------|
| **Message** | "Verify your account to comment on posts" | Same |
| **Icon** | ⚠️, 20px, #E65100 | ⚠️, 20dp, #E65100 |
| **BG** | #FFF3E0 (Light Amber) | #FFF3E0 |
| **CTA** | "Verify Now", 16pt Semibold, #1565C0 | "Verify Now", 14sp Medium, #1565C0 |
| **Height** | 64px | 64dp |

---

### 9. Footer Metadata

| Property | iOS | Android |
|----------|-----|---------|
| **Font** | 13pt Regular | 12sp Regular |
| **Color** | #757575 | #757575 |
| **Alignment** | Center | Center |
| **Content** | "Posted Feb 1, 2026 • Dallas-Fort Worth" | Same |
| **Margin** | 16px top, 32px bottom | 16dp top, 32dp bottom |

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Status bar / Safe area | Auto | — |
| 2 | Header bar | 44px / 56dp | 0 |
| 3 | Author row | ~52px/dp | 8px/dp |
| 4 | Post title | Auto (~60px) | 8px/dp |
| 5 | Description section | Auto | 12px/dp |
| 6 | Engagement row | 24px/dp | 10px/dp |
| 7 | Compact metadata row (badge + tags + location) | Auto | 16px/dp |
| 8 | Photo carousel (if exists) | 200px/dp | 16px/dp |
| 9 | Comments section | Auto | 16px/dp |
| 10 | Comment input | 48–120px/dp | 16px/dp |
| 11 | Footer metadata | ~20px/dp | 32px/dp bottom |

**Horizontal:** 16px/dp margins both sides. Photos full width minus 32px/dp.

---

## User Interactions

### Primary Flow (Chat via Avatar Menu)

1. User taps PostCard on HomeScreen → navigates here
2. User reviews post details (scrolls through fields, photos)
3. User taps author avatar → popup menu appears
4. User selects "Chat"
5. System checks for existing conversation between user pair
6. Conversation created (or existing found)
7. Navigate to MessageThreadScreen

### Comment Flow (Level 1+)

1. User scrolls to comments section
2. User taps comment input → keyboard opens
3. User types comment → send button enables
4. User taps send → optimistic UI adds comment
5. User can tap "Reply" on a top-level comment to open inline reply input
6. User can toggle "Show replies / Hide replies"
7. Comment count updates in header and engagement row

### Scroll Behavior

- Full page scroll (not nested scroll views)
- Comment input sticky at bottom of comments section

---

## Error States & Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Own post | Chat option hidden in avatar menu, show "Edit Post" instead (future) |
| Level 0 user | Banner at top, avatar menu Chat shows "Verify to Message" prompt, comment input replaced with verify prompt |
| Post removed by moderator | Show "This post has been removed" message, no CTA |
| Author account deleted | Author shows "[Deleted User]", CTA hidden |
| No photos | Photo carousel section hidden entirely |
| No comments | Empty state with 💬 icon and "No comments yet" message |
| Network error | Show retry banner, cached data if available |
| Conversation creation fails | Show error toast, button resets to default state |
| Comment post fails | Show error toast, allow retry, input preserved |
| Very long description | Full text shown (no truncation on detail screen) |
| Comment at 950+ chars | Character counter turns red as warning |

---

## Accessibility

- [ ] Screen title: "Post detail"
- [ ] All field labels and values announced together
- [ ] Tag pills announced with names (e.g., "Housing tag")
- [ ] Local/Global badge announced (e.g., "Local post badge")
- [ ] Photos carousel announces "Photo 1 of 3"
- [ ] Avatar menu options clearly announced
- [ ] Level 0 banner text readable by screen reader
- [ ] Comment items: name, badge, text, timestamp read as group
- [ ] Comment input: placeholder announced, character count available
- [ ] Delete button: "Delete comment, button" announced
- [ ] Touch targets: all buttons 44px/48dp minimum
- [ ] Tag colors have sufficient contrast with backgrounds

---

## Technical Notes

### Identifiers

- Route: `/post/:postId`
- iOS: `PostDetailScreen`
- Android: `PostDetailActivity` / `PostDetailFragment`

### Params Received

- `postId: string` — which post to display

### Data Requirements

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

**Fetch comments:**

```typescript
const { data } = await supabase
  .from('comments')
  .select(`*,
    author:users!comments_author_id_fkey (id, full_name, trust_level, avatar_url)
  `)
  .eq('post_id', postId)
  .order('created_at', { ascending: true });
```

**Check existing conversation between user pair:**

```typescript
const { data } = await supabase
  .rpc('find_conversation_between_users', {
    user_a: currentUserId,
    user_b: authorId
  });
```

**Post a comment:**

```typescript
const { data } = await supabase
  .from('comments')
  .insert({ post_id: postId, author_id: currentUserId, body: commentText })
  .select()
  .single();
```

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Tap PostCard on HomeScreen | This screen |
| Entry | Tap post context bar in MessageThreadScreen | This screen |
| Entry | Deep link `nepally://post/{postId}` | This screen |
| Exit | Back button | Previous screen (HomeScreen or MessageThreadScreen) |
| Exit | Avatar menu "Chat" tap | MessageThreadScreen |
| Exit | Avatar menu "View Profile" tap | Public ProfileScreen (future) |
| Exit | Tag pill tap | HomeScreen filtered by tag |

---

## Testing Checklist

### Functional Tests

- [ ] Post title, description, tags, badge display correctly
- [ ] Photo carousel swipes and shows correct count
- [ ] Avatar menu "Chat" option navigates to MessageThreadScreen
- [ ] Existing conversation is reused (no duplicates)
- [ ] Level 0 user sees "Verify to Message" prompt when tapping Chat
- [ ] Level 0 user sees verification banner at top
- [ ] Author's own post hides "Chat" option in avatar menu
- [ ] Tag pill tap navigates to filtered home feed
- [ ] Like button toggles for Level 1+, shows toast for Level 0
- [ ] Comment list displays correctly with author badges
- [ ] Comment input posts successfully with optimistic UI
- [ ] Comment count updates after posting
- [ ] Delete own comment shows confirmation dialog
- [ ] "Show all comments" expands when > 3 comments

### Visual Tests

- [ ] Layout matches wireframe on all screen sizes
- [ ] Tag pills wrap to next line if many tags
- [ ] Photo carousel has correct height and radius
- [ ] Comment avatars show correct trust-level colors
- [ ] Character counter turns red at 950+ characters

### Accessibility Tests

- [ ] VoiceOver/TalkBack reads all elements in correct order
- [ ] Touch targets meet 44pt/48dp minimum
- [ ] Tag and badge colors meet WCAG AA contrast
- [ ] Comment items announced as grouped content
- [ ] CTA disabled state clearly communicated

### Edge Case Tests

- [ ] No photos: carousel section hidden
- [ ] No comments: empty state displayed
- [ ] Network error: retry banner shown
- [ ] Very long title: truncates at 3 lines
- [ ] Comment at max length: counter red, input stops accepting

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md) (tap PostCard) |
| Next | [08-message-thread.md](../08-message-thread/08-message-thread.md) (Avatar menu Chat) |
| Feature | [in-app-chat.md](../../product/features/in-app-chat.md) |
| Feature | [phase1-feature-breakdown.md](../../product/features/phase1-feature-breakdown.md) |

---

**Status:** Draft — Ready for Review
