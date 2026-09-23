import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deactivateListing,
  deleteListing,
  getListingsByOwner,
  reactivateListing,
  refreshListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../lib/supabase';

export const MY_LISTINGS_PAGE_SIZE = 20;

export type ListingAction = 'deactivate' | 'reactivate' | 'refresh' | 'delete';

export interface MyListingsState {
  listings: MarketplaceListing[];
  loading: boolean;
  /** Non-null when the first page failed. The rows are cleared, never stale. */
  error: string | null;
  loadingMore: boolean;
  /** Non-null when paging failed, so the footer can say so and offer a retry. */
  loadMoreError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retryLoadMore: () => void;
  reload: () => void;
  /** Ids with an action in flight, so their menus can disable. */
  pendingIds: ReadonlySet<string>;
  /**
   * Runs the action, then patches or drops that one row. Resolves false on
   * failure, with the row exactly as it was.
   */
  runAction: (id: string, action: ListingAction) => Promise<boolean>;
}

const ACTIONS: Record<ListingAction, typeof deactivateListing> = {
  deactivate: deactivateListing,
  reactivate: reactivateListing,
  refresh: refreshListing,
  delete: deleteListing,
};

/** What a successful action changed on the row, mirroring what the API wrote. */
function patchFor(action: ListingAction, now: Date): Partial<MarketplaceListing> {
  switch (action) {
    case 'deactivate':
      return { status: 'inactive' };
    case 'reactivate':
      return { status: 'active', refreshed_at: now.toISOString() };
    case 'refresh':
      return { refreshed_at: now.toISOString() };
    case 'delete':
      return {};
  }
}

/** Adds a page, skipping ids already on screen. */
function appendPage(current: MarketplaceListing[], rows: MarketplaceListing[]) {
  const seen = new Set(current.map((l) => l.id));
  const fresh = rows.filter((l) => !seen.has(l.id));
  return fresh.length ? [...current, ...fresh] : current;
}

const systemNow = () => new Date();

/**
 * A member's own listings, paged, with the actions they can take on each.
 *
 * An action updates the one row it changed rather than re-fetching the list.
 * Re-fetching is what hid unchecked results before: a failed deactivate
 * re-rendered the list unchanged, which looked like nothing happened. Now a
 * failure resolves false and the caller says so.
 *
 * The next page starts at `listings.length`. A deleted listing leaves the
 * screen and the server's results alike, so counting rows on screen keeps the
 * two in step — offsetting by rows fetched would skip one listing per delete.
 */
export function useMyListings(userId: string | null, now: () => Date = systemNow): MyListingsState {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped by each load; a page requested under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const pendingRef = useRef(new Set<string>());

  // A different member starts from nothing (react.dev: adjusting state when a prop changes).
  const [loadedUserId, setLoadedUserId] = useState(userId);
  if (userId !== loadedUserId) {
    setLoadedUserId(userId);
    setListings([]);
    setLoading(Boolean(userId));
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
  }

  useEffect(() => {
    // Bump first, even with no member, so a page already in flight is dropped.
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    if (!userId) return;

    void getListingsByOwner(supabase, userId, MY_LISTINGS_PAGE_SIZE, 0).then((result) => {
      if (generation !== generationRef.current) return;
      if (result.error) {
        setListings([]);
        setHasMore(false);
        setError(result.error.message);
      } else {
        setListings(result.data ?? []);
        setHasMore(Boolean(result.hasMore));
        setError(null);
      }
      setLoadMoreError(null);
      setLoading(false);
    });
  }, [userId, reloadKey]);

  const reload = useCallback(() => {
    setListings([]);
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
    setReloadKey((key) => key + 1);
  }, []);

  const offset = listings.length;
  const requestNextPage = useCallback(() => {
    if (!userId || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    void getListingsByOwner(supabase, userId, MY_LISTINGS_PAGE_SIZE, offset).then((result) => {
      if (generation !== generationRef.current) return;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (result.error) {
        setLoadMoreError(result.error.message);
        return;
      }
      setListings((rows) => appendPage(rows, result.data ?? []));
      setHasMore(Boolean(result.hasMore));
    });
  }, [userId, offset]);

  const loadMore = useCallback(() => {
    if (loadMoreError || loading || !hasMore) return;
    requestNextPage();
  }, [loadMoreError, loading, hasMore, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    requestNextPage();
  }, [requestNextPage]);

  const setPending = useCallback((id: string, isPending: boolean) => {
    if (isPending) pendingRef.current.add(id);
    else pendingRef.current.delete(id);
    setPendingIds(new Set(pendingRef.current));
  }, []);

  const runAction = useCallback(
    async (id: string, action: ListingAction): Promise<boolean> => {
      if (pendingRef.current.has(id)) return false;

      setPending(id, true);
      const generation = generationRef.current;
      const result = await ACTIONS[action](supabase, id);
      setPending(id, false);
      // The list was reloaded or the member changed; there is no row to patch.
      if (generation !== generationRef.current) return !result.error;
      if (result.error) return false;

      if (action === 'delete') {
        setListings((rows) => rows.filter((l) => l.id !== id));
      } else {
        const patch = patchFor(action, now());
        setListings((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      }
      return true;
    },
    [now, setPending]
  );

  const hasUser = Boolean(userId);
  return {
    listings,
    loading: hasUser && loading,
    error,
    loadingMore,
    loadMoreError,
    hasMore: hasUser && !loading && hasMore && loadMoreError === null,
    loadMore,
    retryLoadMore,
    reload,
    pendingIds,
    runAction,
  };
}
