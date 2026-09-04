jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

import { handleGoogleAuthCallback, signInWithGoogle } from './googleAuth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../config/supabase';

const mockAuth = supabase.auth as unknown as {
  signInWithOAuth: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  getUser: jest.Mock;
};

const mockMakeRedirectUri = AuthSession.makeRedirectUri as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('googleAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeRedirectUri.mockReturnValue('nepally://auth/callback');
  });

  it('completes full OAuth flow and returns user', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth?state=abc' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'nepally://auth/callback?code=auth-code-123',
    });
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@nusa.com',
          user_metadata: {
            full_name: 'Nusa User',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'nepally://auth/callback',
        skipBrowserRedirect: true,
      },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth?state=abc',
      'nepally://auth/callback'
    );
    expect(result.user?.id).toBe('user-1');
    expect(result.user?.full_name).toBe('Nusa User');
  });

  it('returns error when user cancels browser', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'cancel',
    });

    const result = await signInWithGoogle();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Google sign-in was cancelled');
  });

  it('returns error when OAuth URL is missing', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('No OAuth URL returned');
  });

  it('returns error when signInWithOAuth fails', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: new Error('OAuth provider unavailable'),
    });

    const result = await signInWithGoogle();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('OAuth provider unavailable');
  });

  it('handles oauth callback and returns mapped user', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@nusa.com',
          user_metadata: {
            full_name: 'Nusa User',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      },
      error: null,
    });

    const result = await handleGoogleAuthCallback('nepally://auth/callback?code=abc123');

    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(result.user?.id).toBe('user-1');
    expect(result.user?.full_name).toBe('Nusa User');
  });

  it('rejects callback URL with invalid scheme', async () => {
    const result = await handleGoogleAuthCallback('https://evil.com/auth/callback?code=abc');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toMatch(/[Ii]nvalid/);
  });

  it('rejects callback URL with non-auth path', async () => {
    const result = await handleGoogleAuthCallback('nepally://malicious/path?code=abc');
    expect(result.error).toBeInstanceOf(Error);
  });

  it('rejects callback URL with auth-like hostname and callback path', async () => {
    const result = await handleGoogleAuthCallback('nepally://myauth/callback?code=abc');
    expect(result.error).toBeInstanceOf(Error);
  });
  it('rejects callback URL with no code', async () => {
    const result = await handleGoogleAuthCallback('nepally://auth/callback');
    expect(result.error).toBeInstanceOf(Error);
  });
});
