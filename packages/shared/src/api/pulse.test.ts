import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('./culturalEvents', () => ({
  getUpcomingCulturalEvents: vi.fn(),
}));
vi.mock('./fxRates', () => ({
  getExchangeRate: vi.fn(),
}));
vi.mock('./posts', async (original) => {
  const mod = await (original as () => Promise<Record<string, unknown>>)();
  return {
    ...mod,
    getRecentPostsCountByMetro: vi.fn(),
  };
});
vi.mock('./events', async (original) => {
  const mod = await (original as () => Promise<Record<string, unknown>>)();
  return {
    ...mod,
    getUpcomingEventsPulseByMetro: vi.fn(),
  };
});
vi.mock('./helperScore', () => ({
  getHelperScore: vi.fn(),
  getTopHelperInMetro: vi.fn(),
  HELPER_SCORE_VISIBILITY_THRESHOLD: 10,
}));
vi.mock('./followSuggestions', () => ({
  getFollowSuggestionCandidates: vi.fn(),
}));

import { getPulseCards } from './pulse';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro } from './posts';
import { getUpcomingEventsPulseByMetro } from './events';
import { getTopHelperInMetro } from './helperScore';
import { getFollowSuggestionCandidates } from './followSuggestions';

function fakeSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'maybeSingle']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  return { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
}

describe('getPulseCards composer', () => {
  beforeEach(() => {
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
  });

  it('returns assembled cards when all sub-queries succeed', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'buddha-jayanti-2026',
          title: 'Buddha Jayanti',
          starts_on: '2026-05-02',
          ends_on: null,
          description: null,
        },
      ],
    });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 4,
    });
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'e-1',
          title: 'Dashain Meetup',
          start_date: '2026-04-22T18:00:00Z',
        },
      ],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 133.25, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    const res = await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    expect(res.data?.cards.length).toBeGreaterThanOrEqual(3);
    expect(res.data?.cards[0].kind).toBe('cultural_calendar');
  });

  it('isolates failures: a single sub-query error drops only that card', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: new Error('boom'),
    });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 4,
    });
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    const res = await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    expect(res.data?.cards.every((c) => c.kind !== 'cultural_calendar')).toBe(true);
    expect(res.data?.cards.some((c) => c.kind === 'metro_highlights')).toBe(true);
  });

  it('filters events to within 7 days of now', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 0,
    });
    // Two events: one inside 7-day window, one beyond.
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 'e-in',  title: 'Soon',  start_date: '2026-04-22T18:00:00Z' }, // +2 days
        { id: 'e-out', title: 'Later', start_date: '2026-05-10T18:00:00Z' }, // +20 days
      ],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    const res = await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    const eventsCard = res.data?.cards.find((c) => c.kind === 'events_this_week');
    expect(eventsCard?.kind).toBe('events_this_week');
    if (eventsCard?.kind === 'events_this_week') {
      expect(eventsCard.count).toBe(1);
      expect(eventsCard.nextEventTitle).toBe('Soon');
    }
  });

  it('calls sub-queries in parallel (single await round-trip)', async () => {
    const callOrder: string[] = [];
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        callOrder.push('cultural-start');
        await new Promise((r) => setTimeout(r, 5));
        callOrder.push('cultural-end');
        return { data: [] };
      }
    );
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        callOrder.push('highlights-start');
        return { data: 0 };
      }
    );
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 1, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    const culturalEnd = callOrder.indexOf('cultural-end');
    const highlightsStart = callOrder.indexOf('highlights-start');
    expect(highlightsStart).toBeLessThan(culturalEnd);
  });
});

describe('getPulseCards composer — PR 3 cards', () => {
  it('includes a find_your_people card when suggestions exist and viewer follows <5', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'u-1', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: null,
          trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
        },
      ],
    });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });

    const viewerRow = {
      id: 'viewer-1',
      metro_area_id: 'metro-dfw',
      hometown_district: 'Pokhara',
      college: null,
      following_count: 2,
    };
    const viewerSelectChain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'maybeSingle']) {
      viewerSelectChain[m] = vi.fn().mockReturnValue(viewerSelectChain);
    }
    viewerSelectChain.maybeSingle.mockResolvedValue({ data: viewerRow, error: null });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') return viewerSelectChain;
        return { select: vi.fn() };
      }),
    } as unknown as SupabaseClient;

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    const card = res.data?.cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.featured.userId).toBe('u-1');
      expect(card.featured.reason).toContain('Pokhara');
    }
  });

  it('includes a top_helper card when one exists', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { userId: 'h-1', helperScore: 72, metroAreaId: 'metro-dfw' },
    });

    const viewerRow = {
      id: 'viewer-1', metro_area_id: 'metro-dfw', hometown_district: null,
      college: null, following_count: 0,
    };
    const topHelperUserRow = { id: 'h-1', full_name: 'Deepak Gautam', profile_photo: null };

    const makeSingleChain = (row: unknown) => {
      const c: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const m of ['select', 'eq', 'maybeSingle']) {
        c[m] = vi.fn().mockReturnValue(c);
      }
      c.maybeSingle.mockResolvedValue({ data: row, error: null });
      return c;
    };

    let fromCalls = 0;
    const fromMock = vi.fn(() => {
      fromCalls += 1;
      if (fromCalls === 1) return makeSingleChain(viewerRow);
      if (fromCalls === 2) return makeSingleChain(topHelperUserRow);
      return makeSingleChain(null);
    });
    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    const card = res.data?.cards.find((c) => c.kind === 'top_helper');
    expect(card?.kind).toBe('top_helper');
    if (card?.kind === 'top_helper') {
      expect(card.helper.userId).toBe('h-1');
      expect(card.helper.displayName).toBe('Deepak G.');
      expect(card.helper.helperScore).toBe(72);
    }
  });

  it('tolerates viewer row missing (no hometown/college): falls back to baseline ranking', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsPulseByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{
        id: 'u-1', fullName: 'Anish Shrestha', hometownDistrict: null, college: null,
        trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
      }],
    });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });

    const emptyChain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'maybeSingle']) emptyChain[m] = vi.fn().mockReturnValue(emptyChain);
    emptyChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const supabase = { from: vi.fn().mockReturnValue(emptyChain) } as unknown as SupabaseClient;

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    const card = res.data?.cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.featured.reason).toBe('Active in your metro');
    }
  });
});
