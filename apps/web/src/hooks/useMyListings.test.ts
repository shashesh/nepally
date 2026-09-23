import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deactivateListing,
  deleteListing,
  getListingsByOwner,
  reactivateListing,
  refreshListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { MY_LISTINGS_PAGE_SIZE, useMyListings } from './useMyListings';

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingsByOwner: vi.fn(),
  deactivateListing: vi.fn(),
  reactivateListing: vi.fn(),
  refreshListing: vi.fn(),
  deleteListing: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

const mockGetByOwner = getListingsByOwner as ReturnType<typeof vi.fn>;
const mockDeactivate = deactivateListing as ReturnType<typeof vi.fn>;
const mockReactivate = reactivateListing as ReturnType<typeof vi.fn>;
const mockRefresh = refreshListing as ReturnType<typeof vi.fn>;
const mockDelete = deleteListing as ReturnType<typeof vi.fn>;

const REFRESHED_AT = '2026-06-01T00:00:00.000Z';
const NOW = new Date('2026-09-23T12:00:00.000Z');
const fixedNow = () => NOW;

function listing(id: string, status: MarketplaceListing['status'] = 'active'): MarketplaceListing {
  return { id, title: `Listing ${id}`, status, refreshed_at: REFRESHED_AT, photos: [] } as unknown as MarketplaceListing;
}

function page(ids: string[], hasMore = false) {
  return { data: ids.map((id) => listing(id)), hasMore };
}

describe('useMyListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByOwner.mockResolvedValue(page([]));
    mockDeactivate.mockResolvedValue({});
    mockReactivate.mockResolvedValue({});
    mockRefresh.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it('loads the first page of the owner’s listings', async () => {
    mockGetByOwner.mockResolvedValue(page(['a', 'b'], true));

    const { result } = renderHook(() => useMyListings('user-1', fixedNow));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetByOwner).toHaveBeenCalledWith({}, 'user-1', MY_LISTINGS_PAGE_SIZE, 0);
    expect(result.current.listings.map((l) => l.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reports a failed first page with no rows and no more to load', async () => {
    mockGetByOwner.mockResolvedValue({ error: new Error('network down') });

    const { result } = renderHook(() => useMyListings('user-1', fixedNow));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.listings).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('reloads after a failure', async () => {
    mockGetByOwner.mockResolvedValueOnce({ error: new Error('network down') }).mockResolvedValueOnce(page(['a']));

    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.error).toBe('network down'));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['a']));
    expect(result.current.error).toBeNull();
  });

  it('asks for the next page after the rows on screen', async () => {
    mockGetByOwner.mockResolvedValueOnce(page(['a', 'b'], true)).mockResolvedValueOnce(page(['c']));

    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['a', 'b', 'c']));
    expect(mockGetByOwner).toHaveBeenLastCalledWith({}, 'user-1', MY_LISTINGS_PAGE_SIZE, 2);
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the loaded rows when a page fails, and retries it', async () => {
    mockGetByOwner
      .mockResolvedValueOnce(page(['a'], true))
      .mockResolvedValueOnce({ error: new Error('timeout') })
      .mockResolvedValueOnce(page(['b']));

    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreError).toBe('timeout'));
    expect(result.current.listings.map((l) => l.id)).toEqual(['a']);
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.retryLoadMore());

    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['a', 'b']));
    expect(result.current.loadMoreError).toBeNull();
  });

  it('marks a deactivated row inactive without fetching the list again', async () => {
    mockGetByOwner.mockResolvedValue(page(['a', 'b']));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.runAction('a', 'deactivate');
    });

    expect(ok).toBe(true);
    expect(mockDeactivate).toHaveBeenCalledWith({}, 'a');
    expect(result.current.listings[0].status).toBe('inactive');
    expect(result.current.listings[1].status).toBe('active');
    expect(mockGetByOwner).toHaveBeenCalledTimes(1);
  });

  it('reactivates a row and restarts its expiry clock', async () => {
    mockGetByOwner.mockResolvedValue({ data: [listing('a', 'inactive')], hasMore: false });
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.runAction('a', 'reactivate');
    });

    expect(result.current.listings[0].status).toBe('active');
    expect(result.current.listings[0].refreshed_at).toBe(NOW.toISOString());
  });

  it('refreshes only the expiry clock', async () => {
    mockGetByOwner.mockResolvedValue(page(['a']));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.runAction('a', 'refresh');
    });

    expect(mockRefresh).toHaveBeenCalledWith({}, 'a');
    expect(result.current.listings[0].status).toBe('active');
    expect(result.current.listings[0].refreshed_at).toBe(NOW.toISOString());
  });

  it('drops a deleted row, so the next page does not skip a listing', async () => {
    mockGetByOwner.mockResolvedValueOnce(page(['a', 'b'], true)).mockResolvedValueOnce(page(['c']));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.runAction('a', 'delete');
    });
    expect(result.current.listings.map((l) => l.id)).toEqual(['b']);

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['b', 'c']));
    expect(mockGetByOwner).toHaveBeenLastCalledWith({}, 'user-1', MY_LISTINGS_PAGE_SIZE, 1);
  });

  it('holds paging while a delete is in flight, then pages from after it', async () => {
    mockGetByOwner.mockResolvedValueOnce(page(['a', 'b'], true)).mockResolvedValueOnce(page(['c']));
    let finishDelete: (value: { error?: Error }) => void = () => {};
    mockDelete.mockReturnValue(new Promise((resolve) => (finishDelete = resolve)));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let deleting: Promise<boolean> = Promise.resolve(true);
    act(() => {
      deleting = result.current.runAction('b', 'delete');
    });
    // The row is still on screen, so an offset read now would count it.
    expect(result.current.hasMore).toBe(false);
    act(() => result.current.loadMore());
    expect(mockGetByOwner).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishDelete({});
      await deleting;
    });
    expect(result.current.hasMore).toBe(true);
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['a', 'c']));
    expect(mockGetByOwner).toHaveBeenLastCalledWith({}, 'user-1', MY_LISTINGS_PAGE_SIZE, 1);
  });

  it('waits for a page already in flight before deleting', async () => {
    let finishPage: (value: unknown) => void = () => {};
    mockGetByOwner
      .mockResolvedValueOnce(page(['a', 'b'], true))
      .mockReturnValueOnce(new Promise((resolve) => (finishPage = resolve)));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    let deleting: Promise<boolean> = Promise.resolve(true);
    act(() => {
      deleting = result.current.runAction('a', 'delete');
    });
    await act(async () => {});
    expect(mockDelete).not.toHaveBeenCalled();

    await act(async () => {
      finishPage(page(['c']));
      await deleting;
    });

    expect(mockDelete).toHaveBeenCalledWith({}, 'a');
    expect(result.current.listings.map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('leaves the row untouched when an action fails', async () => {
    mockGetByOwner.mockResolvedValue(page(['a']));
    mockDeactivate.mockResolvedValue({ error: new Error('Listing not found or not allowed') });
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.listings[0];

    let ok = true;
    await act(async () => {
      ok = await result.current.runAction('a', 'deactivate');
    });

    expect(ok).toBe(false);
    expect(result.current.listings[0]).toEqual(before);
  });

  it('marks a row pending while its action runs', async () => {
    mockGetByOwner.mockResolvedValue(page(['a']));
    let finish: (value: { error?: Error }) => void = () => {};
    mockRefresh.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useMyListings('user-1', fixedNow));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let running: Promise<boolean> = Promise.resolve(true);
    act(() => {
      running = result.current.runAction('a', 'refresh');
    });
    expect(result.current.pendingIds.has('a')).toBe(true);

    await act(async () => {
      finish({});
      await running;
    });
    expect(result.current.pendingIds.has('a')).toBe(false);
  });

  it('starts over for a different member and drops the previous member’s late page', async () => {
    let finishFirst: (value: unknown) => void = () => {};
    mockGetByOwner
      .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce(page(['mine']));

    const { result, rerender } = renderHook(({ userId }) => useMyListings(userId, fixedNow), {
      initialProps: { userId: 'user-1' },
    });
    rerender({ userId: 'user-2' });
    await waitFor(() => expect(result.current.listings.map((l) => l.id)).toEqual(['mine']));

    await act(async () => {
      finishFirst(page(['theirs']));
    });

    expect(result.current.listings.map((l) => l.id)).toEqual(['mine']);
  });

  it('loads nothing without a member', () => {
    const { result } = renderHook(() => useMyListings(null, fixedNow));

    expect(result.current.loading).toBe(false);
    expect(mockGetByOwner).not.toHaveBeenCalled();
  });
});
