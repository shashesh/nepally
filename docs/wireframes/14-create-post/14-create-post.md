# Wireframe: Create Post (Reddit-Style)

> **Screen:** 14 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** Post Creation User Journey
> **Story:** As a verified (Level 1+) user, I want to create a post with a title, body, and tags so I can share information with my local community (or globally if I'm a premium user).

---

## Screen Purpose

A single-screen, Reddit-style post creation form. Users write a title and body, select 1-3 tags, optionally add photos, and premium users can toggle global visibility.

**Key Goals:**
- Simple, fast post creation (< 60 seconds for typical post)
- Mandatory tags for content organization (1–3 tags)
- Optional photo attachments
- Premium users can toggle global visibility
- Emergency tag triggers moderation disclaimer

---

## Visual Wireframe

### Standard User

[[ ✕ Cancel | Create Post | [Post]{state:disabled} ]]

::: card
[What's this about?___]{maxlength:150}

[Write your post details here...]{rows:5, maxlength:5000}
:::

::: card
**Tags (1-3 required)**

[🏠 Housing]{.outline}  [💼 Jobs]{.outline}  [🤝 Help]{.outline}  [❓ Question]{.outline}
[🏛 Politics]{.outline}  [💬 Discussion]{.outline}  [⚠️ Emergency]{.outline}
:::

::: card
📷 [Add Photos (optional)]  **0/5**
:::

::: card {bg:#F5F5F5}
📍 Posting to: **Dallas-Fort Worth**
:::

---

### Premium User (Global Toggle Visible)

[[ ✕ Cancel | Create Post | [Post]{state:disabled} ]]

::: card
[What's this about?___]{maxlength:150}

[Write your post details here...]{rows:5, maxlength:5000}
:::

::: card
**Tags (1-3 required)**

[🏠 Housing]{.outline}  [💼 Jobs]{.outline}  [🤝 Help]{.outline}  [❓ Question]{.outline}
[🏛 Politics]{.outline}  [💬 Discussion]{.outline}  [⚠️ Emergency]{.outline}
:::

::: card
📷 [Add Photos (optional)]  **0/5**
:::

::: card {bg:#F5F5F5}
📍 Posting to: **Dallas-Fort Worth**

🌐 Post Globally  `[OFF]`
_Visible in all metro areas_
:::

---

### Emergency Tag Selected State

::: alert warning
⚠️ **Emergency posts require moderator approval before becoming visible.** [Learn More](/help/emergency)
:::

---

### Discard Confirmation Modal

::: modal
**Discard Post?**

You have unsaved changes. Are you sure you want to discard this post?

[Discard]{.destructive}

[Keep Editing]{.outline}
:::

---

### Level 0 Blocked State

::: alert error
**Verify your phone to create posts**

You need to verify your phone number before you can create posts.

[Verify Now]*
:::

---

## Component Specifications

### 1. Top Navigation Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation bar | App bar |
| **Height** | 44px | 56dp |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px bottom #E0E0E0 | 1px bottom #E0E0E0 |

#### Cancel Button (Left)
- **Label:** "Cancel" (iOS) or ✕ icon (Android)
- **Typography:** 17pt/16sp Regular, #1565C0 (Primary Blue)
- **Touch Target:** 44x44pt / 48x48dp
- **Interaction:** Tap to dismiss screen (with discard confirmation if content entered)

#### Screen Title (Center)
- **Label:** "Create Post"
- **Typography:** 17pt/16sp Semibold, #212121
- **Alignment:** Center

#### Post Button (Right)
- **Label:** "Post"
- **Typography:** 17pt/16sp Semibold
- **Colors:**
  - Enabled: #FFFFFF text on #1565C0 (Primary Blue) pill background
  - Disabled: #BDBDBD text on #F5F5F5 background
- **Shape:** Pill (border-radius: 16px), padding: 12px horizontal, 6px vertical
- **Touch Target:** 44x44pt / 48x48dp
- **Interaction:** Tap to submit post (enabled only when form is valid)

**Post Button Enable Conditions:**
- Title is non-empty (minimum 5 characters)
- Body is non-empty (minimum 10 characters)
- At least 1 tag selected
- Not currently submitting

---

### 2. Title Input

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Single-line text input | Single-line text input |
| **Padding** | 16px horizontal, 12px vertical | 16dp horizontal, 12dp vertical |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | None (borderless style) | None (borderless style) |
| **Placeholder** | "What's this about?" | "What's this about?" |
| **Placeholder Color** | #9E9E9E | #9E9E9E |
| **Typography** | 20pt Semibold, #212121 | 18sp Semibold, #212121 |
| **Max Length** | 150 characters | 150 characters |

- **Character Counter:** Shown at 120+ characters ("120/150"), right-aligned
- **Counter Color:** #757575, turns #C62828 (Error Red) at 140+

**Validation:**
- Minimum 5 characters
- Maximum 150 characters
- No empty/whitespace-only titles
- Error shown inline below field: "Title must be at least 5 characters"

**Accessibility:**
- Label: "Post title, required"
- Hint: "Enter a title for your post"

---

### 3. Body Textarea

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Multi-line text input (auto-expanding) | Multi-line text input (auto-expanding) |
| **Padding** | 16px horizontal, 12px vertical | 16dp horizontal, 12dp vertical |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Min Height** | 120px | 120dp |
| **Max Height** | Scrollable after 300px | Scrollable after 300dp |
| **Placeholder** | "Write your post details here..." | "Write your post details here..." |
| **Placeholder Color** | #9E9E9E | #9E9E9E |
| **Typography** | 16pt Regular, #212121 | 15sp Regular, #212121 |
| **Max Length** | 5000 characters | 5000 characters |

- **Character Counter:** Shown at 4500+ characters ("4500/5000")

**Validation:**
- Minimum 10 characters
- Maximum 5000 characters
- Error shown inline: "Body must be at least 10 characters"

**Accessibility:**
- Label: "Post body, required"
- Hint: "Enter the details of your post"

---

### 4. Tag Selection

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Wrapped grid of selectable tag chips | Wrapped grid of selectable tag chips |
| **Padding** | 16px horizontal | 16dp horizontal |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Section Label** | 14pt Semibold, #757575 | 13sp Semibold, #757575 |
| **Label Text** | "Tags (1-3 required)" | "Tags (1-3 required)" |
| **Label Margin** | 12px bottom | 12dp bottom |

**Tag Chips (loaded from `tags` table, sorted by `sort_order`):**

| Tag | Icon | Color |
|-----|------|-------|
| Housing | 🏠 | #4CAF50 |
| Jobs | 💼 | #2196F3 |
| Help | 🤝 | #FF9800 |
| Question | ❓ | #9C27B0 |
| Politics | 🏛 | #607D8B |
| Discussion | 💬 | #00BCD4 |
| Emergency | ⚠️ | #F44336 |

**Chip Styling:**
- **Shape:** Pill (border-radius: 20px/dp)
- **Height:** 36px/dp
- **Padding:** 12px/dp horizontal, 8px/dp vertical
- **Layout:** Wrap to multiple rows (flexbox wrapping)
- **Spacing:** 8px/dp horizontal, 8px/dp vertical between rows

**States:**
- **Unselected:** #F5F5F5 background, 1px #E0E0E0 border, #757575 text
- **Selected:** Tag color at 15% opacity background, tag color border (2px), tag color text
- **Disabled (max reached):** Unselected chips become 50% opacity when 3 tags selected
- **Selected + can deselect:** Tap selected chip to deselect

**Emergency Tag Special Behavior:**
- When Emergency is selected, show inline warning:
  - ⚠️ "Emergency posts require moderator approval before becoming visible."
  - Typography: 12pt/11sp Regular, #C62828 (Error Red)
  - Background: #FFEBEE (light red), padding 8px, margin 8px top
  - Includes "Learn More" link (#1565C0)

**Validation:**
- Minimum 1 tag required
- Maximum 3 tags allowed
- Error shown below chips: "Please select at least 1 tag"

**Accessibility:**
- Section: "Tags section, 1 to 3 required"
- Each chip: "Housing tag, not selected" or "Housing tag, selected, 1 of 3"
- When max reached: "Maximum 3 tags selected. Deselect a tag to change."

---

### 5. Photo Attachment

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Horizontal photo picker row | Horizontal photo picker row |
| **Padding** | 16px horizontal | 16dp horizontal |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Icon** | 📷 24x24px | 📷 24x24dp |
| **Label** | "Add Photos (optional)", 15pt Regular, #757575 | "Add Photos (optional)", 14sp Regular, #757575 |
| **Counter** | "0/5" right-aligned | "0/5" right-aligned |
| **Touch Target** | Full row 48px | Full row 48dp |

- **Interaction:** Tap to open photo picker (camera or gallery)

**Photo Thumbnails (when photos added):**
- **Size:** 80x80px/dp squares
- **Corner Radius:** 8px/dp
- **Layout:** Horizontal scroll, 8px/dp spacing
- **Remove Button:** Small ✕ (16x16px) on top-right corner of each thumbnail
- **Max Photos:** 5
- **Position:** Below the "Add Photos" button

**Accessibility:**
- "Add photos, optional. 0 of 5 photos added."
- Each thumbnail: "Photo 1, remove button"

---

### 6. Location Info

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Read-only informational row | Read-only informational row |
| **Padding** | 16px horizontal, 12px vertical | 16dp horizontal, 12dp vertical |
| **Background** | #F5F5F5 (Light Gray) | #F5F5F5 (Light Gray) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Icon** | 📍 20x20px | 📍 20x20dp |
| **Typography** | 14pt Regular, #757575 | 13sp Regular, #757575 |

- **Content:** "Posting to: Dallas-Fort Worth" (user's current metro area)
- **Note:** This is the user's active metro area. Not editable on this screen.

**Accessibility:**
- "Posting to Dallas-Fort Worth. This post will appear in the Dallas-Fort Worth feed."

---

### 7. Global Toggle (Premium Users Only)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Toggle switch row | Toggle switch row |
| **Padding** | 16px horizontal, 12px vertical | 16dp horizontal, 12dp vertical |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px top border #E0E0E0 | 1px top border #E0E0E0 |
| **Visibility** | Only if `user.is_premium === true` | Only if `user.is_premium === true` |
| **Icon** | 🌐 20x20px | 🌐 20x20dp |
| **Label** | 15pt Medium, #212121, "Post Globally" | 14sp Medium, #212121, "Post Globally" |
| **Sublabel** | 12pt Regular, #757575, "Visible in all metro areas" | 11sp Regular, #757575, "Visible in all metro areas" |
| **Toggle Off** | UISwitch, gray track (#E0E0E0) | Material Switch, gray track (#E0E0E0) |
| **Toggle On** | UISwitch, blue track (#1565C0) | Material Switch, blue track (#1565C0) |

**Behavior:**
- **Default:** OFF (post is local to user's metro area)
- **ON:** Post will be visible in all metro area feeds with 🌐 Global badge
- **Animation:** Smooth toggle (200ms)

**Non-Premium Users:**
- This entire section is hidden (not shown at all, no upsell)

**Accessibility:**
- "Post globally toggle, off. When on, your post will be visible in all metro areas."

---

## Form Validation Summary

| Field | Required | Min | Max | Error Message |
|-------|----------|-----|-----|---------------|
| Title | Yes | 5 chars | 150 chars | "Title must be 5-150 characters" |
| Body | Yes | 10 chars | 5000 chars | "Body must be at least 10 characters" |
| Tags | Yes | 1 tag | 3 tags | "Select 1-3 tags" |
| Photos | No | 0 | 5 | "Maximum 5 photos" |
| Global | No | - | - | (Premium only toggle) |

---

## User Interactions

### Primary Flow (Create Local Post)
1. **User taps FAB (+) on home screen** → Navigate to this screen
2. **User types title** → Character counter appears at 120+
3. **User types body** → Textarea expands as needed
4. **User taps 1-3 tag chips** → Chips highlight in tag color
5. **User optionally adds photos** → Thumbnails appear
6. **User taps "Post" button** → Loading spinner, then success
7. **Success:** Navigate back to home screen, new post visible at top

### Alternative Flow (Premium Global Post)
1. Steps 1-5 same as above
2. **User toggles "Post Globally" ON** → Toggle animation
3. **User taps "Post" button** → Post created with is_global = true
4. **Success:** Post visible in all metro area feeds with 🌐 badge

### Alternative Flow (Emergency Tag)
1. Steps 1-3 same as above
2. **User selects "Emergency" tag** → Warning banner appears
3. **User reads warning** → Post will require moderator approval
4. **User taps "Post" button** → Post status = "pending"
5. **Success toast:** "Your emergency post has been submitted for moderator review."
6. **Navigate back to home screen** → Post NOT visible until approved

### Alternative Flow (Cancel with Content)
1. **User has entered some content**
2. **User taps Cancel/✕**
3. **Confirmation dialog appears:**
   - Title: "Discard Post?"
   - Message: "You have unsaved changes. Are you sure you want to discard this post?"
   - Buttons: "Discard" (destructive) and "Keep Editing" (default)
4. **User taps "Discard"** → Navigate back, content lost
5. **User taps "Keep Editing"** → Dialog closes, continue editing

### Alternative Flow (Cancel Empty)
1. **User taps Cancel/✕** with no content entered
2. **Navigate back immediately** (no confirmation needed)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Cancel Button** | Text "Cancel" | ✕ icon |
| **Post Button** | Pill shape, right | Filled button, right |
| **Keyboard** | iOS keyboard with Done bar | Android keyboard with action button |
| **Photo Picker** | UIImagePickerController | Intent.ACTION_PICK |
| **Toggle** | UISwitch | Material Switch |
| **Discard Dialog** | UIAlertController | MaterialAlertDialog |

---

## Error States & Edge Cases

### Edge Case: Network Error on Submit
**Scenario:** User taps "Post" but network fails
**Behavior:**
- Show error toast: "Could not create post. Please check your connection and try again."
- Post button re-enables for retry
- Content preserved in form

### Edge Case: Image Upload Fails
**Scenario:** One of the photos fails to upload
**Behavior:**
- Show error on specific thumbnail: Red border + retry icon
- Other photos upload successfully
- User can tap retry or remove failed photo

### Edge Case: Session Expires During Creation
**Scenario:** Auth session expires while user is composing
**Behavior:**
- On submit: Show error "Session expired. Please log in again."
- Navigate to login screen, then back to create post with content preserved (if possible)

### Edge Case: User is Level 0
**Scenario:** Level 0 user somehow reaches create post screen
**Behavior:**
- Show full-screen message: "Verify your phone to create posts"
- CTA: "Verify Now" → Navigate to verification flow
- Back button returns to home

### Edge Case: All 3 Tags Selected, User Tries to Add More
**Scenario:** User has 3 tags selected and taps a 4th
**Behavior:**
- Unselected chips are visually disabled (50% opacity)
- Tap does nothing (no toast needed, visual state is clear)
- User must deselect one tag before selecting another

---

## Accessibility

### Screen Reader Order
1. "Cancel button"
2. "Create Post, heading"
3. "Post button, disabled"
4. "Post title, required, text field"
5. "Post body, required, text field"
6. "Tags section, 1 to 3 required. Housing tag, not selected. Jobs tag, not selected..." (etc.)
7. "Add photos, optional, button"
8. "Posting to Dallas-Fort Worth"
9. (Premium only) "Post globally toggle, off"

### Touch Targets
- Cancel button: 44x44pt / 48x48dp ✓
- Post button: 44x44pt / 48x48dp ✓
- Tag chips: 36px height, 44px touch target ✓
- Photo add: Full row 48px ✓
- Toggle: Standard switch size ✓

### Color Contrast
| Element | Ratio | Level |
|---------|-------|-------|
| Title text (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Placeholder text (#9E9E9E on #FFFFFF) | 3.4:1 | Informational only |
| Tag text (various on white) | All meet 4.5:1 | AA ✓ |
| Post button (#FFFFFF on #1565C0) | 7.2:1 | AAA ✓ |

---

## Animations & Transitions

### Screen Entry
- iOS: Slide up from bottom (modal presentation, 300ms)
- Android: Slide up from bottom (material motion, 300ms)

### Tag Chip Selection
- Duration: 150ms
- Effect: Background fills with tag color, border color changes
- Scale: Brief 1.05 → 1.0 bounce

### Post Submission
- Post button shows inline spinner (replace "Post" text with spinner)
- Duration: Loading until API responds
- Success: Dismiss screen with slide-down animation

### Photo Add
- Thumbnail fades in (200ms) when photo selected
- Remove: Thumbnail fades out + shifts remaining photos left (200ms)

---

## Technical Notes

### Screen Identifier
- iOS: `CreatePostViewController`
- Android: `CreatePostActivity` / `CreatePostFragment`
- Route name: `/create-post`

### State Management
```javascript
{
  title: "",                    // string, max 150
  body: "",                     // string, max 5000
  selectedTags: [],             // string[] of tag IDs, max 3
  availableTags: [],            // Tag[] from database
  photos: [],                   // { uri: string, uploading: boolean, error: boolean }[]
  isGlobal: false,              // boolean, only for premium
  isSubmitting: false,          // boolean
  isDirty: false,               // boolean, true if any field has content
  userIsPremium: false,         // boolean
  metroAreaId: "19100",         // string
  metroName: "Dallas-Fort Worth" // string
}
```

### API Integration

**Submit Post:**
```
POST /posts
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Looking for Nepali Roommate",
  "description": "Looking for Nepali roommate to share 2BR apartment...",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"],
  "photos": ["https://storage.supabase.co/..."],
  "is_global": false,
  "metro_area_id": "19100",
  "location_zip_code": "75201",
  "location_city": "Dallas",
  "location_state": "TX"
}
```

**Response (Success):**
```json
{
  "id": "new-post-uuid",
  "status": "active",
  "created_at": "2026-02-17T10:00:00Z"
}
```

**Response (Emergency - Pending):**
```json
{
  "id": "new-post-uuid",
  "status": "pending",
  "message": "Your emergency post has been submitted for moderator review.",
  "created_at": "2026-02-17T10:00:00Z"
}
```

**Fetch Tags:**
```
GET /tags
```
Returns all tags sorted by `sort_order`. Cache locally for session duration.

---

## Content & Localization

### Placeholder Text
- Title: "What's this about?"
- Body: "Write your post details here..."

### String Keys

| Key | Value |
|-----|-------|
| `create_post_title` | Create Post |
| `create_post_cancel` | Cancel |
| `create_post_submit` | Post |
| `create_post_title_placeholder` | What's this about? |
| `create_post_body_placeholder` | Write your post details here... |
| `create_post_tags_label` | Tags (1-3 required) |
| `create_post_photos_label` | Add Photos (optional) |
| `create_post_photos_count` | {count}/5 |
| `create_post_location` | Posting to: {metro_name} |
| `create_post_global_label` | Post Globally |
| `create_post_global_sublabel` | Visible in all metro areas |
| `create_post_emergency_warning` | Emergency posts require moderator approval before becoming visible. |
| `create_post_discard_title` | Discard Post? |
| `create_post_discard_message` | You have unsaved changes. Are you sure you want to discard this post? |
| `create_post_discard_confirm` | Discard |
| `create_post_discard_cancel` | Keep Editing |
| `create_post_error_network` | Could not create post. Please check your connection and try again. |
| `create_post_success` | Post published! |
| `create_post_emergency_success` | Your emergency post has been submitted for moderator review. |

---

## Testing Checklist

### Functional Tests
- [ ] Title input accepts text, enforces 150 char max
- [ ] Body textarea expands, enforces 5000 char max
- [ ] 1-3 tags can be selected, chips toggle correctly
- [ ] 4th tag cannot be selected when 3 active
- [ ] Emergency tag shows warning banner
- [ ] Photos can be added and removed (max 5)
- [ ] Post button disabled when form invalid
- [ ] Post button enabled when form valid
- [ ] Successful submission navigates back
- [ ] Emergency post creates with "pending" status
- [ ] Cancel with content shows discard confirmation
- [ ] Cancel without content navigates back immediately
- [ ] Global toggle only visible for premium users
- [ ] Global toggle sets is_global on submission

### Visual Tests
- [ ] Tag chips display correct colors for each tag
- [ ] Selected chips have filled background
- [ ] Post button pill shape with correct enabled/disabled states
- [ ] Character counters appear at threshold
- [ ] Photo thumbnails layout correctly
- [ ] Emergency warning has red background

### Accessibility Tests
- [ ] All form fields have labels
- [ ] Tag chips announce selected state
- [ ] Post button announces enabled/disabled
- [ ] Screen reader reads through form in logical order

### Edge Case Tests
- [ ] Network error preserves form content
- [ ] Image upload failure shows retry
- [ ] Very long title truncates at 150 chars
- [ ] Session expiry handled gracefully
- [ ] Level 0 user blocked from posting

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md) (via FAB) |
| Next | Home Screen (on success, post appears at top of feed) |
| Related | [09-post-detail.md](../09-post-detail/09-post-detail.md) — View of the created post |
| Related | Post Edit Screen (reuses same form with pre-filled data) |

---

**Status:** Draft — Ready for Review
