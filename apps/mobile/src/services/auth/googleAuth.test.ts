jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
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

const mockAuth = supabase.auth as {
  signInWithOAuth: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  getUser: jest.Mock;
};

const mockMakeRedirectUri = AuthSession.makeRedirectUri as jest.Mock;
const mockMaybeCompleteAuthSession = WebBrowser.maybeCompleteAuthSession as jest.Mock;

describe('googleAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeRedirectUri.mockReturnValue('nusa://auth/callback');
  });

  it('starts oauth flow and returns setup-incomplete error', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ error: null });

    const result = await signInWithGoogle();

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'nusa://auth/callback',
        skipBrowserRedirect: false,
      },
    });
    expect(result.error).toBeInstanceOf(Error);
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

    const result = await handleGoogleAuthCallback('nusa://auth/callback?code=abc123');

    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(result.user?.id).toBe('user-1');
    expect(result.user?.full_name).toBe('Nusa User');
  });
});
