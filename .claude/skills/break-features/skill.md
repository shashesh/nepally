# Break Features Skill

## Description
Analyzes a roadmap phase and breaks it down into small, implementable features with dependencies and sequencing.

## Usage
```
/break-features <phase-name>
/break-features "Phase 2"
/break-features phase1
```

## What This Skill Does

When you invoke this skill with a phase name, it will:

1. **Read the roadmap** to understand the phase requirements
2. **Identify all features** needed to implement that phase
3. **Break down each feature** into small chunks (1-5 days of work)
4. **Define dependencies** between features (what must be built first)
5. **Suggest implementation sequence** (milestones and ordering)
6. **Mark parallel work opportunities** (features that can be built simultaneously)
7. **Map to success metrics** (how features contribute to phase goals)
8. **Estimate timeline** based on feature complexity

## Output

Creates a detailed markdown file: `docs/phaseX-feature-breakdown.md`

### File Structure:
- **Overview**: Total features, timeline, parallel work opportunities
- **Feature Categories**: Group related features together
- **Implementation Sequence**: Organized by milestones with week estimates
- **Feature Details**: For each feature:
  - **What**: Description of the feature
  - **Acceptance Criteria**: Clear definition of "done"
  - **Dependencies**: What must exist before this can be built
  - **Estimated Effort**: Days of work
  - **Notes**: Technical considerations, alternatives, etc.
- **Priority Matrix**: Must-have vs. Should-have vs. Nice-to-have
- **Parallel Work Plan**: How to split work across multiple developers
- **Success Criteria Mapping**: Which features contribute to which metrics

## Principles

### Small Chunks
- Each feature should be completable in 1-5 days
- No "epics" or large features that take weeks
- Break down into vertical slices when possible (UI + logic + data)

### No Technical Assumptions
- Don't specify frameworks, libraries, or tools
- Focus on WHAT needs to be built, not HOW
- Let technical planning happen separately

### Clear Dependencies
- Explicitly state what must exist before a feature can be built
- This enables proper sequencing and prevents blocked work

### Realistic Sequencing
- Start with foundation (auth, data models)
- Then core functionality (posts, profiles)
- Then enhancements (chat, photos, moderation)
- Then polish (notifications, stats, preferences)

### Parallel Opportunities
- Identify features that can be built by different developers simultaneously
- Mark with 🔄 symbol
- This optimizes team velocity

## Examples

### Example 1: Phase 1
```
/break-features Phase 1
```
Output: 62 features across 8 categories, sequenced into 8 milestones over 14-16 weeks

### Example 2: Phase 2
```
/break-features "Phase 2: Community Safety & Growth"
```
Would analyze Phase 2 and break down:
- Two-Step Red Alert System
- Peer vs. Business Distinction
- Hyper-Local Filtering

### Example 3: Specific Feature Area
```
/break-features "Red Alert System"
```
Would break down just that feature if it's large enough

## Integration with Other Skills

After using this skill, you can use:

1. **`/design-feature <feature-name>`** - Create detailed spec for a specific feature
2. **`/user-journey <journey-name>`** - Document user flow for a feature
3. **`/wireframe <screen-name>`** - Design UI for a feature

## Tips for Best Results

1. **Use exact phase names** from your roadmap
2. **Run this BEFORE development planning** - get feature clarity before architecture decisions
3. **Use the priority matrix** - Start with must-haves, defer nice-to-haves
4. **Review dependencies** - Make sure sequence makes sense for your team
5. **Adjust estimates** - The skill provides estimates, but adjust based on team experience

## When to Use This Skill

- ✅ **Starting a new development phase** - Break down the roadmap into work items
- ✅ **Planning a sprint** - Identify which features to tackle next
- ✅ **Estimating timeline** - Get realistic effort estimates
- ✅ **Assigning work** - See which features can be parallelized
- ✅ **Scoping MVP** - Use priority matrix to identify minimum viable set

## When NOT to Use This Skill

- ❌ **For single small features** - Just use `/design-feature` directly
- ❌ **After development has started** - Feature breakdown is for planning, not tracking
- ❌ **For bug fixes or maintenance** - This is for new feature development

## Output Location

Feature breakdowns are saved to:
```
docs/phase<N>-feature-breakdown.md
```

Example: `docs/phase1-feature-breakdown.md`, `docs/phase2-feature-breakdown.md`

## Maintenance

This skill analyzes whatever is currently in `product-roadmap.md`. If you update the roadmap:

1. Run `/refine-roadmap <section>` to improve roadmap quality
2. Then run `/break-features <phase>` to regenerate feature breakdown
3. Compare old vs. new breakdown to see what changed

---

**Last Updated:** 2026-02-06
**Version:** 1.0
