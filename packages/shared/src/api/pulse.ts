/**
 * Metro Pulse composer — runs the four sub-queries in parallel and assembles
 * the card list.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PulseCardsResult } from '../types/pulse';
import { assemblePulseCards } from '../logic/pulse';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro } from './posts';
import { getUpcomingEventsByMetro } from './events';

interface Params {
  metroAreaId: string;
  metroLabel: string;
  dismissedIds?: Set<string>;
  now?: Date;
  fetcher?: Parameters<typeof getExchangeRate>[1];
}

interface Result {
  data?: PulseCardsResult;
  error?: Error;
}

const HIGHLIGHTS_WINDOW_HOURS = 24;
const EVENTS_WINDOW_DAYS = 7;
const EVENTS_FETCH_LIMIT = 20;

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

interface EventLike {
  id: string;
  title: string;
  start_date: string;
}

function withinWindow(event: EventLike, now: Date, days: number): boolean {
  const eventMs = new Date(event.start_date).getTime();
  const upperMs = now.getTime() + days * 24 * 60 * 60 * 1000;
  return eventMs >= now.getTime() && eventMs <= upperMs;
}

export async function getPulseCards(
  supabase: SupabaseClient,
  params: Params
): Promise<Result> {
  const now = params.now ?? new Date();
  const dismissedIds = params.dismissedIds ?? new Set<string>();

  const [culturalRes, highlightsRes, eventsRes, fxRes] = await Promise.allSettled([
    getUpcomingCulturalEvents(supabase, 30, now),
    getRecentPostsCountByMetro(supabase, params.metroAreaId, hoursAgo(now, HIGHLIGHTS_WINDOW_HOURS)),
    getUpcomingEventsByMetro(supabase, params.metroAreaId, EVENTS_FETCH_LIMIT),
    getExchangeRate(supabase, params.fetcher, now),
  ]);

  function unwrap<T>(settled: PromiseSettledResult<{ data?: T; error?: Error }>): T | null {
    if (settled.status !== 'fulfilled') return null;
    if (settled.value.error) return null;
    return (settled.value.data ?? null) as T | null;
  }

  const cultural = unwrap(culturalRes) ?? [];
  const highlightsCount = unwrap(highlightsRes) ?? 0;
  const rawEvents = (unwrap(eventsRes) as EventLike[] | null) ?? [];
  const fx = unwrap(fxRes);

  const windowedEvents = rawEvents.filter((e) => withinWindow(e, now, EVENTS_WINDOW_DAYS));
  const nextEvent = windowedEvents[0] ?? null;

  try {
    const cards = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: highlightsCount,
      metroLabel: params.metroLabel,
      eventsCount: windowedEvents.length,
      nextEventTitle: nextEvent ? nextEvent.title : null,
      nextEventStartsAt: nextEvent ? nextEvent.start_date : null,
      fx,
      dismissedIds,
    });
    return {
      data: { cards, computedAt: now.toISOString() },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to assemble Pulse'),
    };
  }
}
