# ADR: Shared Types Use snake_case Matching Supabase

**Date:** 2026-02-16  
**Status:** Accepted  
**Category:** Architecture / Type System

## Context

The `packages/shared/src/types/` directory originally defined interfaces using camelCase (e.g., `authorId`, `metroAreaId`, `expiryDate`). Meanwhile, the mobile app independently defined its own types using snake_case (e.g., `author_id`, `metro_area_id`, `expiry_date`) to match Supabase database column names.

This divergence meant the shared types were unusable — the mobile app couldn't import them because the property names didn't match what Supabase actually returned. As a result, the mobile app defined its own parallel type system and never imported from `@nepally/shared`.

## Decision

**All shared types in `packages/shared/src/types/` MUST use snake_case matching Supabase database column names.**

### Rationale

1. **Supabase returns snake_case** — Both mobile and web receive data directly from Supabase with snake_case property names (`author_id`, `created_at`, etc.)
2. **Zero-cost sharing** — If shared types match the Supabase response shape, both apps can use them directly without a mapping/transformation layer
3. **Eliminates divergence** — A single type definition serves both platforms and the database schema
4. **Convention over configuration** — snake_case for data types is unambiguous: "this is a Supabase row shape"

### Examples

```typescript
// ✅ CORRECT — matches Supabase columns
export interface Post {
  id: string;
  author_id: string;
  metro_area_id: string;
  created_at: string;
  expiry_date: string;
}

// ❌ WRONG — doesn't match Supabase response
export interface Post {
  id: string;
  authorId: string;
  metroAreaId: string;
  createdAt: Date;
  expiryDate: Date;
}
```

### Exceptions

- **Computed/derived fields** that don't come from the database can use camelCase
- **UI-specific types** (navigation params, component props) in `apps/` can use camelCase
- **Zod schema field names** should also match snake_case database columns

## Consequences

- Existing shared types in `packages/shared/src/types/` need to be migrated from camelCase to snake_case
- Date fields should be typed as `string` (ISO format from Supabase) rather than `Date`
- Apps may create local camelCase wrappers if needed for UI, but the shared types are the source of truth
