import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  createUserProfileMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: authMocks.signUpMock,
      signInWithPassword: authMocks.signInWithPasswordMock,
      signOut: authMocks.signOutMock,
      signInWithOAuth: authMocks.signInWithOAuthMock,
      signInWithOtp: authMocks.signInWithOtpMock,
      verifyOtp: authMocks.verifyOtpMock,
    },
  },
}));

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    createUserProfile: authMocks.createUserProfileMock,
  };
});

import { signUpWithEmail, signInWithEmail, signOut, signInWithGoogle, sendPhoneOTP, verifyPhoneOTP } from './auth';

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

  it('returns error when no user data returned', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await signUpWithEmail('test@example.com', 'pass', 'Test User');

    expect(result.error?.message).toBe('No user data returned');
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

describe('sendPhoneOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when OTP is sent', async () => {
    authMocks.signInWithOtpMock.mockResolvedValue({ error: null });

    const result = await sendPhoneOTP('+12125551234');

    expect(result.success).toBe(true);
    expect(authMocks.signInWithOtpMock).toHaveBeenCalledWith({ phone: '+12125551234' });
  });

  it('returns friendly error for unsupported provider', async () => {
    authMocks.signInWithOtpMock.mockResolvedValue({
      error: new Error('Unsupported phone provider'),
    });

    const result = await sendPhoneOTP('+12125551234');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Phone auth is not configured');
  });

  it('returns error on failure', async () => {
    authMocks.signInWithOtpMock.mockResolvedValue({
      error: new Error('Rate limit exceeded'),
    });

    const result = await sendPhoneOTP('+12125551234');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Rate limit exceeded');
  });
});

describe('verifyPhoneOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when OTP is verified', async () => {
    authMocks.verifyOtpMock.mockResolvedValue({ error: null });

    const result = await verifyPhoneOTP('+12125551234', '123456');

    expect(result.success).toBe(true);
    expect(authMocks.verifyOtpMock).toHaveBeenCalledWith({
      phone: '+12125551234',
      token: '123456',
      type: 'sms',
    });
  });

  it('returns error when verification fails', async () => {
    authMocks.verifyOtpMock.mockResolvedValue({
      error: new Error('Invalid OTP'),
    });

    const result = await verifyPhoneOTP('+12125551234', '000000');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid OTP');
  });
});
