import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../config/supabase';
import type { GoogleAuthResult } from '@nepally/shared';

WebBrowser.maybeCompleteAuthSession();

/**
 * Sign up/in with Google OAuth
 * Uses Expo's WebBrowser + Supabase PKCE flow for native OAuth
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'nusa',
      path: 'auth/callback',
    });

    // Get the OAuth URL from Supabase without opening browser
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Open browser for user to authenticate
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type !== 'success') {
      return { error: new Error('Google sign-in was cancelled') };
    }

    // Extract session params from the callback URL
    return await handleGoogleAuthCallback(result.url);
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Google sign-in failed'),
    };
  }
}

/**
 * Handle OAuth callback (to be called from deep link)
 */
export async function handleGoogleAuthCallback(url: string): Promise<GoogleAuthResult> {
  try {
    // Validate callback URL integrity before processing
    let callbackUrl: URL;
    try {
      callbackUrl = new URL(url);
    } catch {
      return { error: new Error('Invalid OAuth callback URL') };
    }

    const validSchemes = new Set(['nusa:', 'exp:']);
    if (!validSchemes.has(callbackUrl.protocol)) {
      return { error: new Error('Invalid OAuth callback URL') };
    }

    // Validate callback path based on scheme to ensure integrity.
    // For deep links (e.g. nusa://auth/callback), the host must be 'auth' and path '/callback'.
    // For exp:// URLs, the auth callback should be in the pathname and end with '/auth/callback'.
    if (callbackUrl.protocol === 'nusa:') {
      if (callbackUrl.hostname !== 'auth' || callbackUrl.pathname !== '/callback') {
        return { error: new Error('Invalid OAuth callback URL') };
      }
    } else if (callbackUrl.protocol === 'exp:') {
      if (!callbackUrl.pathname.endsWith('/auth/callback')) {
        return { error: new Error('Invalid OAuth callback URL') };
      }
    }

    // Extract authorization code from callback URL
    const code = callbackUrl.searchParams.get('code');

    if (!code) {
      throw new Error('No auth code found in callback URL');
    }

    // Exchange auth code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) throw error;
    if (!data.session) throw new Error('No session found');

    // Get user data
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    return {
      user: {
        id: userData.user.id,
        email: userData.user.email || '',
        full_name: userData.user.user_metadata?.full_name || '',
        avatar_url: userData.user.user_metadata?.avatar_url,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('OAuth callback failed'),
    };
  }
}
