# Break Features Skill - Quick Reference

## Quick Start

To break down any phase of your roadmap into implementable features:

```bash
/break-features Phase 1
/break-features Phase 2
/break-features "Phase 3: Sustainability & Ecosystem"
```

## What You'll Get

A comprehensive markdown file with:

- 📋 **Complete feature list** - Every feature needed for the phase
- 🔢 **Implementation sequence** - What to build first, second, third...
- 🔗 **Dependencies mapped** - Know what blocks what
- ⏱️ **Time estimates** - Effort for each feature (1-5 days)
- 🔄 **Parallel opportunities** - Features that can be built simultaneously
- 🎯 **Priority matrix** - Must-have vs. Should-have vs. Nice-to-have
- 📊 **Success metrics mapping** - How features achieve phase goals

## Output File

Creates: `docs/phase<N>-feature-breakdown.md`

Example for Phase 1: `docs/phase1-feature-breakdown.md` (already created for you!)

## Use Cases

### Use Case 1: Starting Development
**When:** You're ready to start building a phase
**Do:** Run `/break-features <phase>` to get your work backlog
**Result:** Know exactly what to build and in what order

### Use Case 2: Sprint Planning
**When:** Planning next 2-week sprint
**Do:** Review feature breakdown, pick next 5-10 features
**Result:** Well-scoped sprint with clear dependencies

### Use Case 3: Team Assignment
**When:** You have 2-3 developers
**Do:** Look for features marked 🔄 (parallel work)
**Result:** Assign independent features to each developer

### Use Case 4: MVP Scoping
**When:** Need to launch quickly with minimum features
**Do:** Review Priority Matrix section
**Result:** Build only "Must-Have" features, defer the rest

### Use Case 5: Timeline Estimation
**When:** Stakeholders ask "How long will this take?"
**Do:** Sum up effort estimates for must-have features
**Result:** Realistic timeline (e.g., "45 features × 2 days avg = 90 days")

## Example Workflow

1. **Break down phase:**
   ```
   /break-features Phase 1
   ```

2. **Review output:**
   - Read `docs/phase1-feature-breakdown.md`
   - Identify must-have features (45 in Phase 1)
   - Note dependencies and milestones

3. **Pick first milestone:**
   - Milestone 1: Foundation (Weeks 1-4)
   - Features: 1.1 through 4.2 (Auth, Location, Profile, Trust basics)

4. **Design detailed specs:**
   ```
   /design-feature user-registration
   /design-feature phone-verification
   /design-feature metro-area-mapping
   ```

5. **Document user flows:**
   ```
   /user-journey new-user-onboarding
   ```

6. **Create wireframes:**
   ```
   /wireframe signup-screen
   /wireframe phone-verification-screen
   ```

7. **Start building!** 🚀

## Tips

### Tip 1: Start with Foundation
Always build in the sequence suggested. Don't jump to "cool" features (like chat) before foundation (auth, profiles) is solid.

### Tip 2: One Milestone at a Time
Don't try to build all 8 milestones at once. Complete Milestone 1, deploy to staging, test, then move to Milestone 2.

### Tip 3: Adjust Estimates
Estimates assume experienced developer. If you're learning:
- 2x the estimates for first milestone (learning curve)
- 1.5x for second milestone (still learning)
- Use estimates as-is by third milestone (you're now experienced!)

### Tip 4: Use Priority Matrix
If timeline is tight:
- Build all 45 "Must-Have" features = MVP
- Ship to beta users
- Gather feedback
- Build "Should-Have" features in v1.1
- Build "Nice-to-Have" features in v1.2+

### Tip 5: Mark Features as Done
As you complete features, check them off in the breakdown file. This gives you visible progress and morale boost!

## Common Questions

**Q: Can I change the sequence?**
A: Yes, but respect dependencies. Don't build "Chat" before "User Profiles" exist.

**Q: What if a feature is too big?**
A: Break it down further. If "Chat" feels overwhelming, split into: Chat UI, Chat Data, Chat Real-time, Chat Notifications.

**Q: What if I don't need all features?**
A: Use Priority Matrix. Skip "Nice-to-Have" features entirely if needed.

**Q: Can I add features not in the list?**
A: Yes! The breakdown is based on current roadmap. If you discover missing features, add them to the list.

**Q: How do I track progress?**
A: Use your project management tool (GitHub Projects, Jira, Trello) and create issues/tickets from each feature.

## Integration with Development

After breaking down features:

1. **Create GitHub Issues** - One issue per feature
2. **Add to Project Board** - Organize by milestone
3. **Link Dependencies** - Use "Blocked by" in issue tracker
4. **Assign to Developers** - Use 🔄 markers for parallel work
5. **Track Progress** - Move issues through board as you build

## Regenerating Breakdown

If roadmap changes:

1. Update `product-roadmap.md`
2. Run `/break-features <phase>` again
3. Compare new vs. old breakdown
4. Update your issue tracker with new features

---

**For detailed instructions, see:** `skill.md`
**For your Phase 1 breakdown, see:** `../../docs/phase1-feature-breakdown.md`
