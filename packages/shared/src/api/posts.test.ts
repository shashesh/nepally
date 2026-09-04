import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createPost,
  deletePost,
  getPostById,
  getPostsByAuthorId,
  getPostsByMetroArea,
  getRecentPostsCountByMetro,
} from './posts';

describe('posts api', () => {
  it('returns flattened tags and applies tag filter', async () => {
    const rawPosts = [
      {
        id: 'post-1',
        title: 'Post A',
        post_tags: [{ tag: { id: 't1', slug: 'jobs', name: 'Jobs' } }],
      },
      {
        id: 'post-2',
        title: 'Post B',
        post_tags: [{ tag: { id: 't2', slug: 'housing', name: 'Housing' } }],
      },
    ];

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({ data: rawPosts, error: null });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getPostsByMetroArea(supabase, '19100', ['jobs']);

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('post-1');
    expect(result.data?.[0].tags?.[0].slug).toBe('jobs');
    // Raw page (2 rows) is smaller than default limit (20), so no more pages.
    expect(result.hasMore).toBe(false);
  });

  it('reports hasMore=true when page is full', async () => {
    const rawPosts = Array.from({ length: 20 }, (_, i) => ({
      id: `post-${i}`,
      title: `Post ${i}`,
      post_tags: [],
    }));

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({ data: rawPosts, error: null });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getPostsByMetroArea(supabase, '19100', undefined, 20, 0);

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it('returns error for missing post in getPostById', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({ data: null, error: null });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getPostById(supabase, 'missing-post');

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('blocks createPost when user is unauthenticated', async () => {
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await createPost(supabase, {
      title: 'Need help finding room',
      description: 'Looking for a room in Dallas near transit.',
      tag_ids: ['11111111-1111-1111-1111-111111111111'],
      metroAreaId: '19100',
      locationZipCode: '75001',
      locationCity: 'Dallas',
      locationState: 'TX',
    });

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toContain('logged in');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deletes post successfully', async () => {
    const deleteBuilder = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(deleteBuilder),
      }),
    } as unknown as SupabaseClient;

    const result = await deletePost(supabase, 'post-123');

    expect(result.error).toBeNull();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'post-123');
  });
});

describe('getPostsByAuthorId', () => {
  it('defaults to active-only posts (public profile view)', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({ data: [], error: null });

    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    await getPostsByAuthorId(supabase, 'author-1');

    expect(query.eq).toHaveBeenCalledWith('author_id', 'author-1');
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
    expect(query.in).not.toHaveBeenCalled();
  });

  it('includes own pending posts when includeOwnPending is true (own profile view)', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({ data: [], error: null });

    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

    await getPostsByAuthorId(supabase, 'author-1', 20, 0, true);

    expect(query.eq).toHaveBeenCalledWith('author_id', 'author-1');
    expect(query.in).toHaveBeenCalledWith('status', ['active', 'pending']);
    expect(query.eq).not.toHaveBeenCalledWith('status', 'active');
  });
});

describe('getRecentPostsCountByMetro', () => {
  it('counts posts in metro created since the given timestamp', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    } as unknown as Record<string, ReturnType<typeof vi.fn>>;
    (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
      (res: (v: unknown) => unknown) => Promise.resolve(res({ count: 7, error: null }));

    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const res = await getRecentPostsCountByMetro(
      supabase,
      'metro-dfw',
      '2026-04-19T00:00:00Z'
    );

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'metro-dfw');
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-04-19T00:00:00Z');
    expect(res.data).toBe(7);
    expect(res.error).toBeUndefined();
  });

  it('returns 0 when count is null', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    } as unknown as Record<string, ReturnType<typeof vi.fn>>;
    (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
      (res: (v: unknown) => unknown) => Promise.resolve(res({ count: null, error: null }));

    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const res = await getRecentPostsCountByMetro(
      supabase,
      'metro-dfw',
      '2026-04-19T00:00:00Z'
    );
    expect(res.data).toBe(0);
  });
});
