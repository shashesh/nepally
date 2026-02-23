# Post Likes and Comments

**Status:** Planned
**Phase:** 1 (Utility Core & Trust Foundation)
**Last Updated:** 2026-02-16

---

## Overview

Add social engagement features to posts: likes (helpful votes) and public comments. This enhances the home feed post cards to be more informative and interactive, showing author information, description previews, and engagement metrics. Users can like posts to indicate helpfulness and engage in public comment discussions separate from private chat.

## Problem Statement

Current post cards on the home feed are minimal, showing only title and basic metadata. Users cannot:
- See who posted without clicking into the detail screen
- Preview the post description
- Publicly indicate if a post is helpful (like/helpful vote)
- Have public discussions about posts (all communication is private 1-on-1 chat)
- Quickly gauge community engagement with a post

This creates friction in discovery and reduces community trust signals.

## User Stories

**Primary:**
- As a user browsing the home feed, I want to see the post author's photo and name so that I can quickly assess credibility
- As a user, I want to preview the post description on the feed so that I can decide if it's relevant before clicking
- As a user, I want to like helpful posts so that I can bookmark them and help others discover quality content
- As a user, I want to see how many people liked a post so that I can gauge community trust
- As a user, I want to read and write public comments on posts so that I can ask questions that benefit everyone

**Secondary:**
- As a Level 0 user, I want to see likes and comments so that I understand the community value (but cannot interact until verified)
- As a post author, I want to see who liked my post and respond to comments so that I can engage with interested people
- As a moderator, I want to review flagged comments so that I can remove inappropriate content

---

## Scope (Features)

| Feature | Description | Priority |
|---------|-------------|----------|
| **5.9** Enhanced Post Card UI | Redesign feed post cards with author info, description preview, engagement actions | Must-have |
| **5.10** Post Likes (Helpful Votes) | Users can like posts; like counter and individual tracking | Must-have |
| **5.11** Post Comments (Public Replies) | Public comment threads on posts | Must-have |
| **3.5** Profile Photo Display | Show user avatars throughout app (already in roadmap, now prioritized) | Must-have |

**Out of scope (this iteration):**
- Multi-level nested replies (single-level replies only)
- Comment likes/upvotes
- True "most liked" comment sorting (comment likes table not implemented yet)
- Comment editing (delete only)
- Likes on comments

---

## Requirements

### Functional Requirements

#### Enhanced Post Card UI (5.9)

**Home Feed Post Card:**
- [ ] Display author avatar (40x40px circle, top-left corner)
  - Show profile photo if uploaded
  - Fallback to initials (first letter of first + last name)
  - Background color based on trust level
- [ ] Display author name next to avatar (14px, medium weight)
- [ ] Display trust badge next to name (verified checkmark for Level 1+)
- [ ] Display post title (16px, bold, unchanged)
- [ ] Display Local/Global badge (📍 Local or 🌐 Global pill)
- [ ] Display tag pills below title (1-3 colored pills from post's tags)
- [ ] Display post description preview:
  - Max 150 characters (truncate at last complete word)
  - 2 lines max with ellipsis
  - "View More" link if truncated (12px, primary color)
- [ ] Display action bar at bottom of card:
  - Like button (heart icon) + count (e.g., "24")
  - Comment button (chat bubble icon) + count (e.g., "5")
  - Message button (direct message icon, existing chat feature)
  - All icons 20px, evenly spaced
- [ ] Display timestamp (bottom-right, 12px, gray, unchanged)
- [ ] Card elevation and padding (unchanged)

**Tap Behaviors:**
- Tap card body → Navigate to PostDetailScreen
- Tap author avatar/name → Navigate to user profile (future feature, show toast "Coming soon" for now)
- Tap like button → Toggle like (heart fills/unfills)
- Tap comment button → Navigate to PostDetailScreen, scroll to comments
- Tap message button → Open/create chat conversation (existing behavior)
- Tap "View More" → Navigate to PostDetailScreen

**Level 0 User Restrictions:**
- Can view all content (likes, comments)
- Like button shows but is disabled with toast: "Verify your account to like posts"
- Comment button navigates to detail screen, but comment input is disabled with prompt: "Verify to comment"

#### Post Likes (5.10)

**Like Button Behavior:**
- [ ] Heart icon outline when not liked, filled when liked
- [ ] Tap to like: icon animates (scale + fill), count increments, record saved to DB
- [ ] Tap to unlike: icon animates (unfill), count decrements, record deleted from DB
- [ ] Optimistic UI: update immediately, revert on error
- [ ] Only Level 1+ users can like (Level 0 sees disabled state)
- [ ] User can like each post only once
- [ ] Like count displays next to button (e.g., "24" or "0" if none)

**Like Counter Display:**
- [ ] Show "0" if no likes (not hidden)
- [ ] Show exact count if < 1000 (e.g., "24")
- [ ] Show "1K", "1.2K" etc. if >= 1000
- [ ] Counter updates in real-time when user likes/unlikes

**Database:**
- [ ] `post_likes` table with: id, post_id, user_id, created_at
- [ ] Unique constraint on (post_id, user_id)
- [ ] `posts.likes_count` column (cached counter, updated via trigger)
- [ ] RLS: Anyone can view, Level 1+ can insert/delete own likes

**API Endpoints:**
- [ ] `likePost(postId, userId)` - Create like record
- [ ] `unlikePost(postId, userId)` - Delete like record
- [ ] `getUserLikedPosts(userId)` - Get list of post IDs user liked (for UI state)
- [ ] `getPostLikes(postId)` - Get list of users who liked a post (future feature: show liked by)

#### Post Comments (5.11)

**Comment Display (PostDetailScreen):**
- [ ] Post detail layout prioritizes conversation:
  1. Author row (avatar, name, trust, subtle timestamp)
  2. Title + full description
  3. Interaction row (Like count, Comments count, Save, Share)
  4. Compact metadata row (local/global badge, tags, location)
  5. Comments section
- [ ] Section header: "Comments (5)" with count
- [ ] Empty state: "No comments yet. Be the first to comment!"
- [ ] Comment list (single-level threaded):
  - Top-level comments sorted by most recent activity (latest comment/reply first)
  - Author avatar (32x32px) + name + trust badge
  - Comment text (14px, wraps)
  - Timestamp (relative, e.g., "2h ago")
  - Reply action on top-level comments
  - Replies are one level deep with "Show replies / Hide replies"
  - Delete button (trash icon, only visible to comment author)
- [ ] Comment input at bottom (sticky):
  - Multi-line text input (max 1000 chars)
  - Character counter (1000/1000)
  - Send button (disabled when empty)
  - Placeholder: "Add a comment..."
  - Only visible for Level 1+ users
  - Level 0 users see: "Verify your account to comment"

**Comment Creation:**
- [ ] User types top-level comment or reply (1-1000 chars)
- [ ] Tap send → comment posted, appears in list immediately (optimistic)
- [ ] Comment saved to DB
- [ ] Post's `comments_count` increments
- [ ] Input clears after successful post
- [ ] Error handling: show toast, revert optimistic update

**Comment Deletion:**
- [ ] Only comment author can delete their own comment
- [ ] Tap trash icon → confirmation dialog: "Delete this comment?"
- [ ] On confirm → comment removed from list, DB record soft-deleted (`is_deleted = true`)
- [ ] Post's `comments_count` decrements
- [ ] Cannot be undone

**Comment Counter on PostCard:**
- [ ] Show "0" if no comments (not hidden)
- [ ] Show exact count if < 1000 (e.g., "5")
- [ ] Show "1K", "1.2K" etc. if >= 1000
- [ ] Counter updates when user adds/deletes comment

**Database:**
- [ ] `post_comments` table with: id, post_id, author_id, content, is_deleted, created_at, updated_at
- [ ] `parent_comment_id` field (nullable, for future nested replies, unused in Phase 1)
- [ ] `posts.comments_count` column (cached counter, updated via trigger)
- [ ] RLS: Anyone can view non-deleted comments, Level 1+ can insert/delete own comments

**API Endpoints:**
- [ ] `getPostComments(postId)` - Get all comments for a post
- [ ] `createComment(postId, authorId, content, parentCommentId?)` - Create top-level comment or single-level reply
- [ ] `deleteComment(commentId, userId)` - Soft-delete comment (checks ownership)

#### Profile Photo Display (3.5)

**Profile Photo Upload (EditProfileScreen):**
- [ ] Photo section at top of EditProfileScreen
- [ ] Display current photo (or initials avatar if none)
- [ ] "Change Photo" button opens picker:
  - Camera option
  - Photo library option
  - Remove photo option (if photo exists)
- [ ] After selection: show image cropping UI (square crop, 1:1 ratio)
- [ ] Upload to Supabase Storage: `avatars/` bucket
- [ ] File naming: `{userId}.jpg`
- [ ] Max file size: 5MB (pre-compression)
- [ ] Auto-compress to max 500KB, 500x500px
- [ ] Update `users.profile_photo` field with Storage URL
- [ ] Show loading indicator during upload
- [ ] Error handling: show toast if upload fails

**Avatar Component:**
- [ ] Display profile photo if URL exists and loads successfully
- [ ] Fallback to initials avatar if:
  - No photo uploaded
  - Photo fails to load
  - Photo URL is invalid
- [ ] Initials logic:
  - Extract first letter of first name + first letter of last name
  - Uppercase (e.g., "John Doe" → "JD")
  - Handle single names (e.g., "Madonna" → "M")
- [ ] Background color based on trust level:
  - Level 0: Light gray (#E0E0E0)
  - Level 1: Blue (#4A90E2)
  - Level 2: Purple (#7B61FF)
- [ ] Text color: White
- [ ] Circular shape (border-radius: 50%)
- [ ] Sizes: 32px (comments), 40px (post cards), 64px (profile screen)

**Display Locations:**
- [ ] Home feed post cards (40x40px)
- [ ] Post detail screen (author section, 40x40px)
- [ ] Comment list (32x32px per comment)
- [ ] Conversation list (40x40px)
- [ ] Message thread header (40x40px)
- [ ] Profile screen (64x64px)

---

## Database Schema Changes

### New Tables

```sql
-- Post Likes (individual like tracking)
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one like per user per post
  UNIQUE(post_id, user_id)
);

-- Post Comments (public discussion threads)
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  
  -- Optional: support for nested replies (unused in Phase 1)
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  
  -- Status
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table Modifications

```sql
-- Add cached counters to posts table
ALTER TABLE posts ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0;

-- Note: posts.description already exists, no change needed
-- Note: users.profile_photo already exists, no change needed
```

### Indexes

```sql
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_post_comments_is_deleted ON post_comments(is_deleted) WHERE is_deleted = false;
```

### Triggers (Counter Maintenance)

```sql
-- Increment likes_count when like is added
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_post_likes_count
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes_count();

-- Decrement likes_count when like is removed
CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_post_likes_count
  AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes_count();

-- Increment comments_count when comment is added
CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_post_comments_count
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments_count();

-- Decrement comments_count when comment is deleted
CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_post_comments_count
  AFTER UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments_count();
```

### Row Level Security

```sql
-- Post Likes RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Level 1+ users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1)
  );

CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Post Comments RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted comments"
  ON post_comments FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Level 1+ users can comment"
  ON post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1)
  );

CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Moderators can update any comment"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true)
  );
```

---

## UI/UX Specifications

See detailed wireframe updates:
- [Home Screen with Enhanced Post Cards](../wireframes/06-home-screen-level-0.md#post-card-enhanced)
- [Post Detail with Comments](../wireframes/09-post-detail.md#comments-section)
- [Profile Photo Upload](../wireframes/10-profile-photo-upload.md)

---

## Technical Implementation

### New Components

**`Avatar.tsx`**
- Props: `userId`, `photoUrl`, `name`, `trustLevel`, `size` (32 | 40 | 64)
- Displays profile photo or initials fallback
- Background color based on trust level

**`LikeButton.tsx`**
- Props: `postId`, `initialLiked`, `initialCount`, `disabled`
- Heart icon that toggles filled/outline
- Handles optimistic updates
- Emits `onLikeToggle` event

**`CommentItem.tsx`**
- Props: `comment`, `canDelete`, `onDelete`
- Displays single comment with author info
- Shows delete button for comment author

**`CommentsList.tsx`**
- Props: `postId`, `comments`, `onCommentAdded`, `onCommentDeleted`
- List container for comments
- Empty state handling

**`CommentInput.tsx`**
- Props: `postId`, `authorId`, `onCommentAdded`, `disabled`
- Text input with character counter
- Send button
- Handles comment submission

### Updated Components

**`PostCard.tsx`**
- Add author avatar, name, trust badge
- Add description preview with "View More"
- Add action bar with like, comment, message buttons
- Handle Level 0 disabled states

**`PostDetailScreen.tsx`**
- Add like button to header/action section
- Add comments section below post details
- Add comment input (Level 1+ only)

**`EditProfileScreen.tsx`**
- Add photo upload section at top
- Image picker integration
- Supabase Storage upload

### New API Services

**`services/api/likes.ts`**
```typescript
export async function likePost(postId: string, userId: string)
export async function unlikePost(postId: string, userId: string)
export async function getUserLikedPosts(userId: string): Promise<string[]>
export async function isPostLikedByUser(postId: string, userId: string): Promise<boolean>
```

**`services/api/comments.ts`**
```typescript
export async function getPostComments(postId: string): Promise<Comment[]>
export async function createComment(postId: string, authorId: string, content: string)
export async function deleteComment(commentId: string, userId: string)
export async function subscribeToComments(postId: string, callback: (comment: Comment) => void)
```

**`services/api/storage.ts`**
```typescript
export async function uploadProfilePhoto(userId: string, imageUri: string): Promise<string>
export async function deleteProfilePhoto(userId: string)
export async function getProfilePhotoUrl(userId: string): Promise<string | null>
```

---

## Success Metrics

**Engagement:**
- 40%+ of active users like at least one post per week
- 20%+ of active users comment on at least one post per week
- Average 3-5 likes per post
- Average 1-2 comments per post

**Quality:**
- < 5% of comments flagged as spam or inappropriate
- Posts with 10+ likes have 2x higher conversion rate (messages sent to author)

**User Satisfaction:**
- Users report home feed is more informative and trustworthy
- Reduction in "Why did you ask this via private message?" responses (questions should be public comments)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Spam comments** | High | RLS restricts to Level 1+, add reporting system, moderator review |
| **Like manipulation** | Medium | One like per user per post (DB constraint), track suspicious patterns |
| **Storage costs for photos** | Low | Auto-compress to 500KB, 500x500px; estimate $10-20/month for 1000 users |
| **Abuse via comments** | High | Delete own comment, report function, moderator tools |
| **Performance (loading photos)** | Medium | Use CDN (Supabase Storage), lazy load images, cache aggressively |

---

## Dependencies

**Must Complete First:**
- Feature 1.1-1.5: User authentication (✅ Done)
- Feature 3.1: Basic profile creation (✅ Done)
- Feature 5.1-5.4: Post viewing (✅ Done)

**Blocks:**
- Feature 9.1: Reporting system (comments need to be reportable)

---

## Future Enhancements (Post-Phase 1)

- Nested comment replies (threading)
- Comment upvotes/downvotes
- Sort comments by: Newest, Oldest, Most Helpful
- Edit comments (with edit history)
- Tag users in comments (@mention)
- Real-time comment updates (Supabase Realtime subscription)
- Show "Liked by [names]" on hover/tap
- Helpful badge on posts with 10+ likes

---

## Open Questions

None - planning phase complete, ready for implementation.
