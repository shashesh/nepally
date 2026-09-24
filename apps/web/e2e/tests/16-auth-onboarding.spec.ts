/**
 * The signed-out pages PR 10a rebuilt, end to end: verify-email's resend row,
 * onboarding's two steps, the callback's failed state and the legal pages.
 * It also holds the PR's keyboard walk: the Tab order through login and
 * signup, focus on the first invalid field, busy buttons that keep focus,
 * onboarding's step changes landing on their h1, and the FAQ's Enter and
 * Space. The last block checks that nothing overflows at 375px.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockAuthError, mockSupabaseLoggedIn, mockUnhandledRest } from '../helpers/supabase-mock';
import { MOCK_METRO_ID, MOCK_USER_EMAIL, MOCK_USER_ID, MOCK_USER_PROFILE } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const METRO = { id: MOCK_METRO_ID, name: 'New York-Newark-Jersey City', state: 'NY', population: null };
const VERIFY_EMAIL_PATH = `/verify-email?email=${encodeURIComponent('bikal@example.com')}`;

function wantsObject(route: Route): boolean {
  return (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
}

/** A promise a spec releases by hand, to look at a page while its request is held. */
function gate(): { held: Promise<void>; release: () => void } {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { held, release };
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { docWidth, viewport } = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(docWidth).toBeLessThanOrEqual(viewport);
}

/**
 * A signed-in member with no metro yet. The profile read answers with no metro
 * until the onboarding's PATCH on users lands, then with the metro, so the
 * feed it pushes to doesn't send the member straight back.
 */
async function mockMemberWithoutMetro(page: Page): Promise<void> {
  let metroSaved = false;
  await injectAuthSession(page);
  await mockSupabaseLoggedIn(page);

  await page.route('**/rest/v1/rpc/get_my_profile**', async (route) => {
    const profile = { ...MOCK_USER_PROFILE, metro_area_id: metroSaved ? MOCK_METRO_ID : undefined };
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(wantsObject(route) ? profile : [profile]),
    });
  });
  await page.route('**/rest/v1/users**', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    metroSaved = true;
    await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
  });
  await page.route('**/rest/v1/metro_area_zipcodes**', async (route) => {
    const zip = new URL(route.request().url()).searchParams.get('zip_code');
    const rows = zip === 'eq.10001' ? [{ metro_area_id: MOCK_METRO_ID, metro_areas: METRO }] : [];
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(rows) });
  });
}

test.describe('Log in and sign up by keyboard', () => {
  test('login: Tab runs Google, Email, Password, Log in, then Sign up', async ({ page }) => {
    await page.goto('/login');
    const main = page.locator('main');
    const google = main.getByRole('button', { name: 'Continue with Google' });
    await expect(google).toBeVisible({ timeout: 10_000 });

    await google.focus();
    await page.keyboard.press('Tab');
    await expect(main.getByLabel('Email')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(main.getByLabel('Password', { exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(main.getByRole('button', { name: 'Log in' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(main.getByRole('link', { name: 'Sign up' })).toBeFocused();
  });

  test('signup: Tab runs Google, the three fields, Create account, the consent links, then Log in', async ({ page }) => {
    await page.goto('/signup');
    const main = page.locator('main');
    const google = main.getByRole('button', { name: 'Continue with Google' });
    await expect(google).toBeVisible({ timeout: 10_000 });

    await google.focus();
    const order = [
      main.getByLabel('Full name'),
      main.getByLabel('Email'),
      main.getByLabel('Password', { exact: true }),
      main.getByRole('button', { name: 'Create account' }),
      main.getByRole('link', { name: 'Terms of Service' }),
      main.getByRole('link', { name: 'Privacy Policy' }),
      main.getByRole('link', { name: 'Log in' }),
    ];
    for (const next of order) {
      await page.keyboard.press('Tab');
      await expect(next).toBeFocused();
    }
  });

  test('submitting login blank lands focus on Email', async ({ page }) => {
    await page.goto('/login');
    const submit = page.locator('main').getByRole('button', { name: 'Log in' });
    await expect(submit).toBeVisible({ timeout: 10_000 });

    await submit.focus();
    await page.keyboard.press('Enter');

    const email = page.locator('main').getByLabel('Email');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription('Enter a valid email address.');
  });

  test('submitting signup blank lands focus on Full name', async ({ page }) => {
    await page.goto('/signup');
    const submit = page.locator('main').getByRole('button', { name: 'Create account' });
    await expect(submit).toBeVisible({ timeout: 10_000 });

    await submit.focus();
    await page.keyboard.press('Enter');

    const fullName = page.locator('main').getByLabel('Full name');
    await expect(fullName).toBeFocused();
    await expect(fullName).toHaveAttribute('aria-invalid', 'true');
  });

  for (const path of ['/login', '/signup']) {
    test(`${path}: Continue with Google stays busy and keeps focus after the hand-off`, async ({ page }) => {
      // The hand-off is a navigation to Supabase's authorize endpoint. A 204
      // cancels it, leaving the page as a member sees it while Google loads.
      const handOff = page.waitForRequest('**/auth/v1/authorize**');
      await page.route('**/auth/v1/authorize**', (route) => route.fulfill({ status: 204, body: '' }));

      await page.goto(path);
      const google = page.locator('main').getByRole('button', { name: 'Continue with Google' });
      await expect(google).toBeVisible({ timeout: 10_000 });
      await google.focus();
      await page.keyboard.press('Enter');
      await handOff;

      await expect(google).toHaveAttribute('aria-busy', 'true');
      await expect(google).toHaveAttribute('aria-disabled', 'true');
      await expect(google).not.toHaveAttribute('disabled');
      await expect(google).toBeFocused();
    });
  }

  test('Create account keeps focus while it signs up', async ({ page }) => {
    const { held, release } = gate();
    await mockAuthError(page, '**/auth/v1/signup**', {
      status: 400,
      code: 'unexpected_failure',
      message: 'Database error saving new user',
      gate: held,
    });

    await page.goto('/signup');
    const main = page.locator('main');
    await expect(main.getByLabel('Full name')).toBeVisible({ timeout: 10_000 });
    await main.getByLabel('Full name').fill('Bikal Shrestha');
    await main.getByLabel('Email').fill('bikal@example.com');
    await main.getByLabel('Password', { exact: true }).fill('Password123');
    const submit = main.getByRole('button', { name: 'Create account' });
    await submit.focus();
    await page.keyboard.press('Enter');

    await expect(submit).toHaveAttribute('aria-busy', 'true');
    await expect(submit).toHaveAttribute('aria-disabled', 'true');
    await expect(submit).toBeFocused();

    release();
    await expect(main.getByRole('alert')).toHaveText("Couldn't create your account. Please try again.");
    await expect(submit).toBeFocused();
  });

  test('a taken address that Supabase hides goes to login with the reason', async ({ page }) => {
    // With email confirmation on, Supabase answers a taken address with a user
    // that has no identities instead of an error (recon 3).
    await page.route('**/auth/v1/signup**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          id: MOCK_USER_ID,
          aud: 'authenticated',
          role: 'authenticated',
          email: MOCK_USER_EMAIL,
          identities: [],
          app_metadata: {},
          user_metadata: {},
          created_at: '2025-01-01T00:00:00Z',
        }),
      });
    });

    await page.goto('/signup');
    const main = page.locator('main');
    await expect(main.getByLabel('Full name')).toBeVisible({ timeout: 10_000 });
    await main.getByLabel('Full name').fill('Bikal Shrestha');
    await main.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await main.getByLabel('Password', { exact: true }).fill('Password123');
    await main.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/login\?reason=existing-account&email=/);
    await expect(page.getByText(/account with this email already exists/i)).toBeVisible();
    await expect(page.locator('main').getByLabel('Email')).toHaveValue(MOCK_USER_EMAIL);
  });
});

test.describe('Verify email', () => {
  test('Resend waits out its countdown, then sends and keeps focus', async ({ page }) => {
    await page.clock.install();
    const { held, release } = gate();
    let resends = 0;
    await page.route('**/auth/v1/resend**', async (route) => {
      resends += 1;
      await held;
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: '{}' });
    });

    await page.goto(VERIFY_EMAIL_PATH);
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible({ timeout: 10_000 });
    await expect(main.getByText('b***l@example.com')).toBeVisible();

    const resend = main.getByRole('button', { name: 'Resend email' });
    await expect(resend).toHaveAttribute('aria-disabled', 'true');
    await expect(main.getByText(/^You can resend in \d+s$/)).toBeVisible();
    // Pressing it during the cooldown sends nothing.
    await resend.focus();
    await page.keyboard.press('Enter');

    await page.clock.runFor(60_000);
    await expect(main.getByText(/You can resend in/)).toHaveCount(0);
    await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
    expect(resends).toBe(0);

    await resend.focus();
    await page.keyboard.press('Enter');
    await expect(resend).toHaveAttribute('aria-busy', 'true');
    await expect(resend).toBeFocused();

    release();
    await expect(main.getByRole('alert')).toHaveText('Email sent. Check your inbox.');
    await expect(resend).toBeFocused();
    await expect(resend).toHaveAttribute('aria-disabled', 'true');
    await expect(main.getByText(/^You can resend in \d+s$/)).toBeVisible();
    expect(resends).toBe(1);
  });

  test('a rate-limited resend says to wait', async ({ page }) => {
    await page.clock.install();
    await mockAuthError(page, '**/auth/v1/resend**', {
      status: 429,
      code: 'over_email_send_rate_limit',
      message: 'email rate limit exceeded',
    });

    await page.goto(VERIFY_EMAIL_PATH);
    const resend = page.locator('main').getByRole('button', { name: 'Resend email' });
    await expect(resend).toBeVisible({ timeout: 10_000 });
    await page.clock.runFor(60_000);
    await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
    await resend.click();

    await expect(page.locator('main').getByRole('alert')).toHaveText(
      'Too many attempts. Please wait a minute and try again.',
    );
  });

  test('with no address it says "your email address" and offers no resend', async ({ page }) => {
    await page.goto('/verify-email');
    const main = page.locator('main');
    await expect(main.getByText(/We sent a verification link to your email address/)).toBeVisible({ timeout: 10_000 });
    await expect(main.getByRole('button', { name: 'Resend email' })).toHaveCount(0);
    await expect(main.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });
});

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await mockMemberWithoutMetro(page);
  });

  test('by keyboard: find the area by ZIP, confirm it, and land on the feed', async ({ page }) => {
    await page.goto('/onboarding/zip');
    const main = page.locator('main');
    const zip = main.getByRole('textbox', { name: 'ZIP code' });
    await expect(zip).toBeFocused({ timeout: 10_000 });

    // Enter in the field submits; a short ZIP errors on the field and keeps focus there.
    await page.keyboard.type('123');
    await page.keyboard.press('Enter');
    await expect(zip).toHaveAccessibleDescription('Please enter a valid 5-digit ZIP code.');
    await expect(zip).toHaveAttribute('aria-invalid', 'true');
    await expect(zip).toBeFocused();

    await zip.fill('10001');
    await page.keyboard.press('Enter');
    const confirmHeading = main.getByRole('heading', { level: 1, name: 'Confirm your area' });
    await expect(confirmHeading).toBeFocused();
    await expect(main.getByText('New York-Newark-Jersey City, NY')).toBeVisible();

    // Change ZIP goes back, and focus lands on that step's h1.
    await page.keyboard.press('Tab');
    await expect(main.getByRole('button', { name: 'Change ZIP' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(main.getByRole('heading', { level: 1, name: 'Where are you?' })).toBeFocused();
    await expect(zip).toHaveValue('10001');

    await zip.focus();
    await page.keyboard.press('Enter');
    await expect(confirmHeading).toBeFocused();

    const saved = page.waitForRequest(
      (request) => request.method() === 'PATCH' && request.url().includes('/rest/v1/users'),
    );
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(main.getByRole('button', { name: 'Confirm and continue' })).toBeFocused();
    await page.keyboard.press('Enter');

    await saved;
    await expect(page).toHaveURL(/\/feed$/, { timeout: 10_000 });
  });

  test('an unknown ZIP says so on the field', async ({ page }) => {
    await page.goto('/onboarding/zip');
    const zip = page.locator('main').getByRole('textbox', { name: 'ZIP code' });
    await expect(zip).toBeVisible({ timeout: 10_000 });

    await zip.fill('99999');
    await page.locator('main').getByRole('button', { name: 'Find my area' }).click();

    await expect(zip).toHaveAccessibleDescription('ZIP code not found. Please double-check and try again.');
    await expect(zip).toBeFocused();
  });
});

test.describe('Auth callback', () => {
  test('a first sign-in lands on onboarding, not login, once its profile exists', async ({ page }) => {
    // Through the real AuthProvider and Layout: the provider reads the profile when
    // the session arrives, before the callback creates it, so the callback must
    // reload the member or onboarding sees nobody and sends them to /login.
    let profileCreated = false;
    const profile = { ...MOCK_USER_PROFILE, metro_area_id: undefined, trust_level: 1 };
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await page.route('**/rest/v1/rpc/get_my_profile**', async (route) => {
      const body = profileCreated ? profile : null;
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(wantsObject(route) ? body : body ? [body] : []),
      });
    });
    await page.route('**/rest/v1/rpc/mark_user_verified**', async (route) => {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([profile]) });
    });
    await page.route('**/rest/v1/users**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      profileCreated = true;
      await route.fulfill({ status: 201, headers: JSON_HEADERS, body: '' });
    });

    await page.goto('/auth/callback');
    await expect(page).toHaveURL(/\/onboarding\/zip$/, { timeout: 10_000 });
    await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Where are you?' })).toBeVisible();
    expect(page.url()).not.toContain('/login');
  });

  test('a failed profile write ends on the failed state, and Try again runs it again', async ({ page }) => {
    await injectAuthSession(page);
    await mockUnhandledRest(page);
    // A first sign-in: no profile yet, so the callback creates one, and that write fails.
    await page.route('**/rest/v1/rpc/get_my_profile**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(wantsObject(route) ? null : []),
      });
    });
    await page.route('**/rest/v1/users**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        headers: JSON_HEADERS,
        body: JSON.stringify({ code: 'XX000', message: 'internal error' }),
      });
    });

    await page.goto('/auth/callback');
    const main = page.locator('main');
    const failed = main.getByRole('heading', { level: 1, name: "Couldn't finish signing you in" });
    await expect(failed).toBeVisible({ timeout: 10_000 });
    await expect(main.getByText("We couldn't finish setting up your account. Please try again.")).toBeVisible();
    await expect(main.getByText(/internal error/)).toHaveCount(0);

    const retried = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/rest/v1/users'),
    );
    await main.getByRole('button', { name: 'Try again' }).click();
    await retried;
    await expect(failed).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Legal pages', () => {
  const PAGES = [
    { path: '/privacy', title: 'Privacy Policy' },
    { path: '/terms', title: 'Terms of Service' },
    { path: '/guidelines', title: 'Community Guidelines' },
    { path: '/help', title: 'Help Center' },
  ];

  for (const { path, title } of PAGES) {
    test(`${path} has its h1 and links to the other three`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 10_000 });

      const related = page.getByRole('navigation', { name: 'Policies and help' });
      await expect(related.getByRole('link')).toHaveCount(3);
      for (const other of PAGES.filter((item) => item.path !== path)) {
        await expect(related.getByRole('link', { name: other.title })).toHaveAttribute('href', other.path);
      }
    });
  }

  test('a help FAQ opens with Enter and toggles with Space', async ({ page }) => {
    await page.goto('/help');
    const question = page.locator('summary', { hasText: 'Why do you ask for my ZIP code?' });
    const item = page.locator('details', { has: question });
    await expect(question).toBeVisible({ timeout: 10_000 });
    await expect(item).not.toHaveAttribute('open');

    await question.focus();
    await page.keyboard.press('Enter');
    await expect(item).toHaveAttribute('open');

    await page.keyboard.press('Space');
    await expect(item).not.toHaveAttribute('open');
    await page.keyboard.press('Space');
    await expect(item).toHaveAttribute('open');
    await expect(question).toBeFocused();
  });
});

test.describe('At 375px nothing overflows', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  const SIGNED_OUT = [
    { path: '/', heading: 'Welcome to Nepally' },
    { path: '/login', heading: 'Welcome back' },
    { path: '/signup', heading: 'Join Nepally' },
    { path: VERIFY_EMAIL_PATH, heading: 'Check your email' },
    { path: '/privacy', heading: 'Privacy Policy' },
    { path: '/terms', heading: 'Terms of Service' },
    { path: '/guidelines', heading: 'Community Guidelines' },
    { path: '/help', heading: 'Help Center' },
  ];

  for (const { path, heading } of SIGNED_OUT) {
    test(`${path.split('?')[0]}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 10_000 });
      await expectNoHorizontalOverflow(page);
    });
  }

  test('signup with every field in error', async ({ page }) => {
    await page.goto('/signup');
    const submit = page.locator('main').getByRole('button', { name: 'Create account' });
    await expect(submit).toBeVisible({ timeout: 10_000 });
    await page.locator('main').getByLabel('Password', { exact: true }).fill('a');
    await submit.click();
    await expect(page.locator('main').getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
    await expectNoHorizontalOverflow(page);
  });

  test('onboarding, on both steps', async ({ page }) => {
    await mockMemberWithoutMetro(page);
    await page.goto('/onboarding/zip');
    const zip = page.locator('main').getByRole('textbox', { name: 'ZIP code' });
    await expect(zip).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page);

    await zip.fill('10001');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Confirm your area' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
