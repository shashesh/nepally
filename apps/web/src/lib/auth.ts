/**
 * Auth functions for web.
 * Uses the platform-specific supabase client from lib/supabase.ts.
 */
import { supabase } from './supabase';
import type { EmailAuthResult, GoogleAuthResult, PhoneAuthResult } from '@nusa/shared';

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

export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isProviderError = message.toLowerCase().includes('unsupported') && message.toLowerCase().includes('provider');
    return {
      success: false,
      error: isProviderError
        ? new Error('Phone auth is not configured. Please enable the Phone provider in Supabase Dashboard.')
        : error instanceof Error ? error : new Error('Failed to send OTP'),
    };
  }
}

export async function verifyPhoneOTP(
  phone: string,
  code: string
): Promise<PhoneAuthResult> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Invalid OTP code'),
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
