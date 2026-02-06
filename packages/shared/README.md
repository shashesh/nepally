# @unhn/shared

Shared TypeScript code for UNHN mobile and web applications.

## Structure

```
src/
├── api/          # API client functions (Firebase, etc.)
├── types/        # TypeScript interfaces and types
├── utils/        # Utility functions
├── validation/   # Zod validation schemas
├── constants/    # Constants (categories, trust levels, metro areas)
└── index.ts      # Main entry point
```

## Usage

### In Mobile App (React Native)

```typescript
import { PostCategory, housingPostSchema, formatDate } from '@unhn/shared';
```

### In Web App (Next.js)

```typescript
import { User, TrustLevel, getMetroAreaByZip } from '@unhn/shared';
```

## Development

```bash
# Build the package
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```

## Philosophy

This package contains ALL business logic and data structures that are shared between mobile and web apps. This includes:

- ✅ TypeScript types and interfaces
- ✅ Validation schemas (Zod)
- ✅ Utility functions (date formatting, phone formatting, etc.)
- ✅ Constants (post categories, trust levels, metro areas)
- ✅ API client functions (Firebase calls, etc.)

UI components are NOT shared (they're platform-specific).
