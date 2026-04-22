import { describe, it, expect, vi } from 'vitest';
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

import { getPulseCards } from './pulse';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro } from './posts';
import { getUpcomingEventsPulseByMetro } from './events';

function fakeSupabase() {
  return { from: vi.fn() } as unknown as SupabaseClient;
}

describe('getPulseCards composer', () => {
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
      now: new Date('2026-04-20T00:00:00Z'),
    });

    const culturalEnd = callOrder.indexOf('cultural-end');
    const highlightsStart = callOrder.indexOf('highlights-start');
    expect(highlightsStart).toBeLessThan(culturalEnd);
  });
});
