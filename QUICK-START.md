# Quick Start: Working with Claude on NUSA

This is your quick reference for working with Claude Code on this project.

---

## Current Project Phase

🎨 **PRE-DEVELOPMENT: Product & Design**

We are NOT writing code yet. Focus is on:
- Product refinement
- Feature specifications
- User journey mapping
- Wireframing
- Decision documentation

---

## How Claude is Configured

### 1. Auto-Planning Enabled
Claude will automatically enter plan mode for complex requests and present options before proceeding.

### 2. Question-First Approach
Claude will ask clarifying questions rather than make assumptions.

### 3. Structured Documentation
All work is documented in organized markdown files following consistent templates.

---

## Available Commands

### Custom Skills (Invoke with `/skill-name`)

**Note:** You'll need to restart your Claude Code session for skills to be recognized after they're created.

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/design-feature [name]` | Structured feature design process | When you want to flesh out a new feature idea |
| `/wireframe [screen]` | Create detailed wireframe docs with ASCII art | When you need to visualize a screen/interface |
| `/user-journey [flow]` | Document end-to-end user experience | When you want to map out how users complete a task |
| `/refine-roadmap [section]` | Analyze and improve roadmap sections | When a roadmap section needs deeper thinking |

### How to Use Skills

**Basic:**
```
/design-feature
```

**With arguments:**
```
/design-feature emergency-alert-system
/wireframe housing-post-form
/user-journey emergency-broadcast
/refine-roadmap phase-1
```

---

## Effective Prompting Templates

### Template 1: Feature Exploration
```
"Let's explore [feature name]. I want to understand:
- Different approaches we could take
- Pros and cons of each
- How it fits in the Metro-first model
- Potential edge cases

Present options before we commit to an approach."
```

### Template 2: Roadmap Refinement
```
"Review the [section name] section of product-roadmap.md.
I want you to:
1. Identify gaps or unclear requirements
2. Find inconsistencies with our core principles
3. Suggest improvements

Ask me questions about anything ambiguous."
```

### Template 3: User Journey Mapping
```
"Map the user journey for [specific task].
Consider a [user type] who wants to [goal].
Document the step-by-step flow and identify pain points.

Stop and ask me questions if you need clarification."
```

### Template 4: Wireframe Creation
```
"Create wireframe documentation for [screen name].
Include:
- ASCII visual layout
- All interactive elements
- Validation rules
- Error states

Show me 2-3 layout options before finalizing."
```

---

## Forcing Plan Mode

If Claude doesn't automatically enter plan mode, you can force it:

```
"Enter plan mode and [your request]"
```

Example:
```
"Enter plan mode and design the moderator verification interface
for the Red Alert system. I want to see your research and approach
before we create any documentation."
```

---

## Review Before Execution Patterns

### Pattern 1: Checkpoint Approval
```
"Let's work in phases. After each phase, stop and show me
what you've found before proceeding:

Phase 1: Research existing roadmap
Phase 2: Identify gaps
Phase 3: Propose solutions"
```

### Pattern 2: Options Presentation
```
"Don't pick an approach yet. Instead, show me 3 different
ways we could solve [problem]. Include pros, cons, and your
recommendation."
```

### Pattern 3: Question Gatekeeping
```
"Before you create any documents, ask me all clarifying
questions you have. Let's get alignment first."
```

---

## File Organization

Claude will organize files according to this structure:

```
nusa/
├── product-roadmap.md          # Master roadmap (single source of truth)
├── CLAUDE.md                   # Instructions for Claude
├── LEARNING-CLAUDE.md          # Comprehensive guide (what you're reading)
├── QUICK-START.md              # This file
├── .clauderc                   # Configuration
│
├── docs/
│   ├── features/               # Detailed feature specs
│   │   └── feature-name.md
│   │
│   ├── wireframes/            # Screen wireframes
│   │   └── screen-name.md
│   │
│   ├── user-journeys/         # User flow documentation
│   │   └── journey-name.md
│   │
│   └── decisions/             # Architecture Decision Records
│       └── YYYY-MM-DD-topic.md
│
└── .claude/
    └── skills/                # Custom skills
        ├── design-feature.md
        ├── wireframe.md
        ├── user-journey.md
        └── refine-roadmap.md
```

---

## Common Workflows

### Workflow 1: "I have a feature idea"

```
You: "/design-feature notification-system"

Claude: [Asks clarifying questions]

You: [Provides answers]

Claude: [Enters plan mode, researches roadmap, presents options]

You: "I like option 2"

Claude: [Creates docs/features/notification-system.md]
```

---

### Workflow 2: "The roadmap section is unclear"

```
You: "/refine-roadmap two-step-red-alert"

Claude: [Enters plan mode, analyzes section]
Claude: [Presents gaps, inconsistencies, questions]

You: [Answers questions, provides preferences]

Claude: [Updates roadmap with approved changes]
Claude: [Creates decision document if significant]
```

---

### Workflow 3: "I need to visualize this"

```
You: "/wireframe emergency-post-form"

Claude: [Asks about form fields, validation, flow]

You: [Provides details]

Claude: [Creates ASCII wireframe with 2-3 layout options]

You: "Option 1 looks good, but make the submit button larger"

Claude: [Creates final wireframe documentation]
```

---

### Workflow 4: "Walk through the user experience"

```
You: "/user-journey posting-emergency-alert"

Claude: [Asks about user persona, starting point, context]

You: [Describes scenario]

Claude: [Creates detailed step-by-step journey with emotions,
        pain points, and decision tree]

You: [Reviews and requests changes]

Claude: [Updates journey documentation]
```

---

## Tips for Best Results

### ✅ DO

- Be specific about what you want to review before execution
- Use the custom skills - they follow best practices
- Reference the roadmap when discussing features
- Ask for comparisons and trade-offs
- Break complex work into phases with checkpoints

### ❌ DON'T

- Rush to code (we're in design phase!)
- Accept the first solution without exploring alternatives
- Skip documenting important decisions
- Make assumptions about user behavior without validation

---

## Example Session

Here's what a good working session looks like:

```
You: "Let's refine the Trust Levels system. I think we need
      more detail on how users level up from 0 to 1 to 2."

Claude: "I'll enter plan mode to analyze the current Trust Levels
        section. Let me review the roadmap..."

Claude: [Researches, identifies gaps]

Claude: "I found several gaps:
        1. No clear criteria for Level 0 → 1
        2. Unclear what 'high engagement' means for Level 2
        3. No mention of level-down (demotion) for violations

        I have some questions:
        - Should phone verification be instant Level 1?
        - How many posts = 'high engagement'?
        - Can moderators manually promote users?

        What are your thoughts?"

You: "Phone verification should be Level 1, yes. For Level 2,
     let's say 10+ helpful posts with no flags. Moderators
     should be able to promote."

Claude: "Thanks! Should I also define what makes a post 'helpful'?
        For example, upvotes, or moderator endorsement?"

You: "Good point. Let's use a combination: 5+ upvotes OR
     1 moderator endorsement per post."

Claude: "Perfect. I'll update the roadmap with:
        - Clear Level 0→1 criteria (phone verification)
        - Clear Level 1→2 criteria (10 helpful posts)
        - Definition of 'helpful' (5+ upvotes OR mod endorsement)
        - Moderator promotion powers

        Should I also add a demotion policy?"

You: "Yes, add a demotion section."

Claude: [Updates roadmap with all approved changes]

Claude: "Done! I've updated the Trust Levels section. The changes
        are significant enough that I've also created a decision
        document at docs/decisions/2026-02-06-trust-level-criteria.md
        for future reference.

        Would you like to review the changes?"
```

---

## Getting Help

### If Claude isn't behaving as expected:

1. **Check `.clauderc`** - Is it configured correctly?
2. **Be more explicit** - Use "Enter plan mode and..."
3. **Use checkpoints** - "Stop after each phase for review"
4. **Reference this guide** - "Follow the process in QUICK-START.md"

### If you want to learn more:

- Read `LEARNING-CLAUDE.md` for comprehensive guide
- Review `.claude/skills/` to see how skills work
- Check `product-roadmap.md` for project context
- Read `CLAUDE.md` for architectural principles

---

## Your First Tasks

Try these to get comfortable:

1. **Explore a skill:**
   ```
   /design-feature travel-companion-matching
   ```

2. **Refine something:**
   ```
   /refine-roadmap phase-1
   ```

3. **Create a wireframe:**
   ```
   /wireframe emergency-category-selection
   ```

4. **Map a journey:**
   ```
   /user-journey first-time-user-onboarding
   ```

---

## Questions?

Just ask Claude:
- "Show me how plan mode works"
- "What's the best way to document a feature?"
- "How do I ensure you ask me before making changes?"
- "Walk me through the /design-feature process"

---

**Remember:** We're in the design phase. The goal is to think deeply, explore thoroughly, and document clearly. Don't rush to solutions - the best products come from understanding the problem first.
