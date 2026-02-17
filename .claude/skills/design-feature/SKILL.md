---
name: design-feature
description: Design a new feature with structured specification
---

# Feature Design Skill

When the user invokes `/design-feature [feature-name]`, follow this structured process:

## Step 1: Understand the Feature

ASK the user these clarifying questions:
1. **Problem Statement:** What user problem does this feature solve?
2. **Target Users:** Who is the primary user? (New users, verified users, moderators, businesses?)
3. **Metro Scope:** Is this metro-local, metro-wide, or global?
4. **Platform Scope:** Mobile only, Web only, or Both? (Default: Both)
5. **Phase Alignment:** Which roadmap phase does this belong to?
6. **Dependencies:** Does this require other features to exist first?

Wait for answers before proceeding.

## Step 2: Enter Plan Mode

Enter plan mode to:
1. Review the product-roadmap.md for related features
2. Check for conflicts with existing trust/safety principles
3. Research similar patterns in the roadmap
4. Identify all stakeholders affected

## Step 3: Create Feature Specification

Create a new file: `docs/features/[feature-name].md` with this structure:

```markdown
# [Feature Name]

**Status:** Draft | In Review | Approved
**Phase:** 1 | 2 | 3
**Owner:** [User's name]
**Last Updated:** [Date]

## Overview
[2-3 sentence summary]

## Problem Statement
[What problem does this solve? Why now?]

## User Story
As a [user type]
I want to [action]
So that [benefit]

## Requirements

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional Requirements
- [ ] Performance targets
- [ ] Security considerations
- [ ] Accessibility needs

## User Flow

[Step-by-step flow from start to finish]

1. User does X
2. System responds with Y
3. ...

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| No internet | Show cached data + warning |
| ... | ... |

## Trust & Safety Considerations

- How does this prevent spam/abuse?
- What PII is involved?
- Moderation needs?

## Success Metrics

- Metric 1: [How to measure]
- Metric 2: [How to measure]

## Platform Scope

- [ ] Mobile (React Native)
- [ ] Web (Next.js)

## Code Architecture (Shared vs Platform-Specific)

### Shared Code (`packages/shared/`)
- **Types**: [list data model interfaces needed]
- **API Functions**: [list Supabase query functions needed]
- **Validation**: [list Zod schemas needed]
- **Utils/Constants**: [list any new utility functions or constants]

### Mobile-Specific (`apps/mobile/`)
- **Screens**: [list RN screens]
- **Components**: [list RN UI components]
- **Navigation**: [changes to navigation stacks]

### Web-Specific (`apps/web/`)
- **Pages**: [list Next.js pages]
- **Components**: [list React components]

## Open Questions

- [ ] Question 1
- [ ] Question 2

## Related Features

- Links to related specs
- Dependencies
```

## Step 4: Present Options

Present 2-3 different UX/design approaches with:
- Pros and cons of each
- Complexity assessment
- Alignment with roadmap principles

Ask the user which approach they prefer.

## Step 5: Update Roadmap

If approved, update `product-roadmap.md`:
- Add to appropriate phase section
- Link to detailed spec
- Update success metrics if needed

## Step 6: Next Steps

Suggest next steps:
- Create wireframes?
- Document user journey?
- Define API requirements?
