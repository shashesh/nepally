# Database Schema

Complete PostgreSQL database schema for NUSA using Supabase.

## Overview

NUSA uses **PostgreSQL** via Supabase, a relational database with powerful querying capabilities, real-time subscriptions, and Row Level Security (RLS) for data protection.

### Tables

1. `users` - User profiles and account data
2. `metro_areas` - US Census metro areas
3. `metro_area_zipcodes` - ZIP codes for metro areas (junction table)
4. `posts` - Housing, jobs, emergency, travel posts
5. `conversations` - Chat conversations
6. `conversation_participants` - Conversation participant junction table
7. `messages` - Chat messages
8. `reports` - Content reports from users
9. `notifications` - Push notification records

## Tables Detail

### 1. Users Table

**Table:** `users`

**Primary Key:** `id` (UUID, references auth.users)

**Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,

  -- Location
  metro_area_id TEXT REFERENCES metro_areas(id),
  zip_code TEXT,

  -- Trust & Safety
  trust_level INTEGER NOT NULL DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 2),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  facebook_verified BOOLEAN DEFAULT false,
  google_verified BOOLEAN DEFAULT false,

  -- Engagement
  posts_count INTEGER NOT NULL DEFAULT 0,
  helpful_votes_received INTEGER NOT NULL DEFAULT 0,
  reports_received INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  is_moderator BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_metro_area ON users(metro_area_id);
CREATE INDEX idx_users_is_moderator ON users(is_moderator) WHERE is_moderator = true;
CREATE INDEX idx_users_trust_level ON users(trust_level);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone can read user profiles (public data)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can insert their own profile during signup
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Only moderators can delete users
CREATE POLICY "Moderators can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "metro_area_id": "19100",
  "zip_code": "75201",
  "trust_level": 1,
  "phone_verified": true,
  "posts_count": 5,
  "helpful_votes_received": 12,
  "reports_received": 0,
  "is_banned": false,
  "is_moderator": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-02-06T08:15:00Z",
  "last_active_at": "2024-02-06T12:00:00Z"
}
```

---

### 2. Metro Areas Tables

**Table:** `metro_areas`

**Primary Key:** `id` (TEXT, CBSA code — e.g., `'19100'` for Dallas-Fort Worth)

**Schema:**
```sql
CREATE TABLE metro_areas (
  id TEXT PRIMARY KEY,           -- CBSA code (e.g., '19100')
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  population INTEGER,            -- Census ACS population estimate
  cbsa_type TEXT DEFAULT 'metropolitan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_metro_areas_state ON metro_areas(state);

-- Row Level Security
ALTER TABLE metro_areas ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Metro areas are viewable by everyone"
  ON metro_areas FOR SELECT
  USING (true);

-- Only service role can write (via API/admin)
CREATE POLICY "Only service role can modify metro areas"
  ON metro_areas FOR ALL
  USING (auth.role() = 'service_role');
```

**Table:** `metro_area_zipcodes`

**Primary Key:** `id` (auto-increment)

**Schema:**
```sql
CREATE TABLE metro_area_zipcodes (
  id BIGSERIAL PRIMARY KEY,
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  UNIQUE(metro_area_id, zip_code)
);

-- Indexes
CREATE INDEX idx_metro_zipcodes_zip ON metro_area_zipcodes(zip_code);
CREATE INDEX idx_metro_zipcodes_metro ON metro_area_zipcodes(metro_area_id);
CREATE UNIQUE INDEX idx_metro_zipcodes_zip_unique ON metro_area_zipcodes(zip_code);

-- Row Level Security
ALTER TABLE metro_area_zipcodes ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Metro ZIP codes are viewable by everyone"
  ON metro_area_zipcodes FOR SELECT
  USING (true);

-- Only service role can write
CREATE POLICY "Only service role can modify metro ZIP codes"
  ON metro_area_zipcodes FOR ALL
  USING (auth.role() = 'service_role');
```

**Example:**
```json
// metro_areas
{
  "id": "19100",
  "name": "Dallas-Fort Worth-Arlington",
  "state": "TX",
  "population": 7637387,
  "cbsa_type": "metropolitan"
}

// metro_area_zipcodes
{
  "id": 1,
  "metro_area_id": "19100",
  "zip_code": "75201"
}
```

**Data Source:** Census Bureau ACS API (metro names + population) + HUD USPS Crosswalk API (ZIP-to-CBSA mappings). Seeded via `npm run seed:metro`.

---

### 3. Posts Table

**Table:** `posts`

**Primary Key:** `id` (UUID)

**Schema:**
```sql
CREATE TYPE post_category AS ENUM ('housing', 'jobs', 'emergency', 'travel');
CREATE TYPE post_status AS ENUM ('active', 'expired', 'removed', 'pending');

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category post_category NOT NULL,

  -- Location
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id),
  location_zip_code TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',

  -- Category-specific fields (JSONB for flexibility)
  fields JSONB NOT NULL DEFAULT '{}',

  -- Status
  status post_status NOT NULL DEFAULT 'active',
  expiry_date TIMESTAMPTZ NOT NULL,

  -- Engagement
  views_count INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_posts_metro_category_status_created
  ON posts(metro_area_id, category, status, created_at DESC);
CREATE INDEX idx_posts_metro_status_expiry
  ON posts(metro_area_id, status, expiry_date);
CREATE INDEX idx_posts_author_created
  ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_expiry ON posts(expiry_date) WHERE status = 'active';

-- GIN index for JSONB fields
CREATE INDEX idx_posts_fields ON posts USING GIN(fields);

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active posts
CREATE POLICY "Active posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'active');

-- Verified users (trust level 1+) can create posts
CREATE POLICY "Verified users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND trust_level >= 1
    )
    AND author_id = auth.uid()
    AND status = 'active'
  );

-- Post authors and moderators can update posts
CREATE POLICY "Authors and moderators can update posts"
  ON posts FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Post authors and moderators can delete posts
CREATE POLICY "Authors and moderators can delete posts"
  ON posts FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );
```

#### Post Field Schemas (JSONB)

**Housing:**
```typescript
{
  rentAmount: number;
  moveInDate: string; // ISO date
  roomType: 'private' | 'shared' | 'entire-place';
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  utilitiesIncluded: boolean;
  petsAllowed: boolean;
  parking: boolean;
  lease: 'month-to-month' | 'fixed-term';
  contactMethod: 'in-app' | 'phone' | 'email';
}
```

**Jobs:**
```typescript
{
  jobTitle: string;
  companyName: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  payRate: {
    min: number;
    max: number;
    type: 'hourly' | 'annual' | 'per-project';
  };
  experienceRequired: 'entry' | 'mid' | 'senior';
  benefits: string[];
  remote: boolean;
  contactMethod: 'in-app' | 'email' | 'apply-url';
  applyUrl?: string;
}
```

**Emergency:**
```typescript
{
  emergencyType: 'medical' | 'housing' | 'legal' | 'financial' | 'other';
  urgency: 'critical' | 'high' | 'medium';
  assistanceNeeded: string[];
  contactPhone: string;
  contactName: string;
  verified: boolean;
  verifiedBy?: string; // UUID
  verifiedAt?: string; // ISO timestamp
  redAlertSent: boolean;
}
```

**Travel:**
```typescript
{
  travelDate: string; // ISO date
  route: {
    from: string;
    to: string;
  };
  airline?: string;
  seatsAvailable: number;
  carryingPackages: boolean;
  packageDetails?: string;
  contactMethod: 'in-app' | 'phone';
}
```

**Example (Housing Post):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "author_id": "550e8400-e29b-41d4-a716-446655440000",
  "category": "housing",
  "metro_area_id": "19100",
  "location_zip_code": "75201",
  "location_city": "Dallas",
  "location_state": "TX",
  "title": "1 Bedroom Available in Uptown Dallas",
  "description": "Clean, furnished room in 2BR apartment. Close to DART...",
  "photos": ["https://res.cloudinary.com/..."],
  "fields": {
    "rentAmount": 800,
    "moveInDate": "2024-03-01",
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
  "expiry_date": "2024-03-30T00:00:00Z",
  "views_count": 45,
  "responses_count": 3,
  "reports_count": 0,
  "created_at": "2024-02-01T10:00:00Z",
  "updated_at": "2024-02-01T10:00:00Z"
}
```

---

### 4. Conversations Tables

**Table:** `conversations`

**Primary Key:** `id` (UUID)

**Schema:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_post ON conversations(post_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_time DESC);

-- Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Participants can read conversations
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

-- Verified users can create conversations
CREATE POLICY "Verified users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
  );

-- Participants can update conversations
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );
```

**Table:** `conversation_participants`

**Primary Key:** `id` (auto-increment)

**Schema:**
```sql
CREATE TABLE conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_user_unread
  ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Row Level Security
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can view their own participation records
CREATE POLICY "Users can view own participation"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert themselves as participants
CREATE POLICY "Users can add themselves to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own participation (unread counts)
CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());
```

---

### 5. Messages Table

**Table:** `messages`

**Primary Key:** `id` (UUID)

**Schema:**
```sql
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  image_url TEXT,
  system_message_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation_timestamp
  ON messages(conversation_id, timestamp ASC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread
  ON messages(conversation_id, read) WHERE read = false;

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Participants can send messages
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Senders can update their own messages
CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Senders can delete their own messages
CREATE POLICY "Senders can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());
```

**Example:**
```json
// Conversation
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "post_id": "550e8400-e29b-41d4-a716-446655440001",
  "last_message": "Is the room still available?",
  "last_message_time": "2024-02-06T14:30:00Z",
  "created_at": "2024-02-06T14:20:00Z",
  "updated_at": "2024-02-06T14:30:00Z"
}

// Conversation Participants
{
  "id": 1,
  "conversation_id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "photo": "https://...",
  "unread_count": 0
}

// Message
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440002",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Is the room still available?",
  "type": "text",
  "read": false,
  "timestamp": "2024-02-06T14:30:00Z"
}
```

---

### 6. Reports Table

**Table:** `reports`

**Primary Key:** `id` (UUID)

**Schema:**
```sql
CREATE TYPE report_target_type AS ENUM ('post', 'user', 'message');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE report_action AS ENUM ('removed', 'warned', 'banned', 'none');

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action report_action,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_reported_by ON reports(reported_by);

-- Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Only moderators can read reports
CREATE POLICY "Moderators can view reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Verified users can create reports
CREATE POLICY "Verified users can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
    AND reported_by = auth.uid()
  );

-- Only moderators can update reports
CREATE POLICY "Moderators can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Only moderators can delete reports
CREATE POLICY "Moderators can delete reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "reported_by": "550e8400-e29b-41d4-a716-446655440000",
  "target_type": "post",
  "target_id": "550e8400-e29b-41d4-a716-446655440001",
  "reason": "Spam or scam",
  "description": "This post looks like a rental scam...",
  "status": "pending",
  "created_at": "2024-02-06T15:00:00Z"
}
```

---

### 7. Notifications Table

**Table:** `notifications`

**Primary Key:** `id` (UUID)

**Schema:**
```sql
CREATE TYPE notification_type AS ENUM ('message', 'post_response', 'emergency_alert', 'system');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_sent ON notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = false;

-- Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
```

---

## Data Relationships

### Foreign Keys

All relationships are enforced via foreign keys:

- `users.metro_area_id` → `metro_areas.id`
- `posts.author_id` → `users.id`
- `posts.metro_area_id` → `metro_areas.id`
- `conversations.post_id` → `posts.id`
- `conversation_participants.conversation_id` → `conversations.id`
- `conversation_participants.user_id` → `users.id`
- `messages.conversation_id` → `conversations.id`
- `messages.sender_id` → `users.id`
- `reports.reported_by` → `users.id`
- `reports.reviewed_by` → `users.id`
- `notifications.user_id` → `users.id`

---

## Query Patterns

### Get posts in metro area by category

```sql
SELECT * FROM posts
WHERE metro_area_id = '19100'
  AND category = 'housing'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;
```

**Uses index:** `idx_posts_metro_category_status_created`

### Get user's conversations with unread counts

```sql
SELECT
  c.*,
  cp.unread_count
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE cp.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY c.last_message_time DESC;
```

### Get messages in conversation

```sql
SELECT * FROM messages
WHERE conversation_id = '550e8400-e29b-41d4-a716-446655440002'
ORDER BY timestamp ASC;
```

**Uses index:** `idx_messages_conversation_timestamp`

### Find metro area by ZIP code

```sql
SELECT m.*
FROM metro_areas m
JOIN metro_area_zipcodes z ON m.id = z.metro_area_id
WHERE z.zip_code = '75201'
LIMIT 1;
```

### Get expired posts

```sql
SELECT * FROM posts
WHERE status = 'active'
  AND expiry_date <= NOW();
```

**Uses index:** `idx_posts_expiry`

---

## Database Functions

### Auto-update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Get metro area by ZIP function

```sql
CREATE OR REPLACE FUNCTION get_metro_by_zip(zip TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  state TEXT,
  population INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.state, m.population
  FROM metro_areas m
  JOIN metro_area_zipcodes z ON m.id = z.metro_area_id
  WHERE z.zip_code = zip
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Data Migration from Firestore

### Migration strategy

1. Export Firestore data to JSON
2. Transform data to match PostgreSQL schema
3. Import using SQL COPY or bulk insert
4. Verify data integrity

### Example migration script

```typescript
// scripts/migrateFromFirestore.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateUsers() {
  const usersSnapshot = await firestore.collection('users').get();

  const users = usersSnapshot.docs.map(doc => ({
    id: doc.id,
    email: doc.data().email,
    name: doc.data().name,
    // Map all fields, converting naming conventions
    metro_area_id: doc.data().metroAreaId,
    zip_code: doc.data().zipCode,
    trust_level: doc.data().trustLevel,
    // ... rest of fields
  }));

  const { error } = await supabase.from('users').insert(users);
  if (error) throw error;

  console.log(`Migrated ${users.length} users`);
}

// Similar functions for posts, conversations, etc.
```

---

## Backup Strategy

### Automated Backups

Supabase provides automated daily backups on paid plans. For custom backups:

```bash
# Using pg_dump
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --format=custom \
  --file=backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  backup_20240206.dump
```

### Point-in-Time Recovery (PITR)

Available on Pro plan and above, allows restoration to any point within the last 7-30 days.

---

## Real-time Subscriptions

Supabase provides real-time functionality for listening to database changes:

```typescript
// Subscribe to new messages in a conversation
const subscription = supabase
  .from('messages')
  .on('INSERT', payload => {
    console.log('New message:', payload.new);
  })
  .subscribe();

// Subscribe to post updates in metro area
supabase
  .from('posts')
  .on('*', payload => {
    console.log('Post changed:', payload);
  })
  .filter('metro_area_id', 'eq', '19100')
  .subscribe();
```

---

## Performance Optimization

### Materialized Views

For expensive queries, create materialized views:

```sql
-- View for user engagement stats
CREATE MATERIALIZED VIEW user_engagement_stats AS
SELECT
  u.id,
  u.name,
  u.posts_count,
  u.helpful_votes_received,
  COUNT(DISTINCT c.id) as conversations_count,
  COUNT(DISTINCT m.id) as messages_sent
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
LEFT JOIN conversation_participants cp ON u.id = cp.user_id
LEFT JOIN conversations c ON cp.conversation_id = c.id
LEFT JOIN messages m ON u.id = m.sender_id
GROUP BY u.id, u.name, u.posts_count, u.helpful_votes_received;

-- Refresh periodically
REFRESH MATERIALIZED VIEW user_engagement_stats;
```

### Query optimization tips

1. Use appropriate indexes (already defined above)
2. Use `EXPLAIN ANALYZE` to understand query plans
3. Avoid N+1 queries by using JOINs or batch requests
4. Use connection pooling (Supabase provides this)
5. Cache frequently accessed data in application layer

---

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
