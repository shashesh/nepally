# Code Sharing Guide

This guide explains what code should be shared between mobile and web apps, and what should stay platform-specific.

## Philosophy

**Golden Rule:** Share business logic, keep UI separate.

- ✅ **Share:** Types, validation, API calls, utilities, constants
- ❌ **Don't share:** UI components, navigation, styling

## What Goes in `packages/shared`

### 1. TypeScript Types and Interfaces

**Location:** `packages/shared/src/types/`

**Examples:**
```typescript
// types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  metroAreaId: string;
  trustLevel: TrustLevel;
}

// types/post.ts
export interface Post {
  id: string;
  category: PostCategory;
  title: string;
  // ...
}
```

**Why shared:**
- Ensures type safety across platforms
- Single source of truth for data structures
- Prevents mobile/web drift

### 2. Validation Schemas (Zod)

**Location:** `packages/shared/src/validation/`

**Examples:**
```typescript
// validation/housing.ts
import { z } from 'zod';

export const housingPostSchema = z.object({
  title: z.string().min(10).max(100),
  rentAmount: z.number().min(0).max(10000),
  roomType: z.enum(['private', 'shared', 'entire-place']),
  // ...
});

export type HousingPostInput = z.infer<typeof housingPostSchema>;
```

**Usage in apps:**
```typescript
// Mobile or web
import { housingPostSchema } from '@nusa/shared';

const result = housingPostSchema.safeParse(formData);
if (!result.success) {
  console.error(result.error);
}
```

**Why shared:**
- Same validation rules on mobile and web
- Backend can also use same schemas
- Reduces duplication and bugs

### 3. Utility Functions

**Location:** `packages/shared/src/utils/`

**Examples:**
```typescript
// utils/date.ts
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  // ...
}

// utils/phone.ts
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}
```

**Why shared:**
- Consistent formatting across platforms
- Reusable pure functions
- Easy to test

### 4. Constants

**Location:** `packages/shared/src/constants/`

**Examples:**
```typescript
// constants/postCategories.ts
export enum PostCategory {
  HOUSING = 'housing',
  JOBS = 'jobs',
  EMERGENCY = 'emergency',
  TRAVEL = 'travel',
}

export const POST_CATEGORIES = {
  [PostCategory.HOUSING]: {
    name: 'Housing',
    expiryDays: 30,
    maxPhotos: 10,
  },
  // ...
};
```

**Why shared:**
- Single source of truth
- No magic strings/numbers
- Easy to update everywhere

### 5. API Client Functions (Future)

**Location:** `packages/shared/src/api/`

**Examples:**
```typescript
// api/posts.ts
import { supabase } from './client';

export async function createPost(data: CreatePostInput): Promise<Post> {
  const { data: post, error } = await supabase
    .from('posts')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return post;
}

export async function getPostsByMetro(metroId: string): Promise<Post[]> {
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

**Why shared:**
- Same API calls on mobile and web
- Centralized data fetching logic
- Easy to mock for testing

### 6. Business Logic

**Location:** `packages/shared/src/utils/` or `packages/shared/src/logic/`

**Examples:**
```typescript
// logic/trustLevel.ts
export function calculateTrustLevel(user: User): TrustLevel {
  if (user.phoneVerified || user.facebookVerified) {
    return TrustLevel.VERIFIED;
  }

  if (user.helpfulVotesReceived >= 50 && user.postsCount >= 10) {
    return TrustLevel.CONTRIBUTOR;
  }

  return TrustLevel.NEW;
}

// logic/postExpiry.ts
export function isExpired(post: Post): boolean {
  return new Date() > post.expiryDate;
}

export function calculateExpiryDate(category: PostCategory): Date {
  const now = new Date();
  const days = POST_CATEGORIES[category].expiryDays;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
```

**Why shared:**
- Consistent behavior across platforms
- Business rules in one place
- Testable without UI

## What Does NOT Go in Shared

### 1. UI Components

**❌ Don't share:**
```typescript
// ❌ packages/shared/src/components/Button.tsx
export function Button({ title, onPress }) {
  return <button onClick={onPress}>{title}</button>;
}
```

**Why:** React Native and React have different components (`TouchableOpacity` vs `button`).

**✅ Instead:** Create separate components in each app:
```typescript
// apps/mobile/src/components/Button.tsx (React Native)
export function Button({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}

// apps/web/src/components/Button.tsx (React)
export function Button({ title, onPress }) {
  return <button onClick={onPress}>{title}</button>;
}
```

### 2. Navigation

**❌ Don't share:**
```typescript
// Navigation is platform-specific
// Mobile: React Navigation
// Web: Next.js routing (file-based)
```

**Why:** Different navigation patterns and APIs.

### 3. Styling

**❌ Don't share:**
```typescript
// Mobile: StyleSheet.create()
// Web: CSS Modules
```

**Why:** Different styling systems.

### 4. Platform-Specific Features

**❌ Don't share:**
```typescript
// Camera, push notifications, geolocation, etc.
// These use different APIs on mobile vs web
```

**✅ Instead:** Create platform-specific wrappers.

## Code Sharing Patterns

### Pattern 1: Shared Logic + Platform UI

**Shared logic:**
```typescript
// packages/shared/src/validation/housing.ts
export const housingPostSchema = z.object({
  title: z.string().min(10).max(100),
  rentAmount: z.number().min(0),
  // ...
});
```

**Mobile UI:**
```typescript
// apps/mobile/src/screens/CreateHousingPost.tsx
import { housingPostSchema } from '@nusa/shared';

export function CreateHousingPost() {
  const [formData, setFormData] = useState({});

  const handleSubmit = () => {
    const result = housingPostSchema.safeParse(formData);
    if (!result.success) {
      // Show errors (React Native UI)
      Alert.alert('Error', result.error.message);
      return;
    }
    // Submit post
  };

  return (
    <View>
      <TextInput placeholder="Title" onChangeText={...} />
      {/* More fields */}
    </View>
  );
}
```

**Web UI:**
```typescript
// apps/web/src/pages/posts/create/housing.tsx
import { housingPostSchema } from '@nusa/shared';

export default function CreateHousingPost() {
  const [formData, setFormData] = useState({});

  const handleSubmit = () => {
    const result = housingPostSchema.safeParse(formData);
    if (!result.success) {
      // Show errors (React UI)
      alert(result.error.message);
      return;
    }
    // Submit post
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Title" onChange={...} />
      {/* More fields */}
    </form>
  );
}
```

### Pattern 2: Shared API + Platform Hooks

**Shared API:**
```typescript
// packages/shared/src/api/posts.ts
export async function getPostsByMetro(metroId: string): Promise<Post[]> {
  // Supabase query
}
```

**Mobile hook:**
```typescript
// apps/mobile/src/hooks/usePosts.ts
import { getPostsByMetro } from '@nusa/shared';

export function usePosts(metroId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPostsByMetro(metroId).then(setPosts).finally(() => setLoading(false));
  }, [metroId]);

  return { posts, loading };
}
```

**Web hook:**
```typescript
// apps/web/src/hooks/usePosts.ts
import { getPostsByMetro } from '@nusa/shared';

// Same implementation as mobile!
export function usePosts(metroId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPostsByMetro(metroId).then(setPosts).finally(() => setLoading(false));
  }, [metroId]);

  return { posts, loading };
}
```

## Decision Tree

When writing code, ask:

```
Does this code contain UI/styling?
├─ YES → Keep it in apps/mobile or apps/web
└─ NO → Ask: Is this logic reusable?
   ├─ YES → Put it in packages/shared
   └─ NO → Keep it in the app that needs it
```

## Common Scenarios

### Scenario: Creating a new post form

1. **Shared:**
   - Validation schema (`packages/shared/src/validation/`)
   - Post type (`packages/shared/src/types/`)
   - API call to create post (`packages/shared/src/api/`)

2. **Mobile-specific:**
   - Form UI with React Native components
   - Image picker for photos
   - Navigation after submit

3. **Web-specific:**
   - Form UI with HTML/React
   - File upload input
   - Next.js redirect after submit

### Scenario: Displaying a list of posts

1. **Shared:**
   - Post type (`packages/shared/src/types/`)
   - API call to fetch posts (`packages/shared/src/api/`)
   - Date formatting (`packages/shared/src/utils/date.ts`)

2. **Mobile-specific:**
   - FlatList component
   - Pull-to-refresh
   - TouchableOpacity for post items

3. **Web-specific:**
   - Div/ul/li for list
   - Infinite scroll
   - Link for post items

### Scenario: User authentication

1. **Shared:**
   - User type (`packages/shared/src/types/`)
   - Validation schemas for sign-up (`packages/shared/src/validation/`)

2. **Mobile-specific:**
   - React Native form UI
   - Supabase Auth integration (mobile SDK)
   - AsyncStorage for session

3. **Web-specific:**
   - HTML form UI
   - Supabase Auth integration (web SDK)
   - Cookie/localStorage for session

## Testing Shared Code

Shared code should be tested independently:

```typescript
// packages/shared/src/utils/date.test.ts
import { formatRelativeTime } from './date';

describe('formatRelativeTime', () => {
  it('returns "just now" for recent dates', () => {
    const date = new Date(Date.now() - 30000); // 30 seconds ago
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60000); // 5 minutes ago
    expect(formatRelativeTime(date)).toBe('5m ago');
  });
});
```

## Best Practices

1. **Keep shared package pure**
   - No React Native or React DOM imports
   - No platform-specific APIs
   - Only TypeScript, Node.js built-ins, and cross-platform libraries (Zod, etc.)

2. **Document what you share**
   - Add JSDoc comments to exported functions
   - Explain why something is shared

3. **Version carefully**
   - Breaking changes in shared package affect both apps
   - Test both mobile and web after changes

4. **Avoid premature abstraction**
   - If code is only used in one app, keep it there
   - Only move to shared when actually reused

## Resources

- [Zod Documentation](https://zod.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [npm Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
