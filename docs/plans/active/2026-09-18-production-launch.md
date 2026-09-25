---
title: Production launch — 12-week plan
status: in-progress
created: 2026-09-18
---

# Production Launch Plan (Sep 21 – Dec 13, 2026)

**Goal:** Nepally is live and open to public signups in six markets by **Tuesday, December 1, 2026**:

- web at `nepally.us`
- Android on Google Play
- iOS on the App Store (it may trail web and Android by a few days if App Review needs another round)

It is monitored and supported by one person. Every kind of failure has a rehearsed rollback or containment path (see [Rollback toolkit](#support-and-incident-operations)).

**Owner:** Shashesh (solo).

- **You:** needs a human with an account, a card, or a signature.
- **Code:** done by Claude, either as a feature-branch PR or as an MCP action you approve first.
- **You + Code:** needs both.

## Decisions (2026-09-18)

1. **Separate production Supabase project.** `nusa-staging` stays the staging project. Every migration goes to staging first, then prod.
2. **Individual developer accounts** on Apple and Google. The seller name is your legal name. Google requires personal accounts to run a closed test with **at least 12 testers for 14 days in a row** before a production release. That puts the closed test on the critical path.
3. **Launch markets:** Dallas–Fort Worth, Atlanta, New York, Houston, San Francisco Bay Area, Los Angeles. The beta runs in two of them first (see [Launch markets](#launch-markets)).
4. **Free to use at launch. Paid promotions and sponsored placements are on for anyone who wants them.** The three existing tiers stay on sale: Featured Listing ($1.99/day), Sponsored Feed ($2.99/day) and Sticky Business ($4.99/day). Purchases happen on the **web** for v1.0 (see [Payments on mobile](#payments-on-mobile)).
5. **If App Review slips, web and Android launch on schedule** and iOS joins when approved.
6. **Long-lived sign-in, like Facebook and Reddit.**
   - People stay signed in on a device until they sign out. There is no inactivity timeout and no maximum session age.
   - Access tokens stay short-lived (1 hour) and refresh silently. Refresh tokens rotate on every use.
   - Sensitive actions ask you to confirm who you are again: deleting the account, or changing email or password. Email accounts re-enter the password; Google and Apple accounts confirm an emailed one-time code.
   - This replaces the March mobile plan's 30-minute inactivity timeout and 30-day maximum age. The mobile app enforces those today (`apps/mobile/src/contexts/AuthContext.tsx`). Removing them ships in its own PR, before W1.
   - The web app already behaves this way.

## Where things stand (verified 2026-09-18)

- **Built:** feed, posts, likes/comments/saves, chat, events, marketplace with promotions (web checkout), web search, profiles, the `/moderation` queue, draft legal pages. CI is green.
- **Notifications:** the in-app UI, API and push pipeline exist, but live push delivery has not been validated. That happens in W3 (NOTIF-02).
- **Domain:** `nepally.us` does not resolve (NXDOMAIN).
- **Database:** only `nusa-staging` exists (24 test accounts, last signup April 2026). There is no production database.
- **Web deploy:** `deploy-vercel-prod.yml` has never run. Dev deploys run on every merge.
- **Monitoring:** no error tracking or analytics in any app.
- **Staging migrations:** `038_search_prefix_fix` is applied on `nusa-staging`, but its tracker row still has the timestamp version `20260918021920`. [migration-workflow.md](../../architecture/migration-workflow.md) still says the tracker ends at `037`.
- **Mobile builds:**
  - `apps/mobile/app.json` has no EAS project id (`eas init` not run), so push tokens cannot register in store builds.
  - `expo-updates` is not installed and there is no `updates.url` / `runtimeVersion`, so over-the-air (OTA) updates are not possible yet. `eas.json` names the channels, but nothing uses them.
- **Store compliance gaps:**
  - no in-app account deletion
  - no Sign in with Apple, although iOS offers Google sign-in
- **Mobile promotion purchase is incomplete.** `PromoteListingScreen` asks `create-promotion-checkout` for a PaymentIntent. But the app has no Stripe SDK, so it never collects payment. It then polls for an activation that can never happen.
- **Mobile dead ends:** "Coming Soon" alerts in Home search (`HomeScreen.tsx`) and on chat avatars (`ConversationItem.tsx`, `MessageThreadScreen.tsx`).
- **Web UI overhaul:** done (2026-09-25). PRs 0–10c merged (#62–#94), including mobile parity with its shared logic and migration 040. Its open follow-ups (none launch-blocking) are listed at the end of the archived [plan](../../archive/plans/2026-09-14-web-ui-overhaul.md).
- **Supabase security advisors:**
  - Leaked-password protection is off.
  - About 30 `SECURITY DEFINER` functions are executable by `anon` through `/rest/v1/rpc`. Most are trigger functions and error when called directly. Two live exposures matter:
    - `increment_listing_views` / `increment_listing_contacts` let anyone inflate counters. Migration 017 revoked `PUBLIC`, but Supabase's explicit `anon` grant is still in the function ACL.
    - `has_user_liked_post` is granted to both `PUBLIC` and `anon`, and reveals whether a given user liked a post.
- **Web hardening:** `next.config.js` sets no security headers, and the service worker references a missing `/icon.png`.
- **Older plans:** open items from [`phase1-remediation-checklist.md`](phase1-remediation-checklist.md) and all five steps of [`mobile-usability-security-hardening.md`](mobile-usability-security-hardening.md) are mapped into this plan in [Folded-in items](#folded-in-items).

## Launch markets

All six exist in `metro_areas` with ZIP coverage on staging. Prod is seeded in W1. Assignment is by ZIP, so a user in a metro with no seeded content lands on an empty feed.

| Market                 | Metro id         | Name in DB                                                       | ZIPs (staging) | Beta wave       |
| ---------------------- | ---------------- | ---------------------------------------------------------------- | -------------- | --------------- |
| Dallas–Fort Worth      | 19100            | Dallas-Fort Worth-Arlington                                      | 384            | Wave 1 (Oct 26) |
| New York               | 35620            | New York-Newark-Jersey City                                      | 1047           | Wave 1 (Oct 26) |
| Atlanta                | 12060            | Atlanta-Sandy Springs-Roswell                                    | 308            | Wave 2 (Nov 9)  |
| Houston                | 26420            | Houston-Pasadena-The Woodlands                                   | 358            | Wave 2 (Nov 9)  |
| San Francisco Bay Area | 41860 (+ 41940?) | San Francisco-Oakland-Fremont (+ San Jose-Sunnyvale-Santa Clara) | 227 (+108)     | Wave 2 (Nov 9)  |
| Los Angeles            | 31080            | Los Angeles-Long Beach-Anaheim                                   | 621            | Wave 2 (Nov 9)  |

**Open question:** does "San Francisco" include San Jose (41940)? South Bay users are assigned to San Jose, not San Francisco. Recommendation: treat both as the Bay Area market and seed both.

Six markets is a lot of ground for one person. These keep it workable:

- **Two beta waves.** DFW and New York first, then the other four two weeks later.
- **One "metro champion" per market** before public launch. This is a volunteer who seeds content and welcomes new members.
- **Seed every market before its wave opens.** Post a pinned welcome, real upcoming events (Tihar), and housing, job and help resources.
- **Watch weekly active posters per metro** and put outreach where density lags.

**The moderator role is global today.** A moderator sees every market's queue and reports and can ban any non-moderator user; `is_moderator` has no metro filter. Only give the role to champions you would trust across all six markets. Other champions seed and welcome without it. Metro-scoped moderation comes after launch.

## Payments on mobile

Boosting a listing is a digital service used inside the app. Apple (guideline 3.1.1) and Google Play expect their own billing for that kind of purchase. For example, Meta passes Apple's fee on to advertisers who boost posts from its iOS app. On top of that, the current mobile flow never collects payment (see [Where things stand](#where-things-stand-verified-2026-09-18)).

- **v1.0:** promotions are **bought on the web** (Stripe Checkout, already built and working). On mobile, the Promote purchase flow is hidden. Promoted and sponsored items still **display** everywhere on mobile: badges, feed injection, sticky placement.
- **After approval:** revisit. Options are a link out to web checkout (currently allowed on the US storefront, but the court case is still in progress, so check at the time) or IAP through RevenueCat.

## Live tracker

Only one week is `In Progress` at a time. Update the row when a week starts and when it ends.

| Week | Dates        | Theme                                          | Status      | Notes                                  |
| ---- | ------------ | ---------------------------------------------- | ----------- | -------------------------------------- |
| W0   | Sep 18–20    | Long-lead accounts and paperwork               | In Progress |                                        |
| W1   | Sep 21–27    | Production environment                         | Not Started |                                        |
| W2   | Sep 28–Oct 4 | Observability                                  | Not Started |                                        |
| W3   | Oct 5–11     | Store compliance                               | Not Started |                                        |
| W4   | Oct 12–18    | Mobile polish, builds, closed test starts      | Not Started | Play 14-day clock must start by Oct 18 |
| W5   | Oct 19–25    | Web feed polish, payments live, store listings | Not Started |                                        |
| W6   | Oct 26–Nov 1 | Beta wave 1 (DFW, NYC)                         | Not Started |                                        |
| W7   | Nov 2–8      | Beta fixes, web create flows                   | Not Started | Tihar season                           |
| W8   | Nov 9–15     | Beta wave 2, App Store submission              | Not Started | Submit iOS by Nov 13                   |
| W9   | Nov 16–22    | Hardening, runbook drills                      | Not Started |                                        |
| W10  | Nov 23–29    | Release candidate, go/no-go                    | Not Started | Thanksgiving Nov 26                    |
| W11  | Nov 30–Dec 6 | **Public launch Dec 1**                        | Not Started |                                        |
| W12  | Dec 7–13     | Hypercare                                      | Not Started | Dec 14–20 is buffer                    |

## Week by week

### W0 — Long-lead items (Sep 18–20)

- [ ] **You:** Register `nepally.us`. Point DNS at Vercel when W1 starts.
- [ ] **You:** Enroll in the Apple Developer Program as an individual ($99/yr).
- [ ] **You:** Create a Google Play Console personal account ($25 one-time).
- [ ] **You:** Recruit 15–20 Android closed testers (12 is the floor; some drop out). Collect their Google account emails.
- [ ] **You:** Upgrade the Supabase org to Pro. This stops auto-pause and adds daily backups and leaked-password protection.
- [ ] **You:** Upgrade Vercel to Pro. The Hobby plan is non-commercial only, and Nepally takes payments.
- [ ] **You:** Send `/terms`, `/privacy`, `/guidelines` to a lawyer. Ask about:
  - governing law
  - the promotion refund policy
  - the 13+ age rule
  - the DMCA notice-and-takedown and repeat-infringer wording
  - whether you owe sales tax on advertising in TX, GA, NY or CA
- [ ] **You:** Register a DMCA designated agent with the US Copyright Office. Registration is only one condition for DMCA safe harbor. `/terms` also needs a notice-and-takedown process and a repeat-infringer policy.
- [ ] **You:** Create `support@nepally.us`. Free forwarding to Gmail (Cloudflare Email Routing) is enough to start.
- [ ] **You:** Get the Census and HUD API keys that `npm run seed:metro` needs (`scripts/.env.example` lists where to register).

### W1 — Production environment (Sep 21–27)

- [ ] **You + Code:** Create the production Supabase project (`nepally-prod`, us-west-2). You approve the cost; Claude creates it through MCP.
- [ ] **Code:** Reconcile staging first:
  - Realign the `038` tracker row on `nusa-staging` (`20260918021920` → `038`).
  - Update the "After (current)" section of `migration-workflow.md` to `001`–`038`.
  - Confirm that staging and the repo list the same migrations.
- [ ] **Code:** Apply `001`–`038` in order on the empty prod database.
  - Use the MCP `apply_migration` tool or the dashboard SQL editor, never `supabase db push`.
  - Realign the tracker rows to `NNN` as [migration-workflow.md](../../architecture/migration-workflow.md) describes.
  - The frozen files are safe on a fresh database.
  - Record the rehearsal in the same doc.
- [ ] **Code:** Run `npm run seed:metro` against prod. The migrations do not seed `metro_areas` or `metro_area_zipcodes`. Check that the six markets exist and their ZIP counts roughly match staging (see [Launch markets](#launch-markets)).
- [ ] **Code:** Migration `039_storage_owner_select_policies`: owner-only SELECT policies on `storage.objects`. Without them every photo delete silently does nothing and every avatar upload fails, first-time ones included (see [supabase-setup.md](../../architecture/supabase-setup.md#2-storage-policies)). Apply to staging and run `npm run test:security:storage` there. Then apply to prod after `001`–`038`.
- [ ] **Code:** One-off orphan reconciliation on staging, after 039. Every file "deleted" since 027 reached staging (tracker version `20260416023723`) is still in its bucket and still public at its URL. With the service role, compare each bucket against the rows that reference it:
  - `post-photos` against `posts.photos`
  - `listing-photos` against `marketplace_listings.photos`
  - `event-photos` against `events.photo_url`
  - `avatars` against `users.profile_photo`

  An avatar whose removal silently failed will not show up as an orphan. Before the PR that added 039, removing an avatar never cleared `users.profile_photo`, so the old URL still points at the file.

  Review the list, then delete the orphans through the Storage API: `remove()` with the service role. Never use SQL `DELETE` on `storage.objects`. Storage's `protect_objects_delete` trigger raises on it, and a SQL delete that got through would still leave the files in the storage backend.

- [x] **Code:** Make the shared storage deletes report partial failure. `deletePostPhotos`, `deleteListingPhotos` and `deleteProfilePhoto` used to check only `error`, so a `remove()` that deleted nothing looked like success. That is how the 027 regression went unnoticed. They now return an error when any requested path is missing from what `remove()` reports deleted, along with `notRemoved`, the paths that may still be in storage.

  The callers act on it:
  - Post photo cleanup on web (`apps/web/src/lib/postSubmit.ts`) and mobile (`CreatePostScreen.tsx`) goes through the shared `cleanUpPostPhotos`. It logs `post_photos_cleanup_failed` with only the paths left behind. The post write has already decided what the member sees, so the failure is logged rather than shown.
  - The shared `removeProfilePhoto` deletes the file first. It stops and returns the error if the delete fails, leaving `users.profile_photo` untouched. The web profile page and mobile `EditProfileScreen` show that error, so the member can try again.

- [ ] **Code:** Migration `040`:
  - Revoke `EXECUTE` from `PUBLIC` **and** from `anon`. Supabase grants `anon` explicitly, which is why 017's `REVOKE ... FROM PUBLIC` left `increment_listing_*` callable.
  - Revoke from `authenticated` too where signed-in users should not call a function.
  - Grant only the intended roles.
  - Apply to staging, run the `test:security:*` smoke tests there, then apply to prod.
- [ ] **Code:** SEC-06 hardening backlog:
  - storage bucket `allowed_mime_types` and `file_size_limit` (avatars, post photos, listing photos)
  - a shared-secret header on the `expire-posts` and `expire-promotions` cron functions
  - mobile session storage moved to `expo-secure-store`. This matters more now that sessions are long-lived (Decision 6).
- [ ] **You:** In both projects:
  - Turn on leaked-password protection.
  - Under Auth → Sessions, leave "Time-box user sessions" and "Inactivity timeout" at never, and "Single session per user" off (Decision 6).
  - Confirm email confirmations are on in prod auth (`enable_confirmations`). The trust ladder does nothing without them.
- [ ] **You:** Set up custom SMTP (Resend or Postmark) for auth email in both projects. The built-in sender allows only a few emails per hour, so launch-day signups would stall at "verify your email".
- [ ] **You:** In prod auth settings, add:
  - the site URL `https://nepally.us`
  - redirect URLs, including the `nepally://**` mobile scheme
  - Google OAuth client IDs and redirects for prod
- [ ] **Code:** Wire prod env vars into Vercel (production environment) and EAS (production profile). Deploy edge functions and set their secrets on prod.
- [ ] **Code:** Web security headers in `next.config.js` (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors). Add the missing `/icon.png`.
- [ ] **Code:** First run of `deploy-vercel-prod.yml` against the prod project, with the custom domain attached.
- [ ] **Code:** Retire the two March plans properly. Every open item from both is already mapped in [Folded-in items](#folded-in-items), so neither loses its tracker. For each file:
  - set its status to `abandoned`, with a pointer to this plan
  - `git mv` it to `docs/archive/plans/`
  - update `docs/INDEX.md` and inbound links

  The mobile plan's "Decisions (Resolved)" section stays readable in the archive.

### W2 — Observability (Sep 28–Oct 4)

See [Monitoring](#monitoring) for the full spec.

- [ ] **You:** Create Sentry, PostHog and Better Stack (or UptimeRobot) accounts. Install the Sentry and PostHog phone apps for alerts.
- [ ] **Code:** Sentry in web (`@sentry/nextjs`), mobile (`@sentry/react-native` + Expo plugin, source maps uploaded by EAS), and edge functions (Deno SDK).
- [ ] **Code:** Analytics event catalogue in `packages/shared` (names + typed properties). Thin PostHog adapters in web and mobile. `promotion_purchased` is sent from `stripe-webhook`, using the same catalogue. `create-promotion-checkout` adds `platform` to the Stripe metadata; today it carries only promotion, listing and user ids.
- [ ] **Code:** User-safe error messages on mobile: people see plain guidance, and the raw backend error goes to Sentry (mobile plan Step 1).
- [ ] **Code:** Daily summary email built from the right sources (see [Alerts](#monitoring)). A scheduled job (GitHub Action or Supabase scheduled function) sends the SQL counts.
- [ ] **Code:** Session replay with every input and all chat text masked.
- [ ] **Code:** Revenue queries:
  - SQL over `listing_promotions` for sales by tier and metro
  - sponsored impression and click events for click-through
  - `getPromotionAnalytics` only returns one promotion's view delta, so neither exists yet.
- [ ] **Code:** Uptime checks and a public status page linked from `/help`.
- [ ] **Code:** Alert for Emergency posts pending more than 10 minutes. It sends a push to moderators and an email to you.
- [ ] **Code:** Update `/privacy` to name Sentry and PostHog.

### W3 — Store compliance (Oct 5–11)

- [ ] **Code:** In-app account deletion (web + mobile Settings).
  - The server side removes the auth user, anonymizes or deletes content per the privacy policy, and deletes storage objects.
  - Also a public web page where people can ask for deletion without the app. Its URL goes into the Play Console.
- [ ] **Code:** Sign in with Apple on iOS (Supabase Apple provider).
- [ ] **Code:** Mobile auth hardening (mobile plan Step 1):
  - OAuth callback state and origin validation
  - media URL validation (block unsafe schemes and private hosts)
- [ ] **Code:** Account security, Facebook/Reddit style (Decision 6), on web and mobile:
  - Confirm identity again before deleting the account or changing email or password: the password for email accounts, an emailed code through `supabase.auth.reauthenticate()` for Google and Apple accounts.
  - After a password change, sign out every other device (`signOut({ scope: 'others' })`).
  - A **Sign out of all devices** option in Settings (`signOut({ scope: 'global' })`) for a lost or stolen phone.
- [ ] **Code:** Remove every mobile Promote entry point and unregister the `PromoteListing` route. Promoted and sponsored items keep displaying. The entry points are:
  - the `promote` action in `MarketplaceHomeScreen`'s menu
  - the Promote button in `ListingDetailScreen`
  - the Promote action in `MyListingsScreen`
- [ ] **You + Code:** `eas init`, then EAS credentials and env.
- [ ] **Code:** Set up EAS Update: `npx expo install expo-updates`, then `eas update:configure` (writes `updates.url` and the `runtimeVersion` policy). Commit both. Every OTA step in this plan depends on it.
- [ ] **You + Code:** Validate push delivery end to end (NOTIF-02):
  - a real iPhone and a real Android phone (edge function secrets, `app.settings.*`)
  - a desktop browser through web push. The prod VAPID keys are set: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel, the private key as a `send-push-notification` secret. Check the permission prompt, that the subscription is saved, and that delivery arrives.
- [ ] **You + Code:** Validate Google sign-in in store builds (AUTH-01).

### W4 — Mobile polish, builds, closed test (Oct 12–18)

- [ ] **Code:** Replace the Home search "Coming Soon" with the shared search API (`037`/`038` already power web search) (UX-02).
  - Land web UI overhaul PR 3c (search follow-ups) first. It fixes the shared API's page totals and query truncation, so mobile does not need the workarounds web uses.
- [ ] **Code:** Chat avatars open the public profile instead of "Coming Soon" (UX-01).
- [ ] **Code:** Mobile reliability (mobile plan Step 2):
  - realtime channel cleanup on remount
  - timeouts on location requests
  - `LocationContext` update races
  - Check each against current code first; the React Compiler cleanup (#71) rewrote many of these effects.
- [ ] **Code:** "Report a problem" in Settings on web and mobile (Sentry User Feedback, which attaches the user id, app version, platform and replay).
- [ ] **Code:** EAS production builds. Also: TestFlight internal testing, and the Play closed-testing track with the W0 testers. **The 14-day clock must start by Oct 18.**

### W5 — Web feed polish, payments live, listings (Oct 19–25)

- [ ] **Code:** Web UI overhaul PR 4 (feed + post detail).
- [ ] **You:** Activate the Stripe account (individual/sole proprietor). Switch to live keys and register the live webhook for `stripe-webhook`.
- [ ] **Code:** Make one real live purchase of each tier on the web and refund it.
  - Confirm each placement renders on web and mobile, and that `expire-promotions` ends it.
  - Remove the tier prices duplicated between `create-promotion-checkout` and `packages/shared/src/constants/promotions.ts`, or add a test that keeps them equal.
- [ ] **You:** Store listings: name, subtitle, description, keywords, screenshots (phone sizes for both stores), support URL, privacy URL. Also Apple privacy labels and the Google data-safety form (must include Sentry, PostHog, Stripe).
- [ ] **You:** Line up a metro champion for DFW and one for New York. Seed both markets.

### W6 — Beta wave 1: DFW + New York (Oct 26–Nov 1)

- [ ] **You:** Invite 30–50 people across the two markets (friends, community organizations, Tihar event organizers). Web plus TestFlight/Play builds.
- [ ] **You + Code:** Daily triage (see [Support](#support-and-incident-operations)). Fix P0/P1 issues the same day.
- [ ] **You:** Apply for Play production access when the 14-day test ends (about Nov 1). Google can take several days to review.

### W7 — Beta fixes, web create flows (Nov 2–8)

- [ ] **Code:** Web UI overhaul PR 5 (create flows).
- [ ] **Code:** Beta fixes from Sentry, feedback and the funnel dashboard.
- [ ] **Code:** Mobile UX and accessibility baseline (mobile plan Step 3):
  - touch targets on icon-only actions
  - loading, empty and error states that let people recover
  - screen-reader labels on inputs and navigation
- [ ] **You:** Metro champions and seed content for Atlanta, Houston, the Bay Area and Los Angeles.

### W8 — Beta wave 2 and App Store submission (Nov 9–15)

- [ ] **You:** Open the beta to the other four markets.
- [ ] **You:** **Submit iOS 1.0 to App Review by Nov 13.** That leaves room for two rejection rounds before Dec 1. Give App Review a test account and notes covering reporting, blocking, moderation and account deletion (guideline 1.2 for user-generated content).
- [ ] **You:** Final legal text from the lawyer is live on the site.

### W9 — Hardening and drills (Nov 16–22)

- [ ] **Code:** Write `docs/guides/operations-runbook.md` (see [Runbook](#runbook-contents)) and add it to `docs/INDEX.md` in the same commit.
- [ ] **You + Code:** Rehearse each rollback once:
  - Vercel Instant Rollback
  - a harmless EAS Update to the `production` channel, then rolled back. Do it while only testers have builds.
  - turning off a feature flag
  - restoring a Supabase managed daily backup on **staging**. It is the same mechanism a prod incident would use, and the project is unavailable while it restores. Time it, and write down what it covers:
    - up to 24 hours of data can be lost
    - auth users are included, because they live in the database
    - Storage files (photos) are **not** included, so deleted files cannot come back from a database backup
- [ ] **Code:** Nightly GitHub Action that runs the `test:security:*` smoke tests against **staging** and opens an issue on failure. They create and delete users and content with the service-role key, so they stay off prod.
  - Prod gets read-only probes with the anon key instead (for example, anon cannot read private `users` columns or call the revoked RPCs).
  - Weekly Supabase advisors check on both projects.
- [ ] **Code:** Coverage gates for notifications, moderation and the auth lifecycle (TEST-01), plus the mobile plan's missing critical tests and full validation pass (Step 5).

### W10 — Release candidate (Nov 23–29)

- [ ] **Code:** Freeze features. Only P0/P1 fixes from here.
- [ ] **You:** Run the [go/no-go checklist](#gono-go-checklist) on Nov 27–28.

### W11 — Public launch (Nov 30–Dec 6)

- [ ] **You:** Launch on Tuesday Dec 1. Announce through community organizations, local Nepali associations, and Facebook/WhatsApp groups in each market.
- [ ] **You:** Watch the dashboards twice a day. Treat any signup-funnel drop as P0.

### W12 — Hypercare (Dec 7–13)

- [ ] **You + Code:** Fix what launch surfaced. Hold the first weekly review, then decide what goes first after launch.
- [ ] **Code:** Refresh `README.md` and the roadmap's Phase 1 status to match what launched (DOC-01).

## Monitoring

| Question                                                                             | Tool                                   | Cost                             |
| ------------------------------------------------------------------------------------ | -------------------------------------- | -------------------------------- |
| Is something broken? Errors, crashes, slow calls on web, mobile and edge functions   | Sentry                                 | Free (Developer plan)            |
| What do people do? Funnels, retention, paths, session replay, feature flags, surveys | PostHog                                | Free up to about 1M events/month |
| Is it up? Plus a public status page                                                  | Better Stack or UptimeRobot            | Free                             |
| Is the database healthy?                                                             | Supabase reports, logs, advisors       | Pro plan                         |
| Web performance (Core Web Vitals)                                                    | Vercel Speed Insights                  | Vercel Pro                       |
| Crash rate and ANRs as the stores see them                                           | App Store Connect, Play Console vitals | Free                             |

**Rules**

- Counts (signups, posts per day, listings, promotions sold) come from SQL. PostHog answers behaviour and funnel questions. Don't reconcile two sources for the same number.
- Event names and property types live in `packages/shared`. The apps and `stripe-webhook` only call an adapter.
- Never send email, name, phone, message text or post bodies.
- Attach `platform` and `app_version` to every client event. Attach `metro_id` and `trust_level` as soon as they are known.
- Server events (sent from edge functions such as `stripe-webhook`) carry `source: server` instead of `app_version`. Their `platform` is the originating checkout's, read from the Stripe metadata.
- Before sign-in (`signup_started`, for example), events carry PostHog's anonymous id. Calling `identify(user_id)` with the Supabase user id at signup merges them into that user.

**Initial events**

```text
signup_started {method}            signup_completed {method}          email_verified
onboarding_completed {metro_id}    post_created {tags, is_global}     post_viewed {post_id, tags}
comment_created                    post_liked                         post_saved
chat_started {source}              message_sent                       search_performed {tab, result_count}
listing_created {category}         listing_viewed {listing_id}        seller_contacted {listing_id}
event_created                      event_viewed {event_id}            event_rsvp {event_id, status}
notification_opened {type}         report_submitted {target_type}     emergency_post_submitted
account_deleted
promotion_checkout_started {type, days}
sponsored_impression {promotion_id, listing_id, type, placement}
sponsored_clicked {promotion_id, listing_id, type, placement}
promotion_purchased {promotion_id, type, days, amount_cents, metro_id, platform, source}   (server-side, stripe-webhook)
```

**Dashboards**

1. **Activation funnel:** `signup_started` → `signup_completed` → `email_verified` → `onboarding_completed` → first post, comment, message or RSVP within 7 days.
2. **North star:** Help, Housing, Jobs and Question posts that get a reply within 24 hours, per week. It measures the utility promise.
3. **Retention:** D1/D7/D30 cohorts and WAU/MAU, split by metro.
4. **Core loops:** post viewed → chat started; listing viewed → seller contacted; event viewed → RSVP.
5. **Trust and safety:** reports per 100 posts, moderation queue age, Emergency approval time, bans.
6. **Markets:** weekly active posters per metro, and new signups per metro.
7. **Revenue:** promotions sold by tier and metro (SQL); sponsored click-through = `sponsored_clicked` ÷ `sponsored_impression`, per placement.

**Alerts** (few, so each one gets attention)

- Sentry: new issue in production; error-rate spike; crash-free sessions below 99%.
- Uptime: web down, Supabase REST down, edge functions failing (especially `stripe-webhook`).
- Supabase: database CPU or disk above 80%; spend cap on.
- App: Emergency post pending for more than 10 minutes.
- Daily 8 a.m. summary, each number taken from the tool that owns it:
  - SQL counts (signups, posts, reports, promotions sold), emailed by the W2 scheduled job
  - active users and the activation funnel, from a PostHog subscription
  - open errors, from Sentry's issue digest

## Support and incident operations

**Channels**

- One inbox: `support@nepally.us` forwards to Gmail under a label. Keep saved replies for the top ten issues: verification email missing, change metro, delete account, report someone, promotion refund, Emergency post pending, and so on.
- "Report a problem" in Settings, via Sentry User Feedback.
- A status page linked from `/help`.

**Severity**

| Level | Examples                                                  | Response        |
| ----- | --------------------------------------------------------- | --------------- |
| P0    | Site down, signup broken, data exposure, payments failing | Drop everything |
| P1    | A major feature broken for many users                     | Same day        |
| P2    | A bug with a workaround                                   | Weekly batch    |
| P3    | Polish, ideas                                             | Backlog         |

Track work as GitHub issues labelled `p0`–`p3`.

**Rollback toolkit** (each one rehearsed in W9)

| Failure                    | Path                                                                                                                                                                             | Speed                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Bad web deploy             | Vercel Instant Rollback                                                                                                                                                          | Seconds                         |
| Mobile JS bug              | EAS Update to the `production` channel; no store review. Needs the W3 `expo-updates` setup.                                                                                      | Minutes                         |
| Mobile native bug          | Containment, not rollback: turn the feature off with its PostHog flag or ship a JS workaround through EAS Update. Then ship a fixed build and request an expedited Apple review. | Minutes to contain, days to fix |
| Feature misbehaving        | PostHog feature flags around chat, marketplace, promotions and push                                                                                                              | Seconds                         |
| Bad migration or data loss | Every migration goes to staging first. Restore the managed daily backup (rehearsed on staging in W9). You can lose up to 24 hours of data, and Storage files are not included.   | Hours                           |

**Rhythm**

- Daily: two 20-minute triage windows, in this order: Sentry → moderation queue → inbox → dashboard. Outside them, only P0 alerts interrupt.
- Weekly (1 hour): metrics review, top issues become next week's work, check this tracker.
- Moderation: auto-hide at three reports already exists. Vetted champions hold the (global) moderator role, and the Emergency alert reaches all of them.

### Runbook contents

`docs/guides/operations-runbook.md` covers:

- roll back web, mobile or a migration
- restore from backup
- ban a user
- honour a data-deletion request
- rotate keys (Supabase, Stripe, Expo)
- answer a law-enforcement request
- process a DMCA takedown notice
- what to do when Supabase or Vercel is down
- refund a promotion

## Budget

| Item                                         | Cost                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| Supabase Pro (two projects on Micro compute) | about $35/month                                          |
| Vercel Pro                                   | $20/month                                                |
| SMTP (Resend or Postmark)                    | free tier to start, about $15–20/month once signups grow |
| Sentry, PostHog, uptime                      | free tiers                                               |
| Apple Developer                              | $99/year                                                 |
| Google Play                                  | $25 once                                                 |
| Domain                                       | about $15/year                                           |
| Lawyer review                                | quote-dependent                                          |

## Go/no-go checklist

- [ ] Signup → verify → onboarding → first post works on web, iOS build and Android build against **prod**, for a ZIP in each of the six markets.
- [ ] Auth email arrives within a minute through custom SMTP.
- [ ] Push arrives on a real iPhone, a real Android phone and a desktop browser (web push).
- [ ] An EAS Update published to the `production` channel reaches an installed store build.
- [ ] No mobile screen leads into the Promote purchase flow.
- [ ] A live web promotion purchase, its placement and its refund all work.
- [ ] Account deletion works in the app and through the public request page, and removes the user's data as the privacy policy says.
- [ ] Sentry receives errors from web, mobile and edge functions. PostHog funnel shows beta traffic.
- [ ] Uptime checks and the status page are live. Alerts reach your phone.
- [ ] Every market has a metro champion and seeded content. Everyone with the moderator role is vetted.
- [ ] Final legal text is live. The DMCA agent is registered. `support@` answers.
- [ ] Security smoke tests pass on staging with the same migrations as prod. Prod read-only probes pass. The Supabase advisors show no new errors on either project.
- [ ] Each rollback path was rehearsed once.

## Risks

| Risk                               | Mitigation                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| App Review rejects 1.0             | Submit by Nov 13; review notes for UGC, deletion and Apple sign-in; web and Android launch regardless (Decision 5) |
| Play production access delayed     | Start the closed test by Oct 18; recruit extra testers                                                             |
| Empty feeds in six markets         | Two beta waves, metro champions, seed content before each wave                                                     |
| One person on call                 | Few, loud alerts; two daily windows; kill switches; volunteer moderators                                           |
| Moderator role is global           | Give it only to vetted people; metro scoping after launch                                                          |
| Auth email throttled on launch day | Custom SMTP in W1; watch the email-verification step of the funnel                                                 |
| Schema change breaks prod          | Staging first; nightly smoke tests on staging; backups plus a rehearsed restore                                    |

## Folded-in items

Open items from [`phase1-remediation-checklist.md`](phase1-remediation-checklist.md) (as of 2026-09-18) and where they now live:

| Item     | What                                                                                                                           | Where                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-06   | Storage bucket limits, cron-function shared secret, `expo-secure-store`, prod `enable_confirmations`, pgTAP negative RLS tests | W1 (pgTAP: after launch)                                                                                                               |
| NOTIF-02 | Live push delivery                                                                                                             | W3                                                                                                                                     |
| AUTH-01  | Mobile Google sign-in end to end                                                                                               | W3, validated in store builds                                                                                                          |
| UX-01    | Chat avatar "Coming Soon"                                                                                                      | W4                                                                                                                                     |
| UX-02    | Mobile search                                                                                                                  | W4                                                                                                                                     |
| TEST-01  | Coverage gates for notifications, moderation, auth                                                                             | W9                                                                                                                                     |
| DOC-01   | Status lines in sync with reality                                                                                              | `README.md` and roadmap refresh in W12. `PROGRESS.md` is already archived and frozen (superseded by the roadmap), so it needs no sync. |
| ARCH-01  | Shared metro-lookup helper                                                                                                     | After launch                                                                                                                           |
| AUTH-02  | Phone OTP onboarding                                                                                                           | Not in this plan (deferred since 2026-03-25)                                                                                           |

All five steps of [`mobile-usability-security-hardening.md`](mobile-usability-security-hardening.md) (every one `Not Started` as of 2026-09-18):

| Step                             | What                                                                                     | Where                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| 1 Security foundations           | Secure storage                                                                           | W1 (SEC-06)                           |
| 1 Security foundations           | User-safe errors                                                                         | W2                                    |
| 1 Security foundations           | OAuth callback state, media URL validation, confirming identity before sensitive actions | W3                                    |
| 1 Security foundations           | 30-minute inactivity timeout, 30-day maximum session age                                 | Dropped; replaced by Decision 6       |
| 2 Reliability and lifecycle      | Realtime cleanup, location timeouts, `LocationContext` races                             | W4 (check against current code first) |
| 3 UX and accessibility           | Touch targets, recoverable states, screen-reader labels                                  | W7                                    |
| 4 Proactive enhancements         | Realtime over polling, post-draft recovery, contextual nudges                            | After launch                          |
| 5 Tests and release verification | Missing critical tests, full validation pass                                             | W9 (with TEST-01)                     |

## After launch

- Mobile promotion purchases (link out or IAP through RevenueCat). The current in-app PaymentIntent flow is removed or rebuilt.
- Metro-scoped moderator roles.
- Premium subscription purchase flow (`is_premium` is only a flag today).
- Web UI overhaul PRs 6–10.
- Trust-level admin tools (Level 2 grants) and platform stats in `/moderation`. Use SQL and PostHog until then.
- pgTAP negative-case RLS tests (SEC-06); shared metro lookup (ARCH-01).
- Mobile proactive enhancements: realtime over polling, post-draft recovery, contextual nudges (mobile plan Step 4).
- Phone verification (deferred since 2026-03-25).
