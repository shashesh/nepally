import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  createUserProfileMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: authMocks.signUpMock,
      signInWithPassword: authMocks.signInWithPasswordMock,
      signOut: authMocks.signOutMock,
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

import { signUpWithEmail, signInWithEmail, signOut } from './auth';

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

  it('calls createUserProfile after successful signup', async () => {
    authMocks.signUpMock.mockResolvedValue({
      data: { user: { id: 'new-user-1', email: 'test@example.com' } },
      error: null,
    });

    await signUpWithEmail('test@example.com', 'password123', 'Test User');

    expect(authMocks.createUserProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      'new-user-1',
      'test@example.com',
      'Test User'
    );
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
