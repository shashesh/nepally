---
name: refine-roadmap
description: Analyze and improve sections of the product roadmap
---

# Refine Roadmap Skill

When the user invokes `/refine-roadmap [section-name]`, perform structured analysis and improvement.

## Step 1: Enter Plan Mode

Always enter plan mode for roadmap refinement to:
1. Read the current roadmap thoroughly
2. Understand the section's context within overall strategy
3. Identify related sections and dependencies

## Step 2: Analysis Framework

For the specified section, analyze these dimensions:

### Completeness
- [ ] Are all user scenarios covered?
- [ ] Are edge cases addressed?
- [ ] Are success metrics defined?
- [ ] Are dependencies clear?

### Clarity
- [ ] Can a new team member understand this?
- [ ] Are terms defined consistently?
- [ ] Are examples provided where needed?
- [ ] Is the writing concise and scannable?

### Consistency
- [ ] Does it align with project vision/mission?
- [ ] Does it follow the Metro-first model?
- [ ] Does it respect Trust Levels?
- [ ] Does it contradict other sections?

### Feasibility
- [ ] Are the requirements realistic?
- [ ] Are there technical constraints to consider?
- [ ] Are timelines reasonable?
- [ ] Are resources (data, APIs) available?

### Safety & Trust
- [ ] How does this prevent abuse?
- [ ] What PII is collected?
- [ ] Are moderator tools sufficient?
- [ ] Are legal disclaimers needed?

## Step 3: Create Analysis Report

Create a temporary analysis document with findings:

```markdown
# Roadmap Refinement: [Section Name]

**Date:** [Date]
**Reviewed By:** Claude + [User]

## Current State Summary

[2-3 sentences describing the section as-is]

## Strengths

✅ What's working well:
1. Strength 1
2. Strength 2

## Gaps Identified

### Missing Information
- [ ] Gap 1: [Description]
  - **Impact:** High | Medium | Low
  - **Suggestion:** [How to address]

### Unclear Requirements
- [ ] Item 1: [What's unclear]
  - **Question:** [What needs clarification]
  - **Why it matters:** [Impact of ambiguity]

### Inconsistencies
- [ ] Inconsistency 1: [Description]
  - **Conflicts with:** [Other section/principle]
  - **Resolution needed:** [Options]

## Proposed Improvements

### Priority 1: Critical Changes
1. **Change:** [Description]
   - **Rationale:** [Why this matters]
   - **Implementation:** [How to update]

### Priority 2: Important Enhancements
[Same structure]

### Priority 3: Nice-to-Haves
[Same structure]

## Questions for User

Before making changes, I need clarification on:

1. **Question 1:** [Specific question]
   - **Context:** [Why this matters]
   - **Options:**
     - Option A: [Approach]
     - Option B: [Approach]

## Recommended Next Steps

- [ ] Clarify questions above
- [ ] Update roadmap with approved changes
- [ ] Create detailed specs for new items
- [ ] Update related documentation
```

## Step 4: Present Analysis

Present the analysis and ASK:
1. Which gaps are most important to address?
2. Do you agree with the priority levels?
3. Which questions should we tackle first?
4. Do you want to see alternative approaches?

## Step 5: Wait for Direction

DO NOT make changes until the user:
- Answers clarifying questions
- Approves specific changes
- Provides preferences/priorities

## Step 6: Update Roadmap

Only after approval, update `product-roadmap.md`:
- Make approved changes
- Maintain consistent formatting
- Update "Last Updated" date
- Add notes in relevant sections

## Step 7: Document Decisions

If significant changes were made, create:
`docs/decisions/[YYYY-MM-DD]-[decision-topic].md`

```markdown
# Decision: [Topic]

**Date:** [Date]
**Status:** Accepted
**Context:** Roadmap refinement of [section]

## Decision

[What was decided]

## Rationale

[Why this approach was chosen]

## Alternatives Considered

1. **Alternative 1:** [Description]
   - Rejected because: [Reason]

## Consequences

**Positive:**
- Benefit 1
- Benefit 2

**Negative:**
- Trade-off 1
- Trade-off 2

## Implementation Notes

[Any guidance for future implementation]
```

## Common Refinement Patterns

### Pattern 1: Feature is Too Vague
**Symptom:** "Add emergency alerts"
**Refinement:** Break into specific requirements with acceptance criteria

### Pattern 2: Missing Edge Cases
**Symptom:** Happy path only documented
**Refinement:** Add "What if" scenarios and error handling

### Pattern 3: Unclear Success Metrics
**Symptom:** No way to measure success
**Refinement:** Add specific, measurable metrics

### Pattern 4: Inconsistent Terminology
**Symptom:** "Users" vs "Members" vs "Accounts"
**Refinement:** Standardize terms, create glossary if needed

### Pattern 5: Scope Creep
**Symptom:** Feature trying to solve too many problems
**Refinement:** Break into phases, focus on core value
