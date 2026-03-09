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
  EventRsvpsResult,
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

/**
 * Get upcoming events for a metro area (local + global), chronological.
 * Excludes removed events. Includes cancelled events (shown with banner).
 */
export async function getEventsByMetro(
  supabase: SupabaseClient,
  metroId: string,
  limit = 50
): Promise<EventsResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .neq('status', 'removed')
      .or(`metro_area_id.eq.${metroId},is_global.eq.true`)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []) as Event[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch events') };
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

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Event not found') };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Event not found') };
    return { data: data as Event };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch event') };
  }
}

/**
 * Get all events created by a specific user (for profile view).
 * Ordered by start_date ascending (upcoming first, then past).
 */
export async function getEventsByOrganizer(
  supabase: SupabaseClient,
  organizerId: string
): Promise<EventsResult> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('organizer_id', organizerId)
      .neq('status', 'removed')
      .order('start_date', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as Event[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch organizer events') };
  }
}

/**
 * Get the full attendee list for an event (user info joined from event_rsvps).
 * Fetched on demand (not on page load).
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
        created_at,
        user:users!event_rsvps_user_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as EventRsvp[] };
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

    if (error) throw error;
    if (!data) throw new Error('Event not found');
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
    const { error } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', eventId);

    if (error) throw error;
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
 * RSVP a user to an event. Inserts into event_rsvps.
 * Trigger in DB increments events.rsvp_count automatically.
 */
export async function rsvpToEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: userId });

    // RSVP should behave as idempotent. If the row already exists,
    // treat it as success so UI state remains consistent.
    if ((error as { code?: string } | null)?.code === '23505') {
      return {};
    }

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to RSVP') };
  }
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
 * Check whether a user has RSVP'd to a specific event.
 */
export async function hasUserRsvp(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ data?: boolean; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return { data: !!data };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to check RSVP') };
  }
}
