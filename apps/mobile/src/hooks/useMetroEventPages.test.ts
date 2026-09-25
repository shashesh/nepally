import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import {
  getMetroEventsPage,
  getUserEventResponses,
  setEventResponse,
  removeEventResponse,
} from '@nepally/shared';
import type { Event, EventsResult, MetroEventsPageOptions } from '@nepally/shared';
import { useMetroEventPages } from './useMetroEventPages';

jest.mock('../config/supabase', () => ({ supabase: {} }));

jest.mock('@nepally/shared', () => ({
  applyEventResponseChange: jest.requireActual('@nepally/shared').applyEventResponseChange,
  userMessage: jest.requireActual('@nepally/shared').userMessage,
  getMetroEventsPage: jest.fn(),
  getUserEventResponses: jest.fn(),
  setEventResponse: jest.fn(),
  removeEventResponse: jest.fn(),
}));

const mockGetMetroEventsPage = getMetroEventsPage as jest.MockedFunction<typeof getMetroEventsPage>;
const mockGetUserEventResponses = getUserEventResponses as jest.MockedFunction<
  typeof getUserEventResponses
>;
const mockSetEventResponse = setEventResponse as jest.MockedFunction<typeof setEventResponse>;
const mockRemoveEventResponse = removeEventResponse as jest.MockedFunction<typeof removeEventResponse>;

const RLS_TEXT = 'new row violates row-level security policy';

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
  return (mockGetMetroEventsPage.mock.calls as PageCall[]).map((call) => call[2]);
}

/** Answer each period from its own queue of results, in order. */
function queuePages(queues: { upcoming?: EventsResult[]; past?: EventsResult[] }) {
  const pending = { upcoming: [...(queues.upcoming ?? [])], past: [...(queues.past ?? [])] };
  mockGetMetroEventsPage.mockImplementation(
    async (_client: unknown, _metro: string, options: MetroEventsPageOptions) =>
      pending[options.period].shift() ?? page([])
  );
}

async function settle() {
  await act(async () => {});
  await act(async () => {});
}

async function renderPages(metroId = '19100', userId: string | null = 'u1') {
  const hook = renderHook(
    ({ metro, user }: { metro: string; user: string | null }) => useMetroEventPages(metro, user),
    { initialProps: { metro: metroId, user: userId } }
  );
  await settle();
  return hook;
}

describe('useMetroEventPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // userMessage logs the raw error through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUserEventResponses.mockResolvedValue({ data: {} });
    mockSetEventResponse.mockResolvedValue({});
    mockRemoveEventResponse.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('paging', () => {
    it('asks for upcoming events first', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20))] });
      const { result } = await renderPages();

      expect(result.current.loading).toBe(false);
      expect(result.current.upcoming).toHaveLength(20);
      expect(result.current.past).toEqual([]);
      expect(result.current.hasMore).toBe(true);
      expect(pageCalls()).toEqual([
        expect.objectContaining({ period: 'upcoming', offset: 0, limit: 20 }),
      ]);
    });

    it('requests the member’s responses alongside the first page', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20))] });
      mockGetUserEventResponses.mockResolvedValue({ data: { u0: 'going' } });
      const { result } = await renderPages();

      expect(mockGetUserEventResponses).toHaveBeenCalledWith({}, 'u1');
      expect(result.current.responses).toEqual({ u0: 'going' });
    });

    it('chains the first past page when the upcoming page comes back short', async () => {
      queuePages({ upcoming: [page([makeEvent('u0')])], past: [page([makeEvent('p2'), makeEvent('p1')])] });
      const { result } = await renderPages();

      expect(result.current.upcoming.map((e) => e.id)).toEqual(['u0']);
      expect(result.current.hasMore).toBe(false);
      expect(pageCalls()).toEqual([
        expect.objectContaining({ period: 'upcoming', offset: 0 }),
        expect.objectContaining({ period: 'past', offset: 0 }),
      ]);
    });

    it('keeps past events newest first, as the page returns them', async () => {
      const pastRows = [
        makeEvent('newer', { start_date: '2026-09-20T18:00:00.000Z' }),
        makeEvent('older', { start_date: '2026-08-01T18:00:00.000Z' }),
      ];
      queuePages({ upcoming: [page([])], past: [page(pastRows)] });
      const { result } = await renderPages();

      expect(result.current.past.map((e) => e.id)).toEqual(['newer', 'older']);
    });

    it('shares one now across both periods', async () => {
      queuePages({ upcoming: [page([])], past: [page([])] });
      await renderPages();

      const [upcoming, past] = pageCalls();
      expect(upcoming.now).toBeInstanceOf(Date);
      expect(past.now).toBe(upcoming.now);
    });

    it('loads the next page from the period’s own offset', async () => {
      queuePages({ upcoming: [page(makeEvents('u', 20)), page(makeEvents('v', 20))] });
      const { result } = await renderPages();

      act(() => result.current.loadMore());
      await settle();

      expect(pageCalls()[1]).toEqual(expect.objectContaining({ period: 'upcoming', offset: 20 }));
      expect(pageCalls()[1].now).toBe(pageCalls()[0].now);
      expect(result.current.upcoming).toHaveLength(40);
    });

    it('moves on to past events at offset 0 once upcoming runs out, then pages past by its offset', async () => {
      queuePages({
        upcoming: [page(makeEvents('u', 20)), page(makeEvents('v', 3))],
        past: [page(makeEvents('p', 20)), page(makeEvents('q', 2))],
      });
      const { result } = await renderPages();

      act(() => result.current.loadMore());
      await settle();
      act(() => result.current.loadMore());
      await settle();
      act(() => result.current.loadMore());
      await settle();

      expect(pageCalls().slice(2)).toEqual([
        expect.objectContaining({ period: 'past', offset: 0 }),
        expect.objectContaining({ period: 'past', offset: 20 }),
      ]);
      expect(result.current.upcoming).toHaveLength(23);
      expect(result.current.past).toHaveLength(22);
      expect(result.current.hasMore).toBe(false);
    });

    it('drops an event it already has', async () => {
      const first = makeEvents('u', 20);
      queuePages({ upcoming: [page(first), page([first[19], makeEvent('new')], 20)] });
      const { result } = await renderPages();

      act(() => result.current.loadMore());
      await settle();

      expect(result.current.upcoming.filter((e) => e.id === 'u19')).toHaveLength(1);
      expect(result.current.upcoming.at(-1)?.id).toBe('new');
    });
  });

  describe('failures', () => {
    it('shows a failed first page as our copy, never the raw error', async () => {
      queuePages({ upcoming: [{ error: new Error(RLS_TEXT) }] });
      const { result } = await renderPages();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Couldn't load events.");
    });

    it('pauses paging after a failed load more and resumes from the same offset on retry', async () => {
      queuePages({
        upcoming: [page(makeEvents('u', 20)), { error: new Error(RLS_TEXT) }, page(makeEvents('v', 5))],
      });
      const { result } = await renderPages();

      act(() => result.current.loadMore());
      await settle();
      expect(result.current.loadMoreError).toBe("Couldn't load more events.");
      expect(result.current.hasMore).toBe(false);

      act(() => result.current.loadMore());
      await settle();
      expect(mockGetMetroEventsPage).toHaveBeenCalledTimes(2);

      act(() => result.current.retryLoadMore());
      await settle();
      expect(pageCalls()[2]).toEqual(expect.objectContaining({ period: 'upcoming', offset: 20 }));
      expect(result.current.loadMoreError).toBeNull();
      expect(result.current.upcoming).toHaveLength(25);
    });
  });

  describe('no metro', () => {
    it('requests nothing and reports not loading', async () => {
      const { result } = await renderPages('');

      expect(mockGetMetroEventsPage).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('stale pages', () => {
    it('drops a page requested before a metro change', async () => {
      let resolveLate: (result: EventsResult) => void = () => {};
      const late = new Promise<EventsResult>((resolve) => {
        resolveLate = resolve;
      });
      mockGetMetroEventsPage
        .mockResolvedValueOnce(page(makeEvents('u', 20)))
        .mockReturnValueOnce(late)
        .mockResolvedValueOnce(page([makeEvent('nyc')]));
      const { result, rerender } = await renderPages('19100');

      act(() => result.current.loadMore());
      rerender({ metro: '35620', user: 'u1' });
      await settle();
      await act(async () => resolveLate(page(makeEvents('stale', 20))));

      expect(mockGetMetroEventsPage.mock.calls[2][1]).toBe('35620');
      expect(result.current.upcoming.map((e) => e.id)).toEqual(['nyc']);
    });

    it('drops a page that lands after a reload', async () => {
      let resolveLate: (result: EventsResult) => void = () => {};
      const late = new Promise<EventsResult>((resolve) => {
        resolveLate = resolve;
      });
      mockGetMetroEventsPage
        .mockResolvedValueOnce(page(makeEvents('u', 20)))
        .mockReturnValueOnce(late)
        .mockResolvedValueOnce(page([makeEvent('fresh')]));
      const { result } = await renderPages();

      act(() => result.current.loadMore());
      act(() => result.current.reload());
      await settle();
      await act(async () => resolveLate(page(makeEvents('stale', 20))));

      expect(result.current.upcoming.map((e) => e.id)).toEqual(['fresh']);
    });
  });

  describe('refresh', () => {
    it('keeps the list while the first page reloads with a new now', async () => {
      let resolveRefresh: (result: EventsResult) => void = () => {};
      mockGetMetroEventsPage
        .mockResolvedValueOnce(page([makeEvent('old')]))
        .mockResolvedValueOnce(page([]))
        .mockReturnValueOnce(
          new Promise<EventsResult>((resolve) => {
            resolveRefresh = resolve;
          })
        )
        .mockResolvedValueOnce(page([]));
      const { result } = await renderPages();

      act(() => result.current.refresh());
      expect(result.current.refreshing).toBe(true);
      expect(result.current.upcoming.map((e) => e.id)).toEqual(['old']);

      await act(async () => resolveRefresh(page([makeEvent('new')])));
      await settle();

      expect(result.current.refreshing).toBe(false);
      expect(result.current.upcoming.map((e) => e.id)).toEqual(['new']);
      expect(pageCalls()[2].now).not.toBe(pageCalls()[0].now);
    });
  });

  describe('respond', () => {
    it('moves the counts before the write resolves', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mockSetEventResponse.mockReturnValue(new Promise(() => {}));
      const { result } = await renderPages();

      act(() => result.current.respond('e1', 'going'));

      expect(result.current.upcoming[0].rsvp_count).toBe(6);
      expect(result.current.responses.e1).toBe('going');
      expect(mockSetEventResponse).toHaveBeenCalledWith({}, 'e1', 'u1', 'going');
    });

    it('restores the counts and alerts when the write fails', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mockGetUserEventResponses.mockResolvedValue({ data: { e1: 'interested' } });
      mockSetEventResponse.mockResolvedValue({ error: new Error('RLS') });
      const { result } = await renderPages();

      await act(async () => result.current.respond('e1', 'going'));

      expect(result.current.upcoming[0]).toEqual(
        expect.objectContaining({ rsvp_count: 5, interested_count: 3 })
      );
      expect(result.current.responses.e1).toBe('interested');
      expect(Alert.alert).toHaveBeenCalledWith('Error', "Couldn't update your response. Try again.");
    });

    it('removes the response when passed null', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mockGetUserEventResponses.mockResolvedValue({ data: { e1: 'going' } });
      const { result } = await renderPages();

      await act(async () => result.current.respond('e1', null));

      expect(mockRemoveEventResponse).toHaveBeenCalledWith({}, 'e1', 'u1');
      expect(result.current.upcoming[0].rsvp_count).toBe(4);
      expect(result.current.responses.e1).toBeUndefined();
    });

    it('ignores a second response while the first is saving', async () => {
      queuePages({ upcoming: [page([makeEvent('e1')])] });
      mockSetEventResponse.mockReturnValue(new Promise(() => {}));
      const { result } = await renderPages();

      act(() => result.current.respond('e1', 'going'));
      act(() => result.current.respond('e1', 'interested'));

      expect(mockSetEventResponse).toHaveBeenCalledTimes(1);
      expect(result.current.responses.e1).toBe('going');
    });
  });
});
