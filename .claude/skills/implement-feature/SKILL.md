---
name: implement-feature
description: Implement features with full context from specs, journeys, and wireframes
---

# Feature Implementation Skill

When the user invokes `/implement-feature [feature-name]` or asks to implement a feature, follow this context-first approach to ensure you build exactly what's been designed.

## CRITICAL PRINCIPLE: Context Before Code

**NEVER start coding without gathering full context from:**
1. Feature specification (if exists)
2. User journey documentation
3. Wireframe specifications
4. Design system foundation

**Coding without context leads to misalignment, rework, and wasted effort.**

---

## Step 0: Identify the Feature

ASK these questions:
1. **Feature Name:** What feature are we implementing? (e.g., "signup-and-onboarding", "housing-post-creation")
2. **Platform:** Mobile (React Native), Web (Next.js), or Both?
3. **Scope:** Full feature or specific screens/components?
4. **Related Journey:** Which user journey number does this implement? (e.g., Journey #01)

---

## Step 1: Gather Complete Context

### 1.1 Read Feature Specification (if exists)
Look for: `docs/features/[feature-name].md`

Extract:
- Functional requirements
- Non-functional requirements (performance, security)
- Trust level requirements
- Edge cases and error states
- Success metrics

### 1.2 Read User Journey
Look for: `docs/user-journeys/[category]/[number]-[journey-name].md`

Extract:
- User persona and context
- Step-by-step flow (every screen, every action)
- Pain points to avoid
- Alternative paths and error cases
- Technical requirements (API endpoints, validations)
- Data required at each step

### 1.3 Read Wireframes
Look for: `docs/wireframes/[screen-name].md`

Extract:
- Exact layout specifications
- Component hierarchy
- Interactive states (default, pressed, disabled, error, loading)
- Validation rules and error messages
- Platform-specific differences (iOS vs Android)
- Animation and transition details
- Accessibility requirements

### 1.4 Read Design System
Always read: `docs/wireframes/00-design-system-foundation.md`

Extract:
- Color palette (hex values)
- Typography system (fonts, sizes, weights)
- Spacing system (8pt grid)
- Component library (buttons, inputs, cards, badges)
- Platform conventions (iOS HIG vs Material Design)

---

## Step 2: Create Implementation Plan

**ALWAYS use EnterPlanMode for non-trivial implementations.**

In plan mode:

### 2.1 Map Documentation to Code
Create a mapping document showing:
```
User Journey Step → Screen/Component → Files to Create/Modify

Example:
Step 1: Tap "Sign Up"
  → WelcomeScreen component
  → Files: apps/mobile/src/screens/onboarding/WelcomeScreen.tsx
         apps/mobile/src/components/buttons/PrimaryButton.tsx
         apps/mobile/src/styles/colors.ts
```

### 2.2 Identify Components Needed
Break down into:
- **Screens**: Full-screen components (e.g., WelcomeScreen, SignupMethodScreen)
- **Shared Components**: Reusable UI elements (e.g., PrimaryButton, TextInput, TrustBadge)
- **Services**: API clients, auth handlers, storage utilities
- **Navigation**: Route definitions, stack navigators
- **State Management**: Context providers, hooks
- **Types**: TypeScript interfaces matching wireframe data

### 2.3 Define File Structure
```
apps/mobile/src/
├── screens/
│   ├── onboarding/
│   │   ├── WelcomeScreen.tsx
│   │   ├── SignupMethodScreen.tsx
│   │   ├── ZipCodeEntryScreen.tsx
│   │   └── ...
│   └── ...
├── components/
│   ├── buttons/
│   │   ├── PrimaryButton.tsx
│   │   └── SecondaryButton.tsx
│   ├── inputs/
│   │   ├── TextInput.tsx
│   │   └── ZipCodeInput.tsx
│   └── ...
├── navigation/
│   └── OnboardingNavigator.tsx
├── services/
│   ├── auth/
│   │   ├── phoneAuth.ts
│   │   └── socialAuth.ts
│   ├── api/
│   │   └── metroArea.ts
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   └── useMetroArea.ts
├── styles/
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
└── types/
    └── index.ts
```

### 2.4 Implementation Order
Determine build order (bottom-up approach):
1. **Foundation**: Design tokens (colors, typography, spacing)
2. **Shared Components**: Buttons, inputs, cards (from design system)
3. **Services**: API clients, auth handlers
4. **Hooks**: Custom hooks for data fetching, auth state
5. **Screens**: Individual screens following wireframes
6. **Navigation**: Connect screens in proper flow
7. **Integration**: End-to-end testing of user journey

### 2.5 Validation Checklist
Create checklist to verify implementation matches docs:
- [ ] All wireframe screens implemented
- [ ] All interactive states working (default, pressed, disabled, error, loading)
- [ ] All validation rules from journey applied
- [ ] All error cases from journey handled
- [ ] Design system colors/typography/spacing used correctly
- [ ] Platform-specific differences respected (iOS vs Android)
- [ ] Accessibility requirements met (WCAG AA)
- [ ] Success metrics are trackable

---

## Step 3: Exit Plan Mode & Get Approval

Present the implementation plan showing:
1. **Files to Create/Modify**: Complete list with line counts
2. **Component Hierarchy**: Visual tree of components
3. **Implementation Order**: Step-by-step build sequence
4. **Estimated Complexity**: How many files, how complex
5. **Dependencies**: External packages needed
6. **Validation**: How you'll verify against docs

Use ExitPlanMode to get user approval before coding.

---

## Step 4: Implement Foundation First

### 4.1 Design Tokens
Create design system constants from `00-design-system-foundation.md`:

**apps/mobile/src/styles/colors.ts**
```typescript
// From docs/wireframes/00-design-system-foundation.md
export const colors = {
  primary: {
    blue: '#1565C0',      // Primary actions, headers, links
    red: '#DC143C',       // Emergency, Nepali accent
  },
  success: '#2E7D32',     // Verification, success states
  warning: '#F57C00',     // Level 0 banner, cautions
  error: '#C62828',       // Form errors, warnings
  neutral: {
    background: '#F5F5F5',
    textPrimary: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
  },
  white: '#FFFFFF',
};
```

**apps/mobile/src/styles/typography.ts**
```typescript
import { Platform } from 'react-native';

// From docs/wireframes/00-design-system-foundation.md
export const typography = {
  h1: {
    fontSize: 34,
    fontWeight: Platform.OS === 'ios' ? '700' : '500',
  },
  h2: {
    fontSize: 28,
    fontWeight: Platform.OS === 'ios' ? '700' : '500',
  },
  h3: {
    fontSize: 22,
    fontWeight: Platform.OS === 'ios' ? '600' : '400',
  },
  body: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '400',
  },
  caption: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontWeight: '400',
  },
  button: {
    fontSize: Platform.OS === 'ios' ? 17 : 14,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
  },
};
```

**apps/mobile/src/styles/spacing.ts**
```typescript
// 8pt grid system from docs/wireframes/00-design-system-foundation.md
export const spacing = {
  xxs: 4,   // Tight spacing, icon padding
  xs: 8,    // Small gaps, list item padding
  s: 16,    // Default spacing between elements
  m: 24,    // Section spacing
  l: 32,    // Screen padding, major sections
  xl: 48,   // Hero elements, onboarding
};
```

### 4.2 Shared Components
Build reusable components from design system:

**apps/mobile/src/components/buttons/PrimaryButton.tsx**
```typescript
// Implementation matches docs/wireframes/00-design-system-foundation.md
// - Background: #1565C0 (Primary Blue)
// - Height: 48px (iOS) / 56dp (Android)
// - Corner Radius: 8px
// - States: Default, Pressed, Disabled, Loading
```

**apps/mobile/src/components/inputs/TextInput.tsx**
```typescript
// Implementation matches docs/wireframes/00-design-system-foundation.md
// - Border: 1px solid #E0E0E0
// - Height: 56px
// - Corner Radius: 8px
// - Active State: 2px border #1565C0
// - Error State: 2px border #C62828 + error text below
```

---

## Step 5: Implement Screens Following Wireframes

For each screen in the user journey:

### 5.1 Create Screen Component
File: `apps/mobile/src/screens/[category]/[ScreenName].tsx`

### 5.2 Match Wireframe Exactly
Reference: `docs/wireframes/[number]-[screen-name].md`

Implement:
- **Layout**: Exact component hierarchy from ASCII wireframe
- **Spacing**: Use spacing tokens (xxs, xs, s, m, l, xl)
- **Typography**: Use typography tokens (h1, h2, body, caption, button)
- **Colors**: Use color tokens (primary.blue, neutral.background, etc.)
- **Interactive States**: All states from wireframe (default, pressed, disabled, error, loading)
- **Validation**: All validation rules from wireframe
- **Error Messages**: Exact error text from wireframe
- **Accessibility**: All accessibility requirements from wireframe

### 5.3 Implement Platform Differences
If wireframe specifies iOS vs Android differences:
```typescript
import { Platform } from 'react-native';

// Example: iOS has text-based back button, Android has icon
const backButton = Platform.OS === 'ios'
  ? <Text>← Back</Text>
  : <Icon name="arrow-back" />;
```

### 5.4 Add Comments Linking to Docs
```typescript
// Implements: docs/user-journeys/onboarding/01-signup-and-onboarding.md (Step 1)
// Wireframe: docs/wireframes/01-welcome-screen.md
export default function WelcomeScreen() {
  // Component implementation...
}
```

---

## Step 6: Implement Services & API Integration

From user journey "Technical Requirements" section:

### 6.1 Create API Clients
```typescript
// From Journey #01 Technical Requirements:
// - POST /api/auth/signup
// - POST /api/auth/verify-otp
// - GET /api/metro-areas/by-zip/:zipCode
```

### 6.2 Implement Data Validations
Match exact validation rules from:
- User journey "Validation/Constraints" sections
- Wireframe "Form Validation" sections

### 6.3 Handle Error Cases
Implement all error scenarios from:
- User journey "Error & Edge Cases" table
- Wireframe "Error States" sections

---

## Step 7: Implement Navigation Flow

From user journey step-by-step flow:

### 7.1 Create Navigator
```typescript
// apps/mobile/src/navigation/OnboardingNavigator.tsx
// Follows flow from docs/user-journeys/onboarding/01-signup-and-onboarding.md

<Stack.Navigator>
  <Stack.Screen name="Welcome" component={WelcomeScreen} />
  <Stack.Screen name="SignupMethod" component={SignupMethodScreen} />
  <Stack.Screen name="ZipCodeEntry" component={ZipCodeEntryScreen} />
  <Stack.Screen name="MetroConfirmation" component={MetroConfirmationScreen} />
  <Stack.Screen name="Tutorial" component={TutorialScreen} />
  <Stack.Screen name="Home" component={HomeScreen} />
</Stack.Navigator>
```

### 7.2 Implement Transitions
Use animation specs from design system:
- Duration: 300ms
- Easing: Ease-in-out cubic bezier
- Direction: Slide in from right (forward), slide out to right (back)

---

## Step 8: Validation Against Documentation

Before marking implementation complete:

### 8.1 Screen-by-Screen Validation
For each screen, verify:
- [ ] Matches wireframe layout exactly
- [ ] All components from wireframe present
- [ ] All interactive states working
- [ ] Spacing matches design system (8pt grid)
- [ ] Colors match design system (exact hex values)
- [ ] Typography matches design system (sizes, weights)
- [ ] Platform-specific differences implemented
- [ ] Accessibility requirements met

### 8.2 Flow Validation
Walk through user journey:
- [ ] All steps from journey document work
- [ ] Navigation matches journey flow
- [ ] Alternative paths work (from "Alternative Paths" section)
- [ ] Error cases handled (from "Error & Edge Cases" section)
- [ ] Success state matches journey "Success State" section

### 8.3 Data Validation
- [ ] All required fields enforced
- [ ] All validation rules applied (character limits, formats, ranges)
- [ ] Error messages match wireframe specifications
- [ ] Data stored matches technical requirements

### 8.4 Edge Case Testing
Test all scenarios from journey "Error & Edge Cases":
- [ ] No internet connection
- [ ] Session timeout
- [ ] Validation errors
- [ ] API failures
- [ ] Duplicate data

---

## Step 9: Document Implementation

Create: `docs/implementation/[feature-name].md`

Include:
- **Files Created/Modified**: Complete list
- **Components Built**: Component tree
- **Deviations from Design**: Any intentional differences (with justification)
- **Known Issues**: TODOs, limitations, technical debt
- **Testing Notes**: How to test, edge cases to verify
- **Success Metrics**: How to track metrics from journey

---

## Step 10: Demo & Iterate

Show the user:
1. **Working Implementation**: Screen recording or live demo
2. **Side-by-Side Comparison**: Implementation vs wireframes
3. **Journey Walkthrough**: Complete user journey flow
4. **Validation Checklist**: What's been verified

ASK:
1. Does implementation match wireframes?
2. Any UX issues or refinements needed?
3. Are all edge cases handled appropriately?
4. Ready to commit or need iterations?

---

## Quality Checklist

Before marking feature as "complete":
- [ ] All documentation read and understood (feature spec, journey, wireframes, design system)
- [ ] Implementation plan created and approved
- [ ] Design tokens created from design system
- [ ] Shared components built from design system
- [ ] All screens implemented matching wireframes exactly
- [ ] All interactive states working (default, pressed, disabled, error, loading)
- [ ] All validation rules applied
- [ ] All error cases handled
- [ ] Navigation flow matches user journey
- [ ] Platform differences respected (iOS vs Android)
- [ ] Accessibility requirements met (WCAG AA)
- [ ] Code commented with doc references
- [ ] Implementation validated against docs
- [ ] Edge cases tested
- [ ] Implementation documented
- [ ] Demo'd to user and approved

---

## Common Pitfalls to Avoid

**❌ DON'T:**
1. Start coding before reading all documentation
2. Guess at colors, spacing, or typography (use design system tokens)
3. Implement a generic solution (follow exact wireframe specs)
4. Skip error states or edge cases
5. Ignore platform-specific differences
6. Hard-code values that should come from design system
7. Skip validation that's documented in wireframes
8. Forget accessibility requirements
9. Deviate from designs without explicit user approval

**✅ DO:**
1. Read feature spec, journey, wireframes, and design system FIRST
2. Create implementation plan and get approval
3. Build foundation (design tokens, shared components) first
4. Match wireframes pixel-perfect
5. Implement all interactive states
6. Handle all error and edge cases
7. Respect platform conventions
8. Add doc references in code comments
9. Validate against docs before marking complete
10. Demo to user and iterate based on feedback

---

## Integration with Other Skills

This skill should be used AFTER:
- `/design-feature` - Creates feature specification
- `/user-journey` - Creates user journey documentation
- `/wireframe` - Creates wireframe specifications

This skill is the final step that transforms design into working code.

---

## Example Usage

```
User: /implement-feature signup-and-onboarding