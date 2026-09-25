import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isConnectionError } from '../logic/authErrors';
import { requestPasswordReset } from './auth';

function clientWith(resetPasswordForEmail: ReturnType<typeof vi.fn>): SupabaseClient {
  return { auth: { resetPasswordForEmail } } as unknown as SupabaseClient;
}

describe('requestPasswordReset', () => {
  it('asks Supabase to send the reset email with the redirect', async () => {
    const reset = vi.fn().mockResolvedValue({ data: {}, error: null });

    const result = await requestPasswordReset(clientWith(reset), 'bikal@example.com', 'https://nepally.us/login');

    expect(reset).toHaveBeenCalledWith('bikal@example.com', { redirectTo: 'https://nepally.us/login' });
    expect(result).toEqual({});
  });

  it('returns the error Supabase returns', async () => {
    const error = Object.assign(new Error('Email rate limit exceeded'), { code: 'over_email_send_rate_limit' });
    const reset = vi.fn().mockResolvedValue({ data: null, error });

    const result = await requestPasswordReset(clientWith(reset), 'bikal@example.com', 'https://nepally.us/login');

    expect(result.error).toBe(error);
  });

  it('returns a thrown Error rather than rejecting', async () => {
    const thrown = new Error('boom');
    const reset = vi.fn().mockRejectedValue(thrown);

    const result = await requestPasswordReset(clientWith(reset), 'bikal@example.com', 'https://nepally.us/login');

    expect(result.error).toBe(thrown);
  });

  it('wraps a thrown non-Error, keeping a fetch failure a connection error', async () => {
    const reset = vi.fn().mockRejectedValue({ message: 'TypeError: Failed to fetch', code: '' });

    const result = await requestPasswordReset(clientWith(reset), 'bikal@example.com', 'https://nepally.us/login');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Failed to send password reset email');
    expect(isConnectionError(result.error)).toBe(true);
  });
});
