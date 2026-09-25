import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event, EventsResult, MetroEventsPageOptions } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  getMetroEventsPage: vi.fn(),
  getUserEventResponses: vi.fn(),
  setEventResponse: vi.fn(),
  removeEventResponse: vi.fn(),
  notificationsShow: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShow },
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getMetroEventsPage: mocks.getMetroEventsPage,
  getUserEventResponses: mocks.getUserEventResponses,
  setEventResponse: mocks.setEventResponse,
  removeEventResponse: mocks.removeEventResponse,
}));

import { useEventFeed } from './useEventFeed';

function makeEvent(id: string, overrides: Partial<Event> = {}): Event {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    event_type: 'social',
    start_date: '2026-10-01T18:00:00.000Z',
    location_name: 'Dallas',
    metro_area_id: '19100',
    is_global: false,
    organizer_id: 'org',
    rsvp_count: 5,
    interested_count: 3,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvents(prefix: string, count: number): Event[] {
  return Array.from({ length: count }, (_, index) => makeEvent(`${prefix}${index}`));
}

function page(rows: Event[], limit = 20): EventsResult {
  return { data: rows, hasMore: rows.length === limit };
}

type PageCall = [unknown, string, MetroEventsPageOptions];

function pageCalls(): MetroEventsPageOptions[] {
  return (mocks.getMetroEventsPage.mock.calls as PageCall[]).map((call) => call[2]);
}

/** Answer each period from its own queue of results, in order. */
const RLS_TEXT = 'new row violates row-level security policy';

function queuePages(queues: { upcoming?: EventsResult[]; past?: EventsResult[] }) {
  const pending = { upcoming: [...(queues.upcoming ?? [])], past: [...(queues.past ?? [])] };
  mocks.getMetroEventsPage.mockImplementation(
    async (_client: unknown, _metro: string, options: MetroEventsPageOptions) =>
      pending[options.period].shift() ?? page([])
  );
}

async function settle() {
  await act(async () => {});
  await act(async () => {});
}

async function renderFeed(metroId: string | null = '19100', userId: string | null = 'u1') {
  const hook = renderHook(() => useEventFeed(metroId, userId));
  await settle();
  return hook;
}

describe('useEventFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserEventResponses.mockResolvedValue({ data: {} });
    mocks.setEventResponse.mockResolvedValue({});
    mocks.removeEventResponse.mockResolvedValue({});
  });

  describe('paging', () => {
    it('fills upcoming from the first upcoming page', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20))] });
      const { result } = await renderFeed();

      expect(result.current.loading).toBe(false);
      expect(result.current.upcoming).toHaveLength(20);
      expect(result.current.past).toEqual([]);
      expect(result.current.hasMore).toBe(true);
      expect(pageCalls()).toEqual([
        expect.objectContaining({ period: 'upcoming', offset: 0, limit: 20 }),
      ]);
    });

    it('requests the viewer’s responses alongside the first page', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20))] });
      mocks.getUserEventResponses.mockResolvedValue({ data: { u0: 'going' } });
      const { result } = await renderFeed();

      expect(mocks.getUserEventResponses).toHaveBeenCalledWith(expect.anything(), 'u1');
      expect(result.current.responses).toEqual({ u0: 'going' });
    });

    it('chains the first past page when the upcoming page comes back short', async () => {
      const pastRows = [makeEvent('p2'), makeEvent('p1')];
      queuePages({ upcoming: [page([makeEvent('u0')])], past: [page(pastRows)] });
      const { result } = await renderFeed();

      expect(result.current.upcoming.map((e) => e.id)).toEqual(['u0']);
      expect(result.current.past.map((e) => e.id)).toEqual(['p2', 'p1']);
      expect(result.current.hasMore).toBe(false);
      expect(pageCalls()).toEqual([
        expect.objectContaining({ period: 'upcoming', offset: 0 }),
        expect.objectContaining({ period: 'past', offset: 0 }),
      ]);
    });

    it('shares one now across both periods', async () => {
      queuePages({ upcoming: [page([])], past: [page([])] });
      await renderFeed();

      const [upcoming, past] = pageCalls();
      expect(upcoming.now).toBeInstanceOf(Date);
      expect(past.now).toBe(upcoming.now);
    });

    it('asks for the next upcoming page after a full one', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20)), page(makeEvents('v', 20))] });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();

      expect(pageCalls()[1]).toEqual(expect.objectContaining({ period: 'upcoming', offset: 20 }));
      expect(pageCalls()[1].now).toBe(pageCalls()[0].now);
      expect(result.current.upcoming).toHaveLength(40);
    });

    it('moves on to past events once an upcoming page comes back short', async () => {
      queuePages({
        upcoming: [page(makeEvents('u', 20)), page(makeEvents('v', 3))],
        past: [page(makeEvents('p', 20))],
      });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();
      act(() => result.current.loadMore());
      await settle();

      expect(pageCalls()[2]).toEqual(expect.objectContaining({ period: 'past', offset: 0 }));
      expect(result.current.upcoming).toHaveLength(23);
      expect(result.current.past).toHaveLength(20);
    });

    it('drops an event it already has', async () => {
      const first = makeEvents('u', 20);
      queuePages({ upcoming: [page(first), page([first[19], makeEvent('new')], 20)] });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();

      expect(result.current.upcoming.map((e) => e.id).filter((id) => id === 'u19')).toHaveLength(1);
      expect(result.current.upcoming.at(-1)?.id).toBe('new');
    });
  });

  describe('failures', () => {
    it('shows a failed first page as our copy, never the raw error', async () => {
      queuePages({ upcoming: [{ error: new Error(RLS_TEXT) }] });
      const { result } = await renderFeed();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Couldn't load events.");
    });

    it('shows a failed opening past page as our copy, never the raw error', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 3))], past: [{ error: new Error(RLS_TEXT) }] });
      const { result } = await renderFeed();

      expect(result.current.error).toBeNull();
      expect(result.current.loadMoreError).toBe("Couldn't load more events.");
    });

    it('pauses paging after a failed load more', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20)), { error: new Error(RLS_TEXT) }] });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();

      expect(result.current.loadMoreError).toBe("Couldn't load more events.");
      expect(result.current.hasMore).toBe(false);

      act(() => result.current.loadMore());
      await settle();
      expect(mocks.getMetroEventsPage).toHaveBeenCalledTimes(2);
    });

    it('resumes from the same page on retryLoadMore', async () => {
      queuePages({
        upcoming: [page(makeEvents('u', 20)), { error: new Error('Timed out') }, page(makeEvents('v', 5))],
      });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();
      act(() => result.current.retryLoadMore());
      await settle();

      expect(pageCalls()[2]).toEqual(expect.objectContaining({ period: 'upcoming', offset: 20 }));
      expect(result.current.loadMoreError).toBeNull();
      expect(result.current.upcoming).toHaveLength(25);
    });
  });

  describe('no metro', () => {
    it('requests nothing and reports not loading', async () => {
      const { result } = await renderFeed(null);

      expect(mocks.getMetroEventsPage).not.toHaveBeenCalled();
      expect(mocks.getUserEventResponses).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('reload', () => {
    it('requests the first page again with a new now', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20)), page(makeEvents('u', 20))] });
      const { result } = await renderFeed();

      act(() => result.current.reload());
      await settle();

      const [first, second] = pageCalls();
      expect(second).toEqual(expect.objectContaining({ period: 'upcoming', offset: 0 }));
      expect(second.now).not.toBe(first.now);
    });

    it('drops the previous member’s answers when the next member’s fail to load', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')]), page([makeEvent('e1')])] });
      mocks.getUserEventResponses.mockResolvedValueOnce({ data: { e1: 'going' } });
      const { result, rerender } = renderHook(
        ({ user }: { user: string }) => useEventFeed('19100', user),
        { initialProps: { user: 'u1' } }
      );
      await settle();
      expect(result.current.responses.e1).toBe('going');

      mocks.getUserEventResponses.mockResolvedValueOnce({ error: new Error(RLS_TEXT) });
      rerender({ user: 'u2' });
      await settle();

      expect(result.current.responses).toEqual({});
    });

    it('keeps the member’s own answers when a reload fails to fetch them', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')]), page([makeEvent('e1')])] });
      mocks.getUserEventResponses.mockResolvedValueOnce({ data: { e1: 'going' } });
      const { result } = await renderFeed();

      mocks.getUserEventResponses.mockResolvedValueOnce({ error: new Error(RLS_TEXT) });
      act(() => result.current.reload());
      await settle();

      expect(result.current.responses.e1).toBe('going');
    });

    it('drops a page that lands after the reload', async () => {
      let resolveLate: (result: EventsResult) => void = () => {};
      const late = new Promise<EventsResult>((resolve) => {
        resolveLate = resolve;
      });
      mocks.getMetroEventsPage
        .mockResolvedValueOnce(page(makeEvents('u', 20)))
        .mockReturnValueOnce(late)
        .mockResolvedValueOnce(page([makeEvent('fresh')]));
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      act(() => result.current.reload());
      await settle();
      await act(async () => resolveLate(page(makeEvents('stale', 20))));

      expect(result.current.upcoming.map((e) => e.id)).toEqual(['fresh']);
    });
  });

  describe('respond', () => {
    it('moves the counts before the write resolves', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mocks.setEventResponse.mockReturnValue(new Promise(() => {}));
      const { result } = await renderFeed();

      act(() => result.current.respond('e1', 'going'));

      expect(result.current.upcoming[0].rsvp_count).toBe(6);
      expect(result.current.responses.e1).toBe('going');
      expect(result.current.pending.has('e1')).toBe(true);
      expect(mocks.setEventResponse).toHaveBeenCalledWith(expect.anything(), 'e1', 'u1', 'going');
    });

    it('restores the counts and raises a toast when the write fails', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mocks.getUserEventResponses.mockResolvedValue({ data: { e1: 'interested' } });
      mocks.setEventResponse.mockResolvedValue({ error: new Error('RLS') });
      const { result } = await renderFeed();

      await act(async () => result.current.respond('e1', 'going'));

      expect(result.current.upcoming[0]).toEqual(
        expect.objectContaining({ rsvp_count: 5, interested_count: 3 })
      );
      expect(result.current.responses.e1).toBe('interested');
      expect(result.current.pending.has('e1')).toBe(false);
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your response. Try again." })
      );
    });

    it('removes the response when passed null', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mocks.getUserEventResponses.mockResolvedValue({ data: { e1: 'going' } });
      const { result } = await renderFeed();

      await act(async () => result.current.respond('e1', null));

      expect(mocks.removeEventResponse).toHaveBeenCalledWith(expect.anything(), 'e1', 'u1');
      expect(result.current.upcoming[0].rsvp_count).toBe(4);
      expect(result.current.responses.e1).toBeUndefined();
      expect(result.current.pending.has('e1')).toBe(false);
    });

    it('ignores a second response while the first is saving', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mocks.setEventResponse.mockReturnValue(new Promise(() => {}));
      const { result } = await renderFeed();

      act(() => result.current.respond('e1', 'going'));
      act(() => result.current.respond('e1', 'interested'));

      expect(mocks.setEventResponse).toHaveBeenCalledTimes(1);
      expect(result.current.responses.e1).toBe('going');
      expect(result.current.upcoming[0]).toEqual(
        expect.objectContaining({ rsvp_count: 6, interested_count: 3 })
      );
    });
  });
});
