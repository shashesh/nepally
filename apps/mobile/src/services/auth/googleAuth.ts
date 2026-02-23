import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../config/supabase';
import type { GoogleAuthResult } from '@nusa/shared';

WebBrowser.maybeCompleteAuthSession();

/**
 * Sign up/in with Google OAuth
 * Uses Expo's AuthSession for native OAuth flow
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    // Create redirect URL
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'nusa',
      path: 'auth/callback',
    });

    // Start OAuth flow with Supabase
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;

    // For now, return a mock user until we fully implement the OAuth callback
    // TODO: Complete OAuth callback handling in a future commit
    return {
      error: new Error('Google OAuth setup incomplete - implement callback handling'),
    };
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
    // Extract authorization code from callback URL
    const callbackUrl = new URL(url);
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
