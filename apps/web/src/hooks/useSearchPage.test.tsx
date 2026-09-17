import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchSuggestions: vi.fn(),
  searchPosts: vi.fn(),
  searchListings: vi.fn(),
  searchPeople: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  ...mocks,
}));

import { useSearchPage } from './useSearchPage';

const group = (items: unknown[], totalCount: number) => ({ items, totalCount, hasMore: totalCount > items.length });
const base = { query: 'thapa', allMetros: false, metroId: 'metro-nyc' };

describe('useSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchSuggestions.mockResolvedValue({
      data: { posts: group([{ id: 'p1' }], 4), listings: group([], 0), people: group([{ id: 'u1' }], 1) },
    });
    mocks.searchPosts.mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], totalCount: 4, hasMore: true });
  });

  it('loads the preview and counts for the All tab', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'all' }));
    await waitFor(() => expect(result.current.counts).toEqual({ posts: 4, listings: 0, people: 1 }));
    expect(mocks.searchPosts).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('loads the first page of a type tab', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(mocks.searchPosts).toHaveBeenCalledWith({}, 'thapa', { metroId: 'metro-nyc', allMetros: false, limit: 20, offset: 0 });
    expect(result.current.items[0]).toEqual({ kind: 'post', post: { id: 'p1' } });
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page', async () => {
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    mocks.searchPosts.mockResolvedValueOnce({ data: [{ id: 'p3' }, { id: 'p4' }], totalCount: 4, hasMore: false });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(mocks.searchPosts).toHaveBeenLastCalledWith({}, 'thapa', expect.objectContaining({ offset: 2 }));
    expect(result.current.hasMore).toBe(false);
  });

  it('searches people without a metro filter flag', async () => {
    mocks.searchPeople.mockResolvedValue({ data: [{ id: 'u1' }], totalCount: 1, hasMore: false });
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'people' }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mocks.searchPeople).toHaveBeenCalledWith({}, 'thapa', { metroId: 'metro-nyc', limit: 20, offset: 0 });
  });

  it('surfaces errors and retries', async () => {
    mocks.searchPosts.mockResolvedValueOnce({ error: new Error('offline') });
    const { result } = renderHook(() => useSearchPage({ ...base, tab: 'posts' }));
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });

  it('does nothing without a query', () => {
    renderHook(() => useSearchPage({ ...base, query: null, tab: 'all' }));
    expect(mocks.searchSuggestions).not.toHaveBeenCalled();
  });
});
