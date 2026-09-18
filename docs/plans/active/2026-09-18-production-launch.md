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

It is monitored, supported by one person, and able to roll back any failure.

**Owner:** Shashesh (solo). Items marked **You** need a human with an account, a card, or a signature. Items marked **Code** ship as feature-branch PRs.

## Decisions (2026-09-18)

1. **Separate production Supabase project.** `nusa-staging` stays the staging project. Every migration goes to staging first, then prod.
2. **Individual developer accounts** on Apple and Google. The seller name is your legal name. Google requires personal accounts to run a closed test with **at least 12 testers for 14 days in a row** before a production release. That puts the closed test on the critical path.
3. **Launch markets:** Dallas–Fort Worth, Atlanta, New York, Houston, San Francisco Bay Area, Los Angeles. The beta runs in two of them first (see [Launch markets](#launch-markets)).
4. **Free to use at launch. Paid promotions and sponsored placements are on for anyone who wants them.** The three existing tiers stay on sale: Featured Listing ($1.99/day), Sponsored Feed ($2.99/day) and Sticky Business ($4.99/day). Purchases happen on the **web** for v1.0 (see [Payments on mobile](#payments-on-mobile)).
5. **If App Review slips, web and Android launch on schedule** and iOS joins when approved.

## Where things stand (verified 2026-09-18)

- **Built:** feed, posts, likes/comments/saves, chat, events, marketplace with promotions, notifications, web search, profiles, the `/moderation` queue, draft legal pages. CI is green.
- **Domain:** `nepally.us` does not resolve (NXDOMAIN).
- **Database:** only `nusa-staging` exists (24 test accounts, last signup April 2026). There is no production database.
- **Web deploy:** `deploy-vercel-prod.yml` has never run. Dev deploys run on every merge.
- **Monitoring:** no error tracking or analytics in any app.
- **Mobile builds:** `apps/mobile/app.json` has no EAS project id (`eas init` not run), so push tokens cannot register in store builds.
- **Store compliance gaps:**
  - no in-app account deletion
  - no Sign in with Apple, although iOS offers Google sign-in
  - mobile charges for promotions through an in-app Stripe payment sheet
- **Mobile dead ends:** "Coming Soon" alerts in Home search (`HomeScreen.tsx`) and on chat avatars (`ConversationItem.tsx`, `MessageThreadScreen.tsx`).
- **Web UI overhaul:** PRs 0–3b merged. PRs 4–10 not started ([plan](2026-09-14-web-ui-overhaul.md)).
- **Supabase security advisors:**
  - Leaked-password protection is off.
  - About 30 `SECURITY DEFINER` functions are executable by `anon` through `/rest/v1/rpc`. Most are trigger functions and error when called directly. But `increment_listing_views` / `increment_listing_contacts` let anyone inflate counters, and `has_user_liked_post` reveals whether a given user liked a post.
- **Web hardening:** `next.config.js` sets no security headers, and the service worker references a missing `/icon.png`.

## Launch markets

All six exist in `metro_areas` with ZIP coverage. Assignment is by ZIP, so a user in a metro with no seeded content lands on an empty feed.

| Market | Metro id | Name in DB | ZIPs | Beta wave |
|---|---|---|---|---|
| Dallas–Fort Worth | 19100 | Dallas-Fort Worth-Arlington | 384 | Wave 1 (Oct 26) |
| New York | 35620 | New York-Newark-Jersey City | 1047 | Wave 1 (Oct 26) |
| Atlanta | 12060 | Atlanta-Sandy Springs-Roswell | 308 | Wave 2 (Nov 9) |
| Houston | 26420 | Houston-Pasadena-The Woodlands | 358 | Wave 2 (Nov 9) |
| San Francisco Bay Area | 41860 (+ 41940?) | San Francisco-Oakland-Fremont (+ San Jose-Sunnyvale-Santa Clara) | 227 (+108) | Wave 2 (Nov 9) |
| Los Angeles | 31080 | Los Angeles-Long Beach-Anaheim | 621 | Wave 2 (Nov 9) |

**Open question:** does "San Francisco" include San Jose (41940)? South Bay users are assigned to San Jose, not San Francisco. Recommendation: treat both as the Bay Area market and seed both.

Six markets is a lot of ground for one person. These keep it workable:

- **Two beta waves.** DFW and New York first, then the other four two weeks later.
- **One "metro champion" per market** before public launch. This is a volunteer who seeds content, welcomes new members, and holds the moderator role.
- **Seed every market before its wave opens.** Post a pinned welcome, real upcoming events (Tihar), and housing, job and help resources.
- **Watch weekly active posters per metro** and put outreach where density lags.

## Payments on mobile

Boosting a listing is a digital service used inside the app. Apple (guideline 3.1.1) and Google Play expect their own billing for that kind of purchase. For example, Meta passes Apple's fee on to advertisers who boost posts from its iOS app. Today's in-app Stripe payment sheet on mobile is a likely rejection.

- **v1.0:** promotions are **bought on the web** (Stripe Checkout, already built). On mobile, the Promote purchase flow is hidden. Promoted and sponsored items still **display** everywhere on mobile: badges, feed injection, sticky placement.
- **After approval:** revisit. Options are a link out to web checkout (currently allowed on the US storefront, but the court case is still in progress, so check at the time) or IAP through RevenueCat.

## Live tracker

Only one week is `In Progress` at a time. Update the row when a week starts and when it ends.

| Week | Dates | Theme | Status | Notes |
|---|---|---|---|---|
| W0 | Sep 18–20 | Long-lead accounts and paperwork | In Progress | |
| W1 | Sep 21–27 | Production environment | Not Started | |
| W2 | Sep 28–Oct 4 | Observability | Not Started | |
| W3 | Oct 5–11 | Store compliance | Not Started | |
| W4 | Oct 12–18 | Mobile polish, builds, closed test starts | Not Started | Play 14-day clock must start by Oct 18 |
| W5 | Oct 19–25 | Web feed polish, payments live, store listings | Not Started | |
| W6 | Oct 26–Nov 1 | Beta wave 1 (DFW, NYC) | Not Started | |
| W7 | Nov 2–8 | Beta fixes, web create flows | Not Started | Tihar season |
| W8 | Nov 9–15 | Beta wave 2, App Store submission | Not Started | Submit iOS by Nov 13 |
| W9 | Nov 16–22 | Hardening, runbook drills | Not Started | |
| W10 | Nov 23–29 | Release candidate, go/no-go | Not Started | Thanksgiving Nov 26 |
| W11 | Nov 30–Dec 6 | **Public launch Dec 1** | Not Started | |
| W12 | Dec 7–13 | Hypercare | Not Started | Dec 14–20 is buffer |

## Week by week

### W0 — Long-lead items (Sep 18–20)

- [ ] **You:** Register `nepally.us`. Point DNS at Vercel when W1 starts.
- [ ] **You:** Enroll in the Apple Developer Program as an individual ($99/yr).
- [ ] **You:** Create a Google Play Console personal account ($25 one-time).
- [ ] **You:** Recruit 15–20 Android closed testers (12 is the floor; some drop out). Collect their Google account emails.
- [ ] **You:** Upgrade the Supabase org to Pro. This stops auto-pause and adds daily backups and leaked-password protection.
- [ ] **You:** Upgrade Vercel to Pro. The Hobby plan is non-commercial only, and Nepally takes payments.
- [ ] **You:** Send `/terms`, `/privacy`, `/guidelines` to a lawyer. Ask about governing law, the promotion refund policy, the 13+ age rule, and whether you owe sales tax on advertising in TX, GA, NY or CA.
- [ ] **You:** Register a DMCA designated agent with the US Copyright Office. This gives safe harbor for user posts.
- [ ] **You:** Create `support@nepally.us`. Free forwarding to Gmail (Cloudflare Email Routing) is enough to start.

### W1 — Production environment (Sep 21–27)

- [ ] **Code:** Create the production Supabase project (`nepally-prod`, us-west-2) after you confirm the cost.
- [ ] **Code:** Apply `001`–`038` in order on the empty prod database. The frozen files are safe on a fresh database. Record the rehearsal in `docs/architecture/migration-workflow.md`.
- [ ] **Code:** Migration `039`:
  - revoke `EXECUTE` from `anon` (and from `authenticated` where appropriate) on functions that should not be public
  - Apply to staging, run the `test:security:*` smoke tests, then apply to prod.
- [ ] **You:** Turn on leaked-password protection in both projects.
- [ ] **You:** Set up custom SMTP (Resend or Postmark) for auth email in both projects. The built-in sender allows only a few emails per hour, so launch-day signups would stall at "verify your email".
- [ ] **You:** In prod auth settings, add the site URL `https://nepally.us`, redirect URLs, the `nepally://**` mobile scheme, and Google OAuth client IDs/redirects for prod.
- [ ] **Code:** Wire prod env vars into Vercel (production environment) and EAS (production profile). Deploy edge functions and set their secrets on prod.
- [ ] **Code:** Web security headers in `next.config.js` (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors). Add the missing `/icon.png`.
- [ ] **Code:** First run of `deploy-vercel-prod.yml` against the prod project, with the custom domain attached.
- [ ] **Code:** Docs hygiene. Retire the two stale March plans (`phase1-remediation-checklist.md`, `mobile-usability-security-hardening.md`) and fold anything still open into this plan.

### W2 — Observability (Sep 28–Oct 4)

See [Monitoring](#monitoring) for the full spec.

- [ ] **You:** Create Sentry, PostHog and Better Stack (or UptimeRobot) accounts. Install the Sentry and PostHog phone apps for alerts.
- [ ] **Code:** Sentry in web (`@sentry/nextjs`), mobile (`@sentry/react-native` + Expo plugin, source maps uploaded by EAS), and edge functions (Deno SDK).
- [ ] **Code:** Analytics event catalogue in `packages/shared` (names + typed properties). Thin PostHog adapters in web and mobile. Identify users by Supabase id only.
- [ ] **Code:** Session replay with every input and all chat text masked.
- [ ] **Code:** Uptime checks and a public status page linked from `/help`.
- [ ] **Code:** Alert for Emergency posts pending more than 10 minutes. It sends a push to moderators and an email to you.
- [ ] **Code:** Update `/privacy` to name Sentry and PostHog.

### W3 — Store compliance (Oct 5–11)

- [ ] **Code:** In-app account deletion (web + mobile Settings). The server side removes the auth user, anonymizes or deletes content per the privacy policy, and deletes storage objects. There is also a web URL for Google Play's deletion form.
- [ ] **Code:** Sign in with Apple on iOS (Supabase Apple provider).
- [ ] **Code:** Hide the mobile Promote purchase flow. Promoted and sponsored items keep displaying.
- [ ] **You + Code:** `eas init`, then EAS credentials and env. Validate push delivery end to end on a real iPhone and a real Android phone (edge function secrets, `app.settings.*`).

### W4 — Mobile polish, builds, closed test (Oct 12–18)

- [ ] **Code:** Replace the Home search "Coming Soon" with the shared search API (`037`/`038` already power web search).
- [ ] **Code:** Chat avatars open the public profile instead of "Coming Soon".
- [ ] **Code:** "Report a problem" in Settings on web and mobile (Sentry User Feedback, which attaches the user id, app version, platform and replay).
- [ ] **Code:** EAS production builds. Also: TestFlight internal testing, and the Play closed-testing track with the W0 testers. **The 14-day clock must start by Oct 18.**

### W5 — Web feed polish, payments live, listings (Oct 19–25)

- [ ] **Code:** Web UI overhaul PR 4 (feed + post detail).
- [ ] **You:** Activate the Stripe account (individual/sole proprietor). Switch to live keys and register the live webhook for `stripe-webhook`.
- [ ] **Code:** Make one real live purchase of each tier and refund it. Confirm each placement renders on web and mobile and that `expire-promotions` ends it. Remove the duplicated tier prices between `create-promotion-checkout` and `packages/shared/src/constants/promotions.ts`, or add a test that keeps them equal.
- [ ] **You:** Store listings: name, subtitle, description, keywords, screenshots (phone sizes for both stores), support URL, privacy URL. Also Apple privacy labels and the Google data-safety form (must include Sentry, PostHog, Stripe).
- [ ] **You:** Line up a metro champion for DFW and one for New York. Seed both markets.

### W6 — Beta wave 1: DFW + New York (Oct 26–Nov 1)

- [ ] **You:** Invite 30–50 people across the two markets (friends, community organizations, Tihar event organizers). Web plus TestFlight/Play builds.
- [ ] **You + Code:** Daily triage (see [Support](#support-and-incident-operations)). Fix P0/P1 issues the same day.
- [ ] **You:** Apply for Play production access when the 14-day test ends (about Nov 1). Google can take several days to review.

### W7 — Beta fixes, web create flows (Nov 2–8)

- [ ] **Code:** Web UI overhaul PR 5 (create flows).
- [ ] **Code:** Beta fixes from Sentry, feedback and the funnel dashboard.
- [ ] **You:** Metro champions and seed content for Atlanta, Houston, the Bay Area and Los Angeles.

### W8 — Beta wave 2 and App Store submission (Nov 9–15)

- [ ] **You:** Open the beta to the other four markets.
- [ ] **You:** **Submit iOS 1.0 to App Review by Nov 13.** That leaves room for two rejection rounds before Dec 1. Give App Review a test account and notes covering reporting, blocking, moderation and account deletion (guideline 1.2 for user-generated content).
- [ ] **You:** Final legal text from the lawyer is live on the site.

### W9 — Hardening and drills (Nov 16–22)

- [ ] **Code:** Write `docs/guides/operations-runbook.md` (see [Runbook](#runbook-contents)).
- [ ] **You + Code:** Rehearse each rollback once:
  - Vercel Instant Rollback
  - an EAS Update to the preview channel
  - turning off a feature flag
  - restoring a staging backup
- [ ] **Code:** Nightly GitHub Action that runs the `test:security:*` smoke tests against prod and opens an issue on failure. Weekly Supabase advisors check.

### W10 — Release candidate (Nov 23–29)

- [ ] **Code:** Freeze features. Only P0/P1 fixes from here.
- [ ] **You:** Run the [go/no-go checklist](#gono-go-checklist) on Nov 27–28.

### W11 — Public launch (Nov 30–Dec 6)

- [ ] **You:** Launch on Tuesday Dec 1. Announce through community organizations, local Nepali associations, and Facebook/WhatsApp groups in each market.
- [ ] **You:** Watch the dashboards twice a day. Treat any signup-funnel drop as P0.

### W12 — Hypercare (Dec 7–13)

- [ ] **You + Code:** Fix what launch surfaced. Hold the first weekly review, then decide what goes first after launch.

## Monitoring

| Question | Tool | Cost |
|---|---|---|
| Is something broken? Errors, crashes, slow calls on web, mobile and edge functions | Sentry | Free (Developer plan) |
| What do people do? Funnels, retention, paths, session replay, feature flags, surveys | PostHog | Free up to about 1M events/month |
| Is it up? Plus a public status page | Better Stack or UptimeRobot | Free |
| Is the database healthy? | Supabase reports, logs, advisors | Pro plan |
| Web performance (Core Web Vitals) | Vercel Speed Insights | Vercel Pro |
| Crash rate and ANRs as the stores see them | App Store Connect, Play Console vitals | Free |

**Rules**

- Counts (signups, posts per day, listings) come from SQL. PostHog answers behaviour and funnel questions. Don't reconcile two sources for the same number.
- Event names and property types live in `packages/shared`. The apps only call the adapter.
- Never send email, name, phone, message text or post bodies. Identify by Supabase user id.
- Attach these properties to every event: `platform`, `app_version`, `metro_id`, `trust_level`.

**Initial events**

```text
signup_started {method}            signup_completed {method}        email_verified
onboarding_completed {metro_id}    post_created {tags, is_global}   post_viewed {post_id, tags}
comment_created                    post_liked                       post_saved
chat_started {source}              message_sent                     search_performed {tab, result_count}
listing_created {category}         listing_viewed                   seller_contacted
event_created                      event_rsvp {status}              notification_opened {type}
promotion_checkout_started {type, days}                             sponsored_clicked {type}
report_submitted {target_type}     emergency_post_submitted         account_deleted
```

`promotion_purchased` is sent server-side from `stripe-webhook`, not from the client.

**Dashboards**

1. **Activation funnel:** `signup_started` → `signup_completed` → `email_verified` → `onboarding_completed` → first post, comment, message or RSVP within 7 days.
2. **North star:** Help, Housing, Jobs and Question posts that get a reply within 24 hours, per week. It measures the utility promise.
3. **Retention:** D1/D7/D30 cohorts and WAU/MAU, split by metro.
4. **Core loops:** post viewed → chat started; listing viewed → seller contacted; event viewed → RSVP.
5. **Trust and safety:** reports per 100 posts, moderation queue age, Emergency approval time, bans.
6. **Markets:** weekly active posters per metro, and new signups per metro.
7. **Revenue:** promotions sold by tier and metro, and sponsor click-through (`getPromotionAnalytics` already exists).

**Alerts** (few, so each one gets attention)

- Sentry: new issue in production; error-rate spike; crash-free sessions below 99%.
- Uptime: web down, Supabase REST down, edge functions failing (especially `stripe-webhook`).
- Supabase: database CPU or disk above 80%; spend cap on.
- App: Emergency post pending for more than 10 minutes.
- Daily 8 a.m. email: signups, active users, posts, reports, open errors (PostHog subscription).

## Support and incident operations

**Channels**

- One inbox: `support@nepally.us` forwards to Gmail under a label. Keep saved replies for the top ten issues: verification email missing, change metro, delete account, report someone, promotion refund, Emergency post pending, and so on.
- "Report a problem" in Settings, via Sentry User Feedback.
- A status page linked from `/help`.

**Severity**

| Level | Examples | Response |
|---|---|---|
| P0 | Site down, signup broken, data exposure, payments failing | Drop everything |
| P1 | A major feature broken for many users | Same day |
| P2 | A bug with a workaround | Weekly batch |
| P3 | Polish, ideas | Backlog |

Track work as GitHub issues labelled `p0`–`p3`.

**Rollback toolkit** (each one rehearsed in W9)

- Web: Vercel Instant Rollback.
- Mobile JS bugs: EAS Update to the `production` channel, with no store review. Native bugs need a new build plus an Apple expedited review request.
- Kill switches: PostHog feature flags around chat, marketplace, promotions and push.
- Database: every migration hits staging first. Pro includes daily backups. Practise one restore into staging.

**Rhythm**

- Daily: two 20-minute triage windows, in this order: Sentry → moderation queue → inbox → dashboard. Outside them, only P0 alerts interrupt.
- Weekly (1 hour): metrics review, top issues become next week's work, check this tracker.
- Moderation: auto-hide at three reports already exists. Metro champions hold the moderator role, and the Emergency alert reaches all of them.

### Runbook contents

`docs/guides/operations-runbook.md` covers:

- roll back web, mobile or a migration
- restore from backup
- ban a user
- honour a data-deletion request
- rotate keys (Supabase, Stripe, Expo)
- answer a law-enforcement request
- what to do when Supabase or Vercel is down
- refund a promotion

## Budget

| Item | Cost |
|---|---|
| Supabase Pro (two projects on Micro compute) | about $35/month |
| Vercel Pro | $20/month |
| SMTP (Resend or Postmark) | free tier to start, about $15–20/month once signups grow |
| Sentry, PostHog, uptime | free tiers |
| Apple Developer | $99/year |
| Google Play | $25 once |
| Domain | about $15/year |
| Lawyer review | quote-dependent |

## Go/no-go checklist

- [ ] Signup → verify → onboarding → first post works on web, iOS build and Android build against **prod**.
- [ ] Auth email arrives within a minute through custom SMTP.
- [ ] Push arrives on a real iPhone and a real Android phone.
- [ ] A live promotion purchase, its placement and its refund all work.
- [ ] Account deletion works and removes the user's data as the privacy policy says.
- [ ] Sentry receives errors from web, mobile and edge functions. PostHog funnel shows beta traffic.
- [ ] Uptime checks and the status page are live. Alerts reach your phone.
- [ ] Every market has a metro champion and seeded content.
- [ ] Final legal text is live. The DMCA agent is registered. `support@` answers.
- [ ] `test:security:*` smoke tests pass against prod. The Supabase advisors show no new errors.
- [ ] Each rollback path was rehearsed once.

## Risks

| Risk | Mitigation |
|---|---|
| App Review rejects 1.0 | Submit by Nov 13; review notes for UGC, deletion and Apple sign-in; web and Android launch regardless (Decision 5) |
| Play production access delayed | Start the closed test by Oct 18; recruit extra testers |
| Empty feeds in six markets | Two beta waves, metro champions, seed content before each wave |
| One person on call | Few, loud alerts; two daily windows; kill switches; volunteer moderators |
| Auth email throttled on launch day | Custom SMTP in W1; watch the email-verification step of the funnel |
| Schema change breaks prod | Staging first; smoke tests nightly; backups plus a rehearsed restore |

## After launch

- Mobile promotion purchases (link out or IAP via RevenueCat).
- Premium subscription purchase flow (`is_premium` is only a flag today).
- Web UI overhaul PRs 6–10.
- Trust-level admin tools (Level 2 grants) and platform stats in `/moderation`. Use SQL and PostHog until then.
- Phone verification (deferred since 2026-03-25).
