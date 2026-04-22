import { describe, it, expect } from 'vitest';
import { assemblePulseCards } from './pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';

const now = new Date('2026-04-20T00:00:00Z');

describe('assemblePulseCards', () => {
  it('builds all four cards in display order when inputs are non-empty', () => {
    const cultural: CulturalEventRow[] = [
      {
        id: 'buddha-jayanti-2026',
        title: 'Buddha Jayanti',
        starts_on: '2026-05-02',
        ends_on: null,
        description: null,
      },
    ];
    const fx: ExchangeRate = {
      pair: 'USD_NPR',
      rate: 133.25,
      fetchedAt: '2026-04-20T00:00:00Z',
    };
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 5,
      metroLabel: 'DFW',
      eventsCount: 3,
      nextEventTitle: 'Dashain Meetup',
      nextEventStartsAt: '2026-04-24T18:00:00Z',
      fx,
      dismissedIds: new Set(),
    });

    expect(result.map((c) => c.kind)).toEqual([
      'cultural_calendar',
      'metro_highlights',
      'events_this_week',
      'fx_rate',
    ]);

    const cultCard = result.find((c) => c.kind === 'cultural_calendar');
    expect(cultCard?.kind).toBe('cultural_calendar');
    if (cultCard?.kind === 'cultural_calendar') {
      expect(cultCard.daysUntil).toBe(12);
      expect(cultCard.title).toBe('Buddha Jayanti');
    }
  });

  it('omits metro_highlights when count is 0', () => {
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx: null,
      dismissedIds: new Set(),
    });
    expect(result.find((c) => c.kind === 'metro_highlights')).toBeUndefined();
  });

  it('filters out cards whose id is in dismissedIds', () => {
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(['fx_rate']),
    });
    expect(result.find((c) => c.kind === 'fx_rate')).toBeUndefined();
  });

  it('backfills a create-first-post card when fewer than 3 real cards remain', () => {
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(),
    });
    expect(result.some((c) => c.kind === 'create_first_post')).toBe(true);
  });

  it('does not backfill when three or more real cards are present', () => {
    const cultural: CulturalEventRow[] = [
      { id: 'x', title: 'X', starts_on: '2026-04-25', ends_on: null, description: null },
    ];
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 4,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(),
    });
    expect(result.some((c) => c.kind === 'create_first_post')).toBe(false);
  });

  it('skips cultural events more than 30 days out', () => {
    const cultural: CulturalEventRow[] = [
      { id: 'far-away', title: 'Far', starts_on: '2026-06-01', ends_on: null, description: null },
    ];
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx: null,
      dismissedIds: new Set(),
    });
    expect(result.find((c) => c.kind === 'cultural_calendar')).toBeUndefined();
  });
});
