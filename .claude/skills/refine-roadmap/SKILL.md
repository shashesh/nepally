---
name: refine-roadmap
description: Analyze and improve sections of the product roadmap
---

# Refine Roadmap Skill

When the user invokes `/refine-roadmap [section-name]`, analyze and improve that section.

## Process

### Step 1: Enter Plan Mode

Read the current `docs/product/roadmap.md`, understand the section's context, identify dependencies.

### Step 2: Analyze (5 dimensions)

- **Completeness**: All scenarios covered? Edge cases? Success metrics? Dependencies?
- **Clarity**: Understandable by new team member? Consistent terms? Examples where needed?
- **Consistency**: Aligns with metro-first model, trust levels, project vision?
- **Feasibility**: Realistic requirements/timelines? Technical constraints? Resources available?
- **Safety & Trust**: Abuse prevention? PII handling? Moderator tools? Legal disclaimers?

### Step 3: Present Analysis

Report with: Current state summary, strengths, gaps (with impact/suggestions), unclear requirements, inconsistencies, proposed improvements (Priority 1-3), and questions needing user input.

### Step 4: Wait for Direction

DO NOT make changes until user answers questions and approves specific changes.

### Step 5: Update Roadmap

After approval: update `docs/product/roadmap.md`, maintain formatting, update date.

### Step 6: Document Decisions (if significant)

Create `docs/decisions/[YYYY-MM-DD]-[topic].md` with: Decision, Rationale, Alternatives Considered, Consequences (positive/negative).
