# Sign Up and Log In

**Last Updated:** 2026-09-24 (web UI overhaul PR 10a)

What signing up, logging in, email verification, the auth callback and ZIP onboarding do on web today. Auth is email and password, or Google. Phone sign-in is deferred. The mobile screens still show their own copy; PR 10c moves them onto the same shared error sentences. The journey itself is written up in [the sign-up and onboarding journey](../../user-journeys/onboarding/01-signup-and-onboarding.md).

## Wording

Everything a signed-out visitor sees says "Log in" and "Sign up", in sentence case: the header buttons, each page's submit button and cross-links, and the page titles. "Sign in" survives only in "Continue with Google".

## The landing page (`/`)

A signed-in member gets the feed at `/`. A visitor gets the landing page:

- **Hero.** "Welcome to Nepally", the line "The Nepali community in the USA, organized by where you live.", and Sign up and Log in.
- **What you'll find.** Housing, Jobs, Help, Events and Marketplace, one sentence each. They describe the app and aren't links, because each would only send a visitor to log in.
- **Closing line.** It links the Community Guidelines.

## Log in (`/login`)

- **Google first.** "Continue with Google" hands off to Google and returns through the callback below. It stays busy, and keeps focus, while the browser leaves.
- **Email and password below it**, under "or log in with email", then Log in.
- **Validation.** Nothing shows before the first submit. A submit with problems puts each message on its field and moves focus to the first one: "Enter a valid email address." and "Enter your password.". From then on the messages re-check as the member types.
- **Success** refreshes the member's profile and goes to `/feed`.
- **Arriving from sign-up with an existing address** (`?reason=existing-account&email=…`) prefills the email and shows: "An account with this email already exists. If you signed up with Google, use the Google button below to sign in."
- A member who is already signed in is sent to `/feed`.

## Sign up (`/signup`)

- **Google, then Full name, Email and Password**, under "or sign up with email", then Create account. A line under the form links the Terms of Service and Privacy Policy.
- **Full name** accepts any script: "बिकल श्रेष्ठ" and "O'Brien-Rai" are both fine. Spaces are trimmed and collapsed, and invisible characters are removed, before the name is saved. It needs at least 2 characters.
- **Password.** Before submit, the field's hint gives the rule: "At least 8 characters, with an uppercase letter, a lowercase letter and a number". After a submit, each unmet rule shows on the field, one per line, until it is met.
- **Validation** works as on log-in: nothing before the first submit, then errors on their fields, with focus on the first.
- **Success** goes to `/verify-email?email=…`.
- **An address that already has an account** goes to log-in with the reason above. Supabase reports this two ways, and both are handled. With email confirmation off it returns an error. With it on, it returns a user with no identities, so a stranger can't use sign-up to find out which addresses are registered. Without this, the member would wait for an email that never comes.

## Error sentences

A failed auth request shows one sentence in an alert above the form, keyed on Supabase's error `code`. The raw Supabase message is never shown. It goes to `logClientEvent` instead (`auth_log_in_failed`, `auth_sign_up_failed`, `auth_google_failed`, `auth_resend_failed`).

| When | The member sees |
|---|---|
| Wrong email or password (`invalid_credentials`) | That email and password don't match. Check them and try again. |
| Email not confirmed (`email_not_confirmed`) | Confirm your email first. Use the link we sent when you signed up. |
| Rate limited (`over_email_send_rate_limit`, `over_request_rate_limit`) | Too many attempts. Please wait a minute and try again. |
| Password rejected by the server (`weak_password`) | Choose a stronger password. |
| No connection, or a 5xx from Supabase | Couldn't reach Nepally. Check your connection and try again. |
| Anything else | Couldn't log you in. / Couldn't create your account. / Couldn't continue with Google. / Couldn't resend the email. (each followed by "Please try again.") |

The sentences live in shared `getAuthErrorMessage`, so mobile can show the same ones.

## Verify your email (`/verify-email`)

- **"Check your email"**, with the address masked ("b\*\*\*l@example.com"), and "Already verified? Log in".
- **Resend email** can be pressed 60 seconds after arriving, with "You can resend in 42s" beside it. It stays focusable during the wait and while sending. Success shows "Email sent. Check your inbox." and starts the wait again. A failure shows its sentence from the table.
- **Without an address in the link**, the page says "We sent a verification link to your email address." and offers no resend, only Log in.

## The auth callback (`/auth/callback`)

Both the email link and Google land here. The page shows "Signing you in…" while it:

1. creates the member's profile if there isn't one yet (a new member starts at trust level 0);
2. marks them verified by email or by Google, which is what lets them post;
3. sends them to `/feed`, or to `/onboarding/zip` if they have no metro yet.

Every step's result is checked, so the page always ends in one of three places:

- **Signed in.** The member goes on to the feed or onboarding.
- **Link expired.** No session arrived within 10 seconds: "This verification link may have expired or already been used.", with Sign up and Log in. A slow profile write once the session has arrived doesn't count against the 10 seconds, and a session that arrives after the page shows this is still finished: the page goes back to "Signing you in…" and carries on.
- **Failed.** A step failed: "Couldn't finish signing you in" and "We couldn't finish setting up your account. Please try again.", with Try again. The session is kept, so Try again reloads the page and runs the steps again. The failure is logged as `auth_callback_failed`, with the step that failed.

## Choosing a metro (`/onboarding/zip`)

A visitor who isn't signed in is sent to log-in, and a member who already has a metro is sent to the feed.

1. **"Where are you?"** The ZIP code field (five digits) and Find my area, or Detect my location, which uses the browser's location. Find my area is always enabled. A short ZIP shows "Please enter a valid 5-digit ZIP code." on the field, and an unknown one shows "ZIP code not found. Please double-check and try again." there. If detection fails, an alert says "Couldn't detect your location. Please enter your ZIP code instead."
2. **"Confirm your area"** shows the metro found, with Change ZIP and Confirm and continue; both are locked while the location saves. Each step change moves focus to the new step's heading.

Confirming saves the ZIP and metro on the profile, adds the metro as the member's default saved location, labelled Home, and goes to `/feed`. If the profile save fails, the page says "Failed to save location. Please try again." and stays put. If only the Home entry fails, the member continues anyway: their metro is already saved, and Manage Locations can add Home later. That failure is logged as `onboarding_home_location_failed`.

## Where it's tested

Unit tests sit beside each page and in `lib/auth.test.ts`, `lib/authCallback.test.ts` and shared `authErrors.test.ts`. End to end, `01-unauthenticated`, `02-login`, `03-signup` and `16-auth-onboarding` (in `apps/web/e2e/tests/`) cover these flows. That includes the keyboard order through both forms, busy buttons keeping focus, and no sideways scrolling at 375px.
