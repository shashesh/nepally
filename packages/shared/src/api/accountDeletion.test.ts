import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/apiError';
import {
  cancelAccountDeletion,
  getAccountDeletionErrorCode,
  requestAccountDeletion,
} from './accountDeletion';

function clientReturning(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}

/** The shape PostgREST gives a RAISE EXCEPTION. */
function raised(message: string, code = 'P0001') {
  return { message, code, details: null, hint: null };
}

describe('requestAccountDeletion', () => {
  it('calls the RPC and resolves with the purge date', async () => {
    const { supabase, rpc } = clientReturning({ data: '2026-10-30T12:00:00+00:00', error: null });

    const result = await requestAccountDeletion(supabase);

    expect(rpc).toHaveBeenCalledWith('request_account_deletion');
    expect(result).toEqual({ data: '2026-10-30T12:00:00+00:00' });
  });

  it('turns reauth_required into a coded error with a sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('reauth_required') });

    const result = await requestAccountDeletion(supabase);

    expect(result.error).toBeInstanceOf(ApiError);
    expect(result.error?.message).toBe("Please confirm it's you again.");
    expect(getAccountDeletionErrorCode(result.error)).toBe('reauth_required');
  });

  it('turns profile_not_found into a coded error', async () => {
    const { supabase } = clientReturning({
      data: null,
      error: raised('profile_not_found', 'P0002'),
    });

    const result = await requestAccountDeletion(supabase);

    expect(getAccountDeletionErrorCode(result.error)).toBe('profile_not_found');
  });

  it('gives any other failure the fallback sentence and no code', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('boom', 'XX000') });

    const result = await requestAccountDeletion(supabase);

    expect(result.error?.message).toBe("Couldn't delete your account. Please try again.");
    expect(getAccountDeletionErrorCode(result.error)).toBeNull();
  });

  it('fails when no date comes back', async () => {
    const { supabase } = clientReturning({ data: null, error: null });

    const result = await requestAccountDeletion(supabase);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

describe('cancelAccountDeletion', () => {
  it('calls the RPC', async () => {
    const { supabase, rpc } = clientReturning({ data: null, error: null });

    expect(await cancelAccountDeletion(supabase)).toEqual({});
    expect(rpc).toHaveBeenCalledWith('cancel_account_deletion');
  });

  it('turns deletion_in_progress into a coded error with a sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('deletion_in_progress') });

    const result = await cancelAccountDeletion(supabase);

    expect(result.error?.message).toBe('Your account is already being deleted.');
    expect(getAccountDeletionErrorCode(result.error)).toBe('deletion_in_progress');
  });

  it('gives any other failure the fallback sentence', async () => {
    const { supabase } = clientReturning({ data: null, error: raised('boom', 'XX000') });

    const result = await cancelAccountDeletion(supabase);

    expect(result.error?.message).toBe("Couldn't restore your account. Please try again.");
  });
});

describe('getAccountDeletionErrorCode', () => {
  it('reads codes only from the errors these functions return', () => {
    expect(getAccountDeletionErrorCode(new Error('reauth_required'))).toBeNull();
    expect(getAccountDeletionErrorCode(undefined)).toBeNull();
    expect(getAccountDeletionErrorCode(new ApiError('x', { code: 'reauth_required' }))).toBe(
      'reauth_required'
    );
  });
});
