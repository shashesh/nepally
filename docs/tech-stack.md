# UNHN Technical Stack

**Last Updated:** 2026-02-06

## Overview

UNHN uses a modern, JavaScript/TypeScript-based stack optimized for:
- 80% mobile usage (iOS and Android)
- 20% web usage with excellent SEO
- Fast development timeline (2-3 months MVP)
- Budget-friendly ($0-50/month for first 1-2K users)

## Architecture Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Mobile App** | React Native (Expo) | Native performance, you know JS/TS, fastest development |
| **Web App** | Next.js | Server-side rendering for SEO, same React as mobile |
| **Backend** | Firebase | Free tier, real-time chat, fastest to build, no DevOps |
| **Database** | Firestore | NoSQL, real-time, offline support, scales automatically |
| **Auth** | Firebase Auth | Phone (SMS), email, social login built-in |
| **File Storage** | Cloudinary | Image optimization, CDN, generous free tier |
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
- **Package:** `@unhn/shared` (TypeScript)
- **Contents:**
  - TypeScript types/interfaces
  - Validation schemas (Zod)
  - Utility functions (date, phone, ZIP formatting)
  - Business logic (trust level calculations, expiry logic)
  - Constants (post categories, metro areas, trust levels)

## Backend Architecture

### Firebase Services
1. **Authentication** - User login, phone verification
2. **Firestore** - NoSQL database for users, posts, chats
3. **Cloud Storage** - Photo uploads (fallback to Cloudinary)
4. **Cloud Functions** - Serverless backend logic:
   - Post expiry cron job
   - User creation triggers
   - Emergency verification
   - Metro area lookup
5. **Cloud Messaging (FCM)** - Push notifications
6. **Hosting** - Optional web hosting (using Vercel instead)

### Database Structure (Firestore)

```
/users/{userId}
  - email, name, metroAreaId, trustLevel, phoneVerified, createdAt

/metroAreas/{metroAreaId}
  - name, state, zipCodes[]

/posts/{postId}
  - authorId, category, metroAreaId, expiryDate, status
  - fields: {} (category-specific data)
  - photos: [url1, url2]
  - createdAt, updatedAt

/conversations/{conversationId}
  - participants: [userId1, userId2]
  - lastMessage, lastMessageTime
  - /messages/{messageId}
    - senderId, text, timestamp, read
```

## Location Services

### ZIP to Metro Area Mapping
- **Source:** HUD USPS ZIP to County Crosswalk
- **Implementation:** Static dataset loaded into Firestore
- **Cost:** $0 (no API calls)
- **Update Frequency:** Quarterly (manual)

## File Storage

### Cloudinary (Primary)
- **Usage:** All user-uploaded images
- **Features:**
  - Automatic image optimization
  - On-the-fly transformations (resize, compress)
  - CDN delivery
- **Pricing:** Free tier (25GB storage + 25GB bandwidth/month)

### Firebase Storage (Backup)
- **Usage:** Fallback or admin files
- **Pricing:** $0.026/GB/month storage

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
- **URL:** https://unhn.app (custom domain)
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
- **Firebase:** $0 (free tier)
- **Cloudinary:** $0 (free tier)
- **Vercel:** $0 (hobby plan)
- **Expo EAS:** $0 (free tier)
- **Total:** **$0/month**

### Production (1,000 - 10,000 Users)
- **Firebase:** $25-50/month
- **Cloudinary:** $0-89/month
- **Vercel:** $0-20/month
- **Expo EAS:** $0-40/month
- **Total:** **$25-200/month**

## Scalability

### When to Migrate
If Firebase costs exceed $500/month or you hit query limitations, consider:
1. Keep Firebase Auth and FCM (always cheap)
2. Migrate data to PostgreSQL (Supabase or custom)
3. Build REST API (Next.js API routes or Node.js)

### Migration Effort
2-3 months with 2 developers

## Why NOT Flutter?

Despite CLAUDE.md mentioning Flutter, it was eliminated because:
- ❌ **SEO terrible** - Flutter Web uses Canvas rendering, not HTML
- ❌ **Learning curve** - Would need to learn Dart
- ❌ **Web is second-class** - Flutter Web is immature
- ✅ **React Native + Next.js** - Leverages existing JS/TS skills, excellent SEO

## Security

### Authentication
- Phone verification (SMS OTP via Firebase Auth)
- Social login (Google, Facebook)
- JWT tokens (Firebase Auth automatic)

### Authorization
- Firestore security rules enforce trust levels
- Cloud Functions validate permissions server-side
- Client-side validation with Zod schemas

### Data Protection
- PII masking (emergency contact info hidden)
- Encrypted connections (HTTPS, WSS)
- Firestore rules prevent unauthorized access

## Performance

### Mobile
- Native performance via React Native
- Offline support with Firestore
- Image optimization with Cloudinary
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
- Firebase Analytics (free)
- Mixpanel (for product analytics)

### Performance
- Firebase Performance Monitoring
- Vercel Analytics (web)

## References

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
