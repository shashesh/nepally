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
import { userMessage } from '../lib/userMessage';

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
 * That only holds when a delete and a page never overlap, so they are
 * serialized: a delete waits for a page already in flight, and no page is
 * requested (`hasMore` reads false) until a pending delete has landed.
 */
export function useMyListings(userId: string | null, now: () => Date = systemNow): MyListingsState {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped by each load; a page requested under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const pendingRef = useRef(new Set<string>());
  const deletesInFlightRef = useRef(0);
  // The page request in flight, so a delete can wait for it to land.
  const pageRequestRef = useRef<Promise<void> | null>(null);

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
        setError(userMessage(result.error, "Couldn't load your listings.", 'my_listings_load_failed', { platform: 'web', userId }));
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
    if (!userId || loadingMoreRef.current || deletesInFlightRef.current > 0) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const request: Promise<void> = getListingsByOwner(supabase, userId, MY_LISTINGS_PAGE_SIZE, offset).then((result) => {
      // Only this request's own slot: a page from before a reload can land
      // after a newer one started, and clearing that would let a delete stop
      // waiting for the page it must not overlap.
      if (pageRequestRef.current === request) pageRequestRef.current = null;
      if (generation !== generationRef.current) return;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (result.error) {
        setLoadMoreError(
          userMessage(result.error, "Couldn't load more listings.", 'my_listings_load_more_failed', {
            platform: 'web',
            userId,
            offset,
          })
        );
        return;
      }
      setListings((rows) => appendPage(rows, result.data ?? []));
      setHasMore(Boolean(result.hasMore));
    });
    pageRequestRef.current = request;
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

      const isDelete = action === 'delete';
      setPending(id, true);
      if (isDelete) {
        deletesInFlightRef.current += 1;
        setDeleting(true);
      }
      try {
        const generation = generationRef.current;
        // A page requested before this delete counted the row at its old offset.
        if (isDelete && pageRequestRef.current) {
          await pageRequestRef.current;
          // The list was reloaded or the member changed while this waited:
          // the row it confirmed against is gone, so send nothing.
          if (generation !== generationRef.current) return false;
        }
        const result = await ACTIONS[action](supabase, id);
        // The list was reloaded or the member changed; there is no row to patch.
        if (generation !== generationRef.current) return !result.error;
        if (result.error) return false;

        if (isDelete) {
          setListings((rows) => rows.filter((l) => l.id !== id));
        } else {
          const patch = patchFor(action, now());
          setListings((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)));
        }
        return true;
      } finally {
        setPending(id, false);
        if (isDelete) {
          deletesInFlightRef.current -= 1;
          setDeleting(deletesInFlightRef.current > 0);
        }
      }
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
    hasMore: hasUser && !loading && !deleting && hasMore && loadMoreError === null,
    loadMore,
    retryLoadMore,
    reload,
    pendingIds,
    runAction,
  };
}
