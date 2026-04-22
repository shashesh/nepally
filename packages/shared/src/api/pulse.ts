/**
 * Metro Pulse composer — runs sub-queries in parallel and assembles
 * the card list.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PulseCardsResult } from '../types/pulse';
import { assemblePulseCards } from '../logic/pulse';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro } from './posts';
import { getUpcomingEventsPulseByMetro } from './events';
import { getTopHelperInMetro } from './helperScore';
import { getFollowSuggestionCandidates } from './followSuggestions';
import {
  rankFollowSuggestions,
  type SuggestionViewer,
  type RankedSuggestion,
} from '../logic/followSuggestions';
import { formatPublicName } from '../utils/user';

interface Params {
  metroAreaId: string;
  metroLabel: string;
  viewerId: string;
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

  const viewerRowPromise = supabase
    .from('users')
    .select('id, metro_area_id, hometown_district, college, following_count')
    .eq('id', params.viewerId)
    .maybeSingle();

  const [culturalRes, highlightsRes, eventsRes, fxRes, viewerRowRes, suggestionsRes, topHelperRes] =
    await Promise.allSettled([
      getUpcomingCulturalEvents(supabase, 30, now),
      getRecentPostsCountByMetro(supabase, params.metroAreaId, hoursAgo(now, HIGHLIGHTS_WINDOW_HOURS)),
      getUpcomingEventsPulseByMetro(supabase, params.metroAreaId, EVENTS_WINDOW_DAYS, now, EVENTS_FETCH_LIMIT),
      getExchangeRate(supabase, params.fetcher, now),
      viewerRowPromise,
      getFollowSuggestionCandidates(supabase, params.viewerId, params.metroAreaId),
      getTopHelperInMetro(supabase, params.metroAreaId, params.viewerId),
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

  // Viewer row uses Supabase's raw { data, error } shape (not our app's convention).
  const viewerRow =
    viewerRowRes.status === 'fulfilled' && !viewerRowRes.value.error
      ? (viewerRowRes.value.data as {
          id: string;
          metro_area_id: string | null;
          hometown_district: string | null;
          college: string | null;
          following_count: number | null;
        } | null)
      : null;

  const viewerFollowingCount = viewerRow?.following_count ?? 0;

  const rawCandidates = unwrap(suggestionsRes) ?? [];
  const suggestionViewer: SuggestionViewer = {
    id: params.viewerId,
    metroAreaId: params.metroAreaId,
    hometownDistrict: viewerRow?.hometown_district ?? null,
    college: viewerRow?.college ?? null,
  };
  const suggestions: RankedSuggestion[] = rankFollowSuggestions(
    suggestionViewer,
    rawCandidates
  );

  const topHelperBase = unwrap(topHelperRes);
  let topHelperForCard: {
    userId: string;
    displayName: string;
    photo: string | null;
    helperScore: number;
  } | null = null;
  if (topHelperBase) {
    // Follow-up lookup for display name + photo. A Supabase `error` or a
    // null `data` row (e.g. user deleted between the view read and this
    // query, or RLS denial) is intentionally swallowed: the top_helper
    // card is dropped so the rest of the strip still renders, mirroring
    // the graceful-degradation policy of the Promise.allSettled batch
    // above. Observability (metrics/alerting) is a future add.
    const { data: hRow, error: hErr } = await supabase
      .from('users')
      .select('id, full_name, profile_photo')
      .eq('id', topHelperBase.userId)
      .maybeSingle();
    if (!hErr && hRow) {
      const row = hRow as { id: string; full_name: string; profile_photo: string | null };
      topHelperForCard = {
        userId: row.id,
        displayName: formatPublicName(row.full_name),
        photo: row.profile_photo,
        helperScore: topHelperBase.helperScore,
      };
    }
  }

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
      viewerFollowingCount,
      suggestions,
      topHelper: topHelperForCard,
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
