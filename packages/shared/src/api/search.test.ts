import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchListings, searchPeople, searchPosts, searchSuggestions } from './search';

type Rows = Array<Record<string, unknown>>;

interface MockConfig {
  rpc?: Record<string, { data: Rows | null; error?: { message: string } | null }>;
  tables?: Record<string, { data: Rows | null; error?: { message: string } | null }>;
}

function createSupabase(config: MockConfig) {
  const rpcBuilders: Record<string, { order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }> = {};
  const tableBuilders: Record<string, { select: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> }> = {};

  const rpc = vi.fn((fn: string) => {
    const result = config.rpc?.[fn] ?? { data: [] };
    const builder = { order: vi.fn(), range: vi.fn() };
    builder.order.mockReturnValue(builder);
    builder.range.mockResolvedValue({ data: result.data, error: result.error ?? null });
    rpcBuilders[fn] = builder;
    return builder;
  });

  const from = vi.fn((table: string) => {
    const result = config.tables?.[table] ?? { data: [] };
    const builder = { select: vi.fn(), in: vi.fn() };
    builder.select.mockReturnValue(builder);
    builder.in.mockResolvedValue({ data: result.data, error: result.error ?? null });
    tableBuilders[table] = builder;
    return builder;
  });

  return { supabase: { rpc, from } as unknown as SupabaseClient, rpc, from, rpcBuilders, tableBuilders };
}

const pageOptions = { metroId: 'metro-nyc', allMetros: false, limit: 3, offset: 0 };

describe('searchPosts', () => {
  it('skips the database for queries shorter than 2 characters', async () => {
    const mock = createSupabase({});
    await expect(searchPosts(mock.supabase, ' a ', pageOptions)).resolves.toEqual({ data: [], totalCount: 0, hasMore: false });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('ranks via search_posts, then hydrates rows in rank order', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: {
          data: [
            { id: 'p2', rank: 0.9, created_at: '2026-09-14T00:00:00Z', total_count: 5 },
            { id: 'p1', rank: 0.4, created_at: '2026-09-13T00:00:00Z', total_count: 5 },
          ],
        },
      },
      tables: {
        posts: {
          data: [
            { id: 'p1', title: 'One', post_tags: [] },
            { id: 'p2', title: 'Two', post_tags: [{ tag: { id: 't', slug: 'jobs', name: 'Jobs' } }] },
          ],
        },
      },
    });

    const result = await searchPosts(mock.supabase, '  thapa ', pageOptions);

    expect(mock.rpc).toHaveBeenCalledWith('search_posts', { p_query: 'thapa', p_metro_id: 'metro-nyc', p_all_metros: false });
    expect(mock.rpcBuilders.search_posts.order).toHaveBeenNthCalledWith(1, 'rank', { ascending: false });
    expect(mock.rpcBuilders.search_posts.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 2);
    expect(mock.tableBuilders.posts.in).toHaveBeenCalledWith('id', ['p2', 'p1']);
    expect(result.data?.map((post) => post.id)).toEqual(['p2', 'p1']);
    expect(result.data?.[0].tags?.[0].slug).toBe('jobs');
    expect(result.totalCount).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('drops ids whose rows are no longer visible', async () => {
    const mock = createSupabase({
      rpc: { search_posts: { data: [{ id: 'gone', rank: 1, total_count: 1 }, { id: 'p1', rank: 0.5, total_count: 1 }] } },
      tables: { posts: { data: [{ id: 'p1', title: 'One', post_tags: [] }] } },
    });
    const result = await searchPosts(mock.supabase, 'room', pageOptions);
    expect(result.data?.map((post) => post.id)).toEqual(['p1']);
  });

  it('returns an Error when the function fails', async () => {
    const mock = createSupabase({ rpc: { search_posts: { data: null, error: { message: 'boom' } } } });
    const result = await searchPosts(mock.supabase, 'room', pageOptions);
    expect(result.error?.message).toBe('boom');
  });
});

describe('searchListings', () => {
  it('orders by refreshed_at and hydrates from the listings view', async () => {
    const mock = createSupabase({
      rpc: { search_listings: { data: [{ id: 'l1', rank: 0.5, refreshed_at: '2026-09-14T00:00:00Z', total_count: 1 }] } },
      tables: { marketplace_listings_view: { data: [{ id: 'l1', title: 'Desk' }] } },
    });
    const result = await searchListings(mock.supabase, 'desk', { ...pageOptions, allMetros: true });
    expect(mock.rpc).toHaveBeenCalledWith('search_listings', { p_query: 'desk', p_metro_id: 'metro-nyc', p_all_metros: true });
    expect(mock.rpcBuilders.search_listings.order).toHaveBeenNthCalledWith(2, 'refreshed_at', { ascending: false });
    expect(result.data?.[0].id).toBe('l1');
    expect(result.hasMore).toBe(false);
  });
});

describe('searchPeople', () => {
  it('ranks local members first and returns public fields only', async () => {
    const mock = createSupabase({
      rpc: {
        search_people: {
          data: [
            {
              id: 'u1',
              full_name: 'Bikash Thapa',
              profile_photo: null,
              trust_level: 2,
              metro_area_id: 'metro-nyc',
              follower_count: 128,
              is_local: true,
              rank: 0.6,
              total_count: 3,
            },
          ],
        },
      },
    });
    const result = await searchPeople(mock.supabase, 'thapa', { metroId: 'metro-nyc', limit: 1, offset: 0 });
    expect(mock.rpc).toHaveBeenCalledWith('search_people', { p_query: 'thapa', p_metro_id: 'metro-nyc' });
    // `id` last keeps offset paging stable when rank and follower_count tie.
    expect(mock.rpcBuilders.search_people.order.mock.calls.map((call) => call[0])).toEqual([
      'is_local',
      'rank',
      'follower_count',
      'id',
    ]);
    expect(result.data).toEqual([
      {
        id: 'u1',
        full_name: 'Bikash Thapa',
        profile_photo: null,
        trust_level: 2,
        metro_area_id: 'metro-nyc',
        follower_count: 128,
        is_local: true,
      },
    ]);
    expect(result.hasMore).toBe(true);
    expect(mock.from).not.toHaveBeenCalled();
  });
});

describe('searchSuggestions', () => {
  it('queries all three groups with the suggestion limits', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: { data: [{ id: 'p1', rank: 1, total_count: 7 }] },
        search_listings: { data: [] },
        search_people: { data: [] },
      },
      tables: { posts: { data: [{ id: 'p1', title: 'One', post_tags: [] }] } },
    });

    const result = await searchSuggestions(mock.supabase, 'thapa', { metroId: 'metro-nyc', allMetros: false });

    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 2);
    expect(mock.rpcBuilders.search_listings.range).toHaveBeenCalledWith(0, 1);
    expect(mock.rpcBuilders.search_people.range).toHaveBeenCalledWith(0, 2);
    expect(result.data?.posts).toEqual({ items: [expect.objectContaining({ id: 'p1' })], totalCount: 7, hasMore: true });
    expect(result.data?.listings).toEqual({ items: [], totalCount: 0, hasMore: false });
  });

  it('surfaces the first error', async () => {
    const mock = createSupabase({ rpc: { search_people: { data: null, error: { message: 'people failed' } } } });
    const result = await searchSuggestions(mock.supabase, 'thapa', { metroId: null, allMetros: true });
    expect(result.error?.message).toBe('people failed');
    expect(result.data).toBeUndefined();
  });
});
