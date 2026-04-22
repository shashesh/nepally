/**
 * Pure card-assembly logic for Metro Pulse.
 * No IO. Takes already-fetched sub-query results and returns ordered PulseCard[].
 */
import type {
  PulseCard,
  CulturalCalendarCard,
  MetroHighlightsCard,
  EventsThisWeekCard,
  FxRateCard,
  CreateFirstPostCard,
} from '../types/pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';

const CULTURAL_WINDOW_DAYS = 30;
const MIN_CARDS_BEFORE_BACKFILL = 3;

const CARD_ORDER: Record<PulseCard['kind'], number> = {
  cultural_calendar: 0,
  metro_highlights: 1,
  events_this_week: 2,
  fx_rate: 3,
  create_first_post: 4,
};

export interface AssemblePulseCardsInput {
  now: Date;
  cultural: CulturalEventRow[];
  metroHighlightsCount: number;
  metroLabel: string;
  eventsCount: number;
  nextEventTitle: string | null;
  nextEventStartsAt: string | null;
  fx: ExchangeRate | null;
  dismissedIds: Set<string>;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

function buildCulturalCard(
  event: CulturalEventRow,
  now: Date
): CulturalCalendarCard | null {
  const startsAt = new Date(`${event.starts_on}T00:00:00Z`);
  const daysUntil = daysBetween(now, startsAt);
  if (daysUntil < 0 || daysUntil > CULTURAL_WINDOW_DAYS) return null;
  return {
    kind: 'cultural_calendar',
    id: event.id,
    title: event.title,
    startsAt: startsAt.toISOString(),
    daysUntil,
    deepLink: `/events?from=${event.starts_on}`,
  };
}

function buildMetroHighlightsCard(
  count: number,
  metroLabel: string
): MetroHighlightsCard | null {
  if (count < 1) return null;
  return {
    kind: 'metro_highlights',
    id: 'metro_highlights',
    count,
    metroLabel,
    deepLink: '/?range=24h',
  };
}

function buildEventsCard(
  count: number,
  nextEventTitle: string | null,
  nextEventStartsAt: string | null
): EventsThisWeekCard | null {
  if (count < 1 || !nextEventTitle || !nextEventStartsAt) return null;
  return {
    kind: 'events_this_week',
    id: 'events_this_week',
    count,
    nextEventTitle,
    nextEventStartsAt,
    deepLink: '/events',
  };
}

function buildFxCard(fx: ExchangeRate | null): FxRateCard | null {
  if (!fx) return null;
  return {
    kind: 'fx_rate',
    id: 'fx_rate',
    pair: fx.pair,
    rate: fx.rate,
    fetchedAt: fx.fetchedAt,
  };
}

function buildCreateFirstPostCard(): CreateFirstPostCard {
  return {
    kind: 'create_first_post',
    id: 'create_first_post',
    title: 'Be the first to post in your metro today',
    deepLink: '/post/new',
  };
}

export function assemblePulseCards(input: AssemblePulseCardsInput): PulseCard[] {
  const cards: PulseCard[] = [];

  for (const event of input.cultural) {
    const card = buildCulturalCard(event, input.now);
    if (card) {
      cards.push(card);
      break; // one cultural card max
    }
  }

  const highlights = buildMetroHighlightsCard(
    input.metroHighlightsCount,
    input.metroLabel
  );
  if (highlights) cards.push(highlights);

  const events = buildEventsCard(
    input.eventsCount,
    input.nextEventTitle,
    input.nextEventStartsAt
  );
  if (events) cards.push(events);

  const fx = buildFxCard(input.fx);
  if (fx) cards.push(fx);

  const filtered = cards.filter((c) => !input.dismissedIds.has(c.id));

  if (filtered.length < MIN_CARDS_BEFORE_BACKFILL) {
    filtered.push(buildCreateFirstPostCard());
  }

  filtered.sort((a, b) => CARD_ORDER[a.kind] - CARD_ORDER[b.kind]);
  return filtered;
}
