---
name: implement-feature
description: Implement features with full context from specs, journeys, and wireframes
---

# Feature Implementation Skill

When the user invokes `/implement-feature [feature-name]` or asks to implement a feature, follow this context-first approach to ensure you build exactly what's been designed.

## CRITICAL PRINCIPLES

### Context Before Code
**NEVER start coding without gathering full context from:**
1. Feature specification (if exists)
2. User journey documentation
3. Wireframe specifications
4. Design system foundation
5. Code sharing guide and monorepo structure

**Coding without context leads to misalignment, rework, and wasted effort.**

### Shared-First Architecture (MANDATORY)
**Golden Rule: Share business logic, keep UI separate.**

This is a cross-platform monorepo. ALL non-UI code MUST live in `packages/shared/` so both `apps/mobile/` and `apps/web/` consume a single source of truth.

**Code Placement Decision Tree:**
```
Is it a UI component, screen, or page?
  YES → apps/mobile/ (React Native) or apps/web/ (Next.js)
Does it use platform-specific APIs (AsyncStorage, react-native, next/router)?
  YES → apps/mobile/ or apps/web/
Everything else → packages/shared/
```

**NEVER define types, validation schemas, API query functions, utility functions, or constants inside `apps/mobile/` or `apps/web/`. These ALWAYS go in `packages/shared/`.**

### Tests Are Mandatory (NON-NEGOTIABLE)
For every new functionality or behavior change, add/update unit tests in the same implementation.
- Shared logic changes → tests in `packages/shared/src/**/*.test.ts`
- Web logic changes → tests in `apps/web/src/**/*.test.ts(x)`
- Mobile logic changes → tests in `apps/mobile/src/**/*.test.ts(x)`

Do not mark a feature complete until:
1. Relevant workspace tests pass
2. Workspace coverage command passes
3. Monorepo test and coverage commands pass

---

## Step 0: Identify the Feature

ASK these questions:
1. **Feature Name:** What feature are we implementing? (e.g., "signup-and-onboarding", "housing-post-creation")
2. **Platform:** Mobile (React Native), Web (Next.js), or Both? **(Default: Both)**
3. **Scope:** Full feature or specific screens/components?
4. **Related Journey:** Which user journey number does this implement? (e.g., Journey #01)

**IMPORTANT — Platform answer drives implementation:**
- **Both** (default): Implement shared layer in `packages/shared/` FIRST, then mobile UI in `apps/mobile/`, then web UI in `apps/web/`
- **Mobile only**: STILL implement types, API calls, validation, utils, constants in `packages/shared/` — only the UI layer goes in `apps/mobile/`
- **Web only**: STILL implement types, API calls, validation, utils, constants in `packages/shared/` — only the UI layer goes in `apps/web/`

**Regardless of platform answer, all non-UI code goes in `packages/shared/`.**

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

### 1.5 Read Code Sharing Guide (MANDATORY)
Always read: `docs/code-sharing-guide.md`

Extract:
- What MUST go in `packages/shared/` (types, API calls, validation, utils, constants)
- What stays platform-specific (UI components, navigation, platform APIs)
- API function pattern (dependency injection with Supabase client parameter)
- Import rules (`@nusa/shared` imports only)

### 1.6 Read Monorepo Structure
Always read: `docs/monorepo-structure.md`

Extract:
- Package boundaries and build order
- Import rules between workspaces
- Existing shared exports (check `packages/shared/src/index.ts` to avoid duplication)

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
- **Shared Components**: Reusable UI elements per platform (e.g., PrimaryButton, TextInput, TrustBadge)
- **Shared Logic (packages/shared)**: Types, API functions, validation schemas, utils, constants
- **Services**: Platform-specific client initialization only (Supabase client config)
- **Navigation**: Route definitions, stack navigators (platform-specific)
- **State Management**: Context providers, hooks (may wrap shared API functions)
- **Types**: ALL TypeScript interfaces go in `packages/shared/src/types/` — NEVER in `apps/`

### 2.3 Define File Structure

**ALWAYS start with shared package, then platform-specific code:**

```
packages/shared/src/
├── types/              ← ALL interfaces & type definitions
│   ├── user.ts
│   ├── post.ts
│   └── [feature].ts
├── api/                ← ALL Supabase query logic (accepts client param)
│   ├── posts.ts
│   ├── users.ts
│   └── [feature].ts
├── validation/         ← ALL Zod schemas
│   ├── housing.ts
│   └── [feature].ts
├── utils/              ← ALL platform-agnostic helpers
│   ├── date.ts
│   ├── phone.ts
│   └── zip.ts
├── constants/          ← ALL enums, config objects
│   ├── postCategories.ts
│   └── trustLevels.ts
└── index.ts            ← Re-exports everything

apps/mobile/src/        ← React Native UI ONLY
├── screens/            ← RN screen components (import from @nusa/shared)
│   └── onboarding/
├── components/         ← RN UI components (buttons, inputs, cards)
│   ├── buttons/
│   └── inputs/
├── navigation/         ← React Navigation stacks/tabs
├── hooks/              ← RN hooks (wrap shared API functions)
├── config/             ← Platform-specific config (Supabase client w/ AsyncStorage)
│   └── supabase.ts
└── styles/             ← RN StyleSheet (can import shared color values)

apps/web/src/           ← Next.js UI ONLY
├── pages/              ← Next.js pages (import from @nusa/shared)
├── components/         ← React components (buttons, inputs, cards)
├── hooks/              ← Web hooks (wrap shared API functions)
├── lib/                ← Platform-specific config (Supabase client w/ localStorage)
│   └── supabase.ts
└── styles/             ← CSS/Tailwind
```

**RED FLAGS — If you see these in your plan, STOP and restructure:**
- Types/interfaces defined in `apps/mobile/src/types/` or `apps/web/src/types/`
- API query logic in `apps/mobile/src/services/api/` or `apps/web/src/lib/api/`
- Validation schemas in app directories instead of `packages/shared/src/validation/`
- Same constant/enum defined in more than one place

### 2.4 Implementation Order
Determine build order (shared-first, bottom-up approach):
1. **Shared Types**: Define all interfaces in `packages/shared/src/types/`
2. **Shared Validation**: Create Zod schemas in `packages/shared/src/validation/`
3. **Shared API Functions**: Supabase query logic in `packages/shared/src/api/` (dependency injection pattern)
4. **Shared Utils/Constants**: Platform-agnostic helpers and enums in `packages/shared/src/utils/` and `constants/`
5. **Export from shared index**: Update `packages/shared/src/index.ts` with all new exports
6. **Mobile Foundation**: Design tokens (colors, typography, spacing) — platform-specific styling
7. **Mobile UI Components**: Buttons, inputs, cards (importing types from `@nusa/shared`)
8. **Mobile Hooks**: Custom hooks wrapping shared API functions
9. **Mobile Screens**: Individual screens following wireframes
10. **Mobile Navigation**: Connect screens in proper flow
11. **Web Foundation**: Design tokens (CSS/Tailwind) — platform-specific styling
12. **Web UI Components**: React components (importing types from `@nusa/shared`)
13. **Web Pages**: Next.js pages following wireframes
14. **Integration**: End-to-end testing of user journey on BOTH platforms

### 2.5 Validation Checklist
Create checklist to verify implementation matches docs:
- [ ] All types/interfaces defined in `packages/shared/src/types/`
- [ ] All API query logic defined in `packages/shared/src/api/` (not in apps/)
- [ ] All validation schemas defined in `packages/shared/src/validation/`
- [ ] All utils/constants defined in `packages/shared/` (not duplicated in apps/)
- [ ] `packages/shared/src/index.ts` exports all new code
- [ ] Mobile app imports from `@nusa/shared` (no local type/API/validation redefinition)
- [ ] Web app imports from `@nusa/shared` (no local type/API/validation redefinition)
- [ ] All wireframe screens implemented (mobile and/or web per platform scope)
- [ ] All interactive states working (default, pressed, disabled, error, loading)
- [ ] All validation rules from journey applied
- [ ] All error cases from journey handled
- [ ] Unit tests added/updated for every new or changed functionality
- [ ] Workspace tests pass (`npm run test --workspace=<workspace>`)
- [ ] Workspace coverage passes (`npm run test:coverage --workspace=<workspace>`)
- [ ] Design system colors/typography/spacing used correctly
- [ ] Platform-specific differences respected (iOS vs Android, desktop vs mobile web)
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

## Step 4: Implement Shared Layer First (MANDATORY)

Before writing ANY platform-specific code, build the shared foundation that both apps will consume.

### 4.0 Shared Types
Define all data model interfaces in `packages/shared/src/types/`:

```typescript
// packages/shared/src/types/[feature].ts
// Types use snake_case matching Supabase database column names
export interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  author_id: string;
  metro_area_id: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'flagged';
}
```

### 4.0b Shared API Functions
Define all Supabase query logic in `packages/shared/src/api/` using dependency injection:

```typescript
// packages/shared/src/api/posts.ts
import { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '../types/post';

export async function getPostsByMetro(
  supabase: SupabaseClient,
  metroId: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('metro_area_id', metroId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

### 4.0c Shared Validation
Define all Zod schemas in `packages/shared/src/validation/`:

```typescript
// packages/shared/src/validation/[feature].ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(5).max(100),
  content: z.string().min(10).max(2000),
  category: z.enum(['housing', 'jobs', 'emergency', 'travel']),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;
```

### 4.0d Update Shared Exports
Always update `packages/shared/src/index.ts` to re-export new modules:

```typescript
// packages/shared/src/index.ts
export * from './types/post';
export * from './api/posts';
export * from './validation/post';
```

### 4.0e Add Tests Alongside Implementation
As each layer is implemented, add or update tests immediately:
- Shared (`types/api/validation/utils/constants`) → targeted unit tests with mocked dependencies.
- Web/Mobile hooks and contexts → unit tests for loading, success, and error states.
- Service modules (auth/location/storage/etc.) → unit tests with platform/API mocks.

Run tests after each meaningful batch to prevent regressions from stacking.

### 4.1 Design Tokens (Platform-Specific)
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

### 6.1 Platform-Specific Supabase Client
Each platform initializes its own Supabase client (this is the ONLY platform-specific API code):

```typescript
// apps/mobile/src/config/supabase.ts — Uses AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage },
});

// apps/web/src/lib/supabase.ts — Uses localStorage (default)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 6.2 Platform Hooks Wrap Shared API Functions
Mobile and web hooks import from `@nusa/shared` and pass their platform-specific client:

```typescript
// apps/mobile/src/hooks/usePosts.ts
import { getPostsByMetro } from '@nusa/shared';
import { supabase } from '../config/supabase';

export function usePosts(metroId: string) {
  // Pass mobile Supabase client to shared API function
  return useQuery(['posts', metroId], () => getPostsByMetro(supabase, metroId));
}

// apps/web/src/hooks/usePosts.ts — Same pattern, different client
import { getPostsByMetro } from '@nusa/shared';
import { supabase } from '../lib/supabase';
```

### 6.3 Use Shared Validation
```typescript
// In any platform's form component:
import { createPostSchema } from '@nusa/shared';

const result = createPostSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
}
```

### 6.4 Handle Error Cases
Implement all error scenarios from:
- User journey "Error & Edge Cases" table
- Wireframe "Error States" sections

**NEVER duplicate Supabase query logic in `apps/mobile/src/services/api/` or `apps/web/src/lib/api/`. All queries go in `packages/shared/src/api/`.**

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

### Shared-First Compliance (CHECK FIRST)
- [ ] ALL types/interfaces are in `packages/shared/src/types/` (NONE in `apps/`)
- [ ] ALL API query functions are in `packages/shared/src/api/` (NONE in `apps/`)
- [ ] ALL validation schemas are in `packages/shared/src/validation/` (NONE in `apps/`)
- [ ] ALL platform-agnostic utils are in `packages/shared/src/utils/` (NONE duplicated in `apps/`)
- [ ] ALL constants/enums are in `packages/shared/src/constants/` (NONE duplicated in `apps/`)
- [ ] `packages/shared/src/index.ts` re-exports all new code
- [ ] `packages/shared/` has ZERO imports from `react-native`, `expo-*`, or `next`
- [ ] `apps/mobile/` imports types, API, validation from `@nusa/shared`
- [ ] `apps/web/` imports types, API, validation from `@nusa/shared` (if web is in scope)
- [ ] No type/function/constant defined in more than one place

### Documentation & Context
- [ ] All documentation read and understood (feature spec, journey, wireframes, design system, code-sharing-guide)
- [ ] Implementation plan created and approved

### Mobile Implementation
- [ ] Design tokens created from design system
- [ ] UI components built from design system
- [ ] All screens implemented matching wireframes exactly
- [ ] All interactive states working (default, pressed, disabled, error, loading)
- [ ] All validation rules applied (using shared Zod schemas)
- [ ] All error cases handled
- [ ] Navigation flow matches user journey
- [ ] Platform differences respected (iOS vs Android)
- [ ] Accessibility requirements met (WCAG AA)
- [ ] Code commented with doc references

### Web Implementation (if in scope)
- [ ] Next.js pages created for all screens
- [ ] Responsive layout implemented (desktop + mobile web)
- [ ] Shared types, API, validation imported from `@nusa/shared`
- [ ] All interactive states working
- [ ] Accessibility requirements met

### Final Validation
- [ ] Implementation validated against wireframes
- [ ] Edge cases tested
- [ ] Implementation documented
- [ ] Demo'd to user and approved

---

## Common Pitfalls to Avoid

**❌ DON'T:**
1. Start coding before reading all documentation (including code-sharing-guide.md)
2. Define types/interfaces inside `apps/mobile/` or `apps/web/` — they belong in `packages/shared/`
3. Write Supabase query logic inside `apps/` directories — it belongs in `packages/shared/src/api/`
4. Duplicate validation schemas — use shared Zod schemas from `packages/shared/src/validation/`
5. Define the same constant, enum, or utility in more than one place
6. Import from `react-native`, `expo-*`, or `next` inside `packages/shared/`
7. Build only mobile UI when the feature should work on both platforms
8. Guess at colors, spacing, or typography (use design system tokens)
9. Skip error states or edge cases
10. Hard-code values that should come from design system or shared constants
11. Forget to update `packages/shared/src/index.ts` with new exports
12. Deviate from designs without explicit user approval

**✅ DO:**
1. Read feature spec, journey, wireframes, design system, AND code-sharing-guide FIRST
2. Build `packages/shared/` layer FIRST (types → API → validation → utils → constants)
3. Export everything from `packages/shared/src/index.ts`
4. Import from `@nusa/shared` in both `apps/mobile/` and `apps/web/`
5. Use dependency injection for API functions (pass Supabase client as parameter)
6. Use snake_case for shared types matching Supabase DB columns
7. Implement mobile UI AND web UI (unless explicitly scoped to one platform)
8. Match wireframes pixel-perfect per platform
9. Implement all interactive states and error cases
10. Run `/shared-first-check` before marking feature complete
11. Demo to user and iterate based on feedback

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