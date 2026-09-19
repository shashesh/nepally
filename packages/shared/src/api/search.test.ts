import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchListings, searchPeople, searchPosts, searchSuggestions } from './search';
import type { SearchPage } from '../types/search';

type Rows = Array<Record<string, unknown>>;

type Result = { data: Rows | null; error?: { message: string } | null };

interface MockConfig {
  /** An array gives each successive call to that function its own result. */
  rpc?: Record<string, Result | Result[]>;
  tables?: Record<string, Result>;
}

function createSupabase(config: MockConfig) {
  const rpcBuilders: Record<string, { order: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }> = {};
  const tableBuilders: Record<string, { select: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> }> = {};
  const rpcCallCounts: Record<string, number> = {};

  const rpc = vi.fn((fn: string) => {
    const configured = config.rpc?.[fn];
    const call = rpcCallCounts[fn] ?? 0;
    rpcCallCounts[fn] = call + 1;
    const result = (Array.isArray(configured) ? configured[call] : configured) ?? { data: [] };
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
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });

  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_posts: [
          { data: [] },
          { data: [{ id: 'p1', rank: 1, created_at: '2026-09-14T00:00:00Z', total_count: 21 }] },
        ],
      },
    });

    const result = await searchPosts(mock.supabase, 'room', { ...pageOptions, limit: 20, offset: 20 });

    expect(mock.rpc).toHaveBeenCalledTimes(2);
    expect(mock.rpcBuilders.search_posts.range).toHaveBeenCalledWith(0, 0);
    expect(mock.from).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], totalCount: 21, hasMore: false });
  });

  it('trusts an empty first page without a second request', async () => {
    const mock = createSupabase({ rpc: { search_posts: { data: [] } } });

    const result = await searchPosts(mock.supabase, 'room', pageOptions);

    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: [], totalCount: 0, hasMore: false });
  });

  it('returns an Error when re-reading the total fails', async () => {
    const mock = createSupabase({
      rpc: { search_posts: [{ data: [] }, { data: null, error: { message: 'total failed' } }] },
    });

    const result = await searchPosts(mock.supabase, 'room', { ...pageOptions, offset: 20 });

    expect(result.error?.message).toBe('total failed');
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

  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_listings: [
          { data: [] },
          { data: [{ id: 'l1', rank: 1, refreshed_at: '2026-09-14T00:00:00Z', total_count: 4 }] },
        ],
      },
    });

    const result = await searchListings(mock.supabase, 'desk', { ...pageOptions, offset: 3 });

    expect(mock.rpcBuilders.search_listings.range).toHaveBeenCalledWith(0, 0);
    expect(result).toEqual({ data: [], totalCount: 4, hasMore: false });
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

  it('re-reads the total when a page past the first comes back empty', async () => {
    const mock = createSupabase({
      rpc: {
        search_people: [
          { data: [] },
          {
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
        ],
      },
    });

    const result = await searchPeople(mock.supabase, 'thapa', { metroId: 'metro-nyc', limit: 20, offset: 20 });

    expect(mock.rpc).toHaveBeenCalledTimes(2);
    expect(mock.rpcBuilders.search_people.range).toHaveBeenCalledWith(0, 0);
    expect(result).toEqual({ data: [], totalCount: 3, hasMore: false });
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

describe('queries below the minimum length', () => {
  const searches: Array<[name: string, search: (supabase: SupabaseClient) => Promise<SearchPage<unknown>>]> = [
    ['searchPosts', (supabase) => searchPosts(supabase, 'a', pageOptions)],
    ['searchListings', (supabase) => searchListings(supabase, 'a', pageOptions)],
    ['searchPeople', (supabase) => searchPeople(supabase, 'a', { metroId: null, limit: 3, offset: 0 })],
  ];

  it.each(searches)('%s returns a new empty page every call', async (_name, search) => {
    const mock = createSupabase({});

    const first = await search(mock.supabase);
    const second = await search(mock.supabase);

    expect(first).toEqual({ data: [], totalCount: 0, hasMore: false });
    expect(second).not.toBe(first);
    expect(second.data).not.toBe(first.data);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
