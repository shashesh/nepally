---
name: shared-first-check
description: Validate that code follows shared-first architecture — no duplicated types, API logic, or constants between apps
---

# Shared-First Architecture Compliance Check

When the user invokes `/shared-first-check` or asks to validate shared-first compliance, perform this automated audit to ensure all non-UI code lives in `packages/shared/` and is properly consumed by both apps.

## Purpose

This skill catches violations of the shared-first architecture:
- Types/interfaces duplicated or defined in `apps/` instead of `packages/shared/`
- API query logic living in `apps/` instead of `packages/shared/src/api/`
- Validation schemas duplicated between platforms
- Constants/enums defined in more than one place
- `packages/shared/` importing platform-specific packages
- Missing unit tests for new/changed functionality

**Run this after every `/implement-feature` and before marking any feature complete.**

---

## Step 1: Check for Type Duplication

Search for TypeScript `interface` and `type` declarations across all workspaces:

```bash
# Find all type/interface definitions in apps/ that might belong in shared
grep -rn "export interface\|export type" apps/mobile/src/ apps/web/src/ --include="*.ts" --include="*.tsx"
grep -rn "export interface\|export type" packages/shared/src/ --include="*.ts"
```

**Violation**: Any `interface` or `type` defined in `apps/mobile/src/` or `apps/web/src/` that represents a data model (User, Post, Message, MetroArea, Conversation, etc.) should be in `packages/shared/src/types/`.

**Exception**: Platform-specific types (e.g., React Navigation param lists, RN StyleSheet types) can stay in `apps/`.

### Report Format
```
TYPE DUPLICATION CHECK:
✅ PASS | ❌ FAIL

Types in packages/shared/src/types/:
  - [list all exported interfaces/types]

Types in apps/mobile/src/ (potential violations):
  - [list with file paths and line numbers]
  - Verdict: VIOLATION (should be shared) or OK (platform-specific)

Types in apps/web/src/ (potential violations):
  - [list with file paths and line numbers]
  - Verdict: VIOLATION (should be shared) or OK (platform-specific)
```

---

## Step 2: Check for API Logic Duplication

Search for Supabase query calls in app directories:

```bash
# Find Supabase queries in apps/ (these should be in packages/shared/src/api/)
grep -rn "\.from(" apps/mobile/src/ apps/web/src/ --include="*.ts" --include="*.tsx"
grep -rn "supabase\." apps/mobile/src/ apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v "config/supabase\|lib/supabase"
```

**Violation**: Any Supabase `.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`, `.rpc()` call inside `apps/` directories (except for Supabase client initialization files).

**Expected**: All query logic in `packages/shared/src/api/` using dependency injection (accepting `SupabaseClient` as parameter).

### Report Format
```
API LOGIC CHECK:
✅ PASS | ❌ FAIL

Shared API functions (packages/shared/src/api/):
  - [list all exported functions]

API calls in apps/mobile/src/ (violations):
  - [file:line] — [function name] — supabase.from('table')...
  - Should be moved to: packages/shared/src/api/[module].ts

API calls in apps/web/src/ (violations):
  - [file:line] — [function name] — supabase.from('table')...
```

---

## Step 3: Check for Validation Schema Duplication

Search for Zod schemas and manual validation logic:

```bash
# Find Zod schemas in apps/ (should be in packages/shared/src/validation/)
grep -rn "z\.object\|z\.string\|z\.number\|z\.enum\|z\.array" apps/mobile/src/ apps/web/src/ --include="*.ts" --include="*.tsx"

# Find manual validation functions in apps/
grep -rn "validate\|isValid" apps/mobile/src/ apps/web/src/ --include="*.ts" --include="*.tsx"
```

**Violation**: Any Zod schema or validation function in `apps/` that validates data models (not UI-specific validation like "is form dirty?").

### Report Format
```
VALIDATION CHECK:
✅ PASS | ❌ FAIL

Shared schemas (packages/shared/src/validation/):
  - [list all exported schemas]

Validation in apps/mobile/src/ (potential violations):
  - [file:line] — [schema/function name]

Validation in apps/web/src/ (potential violations):
  - [file:line] — [schema/function name]
```

---

## Step 4: Check for Constant/Enum Duplication

Search for constants and enums that appear in multiple places:

```bash
# Find constant/enum definitions across workspaces
grep -rn "export const\|export enum" apps/mobile/src/ apps/web/src/ packages/shared/src/ --include="*.ts" | grep -v "StyleSheet\|styles\|navigation\|component"
```

**Violation**: Same constant name or value defined in both `apps/` and `packages/shared/`, or defined in `apps/` when it should be in shared.

### Report Format
```
CONSTANTS CHECK:
✅ PASS | ❌ FAIL

Shared constants (packages/shared/src/constants/):
  - [list all exported constants/enums]

Duplicated or misplaced constants:
  - [constant name] defined in [file1] AND [file2]
  - Should be: single definition in packages/shared/src/constants/
```

---

## Step 5: Check Shared Package Purity

Verify `packages/shared/` has no platform-specific imports:

```bash
# Check for forbidden imports in shared package
grep -rn "from 'react-native'\|from 'expo-\|from 'next\|from '@react-native\|from 'react-native-" packages/shared/src/ --include="*.ts"
```

**Violation**: Any import from `react-native`, `expo-*`, `@react-native/*`, or `next` in `packages/shared/`.

### Report Format
```
SHARED PURITY CHECK:
✅ PASS | ❌ FAIL

Forbidden imports found:
  - [file:line] — import ... from 'react-native'
  - Action: Move this code to apps/mobile/ or apps/web/
```

---

## Step 6: Check @nusa/shared Import Usage

Verify that apps actually import from the shared package:

```bash
# Check that apps use @nusa/shared
grep -rn "@nusa/shared" apps/mobile/src/ --include="*.ts" --include="*.tsx"
grep -rn "@nusa/shared" apps/web/src/ --include="*.ts" --include="*.tsx"
```

**Violation**: Zero imports from `@nusa/shared` in an app that has implemented features.

### Report Format
```
IMPORT USAGE CHECK:
✅ PASS | ❌ FAIL

apps/mobile/ imports from @nusa/shared:
  - [count] files import from @nusa/shared
  - [list files]

apps/web/ imports from @nusa/shared:
  - [count] files import from @nusa/shared
  - [list files]
```

---

## Step 7: Check shared/src/index.ts Exports

Verify that all shared modules are properly exported:

```bash
# Read the barrel file
cat packages/shared/src/index.ts
```

**Violation**: Modules exist in `packages/shared/src/` subdirectories but aren't re-exported from `index.ts`.

---

## Step 8: Check Unit Test Presence and Coverage Commands

Verify that newly added or changed logic has nearby unit tests and that coverage commands exist:

```bash
# Find test files across workspaces
find packages/shared/src apps/web/src apps/mobile/src -type f \( -name "*.test.ts" -o -name "*.test.tsx" \)

# Verify coverage scripts exist
cat package.json
cat packages/shared/package.json
cat apps/web/package.json
cat apps/mobile/package.json
```

**Violation**:
- New/changed logic files have no corresponding test files in the same area.
- Workspace `test:coverage` script missing.

### Report Format
```
TESTING COMPLIANCE CHECK:
✅ PASS | ❌ FAIL

Changed/new logic files without tests:
  - [file path]

Coverage scripts:
  - root/package/workspace scripts present: YES/NO
```

---

## Final Summary Report

Present a consolidated report:

```
═══════════════════════════════════════════════
  SHARED-FIRST ARCHITECTURE COMPLIANCE REPORT
═══════════════════════════════════════════════

1. Type Duplication:        ✅ PASS | ❌ FAIL ([count] violations)
2. API Logic Placement:     ✅ PASS | ❌ FAIL ([count] violations)
3. Validation Placement:    ✅ PASS | ❌ FAIL ([count] violations)
4. Constants Duplication:   ✅ PASS | ❌ FAIL ([count] violations)
5. Shared Package Purity:   ✅ PASS | ❌ FAIL ([count] violations)
6. @nusa/shared Imports:    ✅ PASS | ❌ FAIL
7. Index.ts Exports:        ✅ PASS | ❌ FAIL ([count] missing)
8. Testing Compliance:      ✅ PASS | ❌ FAIL ([count] gaps)

OVERALL: ✅ COMPLIANT | ❌ NON-COMPLIANT

ACTIONS REQUIRED:
  1. [specific action with file paths]
  2. [specific action with file paths]
  ...
```

---

## Remediation Guidance

For each violation found, provide specific instructions:

### Type Violations
```
Move: apps/mobile/src/services/api/posts.ts → interface Post
  To: packages/shared/src/types/post.ts
  Then: import { Post } from '@nusa/shared' in apps/mobile/
```

### API Logic Violations
```
Move: apps/mobile/src/services/api/posts.ts → getPostsByMetroArea()
  To: packages/shared/src/api/posts.ts (add SupabaseClient param)
  Then: Create hook in apps/mobile/src/hooks/usePosts.ts that calls shared function
```

### Validation Violations
```
Move: apps/mobile/src/utils/validation.ts → validateZipCode()
  To: Use existing packages/shared/src/utils/zip.ts → isValidZipCode()
  Then: import { isValidZipCode } from '@nusa/shared'
```

---

## When to Run This Skill

- **After every `/implement-feature`** — before marking the feature as complete
- **During code review** — to catch shared-first violations
- **Periodically** — as a health check on architecture compliance
- **Before major releases** — to ensure no drift has occurred
