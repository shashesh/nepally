# UNHN Development Setup Guide

This guide will help you set up the UNHN project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**
- **Supabase CLI** (`npm install -g supabase`)
- **Expo CLI** (`npm install -g expo-cli`) (optional, Expo handles this)

### Platform-Specific Requirements

#### For iOS Development (Mac only)
- **Xcode** (latest version)
- **CocoaPods** (`sudo gem install cocoapods`)

#### For Android Development
- **Android Studio**
- **Android SDK** (API level 33+)
- **Java Development Kit (JDK)** 17

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/unhn.git
cd unhn
```

## Step 2: Install Dependencies

Install dependencies for all workspaces:

```bash
npm install
```

This will install dependencies for:
- Root workspace
- Mobile app (`apps/mobile`)
- Web app (`apps/web`)
- Shared package (`packages/shared`)

## Step 3: Set Up Environment Variables

### Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Web App

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 4: Set Up Supabase

### Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Name it "UNHN" (or your preferred name)
4. Set a strong database password (save this!)
5. Choose a region (us-east-1 or closest to you)
6. Create project (takes ~2 minutes)

### Get Project Credentials

1. Go to Project Settings > API
2. Copy your **Project URL** (e.g., `https://abcdefgh.supabase.co`)
3. Copy your **anon/public key**
4. Add these to your `.env` files (see Step 3)

### Initialize Supabase Locally

```bash
npx supabase login
npx supabase init
```

This creates a `supabase/` directory with local configuration.

### Link to Remote Project

```bash
npx supabase link --project-ref your-project-ref
```

Your project ref is in the Project URL: `https://[project-ref].supabase.co`

### Run Migrations

```bash
npx supabase db push
```

This applies all database migrations from `supabase/migrations/` to your remote project.

## Step 5: Start Supabase Locally (Recommended for Development)

Run local Supabase stack:

```bash
npx supabase start
```

This starts:
- PostgreSQL Database: postgresql://postgres:postgres@localhost:54322/postgres
- Studio (UI): http://localhost:54323
- API Gateway: http://localhost:54321
- Auth: included in API Gateway
- Storage: included in API Gateway

**To use local Supabase**, update your environment variables:
```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# Keep the anon key from local start output
```

## Step 6: Build Shared Package

The shared package must be built before mobile/web apps can use it:

```bash
cd packages/shared
npm run build
```

Or run in watch mode (auto-rebuilds on changes):

```bash
cd packages/shared
npm run dev
```

## Step 7: Start Development Servers

### Option A: Start All Apps

From the root directory:

```bash
# Start mobile app
npm run mobile

# In a separate terminal, start web app
npm run web
```

### Option B: Start Individual Apps

#### Mobile App (React Native + Expo)

```bash
cd apps/mobile
npm start
```

Then:
- Press `i` to open iOS simulator (Mac only)
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on your phone

#### Web App (Next.js)

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 8: Verify Setup

### Mobile App
1. Open the app in Expo Go
2. You should see "Welcome to UNHN" screen
3. Check console for any errors

### Web App
1. Open http://localhost:3000
2. You should see the home page with 4 category cards
3. Check browser console for any errors

### Supabase Connection
1. Try signing up for an account
2. Check Supabase Studio (http://localhost:54323)
3. Go to Table Editor > users
4. You should see a new user row created

## Common Issues

### Issue: `Cannot find module '@unhn/shared'`

**Solution:** Build the shared package first:
```bash
cd packages/shared
npm run build
```

### Issue: Expo app won't start

**Solution:** Clear Expo cache:
```bash
cd apps/mobile
expo start -c
```

### Issue: Next.js build errors

**Solution:** Delete `.next` folder and rebuild:
```bash
cd apps/web
rm -rf .next
npm run dev
```

### Issue: Supabase connection refused

**Solution:** Make sure Supabase is running locally:
```bash
npx supabase start
```

And check environment variables point to `http://localhost:54321`.

### Issue: TypeScript errors in shared package

**Solution:** Run type check:
```bash
cd packages/shared
npm run type-check
```

## Development Workflow

### Daily Workflow

1. Start Supabase locally (terminal 1):
   ```bash
   npx supabase start
   ```

2. Start shared package in watch mode (terminal 2):
   ```bash
   cd packages/shared
   npm run dev
   ```

3. Start mobile app (terminal 3):
   ```bash
   npm run mobile
   ```

4. Start web app (terminal 4):
   ```bash
   npm run web
   ```

### Making Changes

1. **Shared code changes:**
   - Edit files in `packages/shared/src`
   - TypeScript will auto-compile (if in watch mode)
   - Mobile and web apps will hot-reload

2. **Mobile app changes:**
   - Edit files in `apps/mobile/src`
   - Expo will hot-reload automatically

3. **Web app changes:**
   - Edit files in `apps/web/src`
   - Next.js will hot-reload automatically

### Testing Changes

```bash
# Lint all code
npm run lint

# Type check all packages
npm run type-check

# Format all code
npm run format
```

## Next Steps

- Read [Database Schema](./database-schema.md) to understand data structure
- Read [Code Sharing Guide](./code-sharing-guide.md) to learn what goes in shared package
- Read [Supabase Setup](./supabase-setup.md) for advanced Supabase configuration
- Start building features! See [Phase 1 Feature Breakdown](./phase1-feature-breakdown.md)

## Getting Help

- Check [QUICK-START.md](../QUICK-START.md) for quick reference
- See [CLAUDE.md](../CLAUDE.md) for project context
- Join our Discord (link TBD)
