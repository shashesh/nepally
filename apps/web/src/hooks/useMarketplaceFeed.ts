import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFeaturedListings,
  getListingsByMetro,
  getStickyBusinessListings,
  getTrendingListings,
  type ListingsResult,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { isFilteredQuery, type MarketplaceQuery } from '../lib/marketplaceQuery';

const STRIP_LIMIT = 10;
const GRID_LIMIT = 20;
const SPONSORED_LIMIT = 5;

export interface MarketplaceFeedState {
  /** Metro-wide when nothing is narrowed, category-scoped when one is active. */
  featured: MarketplaceListing[];
  recent: MarketplaceListing[];
  trending: MarketplaceListing[];
  sponsored: MarketplaceListing[];
  grid: MarketplaceListing[];
  loading: boolean;
  /** Non-null when the current query failed. The rows are cleared, never stale. */
  error: string | null;
  loadingMore: boolean;
  /** Non-null when paging failed, so the footer can say so and offer a retry. */
  loadMoreError: string | null;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
  retryLoadMore: () => void;
}

interface Sections {
  featured: MarketplaceListing[];
  recent: MarketplaceListing[];
  trending: MarketplaceListing[];
  sponsored: MarketplaceListing[];
}

const EMPTY_SECTIONS: Sections = { featured: [], recent: [], trending: [], sponsored: [] };

/** Which listings a page of the grid comes from, given what narrows the view. */
function fetchGridPage(
  metroId: string,
  query: MarketplaceQuery,
  offset: number
): Promise<ListingsResult> {
  const plain = !query.category && !query.q && query.sort === 'newest';
  if (query.view === 'featured' && plain) {
    return getFeaturedListings(supabase, metroId, { limit: GRID_LIMIT, offset });
  }
  if (query.view === 'trending' && plain) {
    return getTrendingListings(supabase, metroId, { limit: GRID_LIMIT, offset });
  }
  return getListingsByMetro(supabase, metroId, {
    categorySlug: query.category || undefined,
    searchQuery: query.q || undefined,
    sortBy: query.sort,
    limit: GRID_LIMIT,
    offset,
  });
}

/** Adds a page, skipping ids already on screen. */
function appendPage(current: MarketplaceListing[], rows: MarketplaceListing[]) {
  const seen = new Set(current.map((l) => l.id));
  const fresh = rows.filter((l) => !seen.has(l.id));
  return fresh.length ? [...current, ...fresh] : current;
}

/**
 * A metro's marketplace: the discovery strips when nothing narrows the view,
 * the grid and its paging in every mode, and the three states kept apart —
 * loading, empty and failed. A failed load clears its rows rather than leaving
 * the previous metro's on screen (recon 1), and a failed page says so instead
 * of looking like the end of the list (recon 2).
 */
export function useMarketplaceFeed(
  metroId: string | null,
  query: MarketplaceQuery
): MarketplaceFeedState {
  const [sections, setSections] = useState<Sections>(EMPTY_SECTIONS);
  const [grid, setGrid] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped by each load; a page requested under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Destructured so every effect and callback below depends on primitives:
  // `query` is re-parsed on each render, so depending on the object itself
  // would refetch forever.
  const { view, category, q: searchText, sort, isSearch } = query;
  const filtered = isFilteredQuery(query);

  // A new metro or query starts from nothing (react.dev: adjusting state when a prop changes).
  const feedKey = metroId
    ? JSON.stringify([metroId, view, category, searchText, sort, isSearch])
    : null;
  const [loadedKey, setLoadedKey] = useState(feedKey);
  if (feedKey !== loadedKey) {
    setLoadedKey(feedKey);
    setSections(EMPTY_SECTIONS);
    setGrid([]);
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
  }

  useEffect(() => {
    if (!metroId) return;
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    let cancelled = false;

    (async () => {
      const current: MarketplaceQuery = { view, category, q: searchText, sort, isSearch };
      // The category's own featured strip; search mode has no category to scope it to.
      const wantsCategoryStrip = Boolean(category) && !isSearch;

      const [gridResult, featuredResult, recentResult, trendingResult, sponsoredResult] =
        await Promise.all([
          fetchGridPage(metroId, current, 0),
          !filtered || wantsCategoryStrip
            ? getFeaturedListings(supabase, metroId, {
                limit: STRIP_LIMIT,
                ...(wantsCategoryStrip ? { categorySlug: category } : {}),
              })
            : Promise.resolve<ListingsResult>({ data: [] }),
          !filtered
            ? getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: STRIP_LIMIT })
            : Promise.resolve<ListingsResult>({ data: [] }),
          !filtered
            ? getTrendingListings(supabase, metroId, { limit: STRIP_LIMIT })
            : Promise.resolve<ListingsResult>({ data: [] }),
          !filtered
            ? getStickyBusinessListings(supabase, metroId, { limit: SPONSORED_LIMIT })
            : Promise.resolve({ data: [] }),
        ]);

      if (cancelled || generation !== generationRef.current) return;

      // The grid is the page's content, so its failure is the page's failure.
      // A strip that fails is simply cleared: it hides itself when empty, which
      // beats showing the previous metro's listings under a new heading.
      if (gridResult.error) {
        setSections(EMPTY_SECTIONS);
        setGrid([]);
        setHasMore(false);
        setError(gridResult.error.message);
        setLoading(false);
        return;
      }

      setSections({
        featured: featuredResult.data ?? [],
        recent: recentResult.data ?? [],
        trending: trendingResult.data ?? [],
        sponsored: (sponsoredResult.data ?? []).map((s) => s.listing),
      });
      setGrid(gridResult.data ?? []);
      setHasMore(Boolean(gridResult.hasMore));
      setError(null);
      setLoadMoreError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [metroId, view, category, searchText, sort, isSearch, filtered, reloadKey]);

  const reload = useCallback(() => {
    setSections(EMPTY_SECTIONS);
    setGrid([]);
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
    setReloadKey((key) => key + 1);
  }, []);

  const requestNextPage = useCallback(() => {
    if (!metroId || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const current: MarketplaceQuery = { view, category, q: searchText, sort, isSearch };
    void fetchGridPage(metroId, current, grid.length).then((result) => {
      if (generation !== generationRef.current) return;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (result.error) {
        // Paging stops rather than retrying in a loop while the sentinel is
        // on screen, and the footer says so (recon 2).
        setLoadMoreError(result.error.message);
        return;
      }
      setGrid((rows) => appendPage(rows, result.data ?? []));
      setHasMore(Boolean(result.hasMore));
    });
  }, [metroId, view, category, searchText, sort, isSearch, grid.length]);

  const loadMore = useCallback(() => {
    if (loadMoreError || loading || !hasMore) return;
    requestNextPage();
  }, [loadMoreError, loading, hasMore, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    requestNextPage();
  }, [requestNextPage]);

  const hasMetro = Boolean(metroId);
  return {
    ...sections,
    grid,
    loading: hasMetro && loading,
    error,
    loadingMore,
    loadMoreError,
    hasMore: hasMetro && !loading && hasMore && loadMoreError === null,
    reload,
    loadMore,
    retryLoadMore,
  };
}
