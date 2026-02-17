import { supabase } from '../../config/supabase';
import type { PhoneAuthResult } from '@nusa/shared';

/**
 * Send OTP to phone number
 * Phase 1: Stub implementation (will be fully implemented in Journey #02)
 */
export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to send OTP'),
    };
  }
}

/**
 * Verify OTP code
 * Phase 1: Stub implementation
 */
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
