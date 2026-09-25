import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyEventResponseChange,
  cancelEvent,
  deleteEvent,
  getEventById,
  getUserEventResponse,
  removeEventResponse,
  setEventResponse,
  type Event,
  type RsvpStatus,
  userMessage,
} from '@nepally/shared';
import { notify } from '../components/ui';
import { supabase } from '../lib/supabase';

const RESPONSE_ERROR = "Couldn't update your response. Try again.";

export interface EventDetailState {
  event: Event | null;
  response: RsvpStatus | null;
  loading: boolean;
  error: string | null;
  /** getEventById said no such event; `error` alone means the request failed. */
  notFound: boolean;
  responding: boolean;
  reload: () => void;
  respond: (next: RsvpStatus | null) => void;
  /** Resolve to an error message, or null on success. The page owns the dialogs and toasts. */
  cancel: () => Promise<string | null>;
  remove: () => Promise<string | null>;
}

async function fetchDetail(id: string, userId: string | null) {
  const [eventResult, responseResult] = await Promise.all([
    getEventById(supabase, id),
    userId ? getUserEventResponse(supabase, id, userId) : Promise.resolve({ data: null }),
  ]);
  return { eventResult, responseResult };
}

/**
 * One event for /events/[id] and the viewer's response to it, with `respond`,
 * `cancel` and `remove`. The Pages Router keeps the page mounted from one
 * event to the next, so every field resets during render when `id` changes
 * (react.dev "Adjusting some state when a prop changes"), and a result for a
 * previous id is dropped.
 */
export function useEventDetail(id: string | undefined, userId: string | null): EventDetailState {
  const [event, setEvent] = useState<Event | null>(null);
  const [response, setResponse] = useState<RsvpStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [responding, setResponding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // The id the page shows now, so a re-read for an earlier one is dropped.
  const currentIdRef = useRef(id);
  const respondingRef = useRef(false);

  const [requestedId, setRequestedId] = useState(id);
  if (id !== requestedId) {
    setRequestedId(id);
    setEvent(null);
    setResponse(null);
    setLoading(Boolean(id));
    setError(null);
    setNotFound(false);
  }

  useEffect(() => {
    currentIdRef.current = id;
    if (!id) return;
    let cancelled = false;

    void fetchDetail(id, userId).then(({ eventResult, responseResult }) => {
      if (cancelled) return;
      if (eventResult.error || !eventResult.data) {
        setError(
          eventResult.error && !eventResult.notFound
            ? userMessage(eventResult.error, "Couldn't load this event.", 'event_load_failed', {
                platform: 'web',
                eventId: id,
              })
            : 'Event not found'
        );
        setNotFound(Boolean(eventResult.notFound));
        setLoading(false);
        return;
      }
      setEvent(eventResult.data);
      // A failed response request leaves the member with no response shown.
      setResponse(responseResult.data ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, userId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setReloadKey((key) => key + 1);
  }, []);

  const respond = useCallback(
    (next: RsvpStatus | null) => {
      if (!id || !userId || !event || respondingRef.current) return;
      const previous = response;
      if (previous === next) return;

      respondingRef.current = true;
      setResponding(true);
      setResponse(next);
      setEvent((current) => (current ? applyEventResponseChange(current, previous, next) : current));

      const write =
        next === null
          ? removeEventResponse(supabase, id, userId)
          : setEventResponse(supabase, id, userId, next);

      void write
        .then(async (result) => {
          if (result.error && currentIdRef.current === id) {
            setResponse(previous);
            setEvent((current) =>
              current ? applyEventResponseChange(current, next, previous) : current
            );
            notify.error(RESPONSE_ERROR);
          }
          // Either way, take the counts and the response the server now has.
          const { eventResult, responseResult } = await fetchDetail(id, userId);
          if (currentIdRef.current !== id) return;
          if (eventResult.data) setEvent(eventResult.data);
          if (responseResult.data !== undefined) setResponse(responseResult.data);
        })
        .finally(() => {
          respondingRef.current = false;
          setResponding(false);
        });
    },
    [id, userId, event, response]
  );

  const cancel = useCallback(async () => {
    if (!event) return null;
    const eventId = event.id;
    const result = await cancelEvent(supabase, eventId);
    if (result.error) {
      return userMessage(result.error, "Couldn't cancel the event. Please try again.", 'event_cancel_failed', {
        platform: 'web',
        eventId,
      });
    }
    setEvent((current) => (current?.id === eventId ? { ...current, status: 'cancelled' } : current));
    return null;
  }, [event]);

  const remove = useCallback(async () => {
    if (!event) return null;
    const result = await deleteEvent(supabase, event.id);
    if (!result.error) return null;
    return userMessage(result.error, "Couldn't delete the event. Please try again.", 'event_delete_failed', {
      platform: 'web',
      eventId: event.id,
    });
  }, [event]);

  return { event, response, loading, error, notFound, responding, reload, respond, cancel, remove };
}
