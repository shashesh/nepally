---
name: user-journey
description: Document detailed user journeys and flows
---

# User Journey Skill

When the user invokes `/user-journey [journey-name]`, create a user flow document.

## Principles
- **One journey per feature.** Never create monolithic journeys.
- **Keep under 15 steps.** If longer, split into separate journeys.
- Default: create separate journeys. Only group if features are truly inseparable.

## Step 0: Check Existing Journeys

1. Read `docs/user-journeys/README.md` for existing journeys
2. Determine the next sequential number
3. Pick the correct subdirectory: `onboarding/`, `post-creation/`, `discovery/`, `communication/`, `safety/`, `management/`

## Step 1: Define Scope

ASK:
1. **Journey Number & Name:** (e.g., "03 - Housing Post Creation")
2. **User Persona:** Level 0/1/2, Business, Moderator?
3. **Starting Point / End Goal / Prerequisites**
4. **Platform scope:** Mobile, Web, or Both?

## Step 2: Create Journey Document

Create: `docs/user-journeys/[category]/[number]-[journey-name].md`

### Required Sections

Use this structure (fill in content based on the specific journey):

```
# User Journey #[N]: [Name]
- Metadata: Number, Category, Persona, Status, Date
- Journey Overview: Goal, Trigger, Success Criteria, Duration
- Prerequisites: Must-complete journeys, should-haves
- User Persona: Name, background, metro, trust level, device, context
- Step-by-Step Journey: Organized by phases
  - Each step: User Action, System Response, User Sees, Duration
  - Include: Pain Points (with severity), Validation/Constraints
- Success State: What user sees/feels, system state, notifications
- Decision Points: ASCII flowchart of branching logic
- Touchpoints: Table (Step | Touchpoint | Channel | Data Required | Data Stored)
- Platform Considerations: Applies-to checklist, differences table
- Emotions & Experience: Table (Phase | Emotion | Confidence | Friction)
- Pain Points & Friction: Impact, frequency, mitigation, solutions
- Success Metrics: Time to complete, completion rate, error rate, retry rate
- Alternative Paths: Trigger, how journey changes, outcome
- Error & Edge Cases: Table (Scenario | Behavior | Recovery | Message)
- Related Journeys: Before, after, parallel
- Visual Flow Diagram: ASCII box diagram of major phases
- Technical Requirements: API endpoints, validations, permissions
- Assumptions & Open Questions
```

## Step 3: Review Against NUSA Principles

Validate: Metro-first model, trust level enforcement, safety protocols, minimal data collection, accessibility, platform parity.

## Step 4: Update Journey Index

Add to `docs/user-journeys/README.md` with correct number and category.

## Step 5: Present & Iterate

Show the journey and ask about accuracy, completeness, pain points, alternatives, and metrics.
