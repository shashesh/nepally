import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFeaturedListings,
  getListingsByMetro,
  getStickyBusinessListings,
  getTrendingListings,
  userMessage,
  type ListingsResult,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../config/supabase';

const GRID_LIMIT = 20;
const STRIP_LIMIT = 10;
const SPONSORED_LIMIT = 5;
const LOAD_FAILED = "Couldn't load listings.";
const LOAD_MORE_FAILED = "Couldn't load more listings.";
const REFRESH_FAILED = "Couldn't refresh listings.";

export interface MarketplaceFeedFilters {
  /** '' for every category. */
  categorySlug: string;
  /** '' for no search. */
  searchQuery: string;
}

export interface MarketplaceFeedState {
  sponsored: MarketplaceListing[];
  featured: MarketplaceListing[];
  recent: MarketplaceListing[];
  trending: MarketplaceListing[];
  grid: MarketplaceListing[];
  /** The first load for this metro and filter; nothing is on screen yet. */
  loading: boolean;
  /** A pull-to-refresh is reloading; the rows stay on screen until it lands. */
  refreshing: boolean;
  /** The page failed with nothing to show: the grid gives way to this message. */
  error: string | null;
  /** A pull-to-refresh failed while rows were on screen; they stay, and this says so. */
  refreshError: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** More pages exist and paging isn't paused by a failure. */
  hasMore: boolean;
  /** Starts over from nothing (Try again). */
  reload: () => void;
  /** Reloads the first page and strips, keeping the rows until they land (pull-to-refresh). */
  refresh: () => void;
  /**
   * Refetches quietly, for coming back to the screen: new rows go on top, pages
   * already loaded stay, and a failure leaves the screen as it was.
   */
  revalidate: () => void;
  loadMore: () => void;
  /** Clears loadMoreError and loads the next page. */
  retryLoadMore: () => void;
}

interface Sections {
  sponsored: MarketplaceListing[];
  featured: MarketplaceListing[];
  recent: MarketplaceListing[];
  trending: MarketplaceListing[];
}

const EMPTY_SECTIONS: Sections = { sponsored: [], featured: [], recent: [], trending: [] };

type LoadMode = 'initial' | 'refresh' | 'revalidate';

interface LoadRequest {
  count: number;
  mode: LoadMode;
  /** The feed the request was made for; a request for another feed loads from scratch. */
  feedKey: string | null;
}

const NO_ROWS: Promise<ListingsResult> = Promise.resolve({ data: [] });

/** Adds a page, skipping ids already on screen. */
function appendPage(current: MarketplaceListing[], rows: MarketplaceListing[]) {
  const seen = new Set(current.map((listing) => listing.id));
  const fresh = rows.filter((listing) => !seen.has(listing.id));
  return fresh.length ? [...current, ...fresh] : current;
}

/** Puts a fresh first page on top and keeps every loaded row it doesn't repeat. */
function mergeFirstPage(current: MarketplaceListing[], rows: MarketplaceListing[]) {
  const fresh = new Set(rows.map((listing) => listing.id));
  return [...rows, ...current.filter((listing) => !fresh.has(listing.id))];
}

function fetchGridPage(metroId: string, filters: MarketplaceFeedFilters, offset: number) {
  return getListingsByMetro(supabase, metroId, {
    categorySlug: filters.categorySlug || undefined,
    searchQuery: filters.searchQuery || undefined,
    sortBy: 'newest',
    limit: GRID_LIMIT,
    offset,
  });
}

/**
 * The grid's first page and the strips. The strips are the unnarrowed view's
 * content, as on web; a category keeps its own featured strip, and a search
 * has none. A strip that fails comes back empty and hides itself.
 */
async function fetchFirstLoad(metroId: string, filters: MarketplaceFeedFilters) {
  const filtered = Boolean(filters.categorySlug || filters.searchQuery);
  const wantsCategoryStrip = Boolean(filters.categorySlug) && !filters.searchQuery;

  const [grid, featured, recent, trending, sponsored] = await Promise.all([
    fetchGridPage(metroId, filters, 0),
    !filtered
      ? getFeaturedListings(supabase, metroId, { limit: STRIP_LIMIT })
      : wantsCategoryStrip
        ? getFeaturedListings(supabase, metroId, { limit: STRIP_LIMIT, categorySlug: filters.categorySlug })
        : NO_ROWS,
    !filtered ? getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: STRIP_LIMIT }) : NO_ROWS,
    !filtered ? getTrendingListings(supabase, metroId, { limit: STRIP_LIMIT }) : NO_ROWS,
    !filtered
      ? getStickyBusinessListings(supabase, metroId, { limit: SPONSORED_LIMIT })
      : Promise.resolve({ data: [] }),
  ]);

  const sections: Sections = {
    sponsored: (sponsored.data ?? []).map((row) => row.listing),
    featured: featured.data ?? [],
    recent: recent.data ?? [],
    trending: trending.data ?? [],
  };
  return { grid, sections };
}

/**
 * A metro's marketplace home, as web's useMarketplaceFeed builds it: the
 * discovery strips when nothing narrows the view, the All Listings grid and
 * its paging in every mode, and loading, empty and failed kept apart. A
 * response for a feed the member has already left is dropped.
 */
export function useMarketplaceFeed(
  metroId: string,
  filters: MarketplaceFeedFilters
): MarketplaceFeedState {
  // Destructured so effects and callbacks depend on primitives, not a fresh object.
  const { categorySlug, searchQuery } = filters;

  const [sections, setSections] = useState<Sections>(EMPTY_SECTIONS);
  const [grid, setGrid] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  /**
   * Where the next page starts, counted in rows the API consumed. A category
   * filter drops rows after the query, so a full window can arrive short;
   * offsetting by grid.length would re-request the same window.
   */
  const [offset, setOffset] = useState(0);

  // Bumped by each load that replaces the rows; a page requested under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);
  // Read when a pull-to-refresh fails: rows on screen stay rather than give way to the error.
  const gridCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    gridCountRef.current = grid.length;
  }, [grid]);

  const feedKey = metroId ? JSON.stringify([metroId, categorySlug, searchQuery]) : null;
  const [request, setRequest] = useState<LoadRequest>({ count: 0, mode: 'initial', feedKey });

  // A new metro or filter starts from nothing (react.dev: adjusting state when a prop changes).
  const [loadedKey, setLoadedKey] = useState(feedKey);
  if (feedKey !== loadedKey) {
    setLoadedKey(feedKey);
    setSections(EMPTY_SECTIONS);
    setGrid([]);
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setRefreshError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
    setOffset(0);
    // A request still pending for this feed must not survive the reset: flipping
    // the filter away and back would otherwise run the new load as a quiet revalidate.
    setRequest((prev) => ({ ...prev, feedKey: null }));
  }

  useEffect(() => {
    const mode: LoadMode = request.feedKey === feedKey ? request.mode : 'initial';
    // A quiet revalidation keeps the generation, so a page already loading still lands.
    const generation = mode === 'revalidate' ? generationRef.current : ++generationRef.current;
    if (mode !== 'revalidate') loadingMoreRef.current = false;
    if (!metroId) return;
    let cancelled = false;
    const current: MarketplaceFeedFilters = { categorySlug, searchQuery };

    void fetchFirstLoad(metroId, current).then(({ grid: gridResult, sections: loaded }) => {
      if (cancelled || !mountedRef.current || generation !== generationRef.current) return;

      if (gridResult.error) {
        // A failed background check leaves the screen alone.
        if (mode === 'revalidate') return;
        // A failed pull-to-refresh keeps the rows on screen and says so.
        if (mode === 'refresh' && gridCountRef.current > 0) {
          setRefreshError(
            userMessage(gridResult.error, REFRESH_FAILED, 'listings_refresh_failed', {
              platform: 'mobile',
              metroId,
            })
          );
          // A page load this refresh interrupted was dropped; don't leave its spinner.
          setLoadingMore(false);
          setRefreshing(false);
          return;
        }
        // The grid is the page's content, so its failure is the page's failure.
        setSections(EMPTY_SECTIONS);
        setGrid([]);
        setHasMore(false);
        setOffset(0);
        setError(
          userMessage(gridResult.error, LOAD_FAILED, 'listings_load_failed', { platform: 'mobile', metroId })
        );
        setLoadingMore(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const rows = gridResult.data ?? [];
      setSections(loaded);
      if (mode === 'revalidate') {
        setGrid((shown) => mergeFirstPage(shown, rows));
        setHasMore((more) => more || Boolean(gridResult.hasMore));
      } else {
        setGrid(rows);
        setOffset(GRID_LIMIT);
        setHasMore(Boolean(gridResult.hasMore));
        setLoadingMore(false);
        setLoadMoreError(null);
      }
      setError(null);
      setRefreshError(null);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [metroId, categorySlug, searchQuery, feedKey, request]);

  const reload = useCallback(() => {
    setSections(EMPTY_SECTIONS);
    setGrid([]);
    setLoading(true);
    setError(null);
    setRefreshError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
    setOffset(0);
    setRequest((prev) => ({ count: prev.count + 1, mode: 'initial', feedKey }));
  }, [feedKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setRequest((prev) => ({ count: prev.count + 1, mode: 'refresh', feedKey }));
  }, [feedKey]);

  const busy = loading || refreshing;

  const revalidate = useCallback(() => {
    if (!metroId || busy || error) return;
    setRequest((prev) => ({ count: prev.count + 1, mode: 'revalidate', feedKey }));
  }, [metroId, busy, error, feedKey]);

  const requestNextPage = useCallback(() => {
    if (!metroId || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const pageOffset = offset;
    void fetchGridPage(metroId, { categorySlug, searchQuery }, pageOffset).then((result) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (result.error) {
        // Paging stops rather than retrying in a loop while the list end is on screen.
        setLoadMoreError(
          userMessage(result.error, LOAD_MORE_FAILED, 'listings_load_more_failed', {
            platform: 'mobile',
            metroId,
            offset: pageOffset,
          })
        );
        return;
      }
      setGrid((shown) => appendPage(shown, result.data ?? []));
      // `hasMore` means the raw window was full, so exactly GRID_LIMIT rows were consumed.
      setOffset((next) => next + GRID_LIMIT);
      setHasMore(Boolean(result.hasMore));
    });
  }, [metroId, categorySlug, searchQuery, offset]);

  const loadMore = useCallback(() => {
    if (loadMoreError || busy || !hasMore) return;
    requestNextPage();
  }, [loadMoreError, busy, hasMore, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    requestNextPage();
  }, [requestNextPage]);

  const hasMetro = Boolean(metroId);
  return {
    ...sections,
    grid,
    loading: hasMetro && loading,
    refreshing,
    error,
    refreshError,
    loadingMore,
    loadMoreError,
    hasMore: hasMetro && !loading && hasMore && loadMoreError === null,
    reload,
    refresh,
    revalidate,
    loadMore,
    retryLoadMore,
  };
}
