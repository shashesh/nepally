import { describe, it, expect } from 'vitest';
import { assemblePulseCards, type AssemblePulseCardsInput } from './pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';
import type { RankedSuggestion } from './followSuggestions';

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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
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
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
    });
    expect(result.find((c) => c.kind === 'cultural_calendar')).toBeUndefined();
  });
});

describe('assemblePulseCards — PR 3 cards', () => {
  // Typed Omit so the tests stay type-safe: if AssemblePulseCardsInput adds
  // new PR-3 fields, this declaration fails to compile instead of silently
  // drifting under an `as any` cast.
  const baseInput: Omit<
    AssemblePulseCardsInput,
    'viewerFollowingCount' | 'suggestions' | 'topHelper'
  > = {
    now: new Date('2026-04-20T00:00:00Z'),
    cultural: [],
    metroHighlightsCount: 0,
    metroLabel: 'DFW',
    eventsCount: 0,
    nextEventTitle: null,
    nextEventStartsAt: null,
    fx: null,
    dismissedIds: new Set<string>(),
  };

  const suggestions: RankedSuggestion[] = [
    { userId: 'u-1', displayName: 'Anish S.', photo: null, reason: 'Both from Pokhara', score: 10 },
    { userId: 'u-2', displayName: 'Bina K.', photo: null, reason: 'Both studied at Pulchowk', score: 8 },
  ];

  const topHelper: AssemblePulseCardsInput['topHelper'] = {
    userId: 'h-1',
    displayName: 'Deepak G.',
    photo: null,
    helperScore: 84,
  };

  it('builds a find_your_people card when viewer follows <5 and suggestions are non-empty', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 2,
      suggestions,
      topHelper: null,
    });

    const card = cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.suggestionCount).toBe(2);
      expect(card.featured.userId).toBe('u-1');
      expect(card.featured.reason).toContain('Pokhara');
      expect(card.deepLink).toBe('/users/u-1');
    }
  });

  it('omits find_your_people when viewer follows >= 5', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 5,
      suggestions,
      topHelper: null,
    });
    expect(cards.find((c) => c.kind === 'find_your_people')).toBeUndefined();
  });

  it('omits find_your_people when suggestions list is empty', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
    });
    expect(cards.find((c) => c.kind === 'find_your_people')).toBeUndefined();
  });

  it('builds a top_helper card when one exists', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper,
    });
    const card = cards.find((c) => c.kind === 'top_helper');
    expect(card?.kind).toBe('top_helper');
    if (card?.kind === 'top_helper') {
      expect(card.helper.userId).toBe('h-1');
      expect(card.helper.helperScore).toBe(84);
      expect(card.metroLabel).toBe('DFW');
      expect(card.deepLink).toBe('/users/h-1');
    }
  });

  it('respects display order after the existing four cards', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      fx: { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' },
      metroHighlightsCount: 2,
      viewerFollowingCount: 0,
      suggestions,
      topHelper,
    });

    const order = cards.map((c) => c.kind);
    const idxHighlights = order.indexOf('metro_highlights');
    const idxFx = order.indexOf('fx_rate');
    const idxFind = order.indexOf('find_your_people');
    const idxTop = order.indexOf('top_helper');

    expect(idxHighlights).toBeLessThan(idxFx);
    expect(idxFx).toBeLessThan(idxFind);
    expect(idxFind).toBeLessThan(idxTop);
  });
});
