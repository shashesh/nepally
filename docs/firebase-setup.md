# Firebase Setup Guide

Detailed guide for setting up Firebase for the NUSA project.

## Firebase Project Creation

### 1. Create Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: **NUSA** (or your preferred name)
4. Google Analytics: **Disable** (optional, can enable later)
5. Click "Create project"

### 2. Get Firebase Config

1. In Firebase Console, click the gear icon ⚙️ > Project settings
2. Scroll to "Your apps"
3. Click "Add app" > Web (</>) icon
4. Register app with nickname: "NUSA Web"
5. Copy the Firebase config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "nusa-xxxxx.firebaseapp.com",
  projectId: "nusa-xxxxx",
  storageBucket: "nusa-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

6. Add these values to your `.env` files (see Setup Guide)

## Authentication Setup

### 1. Enable Email/Password

1. Go to **Authentication** > **Sign-in method**
2. Click **Email/Password**
3. Enable **Email/Password**
4. Click **Save**

### 2. Enable Phone Authentication

**Note:** Phone auth requires Blaze (pay-as-you-go) plan

1. Go to **Authentication** > **Sign-in method**
2. Click **Phone**
3. Enable **Phone**
4. Click **Save**

**SMS Quota:**
- Free tier: 10 SMS/day
- Blaze plan: First 10K verifications/month free, then $0.06/verification

### 3. Enable Google Sign-In (Optional)

1. Go to **Authentication** > **Sign-in method**
2. Click **Google**
3. Enable **Google**
4. Enter support email
5. Click **Save**

### 4. Configure Authorized Domains

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (already there)
   - `nusa.app` (your production domain)
   - `your-vercel-domain.vercel.app`

## Firestore Database Setup

### 1. Create Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose location: **us-central1** (or closest to your users)
4. Start in **test mode** (we'll deploy rules later)
5. Click **Enable**

### 2. Deploy Security Rules

From your terminal:

```bash
firebase deploy --only firestore:rules
```

This deploys the rules from `firebase/firestore.rules`.

### 3. Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

This creates composite indexes for efficient queries.

### 4. Seed Metro Areas Data (Optional)

You can manually add metro area data via the Firebase Console:

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `metroAreas`
4. Document ID: `dallas-fort-worth`
5. Add fields:
   ```
   name: "Dallas-Fort Worth-Arlington"
   state: "TX"
   zipCodes: ["75001", "75201", "75202", ...]
   ```
6. Click **Save**

**TODO:** Create a script to bulk import metro area data from HUD ZIP to County Crosswalk.

## Cloud Storage Setup

### 1. Enable Storage

1. Go to **Storage**
2. Click **Get started**
3. Start in **test mode**
4. Use default location
5. Click **Done**

### 2. Deploy Storage Rules

```bash
firebase deploy --only storage
```

This deploys the rules from `firebase/storage.rules`.

### 3. Create Folder Structure (Auto-created)

Folders will be created automatically when users upload:
- `/users/{userId}/profile/` - Profile photos
- `/posts/{postId}/` - Post photos
- `/conversations/{conversationId}/messages/{messageId}/` - Chat images

## Cloud Functions Setup

### 1. Upgrade to Blaze Plan (Required for Functions)

1. Go to **Project Overview** > **Usage and billing**
2. Click **Modify plan**
3. Select **Blaze (pay as you go)**
4. Enter billing information

**Note:** Functions have a generous free tier:
- 2M invocations/month free
- 400K GB-seconds/month free
- 200K CPU-seconds/month free

### 2. Install Functions Dependencies

```bash
cd firebase/functions
npm install
```

### 3. Build Functions

```bash
cd firebase/functions
npm run build
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

This deploys:
- `expirePosts` - Scheduled function (runs daily)
- `onUserCreate` - Auth trigger
- `onUserDelete` - Auth trigger
- `verifyEmergencyPost` - Callable function
- `getMetroByZip` - HTTP endpoint

### 5. Test Functions Locally

```bash
firebase emulators:start --only functions
```

## Firebase Hosting (Optional)

If you want to host the Next.js web app on Firebase instead of Vercel:

### 1. Enable Hosting

```bash
firebase init hosting
```

Select:
- Public directory: `apps/web/out`
- Single-page app: **No**
- Automatic builds: **No**

### 2. Build and Deploy

```bash
cd apps/web
npm run build
firebase deploy --only hosting
```

**Note:** Vercel is recommended for Next.js hosting (better SSR support).

## Firebase Cloud Messaging (Push Notifications)

### 1. Enable Cloud Messaging

FCM is enabled by default. No additional setup needed.

### 2. Get Server Key (for backend)

1. Go to **Project settings** > **Cloud Messaging**
2. Copy **Server key** (legacy)
3. Store securely (don't commit to Git)

### 3. Configure Web Push

1. Go to **Project settings** > **Cloud Messaging**
2. Scroll to **Web Push certificates**
3. Click **Generate key pair**
4. Copy the **Key pair**
5. Add to `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
   ```

## Firebase Emulators (Local Development)

### 1. Initialize Emulators

```bash
firebase init emulators
```

Select:
- Authentication Emulator
- Functions Emulator
- Firestore Emulator
- Storage Emulator

Use default ports (or customize in `firebase.json`).

### 2. Start Emulators

```bash
firebase emulators:start
```

This starts:
- **Emulator UI**: http://localhost:4000
- **Firestore**: http://localhost:8080
- **Auth**: http://localhost:9099
- **Functions**: http://localhost:5001
- **Storage**: http://localhost:9199

### 3. Use Emulators in Apps

In development, apps will automatically use emulators if `FIREBASE_USE_EMULATOR=true` is set.

See `apps/mobile/src/config/firebase.ts` and `apps/web/src/lib/firebase.ts` for configuration.

## Firestore Best Practices

### 1. Design Collections Flat

❌ **Bad:** Deep nesting
```
/posts/{postId}/comments/{commentId}/replies/{replyId}
```

✅ **Good:** Flat structure
```
/posts/{postId}
/comments/{commentId} (with postId field)
/replies/{replyId} (with commentId field)
```

### 2. Use Composite Indexes

Define in `firebase/firestore.indexes.json` for queries with multiple filters.

### 3. Minimize Reads

- Use `limit()` in queries
- Cache data in React state/context
- Use Firestore offline persistence

### 4. Security Rules

- Never trust client-side validation
- Always validate in Firestore rules
- Test rules with emulator

## Monitoring and Logs

### 1. View Logs

```bash
firebase functions:log
```

### 2. Monitor Usage

Go to **Project Overview** > **Usage and billing** to see:
- Firestore reads/writes
- Function invocations
- Storage bandwidth

### 3. Set Budget Alerts

1. Go to **Google Cloud Console** (linked from Firebase)
2. **Billing** > **Budgets & alerts**
3. Create budget with email alerts

## Backup and Export

### 1. Export Firestore Data

```bash
gcloud firestore export gs://your-bucket/exports
```

### 2. Schedule Automatic Backups

Set up scheduled Cloud Function to export data weekly/monthly.

## Troubleshooting

### Issue: Functions not deploying

**Solution:** Check Node.js version:
```bash
node --version  # Should be v18
```

Update `firebase/functions/package.json`:
```json
"engines": {
  "node": "18"
}
```

### Issue: Emulator connection refused

**Solution:** Check if emulators are running:
```bash
firebase emulators:start
```

### Issue: Permission denied in Firestore

**Solution:** Check security rules in Firebase Console or redeploy:
```bash
firebase deploy --only firestore:rules
```

## Security Checklist

- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules
- [ ] Enable App Check (optional, for abuse prevention)
- [ ] Set up budget alerts
- [ ] Rotate API keys regularly
- [ ] Never commit Firebase config with sensitive keys to Git
- [ ] Use environment variables for secrets
- [ ] Enable 2FA on Firebase account

## Next Steps

- Set up Firebase Admin SDK for backend operations
- Configure Firebase Performance Monitoring
- Set up Firebase Analytics (optional)
- Integrate Crashlytics for error tracking

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
