/**
 * Shared Events API functions
 * All Supabase query logic for events — accepts SupabaseClient via dependency injection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Event,
  EventResult,
  EventsResult,
  EventRsvp,
  EventPeriod,
  EventRsvpsResult,
  RsvpStatus,
  UserEventResponses,
} from '../types/events';
import type { CreateEventInput, UpdateEventInput } from '../validation/events';

const ORGANIZER_SELECT = `
  organizer:users!events_organizer_id_fkey (
    id,
    full_name,
    trust_level,
    profile_photo
  )
`;

const EVENT_SELECT = `*, ${ORGANIZER_SELECT}`;

type AttendeeRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    trust_level: number;
    profile_photo?: string | null;
  } | {
    id: string;
    full_name: string;
    trust_level: number;
    profile_photo?: string | null;
  }[] | null;
};

export interface MetroEventsPageOptions {
  period: EventPeriod;
  /** One instant for the whole scroll, so no event changes period between pages. */
  now: Date;
  limit?: number; // default 20
  offset?: number; // default 0
}

/**
 * One page of a metro's events: local and global, never removed.
 * Upcoming events haven't ended and come soonest first. Past events have ended
 * and come most recent first.
 */
export async function getMetroEventsPage(
  supabase: SupabaseClient,
  metroId: string,
  { period, now, limit = 20, offset = 0 }: MetroEventsPageOptions
): Promise<EventsResult> {
  try {
    const iso = now.toISOString();
    const ascending = period === 'upcoming';
    let query = supabase
      .from('events')
      .select(EVENT_SELECT)
      .neq('status', 'removed')
      .or(`metro_area_id.eq.${metroId},is_global.eq.true`);

    // PostgREST ANDs repeated filters, so these combine with the metro `or`.
    // createEventSchema keeps every end after its start, so the two periods
    // split events exactly as isEventPast does.
    query = ascending
      ? query.or(`start_date.gte.${iso},end_date.gte.${iso}`)
      : query.lt('start_date', iso).or(`end_date.is.null,end_date.lt.${iso}`);

    const { data, error } = await query
      .order('start_date', { ascending })
      .order('id', { ascending })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const rows = (data || []) as Event[];
    return { data: rows, hasMore: rows.length === limit };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch events') };
  }
}

/**
 * Get a metro area's events (local + global), by start date ascending,
 * past ones included. Excludes removed events. Includes cancelled events
 * (shown with banner). Mobile's EventsScreen still pages with this; web uses
 * getMetroEventsPage, which puts upcoming events first.
 */
export async function getEventsByMetro(
  supabase: SupabaseClient,
  metroId: string,
  limit = 20,
  offset = 0
): Promise<EventsResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .neq('status', 'removed')
      .or(`metro_area_id.eq.${metroId},is_global.eq.true`)
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const rows = (data || []) as Event[];
    return { data: rows, hasMore: rows.length === limit };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch events') };
  }
}

/**
 * Get only future/upcoming events for a metro area (local + global), ascending by start_date.
 * Excludes removed and past events.
 */
export async function getUpcomingEventsByMetro(
  supabase: SupabaseClient,
  metroId: string,
  limit = 50
): Promise<EventsResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .neq('status', 'removed')
      .gte('start_date', new Date().toISOString())
      .or(`metro_area_id.eq.${metroId},is_global.eq.true`)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []) as Event[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch upcoming events') };
  }
}

export interface PulseEventSummary {
  id: string;
  title: string;
  start_date: string;
}

interface PulseEventsResult {
  data?: PulseEventSummary[];
  error?: Error;
}

/**
 * Lightweight upcoming-events query for the Metro Pulse strip.
 * Returns minimal columns (id, title, start_date) with no organizer join —
 * avoids pulling the full Event payload on every home-feed render.
 */
export async function getUpcomingEventsPulseByMetro(
  supabase: SupabaseClient,
  metroId: string,
  withinDays: number,
  now: Date = new Date(),
  limit = 20
): Promise<PulseEventsResult> {
  try {
    const upperIso = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date')
      .neq('status', 'removed')
      .gte('start_date', now.toISOString())
      .lte('start_date', upperIso)
      .or(`metro_area_id.eq.${metroId},is_global.eq.true`)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []) as PulseEventSummary[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch pulse events'),
    };
  }
}

/**
 * Get a single event by ID, with organizer info joined.
 */
export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', eventId)
      .neq('status', 'removed')
      .single();

    // PGRST116: no row. 22P02: the id isn't a UUID, as in a mistyped link,
    // which no retry would fix.
    const code = (error as { code?: string } | null)?.code;
    if (code === 'PGRST116' || code === '22P02') {
      return { error: new Error('Event not found'), notFound: true };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Event not found'), notFound: true };
    return { data: data as Event };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch event') };
  }
}

/**
 * Get events created by a specific user (for profile view).
 * Ordered by start_date ascending (upcoming first, then past).
 * Supports pagination via limit and offset.
 */
export async function getEventsByOrganizer(
  supabase: SupabaseClient,
  organizerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EventsResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('organizer_id', organizerId)
      .neq('status', 'removed')
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data || []) as Event[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch organizer events') };
  }
}

/**
 * Get the people going to an event (user info joined from event_rsvps).
 * Interested members are not attendees. Fetched on demand (not on page load).
 */
export async function getEventAttendees(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventRsvpsResult> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select(`
        id,
        event_id,
        user_id,
        status,
        created_at,
        user:users!event_rsvps_user_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const attendees = ((data || []) as AttendeeRow[]).map((row) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      return {
        id: row.id,
        event_id: row.event_id,
        user_id: row.user_id,
        status: row.status,
        created_at: row.created_at,
        user: user
          ? {
              id: user.id,
              full_name: user.full_name,
              trust_level: user.trust_level,
              profile_photo: user.profile_photo ?? null,
            }
          : undefined,
      } satisfies EventRsvp;
    });

    return { data: attendees };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch attendees') };
  }
}

/**
 * Create a new event. Returns the created event.
 */
export async function createEvent(
  supabase: SupabaseClient,
  payload: CreateEventInput & { organizer_id: string; metro_area_id: string }
): Promise<EventResult> {
  try {
    const normalizedPhotoUrl = payload.photo_url && payload.photo_url.trim().length > 0
      ? payload.photo_url
      : null;

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: payload.title,
        description: payload.description,
        event_type: payload.event_type,
        start_date: payload.start_date,
        end_date: payload.end_date ?? null,
        location_name: payload.location_name,
        location_address: payload.location_address ?? null,
        metro_area_id: payload.metro_area_id,
        is_global: payload.is_global ?? false,
        organizer_id: payload.organizer_id,
        photo_url: normalizedPhotoUrl,
        rsvp_visibility: payload.rsvp_visibility ?? 'public',
        status: 'active',
      })
      .select(EVENT_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned after insert');
    return { data: data as Event };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to create event') };
  }
}

/**
 * Update an existing event. Organizer-only (enforced by RLS).
 */
export async function updateEvent(
  supabase: SupabaseClient,
  eventId: string,
  payload: UpdateEventInput
): Promise<EventResult> {
  try {
    const updatePayload: Record<string, unknown> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.event_type !== undefined) updatePayload.event_type = payload.event_type;
    if (payload.start_date !== undefined) updatePayload.start_date = payload.start_date;
    if ('end_date' in payload) updatePayload.end_date = payload.end_date ?? null;
    if (payload.location_name !== undefined) updatePayload.location_name = payload.location_name;
    if ('location_address' in payload) updatePayload.location_address = payload.location_address ?? null;
    if (payload.is_global !== undefined) updatePayload.is_global = payload.is_global;
    if ('photo_url' in payload) {
      const normalizedPhotoUrl = payload.photo_url && payload.photo_url.trim().length > 0
        ? payload.photo_url
        : null;
      updatePayload.photo_url = normalizedPhotoUrl;
    }
    if (payload.rsvp_visibility !== undefined) updatePayload.rsvp_visibility = payload.rsvp_visibility;

    const { data, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId)
      .select(EVENT_SELECT)
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Event not found') };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Event not found') };
    return { data: data as Event };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to update event') };
  }
}

/**
 * Cancel an event — sets status to 'cancelled'. Event remains visible with banner.
 * Organizer-only (enforced by RLS).
 */
export async function cancelEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)
      .select('id')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Event not found or not allowed') };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Event not found or not allowed') };
    return {};
  } catch (error) {
    if (error instanceof Error) return { error };
    return { error: new Error('Failed to cancel event') };
  }
}

/**
 * Soft-delete an event — sets status to 'removed'. Disappears from all feeds.
 * Organizer-only (enforced by RLS).
 */
export async function deleteEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.rpc('soft_delete_event', {
      p_event_id: eventId,
    });

    if (error) throw error;
    return {};
  } catch (error) {
    if (error instanceof Error) return { error };
    return { error: new Error('Failed to delete event') };
  }
}

/**
 * RSVP a user to an event as "going". Inserts into event_rsvps with status='going'.
 * Trigger in DB increments events.rsvp_count automatically.
 * Idempotent: duplicate inserts are treated as success.
 */
export async function rsvpToEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ error?: Error }> {
  return setEventResponse(supabase, eventId, userId, 'going');
}

/**
 * Set or change a user's response to an event (going | interested).
 * Uses UPSERT so switching between statuses works correctly.
 * Triggers in DB keep rsvp_count and interested_count in sync.
 */
export async function setEventResponse(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  status: RsvpStatus
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .upsert(
        { event_id: eventId, user_id: userId, status },
        { onConflict: 'event_id,user_id' }
      );

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to set event response') };
  }
}

/**
 * Remove a user's response from an event (clears both going and interested).
 */
export async function removeEventResponse(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ error?: Error }> {
  return unrsvpFromEvent(supabase, eventId, userId);
}

/**
 * Remove a user's RSVP from an event.
 * Trigger in DB decrements events.rsvp_count automatically.
 */
export async function unrsvpFromEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to remove RSVP') };
  }
}

/**
 * Get all event IDs that a user has RSVP'd to.
 * Used on app start to hydrate RSVP button states.
 */
export async function getUserRsvps(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: string[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', userId);

    if (error) throw error;
    return { data: (data || []).map((row: { event_id: string }) => row.event_id) };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch user RSVPs') };
  }
}

/**
 * Get all event responses for a user as a map of eventId → status.
 * Used to hydrate Interested/Going button states across all cards.
 */
export async function getUserEventResponses(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: UserEventResponses; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .eq('user_id', userId);

    if (error) throw error;
    const map: UserEventResponses = {};
    for (const row of data || []) {
      map[(row as { event_id: string; status: RsvpStatus }).event_id] =
        (row as { event_id: string; status: RsvpStatus }).status;
    }
    return { data: map };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch event responses') };
  }
}

/** The member's response to one event, or null when they have none. */
export async function getUserEventResponse(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ data?: RsvpStatus | null; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { data: (data as { status: RsvpStatus } | null)?.status ?? null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch event response') };
  }
}
