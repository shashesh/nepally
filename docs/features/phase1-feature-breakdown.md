# Phase 1: Feature Breakdown & Implementation Sequence

**Version:** 1.0
**Date:** 2026-02-06
**Phase:** Phase 1 - Utility Core & Trust Foundation

---

## Overview

This document breaks down Phase 1 into small, implementable features with a recommended sequence. Each feature is sized to be completable in 1-5 days by a single developer.

**Total Features:** 62
**Estimated Timeline:** 3.5-4.5 months
**Parallel Work:** Some features can be built in parallel (marked with 🔄)

---

## Feature Categories

- 🔐 **Authentication & Identity** (11 features)
- 📍 **Location & Metro System** (4 features)
- 👤 **User Profiles** (5 features)
- 🏆 **Trust Level System** (8 features)
- 📝 **Post Engine - Core** (10 features)
- 🏠 **Post Categories** (4 features)
- 💬 **In-App Chat** (8 features)
- 📸 **Photo Upload** (5 features)
- 🚨 **Reporting System** (4 features)
- 🛡️ **Admin Dashboard** (6 features)
- ⏰ **Post Expiry** (3 features)
- 🔔 **Notifications** (4 features)

---

## Implementation Sequence

### MILESTONE 1: Foundation (Weeks 1-4)

Build the core infrastructure that everything else depends on.

#### 🔐 Authentication & Identity

**1.1 User Registration**
- **What:** Create new user accounts with email and password
- **Acceptance Criteria:**
  - User can enter email, password, confirm password
  - Email format validation
  - Password strength requirements (min 8 chars, 1 number, 1 special char)
  - Check for duplicate emails
  - Create user record in database
  - Send email verification link (optional for MVP)
- **Dependencies:** None
- **Estimated Effort:** 2-3 days

**1.2 User Login**
- **What:** Authenticate existing users
- **Acceptance Criteria:**
  - User can enter email and password
  - Validate credentials against database
  - Generate authentication token/session
  - Redirect to home screen on success
  - Display error message on failure
- **Dependencies:** 1.1
- **Estimated Effort:** 1-2 days

**1.3 Password Reset**
- **What:** Allow users to reset forgotten passwords
- **Acceptance Criteria:**
  - User enters email address
  - System sends reset link via email
  - User clicks link and sets new password
  - Old password invalidated
- **Dependencies:** 1.1, 1.2
- **Estimated Effort:** 2 days

**1.4 User Logout**
- **What:** End user session
- **Acceptance Criteria:**
  - User clicks logout button
  - Session/token invalidated
  - Redirect to login screen
  - Secure cleanup of local data
- **Dependencies:** 1.2
- **Estimated Effort:** 0.5 days

**1.5 Session Management**
- **What:** Maintain user authentication state across app restarts
- **Acceptance Criteria:**
  - Remember logged-in user on app restart
  - Auto-logout after 30 days of inactivity
  - Token refresh mechanism
  - Handle expired sessions gracefully
- **Dependencies:** 1.2
- **Estimated Effort:** 2 days

---

#### 📍 Location & Metro System

**2.1 ZIP Code Input**
- **What:** Collect user's ZIP code during onboarding
- **Acceptance Criteria:**
  - Input field for 5-digit ZIP code
  - Format validation (must be 5 digits)
  - Verify ZIP code exists in US postal system
  - Display error for invalid ZIP codes
- **Dependencies:** 1.1
- **Estimated Effort:** 1 day

**2.2 ZIP to Metro Area Mapping**
- **What:** Convert ZIP code to US Census Metro Area ID
- **Acceptance Criteria:**
  - Lookup ZIP code in metro area database/API
  - Return metro area name (e.g., "Dallas-Fort Worth-Arlington")
  - Return metro area ID (unique identifier)
  - Handle ZIP codes not in metro areas (rural areas)
  - Display metro area to user for confirmation
- **Dependencies:** 2.1
- **Estimated Effort:** 3 days (includes data source integration)

**2.3 Metro Area Storage**
- **What:** Store user's metro area in their profile
- **Acceptance Criteria:**
  - Save metro area ID to user profile
  - Save metro area name for display
  - Allow user to update metro area later (if they move)
- **Dependencies:** 2.2, 3.1
- **Estimated Effort:** 1 day

**2.4 Metro Area Filter**
- **What:** Filter content by metro area
- **Acceptance Criteria:**
  - Query posts by metro area ID
  - Default filter to user's home metro
  - Return only posts matching metro area
  - Handle users with no metro area set
- **Dependencies:** 2.3
- **Estimated Effort:** 2 days

---

#### 👤 User Profiles

**3.1 Basic Profile Creation**
- **What:** Store essential user information
- **Acceptance Criteria:**
  - First name (required)
  - Last name (required)
  - Email (from registration)
  - Profile creation timestamp
  - User ID (unique identifier)
- **Dependencies:** 1.1
- **Estimated Effort:** 1 day

**3.2 Profile Display**
- **What:** Show user their own profile
- **Acceptance Criteria:**
  - Display name, email, metro area
  - Display trust level badge
  - Display join date
  - Display post count
- **Dependencies:** 3.1, 4.1
- **Estimated Effort:** 1-2 days

**3.3 Profile Editing**
- **What:** Allow users to update their profile
- **Acceptance Criteria:**
  - Edit first/last name
  - Update ZIP code (triggers metro area re-mapping)
  - Cannot edit email (security)
  - Save changes to database
  - Show confirmation message
- **Dependencies:** 3.2
- **Estimated Effort:** 1-2 days

**3.4 Public Profile View**
- **What:** View another user's profile (limited info)
- **Acceptance Criteria:**
  - Display first name + last initial (e.g., "Shashank K.")
  - Display trust level badge
  - Display member since date
  - Display metro area (city only, not full address)
  - Do NOT show email, phone, or other PII
- **Dependencies:** 3.2
- **Estimated Effort:** 1 day

**3.5 Profile Photo Upload** 🔄
- **What:** Allow users to add profile picture
- **Acceptance Criteria:**
  - Upload single photo
  - Crop/resize to square (200x200px)
  - Display in profile and next to posts/chats
  - Default avatar if no photo uploaded
- **Dependencies:** 7.1 (Photo Upload Core)
- **Estimated Effort:** 2 days
- **Note:** Can be built in parallel with photo upload feature

---

### MILESTONE 2: Trust & Verification (Weeks 3-6)

Build the trust level system that prevents spam.

#### 🏆 Trust Level System

**4.1 Trust Level Storage**
- **What:** Track user's current trust level
- **Acceptance Criteria:**
  - Default all new users to Level 0
  - Store trust level (0, 1, or 2) in user profile
  - Store trust level change history (timestamp, old level, new level, reason)
- **Dependencies:** 3.1
- **Estimated Effort:** 1 day

**4.2 Trust Level Display**
- **What:** Show trust level to users
- **Acceptance Criteria:**
  - Badge/icon showing Level 0, 1, or 2
  - Display on user's own profile
  - Display on public profiles
  - Display next to posts (author's level)
  - Display next to chat messages (sender's level)
- **Dependencies:** 4.1
- **Estimated Effort:** 1-2 days

**4.3 Phone Verification Flow**
- **What:** Verify user's phone number via SMS OTP
- **Acceptance Criteria:**
  - User enters phone number (10 digits, US format)
  - System sends 6-digit OTP via SMS
  - User enters OTP within 10 minutes
  - Verify OTP matches
  - Mark user as phone-verified
  - Auto-promote to Level 1 on success
- **Dependencies:** 4.1
- **Estimated Effort:** 3-5 days (includes SMS service integration)

**4.4 Phone Verification UI**
- **What:** UI screens for phone verification
- **Acceptance Criteria:**
  - Phone number input screen
  - OTP input screen (6-digit code)
  - Resend OTP button (max 3 attempts)
  - Verification success screen
  - Error handling (invalid OTP, expired OTP)
- **Dependencies:** 4.3
- **Estimated Effort:** 2 days

**4.5 Social Media Verification (Optional)** 🔄
- **What:** Alternative to phone verification via OAuth
- **Acceptance Criteria:**
  - "Sign in with Facebook" or "Sign in with Google" button
  - OAuth flow to verify account ownership
  - Collect email from social provider
  - Auto-promote to Level 1 on success
- **Dependencies:** 4.1
- **Estimated Effort:** 3-4 days
- **Note:** Can be skipped for MVP if phone verification is sufficient

**4.6 Trust Level Enforcement - Posting**
- **What:** Enforce trust level restrictions on post creation
- **Acceptance Criteria:**
  - Level 0: Max 1 post per day
  - Level 1+: No daily limit (but rate limit of 10 posts/hour)
  - Emergency category: Require Level 1+ (block Level 0)
  - Display error message if limit exceeded
  - Display countdown timer until next post allowed
- **Dependencies:** 4.1, 5.1
- **Estimated Effort:** 2 days

**4.7 Post Count Tracking for Level 2**
- **What:** Track metrics for Level 2 promotion
- **Acceptance Criteria:**
  - Count total approved posts per user
  - Count upvotes per post (if voting implemented)
  - Calculate average upvotes per post
  - Store in user profile for moderator review
- **Dependencies:** 4.1, 5.6
- **Estimated Effort:** 2 days

**4.8 Moderator Endorsement for Level 2**
- **What:** Allow moderators to promote users to Level 2
- **Acceptance Criteria:**
  - Moderator views user profile in admin dashboard
  - "Promote to Level 2" button
  - Require reason/note for promotion
  - Update user's trust level to 2
  - Log action in audit trail
- **Dependencies:** 4.1, 10.1 (Admin Dashboard)
- **Estimated Effort:** 1-2 days

---

### MILESTONE 3: Core Posting System (Weeks 5-10)

Build the structured post engine.

#### 📝 Post Engine - Core

**5.1 Post Data Model**
- **What:** Define structure for all posts
- **Acceptance Criteria:**
  - Post ID (unique identifier)
  - Author ID (user who created it)
  - Category (Housing, Jobs, Emergency, Travel)
  - Metro Area ID
  - Creation timestamp
  - Expiry timestamp
  - Status (active, expired, flagged, removed)
  - Category-specific fields (flexible structure)
- **Dependencies:** 2.3, 3.1, 4.1
- **Estimated Effort:** 2 days

**5.2 Post Creation Form - Base**
- **What:** Reusable form framework for all categories
- **Acceptance Criteria:**
  - Category selection screen
  - Dynamic form that changes based on category
  - Form validation (required fields)
  - Auto-save draft (optional for MVP)
  - Submit button
- **Dependencies:** 5.1
- **Estimated Effort:** 3 days

**5.3 Post Feed - Local Metro**
- **What:** Display posts from user's metro area
- **Acceptance Criteria:**
  - List view of posts (most recent first)
  - Filter by user's metro area
  - Show post preview (title, category icon, first line)
  - Show author name and trust level
  - Show post age (e.g., "2 hours ago")
  - Infinite scroll / pagination
- **Dependencies:** 5.1, 2.4
- **Estimated Effort:** 3-4 days

**5.4 Post Detail View**
- **What:** Full view of a single post
- **Acceptance Criteria:**
  - Display all post fields
  - Display author info (name, trust level)
  - Display post timestamp
  - Display expiry countdown (e.g., "Expires in 28 days")
  - "Contact Author" button (opens chat)
  - "Report" button
  - Display photos if any
- **Dependencies:** 5.3
- **Estimated Effort:** 2-3 days

**5.5 Post Editing**
- **What:** Allow users to edit their own posts
- **Acceptance Criteria:**
  - Only post author can edit
  - Edit button on post detail view
  - Pre-fill form with existing data
  - Update post in database
  - Show "Edited" label with timestamp
  - Cannot change category after creation
- **Dependencies:** 5.4
- **Estimated Effort:** 2 days

**5.6 Post Deletion**
- **What:** Allow users to delete their own posts
- **Acceptance Criteria:**
  - Only post author can delete
  - Delete button on post detail view
  - Confirmation dialog ("Are you sure?")
  - Soft delete (mark as removed, don't permanently delete)
  - Remove from feed immediately
- **Dependencies:** 5.4
- **Estimated Effort:** 1 day

**5.7 Post Search**
- **What:** Search posts by keyword
- **Acceptance Criteria:**
  - Search bar in feed
  - Search across post titles and descriptions
  - Filter by category (optional)
  - Filter by metro area (default to local)
  - Display search results
- **Dependencies:** 5.3
- **Estimated Effort:** 2-3 days

**5.8 Post Filtering**
- **What:** Filter feed by category
- **Acceptance Criteria:**
  - Filter chips: All, Housing, Jobs, Emergency, Travel
  - Tap to filter feed
  - Display active filter
  - Clear filter button
- **Dependencies:** 5.3
- **Estimated Effort:** 1-2 days

**5.9 Post Sorting**
- **What:** Sort posts by different criteria
- **Acceptance Criteria:**
  - Sort by: Most Recent (default), Expiring Soon, Most Relevant (future)
  - Dropdown or tabs for sort options
  - Re-query posts with new sort order
- **Dependencies:** 5.3
- **Estimated Effort:** 1-2 days

**5.10 Draft Posts** 🔄
- **What:** Save incomplete posts as drafts
- **Acceptance Criteria:**
  - Auto-save form data every 30 seconds
  - "Save Draft" button
  - View drafts in profile
  - Resume editing draft
  - Delete draft
- **Dependencies:** 5.2
- **Estimated Effort:** 2-3 days
- **Note:** Can be added after MVP if time is short

---

#### 🏠 Post Categories - Specific Forms

**6.1 Housing Post Form**
- **What:** Structured form for housing posts
- **Acceptance Criteria:**
  - Rent amount ($, numeric input)
  - Move-in date (date picker)
  - Room type (dropdown: Private Room, Shared Room, Studio, 1BR, 2BR+)
  - Description (text area, max 500 chars)
  - Metro area (auto-filled from user profile, editable)
  - Photo upload (1-3 photos)
  - Validation: All fields required except description
- **Dependencies:** 5.2, 7.2 (Photo Upload)
- **Estimated Effort:** 2-3 days

**6.2 Jobs Post Form**
- **What:** Structured form for job posts
- **Acceptance Criteria:**
  - Job title (text input)
  - Pay range ($, two numeric inputs: min and max)
  - Employment type (dropdown: Full-Time, Part-Time, Contract, Internship, Gig)
  - Company name (text input)
  - Description (text area, max 500 chars)
  - "Do you need transportation to this job?" (yes/no toggle)
  - Metro area (auto-filled, editable)
  - Photo upload (1-3 photos)
- **Dependencies:** 5.2, 7.2
- **Estimated Effort:** 2-3 days

**6.3 Emergency Post Form**
- **What:** Structured form for emergency posts (Level 1+ only)
- **Acceptance Criteria:**
  - Emergency type (dropdown: Medical, Legal, Financial, Travel, Housing, Other)
  - Location/Hospital (text input)
  - Brief description (text area, max 300 chars)
  - Metro area (auto-filled, editable)
  - Photo upload (optional)
  - Trust level check: Block Level 0 users
  - Display disclaimer before submission (see 6.4)
- **Dependencies:** 5.2, 4.6, 7.2
- **Estimated Effort:** 2-3 days

**6.4 Emergency Post Disclaimer**
- **What:** Show warning before first emergency post
- **Acceptance Criteria:**
  - Modal dialog before form submission
  - Text: "⚠️ This is NOT a replacement for 911. Call emergency services first for life-threatening situations."
  - Checkbox: "I understand this platform is for community coordination only"
  - Cannot submit until checkbox checked
  - Show only on first emergency post per user
- **Dependencies:** 6.3
- **Estimated Effort:** 1 day

**6.5 Travel Post Form**
- **What:** Structured form for travel posts
- **Acceptance Criteria:**
  - Travel date (date picker)
  - Route: Two dropdowns (US Metro Area ↔ Nepal City)
  - Airline (text input, optional)
  - Description (text area, max 300 chars)
  - Metro area (departure city, auto-filled, editable)
  - Photo upload (optional)
- **Dependencies:** 5.2, 7.2
- **Estimated Effort:** 2-3 days

---

### MILESTONE 4: Communication (Weeks 8-14)

Build the in-app chat system.

#### 💬 In-App Chat

**8.1 Chat Data Model**
- **What:** Structure for conversations and messages
- **Acceptance Criteria:**
  - Conversation ID (unique per pair of users)
  - Participant IDs (2 users)
  - Last message timestamp
  - Last message preview text
  - Unread count per participant
  - Message ID, sender ID, text, timestamp, read status
- **Dependencies:** 3.1
- **Estimated Effort:** 2 days

**8.2 Initiate Chat from Post**
- **What:** Start conversation with post author
- **Acceptance Criteria:**
  - "Contact Author" button on post detail view
  - Check if conversation already exists between users
  - If exists, open existing conversation
  - If new, create conversation record
  - Navigate to message thread
  - Level 1+ users only can initiate
- **Dependencies:** 8.1, 5.4, 4.1
- **Estimated Effort:** 2 days

**8.3 Conversation List**
- **What:** View all active chats
- **Acceptance Criteria:**
  - List of conversations, sorted by most recent message
  - Display other user's name and profile photo
  - Display last message preview (first 50 chars)
  - Display timestamp of last message
  - Display unread badge if new messages
  - Tap to open conversation
- **Dependencies:** 8.1
- **Estimated Effort:** 3 days

**8.4 Message Thread View**
- **What:** View messages in a conversation
- **Acceptance Criteria:**
  - Display messages in chronological order
  - Show sender name/photo for each message
  - Show timestamp for each message
  - Differentiate user's messages from other user's (left/right alignment)
  - Auto-scroll to bottom on load
  - Real-time updates (new messages appear without refresh)
- **Dependencies:** 8.3
- **Estimated Effort:** 3-4 days

**8.5 Send Message**
- **What:** Send text messages in chat
- **Acceptance Criteria:**
  - Text input at bottom of thread
  - Send button
  - Message sent to database
  - Appears in thread immediately for sender
  - Real-time delivery to recipient
  - Update conversation's last message timestamp
- **Dependencies:** 8.4
- **Estimated Effort:** 2-3 days

**8.6 Read Receipts**
- **What:** Show when messages are read
- **Acceptance Criteria:**
  - Mark message as "read" when recipient views thread
  - Display "Read" or checkmark icon on sent messages
  - Update in real-time
- **Dependencies:** 8.5
- **Estimated Effort:** 1-2 days

**8.7 Block User**
- **What:** Block abusive users from messaging
- **Acceptance Criteria:**
  - "Block User" option in conversation
  - Confirmation dialog
  - Blocked user cannot send new messages
  - Existing conversation hidden from both users
  - Blocked user cannot see blocker's posts (future enhancement)
- **Dependencies:** 8.4
- **Estimated Effort:** 2 days

**8.8 Report Conversation**
- **What:** Flag abusive chats for moderator review
- **Acceptance Criteria:**
  - "Report" button in conversation
  - Select reason (spam, harassment, scam, inappropriate)
  - Submit report to moderator queue
  - Conversation marked as flagged
  - User can optionally block after reporting
- **Dependencies:** 8.4, 9.1 (Reporting System)
- **Estimated Effort:** 1-2 days

---

### MILESTONE 5: Photos & Media (Weeks 7-10, Parallel)

Build photo upload capability.

#### 📸 Photo Upload

**7.1 Photo Upload - Core** 🔄
- **What:** Infrastructure for uploading photos
- **Acceptance Criteria:**
  - Select photo from device gallery
  - Select photo from device camera
  - Upload to cloud storage
  - Return URL of uploaded photo
  - Handle upload errors
  - Show upload progress bar
- **Dependencies:** None (can start early)
- **Estimated Effort:** 3 days

**7.2 Photo Compression**
- **What:** Resize/compress photos before upload
- **Acceptance Criteria:**
  - Resize to max 1200px width (maintain aspect ratio)
  - Compress to max 2MB file size
  - Convert to JPEG format
  - Preserve image quality (80% quality setting)
- **Dependencies:** 7.1
- **Estimated Effort:** 2 days

**7.3 Multi-Photo Upload**
- **What:** Upload up to 3 photos per post
- **Acceptance Criteria:**
  - Select multiple photos (max 3)
  - Upload all in sequence
  - Display thumbnails while uploading
  - Remove photo before upload
  - Reorder photos (drag and drop)
- **Dependencies:** 7.1, 7.2
- **Estimated Effort:** 2-3 days

**7.4 Photo Display in Posts**
- **What:** Show photos in feed and post detail view
- **Acceptance Criteria:**
  - Display first photo as thumbnail in feed
  - Display all photos in post detail view
  - Tap to view full-size (lightbox/gallery view)
  - Swipe between photos
  - Pinch to zoom
- **Dependencies:** 7.3, 5.3, 5.4
- **Estimated Effort:** 2-3 days

**7.5 Thumbnail Generation**
- **What:** Create small thumbnails for feed
- **Acceptance Criteria:**
  - Generate 300px width thumbnail for each photo
  - Store both full-size and thumbnail
  - Use thumbnail in feed (faster loading)
  - Use full-size in detail view
- **Dependencies:** 7.2
- **Estimated Effort:** 1-2 days

---

### MILESTONE 6: Moderation & Safety (Weeks 10-14)

Build reporting and admin tools.

#### 🚨 Reporting System

**9.1 Report Post**
- **What:** Allow users to flag posts
- **Acceptance Criteria:**
  - "Report" button on post detail view
  - Modal with report reasons: Spam, Scam, Inappropriate Content, Harassment, Other
  - Optional text explanation (max 200 chars)
  - Submit report to database
  - Show confirmation message
  - User cannot report same post twice
- **Dependencies:** 5.4
- **Estimated Effort:** 2 days

**9.2 Auto-Hide Flagged Content**
- **What:** Automatically hide posts with 3+ reports
- **Acceptance Criteria:**
  - Count reports per post
  - When count >= 3, mark post as "auto-hidden"
  - Hide from feed immediately
  - Show in moderator queue for review
  - Notify post author (optional)
- **Dependencies:** 9.1
- **Estimated Effort:** 1-2 days

**9.3 Report Photo**
- **What:** Allow users to flag inappropriate photos
- **Acceptance Criteria:**
  - "Report Photo" option in photo viewer
  - Same reason selection as post reports
  - Flag photo in database
  - Auto-hide photo if 3+ reports (blur or remove)
  - Add to moderator queue
- **Dependencies:** 9.1, 7.4
- **Estimated Effort:** 1-2 days

**9.4 Report User Profile** 🔄
- **What:** Flag user profiles for review
- **Acceptance Criteria:**
  - "Report User" option on public profile
  - Reason selection
  - Submit to moderator queue
  - Moderator can ban user from admin dashboard
- **Dependencies:** 9.1, 3.4
- **Estimated Effort:** 1 day
- **Note:** Lower priority, can be added post-MVP

---

#### 🛡️ Admin Dashboard

**10.1 Admin Authentication**
- **What:** Secure login for moderators
- **Acceptance Criteria:**
  - Whitelist of moderator email addresses
  - Check if logged-in user is moderator
  - If yes, show "Admin" button in app
  - Navigate to admin dashboard (web view or separate app)
  - Display moderator name and role
- **Dependencies:** 1.2
- **Estimated Effort:** 2 days

**10.2 Flagged Content Queue**
- **What:** View all reported posts/photos/chats
- **Acceptance Criteria:**
  - List of flagged content, sorted by report count (highest first)
  - Display content preview
  - Display report count and reasons
  - Display author info
  - Filter by content type (posts, photos, chats)
  - Filter by status (pending, reviewed, resolved)
- **Dependencies:** 10.1, 9.1
- **Estimated Effort:** 3-4 days

**10.3 Moderate Flagged Content**
- **What:** Review and take action on reports
- **Acceptance Criteria:**
  - View full content (post, photo, or chat)
  - View all reports (who reported, when, reason)
  - Actions: Approve (clear flags), Remove (delete content), Ban User
  - Require reason/note for action
  - Update content status
  - Log action in audit trail
- **Dependencies:** 10.2
- **Estimated Effort:** 3 days

**10.4 User Management**
- **What:** View and manage user accounts
- **Acceptance Criteria:**
  - Search users by name or email
  - View user profile (posts, trust level, join date, report history)
  - Ban user (disable account)
  - Unban user
  - Change trust level (promote to Level 2 or demote)
  - View user's post history
- **Dependencies:** 10.1, 4.8
- **Estimated Effort:** 3-4 days

**10.5 Platform Statistics**
- **What:** Dashboard with key metrics
- **Acceptance Criteria:**
  - Total users, verified users (Level 1+), contributor users (Level 2)
  - Total posts by category
  - Spam rate (flagged posts / total posts)
  - Active chats count
  - Posts created in last 7 days (engagement metric)
  - Charts/graphs for trends over time (optional)
- **Dependencies:** 10.1
- **Estimated Effort:** 2-3 days

**10.6 Audit Trail**
- **What:** Log all moderator actions
- **Acceptance Criteria:**
  - Log: Moderator ID, action type, target (post/user), timestamp, reason
  - View audit trail (searchable by moderator, action type, date)
  - Display in admin dashboard
  - Cannot be edited or deleted
- **Dependencies:** 10.1
- **Estimated Effort:** 2 days

---

### MILESTONE 7: Post Lifecycle (Weeks 11-13)

Handle post expiry and renewal.

#### ⏰ Post Expiry

**11.1 Expiry Calculation**
- **What:** Calculate expiry date for each post
- **Acceptance Criteria:**
  - Housing/Jobs: 30 days from creation
  - Emergency: 7 days from creation
  - Travel: Travel date + 2 days
  - Store expiry timestamp on post creation
  - Display expiry countdown in post detail ("Expires in 28 days")
- **Dependencies:** 5.1
- **Estimated Effort:** 1-2 days

**11.2 Expiry Notification**
- **What:** Notify users 3 days before post expires
- **Acceptance Criteria:**
  - Daily job checks posts expiring in 3 days
  - Send push notification to post author
  - Notification text: "Your [category] post expires in 3 days. Tap to renew."
  - Tap opens post detail view
- **Dependencies:** 11.1, 12.1 (Push Notifications)
- **Estimated Effort:** 2 days

**11.3 Expired Post Handling**
- **What:** Hide expired posts and allow renewal
- **Acceptance Criteria:**
  - Daily job marks posts past expiry as "expired"
  - Hide expired posts from default feed
  - "Show Expired" toggle in feed (shows expired posts)
  - "Renew Post" button on expired posts (own posts only)
  - Renew = update at least one field + reset expiry
  - Max 1 renewal per post
- **Dependencies:** 11.1, 5.5
- **Estimated Effort:** 2-3 days

---

### MILESTONE 8: Notifications (Weeks 12-14, Partial Parallel)

Build push notification system.

#### 🔔 Notifications

**12.1 Push Notification Setup** 🔄
- **What:** Infrastructure for sending push notifications
- **Acceptance Criteria:**
  - Register device for push notifications
  - Store device token per user
  - Send test notification
  - Handle notification permissions (iOS/Android)
- **Dependencies:** None (can start early)
- **Estimated Effort:** 2-3 days

**12.2 Chat Message Notifications**
- **What:** Notify users of new chat messages
- **Acceptance Criteria:**
  - Send push when new message received
  - Notification shows sender name and message preview
  - Tap opens chat conversation
  - Do NOT send if user is currently viewing that conversation
  - Do NOT send if user has muted conversation (future)
- **Dependencies:** 12.1, 8.5
- **Estimated Effort:** 2 days

**12.3 In-App Notifications List** 🔄
- **What:** View notification history in-app
- **Acceptance Criteria:**
  - List of notifications (newest first)
  - Display notification text, timestamp, read/unread
  - Tap to navigate to relevant content (post, chat, etc.)
  - Mark as read when viewed
  - Clear all notifications
- **Dependencies:** 12.1
- **Estimated Effort:** 2-3 days
- **Note:** Lower priority, can be post-MVP

**12.4 Notification Preferences** 🔄
- **What:** Let users control notification settings
- **Acceptance Criteria:**
  - Toggle: Chat messages (on/off)
  - Toggle: Post expiry reminders (on/off)
  - Toggle: Emergency posts in my metro (future, Phase 2)
  - Save preferences per user
  - Respect preferences when sending notifications
- **Dependencies:** 12.1
- **Estimated Effort:** 1-2 days
- **Note:** Can be simplified for MVP (on/off only)

---

## Onboarding Flow (Integrated Feature)

This is a user journey that combines multiple features built above:

**13.1 Complete Onboarding Flow**
- **What:** Guide new users through setup
- **Steps:**
  1. User Registration (1.1)
  2. Email Verification (optional)
  3. ZIP Code Entry (2.1)
  4. Metro Area Confirmation (2.2)
  5. Phone Verification (4.3, 4.4) → Auto-promote to Level 1
  6. Profile Setup: Name, optional photo (3.1, 3.5)
  7. Tutorial/Welcome Screen (explain categories, trust levels)
  8. Navigate to Home Feed
- **Dependencies:** All above features
- **Estimated Effort:** 3-4 days (UI/UX flow design)

---

## Testing & Polish Features

**14.1 Error Handling**
- **What:** Graceful error messages throughout app
- **Estimated Effort:** Ongoing, 3-5 days total

**14.2 Loading States**
- **What:** Skeleton screens, spinners while data loads
- **Estimated Effort:** Ongoing, 2-3 days total

**14.3 Empty States**
- **What:** Helpful messages when no data (empty feed, no chats, etc.)
- **Estimated Effort:** 1-2 days

**14.4 Input Validation**
- **What:** Client-side validation for all forms
- **Estimated Effort:** Ongoing, 2-3 days total

**14.5 Accessibility**
- **What:** Screen reader support, color contrast, font sizing
- **Estimated Effort:** 3-5 days

---

## Feature Priority Matrix

### Must-Have (MVP Blockers)
Cannot launch without these:
- All Authentication features (1.1-1.5)
- All Location features (2.1-2.4)
- Basic Profile (3.1-3.3)
- Trust Level Core (4.1-4.4, 4.6)
- Post Engine Core (5.1-5.6)
- All Category Forms (6.1-6.5)
- Photo Upload Core (7.1-7.4)
- Chat Core (8.1-8.5)
- Reporting Core (9.1-9.2)
- Admin Core (10.1-10.3)
- Expiry Core (11.1-11.3)
- Push Notifications Core (12.1-12.2)
- Onboarding Flow (13.1)

**Total Must-Have Features:** 45

### Should-Have (Important but can defer)
Significantly improves UX but not blockers:
- Password Reset (1.3)
- Public Profile View (3.4)
- Profile Photo (3.5)
- Post Search (5.7)
- Post Filtering/Sorting (5.8-5.9)
- Read Receipts (8.6)
- Block User (8.7)
- Report Chat (8.8)
- Thumbnail Generation (7.5)
- Report Photo (9.3)
- User Management (10.4)
- Platform Statistics (10.5)
- Audit Trail (10.6)

**Total Should-Have Features:** 13

### Nice-to-Have (Post-MVP)
Can be added in future updates:
- Session Management advanced (1.5)
- Draft Posts (5.10)
- Social Media Verification (4.5)
- Report User Profile (9.4)
- In-App Notifications List (12.3)
- Notification Preferences (12.4)
- Post Count Tracking (4.7) - if manual Level 2 promotion is OK

**Total Nice-to-Have Features:** 7

---

## Parallel Work Opportunities

Features marked with 🔄 can be built in parallel by different developers:

**Track A (Core App):** Auth → Location → Profile → Trust → Posts → Chat
**Track B (Media):** Photo Upload (7.1-7.5) - can start early
**Track C (Moderation):** Reporting (9.1-9.4) + Admin Dashboard (10.1-10.6) - can start after posts exist
**Track D (Notifications):** Push setup (12.1) - can start early

---

## Success Criteria Mapping

Map features to Phase 1 success metrics:

**Metric: 1,000 verified (Level 1+) users**
- Depends on: Onboarding (13.1), Phone Verification (4.3-4.4)

**Metric: 500+ active listings**
- Depends on: Post Engine (5.1-5.6), Category Forms (6.1-6.5)

**Metric: <5% spam/scam rate**
- Depends on: Trust Levels (4.1-4.6), Reporting (9.1-9.2), Admin Dashboard (10.2-10.3)

**Metric: 200+ emergency help requests**
- Depends on: Emergency Form (6.3-6.4), Chat (8.1-8.5)

**Metric: 50+ chat messages per day**
- Depends on: Chat System (8.1-8.5), Notifications (12.2)

**Metric: 80%+ posts include photos**
- Depends on: Photo Upload (7.1-7.4), Category Forms with photo fields (6.1, 6.2)

---

## Estimated Timeline (3.5-4.5 months)

**Weeks 1-4:** Foundation (Auth, Location, Profile basics)
**Weeks 3-6:** Trust & Verification (parallel start)
**Weeks 5-10:** Core Posting (forms, feed, categories)
**Weeks 7-10:** Photos (parallel)
**Weeks 8-14:** Chat (most complex feature)
**Weeks 10-14:** Moderation & Admin (parallel)
**Weeks 11-13:** Expiry & Lifecycle
**Weeks 12-14:** Notifications (parallel)
**Weeks 14-16:** Testing, polish, bug fixes, beta launch

---

## Notes

- Features are sized to 0.5-5 days each (1 week max)
- Dependencies clearly marked
- Some features can run in parallel (marked 🔄)
- Total: 62 features (45 must-have, 13 should-have, 7 nice-to-have)
- This breakdown assumes 1-2 developers working full-time
- Adjust timeline if team size changes

---

**Next Step:** Create detailed technical specifications for each feature using `/design-feature` skill.
