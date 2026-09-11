# Deployment Guide

Complete guide for deploying Nepally mobile and web applications to production.

## Overview

Nepally deploys to three platforms:
1. **Web App** → Vercel
2. **iOS App** → Apple App Store
3. **Android App** → Google Play Store

## Prerequisites

Before deploying, ensure:
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Supabase project created and configured
- ✅ Production environment variables set
- ✅ Domain name configured (for web)

## Web App Deployment (Vercel)

### 1. Create Vercel Account

1. Go to [vercel.com](https://vercel.com/)
2. Sign up with GitHub
3. Authorize Vercel to access your repository

### 2. Import Project

1. Click "Add New Project"
2. Select your GitHub repository
3. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### 3. Configure Environment Variables

In Vercel dashboard, go to **Settings** > **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configure Custom Domain

1. Go to **Settings** > **Domains**
2. Add your domain: `nepally.us`
3. Update DNS records:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21` (Vercel IP)
4. Add `www` subdomain:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`

### 5. Configure GitHub Actions Deployments (Recommended)

Use GitHub Actions as the deployment controller for all environments. Vercel's built-in Git auto-deploy is **disabled** — all deploys are controlled exclusively via GitHub Actions workflows.

1. **PR preview** (automatic): deploy a Vercel preview on every PR targeting `master`
2. **Dev environment** (automatic): deploy to Vercel preview on every push to `master`
3. **Production environment** (manual): run a manual workflow that deploys latest `master` only after approval

This repository now includes:

1. `.github/workflows/preview-vercel.yml`
2. `.github/workflows/deploy-vercel-dev.yml`
3. `.github/workflows/deploy-vercel-prod.yml`

### 6. Configure GitHub Environments

In GitHub repository settings, create two environments:

1. `dev`
2. `production`

For `production`, enable:

1. **Required reviewers** (release approvers)
2. Optional wait timer
3. Branch restriction to `master`

### 7. Configure GitHub Secrets and Variables

Set these values:

**Environment secret (or repository secret):**

1. `VERCEL_TOKEN`

**Environment or repository variables:**

1. `VERCEL_ORG_ID`
2. `VERCEL_PROJECT_ID` — single Vercel project used by both dev and production workflows

You do **not** need two separate Vercel projects. One project handles both environments:
- Dev deploys create Preview deployments (unique URL per deploy)
- Production deploys promote to the Production domain (`nepally.us`)

Scope environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) per Vercel environment in the project dashboard under **Settings > Environment Variables**, selecting **Preview** or **Production** scope as appropriate.

### 8. Disable Vercel Auto-Deploy

Since GitHub Actions controls all deployments, Vercel's built-in Git integration auto-deploy must be **disabled** to prevent duplicate/unwanted production deploys:

1. Go to Vercel dashboard → project **Settings → Git**
2. Disable auto-deploy (or disconnect the Git integration)

### 9. Deployment Behavior

**PR preview (automatic):**

1. Trigger: `pull_request` targeting `master` (path-filtered for web/shared files)
2. Workflow: `.github/workflows/preview-vercel.yml`
3. No guard checks — preview only for testing before merge
4. Posts/updates a comment on the PR with the preview URL
5. Target: Vercel preview deployment (unique URL per deploy)

**Dev deploy (automatic):**

1. Trigger: `workflow_run` — fires automatically after CI completes on `master`
2. Workflow: `.github/workflows/deploy-vercel-dev.yml`
3. Only runs if CI succeeded (no separate guard needed)
4. Target: Vercel preview/dev project

**Production deploy (manual):**

1. Trigger: `workflow_dispatch`
2. Workflow: `.github/workflows/deploy-vercel-prod.yml`
3. Always checks out latest `master`
4. Guard verifies all CI checks passed on the master commit
5. Requires GitHub environment approval before deployment
6. Target: Vercel production project

### 10. Monitor Deployment

View deployment logs in Vercel dashboard:
- **Deployments** tab shows all deployments
- Click deployment to see logs
- Check for build errors

### 11. Test Production Site

1. Visit https://nepally.us
2. Test key features:
   - Sign up / Login
   - View posts
   - Create post
   - Search
   - SEO (check page source for meta tags)

### 12. Release Runbook

Use this release sequence:

1. Merge tested PRs to `master`
2. Confirm automatic dev deployment succeeds
3. Perform dev smoke checks
4. Trigger manual production workflow from Actions tab
5. Approver reviews and approves `production` environment deployment
6. Perform production smoke checks

Rollback options:

1. Redeploy a previous successful deployment from Vercel dashboard
2. Re-run production workflow after reverting `master` to a safe commit

### 13. Troubleshooting (GitHub Actions + Vercel)

1. **`Error: No existing credentials found` or token failures**
  - Confirm `VERCEL_TOKEN` is set in the correct GitHub environment (`dev` or `production`).
  - Regenerate the token in Vercel if it was rotated or revoked.

2. **`Project not found` during `vercel pull`/`vercel deploy`**
  - Verify `VERCEL_ORG_ID` and project ID variables match the target Vercel team/project.
  - Ensure `VERCEL_PROJECT_ID` is set correctly in the repository variables (single project ID used by both dev and production workflows).

3. **Production workflow starts but cannot deploy**
  - Check `production` GitHub environment protection rules for pending approvals.
  - Confirm the workflow was dispatched from `master`.

4. **Build passes locally but fails in Actions**
  - Confirm lockfile is committed and `npm ci` is used.
  - Check Node version parity (workflows run Node 24).
  - Verify required env vars are present in Vercel for the target environment.

5. **Dev deploy did not trigger after a merge**
  - Dev deploy uses `workflow_run` — it fires after CI completes on `master`.
  - Confirm CI ran successfully on the merge commit (check Actions → CI workflow).
  - If CI passed but deploy didn't run, the merge may not have changed web-relevant files (`apps/web/`, `packages/shared/`, `package.json`, `package-lock.json`). The deploy workflow skips non-web changes.

6. **Production deploy blocked with missing checks**
  - CI runs automatically on push to `master`. Wait for CI to complete before triggering the production workflow.
  - Check CI status at Actions → CI workflow for the target commit.

7. **Production deploy blocked with failed checks**
  - Open Actions for the target commit and ensure all required jobs are green:
    - `PR gate`
    - `Lint`
    - `Lint guards`
    - `Type check`
    - `Unit tests`
    - `Coverage`
    - `Web E2E tests`
  - Re-run CI or merge a fix PR, then retrigger the production workflow.

8. **Wrong environment values in runtime**
  - Verify Vercel environment variable scopes (Preview vs Production).
  - Redeploy after env-var updates; Vercel does not retroactively apply new env values to old deployments.

9. **Need urgent rollback**
  - Fastest path: redeploy the last known good production deployment from Vercel dashboard.
  - Controlled path: revert `master` and run the manual production workflow again.

### Vercel CLI (Optional)

For manual deployments:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod
```

## Mobile App Deployment (Expo EAS)

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure EAS

`apps/mobile/eas.json` is committed with three build profiles (`development`, `preview`, `production`) and remote app-version management (`autoIncrement` on production). `apps/mobile/app.json` carries the store identity:

| Field | Value |
|-------|-------|
| `slug` | `nepally` |
| `scheme` (deep links / OAuth callback) | `nepally` → `nepally://auth/callback` |
| `ios.bundleIdentifier` | `us.nepally.app` |
| `android.package` | `us.nepally.app` |

One-time setup, in this order:

1. `cd apps/mobile && eas init` — links the app to your Expo account and writes `extra.eas.projectId` into `app.json`. **Push tokens do not work in a store build until this id exists** (`expo-notifications` reads it from the app config), so commit the change.
2. Add the build-time public env vars to EAS (`eas env:create` or the Expo dashboard) for every profile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. In the Supabase dashboard → **Authentication → URL Configuration**, add `nepally://**` to the redirect URLs (the Google sign-in callback is `nepally://auth/callback`). See [supabase-setup.md](../architecture/supabase-setup.md).
4. The Maestro E2E flows in `apps/mobile/.maestro` already target `us.nepally.app`.

The AsyncStorage keys still use the historical `@nusa:` prefix on purpose — renaming them would sign every existing user out.

### 4. Build iOS App

#### Prerequisites for iOS:
- **Apple Developer Account** ($99/year)
- **App Store Connect** app registered
- **Certificates and profiles** (EAS handles this automatically)

#### Build Command:

```bash
cd apps/mobile
eas build --platform ios --profile production
```

This:
1. Uploads code to Expo servers
2. Installs dependencies
3. Compiles React Native to native iOS code
4. Creates `.ipa` file
5. Provides download link

**Build time:** ~15-20 minutes

#### Submit to App Store:

```bash
eas submit --platform ios
```

You'll need:
- Apple ID
- App-specific password (generate in Apple ID settings)
- Bundle identifier (e.g., `us.nepally.app`)

### 5. Build Android App

#### Prerequisites for Android:
- **Google Play Developer Account** ($25 one-time)
- **Keystore** for signing (EAS generates automatically)

#### Build Command:

```bash
cd apps/mobile
eas build --platform android --profile production
```

This creates an `.aab` (Android App Bundle) file.

**Build time:** ~15-20 minutes

#### Submit to Google Play:

```bash
eas submit --platform android
```

You'll need:
- Google Play service account key (JSON file)
- App bundle identifier (e.g., `us.nepally.app`)

### 6. App Store Listings

#### iOS App Store

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app:
   - **Name:** Nepally
   - **Bundle ID:** `us.nepally.app`
   - **SKU:** `nepally-app`
   - **User Access:** Full Access
3. Fill app information:
   - **Category:** Social Networking
   - **Screenshots:** (1242x2208 for iPhone, 2048x2732 for iPad)
   - **Description:** (see template below)
   - **Keywords:** nepal, nepalese, community, help, housing, jobs
   - **Support URL:** https://nepally.us/help
   - **Privacy Policy URL:** https://nepally.us/privacy
4. Pricing: **Free**
5. Submit for review

**Review time:** 1-3 days

#### Google Play Store

1. Go to [Google Play Console](https://play.google.com/console/)
2. Create new app:
   - **App name:** Nepally
   - **Default language:** English (US)
   - **App or game:** App
   - **Free or paid:** Free
3. Fill app information:
   - **Category:** Social
   - **Screenshots:** (1080x1920, need 2-8 screenshots)
   - **Description:** (see template below)
   - **Privacy Policy URL:** https://nepally.us/privacy
4. Content rating questionnaire
5. Submit for review

**Review time:** 1-3 days

### App Description Template

```
Nepally - US-Nepal Help Network

Your community platform for the Nepalese diaspora in the USA.

🏠 HOUSING
Find roommates, apartments, and housing opportunities in your area.

💼 JOBS
Discover job openings and career opportunities posted by the community.

🚨 EMERGENCY
Get urgent help from the community when you need it most.

✈️ TRAVEL
Find travel companions and coordinate trips back to Nepal or within the US.

📍 LOCAL FIRST
All content is organized by metro area, so you see what's relevant to you.

🔒 TRUST & SAFETY
Verified users, moderator-approved emergency alerts, and community reporting.

Join the Nepally community today!
```

### 7. Over-the-Air (OTA) Updates

For minor updates (no native code changes), use OTA:

```bash
cd apps/mobile
eas update --branch production
```

This pushes JavaScript changes without app store review.

**Update time:** ~1 minute

**User receives update:** Next time they open the app

## Supabase Deployment

### 1. Deploy Database Migrations

```bash
npx supabase db push
```

This applies all migrations from `supabase/migrations/` to your production database.

### 2. Deploy Edge Functions

```bash
npx supabase functions deploy
```

This deploys all Edge Functions:
- `expire-posts`
- `verify-emergency-post`
- `get-metro-by-zip`

### 3. Verify RLS Policies

Check that Row Level Security policies are active:

```bash
npx supabase db pull
```

Compare local policies with remote to ensure they match.

### 4. Deploy Individual Functions (Optional)

```bash
npx supabase functions deploy expire-posts
npx supabase functions deploy verify-emergency-post
npx supabase functions deploy get-metro-by-zip
```

## CI/CD Pipeline (GitHub Actions)

### 1. Create GitHub Secrets

Go to **Settings** > **Secrets and variables** > **Actions**:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
EXPO_TOKEN
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
```

### 2. Create Workflow Files

**`.github/workflows/deploy-web.yml`:**

```yaml
name: Deploy Web App

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build --workspace=packages/shared
      - run: npm run build --workspace=apps/web
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**`.github/workflows/deploy-mobile.yml`:**

```yaml
name: Build Mobile Apps

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build --workspace=packages/shared
      - run: npx eas-cli build --platform all --non-interactive
        working-directory: apps/mobile
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### 3. Automatic Deployments

Now every push to `main` automatically:
1. Builds and deploys web app to Vercel
2. Builds mobile apps on Expo EAS
3. Runs tests and linting

## Environment Management

### Development
- Local Supabase (via `npx supabase start`)
- Test data
- `.env.development`

### Staging
- Separate Supabase project
- Test data
- `.env.staging`

### Production
- Production Supabase project
- Real data
- `.env.production`

## Rollback Strategy

### Web App

1. Go to Vercel dashboard
2. **Deployments** tab
3. Find previous working deployment
4. Click **Promote to Production**

### Mobile Apps

1. For OTA updates:
   ```bash
   eas update --branch production --message "Rollback"
   ```

2. For full app updates:
   - Increment version in `app.json`
   - Build and submit new version

### Supabase

Use local Supabase to test before deploying:

```bash
npx supabase start
```

To rollback database migrations:

```bash
npx supabase db reset
```

## Monitoring

### Web App (Vercel)

- **Analytics:** Built-in Vercel Analytics
- **Errors:** Integrate Sentry
- **Performance:** Vercel Speed Insights

### Mobile Apps

- **Crashes:** Sentry
- **Analytics:** PostHog or Mixpanel
- **Performance:** React Native Performance

### Backend (Supabase)

- **Usage:** Supabase Dashboard > Settings > Usage
- **Logs:** Supabase Dashboard > Edge Functions > Logs
- **Database:** Supabase Dashboard > Database > Query Performance
- **Alerts:** Set up monitoring via Supabase Dashboard > Settings > Alerts

## Checklist Before Production Launch

- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Supabase migrations deployed
- [ ] RLS policies verified
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] Custom domain configured (web)
- [ ] SSL certificate active
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email/page created
- [ ] App Store assets ready (screenshots, descriptions)
- [ ] Google Play assets ready
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] Monitoring dashboards set up
- [ ] Backup strategy implemented
- [ ] Budget alerts configured

## Post-Launch

1. **Monitor for 24-48 hours:**
   - Check error logs
   - Watch user signups
   - Monitor performance metrics

2. **Gather feedback:**
   - User reviews on app stores
   - In-app feedback forms
   - Support emails

3. **Iterate quickly:**
   - Fix critical bugs immediately
   - Deploy OTA updates for minor issues
   - Plan next release

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Guide](https://support.google.com/googleplay/android-developer/)
