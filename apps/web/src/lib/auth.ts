/**
 * Auth functions for web.
 * Uses the platform-specific supabase client from lib/supabase.ts.
 */
import { supabase } from './supabase';
import type { EmailAuthResult, GoogleAuthResult } from '@nusa/shared';

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Supabase will redirect the browser to Google, then back to /auth/callback
    window.location.href = data.url;

    // This return is unreachable in practice (browser navigates away),
    // but satisfies the type contract.
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Google sign-in failed'),
    };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user data returned');

    // Profile creation is deferred to /auth/callback after email confirmation.
    // session is null at this point when email confirmation is enabled.

    return { user: { id: data.user.id, email: data.user.email || email } };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Email signup failed'),
    };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user data returned');

    return { user: { id: data.user.id, email: data.user.email || email } };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Email sign-in failed'),
    };
  }
}

export async function signOut(): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Sign out failed'),
    };
  }
}
