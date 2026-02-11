# NUSA Technical Stack

**Last Updated:** 2026-02-06

## Overview

NUSA uses a modern, JavaScript/TypeScript-based stack optimized for:
- 80% mobile usage (iOS and Android)
- 20% web usage with excellent SEO
- Fast development timeline (2-3 months MVP)
- Budget-friendly ($0-50/month for first 1-2K users)

## Architecture Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Mobile App** | React Native (Expo) | Native performance, you know JS/TS, fastest development |
| **Web App** | Next.js | Server-side rendering for SEO, same React as mobile |
| **Backend** | Supabase | Generous free tier, PostgreSQL, real-time, minimal DevOps |
| **Database** | PostgreSQL (Supabase) | Relational DB, ACID compliance, real-time subscriptions, scales well |
| **Auth** | Supabase Auth | Phone (SMS), email, social login, Row Level Security built-in |
| **File Storage** | Supabase Storage | Integrated auth, RLS policies, CDN, generous free tier |
| **Location** | Static ZIP Dataset | One-time setup, $0 cost, fast lookups |
| **Push Notifications** | FCM | Free unlimited, works everywhere |
| **Web Hosting** | Vercel | Free for hobby, automatic deployments, perfect for Next.js |
| **Mobile Builds** | Expo EAS | Free tier, automated iOS/Android builds |
| **Language** | TypeScript | Type safety, shared code between mobile/web |

## Frontend Architecture

### Mobile (React Native + Expo)
- **Framework:** React Native 0.74.1
- **Build Tool:** Expo 51.0
- **Navigation:** React Navigation
- **State Management:** React Context + Hooks
- **Styling:** StyleSheet (React Native)

### Web (Next.js)
- **Framework:** Next.js 14.2
- **Rendering:** Server-Side Rendering (SSR) + Static Site Generation (SSG)
- **Styling:** CSS Modules
- **SEO:** Built-in with Next.js Head component

### Code Sharing (70-80%)
- **Package:** `@nusa/shared` (TypeScript)
- **Contents:**
  - TypeScript types/interfaces
  - Validation schemas (Zod)
  - Utility functions (date, phone, ZIP formatting)
  - Business logic (trust level calculations, expiry logic)
  - Constants (post categories, metro areas, trust levels)

## Backend Architecture

### Supabase Services
1. **Authentication** - User login, phone verification, social logins
2. **PostgreSQL Database** - Relational database for users, posts, chats, metro areas
3. **Storage** - Photo uploads with Row Level Security
4. **Edge Functions** - Serverless backend logic:
   - Post expiry scheduled function
   - Emergency verification endpoint
   - Metro area lookup endpoint
5. **Database Triggers** - Automatic server-side logic:
   - User creation triggers
   - User deletion cleanup
6. **Real-time Subscriptions** - Live updates for chat and emergency alerts

### Database Structure (PostgreSQL)

```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL,
  name TEXT,
  metro_area_id TEXT,
  trust_level INTEGER DEFAULT 0,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- metro_areas table
CREATE TABLE metro_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT,
  zip_codes TEXT[] -- Array of ZIP codes
);

-- posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  metro_area_id TEXT REFERENCES metro_areas(id),
  expiry_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  fields JSONB, -- Category-specific data
  photos TEXT[], -- Array of photo URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Location Services

### ZIP to Metro Area Mapping
- **Source:** HUD USPS ZIP to County Crosswalk
- **Implementation:** Static dataset loaded into PostgreSQL metro_areas table
- **Cost:** $0 (no API calls)
- **Update Frequency:** Quarterly (manual)

## File Storage

### Supabase Storage
- **Usage:** All user-uploaded images (profile photos, post images, chat images)
- **Features:**
  - Integrated with Supabase Auth
  - Row Level Security policies for access control
  - CDN delivery via Supabase CDN
  - Image transformations available
- **Pricing:** Free tier (1GB storage, expandable to 100GB on paid plans)
- **Security:** Files protected by RLS policies, ensuring users can only access authorized content

## Push Notifications

### Firebase Cloud Messaging (FCM)
- **Platforms:** iOS, Android, Web
- **Features:**
  - Unlimited free push notifications
  - Topic-based messaging (for metro area alerts)
  - Direct messaging (for chat notifications)
- **Integration:** Built into mobile and web apps

## Hosting & Deployment

### Web App (Vercel)
- **URL:** https://nusa.app (custom domain)
- **Features:**
  - Automatic deployments from GitHub
  - Built-in CI/CD
  - Edge network for fast global access
- **Pricing:** Free for hobby projects

### Mobile Apps (Expo EAS)
- **Build Service:** Expo Application Services
- **Distribution:**
  - iOS: Apple App Store
  - Android: Google Play Store
- **Pricing:** Free tier (30 builds/month)

## Development Tools

### Version Control
- **Platform:** GitHub
- **Structure:** Monorepo (apps + packages)

### CI/CD
- **Web:** GitHub Actions + Vercel
- **Mobile:** Expo EAS Build

### Code Quality
- **Linting:** ESLint
- **Formatting:** Prettier
- **Type Checking:** TypeScript
- **Pre-commit Hooks:** Husky

### Testing (Future)
- **Unit Tests:** Jest
- **Component Tests:** React Testing Library
- **E2E Tests:** Cypress (web), Detox (mobile)

## Cost Breakdown

### Development (Months 1-3)
- **Supabase:** $0 (free tier - up to 50K monthly active users)
- **Vercel:** $0 (hobby plan)
- **Expo EAS:** $0 (free tier)
- **FCM:** $0 (free unlimited)
- **Total:** **$0/month**

### Production (1,000 - 10,000 Users)
- **Supabase:** $0-25/month (free tier covers up to 50K MAU, 500MB database, 1GB storage)
- **Vercel:** $0-20/month (likely free on hobby plan)
- **Expo EAS:** $0-40/month (free tier covers most needs)
- **FCM:** $0 (always free)
- **Total:** **$0-85/month** (significantly cheaper than Firebase at scale)

## Scalability

### Supabase Advantages
Supabase scales well for NUSA's needs:
1. **PostgreSQL** handles millions of rows efficiently with proper indexing
2. **Free tier** supports up to 50K monthly active users (vs Firebase's ~1K)
3. **Pricing** is more predictable and cheaper at scale
4. **Real-time** subscriptions work like Firebase Firestore listeners
5. **Row Level Security** provides fine-grained access control

### When to Scale Up
If you exceed 50K MAU or need more storage/bandwidth:
1. Upgrade to Supabase Pro ($25/month) - covers 100K MAU, 8GB database, 100GB storage
2. For 100K+ MAU, consider Supabase Team ($599/month) or custom enterprise plan
3. Keep FCM for push notifications (always free)

### Migration Path (If Needed)
If Supabase becomes too expensive (unlikely <500K users):
1. Self-host PostgreSQL on AWS/GCP
2. Keep Supabase Auth or migrate to Auth.js
3. Estimated effort: 1-2 months with 1-2 developers

## Why NOT Flutter?

Despite CLAUDE.md mentioning Flutter, it was eliminated because:
- ❌ **SEO terrible** - Flutter Web uses Canvas rendering, not HTML
- ❌ **Learning curve** - Would need to learn Dart
- ❌ **Web is second-class** - Flutter Web is immature
- ✅ **React Native + Next.js** - Leverages existing JS/TS skills, excellent SEO

## Security

### Authentication
- Phone verification (SMS OTP via Supabase Auth)
- Social login (Google, Facebook)
- JWT tokens (Supabase Auth automatic)

### Authorization
- Row Level Security (RLS) policies enforce trust levels
- PostgreSQL policies validate permissions at database level
- Edge Functions validate permissions server-side
- Client-side validation with Zod schemas

### Data Protection
- PII masking (emergency contact info hidden)
- Encrypted connections (HTTPS, WSS)
- RLS policies prevent unauthorized data access
- Storage RLS policies protect uploaded files

## Performance

### Mobile
- Native performance via React Native
- Offline support with Supabase local caching
- Image optimization with Supabase Storage
- Lazy loading of components

### Web
- Server-side rendering for fast first paint
- Static generation for frequently accessed pages
- Image optimization (Next.js Image component)
- Code splitting automatic with Next.js

## Monitoring (Future)

### Error Tracking
- Sentry (for crash reporting)

### Analytics
- PostHog (open-source, Supabase-friendly)
- Mixpanel (for product analytics)

### Performance
- Supabase Dashboard (database performance, API metrics)
- Vercel Analytics (web performance)

## References

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
