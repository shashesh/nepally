---
name: user-journey
description: Document detailed user journeys and flows
---

# User Journey Skill

When the user invokes `/user-journey [journey-name]`, create comprehensive user flow documentation following NUSA's modular journey approach.

## CRITICAL PRINCIPLE: One Journey Per Feature

**ALWAYS create separate user journeys. NEVER create a single monolithic journey.**

### When to Create Separate Journeys
- Each distinct feature or capability
- Each post type (Housing, Jobs, Emergency, Travel) - they have different fields and flows
- Each user role type (New User, Verified User, Moderator)
- Each major workflow that can stand alone

### When to Group Related Features (RARE)
Only group if:
- Two features are completely inseparable (e.g., "Select Post" + "Open Chat" might be combined)
- The combined journey is still under 15 steps
- Splitting would create artificial breaks in natural user flow

**Default: When in doubt, create separate journeys.**

## Step 0: Check Journey Index

BEFORE creating a new journey:
1. Check `docs/user-journeys/README.md` for existing journeys
2. Identify which number this journey should be
3. Determine correct subdirectory (onboarding, post-creation, discovery, safety, management)
4. Update README.md to add this journey to the index

## Step 1: Define Scope

ASK these questions:
1. **Journey Number & Name:** What number and name? (e.g., "03 - Housing Post Creation")
2. **User Persona:** Which user type? (Level 0/1/2, Business, Moderator?)
3. **Starting Point:** Where does this journey begin?
4. **End Goal:** What is the successful outcome?
5. **Prerequisites:** What must happen before this journey? (Link to other journeys)
6. **Next Steps:** What journeys typically follow this one?

## Step 2: Determine File Location

Use this directory structure:

```
docs/user-journeys/
├── README.md                              # Journey index (you will update this)
├── onboarding/
│   ├── 01-signup-and-onboarding.md
│   └── 02-trust-level-verification.md
├── post-creation/
│   ├── 03-housing-post-creation.md
│   ├── 04-job-post-creation.md
│   ├── 05-emergency-post-creation.md
│   └── 06-travel-post-creation.md
├── discovery/
│   ├── 07-browse-and-search.md
│   └── 08-respond-to-post.md
├── communication/
│   └── 09-in-app-chat.md
├── safety/
│   ├── 10-report-content.md
│   └── 11-moderator-review.md
└── management/
    └── 12-renew-edit-post.md
```

**Naming Convention:** `[number]-[kebab-case-name].md`

## Step 3: Map the Journey

Create: `docs/user-journeys/[category]/[number]-[journey-name].md`

```markdown
# User Journey #[Number]: [Journey Name]

**Journey Number:** [Number]
**Category:** [Onboarding | Post Creation | Discovery | Communication | Safety | Management]
**User Persona:** [Level 0/1/2, Business, Moderator]
**Last Updated:** [Date]
**Status:** Draft | Reviewed | Approved

## Journey Overview

**Goal:** [What the user is trying to accomplish]
**Trigger:** [What initiates this journey]
**Success Criteria:** [How we know they succeeded]
**Estimated Duration:** [Time to complete]

## Prerequisites

**Must Complete First:**
- [Link to required journey, e.g., Journey #01: Signup]

**Should Have:**
- [Optional but helpful prerequisites]

## User Persona Details

**Name:** [Fictional name]
**Age:** [Age range]
**Background:** [Brief background - occupation, family, location]
**Metro:** [Example metro area, e.g., Dallas-Fort Worth]
**Trust Level:** [0 = New | 1 = Verified | 2 = Contributor]
**Tech Savviness:** [Low | Medium | High]
**Primary Device:** [iOS | Android | Web Browser | Multiple]
**Context:** [Why they're doing this now - what problem are they solving?]

## Step-by-Step Journey

### Phase 1: [Phase Name]

#### Step 1: [Action Name]
**User Action:** [What they do - be specific about taps, inputs, gestures]
**System Response:** [What happens immediately]
**User Sees:** [Exact screen state - describe UI elements]
**Duration:** [Estimated time for this step]

**User Thoughts:**
- [What user might be thinking]
- [Their emotional state]

**Pain Points:**
- [Potential frustrations or confusion]
- **Severity:** High | Medium | Low

**Validation/Constraints:**
- [Any validation rules, required fields, character limits]

---

#### Step 2: [Action Name]
[Repeat structure for each step]

---

### Phase 2: [Next Phase Name]
[Continue...]

## Success State

**What User Sees:**
[Describe success confirmation screen/message]

**What User Feels:**
[Emotional state - relieved, confident, accomplished?]

**System State:**
[What changed in the backend - new record, updated status, etc.]

**Notifications:**
- [Any notifications sent to user or others]

## Decision Points

```
[Use flowchart-style ASCII to show branching logic]

Start
  │
  ├─> Check Trust Level
  │     ├─> Level 0: Show upgrade prompt → Exit
  │     └─> Level 1+: Continue to form
  │
  └─> Validate Form
        ├─> Valid: Submit post
        └─> Invalid: Show errors → Return to form
```

## Touchpoints

| Step | Touchpoint | Channel | Data Required | Data Stored |
|------|------------|---------|---------------|-------------|
| 1 | Open category | Mobile App / Web | User location | None |
| 2 | Fill form | Mobile App / Web | Post details | Draft saved |
| 3 | Upload photo | Mobile App / Web | Image file | Storage URL |
| 4 | Submit | Mobile App / Web | Complete data | New post record |

## Platform Considerations

### Applies To
- [ ] Mobile (iOS & Android)
- [ ] Web (Desktop & Mobile Web)

### Platform Differences
| Step | Mobile Behavior | Web Behavior | Notes |
|------|----------------|--------------|-------|
| [N] | [How it works on mobile] | [How it works on web] | [Why different] |

**NOTE:** If this journey applies to both platforms, both mobile and web implementations must be created. Shared logic (validation, API calls, types) lives in `packages/shared/`.

## Emotions & Experience

| Phase | Emotion | Confidence Level | Friction Level | Notes |
|-------|---------|------------------|----------------|-------|
| Start | Motivated | Medium | Low | Clear entry point |
| Form Fill | Focused | High | Medium | Many required fields |
| Photo Upload | Cautious | Medium | High | Technical step |
| Review | Anxious | Medium | Low | Double-checking |
| Submit | Hopeful | High | Low | Clear action |
| Confirmation | Relieved | High | None | Clear success |

## Pain Points & Friction

### Current Pain Points

1. **Pain Point:** [Description of friction or confusion]
   - **Impact:** High | Medium | Low
   - **Frequency:** How often this occurs (e.g., "Every new user")
   - **Affected Users:** [Who experiences this]
   - **Mitigation:** How we address it (in design or messaging)
   - **Solution:** [Future improvement if not yet addressed]

2. **Pain Point:** [Next pain point]
   [...]

### Potential Improvements
- [Specific improvement 1]
- [Specific improvement 2]

## Success Metrics

- [ ] **Time to Complete:** [Target: e.g., < 3 minutes for 80% of users]
- [ ] **Completion Rate:** [Target: e.g., > 70% who start complete the journey]
- [ ] **Error Rate:** [Target: e.g., < 5% encounter errors]
- [ ] **Retry Rate:** [Target: e.g., < 10% need to retry]
- [ ] **User Satisfaction:** [How to measure - e.g., post-journey survey]

## Alternative Paths

### Path 1: [Alternative scenario name]
**Trigger:** [What causes this path - e.g., "User has no photos"]
**How Journey Changes:** [Which steps differ]
**Outcome:** [Different result or same result via different path]

### Path 2: [Another alternative]
[...]

## Error & Edge Cases

| Scenario | Expected Behavior | Recovery Path | User Message |
|----------|------------------|---------------|--------------|
| No internet connection | Show cached data + warning banner | Queue action for retry | "No connection. Changes will sync when online." |
| Session timeout | Save draft automatically | Re-authenticate, then resume | "Please log in again. Your draft is saved." |
| Validation error | Inline error message, highlight field | User fixes and resubmits | "[Field name] is required" |
| Upload fails | Show retry button | Retry upload or skip photo | "Photo upload failed. Try again?" |
| Duplicate post detected | Show warning, ask to confirm | User confirms or cancels | "Similar post exists. Post anyway?" |

## Related Journeys

### Before This Journey (Prerequisites)
- **Journey #[N]: [Name]** - [Why it's needed first]

### After This Journey (Next Steps)
- **Journey #[N]: [Name]** - [Why user might go here next]
- **Journey #[N]: [Name]** - [Alternative next step]

### Related/Parallel Journeys
- **Journey #[N]: [Name]** - [How it relates]

## Visual Flow Diagram

```
[Create simplified visual showing major phases and decision points]

┌──────────────┐
│     Start    │
│ (Tap Create) │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌─────────────┐
│ Check Trust  │─No──▶│   Upgrade   │
│    Level     │      │   Prompt    │
└──────┬───────┘      └─────────────┘
       │ Yes
       ▼
┌──────────────┐
│  Fill Form   │◀─┐
│  (Required   │  │
│   Fields)    │  │
└──────┬───────┘  │
       │          │
       ▼          │
┌──────────────┐  │
│   Validate   │──┘ (Errors)
└──────┬───────┘
       │ (Valid)
       ▼
┌──────────────┐
│Upload Photos │
│  (Optional)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Review    │
│   & Submit   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Success    │
│ Confirmation │
└──────────────┘
```

## Technical Requirements

### API Endpoints Needed
- `POST /api/posts/create` - Create new post
- `POST /api/storage/upload` - Upload photo
- `GET /api/metro-areas/:id` - Verify metro area

### Data Validations
- **Required Fields:** [List all required fields]
- **Field Constraints:**
  - Title: 10-100 characters
  - Description: 50-500 characters
  - Photos: Max 3, JPEG/PNG, <2MB each
  - [etc.]

### Permissions Required
- Trust Level 1+ (Verified)
- Location permission (for metro area)
- Storage permission (for photo upload)

## Questions & Assumptions

### Assumptions
- User has smartphone with camera OR a web browser
- User has stable internet connection
- User is in a supported metro area
- User has verified their account (Level 1+)
- Journey flow is equivalent on mobile and web unless noted in Platform Differences
- [Other relevant assumptions]

### Open Questions
- [ ] What happens if user's metro area changes mid-journey?
- [ ] Should we save draft automatically or only on explicit save?
- [ ] What's the character limit for [specific field]?
- [ ] [Other questions to resolve]

## Next Steps

- [ ] Create wireframes for key screens (Steps 1, 3, 5, Success)
- [ ] Define exact validation rules for all fields
- [ ] Design error messages for each validation
- [ ] Plan user testing scenarios
- [ ] Document API contracts
- [ ] Create localization strings for all UI text
```

## Step 4: Review Against Product Roadmap

Validate journey against NUSA principles:
- **Metro-First Model:** Is metro area prominent and required?
- **Trust Levels:** Are permissions correctly enforced?
- **Safety Protocols:** Are warnings/disclaimers shown where needed?
- **Expiry Policies:** Is auto-expiry mentioned if applicable?
- **Data Collection:** Is only necessary data collected?
- **Accessibility:** Is journey usable for all users?

## Step 5: Update Journey Index

After creating the journey:
1. Open `docs/user-journeys/README.md`
2. Add this journey to the appropriate category
3. Update the journey count
4. Ensure numbering is sequential

## Step 6: Present & Iterate

Show the journey and ASK:
1. **Accuracy:** Does this match real user behavior?
2. **Completeness:** Are we missing critical steps?
3. **Pain Points:** Do the pain points resonate?
4. **Alternatives:** Should we document alternative paths?
5. **Metrics:** Are success metrics meaningful and measurable?
6. **Connections:** Are related journeys properly linked?

## Quality Checklist

Before marking journey as "Reviewed":
- [ ] Journey number is correct and sequential
- [ ] File is in correct subdirectory
- [ ] Prerequisites are linked with journey numbers
- [ ] "Next Steps" are linked with journey numbers
- [ ] All pain points have severity levels
- [ ] Success metrics are specific and measurable
- [ ] Edge cases cover technical failures
- [ ] Visual flow diagram matches step-by-step description
- [ ] User persona feels realistic and specific
- [ ] Journey is validated against product roadmap principles
- [ ] **Platform scope is defined** (Mobile, Web, or Both)
- [ ] **Platform differences are documented** if journey applies to both
- [ ] README.md index has been updated
