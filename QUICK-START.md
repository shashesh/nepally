# Quick Start: Working with Claude Code on NUSA

Quick reference for working with Claude Code on this project.

---

## Current Phase

**PHASE 1 IN PROGRESS: Utility Core & Trust Foundation**
- Onboarding flow complete (signup, login, ZIP/metro, tutorial)
- Home feed with category filtering and post cards
- Post creation with all 4 category forms (Housing, Jobs, Emergency, Travel)
- Profile management (view, edit profile, change password)
- Next up: In-app chat, photo upload, reporting system

See [TECH-VERSIONS.md](./TECH-VERSIONS.md) for current versions.

---

## Custom Skills

| Command | What It Does |
|---------|-------------|
| `/design-feature [name]` | Structured feature design process |
| `/wireframe [screen]` | Create detailed wireframe docs with ASCII art |
| `/user-journey [flow]` | Document end-to-end user experience |
| `/refine-roadmap [section]` | Analyze and improve roadmap sections |
| `/implement-feature [name]` | Guided feature implementation with full context |

**Usage:**
```
/design-feature emergency-alert-system
/wireframe housing-post-form
/user-journey emergency-broadcast
/refine-roadmap phase-1
```

---

## Prompting Tips

### Feature Exploration
```
"Let's explore [feature name]. I want to understand:
- Different approaches we could take
- Pros and cons of each
- How it fits in the Metro-first model
Present options before we commit."
```

### Roadmap Refinement
```
"Review the [section] of product-roadmap.md.
Identify gaps, unclear requirements, and inconsistencies.
Ask me questions about anything ambiguous."
```

### Wireframe Creation
```
"Create wireframe documentation for [screen name].
Include ASCII layout, interactive elements, validation rules, error states.
Show me 2-3 layout options before finalizing."
```

### Force Plan Mode
```
"Enter plan mode and [your request]"
```

---

## File Organization

```
nusa/
├── product-roadmap.md          # Master product roadmap
├── CLAUDE.md                   # Instructions for Claude Code
├── QUICK-START.md              # This file
├── TECH-VERSIONS.md            # Technology version source of truth
├── README.md                   # Project README
│
├── docs/
│   ├── features/               # Feature specifications
│   ├── wireframes/             # Screen wireframes + design system
│   ├── user-journeys/          # User flow documentation
│   ├── decisions/              # Architecture Decision Records
│   ├── database-schema.md      # PostgreSQL schema
│   ├── code-sharing-guide.md   # Mobile/web code sharing rules
│   ├── monorepo-structure.md   # Codebase organization
│   ├── supabase-setup.md       # Supabase configuration
│   └── deployment-guide.md     # Production deployment
│
└── .claude/skills/             # Custom Claude skills
```

---

## Key Workflows

### 1. "I have a feature idea"
```
/design-feature [name] → Claude asks questions → presents options → creates spec
```

### 2. "The roadmap section is unclear"
```
/refine-roadmap [section] → Claude analyzes → presents gaps → updates roadmap
```

### 3. "I need to visualize a screen"
```
/wireframe [screen] → Claude asks about fields/flow → creates ASCII wireframe
```

### 4. "Walk through the user experience"
```
/user-journey [flow] → Claude maps step-by-step journey with pain points
```

### 5. "Implement a feature"
```
/implement-feature [name] → reads specs, journeys, wireframes → plans → implements
```
