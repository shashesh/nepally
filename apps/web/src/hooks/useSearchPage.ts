import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_PAGE_SIZE, searchListings, searchPeople, searchPosts, searchSuggestions } from '@nepally/shared';
import type { SearchPage, SearchSuggestions, SearchTab } from '@nepally/shared';
import type { SearchResult } from '../components/search/SearchResultItem';
import { supabase } from '../lib/supabase';

type TypeTab = Exclude<SearchTab, 'all'>;
type FetchOptions = { metroId: string | null; allMetros: boolean; limit: number; offset: number };

const FETCH_TAB: Record<TypeTab, (query: string, options: FetchOptions) => Promise<SearchPage<SearchResult>>> = {
  posts: async (query, options) => {
    const page = await searchPosts(supabase, query, options);
    return { ...page, data: page.data?.map((post): SearchResult => ({ kind: 'post', post })) };
  },
  listings: async (query, options) => {
    const page = await searchListings(supabase, query, options);
    return { ...page, data: page.data?.map((listing): SearchResult => ({ kind: 'listing', listing })) };
  },
  people: async (query, { metroId, limit, offset }) => {
    const page = await searchPeople(supabase, query, { metroId, limit, offset });
    return { ...page, data: page.data?.map((person): SearchResult => ({ kind: 'person', person })) };
  },
};

export interface UseSearchPageOptions {
  query: string | null;
  tab: SearchTab;
  allMetros: boolean;
  metroId: string | null;
}

export interface SearchPageState {
  preview: SearchSuggestions | null;
  counts: Record<TypeTab, number> | null;
  items: SearchResult[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  retry: () => void;
}

/** Data for /search: top results + counts for every tab, and a paged list for the active type tab. */
export function useSearchPage({ query, tab, allMetros, metroId }: UseSearchPageOptions): SearchPageState {
  const [preview, setPreview] = useState<SearchSuggestions | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previewRequest = useRef(0);
  const listRequest = useRef(0);

  useEffect(() => {
    const requestId = ++previewRequest.current;
    setError(null);
    if (!query) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    void searchSuggestions(supabase, query, { metroId, allMetros }).then((result) => {
      if (requestId !== previewRequest.current) return;
      setPreviewLoading(false);
      setPreview(result.data ?? null);
      if (result.error) setError(result.error);
    });
  }, [query, metroId, allMetros, attempt]);

  useEffect(() => {
    const requestId = ++listRequest.current;
    setItems([]);
    setHasMore(false);
    setLoadingMore(false);
    if (!query || tab === 'all') {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    void FETCH_TAB[tab](query, { metroId, allMetros, limit: SEARCH_PAGE_SIZE, offset: 0 }).then((page) => {
      if (requestId !== listRequest.current) return;
      setListLoading(false);
      if (page.error) {
        setError(page.error);
        return;
      }
      setItems(page.data ?? []);
      setHasMore(Boolean(page.hasMore));
    });
  }, [query, tab, metroId, allMetros, attempt]);

  const loadMore = useCallback(() => {
    if (!query || tab === 'all' || loadingMore || !hasMore) return;
    const requestId = listRequest.current;
    setLoadingMore(true);
    void FETCH_TAB[tab](query, { metroId, allMetros, limit: SEARCH_PAGE_SIZE, offset: items.length }).then((page) => {
      if (requestId !== listRequest.current) return;
      setLoadingMore(false);
      if (page.error) {
        setError(page.error);
        return;
      }
      setItems((previous) => [...previous, ...(page.data ?? [])]);
      setHasMore(Boolean(page.hasMore));
    });
  }, [query, tab, metroId, allMetros, loadingMore, hasMore, items.length]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return {
    preview,
    counts: preview
      ? { posts: preview.posts.totalCount, listings: preview.listings.totalCount, people: preview.people.totalCount }
      : null,
    items,
    loading: tab === 'all' ? previewLoading : listLoading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    retry,
  };
}
