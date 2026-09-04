import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createUserProfile,
  getUserById,
  markEmailVerified,
  markGoogleVerified,
  markUserVerified,
  resendVerificationEmail,
  updateUserProfile,
} from './users';

describe('users api', () => {
  it('gets user by id', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: { id: 'user-1', email: 'test@nusa.com', full_name: 'Nusa User' },
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserById(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe('user-1');
  });

  it('updates user profile fields', async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };

    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: { id: 'user-2', full_name: 'Updated Name' },
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await updateUserProfile(supabase, 'user-2', {
      full_name: 'Updated Name',
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.full_name).toBe('Updated Name');
    expect(query.update).toHaveBeenCalled();
  });

  it('creates user profile with trust level 0', async () => {
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };

    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: { id: 'new-user', trust_level: 0 },
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await createUserProfile(
      supabase,
      'new-user',
      'new@nusa.com',
      'New User'
    );

    expect(result.error).toBeUndefined();
    expect(query.insert).toHaveBeenCalledWith({
      id: 'new-user',
      email: 'new@nusa.com',
      full_name: 'New User',
      trust_level: 0,
    });
  });

  it('markUserVerified calls the mark_user_verified RPC and returns the profile', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'user-3', email_verified: true, trust_level: 1 },
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markUserVerified(supabase);

    expect(rpc).toHaveBeenCalledWith('mark_user_verified');
    expect(result.error).toBeUndefined();
    expect(result.data?.trust_level).toBe(1);
    expect(result.data?.email_verified).toBe(true);
  });

  it('markUserVerified never writes to the users table directly', async () => {
    const from = vi.fn();
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'user-3', trust_level: 1 },
      error: null,
    });
    const supabase = { rpc, from } as unknown as SupabaseClient;

    await markUserVerified(supabase);

    expect(from).not.toHaveBeenCalled();
  });

  it('markUserVerified unwraps a single-row array response', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'user-3', trust_level: 1 }],
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markUserVerified(supabase);

    expect(result.data?.id).toBe('user-3');
  });

  it('markUserVerified returns error when the RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('permission denied'),
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markUserVerified(supabase);

    expect(result.error?.message).toBe('permission denied');
    expect(result.data).toBeUndefined();
  });

  it('markUserVerified returns error when the RPC returns no row', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markUserVerified(supabase);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('markEmailVerified delegates to the mark_user_verified RPC without a direct table write', async () => {
    const from = vi.fn();
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'user-3', email_verified: true, trust_level: 1 },
      error: null,
    });
    const supabase = { rpc, from } as unknown as SupabaseClient;

    const result = await markEmailVerified(supabase, 'user-3');

    expect(rpc).toHaveBeenCalledWith('mark_user_verified');
    expect(from).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.data?.email_verified).toBe(true);
  });

  it('returns error when markEmailVerified RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markEmailVerified(supabase, 'user-3');

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('resends verification email via supabase auth', async () => {
    const supabase = {
      auth: {
        resend: vi.fn().mockResolvedValue({ error: null }),
      },
    } as unknown as SupabaseClient;

    const result = await resendVerificationEmail(supabase, 'user@example.com');

    expect(result.error).toBeUndefined();
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
    });
  });

  it('returns error when resend fails', async () => {
    const supabase = {
      auth: {
        resend: vi.fn().mockResolvedValue({ error: new Error('Rate limited') }),
      },
    } as unknown as SupabaseClient;

    const result = await resendVerificationEmail(supabase, 'user@example.com');

    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Rate limited');
  });

  it('markGoogleVerified delegates to the mark_user_verified RPC without a direct table write', async () => {
    const from = vi.fn();
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'user-5', google_verified: true, trust_level: 1 },
      error: null,
    });
    const supabase = { rpc, from } as unknown as SupabaseClient;

    const result = await markGoogleVerified(supabase, 'user-5');

    expect(rpc).toHaveBeenCalledWith('mark_user_verified');
    expect(from).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.data?.google_verified).toBe(true);
  });

  it('returns error when markGoogleVerified RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await markGoogleVerified(supabase, 'user-5');

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  describe('updateUserProfile — extended fields', () => {
    it('accepts hometown_district, college, years_in_us, languages', async () => {
      const query = {
        update: vi.fn(),
        eq: vi.fn(),
        select: vi.fn(),
        single: vi.fn(),
      };
      query.update.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.select.mockReturnValue(query);
      query.single.mockResolvedValue({
        data: {
          id: 'u-3',
          hometown_district: 'Kathmandu',
          college: 'Pulchowk',
          years_in_us: 5,
          languages: ['nepali', 'english'],
        },
        error: null,
      });
      const supabase = {
        from: vi.fn().mockReturnValue(query),
      } as unknown as SupabaseClient;

      const result = await updateUserProfile(supabase, 'u-3', {
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali', 'english'],
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.hometown_district).toBe('Kathmandu');
      expect(query.update).toHaveBeenCalledWith(
        expect.objectContaining({
          hometown_district: 'Kathmandu',
          college: 'Pulchowk',
          years_in_us: 5,
          languages: ['nepali', 'english'],
        })
      );
    });
  });
});
