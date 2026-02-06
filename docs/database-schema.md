# Database Schema

Complete Firestore database schema for UNHN.

## Overview

UNHN uses **Cloud Firestore**, a NoSQL document database. Data is organized into collections and documents.

### Collections

1. `users` - User profiles and account data
2. `metroAreas` - US Census metro areas
3. `posts` - Housing, jobs, emergency, travel posts
4. `conversations` - Chat conversations
5. `reports` - Content reports from users
6. `notifications` - Push notification records

## Collections Detail

### 1. Users Collection

**Path:** `/users/{userId}`

**Document ID:** Firebase Auth UID

**Fields:**
```typescript
{
  // Identity
  id: string;                    // Same as document ID
  email: string;                 // User's email
  name: string;                  // Display name
  phone?: string;                // Phone number (if provided)
  profilePhoto?: string;         // Cloudinary URL

  // Location
  metroAreaId: string;           // Metro area ID
  zipCode: string;               // User's ZIP code

  // Trust & Safety
  trustLevel: number;            // 0 (New), 1 (Verified), 2 (Contributor)
  phoneVerified: boolean;        // Phone verification status
  facebookVerified?: boolean;    // Facebook verification status
  googleVerified?: boolean;      // Google verification status

  // Engagement
  postsCount: number;            // Total posts created
  helpfulVotesReceived: number;  // Helpful votes on posts/comments
  reportsReceived: number;       // Times user was reported

  // Moderation
  isBanned: boolean;             // Account banned status
  banReason?: string;            // Reason for ban
  isModerator: boolean;          // Moderator flag

  // Timestamps
  createdAt: Timestamp;          // Account creation
  updatedAt: Timestamp;          // Last profile update
  lastActiveAt: Timestamp;       // Last app activity
}
```

**Indexes:**
- Single field index on `metroAreaId` (auto-created)
- Single field index on `isModerator` (auto-created)

**Security Rules:**
- Anyone can read user profiles (public data)
- Users can update their own profile
- Only moderators can delete users

**Example:**
```json
{
  "id": "abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "metroAreaId": "dallas-fort-worth",
  "zipCode": "75201",
  "trustLevel": 1,
  "phoneVerified": true,
  "postsCount": 5,
  "helpfulVotesReceived": 12,
  "reportsReceived": 0,
  "isBanned": false,
  "isModerator": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-02-06T08:15:00Z",
  "lastActiveAt": "2024-02-06T12:00:00Z"
}
```

---

### 2. Metro Areas Collection

**Path:** `/metroAreas/{metroAreaId}`

**Document ID:** URL-safe metro area name (e.g., `dallas-fort-worth`)

**Fields:**
```typescript
{
  id: string;          // Same as document ID
  name: string;        // Full metro area name
  state: string;       // Primary state (TX, CA, NY, etc.)
  zipCodes: string[];  // Array of ZIP codes in this metro
}
```

**Indexes:**
- Array-contains index on `zipCodes` (for ZIP lookup)

**Security Rules:**
- Anyone can read
- Only admins can write (via Firebase Console)

**Example:**
```json
{
  "id": "dallas-fort-worth",
  "name": "Dallas-Fort Worth-Arlington",
  "state": "TX",
  "zipCodes": ["75001", "75201", "75202", "76001", "76051"]
}
```

**Data Source:** HUD USPS ZIP to County Crosswalk

---

### 3. Posts Collection

**Path:** `/posts/{postId}`

**Document ID:** Auto-generated Firestore ID

**Fields:**
```typescript
{
  // Identity
  id: string;                // Same as document ID
  authorId: string;          // User ID of author
  category: string;          // 'housing' | 'jobs' | 'emergency' | 'travel'

  // Location
  metroAreaId: string;       // Metro area ID
  location: {
    zipCode: string;
    city: string;
    state: string;
    coordinates?: {
      lat: number;
      lng: number;
    }
  };

  // Content
  title: string;             // Post title
  description: string;       // Post description
  photos: string[];          // Cloudinary URLs

  // Category-specific fields
  fields: Record<string, any>; // See category schemas below

  // Status
  status: string;            // 'active' | 'expired' | 'removed' | 'pending'
  expiryDate: Timestamp;     // When post expires

  // Engagement
  viewsCount: number;        // Views count
  responsesCount: number;    // Responses/messages count
  reportsCount: number;      // Times reported

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
```
- metroAreaId (Ascending) + category (Ascending) + status (Ascending) + createdAt (Descending)
- metroAreaId (Ascending) + status (Ascending) + expiryDate (Ascending)
- authorId (Ascending) + createdAt (Descending)
```

**Security Rules:**
- Anyone can read active posts
- Trust level 1+ can create posts
- Authors can update/delete their posts
- Moderators can update/delete any post

#### Housing Post Fields

```typescript
fields: {
  rentAmount: number;           // Monthly rent
  moveInDate: Timestamp;        // Move-in date
  roomType: string;             // 'private' | 'shared' | 'entire-place'
  bedrooms: number;             // Number of bedrooms
  bathrooms: number;            // Number of bathrooms
  furnished: boolean;           // Furnished?
  utilitiesIncluded: boolean;   // Utilities included?
  petsAllowed: boolean;         // Pets allowed?
  parking: boolean;             // Parking available?
  lease: string;                // 'month-to-month' | 'fixed-term'
  contactMethod: string;        // 'in-app' | 'phone' | 'email'
}
```

#### Job Post Fields

```typescript
fields: {
  jobTitle: string;             // Job title
  companyName: string;          // Company name
  employmentType: string;       // 'full-time' | 'part-time' | 'contract' | 'internship'
  payRate: {
    min: number;
    max: number;
    type: string;               // 'hourly' | 'annual' | 'per-project'
  };
  experienceRequired: string;   // 'entry' | 'mid' | 'senior'
  benefits: string[];           // ['health-insurance', '401k', ...]
  remote: boolean;              // Remote work available?
  contactMethod: string;        // 'in-app' | 'email' | 'apply-url'
  applyUrl?: string;            // Application URL
}
```

#### Emergency Post Fields

```typescript
fields: {
  emergencyType: string;        // 'medical' | 'housing' | 'legal' | 'financial' | 'other'
  urgency: string;              // 'critical' | 'high' | 'medium'
  assistanceNeeded: string[];   // ['transportation', 'financial', ...]
  contactPhone: string;         // Contact phone (masked in UI)
  contactName: string;          // Contact name
  verified: boolean;            // Moderator verified?
  verifiedBy?: string;          // Moderator user ID
  verifiedAt?: Timestamp;       // Verification timestamp
  redAlertSent: boolean;        // Red alert notification sent?
}
```

#### Travel Post Fields

```typescript
fields: {
  travelDate: Timestamp;        // Travel date
  route: {
    from: string;               // Origin city
    to: string;                 // Destination city
  };
  airline?: string;             // Airline name
  seatsAvailable: number;       // Seats available (for carpooling)
  carryingPackages: boolean;    // Willing to carry packages?
  packageDetails?: string;      // Package size/weight details
  contactMethod: string;        // 'in-app' | 'phone'
}
```

**Example (Housing Post):**
```json
{
  "id": "post123",
  "authorId": "user456",
  "category": "housing",
  "metroAreaId": "dallas-fort-worth",
  "location": {
    "zipCode": "75201",
    "city": "Dallas",
    "state": "TX"
  },
  "title": "1 Bedroom Available in Uptown Dallas",
  "description": "Clean, furnished room in 2BR apartment. Close to DART...",
  "photos": ["https://res.cloudinary.com/..."],
  "fields": {
    "rentAmount": 800,
    "moveInDate": "2024-03-01T00:00:00Z",
    "roomType": "private",
    "bedrooms": 1,
    "bathrooms": 1,
    "furnished": true,
    "utilitiesIncluded": true,
    "petsAllowed": false,
    "parking": true,
    "lease": "month-to-month",
    "contactMethod": "in-app"
  },
  "status": "active",
  "expiryDate": "2024-03-30T00:00:00Z",
  "viewsCount": 45,
  "responsesCount": 3,
  "reportsCount": 0,
  "createdAt": "2024-02-01T10:00:00Z",
  "updatedAt": "2024-02-01T10:00:00Z"
}
```

---

### 4. Conversations Collection

**Path:** `/conversations/{conversationId}`

**Document ID:** Auto-generated Firestore ID

**Fields:**
```typescript
{
  id: string;                     // Same as document ID
  participants: string[];         // Array of user IDs (2 users)
  participantDetails: {
    [userId: string]: {
      name: string;
      photo?: string;
    }
  };
  postId?: string;                // Related post ID (if any)
  lastMessage: string;            // Last message text
  lastMessageTime: Timestamp;     // Last message timestamp
  unreadCount: {
    [userId: string]: number;     // Unread count per user
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Subcollection: Messages**

**Path:** `/conversations/{conversationId}/messages/{messageId}`

**Fields:**
```typescript
{
  id: string;                // Same as document ID
  conversationId: string;    // Parent conversation ID
  senderId: string;          // Sender user ID
  text: string;              // Message text
  timestamp: Timestamp;      // Message sent time
  read: boolean;             // Read status
  readAt?: Timestamp;        // Read timestamp
  type: string;              // 'text' | 'image' | 'system'
  imageUrl?: string;         // Image URL (if type is 'image')
  systemMessageType?: string; // Type of system message
}
```

**Composite Indexes:**
```
- participants (Array-contains) + lastMessageTime (Descending)
- conversationId (Ascending) + timestamp (Ascending)
```

**Security Rules:**
- Only participants can read conversations and messages
- Only participants can send messages

**Example:**
```json
// Conversation
{
  "id": "conv789",
  "participants": ["user123", "user456"],
  "participantDetails": {
    "user123": { "name": "John Doe", "photo": "https://..." },
    "user456": { "name": "Jane Smith", "photo": "https://..." }
  },
  "postId": "post123",
  "lastMessage": "Is the room still available?",
  "lastMessageTime": "2024-02-06T14:30:00Z",
  "unreadCount": {
    "user123": 0,
    "user456": 1
  },
  "createdAt": "2024-02-06T14:20:00Z",
  "updatedAt": "2024-02-06T14:30:00Z"
}

// Message
{
  "id": "msg001",
  "conversationId": "conv789",
  "senderId": "user123",
  "text": "Is the room still available?",
  "timestamp": "2024-02-06T14:30:00Z",
  "read": false,
  "type": "text"
}
```

---

### 5. Reports Collection

**Path:** `/reports/{reportId}`

**Document ID:** Auto-generated Firestore ID

**Fields:**
```typescript
{
  id: string;                 // Same as document ID
  reportedBy: string;         // Reporter user ID
  targetType: string;         // 'post' | 'user' | 'message'
  targetId: string;           // ID of reported item
  reason: string;             // Report reason
  description?: string;       // Additional details
  status: string;             // 'pending' | 'reviewed' | 'dismissed' | 'actioned'
  reviewedBy?: string;        // Moderator user ID
  reviewedAt?: Timestamp;     // Review timestamp
  action?: string;            // 'removed' | 'warned' | 'banned' | 'none'
  createdAt: Timestamp;
}
```

**Indexes:**
- Single field index on `status`
- Composite index: `status (Ascending) + createdAt (Descending)`

**Security Rules:**
- Only moderators can read reports
- Verified users can create reports
- Only moderators can update/delete reports

**Example:**
```json
{
  "id": "report001",
  "reportedBy": "user123",
  "targetType": "post",
  "targetId": "post456",
  "reason": "Spam or scam",
  "description": "This post looks like a rental scam...",
  "status": "pending",
  "createdAt": "2024-02-06T15:00:00Z"
}
```

---

### 6. Notifications Collection (Future)

**Path:** `/notifications/{notificationId}`

**Document ID:** Auto-generated Firestore ID

**Fields:**
```typescript
{
  id: string;
  userId: string;             // Recipient user ID
  type: string;               // 'message' | 'post-response' | 'emergency-alert'
  title: string;
  body: string;
  data?: Record<string, any>; // Additional data
  read: boolean;
  readAt?: Timestamp;
  sentAt: Timestamp;
}
```

---

## Data Relationships

### User → Posts
- One user can create many posts
- Query: `posts.where('authorId', '==', userId)`

### Metro Area → Posts
- One metro area has many posts
- Query: `posts.where('metroAreaId', '==', metroId)`

### User → Conversations
- One user can have many conversations
- Query: `conversations.where('participants', 'array-contains', userId)`

### Post → Conversations
- One post can have many conversations
- Query: `conversations.where('postId', '==', postId)`

---

## Query Patterns

### Get posts in metro area by category

```typescript
const postsRef = firestore.collection('posts');
const query = postsRef
  .where('metroAreaId', '==', 'dallas-fort-worth')
  .where('category', '==', 'housing')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .limit(20);
```

**Requires composite index:** `metroAreaId + category + status + createdAt`

### Get user's conversations

```typescript
const conversationsRef = firestore.collection('conversations');
const query = conversationsRef
  .where('participants', 'array-contains', userId)
  .orderBy('lastMessageTime', 'desc');
```

**Requires composite index:** `participants (array-contains) + lastMessageTime`

### Get messages in conversation

```typescript
const messagesRef = firestore
  .collection('conversations')
  .doc(conversationId)
  .collection('messages');
const query = messagesRef.orderBy('timestamp', 'asc');
```

**Requires single field index:** `timestamp`

---

## Data Migration Scripts

Scripts to populate initial data.

### Seed Metro Areas

```typescript
// scripts/seedMetroAreas.ts
import * as admin from 'firebase-admin';
import metroAreasData from './metro-areas.json';

async function seedMetroAreas() {
  const db = admin.firestore();
  const batch = db.batch();

  metroAreasData.forEach((metro) => {
    const ref = db.collection('metroAreas').doc(metro.id);
    batch.set(ref, metro);
  });

  await batch.commit();
  console.log(`Seeded ${metroAreasData.length} metro areas`);
}

seedMetroAreas();
```

---

## Backup Strategy

### Automated Exports

Set up scheduled Cloud Function to export Firestore data:

```typescript
// firebase/functions/src/backup.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const backupFirestore = functions.pubsub
  .schedule('0 2 * * 0') // Every Sunday at 2 AM
  .onRun(async () => {
    const bucket = 'gs://unhn-backups';
    const timestamp = new Date().toISOString();
    const path = `${timestamp}`;

    await admin.firestore().exportDocuments({
      collectionIds: ['users', 'posts', 'conversations', 'reports'],
      outputUriPrefix: `${bucket}/${path}`,
    });

    console.log(`Backup completed: ${path}`);
  });
```

---

## Resources

- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
