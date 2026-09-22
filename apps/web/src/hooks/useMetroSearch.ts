import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  SEARCH_DEBOUNCE_MS,
  getMetroByZip,
  isValidZipCode,
  isZipCodeNotFoundError,
  logClientEvent,
  normalizeSearchInput,
  searchMetroAreas,
} from '@nepally/shared';
import type { MetroArea } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export const SEARCH_FAILED_MESSAGE = 'Something went wrong searching. Try again.';
export const NO_MATCH_MESSAGE = 'No metros match.';

export interface MetroSearchState {
  /** The debounced, normalized query currently being searched (null when too short). */
  query: string | null;
  /** The query `results` actually answer; lags `query` while a request is in flight. */
  resultsQuery: string | null;
  results: MetroArea[];
  /**
   * "No metros match." or a failure message, for a single always-mounted
   * `role="status"` region — never cleared just because a new (debounced or
   * in-flight) search has started, only replaced once one resolves, so the
   * region's text doesn't churn on every keystroke.
   */
  statusMessage: string;
}

interface SearchRequest {
  query: string | null;
}

type SearchResults = Omit<MetroSearchState, 'query'>;

const NO_RESULTS: SearchResults = { resultsQuery: null, results: [], statusMessage: '' };

/**
 * Debounced metro/ZIP search for Manage Locations' add flow. A response for
 * anything but the latest request is dropped, a ZIP lookup that comes back
 * not-found is treated as "no match" rather than a failure (matching
 * onboarding and mobile), and a genuine failure — of either lookup — is
 * logged and surfaced.
 */
export function useMetroSearch(input: string, userId: string | null): MetroSearchState {
  const [debounced] = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const query = normalizeSearchInput(debounced);

  const [state, setState] = useState<SearchResults & { request: SearchRequest }>({
    ...NO_RESULTS,
    request: { query: null },
  });
  const { request } = state;

  // A new request starts during render (react.dev "Adjusting some state when
  // a prop changes"). The previous results/message stay on screen until it
  // resolves — only a too-short query clears them immediately.
  if (request.query !== query) {
    const next = { query };
    setState(query ? { ...state, request: next } : { ...NO_RESULTS, request: next });
  }

  useEffect(() => {
    const requestQuery = request.query;
    if (!requestQuery) return;
    const isZip = isValidZipCode(requestQuery);

    void (isZip ? getMetroByZip(supabase, requestQuery) : searchMetroAreas(supabase, requestQuery))
      .then((result) => {
        const notFound = isZip && result.error ? isZipCodeNotFoundError(result.error) : false;
        if (result.error && !notFound) {
          logClientEvent({
            event: 'profile_location_search_failed',
            context: { platform: 'web', userId },
            error: result.error,
          });
        }
        setState((previous) => {
          if (previous.request !== request) return previous; // stale
          if (result.error) {
            return {
              request,
              resultsQuery: requestQuery,
              results: [],
              statusMessage: notFound ? NO_MATCH_MESSAGE : SEARCH_FAILED_MESSAGE,
            };
          }
          const data = result.data ? (Array.isArray(result.data) ? result.data : [result.data]) : [];
          return {
            request,
            resultsQuery: requestQuery,
            results: data,
            statusMessage: data.length === 0 ? NO_MATCH_MESSAGE : '',
          };
        });
      })
      .catch((error: unknown) => {
        const notFound = isZip && error instanceof Error && isZipCodeNotFoundError(error);
        if (!notFound) {
          logClientEvent({ event: 'profile_location_search_failed', context: { platform: 'web', userId }, error });
        }
        setState((previous) =>
          previous.request === request
            ? {
                request,
                resultsQuery: requestQuery,
                results: [],
                statusMessage: notFound ? NO_MATCH_MESSAGE : SEARCH_FAILED_MESSAGE,
              }
            : previous
        );
      });
  }, [request, userId]);

  return { query, resultsQuery: state.resultsQuery, results: state.results, statusMessage: state.statusMessage };
}
