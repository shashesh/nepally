import { useCallback, useEffect, useState } from 'react';
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
  /** Null disables every request — pass null until the viewer is known to be signed in. */
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
  /** The active tab's error: the preview on "all", the list on a type tab. */
  error: Error | null;
  loadMore: () => void;
  retry: () => void;
}

/** What a piece of state was requested for; `attempt` changes on every retry. */
interface PreviewRequest {
  query: string | null;
  metroId: string | null;
  allMetros: boolean;
  attempt: number;
}

interface ListRequest extends PreviewRequest {
  tab: SearchTab;
}

interface PreviewState {
  request: PreviewRequest;
  data: SearchSuggestions | null;
  loading: boolean;
  error: Error | null;
}

interface ListState {
  request: ListRequest;
  items: SearchResult[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  // Ranked ids consumed so far. Hydration can drop rows (deleted, or hidden by
  // RLS), so items.length would restart the next page too early and repeat results.
  nextOffset: number;
}

function sameRequest<T extends PreviewRequest>(a: T, b: T): boolean {
  return (Object.keys(b) as Array<keyof T>).every((key) => a[key] === b[key]);
}

/** The previous preview stays on screen until the new one arrives. */
function startPreview(request: PreviewRequest, previous: SearchSuggestions | null): PreviewState {
  return { request, data: request.query ? previous : null, loading: Boolean(request.query), error: null };
}

/** A list starts empty. Each tab owns its error, so switching away from a failed tab clears it. */
function startList(request: ListRequest): ListState {
  return {
    request,
    items: [],
    loading: Boolean(request.query) && request.tab !== 'all',
    loadingMore: false,
    hasMore: false,
    error: null,
    nextOffset: 0,
  };
}

/** Data for /search: top results + counts for every tab, and a paged list for the active type tab. */
export function useSearchPage({ query, tab, allMetros, metroId }: UseSearchPageOptions): SearchPageState {
  const [attempt, setAttempt] = useState(0);
  const previewRequest: PreviewRequest = { query, metroId, allMetros, attempt };
  const listRequest: ListRequest = { ...previewRequest, tab };
  const [preview, setPreview] = useState<PreviewState>(() => startPreview(previewRequest, null));
  const [list, setList] = useState<ListState>(() => startList(listRequest));

  // A new request resets its state during render (react.dev "Adjusting some
  // state when a prop changes"); the effects below only fetch. A response is
  // applied only while the request it answers is still the current one.
  if (!sameRequest(preview.request, previewRequest)) {
    setPreview(startPreview(previewRequest, preview.data));
  }
  if (!sameRequest(list.request, listRequest)) {
    setList(startList(listRequest));
  }

  useEffect(() => {
    const request = preview.request;
    if (!request.query) return;
    void searchSuggestions(supabase, request.query, { metroId: request.metroId, allMetros: request.allMetros }).then(
      (result) => {
        setPreview((previous) =>
          previous.request === request
            ? { request, data: result.data ?? null, loading: false, error: result.error ?? null }
            : previous
        );
      }
    );
  }, [preview.request]);

  useEffect(() => {
    const request = list.request;
    const { query: listQuery, tab: listTab } = request;
    if (!listQuery || listTab === 'all') return;
    const options = { metroId: request.metroId, allMetros: request.allMetros, limit: SEARCH_PAGE_SIZE, offset: 0 };
    void FETCH_TAB[listTab](listQuery, options).then((page) => {
      setList((previous) => {
        if (previous.request !== request) return previous;
        if (page.error) return { ...previous, loading: false, error: page.error };
        return {
          ...previous,
          loading: false,
          items: page.data ?? [],
          hasMore: Boolean(page.hasMore),
          nextOffset: SEARCH_PAGE_SIZE,
        };
      });
    });
  }, [list.request]);

  const loadMore = useCallback(() => {
    const { request, loadingMore, hasMore, nextOffset } = list;
    const { query: listQuery, tab: listTab } = request;
    if (!listQuery || listTab === 'all' || loadingMore || !hasMore) return;
    setList((previous) => (previous.request === request ? { ...previous, loadingMore: true } : previous));
    const options = { metroId: request.metroId, allMetros: request.allMetros, limit: SEARCH_PAGE_SIZE, offset: nextOffset };
    void FETCH_TAB[listTab](listQuery, options).then((page) => {
      setList((previous) => {
        if (previous.request !== request) return previous;
        if (page.error) {
          // The sentinel is still on screen, so leaving hasMore set would call
          // loadMore again as soon as loadingMore clears, in a tight loop.
          return { ...previous, loadingMore: false, hasMore: false, error: page.error };
        }
        return {
          ...previous,
          loadingMore: false,
          error: null,
          items: [...previous.items, ...(page.data ?? [])],
          hasMore: Boolean(page.hasMore),
          nextOffset: nextOffset + SEARCH_PAGE_SIZE,
        };
      });
    });
  }, [list]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return {
    preview: preview.data,
    counts: preview.data
      ? { posts: preview.data.posts.totalCount, listings: preview.data.listings.totalCount, people: preview.data.people.totalCount }
      : null,
    items: list.items,
    loading: tab === 'all' ? preview.loading : list.loading,
    loadingMore: list.loadingMore,
    hasMore: list.hasMore,
    error: tab === 'all' ? preview.error : list.error,
    loadMore,
    retry,
  };
}
