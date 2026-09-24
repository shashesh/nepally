import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  resendMock: vi.fn(),
  createUserProfileMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: authMocks.signUpMock,
      signInWithPassword: authMocks.signInWithPasswordMock,
      signOut: authMocks.signOutMock,
      signInWithOAuth: authMocks.signInWithOAuthMock,
      resend: authMocks.resendMock,
    },
  },
}));

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    createUserProfile: authMocks.createUserProfileMock,
  };
});

import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  signInWithGoogle,
  resendSignupEmail,
} from './auth';

describe('signUpWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createUserProfileMock.mockResolvedValue(undefined);
  });

  it('returns user on successful signup', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: { id: 'new-user-1', email: 'test@example.com' } },
      error: null,
    });

    const result = await signUpWithEmail('test@example.com', 'password123', 'Test User');

    expect(result.user?.id).toBe('new-user-1');
    expect(result.user?.email).toBe('test@example.com');
    expect(result.error).toBeUndefined();
  });

  it('does not call createUserProfile during signup (deferred to /auth/callback)', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: { id: 'new-user-1', email: 'test@example.com' } },
      error: null,
    });

    await signUpWithEmail('test@example.com', 'password123', 'Test User');

    // Web defers profile creation to /auth/callback after email confirmation.
    expect(authMocks.createUserProfileMock).not.toHaveBeenCalled();
  });

  it('returns error when supabase signUp fails', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: null },
      error: new Error('Signup failed'),
    });

    const result = await signUpWithEmail('bad@example.com', 'pass', 'Bad User');

    expect(result.user).toBeUndefined();
    expect(result.error?.message).toBe('Signup failed');
  });

  it('returns the user when it has an identity', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: {
        user: { id: 'new-user-1', email: 'test@example.com', identities: [{ id: 'identity-1' }] },
      },
      error: null,
    });

    const result = await signUpWithEmail('test@example.com', 'password123', 'Test User');

    expect(result).toEqual({ user: { id: 'new-user-1', email: 'test@example.com' } });
  });

  it('treats a user with no identities as a success, so a taken address looks like a new one', async () => {
    // Supabase's look-alike answer for a taken address; revealing it would let
    // sign-up be used to find out who is registered.
    authMocks.signUpMock.mockResolvedValue({
      data: { user: { id: 'obfuscated-1', email: 'taken@example.com', identities: [] } },
      error: null,
    });

    const result = await signUpWithEmail('taken@example.com', 'password123', 'Test User');

    expect(result).toEqual({ user: { id: 'obfuscated-1', email: 'taken@example.com' } });
  });

  it('returns a Supabase error unchanged, keeping its code', async () => {
    const supabaseError = Object.assign(new Error('User already registered'), {
      code: 'user_already_exists',
    });
    authMocks.signUpMock.mockResolvedValue({ data: { user: null }, error: supabaseError });

    const result = await signUpWithEmail('taken@example.com', 'password123', 'Test User');

    expect(result.error).toBe(supabaseError);
  });

  it('returns error when no user data returned', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await signUpWithEmail('test@example.com', 'pass', 'Test User');

    expect(result.error?.message).toBe('No user data returned');
  });
});

describe('resendSignupEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks Supabase to resend the sign-up email', async () => {
    authMocks.resendMock.mockResolvedValue({ data: {}, error: null });

    const result = await resendSignupEmail('new@example.com');

    expect(authMocks.resendMock).toHaveBeenCalledWith({ type: 'signup', email: 'new@example.com' });
    expect(result).toEqual({});
  });

  it('returns the error when the resend fails', async () => {
    const supabaseError = Object.assign(new Error('Email rate limit exceeded'), {
      code: 'over_email_send_rate_limit',
    });
    authMocks.resendMock.mockResolvedValue({ data: {}, error: supabaseError });

    const result = await resendSignupEmail('new@example.com');

    expect(result.error).toBe(supabaseError);
  });

  it('returns an error when the resend throws', async () => {
    authMocks.resendMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await resendSignupEmail('new@example.com');

    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('signInWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user on successful sign in', async () => {
    authMocks.signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    const result = await signInWithEmail('test@example.com', 'password');

    expect(result.user?.id).toBe('user-1');
    expect(result.user?.email).toBe('test@example.com');
    expect(result.error).toBeUndefined();
  });

  it('returns error when credentials are invalid', async () => {
    authMocks.signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    });

    const result = await signInWithEmail('bad@example.com', 'wrongpass');

    expect(result.user).toBeUndefined();
    expect(result.error?.message).toBe('Invalid login credentials');
  });

  it('returns error when no user data returned', async () => {
    authMocks.signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await signInWithEmail('test@example.com', 'pass');

    expect(result.error?.message).toBe('No user data returned');
  });
});

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object on successful sign out', async () => {
    authMocks.signOutMock.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(result).toEqual({});
    expect(result.error).toBeUndefined();
  });

  it('returns error when sign out fails', async () => {
    authMocks.signOutMock.mockResolvedValue({
      error: new Error('Sign out failed'),
    });

    const result = await signOut();

    expect(result.error?.message).toBe('Sign out failed');
  });
});

describe('signInWithGoogle', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000', href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('redirects browser to the OAuth URL on success', async () => {
    authMocks.signInWithOAuthMock.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/...' },
      error: null,
    });

    await signInWithGoogle();

    expect(authMocks.signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback' },
    });
    expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/...');
  });

  it('returns error when OAuth provider fails', async () => {
    authMocks.signInWithOAuthMock.mockResolvedValue({
      data: { url: null },
      error: new Error('Provider not enabled'),
    });

    const result = await signInWithGoogle();

    expect(result.error?.message).toBe('Provider not enabled');
  });

  it('returns error when no URL is returned', async () => {
    authMocks.signInWithOAuthMock.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(result.error?.message).toBe('No OAuth URL returned');
  });
});

