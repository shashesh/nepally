import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  applyEventResponseChange,
  getMetroEventsPage,
  getUserEventResponses,
  removeEventResponse,
  setEventResponse,
  userMessage,
  type Event,
  type EventPeriod,
  type EventsResult,
  type RsvpStatus,
  type UserEventResponses,
} from '@nepally/shared';
import { supabase } from '../config/supabase';

const PAGE_SIZE = 20;
const RESPONSE_ERROR = "Couldn't update your response. Try again.";
const LOAD_FAILED = "Couldn't load events.";
const LOAD_MORE_FAILED = "Couldn't load more events.";

export interface MetroEventPagesState {
  upcoming: Event[];
  past: Event[];
  /** The first load, which may chain the first past page. */
  loading: boolean;
  /** A pull-to-refresh is reloading the first page; the list stays on screen. */
  refreshing: boolean;
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** More pages exist and paging isn't paused by a failure. */
  hasMore: boolean;
  responses: UserEventResponses;
  /** Starts over from nothing (Retry). */
  reload: () => void;
  /** Reloads the first page, keeping the list until it lands (pull-to-refresh). */
  refresh: () => void;
  loadMore: () => void;
  /** Clears loadMoreError and loads the next page. */
  retryLoadMore: () => void;
  respond: (eventId: string, next: RsvpStatus | null) => void;
}

interface FeedPages {
  upcoming: Event[];
  past: Event[];
  /** Where the next page comes from; null once both periods have run out. */
  nextPeriod: EventPeriod | null;
  /** Rows each period has returned so far, which is the next page's offset. */
  offsets: Record<EventPeriod, number>;
}

const EMPTY_PAGES: FeedPages = {
  upcoming: [],
  past: [],
  nextPeriod: 'upcoming',
  offsets: { upcoming: 0, past: 0 },
};

/** Adds one page to its period, skipping ids either list already holds. */
function appendPage(pages: FeedPages, period: EventPeriod, result: EventsResult): FeedPages {
  const rows = result.data ?? [];
  const seen = new Set([...pages.upcoming, ...pages.past].map((event) => event.id));
  const fresh: Event[] = [];
  for (const event of rows) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    fresh.push(event);
  }

  const periodEnded = !result.hasMore;
  const nextPeriod: EventPeriod | null = !periodEnded ? period : period === 'upcoming' ? 'past' : null;
  return {
    ...pages,
    [period]: [...pages[period], ...fresh],
    offsets: { ...pages.offsets, [period]: pages.offsets[period] + rows.length },
    nextPeriod,
  };
}

function withResponse(responses: UserEventResponses, eventId: string, next: RsvpStatus | null) {
  const updated = { ...responses };
  if (next === null) delete updated[eventId];
  else updated[eventId] = next;
  return updated;
}

/**
 * A metro's events for the events list, paged as web's useEventFeed does:
 * upcoming events soonest first, then past events newest first, each period
 * from its own offset and both against one `now` taken per load. Also the
 * member's responses, and `respond`, which moves the counts at once and rolls
 * them back if the write fails.
 */
export function useMetroEventPages(metroId: string, userId: string | null): MetroEventPagesState {
  const [pages, setPages] = useState<FeedPages>(EMPTY_PAGES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [responses, setResponses] = useState<UserEventResponses>({});
  const [reloadKey, setReloadKey] = useState(0);

  // One instant per load, shared by every page of both periods.
  const nowRef = useRef<Date | null>(null);
  // Bumped by each load; a page requested under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);
  // Read by respond, so the previous response never comes from inside an updater.
  const responsesRef = useRef<UserEventResponses>({});
  const pendingRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // A new metro or member starts from nothing (react.dev: adjusting state when a prop changes).
  const feedKey = metroId ? `${metroId}:${userId ?? ''}` : null;
  const [loadedKey, setLoadedKey] = useState(feedKey);
  if (feedKey !== loadedKey) {
    setLoadedKey(feedKey);
    setPages(EMPTY_PAGES);
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
  }

  useEffect(() => {
    if (!metroId) return;
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    const now = new Date();
    nowRef.current = now;
    let cancelled = false;
    const isStale = () => cancelled || generation !== generationRef.current;

    (async () => {
      const [upcomingResult, responsesResult] = await Promise.all([
        getMetroEventsPage(supabase, metroId, { period: 'upcoming', now, limit: PAGE_SIZE, offset: 0 }),
        userId
          ? getUserEventResponses(supabase, userId)
          : Promise.resolve({ data: {} as UserEventResponses }),
      ]);
      if (isStale()) return;

      if (responsesResult.data) {
        responsesRef.current = responsesResult.data;
        setResponses(responsesResult.data);
      }
      if (upcomingResult.error) {
        setError(
          userMessage(upcomingResult.error, LOAD_FAILED, 'events_load_failed', { platform: 'mobile', metroId })
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let loaded = appendPage(EMPTY_PAGES, 'upcoming', upcomingResult);
      let pastError: string | null = null;
      // A short first page means nothing more is upcoming: open on the past too.
      if (loaded.nextPeriod === 'past') {
        const pastResult = await getMetroEventsPage(supabase, metroId, {
          period: 'past',
          now,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (isStale()) return;
        if (pastResult.error) {
          pastError = userMessage(pastResult.error, LOAD_MORE_FAILED, 'events_load_more_failed', {
            platform: 'mobile',
            metroId,
            period: 'past',
          });
        } else {
          loaded = appendPage(loaded, 'past', pastResult);
        }
      }

      setPages(loaded);
      setError(null);
      setLoadingMore(false);
      setLoadMoreError(pastError);
      setLoading(false);
      setRefreshing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [metroId, userId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setPages(EMPTY_PAGES);
    setReloadKey((key) => key + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const requestNextPage = useCallback(() => {
    const period = pages.nextPeriod;
    const now = nowRef.current;
    if (!metroId || !period || !now || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    void getMetroEventsPage(supabase, metroId, {
      period,
      now,
      limit: PAGE_SIZE,
      offset: pages.offsets[period],
    }).then((result) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (result.error) {
        // Paging stops rather than retrying in a loop while the list end is on screen.
        setLoadMoreError(
          userMessage(result.error, LOAD_MORE_FAILED, 'events_load_more_failed', {
            platform: 'mobile',
            metroId,
            period,
          })
        );
        return;
      }
      setPages((current) => appendPage(current, period, result));
    });
  }, [metroId, pages.nextPeriod, pages.offsets]);

  const busy = loading || refreshing;
  const loadMore = useCallback(() => {
    if (loadMoreError || busy) return;
    requestNextPage();
  }, [loadMoreError, busy, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    requestNextPage();
  }, [requestNextPage]);

  const applyResponse = useCallback(
    (eventId: string, previous: RsvpStatus | null, next: RsvpStatus | null) => {
      responsesRef.current = withResponse(responsesRef.current, eventId, next);
      setResponses(responsesRef.current);
      const adjust = (event: Event) =>
        event.id === eventId ? applyEventResponseChange(event, previous, next) : event;
      setPages((current) => ({
        ...current,
        upcoming: current.upcoming.map(adjust),
        past: current.past.map(adjust),
      }));
    },
    []
  );

  const setEventPending = useCallback((eventId: string, isPending: boolean) => {
    const updated = new Set(pendingRef.current);
    if (isPending) updated.add(eventId);
    else updated.delete(eventId);
    pendingRef.current = updated;
  }, []);

  const respond = useCallback(
    (eventId: string, next: RsvpStatus | null) => {
      if (!userId || pendingRef.current.has(eventId)) return;
      const previous = responsesRef.current[eventId] ?? null;
      if (previous === next) return;

      setEventPending(eventId, true);
      applyResponse(eventId, previous, next);

      const write =
        next === null
          ? removeEventResponse(supabase, eventId, userId)
          : setEventResponse(supabase, eventId, userId, next);
      void write.then((result) => {
        setEventPending(eventId, false);
        if (!mountedRef.current || !result.error) return;
        applyResponse(eventId, next, previous);
        Alert.alert('Error', RESPONSE_ERROR);
      });
    },
    [userId, applyResponse, setEventPending]
  );

  const hasMetro = Boolean(metroId);
  return {
    upcoming: pages.upcoming,
    past: pages.past,
    loading: hasMetro && loading,
    refreshing,
    error,
    loadingMore,
    loadMoreError,
    hasMore: hasMetro && !loading && pages.nextPeriod !== null && loadMoreError === null,
    responses,
    reload,
    refresh,
    loadMore,
    retryLoadMore,
    respond,
  };
}
