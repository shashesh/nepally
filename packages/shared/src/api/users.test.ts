import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createUserProfile,
  getMyProfile,
  getUserById,
  markEmailVerified,
  markGoogleVerified,
  markUserVerified,
  removeProfilePhoto,
  resendVerificationEmail,
  updateUserLocation,
  updateUserProfile,
} from './users';
import { PUBLIC_USER_COLUMNS } from '../constants/users';

/** Mocks the get_my_profile RPC: `supabase.rpc('get_my_profile').maybeSingle()`. */
function mockOwnProfileRpc(row: Record<string, unknown> | null, error: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const rpc = vi.fn().mockReturnValue({ maybeSingle });
  return { rpc, maybeSingle };
}

describe('users api', () => {
  it('gets another user by id selecting only public columns', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: { id: 'user-1', full_name: 'Nusa User', trust_level: 1 },
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserById(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe('user-1');
    expect(query.select).toHaveBeenCalledWith(PUBLIC_USER_COLUMNS);
  });

  it('getUserById never requests PII columns or select(*)', async () => {
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({ data: { id: 'user-1' }, error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    await getUserById(supabase, 'user-1');

    const selected = query.select.mock.calls[0][0] as string;
    expect(selected).not.toBe('*');
    const columns = selected.split(',').map((c) => c.trim());
    for (const column of ['email', 'phone', 'zip_code', 'ban_reason', 'reports_received']) {
      expect(columns).not.toContain(column);
    }
  });

  it('getMyProfile reads the full own row through the get_my_profile RPC', async () => {
    const { rpc } = mockOwnProfileRpc({
      id: 'user-1',
      email: 'me@nusa.com',
      phone: '555-0100',
      zip_code: '75001',
    });
    const from = vi.fn();
    const supabase = { rpc, from } as unknown as SupabaseClient;

    const result = await getMyProfile(supabase);

    expect(rpc).toHaveBeenCalledWith('get_my_profile');
    expect(from).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.data?.email).toBe('me@nusa.com');
    expect(result.data?.zip_code).toBe('75001');
  });

  it('getMyProfile resolves with no data and no error when the profile row is missing', async () => {
    const { rpc } = mockOwnProfileRpc(null);
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await getMyProfile(supabase);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('getMyProfile returns the RPC error', async () => {
    const { rpc } = mockOwnProfileRpc(null, new Error('permission denied'));
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await getMyProfile(supabase);

    expect(result.error?.message).toBe('permission denied');
    expect(result.data).toBeUndefined();
  });

  it('updates user profile fields and re-reads the own row via RPC', async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
    };

    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });

    const { rpc } = mockOwnProfileRpc({
      id: 'user-2',
      full_name: 'Updated Name',
      email: 'me@nusa.com',
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
      rpc,
    } as unknown as SupabaseClient;

    const result = await updateUserProfile(supabase, 'user-2', {
      full_name: 'Updated Name',
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.full_name).toBe('Updated Name');
    expect(result.data?.email).toBe('me@nusa.com');
    expect(query.update).toHaveBeenCalled();
    // A RETURNING select would need SELECT on every column, which clients no longer have.
    expect(query.select).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('get_my_profile');
  });

  it('updateUserProfile surfaces the write error without reading back', async () => {
    const query = { update: vi.fn(), eq: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: new Error('row-level security') });
    const { rpc } = mockOwnProfileRpc({ id: 'user-2' });
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient;

    const result = await updateUserProfile(supabase, 'user-2', { bio: 'x' });

    expect(result.error?.message).toBe('row-level security');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('updateUserProfile fails loudly when the read-back does not match the requested user', async () => {
    const query = { update: vi.fn(), eq: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });
    // get_my_profile() is driven by auth.uid(), not the userId argument — if a
    // mismatched userId meant the write's RLS policy touched zero rows, this
    // would otherwise return the caller's own unrelated profile as a "success".
    const { rpc } = mockOwnProfileRpc({ id: 'someone-else' });
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient;

    const result = await updateUserProfile(supabase, 'user-2', { bio: 'x' });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('someone-else');
    expect(result.error?.message).toContain('user-2');
    expect(result.data).toBeUndefined();
  });

  it('updates user location and re-reads the own row via RPC', async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });
    const { rpc } = mockOwnProfileRpc({ id: 'user-2', zip_code: '75001', metro_area_id: '19100' });
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient;

    const result = await updateUserLocation(supabase, 'user-2', '75001', '19100');

    expect(result.error).toBeUndefined();
    expect(result.data?.zip_code).toBe('75001');
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ zip_code: '75001', metro_area_id: '19100' })
    );
    expect(query.select).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('get_my_profile');
  });

  it('updateUserLocation fails loudly when the read-back does not match the requested user', async () => {
    const query = { update: vi.fn(), eq: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });
    const { rpc } = mockOwnProfileRpc({ id: 'someone-else' });
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient;

    const result = await updateUserLocation(supabase, 'user-2', '75001', '19100');

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('someone-else');
    expect(result.error?.message).toContain('user-2');
    expect(result.data).toBeUndefined();
  });

  it('creates user profile with trust level 0 and returns the row via RPC', async () => {
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
    };

    query.insert.mockResolvedValue({ error: null });
    const { rpc } = mockOwnProfileRpc({ id: 'new-user', trust_level: 0, email: 'new@nusa.com' });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
      rpc,
    } as unknown as SupabaseClient;

    const result = await createUserProfile(
      supabase,
      'new-user',
      'new@nusa.com',
      'New User'
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe('new-user');
    expect(query.insert).toHaveBeenCalledWith({
      id: 'new-user',
      email: 'new@nusa.com',
      full_name: 'New User',
      trust_level: 0,
    });
    expect(query.select).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('get_my_profile');
  });

  it('createUserProfile fails loudly when the read-back does not match the requested user', async () => {
    const query = { insert: vi.fn() };
    query.insert.mockResolvedValue({ error: null });
    const { rpc } = mockOwnProfileRpc({ id: 'someone-else' });
    const supabase = { from: vi.fn().mockReturnValue(query), rpc } as unknown as SupabaseClient;

    const result = await createUserProfile(supabase, 'new-user', 'new@nusa.com', 'New User');

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('someone-else');
    expect(result.error?.message).toContain('new-user');
    expect(result.data).toBeUndefined();
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

  describe('removeProfilePhoto', () => {
    it('clears profile_photo on the row, then deletes <userId>.jpg from the avatars bucket', async () => {
      const query = { update: vi.fn(), eq: vi.fn() };
      query.update.mockReturnValue(query);
      query.eq.mockResolvedValue({ error: null });
      const { rpc } = mockOwnProfileRpc({ id: 'user-1', profile_photo: null });
      const remove = vi.fn().mockResolvedValue({ data: [], error: null });
      const storageFrom = vi.fn().mockReturnValue({ remove });
      const supabase = {
        from: vi.fn().mockReturnValue(query),
        rpc,
        storage: { from: storageFrom },
      } as unknown as SupabaseClient;

      const result = await removeProfilePhoto(supabase, 'user-1');

      expect(result.error).toBeUndefined();
      expect(query.update).toHaveBeenCalledWith(
        expect.objectContaining({ profile_photo: null })
      );
      // 'avatars' is AVATARS_BUCKET in storage.ts (not exported).
      expect(storageFrom).toHaveBeenCalledWith('avatars');
      expect(remove).toHaveBeenCalledWith(['user-1.jpg']);
    });

    it('does not touch storage when clearing the column fails', async () => {
      const query = { update: vi.fn(), eq: vi.fn() };
      query.update.mockReturnValue(query);
      query.eq.mockResolvedValue({ error: new Error('row-level security') });
      const { rpc } = mockOwnProfileRpc({ id: 'user-1' });
      const remove = vi.fn();
      const storageFrom = vi.fn().mockReturnValue({ remove });
      const supabase = {
        from: vi.fn().mockReturnValue(query),
        rpc,
        storage: { from: storageFrom },
      } as unknown as SupabaseClient;

      const result = await removeProfilePhoto(supabase, 'user-1');

      expect(result.error?.message).toBe('row-level security');
      expect(remove).not.toHaveBeenCalled();
    });

    it('still succeeds when the storage delete fails, since the next upload overwrites the orphaned file', async () => {
      const query = { update: vi.fn(), eq: vi.fn() };
      query.update.mockReturnValue(query);
      query.eq.mockResolvedValue({ error: null });
      const { rpc } = mockOwnProfileRpc({ id: 'user-1', profile_photo: null });
      const remove = vi.fn().mockResolvedValue({ data: null, error: new Error('storage unavailable') });
      const storageFrom = vi.fn().mockReturnValue({ remove });
      const supabase = {
        from: vi.fn().mockReturnValue(query),
        rpc,
        storage: { from: storageFrom },
      } as unknown as SupabaseClient;

      const result = await removeProfilePhoto(supabase, 'user-1');

      expect(result.error).toBeUndefined();
      // Proves the failure path actually ran, not just that the mock was wired.
      expect(remove).toHaveBeenCalledWith(['user-1.jpg']);
    });
  });

  describe('updateUserProfile — extended fields', () => {
    it('accepts hometown_district, college, years_in_us, languages', async () => {
      const query = { update: vi.fn(), eq: vi.fn() };
      query.update.mockReturnValue(query);
      query.eq.mockResolvedValue({ error: null });
      const { rpc } = mockOwnProfileRpc({
        id: 'u-3',
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali', 'english'],
      });
      const supabase = {
        from: vi.fn().mockReturnValue(query),
        rpc,
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
