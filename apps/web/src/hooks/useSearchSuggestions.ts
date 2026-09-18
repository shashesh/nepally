import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { SEARCH_DEBOUNCE_MS, normalizeSearchInput, searchSuggestions } from '@nepally/shared';
import type { SearchSuggestions } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export interface SearchSuggestionsState {
  /** The normalized query currently being searched (null when too short). */
  query: string | null;
  /**
   * The query `data` actually belongs to. Results are kept on screen while the
   * next request is in flight, so this lags `query` by one request; highlight
   * with it, or the marks describe a query these results never matched.
   */
  resultsQuery: string | null;
  data: SearchSuggestions | null;
  loading: boolean;
  error: Error | null;
}

type SuggestionsResults = Omit<SearchSuggestionsState, 'query'>;

interface SuggestionsRequest {
  query: string | null;
  metroId: string | null;
  allMetros: boolean;
}

const NO_RESULTS: SuggestionsResults = { resultsQuery: null, data: null, loading: false, error: null };

/** Live suggestions after a pause in typing; responses for stale queries are ignored. */
export function useSearchSuggestions(
  input: string,
  scope: { metroId: string | null; allMetros: boolean }
): SearchSuggestionsState {
  const [debounced] = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const query = normalizeSearchInput(debounced);
  const { metroId, allMetros } = scope;
  // Results are tagged with the request they answer, so a response that lands
  // after a newer request has started is dropped.
  const [state, setState] = useState<SuggestionsResults & { request: SuggestionsRequest }>({
    ...NO_RESULTS,
    request: { query: null, metroId, allMetros },
  });
  const { request } = state;

  // A new request starts during render (react.dev "Adjusting some state when a
  // prop changes"): the previous results stay on screen while it loads, and a
  // too-short query clears everything.
  if (request.query !== query || request.metroId !== metroId || request.allMetros !== allMetros) {
    const next = { query, metroId, allMetros };
    setState(query ? { ...state, request: next, loading: true, error: null } : { ...NO_RESULTS, request: next });
  }

  useEffect(() => {
    const { query: requestQuery, metroId: requestMetroId, allMetros: requestAllMetros } = request;
    if (!requestQuery) return;
    void searchSuggestions(supabase, requestQuery, { metroId: requestMetroId, allMetros: requestAllMetros }).then(
      (result) => {
        setState((previous) =>
          previous.request === request
            ? {
                request,
                resultsQuery: result.data ? requestQuery : null,
                data: result.data ?? null,
                loading: false,
                error: result.error ?? null,
              }
            : previous
        );
      }
    );
  }, [request]);

  return { query, resultsQuery: state.resultsQuery, data: state.data, loading: state.loading, error: state.error };
}
