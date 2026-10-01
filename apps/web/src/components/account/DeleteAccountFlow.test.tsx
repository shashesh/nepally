import React from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SUPPORT_EMAIL } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signOut: vi.fn(),
  refreshUser: vi.fn(),
  notifyError: vi.fn(),
  useRouter: vi.fn(),
  replace: vi.fn(),
  getSession: vi.fn(),
  supabaseSignOut: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  requestAccountDeletion: vi.fn(),
  isRecentSignIn: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession, signOut: mocks.supabaseSignOut } },
}));
vi.mock('../../lib/auth', () => ({
  signInWithEmail: mocks.signInWithEmail,
  signInWithGoogle: mocks.signInWithGoogle,
}));
vi.mock('../ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requestAccountDeletion: mocks.requestAccountDeletion,
  isRecentSignIn: mocks.isRecentSignIn,
  logClientEvent: mocks.logClientEvent,
}));

import { DeleteAccountFlow, REAUTH_USER_KEY } from './DeleteAccountFlow';

const EMAIL_MEMBER = {
  id: 'user-1',
  email: 'member@example.com',
  app_metadata: { providers: ['email'] },
};
const GOOGLE_MEMBER = {
  id: 'user-1',
  email: 'member@example.com',
  app_metadata: { providers: ['google'] },
};
const EMAIL_AND_GOOGLE_MEMBER = {
  id: 'user-1',
  email: 'member@example.com',
  app_metadata: { providers: ['email', 'google'] },
};

async function press(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

async function submitPassword(password: string) {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  await press('Confirm');
}

describe('DeleteAccountFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.useRouter.mockReturnValue({ query: {}, isReady: true, replace: mocks.replace });
    mocks.useAuth.mockReturnValue({
      supabaseUser: EMAIL_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mocks.isRecentSignIn.mockReturnValue(false);
    mocks.signOut.mockResolvedValue({});
    mocks.supabaseSignOut.mockResolvedValue({ error: null });
    mocks.replace.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains what goes and when, then asks for the password after an old sign-in', async () => {
    render(<DeleteAccountFlow />);

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account' })).toBeDefined();
    expect(screen.getByText(/the messages you sent/)).toBeDefined();
    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: "Confirm it's you" })).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('skips confirming after a recent sign-in', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    render(<DeleteAccountFlow />);

    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
  });

  it("falls through to confirming when the session can't be read", async () => {
    const readError = new Error('storage unavailable');
    mocks.getSession.mockRejectedValue(readError);
    render(<DeleteAccountFlow />);

    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: "Confirm it's you" })).toBeDefined();
    expect(mocks.logClientEvent).toHaveBeenCalledWith({
      event: 'account_delete_session_read_failed',
      context: { platform: 'web' },
      error: readError,
    });
  });

  it('says so when the password is wrong', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      error: Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await submitPassword('wrong');

    expect(mocks.signInWithEmail).toHaveBeenCalledWith('member@example.com', 'wrong');
    expect(screen.getByText('That password is incorrect.')).toBeDefined();
  });

  it('moves on after the right password', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      user: { id: 'user-1', email: 'member@example.com' },
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await submitPassword('right');

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
  });

  it('names the signed-in account on Explain and on the final step', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    render(<DeleteAccountFlow />);
    expect(screen.getByText('Signed in as member@example.com')).toBeDefined();

    await press('Continue');

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
    expect(screen.getByText('Signed in as member@example.com')).toBeDefined();
  });

  it('gives an email-only account the support email for a forgotten password', async () => {
    render(<DeleteAccountFlow />);

    await press('Continue');

    expect(screen.getByText(/Forgot your password\?/)).toBeDefined();
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).toBeNull();
  });

  it('offers Google next to the password when the account has Google too', async () => {
    mocks.useAuth.mockReturnValue({
      supabaseUser: EMAIL_AND_GOOGLE_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    mocks.signInWithGoogle.mockResolvedValue({});
    render(<DeleteAccountFlow />);
    await press('Continue');
    expect(screen.getByLabelText('Password')).toBeDefined();

    await press(/Continue with Google/);

    expect(window.sessionStorage.getItem(REAUTH_USER_KEY)).toBe('user-1');
    expect(mocks.signInWithGoogle).toHaveBeenCalledWith({
      redirectTo: `${window.location.origin}/delete-account?step=confirm`,
      selectAccount: true,
    });
  });

  it("doesn't start Google when it can't remember who asked", async () => {
    const storageError = new DOMException('blocked', 'SecurityError');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw storageError;
    });
    mocks.useAuth.mockReturnValue({
      supabaseUser: GOOGLE_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press(/Continue with Google/);

    expect(mocks.signInWithGoogle).not.toHaveBeenCalled();
    expect(screen.getByText(/blocking site storage/)).toBeDefined();
    expect(mocks.logClientEvent).toHaveBeenCalledWith({
      event: 'account_delete_reauth_failed',
      context: { platform: 'web', method: 'google', reason: 'storage_blocked' },
      error: storageError,
    });
    expect(
      screen.getByRole('button', { name: /Continue with Google/ }).getAttribute('aria-busy')
    ).toBeNull();
  });

  it('starts Google with its account chooser, remembering who asked', async () => {
    mocks.useAuth.mockReturnValue({
      supabaseUser: GOOGLE_MEMBER,
      signOut: mocks.signOut,
      refreshUser: mocks.refreshUser,
    });
    mocks.signInWithGoogle.mockResolvedValue({});
    render(<DeleteAccountFlow />);
    await press('Continue');
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByText(/Forgot your password\?/)).toBeNull();

    await press(/Continue with Google/);

    expect(window.sessionStorage.getItem(REAUTH_USER_KEY)).toBe('user-1');
    expect(mocks.signInWithGoogle).toHaveBeenCalledWith({
      redirectTo: `${window.location.origin}/delete-account?step=confirm`,
      selectAccount: true,
    });
  });

  it('back from Google as the same account, goes straight to the final step', async () => {
    window.sessionStorage.setItem(REAUTH_USER_KEY, 'user-1');
    mocks.useRouter.mockReturnValue({
      query: { step: 'confirm' },
      isReady: true,
      replace: mocks.replace,
    });

    render(<DeleteAccountFlow />);
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
    expect(window.sessionStorage.getItem(REAUTH_USER_KEY)).toBeNull();
  });

  it('back from Google as a different account, signs it out and deletes nothing', async () => {
    window.sessionStorage.setItem(REAUTH_USER_KEY, 'someone-else');
    mocks.useRouter.mockReturnValue({
      query: { step: 'confirm' },
      isReady: true,
      replace: mocks.replace,
    });

    render(<DeleteAccountFlow />);
    await act(async () => {});

    expect(mocks.supabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.replace).toHaveBeenCalledWith('/delete-account?reauth=wrong-account');
    expect(mocks.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('deletes the account, then signs out onto the scheduled page', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({ data: '2026-10-30T12:00:00.000Z' });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(mocks.signOut).toHaveBeenCalledWith({
      redirectTo: '/delete-account?scheduled=2026-10-30T12%3A00%3A00.000Z',
    });
  });

  it('goes back to confirming when the database wants a fresh sign-in', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("Please confirm it's you again.", { code: 'reauth_required' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByRole('heading', { level: 1, name: "Confirm it's you" })).toBeDefined();
    expect(screen.getByText("Please confirm it's you again.")).toBeDefined();
  });

  it('offers the email route for an account with no profile', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("We couldn't find your profile.", { code: 'profile_not_found' }),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByText(new RegExp(SUPPORT_EMAIL))).toBeDefined();
  });

  it('shows any other failure and stays on the final step', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({
      error: new ApiError("Couldn't delete your account. Please try again."),
    });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(screen.getByText("Couldn't delete your account. Please try again.")).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Delete your account?' })).toBeDefined();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('toasts the date and reloads the profile when signing out fails after the delete', async () => {
    mocks.isRecentSignIn.mockReturnValue(true);
    mocks.requestAccountDeletion.mockResolvedValue({ data: '2026-10-30T12:00:00.000Z' });
    mocks.signOut.mockResolvedValue({ error: "Couldn't log you out. Please try again." });
    render(<DeleteAccountFlow />);
    await press('Continue');

    await press('Delete my account');

    expect(mocks.notifyError).toHaveBeenCalledWith(expect.stringContaining('October 30, 2026'));
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
  });
});
