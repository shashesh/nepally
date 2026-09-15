import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { SEARCH_DEBOUNCE_MS, normalizeSearchInput, searchSuggestions } from '@nepally/shared';
import type { SearchSuggestions } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export interface SearchSuggestionsState {
  /** The normalized query the data belongs to (null when too short). */
  query: string | null;
  data: SearchSuggestions | null;
  loading: boolean;
  error: Error | null;
}

/** Live suggestions after a pause in typing; responses for stale queries are ignored. */
export function useSearchSuggestions(
  input: string,
  scope: { metroId: string | null; allMetros: boolean }
): SearchSuggestionsState {
  const [debounced] = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const query = normalizeSearchInput(debounced);
  const [state, setState] = useState<Omit<SearchSuggestionsState, 'query'>>({ data: null, loading: false, error: null });
  const latestRequest = useRef(0);
  const { metroId, allMetros } = scope;

  useEffect(() => {
    const requestId = ++latestRequest.current;
    if (!query) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));
    void searchSuggestions(supabase, query, { metroId, allMetros }).then((result) => {
      if (requestId !== latestRequest.current) return;
      setState({ data: result.data ?? null, loading: false, error: result.error ?? null });
    });
  }, [query, metroId, allMetros]);

  return { query, ...state };
}
