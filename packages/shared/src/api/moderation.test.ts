import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPendingPosts,
  getPostsByIds,
  setPostModerationStatus,
  setUserBanStatus,
} from './moderation';

function chainableQuery(resolved: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.range.mockResolvedValue(resolved);
  query.single.mockResolvedValue(resolved);
  return query;
}

describe('getPendingPosts', () => {
  it('queries pending posts oldest-first with flattened tags', async () => {
    const rows = [
      {
        id: 'post-1',
        title: 'Need help',
        status: 'pending',
        post_tags: [{ tag: { id: 't1', slug: 'emergency', name: 'Emergency' } }],
      },
    ];
    const query = chainableQuery({ data: rows, error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await getPendingPosts(supabase);

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 49);
    expect(result.error).toBeUndefined();
    expect(result.data?.[0].tags?.[0].slug).toBe('emergency');
  });

  it('returns error when the query fails', async () => {
    const query = chainableQuery({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await getPendingPosts(supabase);

    expect(result.error?.message).toBe('boom');
    expect(result.data).toBeUndefined();
  });
});

describe('getPostsByIds', () => {
  it('returns an empty list without querying when no ids are given', async () => {
    const from = vi.fn();
    const supabase = { from } as unknown as SupabaseClient;

    const result = await getPostsByIds(supabase, []);

    expect(result.data).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('fetches every id in a single query and flattens tags', async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({
      data: [{ id: 'post-9', post_tags: [{ tag: { id: 't1', slug: 'jobs', name: 'Jobs' } }] }],
      error: null,
    });

    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await getPostsByIds(supabase, ['post-9', 'post-1']);

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(query.in).toHaveBeenCalledWith('id', ['post-9', 'post-1']);
    expect(result.data?.[0].tags?.[0].slug).toBe('jobs');
  });

  it('returns error when the query fails', async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({ data: null, error: new Error('boom') });

    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await getPostsByIds(supabase, ['post-9']);

    expect(result.error?.message).toBe('boom');
    expect(result.data).toBeUndefined();
  });
});

describe('setPostModerationStatus', () => {
  it('updates the post status and returns the flattened post', async () => {
    const row = { id: 'post-1', status: 'active', post_tags: [] };
    const query = chainableQuery({ data: row, error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await setPostModerationStatus(supabase, 'post-1', 'active');

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(query.eq).toHaveBeenCalledWith('id', 'post-1');
    expect(result.error).toBeUndefined();
    expect(result.data?.status).toBe('active');
    expect(result.data?.tags).toEqual([]);
  });

  it('returns error when the update is rejected', async () => {
    const query = chainableQuery({ data: null, error: new Error('permission denied') });
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    const result = await setPostModerationStatus(supabase, 'post-1', 'removed');

    expect(result.error?.message).toBe('permission denied');
    expect(result.data).toBeUndefined();
  });
});

describe('setUserBanStatus', () => {
  it('calls the moderate_user RPC with ban parameters', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'user-9', is_banned: true, ban_reason: 'Spam' },
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await setUserBanStatus(supabase, 'user-9', true, 'Spam');

    expect(rpc).toHaveBeenCalledWith('moderate_user', {
      p_user_id: 'user-9',
      p_banned: true,
      p_reason: 'Spam',
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.is_banned).toBe(true);
  });

  it('sends a null reason when unbanning without one', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'user-9', is_banned: false, ban_reason: null }],
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await setUserBanStatus(supabase, 'user-9', false);

    expect(rpc).toHaveBeenCalledWith('moderate_user', {
      p_user_id: 'user-9',
      p_banned: false,
      p_reason: null,
    });
    expect(result.data?.is_banned).toBe(false);
  });

  it('returns error when the RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Only moderators can ban or unban users'),
    });
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await setUserBanStatus(supabase, 'user-9', true);

    expect(result.error?.message).toBe('Only moderators can ban or unban users');
    expect(result.data).toBeUndefined();
  });
});
