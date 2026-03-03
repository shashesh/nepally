import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserSettings, upsertUserSettings } from './userSettings';
import type { UserSettings } from '../types/user';

const mockSettings: UserSettings = {
  user_id: 'u1',
  email_notifications: true,
  push_notifications: true,
  emergency_alerts: true,
  metro_area_alerts: true,
  notify_chat: 'all',
  notify_comments: true,
  notify_likes: 'grouped',
};

describe('getUserSettings', () => {
  it('returns settings when row exists', async () => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.maybeSingle.mockResolvedValue({ data: mockSettings, error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getUserSettings(supabase, 'u1');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(mockSettings);
  });

  it('returns undefined data (no error) when no settings row exists', async () => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.maybeSingle.mockResolvedValue({ data: null, error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getUserSettings(supabase, 'u1');

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('returns error when supabase fails', async () => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getUserSettings(supabase, 'u1');

    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('upsertUserSettings', () => {
  it('upserts settings with user_id and updated_at', async () => {
    const q = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await upsertUserSettings(supabase, 'u1', {
      push_notifications: false,
      notify_chat: 'off',
    });

    expect(result.error).toBeUndefined();
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        push_notifications: false,
        notify_chat: 'off',
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    );
  });

  it('returns error when upsert fails', async () => {
    const q = {
      upsert: vi.fn().mockResolvedValue({ error: { message: 'Upsert failed' } }),
    };

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await upsertUserSettings(supabase, 'u1', { push_notifications: false });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Upsert failed');
  });
});
