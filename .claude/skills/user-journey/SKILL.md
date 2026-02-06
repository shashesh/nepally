---
name: user-journey
description: Document detailed user journeys and flows
---

# User Journey Skill

When the user invokes `/user-journey [journey-name]`, create comprehensive user flow documentation.

## Step 1: Define Scope

ASK these questions:
1. **Journey Name:** What are we calling this flow? (e.g., "Emergency Post Creation")
2. **User Persona:** Which user type? (Level 0/1/2, Business, Moderator?)
3. **Starting Point:** Where does this journey begin?
4. **End Goal:** What is the successful outcome?
5. **Critical Path:** What is the happy path vs edge cases?

## Step 2: Map the Journey

Create: `docs/user-journeys/[journey-name].md`

```markdown
# User Journey: [Journey Name]

**User Persona:** [Level 0/1/2, Business, Moderator]
**Last Updated:** [Date]
**Status:** Draft | Reviewed | Approved

## Journey Overview

**Goal:** [What the user is trying to accomplish]
**Trigger:** [What initiates this journey]
**Success Criteria:** [How we know they succeeded]

## User Persona Details

**Name:** [Fictional name]
**Background:** [Brief background]
**Metro:** [Example metro area]
**Trust Level:** [0/1/2]
**Context:** [Why they're doing this now]

## Step-by-Step Journey

### Phase 1: [Phase Name]

#### Step 1: [Action]
**User Action:** [What they do]
**System Response:** [What happens]
**User Sees:** [What's displayed]
**Duration:** [Estimated time]

**Thoughts:** [What user might be thinking]
**Pain Points:** [Potential frustrations]

---

#### Step 2: [Action]
[Repeat structure]

---

### Phase 2: [Phase Name]
[Continue...]

## Decision Points

```
[Use flowchart-style ASCII]

Start
  │
  ├─> Has Account?
  │     ├─> Yes: Go to Login
  │     └─> No: Go to Signup
  │
  └─> After Login
        ├─> Is Verified?
        │     ├─> Yes: Can Post
        │     └─> No: View Only
```

## Touchpoints

| Step | Touchpoint | Channel | Data Required |
|------|------------|---------|---------------|
| 1 | Open app | Mobile | GPS location |
| 2 | Select category | UI | User preference |
| ... | ... | ... | ... |

## Emotions & Experience

| Phase | Emotion | Confidence Level | Notes |
|-------|---------|------------------|-------|
| Discovery | Curious | Low | First time user |
| Form Fill | Focused | Medium | Clear instructions help |
| Submission | Anxious | Medium | Waiting for confirmation |
| Confirmation | Relieved | High | Clear success message |

## Pain Points & Friction

### Current Pain Points
1. **Pain Point:** [Description]
   - **Impact:** High | Medium | Low
   - **Frequency:** How often this occurs
   - **Mitigation:** How we address it

### Potential Improvements
- Improvement 1
- Improvement 2

## Success Metrics

- [ ] Time to complete: [Target time]
- [ ] Completion rate: [Target %]
- [ ] Error rate: [Max acceptable %]
- [ ] User satisfaction: [How to measure]

## Alternative Paths

### Path: [Alternative scenario]
**Trigger:** [What causes this path]
**Journey:** [Different steps]
**Outcome:** [Different result]

## Edge Cases

| Scenario | Expected Behavior | Recovery Path |
|----------|------------------|---------------|
| No internet | Show cached + warning | Retry when online |
| Session timeout | Save draft + re-auth | Resume from draft |
| Validation error | Inline error message | Fix and resubmit |

## Related Journeys

- **Before This:** [Prerequisite journeys]
- **After This:** [Next possible journeys]
- **Related:** [Connected journeys]

## Visual Flow Diagram

[Create simplified visual using ASCII or describe]

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Start  │───>│  Action │───>│ Success │
└─────────┘    └─────────┘    └─────────┘
                     │
                     ├─> Error ──> Retry
                     │
                     └─> Cancel ──> Exit
```

## Questions & Assumptions

### Assumptions
- User has smartphone
- User has stable internet
- User is in supported metro area

### Open Questions
- [ ] Question 1
- [ ] Question 2

## Next Steps

- [ ] Create wireframes for key screens
- [ ] Define API requirements
- [ ] Plan user testing scenarios
```

## Step 3: Review Against Roadmap

Validate journey against:
- Metro-first model
- Trust levels and permissions
- Safety protocols
- Expiry policies

## Step 4: Present & Iterate

Show the journey and ASK:
1. Does this match real user behavior?
2. Are we missing critical steps?
3. Do the pain points resonate?
4. Should we document alternative paths?
