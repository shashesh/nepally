# User Journey #01: Signup and Onboarding

**Journey Number:** 01
**Category:** Onboarding
**User Persona:** New User (Level 0)
**Last Updated:** 2026-02-11
**Status:** Draft

## Journey Overview

**Goal:** Enable a new user to discover Nepally, create an account, and get mapped to their local metro area so they can start browsing relevant community posts.

**Trigger:** User needs housing/roommate and searches for community resources, or receives recommendation from friend.

**Success Criteria:**

- User successfully creates account
- User's ZIP code is mapped to correct metro area
- User understands what Nepally is and sees local feed
- User is ready to browse posts (Level 0) or verify account (Journey #02)

**Estimated Duration:** 5-10 minutes (thorough onboarding with context and education)

## Prerequisites

**Must Complete First:**

- None (This is the entry point)

**Should Have:**

- Smartphone with iOS or Android
- Valid US ZIP code
- Internet connection

## User Persona Details

**Name:** Priya Sharma
**Age:** 22 years old
**Background:** Graduate student from Kathmandu, Nepal. Just arrived in Dallas, Texas 2 weeks ago to pursue MS in Computer Science at UT Dallas. Living temporarily with a family friend but needs to find her own apartment and roommate by next month.

**Metro:** Dallas-Fort Worth-Arlington, TX
**Trust Level:** 0 (New - about to create account)
**Tech Savviness:** High (uses Instagram, WhatsApp daily)
**Primary Device:** iPhone 13
**Language:** Fluent in English and Nepali

**Context:** Priya is overwhelmed by Facebook groups with too much noise and spam. She saw someone post about Nepally in a "Nepali Students in DFW" Facebook group, mentioning it's specifically for the Nepali community with verified listings. She's looking for:

1. A safe, affordable room near UT Dallas campus
2. Ideally a Nepali roommate who understands her culture
3. Trustworthy information without scams

**Pain Points Before Nepally:**

- Facebook groups have 1000s of posts, hard to filter local Dallas posts
- Many scam/spam posts offering "too good to be true" deals
- No way to verify if posters are real or trustworthy
- Posts from 6 months ago still showing up

## Step-by-Step Journey

### Phase 1: Discovery (How Priya Finds Nepally)

#### Step 1: Discovery via Facebook Recommendation

**User Action:** Priya is scrolling through "Nepali Students in DFW" Facebook group looking for housing posts.

**System Response:** N/A (happens on Facebook, not in Nepally app yet)

**User Sees:**

- A post from someone saying: "Found my roommate through Nepally app! So much better than these Facebook groups. Only shows Dallas area posts and people are verified ✓"
- Post has 15 likes and 8 comments asking "what's Nepally?"

**Duration:** 30 seconds (reading the post)

**User Thoughts:**

- "Hmm, Nepally app? Never heard of it"
- "Only Dallas posts? That would save me so much time"
- "Verified people... that sounds safer than random FB accounts"

**Pain Points:**

- None yet - curiosity is piqued

**Validation/Constraints:**

- N/A

---

#### Step 2: Search for Nepally in App Store

**User Action:** Priya opens iOS App Store, searches "Nepally Nepal"

**System Response:** App Store shows Nepally app listing

**User Sees:**

- **App Icon:** Nepally logo
- **Title:** "Nepally - Nepalese United Support Alliance"
- **Subtitle:** "Community platform for Nepali diaspora in USA"
- **Rating:** 4.7 stars (156 reviews)
- **Category:** Social Networking
- **Screenshots:** Shows housing posts, job listings, metro-based feed
- **Description:** "Find housing, jobs, and emergency help in your local metro area. Verified community members only."

**Duration:** 1 minute (reading description, checking screenshots)

**User Thoughts:**

- "Okay, this looks legit - good ratings"
- "Screenshots show exactly what I need - housing posts in Dallas"
- "Verified community members - that's what I want"
- "It's free? Perfect!"

**Pain Points:**

- **Mild concern:** "Is this app safe? Will my data be secure?"
- **Severity:** Low (good ratings help build trust)

**Validation/Constraints:**

- Requires iOS 14.0 or later (Priya has iOS 16, no issue)

---

#### Step 3: Download and Install

**User Action:** Taps "GET" button, authenticates with Face ID

**System Response:** App downloads and installs on home screen

**User Sees:**

- Download progress bar
- "Nepally" app icon appears on home screen
- "OPEN" button becomes active

**Duration:** 30 seconds (download time varies by connection speed)

**User Thoughts:**

- "Downloading... hope this is worth it"
- "17 MB, not too big"

**Pain Points:**

- None (standard App Store flow)

---

### Phase 2: First Launch & Account Creation

#### Step 4: Launch App - Welcome Screen

**User Action:** Taps "OPEN" or taps Nepally icon on home screen

**System Response:** App launches, shows welcome/splash screen

**User Sees:**

- **Nepally logo** (large, centered)
- **Tagline:** "Your Local Nepali Community in the USA"
- **Brief intro text:** "Find housing, jobs, and emergency help from verified community members in your metro area."
- **Two buttons:**
  - **"Sign Up"** (primary blue button)
  - **"Log In"** (secondary outline button)
- **Small text at bottom:** "By continuing, you agree to Terms of Service and Privacy Policy" (with links)

**Duration:** 20 seconds (reading intro)

**User Thoughts:**

- "Okay, looks professional"
- "Local community - that's exactly what I need"
- "I need to sign up since I don't have an account yet"

**Pain Points:**

- **Minor:** "Should I read Terms of Service? Too long, I'll skip for now"
- **Severity:** Low (common user behavior)

**Validation/Constraints:**

- None at this screen

---

#### Step 5: Choose Signup Method

**User Action:** Taps "Sign Up" button

**System Response:** Navigate to signup method selection screen

**User Sees:**

- **Screen title:** "Create Your Account"
- **Subtitle:** "Join the Nepali community in your area"
- **Three signup options:**
  1. **"Continue with Google"** (with Google logo)
  2. **"Continue with Phone Number"** (with phone icon)
  3. **"Continue with Email"** (with email icon)
- **Each option shows:** "Quick signup • Verification required later"
- **Small text:** "We'll never post without your permission"

**Duration:** 15 seconds (choosing method)

**User Thoughts:**

- "Google is easiest - I'm already signed in"
- "But wait, do I want to link my Google account?"
- "Phone number seems more private... but I'll go with Google for speed"

**Pain Points:**

- **Decision paralysis:** "Which method should I use?"
- **Severity:** Low (clear options help)

**Validation/Constraints:**

- Must choose one method to proceed

---

#### Step 6: Sign Up with Google (OAuth Flow)

**User Action:** Taps "Continue with Google"

**System Response:**

- Redirect to Google OAuth consent screen
- Shows permissions: "Nepally wants to access: Your name, email address, profile picture"

**User Sees:**

- Google account picker (if multiple accounts)
- Permission request screen
- "Allow" and "Cancel" buttons

**Duration:** 30 seconds (selecting account, reviewing permissions)

**User Thoughts:**

- "Okay, just name and email - that's reasonable"
- "I'll use my personal Gmail, not my university email"

**Pain Points:**

- **Concern:** "What will Nepally do with my email?"
- **Severity:** Medium (trust issue for new users)
- **Mitigation:** Permission screen is standard Google OAuth, builds trust

**Validation/Constraints:**

- Must approve Google permissions to continue
- Redirects back to Nepally app after approval

---

#### Step 7: Google OAuth Success - Return to App

**User Action:** Taps "Allow" on Google permission screen

**System Response:**

- Redirect back to Nepally app
- Show loading indicator: "Creating your account..."
- Create user record in Supabase with:
  - Auth UID from Google
  - Email: <priya.sharma@gmail.com>
  - Name: Priya Sharma
  - Profile photo: Google profile picture
  - Trust Level: 0 (New)
  - createdAt: current timestamp

**User Sees:**

- Brief loading screen (1-2 seconds)
- Then automatically proceeds to next screen

**Duration:** 3 seconds

**User Thoughts:**

- "Great, that was easy!"
- "Now what?"

**Pain Points:**

- **Impatience:** "Loading... how long will this take?"
- **Severity:** Low (only 2-3 seconds)

**Validation/Constraints:**

- Google OAuth token must be valid
- Email from Google must be unique (not already registered)

---

### Phase 3: Onboarding Flow - Location Setup

#### Step 8: Enter ZIP Code

**User Action:** User sees ZIP code entry screen

**System Response:** Display ZIP code input form

**User Sees:**

- **Screen title:** "Where are you located?"
- **Subtitle:** "We'll show you posts in your metro area"
- **Input field (large, centered):**
  - Label: "Your ZIP Code"
  - Placeholder: "e.g., 75080"
  - Numeric keyboard appears automatically
- **Info text below:** "We use US Census Metro Areas to show you local content. Your exact address is never shared."
- **"Continue" button** (disabled until valid ZIP entered)
- **"Skip for now" link** (small, at bottom)

**Duration:** 30 seconds (entering ZIP)

**User Thoughts:**

- "Okay, they need my location to show me Dallas posts - makes sense"
- "UT Dallas ZIP code is 75080... let me type that"
- "Good that they clarify my exact address isn't shared"

**Pain Points:**

- **Concern:** "What if I don't remember my ZIP code?"
- **Severity:** Low (most people know their ZIP)
- **Mitigation:** Could add "Use my current location" button as alternative

**Validation/Constraints:**

- Must be exactly 5 digits
- Must be a valid US ZIP code in database
- Real-time validation: shows error if invalid ZIP
- "Continue" button only enabled when valid ZIP is entered

---

#### Step 9: ZIP Code Validation & Metro Mapping

**User Action:** Types "75080" and taps "Continue"

**System Response:**

- Validate ZIP code against `metro_areas` table
- Query: `SELECT * FROM metro_area_zipcodes WHERE zip_code = '75080'`
- Returns: metro_area_id = 'dallas-fort-worth-arlington'
- Update user record: `UPDATE users SET metro_area_id = 'dallas-fort-worth-arlington', zip_code = '75080' WHERE id = [userId]`
- Show confirmation screen

**User Sees:**

- Brief loading (1 second): "Finding your metro area..."
- Then confirmation screen:
  - **Large checkmark icon** (green)
  - **Text:** "You're in Dallas-Fort Worth-Arlington!"
  - **Subtext:** "You'll see posts from [X] verified members in your area"
  - **"Continue" button**

**Duration:** 2 seconds (loading) + 5 seconds (reading confirmation)

**User Thoughts:**

- "Perfect! That's exactly where I am"
- "X verified members - good, there's an active community here"
- "This was easier than I expected"

**Pain Points:**

- **Confusion if wrong metro:** "What if it shows wrong city?"
- **Severity:** Low (95% of ZIPs map correctly)
- **Mitigation:** Could add "This looks wrong? Contact support" link

**Validation/Constraints:**

- ZIP must exist in `metro_area_zipcodes` table
- If ZIP not found, show error: "We don't have coverage in this area yet. Please enter a different ZIP or contact support."

---

### Phase 4: Onboarding Flow - Understanding Nepally

#### Step 10: Quick Tutorial - What is Nepally?

**User Action:** Taps "Continue" from metro confirmation

**System Response:** Show first onboarding tutorial card

**User Sees:**

- **Tutorial card 1 of 3:**
  - **Icon:** Home icon
  - **Title:** "Metro-First Local Feed"
  - **Description:** "See only housing, jobs, and emergencies in Dallas-Fort Worth. No noise from other cities."
  - **Visual:** Screenshot of local feed with Dallas posts
- **Progress dots:** 1 of 3 (showing current position)
- **"Next" button**
- **"Skip" link** (small, at bottom)

**Duration:** 10 seconds (reading)

**User Thoughts:**

- "Oh nice, only Dallas posts - no more scrolling through NYC or LA posts on Facebook"
- "This is exactly what I need"

**Pain Points:**

- **Impatience:** "I just want to start browsing, not read tutorials"
- **Severity:** Medium (common with onboarding)
- **Mitigation:** Keep cards brief (max 3 cards), allow skip

---

#### Step 11: Quick Tutorial - Trust Levels

**User Action:** Taps "Next"

**System Response:** Show second tutorial card

**User Sees:**

- **Tutorial card 2 of 3:**
  - **Icon:** Shield with checkmark
  - **Title:** "Verified Community Members"
  - **Description:** "Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now."
  - **Visual:** Icons showing Level 0 → Level 1 → Level 2 progression
  - **Call-to-action:** "Verify your phone to unlock full features"
- **Progress dots:** 2 of 3
- **"Next" button**
- **"Skip" link**

**Duration:** 15 seconds (reading and understanding)

**User Thoughts:**

- "Oh, I need to verify my phone to post and message people"
- "Level system makes sense - prevents spam"
- "I should verify my phone after this tutorial"

**Pain Points:**

- **Frustration:** "Wait, I can't post yet? I just signed up!"
- **Severity:** Medium (user expectations)
- **Mitigation:** Clear explanation that verification is quick (2 minutes)

---

#### Step 12: Quick Tutorial - Post Categories

**User Action:** Taps "Next"

**System Response:** Show third tutorial card

**User Sees:**

- **Tutorial card 3 of 3:**
  - **Icon:** Four category icons (House, Briefcase, Alert, Plane)
  - **Title:** "Four Main Categories"
  - **Description:** "Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh."
  - **Visual:** Four category cards with example posts
  - **Expiry info:** "Housing & Jobs: 30 days • Emergency: 7 days • Travel: 2 days"
- **Progress dots:** 3 of 3
- **"Get Started" button** (primary, larger)
- **"Skip" link** (grayed out since this is last card)

**Duration:** 15 seconds (reading)

**User Thoughts:**

- "Four categories - simple and clear"
- "Auto-expiry is great! No more seeing 6-month-old posts"
- "Alright, I'm ready to browse housing posts now!"

**Pain Points:**

- None (final card, user is ready to proceed)

---

### Phase 5: Success - Onboarding Complete

#### Step 13: Land on Home Screen (Local Feed)

**User Action:** Taps "Get Started"

**System Response:**

- Mark onboarding as completed in user profile
- Navigate to main app home screen (Local Feed)
- Show local feed filtered by metro area
- Display Level 0 banner at top

**User Sees:**

- **Top navigation bar:**
  - "Dallas-Fort Worth" (location name with dropdown icon)
  - Search icon (top right)
  - Notification bell icon (top right)
- **Level 0 banner (yellow):**
  - "You're viewing only. Verify your phone to post and message."
  - "Verify Now" button
  - Dismiss (X) icon
- **Category tabs:**
  - All | Housing | Jobs | Emergency | Travel
  - "Housing" is pre-selected (since that's her goal)
- **Local feed:**
  - Shows 5-10 recent housing posts in Dallas-Fort Worth
  - Each post card shows:
    - Title: "Private room in Richardson"
    - Rent: "$650/month"
    - Move-in date: "March 1"
    - Posted by: "Verified user" badge
    - "2 days ago"
    - Thumbnail photo
- **Floating "+" button** (bottom right, slightly transparent since she can't post yet)

**Duration:** 20 seconds (scanning feed)

**User Thoughts:**

- "Great! I can see actual Dallas housing posts!"
- "These look recent and legitimate"
- "Verified user badges make me trust these posts more"
- "I want to click on that Richardson post... it's near my campus"
- "But wait, I should verify my phone first so I can message the poster"

**Pain Points:**

- **Desire to message immediately:** "I found a good post but can't message yet"
- **Severity:** Medium (creates urgency to verify)
- **Mitigation:** Clear banner with "Verify Now" CTA addresses this

**Validation/Constraints:**

- Level 0 users can view all posts
- Level 0 users CANNOT:
  - Create posts
  - Message post authors
  - Comment on posts

---

## Success State

**What User Sees:**

- Nepally home screen with local Dallas-Fort Worth housing posts
- Level 0 banner indicating next step (verification)
- Active community with recent posts

**What User Feels:**

- **Relieved:** "Finally, a platform that shows me only Dallas posts!"
- **Confident:** "This looks much better than Facebook groups"
- **Motivated:** "I should verify my phone so I can reach out to these posters"
- **Curious:** "Let me browse a few more posts before verifying"

**System State:**

- User record created in `users` table:
  - id: [UUID from Supabase Auth]
  - email: <priya.sharma@gmail.com>
  - name: Priya Sharma
  - metro_area_id: dallas-fort-worth-arlington
  - zip_code: 75080
  - trust_level: 0
  - phone_verified: false
  - created_at: [timestamp]
- Onboarding completed flag set
- User is authenticated and session is active

**Notifications:**

- None sent at this point (no push notification setup yet)

**Next Steps:**

- User will likely:
  1. Browse housing posts for 2-5 minutes
  2. Click on a post that interests them
  3. See "Verify your phone to message" prompt
  4. Proceed to Journey #02: Trust Level Verification

---

## Decision Points

```text
Start (App Discovery)
  │
  ├──> Found via Facebook recommendation (Primary path)
  │       │
  │       └──> App Store search
  │
  ├──> Found via friend's direct link (Alternative)
  │       │
  │       └──> Opens deep link → App Store
  │
  └──> Found via Instagram/social media ad (Alternative)
          │
          └──> Ad click → App Store

After Discovery: App Store
  │
  ├──> Download
  │      │
  │      └──> Install success → Launch
  │
  └──> Decide not to download (Lost user)

After Launch: Signup Method
  │
  ├──> Google OAuth (Fastest - chosen by Priya)
  │      │
  │      ├──> Approve permissions → Success
  │      └──> Deny permissions → Return to method selection
  │
  ├──> Phone Number
  │      │
  │      └──> Enter phone → SMS OTP → Verify → Success
  │
  └──> Email
         │
         └──> Enter email → Password → Email verification → Success

After Signup: ZIP Code Entry
  │
  ├──> Enter valid ZIP → Metro mapped → Success
  │
  ├──> Enter invalid ZIP → Error → Retry
  │
  └──> Skip for now → Proceed without metro (browsing limited)

After ZIP: Onboarding Tutorial
  │
  ├──> Complete all 3 cards → Home screen
  │
  └──> Skip tutorial → Home screen (less context)

At Home Screen:
  │
  ├──> Browse posts as Level 0 (view-only)
  │      │
  │      └──> Click post → See "Verify to message" prompt
  │             │
  │             └──> Proceed to Journey #02
  │
  └──> Tap "Verify Now" banner
         │
         └──> Proceed to Journey #02
```

---

## Touchpoints

| Step  | Touchpoint              | Channel             | Data Required          | Data Stored          |
| ----- | ----------------------- | ------------------- | ---------------------- | -------------------- |
| 1     | Facebook post discovery | Facebook (external) | None                   | None                 |
| 2     | App Store search        | iOS App Store       | None                   | None                 |
| 3     | Download app            | iOS App Store       | Apple ID auth          | App installed        |
| 4     | First launch            | Nepally app         | Device info            | Session started      |
| 5     | Signup method selection | Nepally app         | User choice            | None yet             |
| 6     | Google OAuth            | Google (external)   | Gmail account          | OAuth token          |
| 7     | Account created         | Supabase            | Email, name, photo     | User record created  |
| 8     | ZIP code entry          | Nepally app         | User input (5 digits)  | ZIP in draft         |
| 9     | Metro mapping           | Supabase function   | ZIP → Metro query      | metro_area_id saved  |
| 10-12 | Tutorial cards          | Nepally app         | Swipe/tap actions      | Onboarding completed |
| 13    | Home screen (success)   | Nepally app         | Metro area posts query | Session active       |

---

## Emotions & Experience

| Phase                       | Emotion            | Confidence Level | Friction Level | Notes                                                |
| --------------------------- | ------------------ | ---------------- | -------------- | ---------------------------------------------------- |
| Discovery (Steps 1-3)       | Curious, Hopeful   | Low              | Low            | Intrigued by Facebook recommendation                 |
| Download (Step 3)           | Slightly anxious   | Medium           | Low            | Standard app download, no issues                     |
| First launch (Step 4)       | Cautious           | Medium           | Low            | Evaluating if app meets expectations                 |
| Signup (Steps 5-7)          | Focused            | Medium           | Medium         | Decision paralysis on method, but Google is familiar |
| OAuth flow (Steps 6-7)      | Trusting           | High             | Low            | Google OAuth is familiar and trusted                 |
| ZIP entry (Steps 8-9)       | Confident          | High             | Low            | Clear purpose, easy input                            |
| Metro confirmation (Step 9) | Relieved           | High             | None           | System correctly identified her location             |
| Tutorial (Steps 10-12)      | Engaged            | High             | Medium         | Useful info but slightly impatient                   |
| Home screen (Step 13)       | Excited, Motivated | Very High        | None           | Seeing actual Dallas posts = success!                |

**Overall Journey Emotion Arc:**

- Starts: Curious but cautious
- Middle: Building trust through familiar patterns (Google OAuth)
- End: Excited and validated (seeing real local posts)

---

## Pain Points & Friction

### Current Pain Points

1. **Pain Point: Signup Method Decision Paralysis**
   - **Description:** User sees 3 signup options and has to decide which is "best"
   - **Impact:** Medium
   - **Frequency:** Every new user (100%)
   - **Affected Users:** All new users, especially less tech-savvy ones
   - **Mitigation:**
     - Label Google as "Fastest" or "Recommended"
     - Show "Quick signup • Verification required later" subtext
   - **Solution:** Could add default recommendation: "Most users choose Google"

2. **Pain Point: Can't Message Posts Immediately**
   - **Description:** User finds perfect housing post but realizes they can't message until verified
   - **Impact:** High
   - **Frequency:** 80% of users who browse before verifying
   - **Affected Users:** Users who delay verification
   - **Mitigation:**
     - Prominent "Verify Now" banner on home screen
     - "Verify to message" prompt when clicking posts
   - **Solution:** This is intentional friction (prevents spam), but ensure verification is quick (Journey #02 should be <2 minutes)

3. **Pain Point: Tutorial Impatience**
   - **Description:** User wants to skip tutorial and start browsing immediately
   - **Impact:** Low
   - **Frequency:** 40% of users
   - **Affected Users:** Tech-savvy users, returning users from other platforms
   - **Mitigation:**
     - Keep tutorial to 3 cards max
     - Allow "Skip" on every card
     - Auto-progress if user swipes (don't force tap "Next")
   - **Solution:** Consider making tutorial optional with tooltip-based guidance instead

4. **Pain Point: ZIP Code Memory**
   - **Description:** Some users may not remember their ZIP code (especially new immigrants)
   - **Impact:** Medium
   - **Frequency:** 15% of new immigrants
   - **Affected Users:** Very recent arrivals (<1 week in US)
   - **Mitigation:** Currently none
   - **Solution:**
     - Add "Use my current location" button (request GPS permission)
     - Or: "Don't know your ZIP? Look it up" link to USPS ZIP lookup

5. **Pain Point: OAuth Permission Concern**
   - **Description:** User worries about what Nepally will do with their Google data
   - **Impact:** Medium
   - **Frequency:** 30% of privacy-conscious users
   - **Affected Users:** Privacy-conscious users
   - **Mitigation:**
     - Google's standard OAuth screen shows limited permissions (name, email, photo only)
   - **Solution:**
     - Add privacy reassurance on signup method screen: "We only use your email for login, never for marketing"
     - Link to Privacy Policy

### Potential Improvements

- Add "Most users choose this" badge to Google signup (social proof)
- Allow ZIP lookup via GPS location (reduce cognitive load)
- Make tutorial dismissible after card 1 (user can always access help later)
- Add progress indicator showing "2 steps remaining" (signup → ZIP → tutorial)
- Pre-select "Housing" category on first home screen load based on user's likely goal

---

## Success Metrics

- [ ] **Time to Complete:** Target: < 10 minutes for 90% of users (5-10 min range)
  - Breakdown: Discovery (2 min) + Signup (2 min) + ZIP entry (1 min) + Tutorial (2 min) + Browse (3 min)

- [ ] **Completion Rate:** Target: > 75% who download complete signup and ZIP entry
  - Measure: (Users who reach home screen) / (Users who launch app) × 100

- [ ] **Drop-off Points:** Monitor where users abandon:
  - Expected: 10% drop at signup method selection
  - Expected: 5% drop at OAuth permissions
  - Expected: 10% drop at tutorial (skip to home screen instead)

- [ ] **Tutorial Skip Rate:** Target: < 50% skip tutorial
  - If >50% skip, tutorial may be too long or redundant

- [ ] **ZIP Entry Error Rate:** Target: < 5% enter invalid ZIP on first try
  - Measure: (Invalid ZIP submissions) / (Total ZIP submissions) × 100

- [ ] **Metro Mapping Success:** Target: 99% of ZIPs successfully map to metro area
  - Measure: (Successful mappings) / (Valid ZIP entries) × 100

- [ ] **Immediate Verification Rate:** Target: > 40% proceed to Journey #02 within 5 minutes
  - Measure: (Users who start verification within 5 min) / (Users who complete onboarding) × 100

- [ ] **User Satisfaction:** Post-onboarding survey (optional popup after 1 week)
  - Question: "How easy was it to get started with Nepally?" (1-5 scale)
  - Target: Average rating > 4.0

---

## Alternative Paths

### Path 1: Signup via Phone Number (Instead of Google)

**Trigger:** User chooses "Continue with Phone Number" at Step 5

**How Journey Changes:**

- Step 6 becomes: Enter phone number
- Step 6.5 (new): Enter SMS OTP code
- Step 7: Account created with phone as primary identifier
- Rest of journey identical (ZIP entry, tutorial, home screen)

**Outcome:** Same success state, but user has phone_verified = true from signup (skips part of Journey #02)

**Trade-offs:**

- Slower signup (requires SMS wait + OTP entry)
- But user is partially verified immediately (Level 1 requirement)

---

### Path 2: Signup via Email (Instead of Google)

**Trigger:** User chooses "Continue with Email" at Step 5

**How Journey Changes:**

- Step 6 becomes: Enter email + create password
- Step 6.5 (new): "Check your email to verify" screen
- User must verify email before proceeding
- Rest of journey identical after email verification

**Outcome:** Same success state, but slower due to email verification step

**Trade-offs:**

- Most control (no OAuth dependencies)
- But requires remembering password
- Extra step (email verification click)

---

### Path 3: Skip ZIP Code Entry

**Trigger:** User taps "Skip for now" at Step 8

**How Journey Changes:**

- Step 9 skipped (no metro mapping)
- User proceeds to tutorial
- Home screen shows "Set your location to see local posts" banner
- Feed shows posts from all metro areas (overwhelming, not useful)

**Outcome:** Degraded experience until user sets location

**Recovery Path:** Prominent "Set Location" banner on home screen → Returns to ZIP entry

---

### Path 4: Skip Tutorial

**Trigger:** User taps "Skip" during tutorial (Steps 10-12)

**How Journey Changes:**

- Tutorial dismissed immediately
- User lands on home screen
- May see tooltip hints on first interactions ("Tap here to verify phone")

**Outcome:** Same end state, but less context/education

**Trade-offs:**

- Faster to home screen
- But may not understand trust levels or post categories

---

## Error & Edge Cases

| Scenario                                        | Expected Behavior                            | Recovery Path                                                                  | User Message                                                                                            |
| ----------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| No internet during signup                       | Show error banner at top                     | "Retry" button + offline indicator                                             | "No internet connection. Please check your connection and try again."                                   |
| Google OAuth cancelled                          | Return to signup method selection            | User can try again or choose different method                                  | "Signup cancelled. Please choose a signup method to continue."                                          |
| Google OAuth error/timeout                      | Show error, suggest retry or alternative     | "Try Again" or "Use Phone Instead" buttons                                     | "Something went wrong with Google signup. Please try again or use phone number."                        |
| Email already registered                        | Show error immediately                       | "Log In Instead" button                                                        | "This email is already registered. Please log in or use a different email."                             |
| Invalid ZIP code (e.g., 00000)                  | Show inline error, prevent continue          | Clear error when user edits                                                    | "This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code."                                |
| ZIP not in database                             | Show apologetic error                        | "Enter different ZIP" or "Contact support"                                     | "We don't have coverage in this area yet. Please try a nearby ZIP code or contact <support@nepally.us>" |
| Metro mapping API error                         | Retry automatically 2x, then show error      | "Retry" button or "Skip for now" option                                        | "We're having trouble finding your metro area. Please try again."                                       |
| App crashes during onboarding                   | Restart app, resume from last completed step | Auto-resume (e.g., if ZIP saved, skip to tutorial)                             | None (seamless resume)                                                                                  |
| User closes app mid-onboarding                  | On next launch, resume from last step        | Show "Continue where you left off" or "Start over"                             | "Welcome back! Continue setting up your account?"                                                       |
| User denies location permission (if we add GPS) | Fallback to manual ZIP entry                 | Show ZIP entry form                                                            | "We need your location to show local posts. Please enter your ZIP code."                                |
| Slow network (timeout)                          | Show loading state with spinner              | After 10 seconds, show "Taking longer than usual" message with "Cancel" option | "Still loading... This is taking longer than usual."                                                    |
| Tutorial card load failure                      | Skip failed card, proceed to next            | Log error, user sees remaining cards                                           | None (graceful degradation)                                                                             |

---

## Related Journeys

### Before This Journey (Prerequisites)

- **None** - This is the entry point for all new users

### After This Journey (Next Steps)

- **Journey #02: Trust Level Verification** - Priya will proceed here to verify her phone and unlock posting/messaging (85% of users do this within 24 hours)
- **Journey #07: Browse and Search Posts** - Priya can browse posts as Level 0 immediately (100% of users do this after onboarding)
- **Journey #10: Report Content** - If Priya sees spam, she can report (rare, but available at Level 0)

### Related/Parallel Journeys

- **Journey #07: Browse and Search Posts** - Closely related; Priya is already on the home screen browsing after Step 13

---

## Visual Flow Diagram

```text
┌─────────────────┐
│   Discovery     │
│ (Facebook post) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   App Store     │
│  (Search Nepally)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Download &    │
│     Install     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  First Launch   │
│ (Welcome Screen)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   Choose Signup Method      │
│  ┌──────────────────────┐   │
│  │ Google │ Phone │ Email│   │
│  └──────────────────────┘   │
└────────┬────────────────────┘
         │ (Google chosen)
         ▼
┌─────────────────┐      ┌──────────────┐
│  Google OAuth   │─────▶│   Approve    │
│   Permissions   │      │  Permissions │
└────────┬────────┘      └──────┬───────┘
         │                      │
         │ (Denied)             │ (Approved)
         │                      ▼
         │              ┌─────────────────┐
         │              │ Account Created │
         │              │  (Supabase DB)  │
         │              └────────┬────────┘
         │                       │
         └───────────────────────┘
                 │
                 ▼
┌─────────────────────────────┐
│      Enter ZIP Code         │
│  ┌───────────────────────┐  │
│  │     75080    [Verify] │  │
│  └───────────────────────┘  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Validate ZIP   │─Yes─▶│ Metro Mapped │
│  (Database)     │      │   (Dallas)   │
└────────┬────────┘      └──────┬───────┘
         │ No (Invalid)          │
         ▼                       │
┌─────────────────┐             │
│  Show Error     │             │
│  "Invalid ZIP"  │             │
└────────┬────────┘             │
         │                      │
         └──────────────────────┘
                 │
                 ▼
┌─────────────────────────────┐
│   Tutorial: Card 1 of 3     │
│  (Metro-First Local Feed)   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Tutorial: Card 2 of 3     │
│   (Verified Community)      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Tutorial: Card 3 of 3     │
│     (Post Categories)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│      SUCCESS!               │
│   Home Screen (Local Feed)  │
│   ┌───────────────────────┐ │
│   │ Level 0 Banner        │ │
│   │ [Verify Now]          │ │
│   ├───────────────────────┤ │
│   │ Housing Posts Feed    │ │
│   │ - Private room $650   │ │
│   │ - 2BR apartment $1200 │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Browse Posts    │   │  Tap "Verify"   │
│ (Journey #07)   │   │  (Journey #02)  │
└─────────────────┘   └─────────────────┘
```

---

## Technical Requirements

### API Endpoints Needed

1. **POST /auth/signup/google** - Google OAuth signup
   - Request: `{ oauth_token: string }`
   - Response: `{ user_id: string, session_token: string }`

2. **POST /auth/signup/phone** - Phone number signup
   - Request: `{ phone: string }`
   - Response: `{ verification_id: string }`

3. **POST /auth/signup/email** - Email signup
   - Request: `{ email: string, password: string }`
   - Response: `{ user_id: string, verification_email_sent: boolean }`

4. **POST /users/update-location** - Update user's ZIP and metro
   - Request: `{ user_id: string, zip_code: string }`
   - Response: `{ metro_area_id: string, metro_name: string }`

5. **GET /metro-areas/lookup-by-zip/:zip** - Get metro area from ZIP
   - Response: `{ metro_area_id: string, metro_name: string, state: string }`

6. **POST /users/complete-onboarding** - Mark onboarding complete
   - Request: `{ user_id: string }`
   - Response: `{ success: boolean }`

### Data Validations

**ZIP Code Input:**

- **Format:** Exactly 5 digits, numeric only
- **Validation:** Must exist in `metro_area_zipcodes` table
- **Error message:** "Please enter a valid 5-digit US ZIP code"

**Email (if email signup):**

- **Format:** Valid email format (RFC 5322)
- **Uniqueness:** Must not already exist in `users` table
- **Error message:** "This email is already registered"

**Phone (if phone signup):**

- **Format:** US phone format (10 digits)
- **Uniqueness:** Must not already exist in `users` table
- **Error message:** "This phone number is already registered"

**Name (from OAuth):**

- **Min length:** 2 characters
- **Max length:** 100 characters
- **Allowed:** Letters, spaces, hyphens, apostrophes

### Permissions Required

**iOS Permissions (requested during journey):**

- None required for basic signup and onboarding
- Optional: Location permission (if we add "Use current location" feature)

**Android Permissions (requested during journey):**

- None required for basic signup and onboarding
- Optional: Location permission (if we add "Use current location" feature)

**Supabase Permissions:**

- Public access to `/auth/signup/*` endpoints
- Public read access to `metro_areas` and `metro_area_zipcodes` tables
- Authenticated write access to `users` table (via RLS policies)

---

## Questions & Assumptions

### Assumptions

1. **User has smartphone** - iOS or Android device capable of running Nepally app
2. **User has internet** - WiFi or cellular data for app download and signup
3. **User is in US** - Has valid US ZIP code
4. **User understands English** - App is currently English-only (Nepali support in future?)
5. **User has email or phone** - Can sign up via Google, phone, or email
6. **User's ZIP is in database** - Covers 95%+ of US population (metro areas)
7. **User knows their ZIP** - Or can look it up easily

### Open Questions

- [ ] **Should we support Nepali language?**
  - Impact: Widens accessibility for less English-fluent users
  - Effort: High (translate entire app)
  - Recommendation: Phase 2

- [ ] **Should we request location permission for automatic ZIP detection?**
  - Impact: Reduces friction for users who don't know ZIP
  - Concern: Privacy - some users may not want to share precise location
  - Recommendation: Offer as optional alternative ("Use my current location" button)

- [ ] **Should we allow signup without metro area (skip ZIP)?**
  - Current: We allow skip but feed shows all metros (bad experience)
  - Alternative: Force ZIP before allowing home screen access
  - Recommendation: Keep current approach, but make banner more prominent

- [ ] **Should tutorial be optional from the start?**
  - Current: Shown to all users, can skip
  - Alternative: "Quick tour" vs "Skip to app" on welcome screen
  - Recommendation: A/B test - measure correlation between tutorial completion and retention

- [ ] **How do we handle users in rural areas with no metro coverage?**
  - Current: Error message "We don't have coverage in this area yet"
  - Alternative: Show nearest metro area or allow "No metro area" browsing
  - Recommendation: Allow selection of nearest metro with disclaimer

- [ ] **Should we collect more info during onboarding (name, occupation, interests)?**
  - Current: Only collect ZIP code (rest comes from OAuth)
  - Benefit: Better user matching for roommates
  - Risk: Increased friction, lower completion rate
  - Recommendation: Defer to profile setup later (optional)

- [ ] **What if a user moves to a new metro area?**
  - Future journey needed: "Update Location"
  - Should be easy to change ZIP in profile settings
  - Open question: How often can users change metro? (prevent abuse)

---

## Next Steps

After this journey is approved:

- [ ] **Create wireframes** for key screens:
  - Welcome screen (Step 4)
  - Signup method selection (Step 5)
  - Google OAuth flow (Step 6)
  - ZIP code entry (Step 8)
  - Metro confirmation (Step 9)
  - Tutorial cards (Steps 10-12)
  - Home screen success state (Step 13)

- [ ] **Define exact UI copy** for all screens, buttons, error messages

- [ ] **Create API contracts** for all endpoints listed in Technical Requirements

- [ ] **Plan instrumentation/analytics** to track all success metrics

- [ ] **Design error states** for all edge cases in table above

- [ ] **User testing scenarios:**
  - Test with 5 new immigrants (unfamiliar with app)
  - Test with 5 existing community members (compare to Facebook UX)
  - Measure time to completion, drop-off points, confusion moments

- [ ] **Document localization strings** if Nepali support is approved

- [ ] **Create onboarding video** (optional) for App Store preview

- [ ] **Update Journey Index** (README.md) to mark this journey as "Reviewed"

---

**Journey Documentation Complete!**
**Status:** Ready for review and wireframing
**Next Journey:** #02 - Trust Level Verification
