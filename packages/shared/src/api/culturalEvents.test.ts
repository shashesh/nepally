import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUpcomingCulturalEvents } from './culturalEvents';

function makeChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'gte', 'lte', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // terminal: awaiting the builder resolves to `final`
  (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
    (res: (v: unknown) => unknown) => Promise.resolve(res(final));
  return chain;
}

describe('getUpcomingCulturalEvents', () => {
  it('queries cultural_events with today as lower bound', async () => {
    const chain = makeChain({
      data: [
        { id: 'dashain-2026', title: 'Dashain', starts_on: '2026-09-19', ends_on: '2026-10-02' },
      ],
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const res = await getUpcomingCulturalEvents(supabase, 30, new Date('2026-04-20T00:00:00Z'));

    expect(supabase.from).toHaveBeenCalledWith('cultural_events');
    expect(chain.gte).toHaveBeenCalledWith('starts_on', '2026-04-20');
    expect(chain.lte).toHaveBeenCalledWith('starts_on', '2026-05-20');
    expect(chain.order).toHaveBeenCalledWith('starts_on', { ascending: true });
    expect(res.data?.length).toBe(1);
  });

  it('returns an error field when the query fails', async () => {
    const chain = makeChain({ data: null, error: new Error('boom') });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const res = await getUpcomingCulturalEvents(supabase, 30, new Date('2026-04-20'));
    expect(res.error).toBeInstanceOf(Error);
    expect(res.data).toBeUndefined();
  });

  it('defaults withinDays to 30 when omitted', async () => {
    const chain = makeChain({ data: [], error: null });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    await getUpcomingCulturalEvents(supabase, undefined, new Date('2026-04-20T00:00:00Z'));
    expect(chain.lte).toHaveBeenCalledWith('starts_on', '2026-05-20');
  });
});
