---
name: break-features
description: Break large features or roadmap phases into small implementable pieces
---

# Break Features Skill

Analyzes a roadmap phase and breaks it into small, implementable features with dependencies.

## Usage

```text
/break-features <phase-name>
/break-features "Phase 2"
```

## Process

1. Read `docs/product/roadmap.md` to understand the phase
2. Identify all features needed
3. Break each into small chunks (1-5 days of work)
4. Define dependencies between features
5. Suggest implementation sequence (milestones + ordering)
6. Mark parallel work opportunities
7. Map to success metrics

## Output

Creates: `docs/phaseX-feature-breakdown.md`

### Structure

- **Overview**: Total features, timeline, parallel opportunities
- **Feature Categories**: Grouped by topic
- **Implementation Sequence**: Milestones with week estimates
- **Feature Details**: Each with description, acceptance criteria, dependencies, effort estimate, notes
- **Priority Matrix**: Must-have / Should-have / Nice-to-have
- **Parallel Work Plan**: Features that can be built simultaneously

## Principles

- Each feature: 1-5 days, no large epics
- Focus on WHAT, not HOW (no framework/library choices)
- Explicit dependencies for proper sequencing
- Start with foundation → core → enhancements → polish

## When to Use

- Starting a new development phase
- Planning a sprint
- Estimating timelines
- Scoping MVP (use priority matrix)

## When NOT to Use

- Single small features → use `/design-feature` directly
- After development has started
- Bug fixes or maintenance
