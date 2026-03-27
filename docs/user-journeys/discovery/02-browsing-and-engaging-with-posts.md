# User Journey #02: Browsing and Engaging with Posts

**Journey Number:** 02
**Category:** Discovery
**User Persona:** Verified User (Level 1)
**Last Updated:** 2026-02-17
**Status:** Draft

## Journey Overview

**Goal:** Enable a verified user to discover relevant posts in their home feed, assess their quality through social signals (likes, comments), and engage with posts publicly through likes and comments.

**Trigger:** User opens app and lands on home feed, or navigates to Home tab.

**Success Criteria:**
- User successfully browses posts with enhanced information (author, description preview)
- User understands social signals (likes, comments count)
- User can like posts to bookmark and indicate helpfulness
- User can read and write comments to engage publicly with post authors and community

**Estimated Duration:** 3-5 minutes (browsing and engaging with 2-3 posts)

## Prerequisites

**Must Complete First:**
- User Journey #01: Signup and Onboarding (account created, metro area set)
- User Journey #02: Phone Verification (trust level 1 achieved) - OR - User can only view, not interact

**Should Have:**
- Active posts in user's metro area
- User's trust level is 1+ (for likes and comments)

## User Persona Details

**Name:** Rajesh Thapa
**Age:** 28 years old
**Background:** Software engineer who moved to Dallas 1 year ago. Looking for a Nepali roommate because his current roommate is moving out next month. Active in the community, already verified on Nepally (Level 1).

**Metro:** Dallas-Fort Worth-Arlington, TX
**Trust Level:** 1 (Verified)
**Tech Savviness:** High (daily app user)
**Primary Device:** iPhone 14
**Language:** Fluent in English and Nepali

**Context:** Rajesh is sitting in his living room on Sunday morning, browsing Nepally to find housing posts. He wants to find someone looking for a roommate in his apartment complex or nearby. He also wants to check the credibility of posts by seeing who posted them and what others think (likes, comments).

**Goals:**
1. Find a reliable Nepali roommate
2. Ask questions about housing arrangements publicly (so others can benefit from the answers)
3. Like posts that seem promising so he can find them later
4. Read comments from others to learn more about the poster's credibility

## Step-by-Step Journey

### Phase 1: Opening App and Viewing Enhanced Home Feed

#### Step 1: Open App and Land on Home Screen
**User Action:** Rajesh opens the Nepally app from his iPhone home screen.

**System Response:** App loads and displays Home screen with enhanced post feed.

**User Sees:**
- Header: "Dallas-Fort Worth-Arlington, TX" with location pin icon
- Search icon (top-right)
- Notifications bell icon (top-right)
- Category filter tabs: All (selected), Housing, Jobs, Help, Question, Politics, Discussion, Emergency
- List of post cards with:
  - **Author avatar** (circular profile photo or initials)
  - **Author name** + trust badge (blue checkmark)
  - **Post title** (bold, prominent)
  - **Local/Global badge** (📍 Local or 🌐 Global)
  - **Description preview** (2 lines, "Looking for Nepali roommate to share 2BR apartment near UTD campus. Clean, qu..." with "View More" link)
  - **Tag pills** (e.g., [🏠 Housing] [❓ Question])
  - **Action bar at bottom:**
    - Heart icon (outline) + likes count "12"
    - Comment bubble icon + comments count "3"
    - Message icon (chat)
  - **Timestamp** "Posted 2h ago"
- Floating action button (+ icon, blue, bottom-right)

**Duration:** 2 seconds (app loads)

**User Thoughts:**
- "Oh nice, I can now see who posted each listing"
- "This post has 12 likes and 3 comments, seems legit"
- "I can read a bit of the description without clicking in"

**Pain Points:** None

**Validation/Constraints:** None

---

#### Step 2: Browse Feed and Assess Post Quality
**User Action:** Rajesh scrolls through the feed, reading post cards.

**System Response:** Feed scrolls smoothly, loading more posts as he reaches the bottom (pagination).

**User Sees:**
- Multiple post cards with varying engagement:
  - Post A: 24 likes, 8 comments (high engagement)
  - Post B: 2 likes, 0 comments (new or low quality)
  - Post C: 15 likes, 5 comments (moderate engagement)
- Different authors with profile photos and trust badges
- Description previews help him quickly decide relevance

**Duration:** 1-2 minutes (browsing 8-10 posts)

**User Thoughts:**
- "Posts with more likes probably have better info"
- "I recognize some names from the community"
- "The description previews save me time - I don't have to click into every post"

**Pain Points:** None

**Validation/Constraints:** None

---

### Phase 2: Liking a Post

#### Step 3: Like a Promising Post
**User Action:** Rajesh sees a post from "Sita Gurung" offering a room in his preferred area (near UTD). He taps the heart icon to like it.

**System Response:** 
- Heart icon animates (scales up, fills with red color)
- Like count increments: "12" → "13"
- System saves like record to database
- Post is bookmarked for Rajesh to find later (future: "Liked Posts" filter)

**User Sees:**
- Heart icon now filled (solid red)
- Updated count "13"
- Smooth animation provides feedback

**Duration:** < 1 second (instant feedback)

**User Thoughts:**
- "Good, I've marked this one. I'll come back to it later"
- "Helpful to see my likes count toward the post's credibility"

**Pain Points:** None

**Validation/Constraints:**
- User must be Level 1+ (Rajesh is, so no issue)
- User can only like once (enforced by database constraint)

**API Call:** `POST /api/likes { post_id, user_id }`

---

#### Step 4: Unlike a Post (Change of Mind)
**User Action:** Rajesh continues scrolling and finds a better post. He goes back to the previous post and taps the heart icon again to unlike it.

**System Response:**
- Heart icon animates (unfills back to outline)
- Like count decrements: "13" → "12"
- System deletes like record from database

**User Sees:**
- Heart icon now outline (not filled)
- Updated count "12"

**Duration:** < 1 second (instant feedback)

**User Thoughts:**
- "Easy to change my mind"

**Pain Points:** None

**Validation/Constraints:**
- Can only unlike posts user has already liked

**API Call:** `DELETE /api/likes { post_id, user_id }`

---

### Phase 3: Viewing Post Details and Comments

#### Step 5: Tap on Post to View Full Details
**User Action:** Rajesh taps on a post card from "Sita Gurung" to see full details.

**System Response:** Navigate to PostDetailScreen.

**User Sees:**
- **Header:** Post title + back button
- **Top section (interaction-first):**
  - Author avatar + full name "Sita Gurung" + verified badge + subtle "Posted 2h ago"
  - **Title** immediately under author row
  - **Full description** (no truncation):
    "Looking for Nepali roommate to share 2BR apartment near UTD campus. Clean, quiet environment. Rent is $800/month including utilities. Move-in date flexible (March 1 or later). I'm a grad student at UTD studying Computer Science. Prefer someone who speaks Nepali and respects cultural values. Apartment has in-unit washer/dryer, gym, pool. Close to Indian grocery stores."
  - **Action row:** Like count, comment count, Save (coming soon), Share
  - **Compact metadata row:** 📍 Local, [🏠 Housing] [❓ Question], Dallas, TX 75080
- **Comments section:**
  - Section header: "Comments (3)"
  - List of 3 top-level comments sorted by most recent activity:
    1. Avatar + "Priya Sharma" + verified badge + "Is parking included?" + "1h ago" + delete icon (hidden - not her comment)
    2. Avatar + "Sita Gurung" (author) + verified badge + "Yes, one covered parking spot is included!" + "50m ago"
    3. Avatar + "Ram Poudel" + verified badge + "Interested! Sending you a message." + "30m ago"
  - Reply controls on each top-level comment with single-level thread reveal:
    - "Reply" action
    - "Show replies (N) / Hide replies"
  - **Comment input:** (at bottom, sticky)
    - Multi-line text input with placeholder: "Add a comment..."
    - Character counter: "0/1000"
    - Send button (paper plane icon, disabled - no text yet)

**Duration:** 3 seconds (screen transition + content load)

**User Thoughts:**
- "Good, I can see the full details now"
- "Sita already answered a question about parking publicly - helpful!"
- "I have a question too, let me ask in comments so others can see"

**Pain Points:** None

**Validation/Constraints:** None

---

#### Step 6: Read Existing Comments
**User Action:** Rajesh scrolls down to read the comments section.

**System Response:** Comments list is already loaded and visible.

**User Sees:**
- Top-level comments ordered by most recent activity (new replies bump parent threads)
- Helpful context: Priya asked about parking, Sita (author) replied
- Ram expressed interest

**Duration:** 10 seconds (reading comments)

**User Thoughts:**
- "Good to see the author is responsive"
- "Parking is included - that's great!"
- "Seems like a legitimate post with real engagement"

**Pain Points:** None

**Validation/Constraints:** None

---

### Phase 4: Adding a Public Comment

#### Step 7: Write a Comment
**User Action:** Rajesh taps on the comment input box and types: "Hi Sita! I'm also at UTD doing MS in CS. Do you have any pet restrictions?"

**System Response:** 
- Keyboard opens
- Text input accepts typing
- Character counter updates: "0/1000" → "87/1000"
- Send button becomes enabled (blue, tappable)

**User Sees:**
- Active text input with his typed message
- Character counter showing remaining space
- Enabled send button

**Duration:** 15 seconds (typing)

**User Thoughts:**
- "I'll ask this publicly so others know too"
- "Character limit is generous, I can write detailed questions"

**Pain Points:** None

**Validation/Constraints:**
- Comment must be 1-1000 characters
- User must be Level 1+ (Rajesh is verified, so no issue)

---

#### Step 8: Submit Comment
**User Action:** Rajesh taps the send button.

**System Response:**
- Comment appears in the list immediately (optimistic update)
  - Avatar: Rajesh's initials "RT"
  - Name: "Rajesh Thapa" + verified badge
  - Content: "Hi Sita! I'm also at UTD doing MS in CS. Do you have any pet restrictions?"
  - Timestamp: "Just now"
  - Delete icon: Visible (his own comment)
- Comment input clears
- Keyboard dismisses
- System saves comment to database
- Post's comments_count increments: "3" → "4"
- Section header updates: "Comments (3)" → "Comments (4)"

**User Sees:**
- His comment now appears in the list
- Empty input box (ready for more comments)
- Updated comment count

**Duration:** < 1 second (instant feedback)

**User Thoughts:**
- "Great! My question is posted for everyone to see"
- "Hopefully Sita responds soon"

**Pain Points:** None

**Validation/Constraints:**
- User must be Level 1+ (enforced by RLS policy)

**API Call:** `POST /api/comments { post_id, author_id, content }`
**API Call (reply):** `POST /api/comments { post_id, author_id, content, parent_comment_id }`

---

### Phase 5: Interacting with Own Comment

#### Step 9: Delete Own Comment (Optional)
**User Action:** Rajesh realizes he made a typo and wants to delete his comment. He taps the trash icon next to his comment.

**System Response:**
- Confirmation dialog appears:
  - Title: "Delete Comment"
  - Message: "Are you sure you want to delete this comment? This cannot be undone."
  - Buttons: "Cancel" (gray), "Delete" (red)

**User Sees:** Confirmation dialog overlay

**Duration:** < 1 second

**User Thoughts:**
- "Better confirm before deleting"

**Pain Points:** None

**Validation/Constraints:** None

---

#### Step 10: Confirm Deletion
**User Action:** Rajesh taps "Delete" button.

**System Response:**
- Dialog dismisses
- Comment removed from list (fade-out animation)
- Post's comments_count decrements: "4" → "3"
- Section header updates: "Comments (4)" → "Comments (3)"
- System soft-deletes comment in database (is_deleted = true)

**User Sees:**
- Comment disappears from list
- Updated comment count
- Can post a new corrected comment if desired

**Duration:** < 1 second

**User Thoughts:**
- "Clean removal, no clutter"
- "I can post a corrected comment now"

**Pain Points:** None

**Validation/Constraints:**
- Can only delete own comments (enforced by RLS policy)

**API Call:** `DELETE /api/comments/:commentId`

---

### Phase 6: Navigating Back to Home Feed

#### Step 11: Return to Home Feed
**User Action:** Rajesh taps the back button to return to the home feed.

**System Response:** Navigate back to HomeScreen (home feed).

**User Sees:**
- Home feed with same scroll position (or top of feed)
- Post he just viewed now shows:
  - Updated like count (if he liked it)
  - Updated comment count (if he commented)
  - Heart icon filled (if he liked it)

**Duration:** < 1 second (screen transition)

**User Thoughts:**
- "Good, I can continue browsing"
- "I can see my like/comment reflected on the card"

**Pain Points:** None

**Validation/Constraints:** None

---

### Phase 7: Level 0 User Experience (Comparison)

#### Step 12: Level 0 User Attempts to Like a Post
**User Context:** Imagine Rajesh was still Level 0 (not verified).

**User Action:** Taps heart icon on a post card.

**System Response:**
- Heart icon does NOT fill (disabled state)
- Toast message appears: "Verify your account to like posts"
- No like record created

**User Sees:**
- Toast notification at bottom: "Verify your account to like posts"
- Heart icon remains outline (disabled, grayed out)
- Prompt to verify account

**Duration:** 2 seconds (toast display)

**User Thoughts:**
- "I need to verify to interact with posts"
- "Makes sense for spam prevention"

**Pain Points:** Minor friction, but encourages verification

**Validation/Constraints:**
- Only Level 1+ users can like posts

---

#### Step 13: Level 0 User Attempts to Comment
**User Context:** Imagine Rajesh was Level 0 on PostDetailScreen.

**User Action:** Taps on comment input box.

**System Response:**
- Comment input is disabled (grayed out)
- Placeholder text: "Verify your account to comment"
- Toast message: "Complete verification to comment on posts"

**User Sees:**
- Disabled input with prompt
- Toast notification

**Duration:** 2 seconds

**User Thoughts:**
- "I can read comments but not post yet"
- "Let me verify my account"

**Pain Points:** Encourages verification (intentional friction)

**Validation/Constraints:**
- Only Level 1+ users can comment

---

## Journey Completion

**Final Outcome:**
- ✅ Rajesh successfully browsed enhanced post feed with author info and engagement signals
- ✅ Rajesh liked a post to bookmark it and indicate helpfulness
- ✅ Rajesh read existing comments to learn more about the post
- ✅ Rajesh asked a public question via comment
- ✅ Rajesh understands the value of public engagement (benefits everyone)
- ✅ Rajesh can navigate between home feed and post details seamlessly

**Next Steps for User:**
- Wait for author to reply to his comment
- Message authors of liked posts via chat
- Continue browsing for more housing options
- Return to "Liked Posts" filter later (future feature)

**Success Indicators:**
- User engaged with 2-3 posts
- User liked 1-2 posts
- User commented on 1 post
- User spent 3-5 minutes browsing (healthy engagement)

---

## User Insights

### Pain Points Discovered
1. **None identified** - Enhanced post cards provide all needed context
2. **Minor:** Level 0 users may feel friction when trying to engage, but this is intentional for spam prevention

### Positive Feedback
1. "Seeing likes and comments helps me trust posts more"
2. "Description previews save me time - I don't have to click into every post"
3. "Public comments let me learn from others' questions"
4. "Liking posts is a quick way to bookmark for later"

### Opportunities
1. **Future:** Add "Liked Posts" filter to home feed for easy access to bookmarked posts
2. **Future:** Add real-time comment updates so author responses appear instantly
3. **Future:** Show "Liked by [mutual friends]" for social proof

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User tries to like the same post twice | Like button toggles (unlike), no error |
| User tries to comment on deleted post | Post detail screen shows "Post no longer available" |
| User's comment fails to post (network error) | Toast: "Failed to post comment. Try again." Optimistic update reverted |
| User tries to delete someone else's comment | Delete icon not visible, API returns 403 error |
| Post has 0 likes and 0 comments | Show "0" for both (not hidden), indicates new post |
| Post has 1000+ likes | Display "1K", "1.2K" etc. with proper formatting |
| User scrolls to bottom of comment list | Load more comments (pagination, 20 per page) |

---

## API Interactions

| Action | Endpoint | Payload | Response |
|--------|----------|---------|----------|
| Like post | `POST /api/likes` | `{ post_id, user_id }` | `{ success: true }` |
| Unlike post | `DELETE /api/likes` | `{ post_id, user_id }` | `{ success: true }` |
| Get comments | `GET /api/comments?post_id=X` | N/A | `{ comments: [...] }` |
| Create comment | `POST /api/comments` | `{ post_id, author_id, content }` | `{ comment: {...} }` |
| Delete comment | `DELETE /api/comments/:id` | N/A | `{ success: true }` |

---

## Dependencies

**Completed:**
- User Journey #01: Signup and Onboarding
- Feature 5.1-5.4: Post viewing on home feed
- Feature 8.1-8.7: In-app chat (private messaging)

**Blocked By:**
- Feature 3.5: Profile photo upload (avatar display dependson this)
- Feature 5.9-5.11: Enhanced post cards, likes, comments (this journey tests these features)

---

## Related Documentation

- [Feature Spec: Post Likes and Comments](../features/post-likes-and-comments.md)
- [Wireframe: Enhanced Home Screen](../wireframes/06-home-screen-level-0.md)
- [Wireframe: Post Detail with Comments](../wireframes/09-post-detail.md)
- [Phase 1 Feature Breakdown](../features/phase1-feature-breakdown.md)
