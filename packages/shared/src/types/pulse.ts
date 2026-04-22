/**
 * Metro Pulse card types — discriminated union, one variant per card kind.
 * See docs/specs/2026-04-20-your-community-today-design.md §3.
 */

export type PulseCardKind =
  | 'cultural_calendar'
  | 'metro_highlights'
  | 'events_this_week'
  | 'fx_rate'
  | 'create_first_post';

export interface CulturalCalendarCard {
  kind: 'cultural_calendar';
  id: string; // e.g. 'dashain-2026'
  title: string;
  startsAt: string; // ISO date
  daysUntil: number; // 0 for today
  deepLink: string;
}

export interface MetroHighlightsCard {
  kind: 'metro_highlights';
  id: 'metro_highlights';
  count: number;
  metroLabel: string; // e.g. 'DFW' or the metro's short name
  deepLink: string;
}

export interface EventsThisWeekCard {
  kind: 'events_this_week';
  id: 'events_this_week';
  count: number;
  nextEventTitle: string;
  nextEventStartsAt: string; // ISO
  deepLink: string;
}

export interface FxRateCard {
  kind: 'fx_rate';
  id: 'fx_rate';
  pair: 'USD_NPR';
  rate: number;
  fetchedAt: string; // ISO
}

export interface CreateFirstPostCard {
  kind: 'create_first_post';
  id: 'create_first_post';
  title: string;
  deepLink: string;
}

export type PulseCard =
  | CulturalCalendarCard
  | MetroHighlightsCard
  | EventsThisWeekCard
  | FxRateCard
  | CreateFirstPostCard;

export interface PulseCardsResult {
  cards: PulseCard[];
  computedAt: string; // ISO
}
