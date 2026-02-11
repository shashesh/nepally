# Documentation

This directory contains detailed documentation for the NUSA project.

## Directory Structure

### `/features`
Detailed feature specifications created using `/design-feature` skill.

Each feature document includes:
- Problem statement and user story
- Functional and non-functional requirements
- User flow and edge cases
- Trust & safety considerations
- Success metrics

### `/wireframes`
Screen wireframe documentation created using `/wireframe` skill.

Each wireframe includes:
- ASCII visual layout
- Component behavior specifications
- Interaction details and validation rules
- Mobile and accessibility considerations

### `/user-journeys`
End-to-end user experience documentation created using `/user-journey` skill.

Each journey includes:
- Step-by-step flow
- User emotions and pain points
- Decision trees and touchpoints
- Edge cases and alternative paths

### `/decisions`
Architecture Decision Records (ADRs) documenting important choices.

Each decision record includes:
- Context and problem statement
- Decision made and rationale
- Alternatives considered
- Consequences and trade-offs

## How to Use

1. **Creating New Documentation:**
   - Use the custom Claude skills (`/design-feature`, `/wireframe`, `/user-journey`)
   - Follow the templates provided by each skill
   - Link related documents together

2. **Updating Existing Documentation:**
   - Keep documents in sync with `product-roadmap.md`
   - Update "Last Updated" dates
   - Create decision records for significant changes

3. **Finding Information:**
   - Check `product-roadmap.md` first for high-level overview
   - Dive into specific docs for detailed specifications
   - Review decision records to understand "why" behind choices

## Document Status Labels

Use these status labels in documents:

- **Draft** - Work in progress, not yet reviewed
- **In Review** - Ready for feedback
- **Approved** - Finalized and ready for implementation
- **Implemented** - Feature has been built (future phase)
- **Deprecated** - No longer relevant or superseded

## Best Practices

- Keep documents focused and scannable
- Use tables, checklists, and visual formatting
- Link related documents
- Update status labels as work progresses
- Archive old versions in decision records rather than deleting
