import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event } from '@nepally/shared';

const RLS_TEXT = 'new row violates row-level security policy';

const mocks = vi.hoisted(() => ({
  getEventById: vi.fn(),
  getUserEventResponse: vi.fn(),
  setEventResponse: vi.fn(),
  removeEventResponse: vi.fn(),
  cancelEvent: vi.fn(),
  deleteEvent: vi.fn(),
  notificationsShow: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShow },
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getEventById: mocks.getEventById,
  getUserEventResponse: mocks.getUserEventResponse,
  setEventResponse: mocks.setEventResponse,
  removeEventResponse: mocks.removeEventResponse,
  cancelEvent: mocks.cancelEvent,
  deleteEvent: mocks.deleteEvent,
}));

import { useEventDetail } from './useEventDetail';

function makeEvent(id: string, overrides: Partial<Event> = {}): Event {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    event_type: 'cultural',
    start_date: '2026-10-01T18:00:00.000Z',
    location_name: 'Dallas',
    metro_area_id: '19100',
    is_global: false,
    organizer_id: 'org',
    rsvp_count: 8,
    interested_count: 15,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

async function settle() {
  await act(async () => {});
  await act(async () => {});
}

async function renderDetail(id: string | undefined = 'e1', userId: string | null = 'u1') {
  const hook = renderHook(
    ({ eventId, viewerId }: { eventId: string | undefined; viewerId: string | null }) =>
      useEventDetail(eventId, viewerId),
    { initialProps: { eventId: id, viewerId: userId } }
  );
  await settle();
  return hook;
}

describe('useEventDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getEventById.mockImplementation(async (_client: unknown, id: string) => ({
      data: makeEvent(id),
    }));
    mocks.getUserEventResponse.mockResolvedValue({ data: 'interested' });
    mocks.setEventResponse.mockResolvedValue({});
    mocks.removeEventResponse.mockResolvedValue({});
    mocks.cancelEvent.mockResolvedValue({});
    mocks.deleteEvent.mockResolvedValue({});
  });

  describe('loading', () => {
    it('loads the event and the viewer’s response together', async () => {
      const { result } = await renderDetail();

      expect(result.current.loading).toBe(false);
      expect(result.current.event?.id).toBe('e1');
      expect(result.current.response).toBe('interested');
      expect(mocks.getEventById).toHaveBeenCalledWith(expect.anything(), 'e1');
      expect(mocks.getUserEventResponse).toHaveBeenCalledWith(expect.anything(), 'e1', 'u1');
    });

    it('sets notFound when there is no such event', async () => {
      mocks.getEventById.mockResolvedValue({ error: new Error('Event not found'), notFound: true });
      const { result } = await renderDetail();

      expect(result.current.notFound).toBe(true);
      expect(result.current.error).toBe('Event not found');
      expect(result.current.event).toBeNull();
    });

    it('sets only error, in our copy, when the request fails', async () => {
      mocks.getEventById.mockResolvedValue({ error: new Error(RLS_TEXT) });
      const { result } = await renderDetail();

      expect(result.current.notFound).toBe(false);
      expect(result.current.error).toBe("Couldn't load this event.");
    });

    it('leaves the response null when its request fails', async () => {
      mocks.getUserEventResponse.mockResolvedValue({ error: new Error('RLS') });
      const { result } = await renderDetail();

      expect(result.current.event?.id).toBe('e1');
      expect(result.current.response).toBeNull();
    });

    it('clears the previous event as soon as the id changes', async () => {
      const { result, rerender } = await renderDetail('e1');
      let resolveNext: (value: { data: Event }) => void = () => {};
      mocks.getEventById.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNext = resolve;
        })
      );

      rerender({ eventId: 'e2', viewerId: 'u1' });

      expect(result.current.event).toBeNull();
      expect(result.current.loading).toBe(true);

      await act(async () => resolveNext({ data: makeEvent('e2') }));
      expect(result.current.event?.id).toBe('e2');
    });

    it('drops a result that lands after the id has changed', async () => {
      let resolveFirst: (value: { data: Event }) => void = () => {};
      mocks.getEventById.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      );
      const { result, rerender } = await renderDetail('e1');

      rerender({ eventId: 'e2', viewerId: 'u1' });
      await settle();
      await act(async () => resolveFirst({ data: makeEvent('e1') }));

      expect(result.current.event?.id).toBe('e2');
    });

    it('requests nothing without an id', async () => {
      const { result } = renderHook(() => useEventDetail(undefined, 'u1'));
      await settle();

      expect(mocks.getEventById).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('loads the event again on reload', async () => {
      const { result } = await renderDetail();

      act(() => result.current.reload());
      await settle();

      expect(mocks.getEventById).toHaveBeenCalledTimes(2);
    });
  });

  describe('respond', () => {
    it('moves the response and the counts before the write resolves, then re-reads', async () => {
      let resolveWrite: (value: object) => void = () => {};
      mocks.setEventResponse.mockReturnValue(
        new Promise((resolve) => {
          resolveWrite = resolve;
        })
      );
      const { result } = await renderDetail();

      act(() => result.current.respond('going'));

      expect(result.current.response).toBe('going');
      expect(result.current.event).toEqual(
        expect.objectContaining({ rsvp_count: 9, interested_count: 14 })
      );
      expect(result.current.responding).toBe(true);
      expect(mocks.setEventResponse).toHaveBeenCalledWith(expect.anything(), 'e1', 'u1', 'going');

      await act(async () => resolveWrite({}));
      await settle();

      expect(mocks.getEventById).toHaveBeenCalledTimes(2);
      expect(mocks.getUserEventResponse).toHaveBeenCalledTimes(2);
      expect(result.current.responding).toBe(false);
    });

    it('restores the response and counts and raises a toast when the write fails', async () => {
      mocks.setEventResponse.mockResolvedValue({ error: new Error('RLS') });
      mocks.getEventById
        .mockResolvedValueOnce({ data: makeEvent('e1') })
        .mockResolvedValueOnce({ error: new Error('offline') });
      mocks.getUserEventResponse
        .mockResolvedValueOnce({ data: 'interested' })
        .mockResolvedValueOnce({ error: new Error('offline') });
      const { result } = await renderDetail();

      await act(async () => result.current.respond('going'));
      await settle();

      expect(result.current.response).toBe('interested');
      expect(result.current.event).toEqual(
        expect.objectContaining({ rsvp_count: 8, interested_count: 15 })
      );
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your response. Try again." })
      );
    });

    it('removes the response when passed null', async () => {
      const { result } = await renderDetail();

      await act(async () => result.current.respond(null));

      expect(mocks.removeEventResponse).toHaveBeenCalledWith(expect.anything(), 'e1', 'u1');
    });

    it('ignores a second response while the first is saving', async () => {
      mocks.setEventResponse.mockReturnValue(new Promise(() => {}));
      const { result } = await renderDetail();

      act(() => result.current.respond('going'));
      act(() => result.current.respond(null));

      expect(mocks.setEventResponse).toHaveBeenCalledTimes(1);
      expect(mocks.removeEventResponse).not.toHaveBeenCalled();
      expect(result.current.response).toBe('going');
    });
  });

  describe('cancel and remove', () => {
    it('cancel marks the event cancelled', async () => {
      const { result } = await renderDetail();

      let outcome: string | null = 'unset';
      await act(async () => {
        outcome = await result.current.cancel();
      });

      expect(outcome).toBeNull();
      expect(mocks.cancelEvent).toHaveBeenCalledWith(expect.anything(), 'e1');
      expect(result.current.event?.status).toBe('cancelled');
    });

    it('cancel returns our copy, never the raw error, on failure', async () => {
      mocks.cancelEvent.mockResolvedValue({ error: new Error(RLS_TEXT) });
      const { result } = await renderDetail();

      let outcome: string | null = null;
      await act(async () => {
        outcome = await result.current.cancel();
      });

      expect(outcome).toBe("Couldn't cancel the event. Please try again.");
      expect(result.current.event?.status).toBe('active');
    });

    it('remove reports success, and our copy on failure', async () => {
      const { result } = await renderDetail();

      let outcome: string | null = 'unset';
      await act(async () => {
        outcome = await result.current.remove();
      });
      expect(outcome).toBeNull();
      expect(mocks.deleteEvent).toHaveBeenCalledWith(expect.anything(), 'e1');

      mocks.deleteEvent.mockResolvedValue({ error: new Error(RLS_TEXT) });
      await act(async () => {
        outcome = await result.current.remove();
      });
      expect(outcome).toBe("Couldn't delete the event. Please try again.");
    });
  });
});
