---
name: design-feature
description: Design a new feature with structured specification
---

# Feature Design Skill

When the user invokes `/design-feature [feature-name]`, create a structured feature spec.

## Step 1: Clarify

ASK:
1. **Problem Statement:** What user problem does this solve?
2. **Target Users:** New users, verified, moderators, businesses?
3. **Metro Scope:** Local, metro-wide, or global?
4. **Platform:** Mobile, Web, or Both? (Default: Both)
5. **Phase Alignment:** Which roadmap phase?
6. **Dependencies:** Requires other features first?

## Step 2: Plan

Enter plan mode. Review `product-roadmap.md`, check for conflicts with trust/safety principles, identify stakeholders.

## Step 3: Create Feature Spec

Create `docs/features/[feature-name].md` with these sections:
- **Metadata**: Status, Phase, Owner, Date
- **Overview & Problem Statement**
- **User Story**: As a [type], I want [action], so that [benefit]
- **Requirements**: Functional (checklist) + Non-functional (perf, security, a11y)
- **User Flow**: Step-by-step from start to finish
- **Edge Cases & Error States**: Table (Scenario | Behavior)
- **Trust & Safety**: Spam prevention, PII handling, moderation needs
- **Success Metrics**: Measurable outcomes
- **Platform Scope**: Mobile/Web checkboxes
- **Code Architecture**: What goes in `packages/shared/` (types, API, validation, utils) vs `apps/mobile/` (screens, components, nav) vs `apps/web/` (pages, components)
- **Open Questions & Related Features**

## Step 4: Present Options

Offer 2-3 UX/design approaches with pros, cons, complexity, and roadmap alignment. Ask user preference.

## Step 5: Update Roadmap

If approved, update `product-roadmap.md` with link to spec.

## Step 6: Suggest Next Steps

Create wireframes? Document user journey? Define API requirements?
