# Firebase Configuration

This directory contains Firebase configuration files for UNHN.

## Structure

```
firebase/
├── functions/          # Cloud Functions
│   ├── src/
│   │   └── index.ts   # Main functions file
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
└── storage.rules       # Cloud Storage security rules
```

## Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Create Firebase Project

Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.

### 4. Initialize Firebase

```bash
firebase init
```

Select:
- Firestore
- Functions
- Hosting
- Storage

### 5. Deploy Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy Cloud Functions
firebase deploy --only functions
```

## Local Development

### Run Firebase Emulators

```bash
firebase emulators:start
```

This starts:
- Firestore Emulator (port 8080)
- Auth Emulator (port 9099)
- Functions Emulator (port 5001)
- Storage Emulator (port 9199)
- Emulator UI (port 4000)

### Test Functions Locally

```bash
cd firebase/functions
npm run build
npm run serve
```

## Cloud Functions

### expirePosts
Scheduled function that runs daily at midnight to expire old posts.

### onUserCreate
Trigger when a new user signs up. Creates user document in Firestore.

### onUserDelete
Trigger when a user is deleted. Cleans up user data.

### verifyEmergencyPost
Callable function for moderators to verify emergency posts (Red Alert system).

### getMetroByZip
HTTP endpoint to get metro area by ZIP code.

## Security Rules

### Firestore Rules
- Users can read their own data and public profiles
- Trust Level 1+ required to create posts
- Post authors can update/delete their own posts
- Moderators have elevated permissions
- Conversation participants can read messages

### Storage Rules
- Anyone can read public images
- Users can upload images (max 10MB)
- Users can only upload to their own folders

## Indexes

Composite indexes are defined in `firestore.indexes.json`:
- Posts by metro area, category, status, and date
- Conversations by participants and last message time
- Messages by conversation and timestamp

## Environment Variables

Set environment variables for Cloud Functions:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

Access in functions:
```typescript
const apiKey = functions.config().someservice.key;
```
