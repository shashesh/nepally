# Supabase Setup Guide

Comprehensive guide for setting up Supabase for the Nepally project.

## Supabase Project Creation

### 1. Create Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New project"
3. Select your organization or create one
4. Enter project details:
   - **Name**: Nepally (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Start with Free tier (upgrade later as needed)
5. Click "Create new project"
6. Wait 2-3 minutes for project provisioning

### 2. Get Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon) > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public** API key (for client-side)
   - **service_role** key (for server-side, keep secret!)

3. Add these to your environment files:

**apps/web/.env.local:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**apps/mobile/.env:**

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Authentication Setup

### 1. Enable Email Authentication

1. Go to **Authentication** > **Providers**
2. **Email** is enabled by default
3. Configure settings:
   - Enable **Confirm email**: Recommended for production
   - Enable **Secure email change**: Recommended
   - **Mailer templates**: Customize email templates (optional)

### 2. Enable Phone Authentication

> **Note (2026-04-13):** Phone SMS authentication was **removed 2026-03-25**. Current auth is email + Google only. This section and the Twilio secrets section below are retained for historical reference in case phone auth is reintroduced.

1. Go to **Authentication** > **Providers**
2. Click **Phone**
3. Enable **Phone** provider
4. Choose SMS provider:
   - **Twilio** (recommended)
   - **MessageBird**
   - **Textlocal**
   - **Vonage**

**Twilio Setup:**

1. Create account at [Twilio](https://www.twilio.com/)
2. Get Account SID and Auth Token
3. Get a phone number
4. Add credentials in Supabase:

   ```text
   Twilio Account SID: ACxxxxxxxxxxxx
   Twilio Auth Token: your-auth-token
   Twilio Phone Number: +1234567890
   ```

**Rate Limits:**

- Free tier: Reasonable limits for development
- Production: Configure rate limiting in Authentication settings

### 3. Enable Google OAuth (Optional)

1. Go to **Authentication** > **Providers**
2. Click **Google**
3. Enable **Google** provider
4. Get OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs:

     ```text
     https://xxxxx.supabase.co/auth/v1/callback
     ```

5. Add Client ID and Secret in Supabase

### 4. Enable Facebook OAuth (Optional)

1. Go to **Authentication** > **Providers**
2. Click **Facebook**
3. Enable **Facebook** provider
4. Get OAuth credentials:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create app and get App ID and App Secret
   - Add redirect URI:

     ```text
     https://xxxxx.supabase.co/auth/v1/callback
     ```

5. Add App ID and Secret in Supabase

### 5. Configure Site URL and Redirect URLs

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL**: Your production domain (e.g., `https://nepally.us`)
3. Add **Redirect URLs**:

   ```text
   http://localhost:3000/**
   https://nepally.us/**
   https://your-preview-url.vercel.app/**
   nepally://** (mobile deep linking / Google OAuth callback: nepally://auth/callback)
   ```

## Database Setup

### 1. Run Initial Migration

Using Supabase CLI (recommended):

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migration to Supabase
supabase db push
```

Or manually via SQL Editor:

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/migrations/001_schema.sql`
3. Copy entire content
4. Paste into SQL Editor
5. Click **Run**

### 2. Verify Tables

1. Go to **Table Editor**
2. Verify all tables are created:
   - users
   - metro_areas
   - metro_area_zipcodes
   - posts
   - conversations
   - conversation_participants
   - messages
   - reports
   - notifications

### 3. Set up Row Level Security (RLS)

RLS policies are included in the migration. Verify:

1. Go to **Authentication** > **Policies**
2. Check each table has appropriate policies
3. Test policies using Supabase's policy tester

### 4. Seed Metro Areas Data

Create a script to populate metro areas:

```typescript
// scripts/seedMetroAreas.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Metro areas are now seeded automatically from Census + HUD APIs.
// See scripts/seed-metro-data.ts for the full implementation.
// IDs are CBSA codes (e.g., '19100' for Dallas-Fort Worth-Arlington).

async function seed() {
  // Use the automated seed script instead:
  // npm run seed:metro
  console.log('Run: npm run seed:metro');
}

seed();
```

Run the seed script:

```bash
# First, copy and fill in your API keys:
cp scripts/.env.example scripts/.env

# Then run:
npm run seed:metro
```

## Storage Setup

### 1. Buckets

The migrations create every bucket, so there is nothing to set up by hand in **Storage**. All four buckets are public: the apps show photos through their public object URLs (`getPublicUrl`), and the storage API serves those without checking RLS.

| Bucket           | Created in                       | Object path                                  | Shared API (`packages/shared/src/api/storage.ts`)              |
| ---------------- | -------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `avatars`        | `003_storage.sql`                | `<userId>.jpg` at the bucket root            | `uploadProfilePhoto` (upsert), `deleteProfilePhoto`            |
| `post-photos`    | `003_storage.sql`                | `<userId>/<timestamp>-<random>-<name>.<ext>` | `uploadPostPhoto(s)`, `deletePostPhotos`                       |
| `event-photos`   | `006_events.sql`                 | `<userId>/<timestamp>-<random>-<name>.<ext>` | `uploadEventPhoto` (no delete yet)                             |
| `listing-photos` | `015_listing_photos_storage.sql` | `<userId>/<timestamp>-<random>-<name>.<ext>` | `uploadListingPhoto(s)`, `deleteListingPhotos` (no caller yet) |

The migrations set no `file_size_limit` or `allowed_mime_types` on the buckets. The shared API checks type and size for post, event and listing photos before uploading. Bucket-level limits are on the SEC-06 hardening backlog in the [production launch plan](../plans/active/2026-09-18-production-launch.md).

### 2. Storage Policies

Every policy on `storage.objects` is owner-only. Through the Storage API (list, download, signed URLs, upload, overwrite, delete), a member can reach their own objects and nobody else's. Public URLs stay readable by anyone, because they never go through these policies. Each policy tests `auth.role() = 'authenticated'` plus ownership:

- `avatars`: `name = auth.uid()::text || '.jpg'`. The INSERT policy also requires the object to sit at the bucket root.
- `post-photos`, `event-photos`, `listing-photos`: the first folder of the path is the member's id, `(storage.foldername(name))[1] = auth.uid()::text`.

| Command | Policies                                                                                            | Migrations                              |
| ------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| SELECT  | "Users can view own avatar" / "… own post photos" / "… own event photos" / "… own listing photos"   | `039_storage_owner_select_policies.sql` |
| INSERT  | "Users can upload own avatar" / "… own post photos" / "… own event photos" / "… own listing photos" | `003`, `006`, `015`                     |
| UPDATE  | "Users can update own avatar" / "… own post photos" / "… own event photos" / "… own listing photos" | `003`, `006`, `015`                     |
| DELETE  | "Users can delete own avatar" / "… own post photos" / "… own event photos" / "… own listing photos" | `003`, `006`, `015`                     |

The SELECT policies matter even though the apps never download through RLS. Several storage operations read the row under RLS as well as writing it:

| Storage call                                | `storage.objects` permissions it needs                      |
| ------------------------------------------- | ----------------------------------------------------------- |
| `upload()` (`upsert: false`)                | INSERT                                                      |
| `upload()` with `upsert: true`              | INSERT + SELECT, plus UPDATE when the object already exists |
| `remove()`                                  | SELECT and DELETE                                           |
| `list()`, `download()`, `createSignedUrl()` | SELECT                                                      |
| `move()`                                    | SELECT and UPDATE                                           |
| `copy()`                                    | SELECT and INSERT                                           |
| `getPublicUrl()` and public URL reads       | none                                                        |

The upsert row applies even when the object doesn't exist yet. The storage API checks an upsert with `INSERT … ON CONFLICT … DO UPDATE … RETURNING *`, and with `RETURNING` Postgres checks the new row against the SELECT policies.

Without SELECT, `remove()` deletes nothing and still reports success. The storage API cannot see the row, so its DELETE matches zero rows, and the file stays reachable at its public URL. Every avatar upload fails too, first-time ones included, because `uploadProfilePhoto` always upserts. That was the state of every bucket from `027_security_warnings_hardening.sql` until `039`: migration 027 dropped the broad "Anyone can view …" SELECT policies and nothing replaced them.

**Checking it.** `npm run test:security:storage` (`scripts/security/storage-rls-smoke.ts`) exercises the calls the apps use against a live project, with two throwaway members. It checks first-time and repeat avatar upserts, a plain post photo upload, another member's `remove()` deleting nothing, anon `list()` of every bucket coming back empty, and the owner's `remove()` really deleting. Run it against staging after any migration that touches `storage.objects` policies. See [setup-and-testing.md](../guides/setup-and-testing.md#security-smoke-tests) for credentials.

**Never add a broad `USING (bucket_id = '<bucket>')` SELECT policy.** That lets anyone, anon included, list every object in the bucket. It is what 027 removed, and Supabase's `public_bucket_allows_listing` advisor flags it. The owner-scoped SELECT policies from 039 do not trip that advisor.

### 3. Configure Image Transformations (Optional)

Supabase supports image transformations on the fly:

```typescript
// Get optimized image
const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}.jpg`, {
  transform: {
    width: 200,
    height: 200,
    resize: 'cover',
  },
});
```

## Edge Functions Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase Locally (Optional)

```bash
supabase init
```

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy expire-posts
supabase functions deploy verify-emergency-post
supabase functions deploy get-metro-by-zip
```

### 4. Set Function Secrets

Edge Functions need environment variables:

```bash
# Set database URL secret
supabase secrets set DATABASE_URL=your-postgres-connection-string

# Set other secrets as needed
supabase secrets set TWILIO_ACCOUNT_SID=your-sid
supabase secrets set TWILIO_AUTH_TOKEN=your-token
```

### 4.1 Push Notification Secrets (NOTIF-02)

For `send-push-notification`, configure these secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=your-vapid-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-vapid-private-key
supabase secrets set VAPID_SUBJECT=mailto:you@example.com

# Optional for higher Expo push throughput
supabase secrets set EXPO_ACCESS_TOKEN=your-expo-access-token
```

Also set web client env var:

```bash
# apps/web/.env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 4.2 Deploy Push Function + Trigger Path (NOTIF-02)

The invocation path is:

1. Any insert into `public.notifications`
2. DB trigger `trigger_enqueue_notification_push_delivery`
3. Trigger function `enqueue_notification_push_delivery()`
4. HTTP call to `/functions/v1/send-push-notification`
5. Edge function fanout to Expo + Web Push tokens from `device_tokens`

#### Required database settings

The trigger function reads two PostgreSQL custom settings that must be configured before push delivery will work. Without them the trigger skips the HTTP call and logs a warning (it will not error or block notification inserts).

| Setting                         | Description                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| `app.settings.supabase_url`     | Full Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `app.settings.service_role_key` | Service-role secret key from **Project → API → service_role**       |

Set them via the Supabase SQL editor or `psql`:

```sql
-- 'postgres' is the standard database name on hosted Supabase projects.
-- Replace it with your actual database name if it differs.
ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET "app.settings.service_role_key" = '<your-service-role-key>';
```

> **Security note:** The service-role key grants admin access; never expose it to the client or store it in application environment variables accessible to front-end code.

**Local development:** Set these in your local Supabase config or skip push delivery by leaving them unset — the trigger safely no-ops with a `RAISE WARNING` log when either setting is missing.

Deploy steps:

```bash
# 1) Apply latest migration (includes push fanout trigger)
supabase db push

# 2) Configure the required DB settings (see above)

# 3) Deploy function
supabase functions deploy send-push-notification
```

### 4.3 Validate Push Fanout End-to-End (NOTIF-02)

```sql
-- Create a test notification for an existing user UUID
INSERT INTO public.notifications (user_id, type, title, body, data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system',
  'Push test',
  'Testing push fanout path',
  '{}'::jsonb
);
```

Expected behavior:

1. Trigger runs automatically on insert.
2. Edge function receives payload and fetches `device_tokens` for the user.
3. Expo and/or web push deliveries are attempted for available tokens.
4. Function logs show sent/error counts.

### 5. Configure Function Cron Jobs

For scheduled functions like `expire-posts`:

1. Go to **Database** > **Extensions**
2. Enable **pg_cron** extension
3. Create cron job:

```sql
-- Run expire-posts function daily at midnight
SELECT cron.schedule(
  'expire-posts-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/expire-posts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

Or use external cron service (like GitHub Actions, Vercel Cron, etc.).

## Local Development with Supabase CLI

### 1. Start Local Supabase

```bash
# Start all services (database, auth, storage, edge functions)
supabase start
```

This starts:

- **Database**: `postgresql://postgres:postgres@localhost:54322/postgres`
- **API**: `http://localhost:54321`
- **Studio**: `http://localhost:54323`
- **Inbucket** (email testing): `http://localhost:54324`

### 2. Use Local Supabase in Development

Update your environment files for local development:

**apps/web/.env.local:**

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

**apps/mobile/.env:**

```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

Get local keys with:

```bash
supabase status
```

### 3. Create Migrations

```bash
# Generate migration from changes
supabase db diff -f migration_name

# Create empty migration
supabase migration new migration_name
```

### 4. Reset Local Database

```bash
supabase db reset
```

### 5. Test Edge Functions Locally

```bash
# Serve functions locally
supabase functions serve

# Invoke function
curl -i --location --request POST 'http://localhost:54321/functions/v1/get-metro-by-zip' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"zip":"75201"}'
```

## Security Best Practices

### 1. Row Level Security (RLS)

- **Always** enable RLS on all tables
- Test policies thoroughly
- Use `auth.uid()` for user-specific policies
- Use `auth.role()` for role-based policies

### 2. API Keys

- **Never** commit `service_role` key to Git
- Use `anon` key for client-side
- Use `service_role` key only on server-side
- Rotate keys periodically

### 3. Database Secrets

```bash
# Store secrets in Supabase Vault
INSERT INTO vault.secrets (name, secret)
VALUES ('stripe_secret_key', 'sk_live_...');

-- Access in functions
SELECT decrypted_secret FROM vault.decrypted_secrets
WHERE name = 'stripe_secret_key';
```

### 4. Rate Limiting

1. Go to **Authentication** > **Rate Limits**
2. Configure:
   - Login attempts: 5 per hour
   - Signup attempts: 10 per hour
   - Password reset: 3 per hour
   - Email send: 10 per hour

### 5. Enable Realtime RLS

Realtime subscriptions respect RLS:

```typescript
const subscription = supabase
  .from('posts')
  .on('INSERT', (payload) => {
    // Only receives posts user has access to
    console.log(payload);
  })
  .subscribe();
```

## Monitoring and Logs

### 1. View Logs

**Database Logs:**

1. Go to **Logs** > **Database**
2. Filter by query, error, or slow queries

**Edge Function Logs:**

```bash
# View logs for specific function
supabase functions logs expire-posts

# Stream logs
supabase functions logs expire-posts --follow
```

**API Logs:**

1. Go to **Logs** > **API**
2. Monitor requests, errors, and performance

### 2. Set Up Alerts (Pro Plan)

1. Go to **Reports** > **Alerts**
2. Create alerts:
   - High CPU usage
   - High memory usage
   - Slow queries
   - Error rate threshold

### 3. Monitor Database Performance

1. Go to **Database** > **Query Performance**
2. Identify slow queries
3. Use `EXPLAIN ANALYZE` to optimize

```sql
EXPLAIN ANALYZE
SELECT * FROM posts
WHERE metro_area_id = '19100'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;
```

### 4. Monitor API Usage

1. Go to **Settings** > **Billing**
2. View usage:
   - Database size
   - Bandwidth
   - Storage
   - Edge Function invocations

## Backup and Recovery

### 1. Automated Backups

- **Free tier**: No automated backups
- **Pro tier**: Daily backups, 7-day retention
- **Enterprise**: Custom backup schedules

### 2. Manual Backup

```bash
# Export database
supabase db dump -f backup.sql

# Export specific table
supabase db dump --table users -f users_backup.sql
```

### 3. Point-in-Time Recovery (PITR)

Available on Pro plan:

1. Go to **Database** > **Backups**
2. Click **Restore**
3. Select timestamp
4. Confirm restoration

### 4. Export Data to JSON

```typescript
// Export all users
const { data, error } = await supabase.from('users').select('*');

if (data) {
  fs.writeFileSync('users_backup.json', JSON.stringify(data, null, 2));
}
```

## Troubleshooting

### Issue: Cannot connect to database

**Solution:** Check connection string and firewall rules:

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

### Issue: RLS policies not working

**Solution:**

1. Verify RLS is enabled: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`
2. Check policy with `auth.uid()` matches actual user ID
3. Test in SQL Editor with `set request.jwt.claims` to simulate user

```sql
-- Simulate authenticated user
set request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Test query
SELECT * FROM posts WHERE author_id = 'user-uuid-here';
```

### Issue: Storage uploads failing

**Solution:** Check storage policies and bucket configuration:

1. Verify bucket exists
2. Check file size limit
3. Verify MIME type is allowed
4. Check storage policies. Any upload with `upsert: true` needs a SELECT policy as well as INSERT, even for a new object, plus UPDATE when the object already exists (see [Storage Policies](#2-storage-policies)).

### Issue: A photo delete reports success but the file is still there

**Solution:** `remove()` needs a SELECT policy as well as DELETE. Without one it deletes nothing and returns no error. Check that the owner-only SELECT policies from `039_storage_owner_select_policies.sql` exist:

```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;
```

Then run `npm run test:security:storage` against the project to exercise the real Storage API calls.

### Issue: Edge Functions timing out

**Solution:**

1. Increase function timeout in `supabase/functions/function-name/index.ts`
2. Optimize database queries
3. Use connection pooling
4. Consider breaking into smaller functions

### Issue: Realtime not working

**Solution:**

1. Enable Realtime on table:

   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE posts;
   ```

2. Check RLS policies allow user to read
3. Verify subscription filter syntax

## Performance Optimization

### 1. Connection Pooling

Supabase provides connection pooling by default:

- Direct connection: `db.xxxxx.supabase.co:5432`
- Pooled connection: `db.xxxxx.supabase.co:6543` (recommended for serverless)

### 2. Indexes

Ensure proper indexes exist (already in migration):

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### 3. Query Optimization

```sql
-- Use EXPLAIN to analyze queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM posts WHERE metro_area_id = '19100';
```

### 4. Caching

Implement caching at application level:

```typescript
// Use SWR or React Query for client-side caching
import useSWR from 'swr';

const { data, error } = useSWR(
  'posts',
  async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('metro_area_id', '19100')
      .limit(20);
    return data;
  },
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 30000, // 30 seconds
  }
);
```

## Scaling Considerations

### Free Tier Limits

- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- Unlimited API requests
- 2 million Edge Function invocations

### Pro Tier ($25/month)

- 8 GB database space
- 100 GB file storage
- 250 GB bandwidth
- Daily backups
- Email support

### Enterprise Tier

- Custom resources
- SLA
- Dedicated support
- Advanced security features

## Next Steps

1. Set up CI/CD for database migrations
2. Configure custom domain
3. Set up monitoring and alerting
4. Implement backup strategy
5. Configure production environment variables
6. Test authentication flows
7. Optimize database queries
8. Set up analytics (optional)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Storage](https://supabase.com/docs/guides/storage)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
