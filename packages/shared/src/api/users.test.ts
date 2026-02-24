import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createUserProfile,
  getUserById,
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
});
