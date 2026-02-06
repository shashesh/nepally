# UNHN Development Setup Guide

This guide will help you set up the UNHN project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**
- **Firebase CLI** (`npm install -g firebase-tools`)
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
- Firebase functions (`firebase/functions`)

## Step 3: Set Up Environment Variables

### Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
```

### Web App

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
```

## Step 4: Set Up Firebase

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "UNHN" (or your preferred name)
4. Disable Google Analytics (optional)
5. Create project

### Enable Firebase Services

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Phone (requires Blaze plan for SMS)
   - Enable Google (optional)

2. **Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in **test mode** (we'll deploy rules later)
   - Choose a location (us-central1)

3. **Storage**
   - Go to Storage
   - Click "Get started"
   - Start in **test mode**

4. **Cloud Functions**
   - Go to Functions
   - Click "Get started"
   - Follow setup instructions

### Initialize Firebase Locally

```bash
firebase login
firebase use --add
```

Select your Firebase project and give it an alias (e.g., "default").

### Deploy Firebase Rules and Indexes

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage
```

## Step 5: Start Firebase Emulators (Optional but Recommended)

Run local Firebase emulators for development:

```bash
firebase emulators:start
```

This starts:
- Firestore Emulator: http://localhost:8080
- Auth Emulator: http://localhost:9099
- Functions Emulator: http://localhost:5001
- Emulator UI: http://localhost:4000

**To use emulators**, update your environment variables:
- `EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true`
- `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true`

## Step 6: Set Up Cloudinary (Optional)

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Get your cloud name from the dashboard
4. Create an upload preset:
   - Go to Settings > Upload
   - Scroll to "Upload presets"
   - Click "Add upload preset"
   - Set signing mode to "Unsigned"
   - Copy the preset name

## Step 7: Build Shared Package

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

## Step 8: Start Development Servers

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

## Step 9: Verify Setup

### Mobile App
1. Open the app in Expo Go
2. You should see "Welcome to UNHN" screen
3. Check console for any errors

### Web App
1. Open http://localhost:3000
2. You should see the home page with 4 category cards
3. Check browser console for any errors

### Firebase Connection
1. Try signing up for an account
2. Check Firestore emulator UI (http://localhost:4000)
3. You should see a new user document created

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

### Issue: Firebase emulator connection refused

**Solution:** Make sure emulators are running:
```bash
firebase emulators:start
```

And check environment variables have `FIREBASE_USE_EMULATOR=true`.

### Issue: TypeScript errors in shared package

**Solution:** Run type check:
```bash
cd packages/shared
npm run type-check
```

## Development Workflow

### Daily Workflow

1. Start Firebase emulators (terminal 1):
   ```bash
   firebase emulators:start
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
- Read [Firebase Setup](./firebase-setup.md) for advanced Firebase configuration
- Start building features! See [Phase 1 Feature Breakdown](./phase1-feature-breakdown.md)

## Getting Help

- Check [QUICK-START.md](../QUICK-START.md) for quick reference
- See [CLAUDE.md](../CLAUDE.md) for project context
- Join our Discord (link TBD)
