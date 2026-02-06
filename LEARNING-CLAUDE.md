# Learning Claude Code: A Practical Guide

This document teaches you how to work effectively with Claude Code for product development, planning, and design work.

---

## Table of Contents
1. [Configuration Methods](#configuration-methods)
2. [Plan Mode](#plan-mode)
3. [Custom Skills](#custom-skills)
4. [Effective Prompting](#effective-prompting)
5. [Workflows for This Project](#workflows-for-this-project)

---

## Configuration Methods

### 1. `.clauderc` File (Recommended for This Project)
**Location:** `.clauderc` in your project root

**What it does:** Sets project-specific instructions that Claude always follows

**When to use:**
- Project-wide rules and conventions
- File organization standards
- Phase-specific behavior (like "we're in design phase, don't code yet")

**Example:**
```
# Always use plan mode for feature requests
# Focus on product design, not implementation
# Ask clarifying questions before making assumptions
```

I've already created `.clauderc` for this project with your requirements.

### 2. Custom Skills
**Location:** `.claude/skills/` directory

**What it does:** Creates reusable commands you can invoke with `/skill-name`

**When to use:**
- Repetitive workflows (e.g., `/design-feature`, `/refine-roadmap`)
- Structured processes you want to standardize
- Complex multi-step operations

**Example Use Cases for UNHN:**
- `/design-feature` - Structured feature specification process
- `/create-user-journey` - Document a user flow
- `/wireframe` - Create wireframe documentation
- `/review-roadmap` - Analyze roadmap for gaps

### 3. Session Instructions
**How:** Just tell Claude directly in your message

**When to use:**
- One-time requests
- Overriding default behavior temporarily
- Experimenting with different approaches

---

## Plan Mode

### What is Plan Mode?

Plan mode is a special state where Claude:
1. Explores and researches without making changes
2. Creates a detailed implementation plan
3. Presents the plan for your review
4. Waits for approval before executing

### How to Trigger Plan Mode

**Method 1: Claude triggers it automatically**
- Happens when requests are complex or have multiple approaches
- Based on `.clauderc` configuration

**Method 2: You request it explicitly**
```
"Enter plan mode and create a strategy for..."
"Plan out how we should approach..."
"I want to review a plan before we proceed with..."
```

### What Happens in Plan Mode?

1. **Research Phase:** Claude reads files, analyzes context
2. **Planning Phase:** Creates structured plan with options
3. **Review Phase:** Presents plan to you with rationale
4. **Approval Phase:** You review and approve/modify
5. **Execution Phase:** Claude implements the approved plan

### Example Plan Mode Request for UNHN:
```
"Enter plan mode and design the emergency alert feature.
I want to see different approaches for the two-step verification
system before we finalize the design."
```

---

## Custom Skills

### Creating Your First Skill

Let's create a skill for feature design:

**File:** `.claude/skills/design-feature.md`

```markdown
---
description: Design a new feature with structured specification
---

When the user invokes /design-feature, follow this process:

1. ASK clarifying questions:
   - What problem does this solve?
   - Who is the primary user?
   - What's the expected user journey?
   - Any constraints or requirements?

2. CREATE a feature specification document:
   - docs/features/[feature-name].md
   - Include: Overview, User Story, Requirements, Edge Cases, Success Metrics

3. UPDATE product-roadmap.md if needed:
   - Add to appropriate phase
   - Link to detailed spec

4. PRESENT options for user flows and ask for feedback
```

### Using Skills

Once created, invoke with:
```
/design-feature
```

Or with arguments:
```
/design-feature emergency-alert-system
```

---

## Effective Prompting

### Bad Prompts ❌
- "Add a feature for emergency alerts"
- "Make the roadmap better"
- "Design the app"

### Good Prompts ✅

**For Planning:**
```
"Enter plan mode and design the emergency alert feature.
I want to see:
1. Different UX approaches for the two-step verification
2. Trade-offs between push notifications vs SMS
3. Mockup of the moderator verification interface

Present options before we finalize."
```

**For Refinement:**
```
"Review the Phase 1 section of the product roadmap.
Identify:
- Missing edge cases
- Unclear requirements
- Potential user confusion points

Ask me questions about anything ambiguous before suggesting changes."
```

**For Wireframing:**
```
"Create a detailed wireframe description for the Housing Post form.
Include:
- All form fields from the roadmap
- Validation rules
- Error states
- Submit flow

Use ASCII diagrams or structured markdown."
```

---

## Workflows for This Project

### Workflow 1: Refining a Feature

```
You: "I want to refine the two-step Red Alert system.
      Enter plan mode and identify gaps in the current spec."

Claude: [Enters plan mode, researches, presents findings]

You: [Review plan, provide feedback]

Claude: [Updates documentation based on approved plan]
```

### Workflow 2: Creating a User Journey

```
You: "Document the user journey for someone posting an emergency.
      Start from app open to alert broadcast.
      Ask me questions about any unclear steps."

Claude: [Asks clarifying questions]

You: [Answers]

Claude: [Creates docs/user-journeys/emergency-post.md]
```

### Workflow 3: Wireframe Design

```
You: "Create wireframe documentation for the Housing post form.
      Show me different layout options before finalizing."

Claude: [Presents 2-3 layout options with pros/cons]

You: "I prefer option 2"

Claude: [Creates detailed wireframe doc for option 2]
```

---

## Tips & Best Practices

### 1. Be Explicit About What You Want to Review
```
"Show me options for X before deciding"
"I want to review the plan before you create any files"
"Present 2-3 approaches and explain trade-offs"
```

### 2. Use Checkpoints for Complex Work
```
"Let's work in phases:
Phase 1: Identify all form fields needed
Phase 2: Design validation rules
Phase 3: Create wireframe

Stop after each phase for my review."
```

### 3. Reference the Roadmap
```
"According to product-roadmap.md, the Housing category
needs Rent, Move-in Date, and Room Type. Are we missing
any fields for a good user experience?"
```

### 4. Ask for Comparisons
```
"Compare approach A (immediate broadcast) vs approach B
(moderator verification) for emergency alerts.
Consider spam prevention, response time, and user trust."
```

### 5. Request Structured Output
```
"Create a comparison table of these three approaches"
"Use a decision tree to show the flow"
"Make a checklist of requirements we need to validate"
```

---

## Example Interactions for UNHN

### Example 1: Feature Refinement
```
You: "The Travel category in the roadmap seems incomplete.
      Enter plan mode and design a comprehensive travel
      companion feature. Consider:
      - Luggage sharing
      - Airport pickup coordination
      - Travel tips sharing

      Present your research and options."
```

### Example 2: Edge Case Analysis
```
You: "Review the two-step Red Alert system for edge cases:
      - What if no moderators are online?
      - What if a moderator is malicious?
      - What about false negatives?

      Create a decision document with recommendations."
```

### Example 3: Wireframe Request
```
You: "Create ASCII wireframes for the Emergency Post flow:
      1. Emergency category selection screen
      2. Form with mandatory fields
      3. Confirmation screen
      4. Moderator verification view

      Ask questions about any UX decisions you're uncertain about."
```

---

## Commands Reference

### Built-in Commands
- `/help` - Get help with Claude Code
- `/clear` - Clear conversation history
- `/commit` - Create a git commit (we won't use this yet)

### Your Custom Skills (to be created)
- `/design-feature [name]` - Structured feature design
- `/refine-roadmap [section]` - Analyze and improve roadmap section
- `/user-journey [flow]` - Document user flow
- `/wireframe [screen]` - Create wireframe documentation
- `/review` - Review current phase deliverables

---

## Next Steps

1. **Try Plan Mode:** Pick a feature from the roadmap and ask me to plan its design
2. **Create a Skill:** Let's create your first custom skill together
3. **Refine the Roadmap:** Practice by asking me to refine a specific section
4. **Document a User Journey:** Choose a flow and we'll document it together

## Questions?

Try asking me:
- "Show me how to create a custom skill for wireframing"
- "Enter plan mode and help me refine the Trust Levels feature"
- "What's the difference between .clauderc and custom skills?"
- "Create a template for documenting user journeys"
