# User Journey #03: Creating a Post

**Journey Number:** 03
**Category:** Post Creation
**User Persona:** Verified User (Level 1) + Premium User variant
**Last Updated:** 2026-02-17
**Status:** Draft

## Journey Overview

**Goal:** Enable a verified user to create a Reddit-style post with a title, body, and 1-3 tags, optionally attach photos, and (for premium users) toggle global visibility.

**Trigger:** User taps the floating action button (+) on the home screen.

**Success Criteria:**

- User creates a post with title, body, and at least 1 tag in under 60 seconds
- Post appears in the user's metro feed immediately after submission
- Emergency-tagged posts enter pending state for moderator review
- Premium user can create a global post visible in all metro areas

**Estimated Duration:** 30-60 seconds (simple post), 1-2 minutes (with photos)

## Prerequisites

**Must Complete First:**

- User Journey #01: Signup and Onboarding (account created, metro area set)
- Phone/Identity Verification (trust level 1+ achieved)

**Should Have:**

- User is Level 1+ (verified)
- User knows what they want to post

## User Persona Details

**Name:** Anita Rai
**Age:** 31 years old
**Background:** Nurse working at a Dallas hospital. Looking for a Nepali roommate because she's moving to a new apartment. She's a verified Nepally user (Level 1).

**Metro:** Dallas-Fort Worth-Arlington, TX
**Trust Level:** 1 (Verified)
**Premium:** No (free user) — variant shows premium flow

## Step-by-Step Journey

### Phase 1: Initiating Post Creation

#### Step 1: Tap Create Post Button

**User Action:** Anita taps the blue floating action button (+) on the home screen.

**System Response:** Navigate to Create Post screen (slide up from bottom).

**User Sees:**

- Top bar: "Cancel" (left), "Create Post" (center), "Post" button (right, disabled/gray)
- Title input with placeholder: "What's this about?"
- Body textarea with placeholder: "Write your post details here..."
- Tags section with label "Tags (1-3 required)" and 7 tag chips
- "Add Photos (optional)" row
- Location info: "📍 Posting to: Dallas-Fort Worth"

**Duration:** < 1 second (screen transition)

**User Thoughts:**

- "Simple form, like Reddit. Just title and body."
- "I need to pick at least one tag."

---

#### Step 2: Enter Title

**User Action:** Anita taps the title field and types: "Looking for Nepali Roommate near Medical District"

**System Response:**

- Keyboard opens
- Title text appears in semibold font
- Character counter appears at 120+ chars (her title is 50 chars, so no counter yet)

**User Sees:**

- Her title in the input field
- Post button still disabled (no body or tags yet)

**Duration:** 5-10 seconds

**User Thoughts:**

- "Clear and descriptive title, should attract the right people."

---

#### Step 3: Enter Body

**User Action:** Anita taps the body field and types:

"I'm moving to a new 2BR apartment near Parkland Hospital on March 15. Looking for a Nepali roommate. Rent is $750/month, utilities split. Apartment has in-unit washer/dryer, pool, and gym. Close to DART Green Line. I work night shifts 3 days a week, so prefer someone quiet during the day. No smoking. Pets negotiable. DM me if interested!"

**System Response:**

- Body textarea expands as she types
- Character counter not shown (well under 4500 chars)
- Post button still disabled (no tags yet)

**User Sees:**

- Her body text in the textarea
- Post button still gray

**Duration:** 15-30 seconds

---

### Phase 2: Selecting Tags

#### Step 4: Select First Tag

**User Action:** Anita taps the "🏠 Housing" tag chip.

**System Response:**

- Housing chip fills with green color (#4CAF50 at 15% opacity, green border)
- Brief scale animation (1.05 → 1.0)
- Post button becomes enabled (blue pill) — form is now valid (title + body + 1 tag)

**User Sees:**

- Housing chip highlighted in green
- 6 other chips remain in neutral gray
- Post button now blue and tappable

**Duration:** < 1 second

**User Thoughts:**

- "Good, Housing is the right tag for this."
- "I could add more tags too."

---

#### Step 5: Select Second Tag (Optional)

**User Action:** Anita also taps "❓ Question" since she's also asking for recommendations.

**System Response:**

- Question chip fills with purple color (#9C27B0 at 15% opacity)
- Two chips now selected

**User Sees:**

- Housing (green) + Question (purple) selected
- 5 other chips neutral
- Label could show "2 of 3 tags selected" (optional UX)

**Duration:** < 1 second

---

### Phase 3: Adding Photos (Optional)

#### Step 6: Add a Photo

**User Action:** Anita taps "📷 Add Photos (optional)".

**System Response:** Photo picker opens (camera roll / take photo menu).

**User Sees:**

- System photo picker with recent photos
- Option to take a new photo

**Duration:** 3-5 seconds (picking a photo)

---

#### Step 7: Photo Selected

**User Action:** Anita selects a photo of her apartment living room.

**System Response:**

- Photo thumbnail (80x80px) appears below the "Add Photos" row
- Counter updates: "1/5"
- Small ✕ button on thumbnail corner for removal

**User Sees:**

- Photo thumbnail with remove button
- "1/5" counter

**Duration:** 1-2 seconds

**User Thoughts:**

- "A photo of the apartment should help people decide."

---

### Phase 4: Submitting the Post

#### Step 8: Review and Submit

**User Action:** Anita reviews her post and taps the "Post" button.

**System Response:**

- Post button shows loading spinner
- Photo uploads to Supabase Storage
- Post record created in database with:
  - `title`: "Looking for Nepali Roommate near Medical District"
  - `description`: (body text)
  - `tags`: ["housing", "question"] (via post_tags junction)
  - `photos`: [uploaded URL]
  - `is_global`: false
  - `status`: "active"
  - `metro_area_id`: user's metro
- Post button spinner completes with checkmark

**User Sees:**

- Brief loading spinner (1-3 seconds)

**Duration:** 1-3 seconds

---

#### Step 9: Success — Return to Feed

**System Response:**

- Create Post screen dismisses (slide down)
- Navigate back to home screen
- Success toast: "Post published!"
- New post appears at top of feed with 📍 Local badge

**User Sees:**

- Home feed with her new post at the top
- Post card shows: title, description preview, Housing + Question tag pills, 📍 Local badge
- 0 likes, 0 comments (brand new)

**Duration:** < 1 second

**User Thoughts:**

- "Done! That was fast. Less than a minute."
- "I can see my post right at the top."

---

## Variant: Premium User Creates Global Post

### Step 8a: Toggle Global Visibility

**User Context:** Rajesh is a premium user ($4.99/month) posting a job listing for his restaurant chain.

**User Action:** After filling in title, body, and tags (Jobs + Help), Rajesh toggles "🌐 Post Globally" switch to ON.

**System Response:**

- Toggle animates to ON (blue track)
- Sublabel: "Visible in all metro areas"

**User Sees:**

- Global toggle is ON
- Everything else same as standard flow

**Duration:** < 1 second

**User Thoughts:**

- "I want this job listing to reach all Nepali communities across the US."

---

### Step 9a: Global Post Submitted

**System Response:**

- Post created with `is_global: true`
- Post appears in user's local feed AND all other metro feeds
- Post card shows 🌐 Global badge

**User Sees:**

- Home feed with post showing 🌐 Global badge
- Success toast: "Post published globally!"

---

## Variant: Emergency Tag Post

### Step 4b: Select Emergency Tag

**User Action:** User selects "⚠️ Emergency" tag.

**System Response:**

- Emergency chip fills with red color
- **Warning banner appears below tags:**
  - ⚠️ "Emergency posts require moderator approval before becoming visible."
  - Background: #FFEBEE (light red)
  - "Learn More" link

**User Sees:**

- Red Emergency chip selected
- Warning text about moderator approval

**User Thoughts:**

- "OK, so my emergency post won't go live immediately. A moderator has to check it first."

---

### Step 9b: Emergency Post Submitted

**System Response:**

- Post created with `status: 'pending'` (not 'active')
- Success toast: "Your emergency post has been submitted for moderator review."
- Post does NOT appear in feed yet
- Notification sent to local community moderators

**User Sees:**

- Home feed (post not visible)
- Toast confirming submission for review

---

## Variant: Level 0 User (Blocked)

### Step 1c: Level 0 Taps FAB

**User Action:** Level 0 (unverified) user taps the semi-transparent FAB.

**System Response:**

- Modal appears:
  - Title: "Verify Your Phone to Post"
  - Message: "You need to verify your phone number to create posts and message others."
  - Buttons: "Verify Now" (primary) | "Cancel" (secondary)

**User Sees:** Verification prompt modal

**User Action Options:**

- "Verify Now" → Navigate to verification flow
- "Cancel" → Close modal, return to feed

---

## Variant: Editing an Existing Post (Author)

### Step E1: Open Post Options

**User Action:** Author taps the post options menu (⋯) from feed card or post detail.

**System Response:** Show options including:

- Edit Post
- Share Post
- Delete Post

**User Sees:** Ownership-aware action menu with edit option.

---

### Step E2: Enter Edit Mode

**User Action:** Author selects **Edit Post**.

**System Response:** Navigate to the post form in edit mode with existing values prefilled.

**User Sees:**

- Header title: "Edit Post"
- Primary action: "Save"
- Existing title/body/tags populated
- Existing photos shown as thumbnails

---

### Step E3: Update Content

**User Action:** Author edits title/body/tags and optionally changes visibility (premium global toggle).

**System Response:** Validate edited content with same create-post rules.

**User Sees:**

- Real-time validation
- Save button enabled only when form is valid

---

### Step E4: Manage Photos (Edit Mode)

**User Action:** Author updates photos:

- Remove existing photos
- Add new photos
- Reorder photos explicitly

**System Response:**

- Removed existing photos are marked for storage cleanup after successful save
- New photos upload on save
- Final persisted `photos[]` order matches user’s edited order

**User Sees:**

- Thumbnail remove controls
- Reorder controls (`←` / `→`) on mobile + web
- Drag-and-drop reorder on web

---

### Step E5: Save Changes

**User Action:** Author taps **Save**.

**System Response:**

- Update post record (title/body/tags/global/photos)
- Delete removed photo assets from storage (best effort)
- Return to previous context (feed/detail)

**User Sees:** Success confirmation and updated post content.

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User taps Cancel with content entered | Discard confirmation: "You have unsaved changes. Discard?" |
| User taps Cancel with no content | Navigate back immediately (no confirmation) |
| Network error on submit | Error toast, content preserved, Post button re-enabled |
| Photo upload fails | Red border on failed thumbnail, retry icon, other photos keep uploading |
| User selects 3 tags, tries to select 4th | Remaining chips become 50% opacity (disabled), no error toast |
| User removes all tags after selecting | Post button becomes disabled again |
| Edit mode: user reorders photos then saves | Persisted photo order matches edited sequence |
| Edit mode: update fails after uploading new photos | Newly uploaded files cleaned up to avoid orphan storage |
| Edit mode: remove existing photo then cancel | No storage deletion occurs until successful save |
| Title exceeds 150 chars | Character counter shown, input stops at 150 |
| Body exceeds 5000 chars | Character counter shown, input stops at 5000 |
| Session expires during creation | Error on submit, redirect to login, content lost (acceptable) |
| Non-premium user tries to find global toggle | Toggle is hidden entirely, no upsell |

---

## API Interactions

| Action | Endpoint | Payload |
|--------|----------|---------|
| Fetch tags | `GET /tags` | N/A |
| Upload photo | `POST /storage/photos` | FormData (image file) |
| Create post | `POST /posts` | `{ title, description, tag_ids[], photos[], is_global, metro_area_id, location_* }` |

---

## Journey Completion

**Final Outcome:**

- ✅ User created a post in under 60 seconds
- ✅ Post appears in local feed with correct tags and badge
- ✅ No category-specific forms or mandatory structured fields
- ✅ Simple Reddit-style experience: title + body + tags

**Success Indicators:**

- Form completion rate > 80%
- Average creation time < 60 seconds
- Tag selection accuracy (users pick relevant tags)
- < 5% posts abandoned after starting

---

## Related Documentation

- [Wireframe: Create Post](../../wireframes/14-create-post/14-create-post.md)
- [Wireframe: Home Screen](../../wireframes/06-home-screen-level-0/06-home-screen-level-0.md)
- [Feature: Phase 1 Breakdown](../../product/features/phase1-feature-breakdown.md) — Features 5.1-5.3
- [Decision: Post Tags Redesign](../../decisions/2026-02-17-post-tags-redesign-and-premium.md)
