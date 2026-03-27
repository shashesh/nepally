---
name: shared-first-check
description: Validate that code follows shared-first architecture — no duplicated types, API logic, or constants between apps
---

# Shared-First Architecture Compliance Check

Run this after every `/implement-feature` and before marking any feature complete.

## Checks to Perform

### 1. Type Duplication
Search for `export interface` and `export type` in `apps/mobile/src/` and `apps/web/src/`. Any data model type (User, Post, Message, etc.) found there is a violation — should be in `packages/shared/src/types/`. Exception: platform-specific types (navigation params, StyleSheet types) can stay in `apps/`.

### 2. API Logic Placement
Search for `.from(`, `supabase.` in `apps/` (excluding Supabase client init files). Any Supabase query in `apps/` is a violation — should be in `packages/shared/src/api/` using dependency injection.

### 3. Validation Schema Placement
Search for `z.object`, `z.string`, `z.enum` in `apps/`. Data model validation should be in `packages/shared/src/validation/`.

### 4. Constant/Enum Duplication
Search for `export const` and `export enum` in both `apps/` and `packages/shared/`. Same name/value in multiple places is a violation.

### 5. Shared Package Purity
Search for imports from `react-native`, `expo-*`, `@react-native/*`, `next` in `packages/shared/src/`. Any found = violation.

### 6. @nusa/shared Import Usage
Verify apps actually import from `@nusa/shared`. Zero imports in an app with implemented features = violation.

### 7. Index.ts Exports
Read `packages/shared/src/index.ts` — modules in subdirectories that aren't re-exported = violation.

### 8. Unit Test Coverage
Find test files across workspaces. New/changed logic files without corresponding tests = violation.

## Report Format

```
SHARED-FIRST ARCHITECTURE COMPLIANCE REPORT

1. Type Duplication:        PASS | FAIL (N violations)
2. API Logic Placement:     PASS | FAIL (N violations)
3. Validation Placement:    PASS | FAIL (N violations)
4. Constants Duplication:   PASS | FAIL (N violations)
5. Shared Package Purity:   PASS | FAIL (N violations)
6. @nusa/shared Imports:    PASS | FAIL
7. Index.ts Exports:        PASS | FAIL (N missing)
8. Testing Compliance:      PASS | FAIL (N gaps)

OVERALL: COMPLIANT | NON-COMPLIANT

ACTIONS REQUIRED:
  1. [specific action with file paths]
```

For each violation, provide: what to move, where to move it, and what imports to update.
