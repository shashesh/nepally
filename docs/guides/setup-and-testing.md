# Complete Setup & Testing Guide for Nepally Apps

## Prerequisites

Before starting, ensure you have:

- **Node.js**: Version 22.0.0 or higher
- **npm**: Version 10.0.0 or higher
- **Git**: For version control
- **Code editor**: VS Code recommended
- **Mobile testing**: Expo Go app on your phone OR iOS Simulator/Android Emulator

## Step 1: Verify Node.js Version

### Check your current version:
```bash
node --version  # Should show v22.x or higher
npm --version   # Should show 10.x.x or higher
```

### If you need to upgrade (Windows):
```bash
# Download and install from https://nodejs.org/
# Or use nvm-windows:
nvm install 22
nvm use 22
```

## Step 2: Install Dependencies

```bash
# Navigate to project root
cd C:\Users\shash\Documents\personal-github-repos\nepally

# Install all dependencies
npm install

# This will install dependencies for:
# - Root workspace
# - apps/web
# - apps/mobile
# - packages/shared
```

## Step 3: Set Up Supabase (Backend)

### Option A: Use Existing Supabase Project

1. **Go to** https://supabase.com
2. **Sign in** and select your project
3. **Get credentials**:
   - Go to Settings → API
   - Copy the Project URL
   - Copy the `anon` public key

### Option B: Create New Supabase Project

1. **Create project** at https://supabase.com
2. **Run database migrations**:
   ```bash
   # The schema is in supabase/migrations/001_schema.sql
   # Copy and paste it into Supabase SQL Editor
   # Then run 002_seed_data.sql and 003_storage.sql
   ```
3. **Get credentials** (same as Option A)

### Important: Seed Metro Area Data

Metro areas and ZIP codes are seeded from the Census Bureau and HUD APIs (~390 metros, ~33,000 ZIPs).

**Option A: Run the automated seed script (recommended)**

1. Copy the env template and fill in your API keys:
   ```bash
   cp scripts/.env.example scripts/.env
   # Edit scripts/.env with your keys (see file for registration URLs)
   ```

2. Run the seed script:
   ```bash
   npm run seed:metro
   ```

   This fetches all Metropolitan Statistical Areas from Census and their ZIP codes from HUD, then writes them to Supabase. Takes ~30 seconds.

**Option B: Insert minimal test data manually**

If you just want a few test entries without API keys, run this in Supabase SQL Editor:

```sql
-- CBSA codes are official Census IDs (not slugs)
INSERT INTO metro_areas (id, name, state, population, cbsa_type) VALUES
  ('19100', 'Dallas-Fort Worth-Arlington', 'TX', 7637387, 'metropolitan'),
  ('35620', 'New York-Newark-Jersey City', 'NY', 19979477, 'metropolitan'),
  ('31080', 'Los Angeles-Long Beach-Anaheim', 'CA', 13200998, 'metropolitan');

INSERT INTO metro_area_zipcodes (zip_code, metro_area_id) VALUES
  ('75001', '19100'),
  ('75201', '19100'),
  ('10001', '35620'),
  ('10002', '35620'),
  ('90001', '31080'),
  ('90002', '31080');
```

## Step 4: Configure Environment Variables

### Mobile App (.env)

```bash
cd apps/mobile

# Create .env file
cp .env.example .env

# Edit .env with your credentials:
# (Use notepad or VS Code)
```

**apps/mobile/.env:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id (optional for Phase 1)
```

### Web App (.env.local)

```bash
cd ../web

# Create .env.local file
# (Web uses .env.local for Next.js)
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Start the Mobile App

### Terminal 1 - Mobile App

```bash
cd apps/mobile

# Start Metro bundler
npm start
```

**You should see:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

### Test on Physical Device (Easiest):

1. **Install Expo Go**:
   - iOS: App Store → Search "Expo Go"
   - Android: Play Store → Search "Expo Go"

2. **Scan QR code**:
   - iOS: Use Camera app to scan QR
   - Android: Use Expo Go app to scan QR

3. **App loads on your device** with hot reload!

### Test on iOS Simulator (macOS only):

```bash
# Press 'i' in the terminal
# OR
npm run ios
```

### Test on Android Emulator:

```bash
# First, ensure Android Studio is installed with an emulator
# Then press 'a' in the terminal
# OR
npm run android
```

## Step 6: Start the Web App

### Terminal 2 - Web App

```bash
cd apps/web

# Start Next.js development server
npm run dev
```

**You should see:**
```
   ▲ Next.js 16.2.7 (Turbopack)
   - Local:        http://localhost:3000
   - Ready in 2.3s
```

**Open browser**: http://localhost:3000

## Step 7: Test the Mobile App Flow

### Complete Onboarding Journey (Mobile)

1. **Welcome Screen** ✓
   - Should see Nepally logo, tagline, Sign Up button
   - Tap "Sign Up"

2. **Signup Method Screen** ✓
   - See 3 options: Google, Phone, Email
   - Tap "Continue with Google" (will show stub message)
   - App navigates to ZIP entry

3. **ZIP Code Entry** ✓
   - Enter a valid ZIP: `75001` or `10001`
   - Should see green checkmark when valid
   - Tap "Continue"

4. **Metro Confirmation** ✓
   - Should see animated green checkmark
   - Shows metro area name (e.g., "Dallas-Fort Worth, TX")
   - Auto-navigates after 2 seconds OR tap "Continue"

5. **Tutorial Screen** ✓
   - Swipe through 3 cards:
     - Metro-First Community (blue)
     - Trust Levels (green)
     - Structured Categories (red)
   - Progress dots animate
   - Tap "Get Started" on last card

6. **Home Screen (Level 0)** ✓
   - Yellow Level 0 banner appears at top
   - Tag filter chips
   - Empty state (no posts yet)
   - Floating + button (50% opacity, disabled)
   - Tap + button → Shows "Verify to Post" alert
   - Tap "X" on banner → Banner dismisses and stays dismissed

### Test Banner Persistence

1. Dismiss the Level 0 banner
2. Force quit the app (swipe up)
3. Reopen the app
4. Banner should NOT reappear ✓

### Test ZIP Validation

1. Go back to ZIP entry (restart onboarding)
2. Try invalid ZIPs:
   - `123` (too short) - Continue button stays disabled
   - `abcde` (letters) - Input shows only numbers
   - `12345` (valid format but not in database) - Shows error
   - `75001` (valid) - Green checkmark appears ✓

## Step 8: Test the Web App

### Web App Testing

The web app mirrors the mobile feature set. Key flows to test:

1. **Feed loads** at `/feed` ✓ — posts, tag filters, like/comment/message actions
2. **Post detail** at `/posts/[id]` ✓ — full post, comments thread, contact author
3. **Profile** at `/profile` ✓ — Posts/Saved/About tabs, hamburger account menu
4. **Public profile** at `/users/[id]` ✓ — masked name, trust badge, user posts
5. **Messages** at `/messages` ✓ — conversation list and threads
6. **Check console** for errors (F12 → Console tab)
7. **Verify Supabase connection** (check Network tab)

## Step 8.5: Run Unit Tests & Coverage (Required)

After setup (and before opening PRs), run tests for touched workspaces and then monorepo-level checks.

### Workspace-level tests

```bash
# Shared package
npm run test --workspace=packages/shared
npm run test:coverage --workspace=packages/shared

# Web app
npm run test --workspace=apps/web
npm run test:coverage --workspace=apps/web

# Mobile app
npm run test --workspace=apps/mobile
npm run test:coverage --workspace=apps/mobile
```

### Monorepo-level validation

```bash
npm run test
npm run test:coverage
```

### End-to-end (E2E) tests

```bash
# Run all available workspace E2E tests
npm run test:e2e

# Run only web E2E tests
npm run test:e2e:web

# Run web E2E in headed browser mode
npm run test:e2e:web:headed

# Open Playwright UI for web E2E tests
npm run test:e2e:web:ui

# Run web E2E and open HTML report
npm run test:e2e:web:report

# Run only mobile E2E tests
npm run test:e2e:mobile
```

### Visual regression and accessibility tests (web)

The `visual-desktop` (1280×800) and `visual-phone` (Pixel 7) Playwright projects screenshot key pages and run an axe scan on each. Baselines are **Linux-only** and live in `apps/web/e2e/visual/__screenshots__/`. CI runs them in the `Web visual regression` job inside the Playwright container.

```bash
# Compare against baselines (needs Docker; identical to CI)
npm run test:visual:docker --workspace=apps/web

# Accept intentional visual changes
npm run test:visual:docker --workspace=apps/web -- --update

# Any OS without Docker: check every page reaches its ready state (no screenshots)
npm run test:visual:smoke --workspace=apps/web
```

- **No Docker?** Push the branch, run **Actions → Visual baselines** on it, and unzip the `visual-baselines` artifact into `apps/web/e2e/visual/`.
- **Feature branches:** `workflow_dispatch` only works once the workflow is on `master`. Before that, push a commit whose message contains `[visual-baselines]` to trigger the same run on the branch.
- **Add a page:** append an entry to `apps/web/e2e/visual/pages.ts`.
- **Accessibility baseline:** `apps/web/e2e/visual/a11y-baseline.json` records known serious/critical axe violations per `project:page`, and tests fail on anything new. After fixing violations, regenerate with `-- --update --write-a11y-baseline`. The diff of that file must only delete lines.
- **Image tag:** the container tag in `ci.yml` and `visual-baselines.yml` must equal the installed `@playwright/test` version.

### Policy reminder

- Every new functionality must include unit tests in the same change.
- Any behavior change must include corresponding test updates.
- Do not mark work complete until relevant workspace and monorepo test commands pass.

## Step 9: Common Issues & Troubleshooting

### Issue: "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or on Windows:
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Issue: Expo app won't load

```bash
# Clear Expo cache
cd apps/mobile
npx expo start -c

# Or completely reset:
rm -rf .expo
rm -rf node_modules
npm install
npm start
```

### Issue: "Supabase client error"

- Verify `.env` file exists and has correct credentials
- Check Supabase project is running (not paused)
- Verify anon key is correct (not service_role key)

### Issue: "ZIP code not found"

- Make sure you inserted sample ZIP codes in Supabase (Step 3)
- Check `metro_area_zipcodes` table has data:
  ```sql
  SELECT * FROM metro_area_zipcodes LIMIT 10;
  ```

### Issue: TypeScript errors

```bash
# Check types in mobile app
cd apps/mobile
npm run type-check

# Check types in web app
cd apps/web
npm run type-check
```

### Issue: Port 3000 already in use (Web)

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart:
npm run dev
```

### Issue: Metro bundler errors

```bash
# Reset Metro bundler cache
cd apps/mobile
npx react-native start --reset-cache
```

### Issue: Unit test fails in one workspace

```bash
# Run one workspace in isolation first
npm run test --workspace=apps/mobile
npm run test --workspace=apps/web
npm run test --workspace=packages/shared
```

- Fix workspace-level issues first, then rerun `npm run test` at root.

### Issue: Coverage command fails

```bash
# Run coverage for the failing workspace
npm run test:coverage --workspace=apps/mobile
npm run test:coverage --workspace=apps/web
npm run test:coverage --workspace=packages/shared
```

- Add/update tests for newly added or changed functionality in that workspace.

## Step 10: Quick Test Checklist

### Mobile App Checklist

- [ ] App launches without errors
- [ ] Welcome screen displays correctly
- [ ] Signup method screen shows 3 options
- [ ] ZIP code input validates in real-time
- [ ] Valid ZIP shows green checkmark
- [ ] Metro confirmation screen shows metro name
- [ ] Tutorial cards swipe smoothly
- [ ] Progress dots animate correctly
- [ ] Home screen loads
- [ ] Level 0 banner appears
- [ ] Tag filter chips work
- [ ] Banner dismisses and stays dismissed
- [ ] Tapping + button shows "Verify to Post" alert

### Web App Checklist

- [ ] App loads at http://localhost:3000
- [ ] No console errors (some warnings OK)
- [ ] Supabase connection works (check Network tab)
- [ ] Feed page loads posts with tag filters
- [ ] Post detail shows comments and actions
- [ ] Profile page shows Posts / Saved / About tabs
- [ ] Public profile at /users/[id] shows masked name and posts

## Step 11: View Running Apps Side-by-Side

**Recommended Setup:**

1. **Left Monitor/Half**: Mobile app on your phone with Expo Go
2. **Right Monitor/Half**:
   - Terminal 1: Mobile Metro bundler
   - Terminal 2: Web dev server
   - Browser: http://localhost:3000
   - VS Code: For editing files

**Hot Reload Works!** Edit any file and see changes instantly:
- Mobile: Shake device → "Reload"
- Web: Browser auto-refreshes

## Step 12: Add Test User (Optional)

If you want to test with a real user account:

```sql
-- Run in Supabase SQL Editor
INSERT INTO users (id, email, full_name, trust_level, metro_area_id, zip_code)
VALUES (
  'test-user-id',
  'test@nepally.us',
  'Test User',
  0,
  '19100',
  '75001'
);
```

## Need Help?

### Check Logs

**Mobile app logs:**
```bash
# In the terminal running npm start
# All console.log() and errors appear here
```

**Web app logs:**
```bash
# Terminal running npm run dev shows server logs
# Browser console (F12) shows client logs
```

### Verify Environment

```bash
# Check Node version
node --version  # Should be >= 22

# Check npm version
npm --version  # Should be >= 10

# Check Expo CLI
npx expo --version

# List all running processes
npm run  # Shows available scripts
```

---

## Summary of Commands

```bash
# Setup (one time)
npm install
cd apps/mobile && cp .env.example .env
cd ../web && cp .env.example .env.local

# Run Mobile App (Terminal 1)
cd apps/mobile
npm start
# Then scan QR code or press 'i' for iOS / 'a' for Android

# Run Web App (Terminal 2)
cd apps/web
npm run dev
# Then open http://localhost:3000

# Run tests (workspace or monorepo)
npm run test --workspace=apps/mobile
npm run test --workspace=apps/web
npm run test --workspace=packages/shared
npm run test

# Run coverage (workspace or monorepo)
npm run test:coverage --workspace=apps/mobile
npm run test:coverage --workspace=apps/web
npm run test:coverage --workspace=packages/shared
npm run test:coverage

# Run E2E tests
npm run test:e2e
npm run test:e2e:web
npm run test:e2e:web:headed
npm run test:e2e:web:ui
npm run test:e2e:web:report
npm run test:e2e:mobile

# Test on physical device
# Install Expo Go → Scan QR code → App loads!

# Common troubleshooting
npm start -- --reset-cache  # Clear cache
npx expo start -c           # Clear Expo cache
rm -rf node_modules && npm install  # Fresh install
```

---

## Quick Start (TL;DR)

```bash
# 1. Upgrade Node to 22+
nvm install 22 && nvm use 22

# 2. Install dependencies
cd C:\Users\shash\Documents\personal-github-repos\nepally
npm install

# 3. Set up environment variables
cd apps/mobile
cp .env.example .env
# Edit .env with Supabase credentials

# 4. Add test data to Supabase
# Run the SQL from Step 3 in Supabase SQL Editor

# 5. Start mobile app
npm start
# Scan QR code with Expo Go app

# 6. Test with ZIP codes: 75001, 10001, or 90001
```

## CI-aligned Local Check (Recommended)

Before pushing code, run:

```bash
npm run lint
npm run type-check
npm run test
npm run test:coverage
```

---

**That's it!** You should now have both apps running. Start with the mobile app using the test ZIP codes and walk through the complete onboarding flow.

**Test ZIP Codes:**
- `75001` - Dallas-Fort Worth-Arlington, TX (CBSA 19100)
- `10001` - New York-Newark-Jersey City, NY (CBSA 35620)
- `90001` - Los Angeles-Long Beach-Anaheim, CA (CBSA 31080)

**Questions?** Check the troubleshooting section above or review the terminal logs for specific error messages.

---

## Security Smoke Tests

Three scripts assert RLS and privilege behaviour against a **live Supabase project**.
They are deliberately not part of `npm test`: they need real service-role credentials
and they talk to a real database, so they cannot run in the normal unit-test sweep or
in CI without secrets.

| Command | Asserts |
|---|---|
| `npm run test:security:chat-rls` | Conversation RLS — a user cannot read or join a conversation they are not a participant in |
| `npm run test:security:users-privilege` | Migration 034's guard trigger on privileged `users` columns (`trust_level`, `is_moderator`, `is_premium`) cannot be self-escalated |
| `npm run test:security:emergency-post` | Emergency-tagged posts stay invisible until a moderator approves them (migration 035) |

**Credentials.** Copy `scripts/.env.example` to `scripts/.env` and fill in
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key bypasses RLS by
design — never commit `scripts/.env`, and never point these at production.

**When to run them.** After any migration that touches RLS policies on `users`,
`conversations`, or `posts`. A migration can pass `npm run test` and still leave a
table readable by the wrong user; only these scripts catch that.

**Adding a new one.** Put it in `scripts/security/<area>-smoke.ts`, add a
`test:security:<area>` script to the root `package.json`, and add a row to the table
above — this table is the only index of them.
