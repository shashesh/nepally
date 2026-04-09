import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  getEventAttendees,
  getEventById,
  getEventsByMetro,
  getEventsByOrganizer,
  getUpcomingEventsByMetro,
  getUserEventResponses,
  getUserRsvps,
  hasUserRsvp,
  removeEventResponse,
  rsvpToEvent,
  setEventResponse,
  unrsvpFromEvent,
  updateEvent,
} from './events';

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT = {
  id: 'event-1',
  title: 'Dashain Celebration',
  description: 'Annual celebration with cultural programs.',
  event_type: 'cultural',
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'user-1',
  rsvp_count: 0,
  interested_count: 0,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('getEventsByMetro', () => {
  it('returns events list for a metro', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_EVENT], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByMetro(supabase, '19100');
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('event-1');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByMetro(supabase, '19100');
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('returns empty array when no events', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByMetro(supabase, '19100');
    expect(result.data).toEqual([]);
  });
});

describe('getUpcomingEventsByMetro', () => {
  it('returns upcoming events for a metro', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_EVENT], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUpcomingEventsByMetro(supabase, '19100');
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('event-1');
  });

  it('applies gte filter on start_date to exclude past events', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getUpcomingEventsByMetro(supabase, '19100');
    expect(chain.gte).toHaveBeenCalledWith('start_date', expect.any(String));
  });

  it('passes custom limit to supabase', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getUpcomingEventsByMetro(supabase, '19100', 3);
    expect(chain.limit).toHaveBeenCalledWith(3);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUpcomingEventsByMetro(supabase, '19100');
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('returns empty array when no upcoming events', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUpcomingEventsByMetro(supabase, '19100');
    expect(result.data).toEqual([]);
  });

  it('wraps non-Error throws in a descriptive Error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue('string error'),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUpcomingEventsByMetro(supabase, '19100');
    expect(result.error?.message).toBe('Failed to fetch upcoming events');
  });
});

describe('getEventById', () => {
  it('returns a single event', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_EVENT, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventById(supabase, 'event-1');
    expect(result.data?.id).toBe('event-1');
  });

  it('maps PostgREST not-found error to friendly message', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventById(supabase, 'missing');
    expect(result.error?.message).toBe('Event not found');
  });
});

describe('getEventsByOrganizer', () => {
  it('returns events for an organizer', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_EVENT], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByOrganizer(supabase, 'user-1');
    expect(result.data).toHaveLength(1);
  });
});

describe('createEvent', () => {
  it('inserts a new event and returns it', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_EVENT, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createEvent(supabase, {
      title: 'Dashain Celebration',
      description: 'Annual celebration with cultural programs.',
      event_type: 'cultural',
      start_date: FUTURE,
      location_name: 'Dallas Convention Center',
      rsvp_visibility: 'public',
      is_global: false,
      organizer_id: 'user-1',
      metro_area_id: '19100',
    });

    expect(result.data?.id).toBe('event-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createEvent(supabase, {
      title: 'Dashain Celebration',
      description: 'Annual celebration with cultural programs.',
      event_type: 'cultural',
      start_date: FUTURE,
      location_name: 'Dallas Convention Center',
      rsvp_visibility: 'public',
      is_global: false,
      organizer_id: 'user-1',
      metro_area_id: '19100',
    });

    expect(result.error).toBeDefined();
  });
});

describe('updateEvent', () => {
  it('updates an event and returns updated data', async () => {
    const updated = { ...MOCK_EVENT, title: 'Updated Title' };
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateEvent(supabase, 'event-1', { title: 'Updated Title' });
    expect(result.data?.title).toBe('Updated Title');
  });

  it('maps PostgREST not-found error (PGRST116) to friendly message', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateEvent(supabase, 'missing', { title: 'New Title' });
    expect(result.error?.message).toBe('Event not found');
  });
});

describe('cancelEvent / deleteEvent', () => {
  it('cancelEvent sets status to cancelled', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await cancelEvent(supabase, 'event-1');
    expect(result.error).toBeUndefined();
  });

  it('cancelEvent returns error when event not found (PGRST116)', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await cancelEvent(supabase, 'missing-event');
    expect(result.error?.message).toBe('Event not found or not allowed');
  });

  it('deleteEvent returns error on failure', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    } as unknown as SupabaseClient;

    const result = await deleteEvent(supabase, 'event-1');
    expect(result.error).toBeDefined();
  });
});

describe('rsvpToEvent / unrsvpFromEvent', () => {
  it('rsvpToEvent upserts a going response', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await rsvpToEvent(supabase, 'event-1', 'user-2');
    expect(result.error).toBeUndefined();
    expect(chain.upsert).toHaveBeenCalledWith(
      { event_id: 'event-1', user_id: 'user-2', status: 'going' },
      { onConflict: 'event_id,user_id' }
    );
  });

  it('unrsvpFromEvent deletes an RSVP', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await unrsvpFromEvent(supabase, 'event-1', 'user-2');
    expect(result.error).toBeUndefined();
  });
});

describe('setEventResponse', () => {
  it('upserts a going response', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await setEventResponse(supabase, 'event-1', 'user-1', 'going');
    expect(result.error).toBeUndefined();
    expect(chain.upsert).toHaveBeenCalledWith(
      { event_id: 'event-1', user_id: 'user-1', status: 'going' },
      { onConflict: 'event_id,user_id' }
    );
  });

  it('upserts an interested response', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await setEventResponse(supabase, 'event-1', 'user-1', 'interested');
    expect(result.error).toBeUndefined();
    expect(chain.upsert).toHaveBeenCalledWith(
      { event_id: 'event-1', user_id: 'user-1', status: 'interested' },
      { onConflict: 'event_id,user_id' }
    );
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await setEventResponse(supabase, 'event-1', 'user-1', 'going');
    expect(result.error).toBeDefined();
  });
});

describe('removeEventResponse', () => {
  it('delegates to unrsvpFromEvent (deletes row)', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await removeEventResponse(supabase, 'event-1', 'user-1');
    expect(result.error).toBeUndefined();
  });
});

describe('getUserEventResponses', () => {
  it('returns a map of eventId → status', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { event_id: 'event-1', status: 'going' },
          { event_id: 'event-2', status: 'interested' },
        ],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserEventResponses(supabase, 'user-1');
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ 'event-1': 'going', 'event-2': 'interested' });
  });

  it('returns empty map when user has no responses', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserEventResponses(supabase, 'user-1');
    expect(result.data).toEqual({});
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserEventResponses(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });
});

describe('getUserRsvps', () => {
  it('returns list of event_ids', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ event_id: 'event-1' }, { event_id: 'event-2' }],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserRsvps(supabase, 'user-1');
    expect(result.data).toEqual(['event-1', 'event-2']);
  });

  it('returns empty array when no RSVPs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserRsvps(supabase, 'user-1');
    expect(result.data).toEqual([]);
  });
});

describe('hasUserRsvp', () => {
  it('returns true when RSVP exists', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'rsvp-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await hasUserRsvp(supabase, 'event-1', 'user-1');
    expect(result.data).toBe(true);
  });

  it('returns false when RSVP does not exist (PGRST116)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await hasUserRsvp(supabase, 'event-1', 'user-2');
    expect(result.data).toBe(false);
  });
});

describe('getEventAttendees', () => {
  it('returns attendee list', async () => {
    const attendees = [
      { id: 'rsvp-1', event_id: 'event-1', user_id: 'user-2', created_at: new Date().toISOString() },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: attendees, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventAttendees(supabase, 'event-1');
    expect(result.data).toHaveLength(1);
  });

  it('returns empty array when no attendees', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventAttendees(supabase, 'event-1');
    expect(result.data).toEqual([]);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventAttendees(supabase, 'event-1');
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});

describe('updateEvent — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateEvent(supabase, 'event-1', { title: 'New Title' });
    expect(result.error).toBeDefined();
  });

  it('returns error when updated event not found', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateEvent(supabase, 'missing', { title: 'New Title' });
    expect(result.error?.message).toBe('Event not found');
  });

  it('normalizes whitespace-only photo_url to null in update payload', async () => {
    const updated = { ...MOCK_EVENT, photo_url: null };
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await updateEvent(supabase, 'event-1', { photo_url: '   ' });
    const updatePayload = chain.update.mock.calls[0][0];
    expect(updatePayload.photo_url).toBeNull();
  });
});

describe('cancelEvent — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Cancel failed') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await cancelEvent(supabase, 'event-1');
    expect(result.error).toBeDefined();
  });
});

describe('deleteEvent — additional paths', () => {
  it('returns empty object on success', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as SupabaseClient;

    const result = await deleteEvent(supabase, 'event-1');
    expect(result.error).toBeUndefined();
  });
});

describe('getEventsByOrganizer — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByOrganizer(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });

  it('returns empty array when organizer has no events', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getEventsByOrganizer(supabase, 'user-1');
    expect(result.data).toEqual([]);
  });
});

describe('getUserRsvps — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserRsvps(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });
});

describe('unrsvpFromEvent — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: new Error('Delete failed') });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await unrsvpFromEvent(supabase, 'event-1', 'user-2');
    expect(result.error).toBeDefined();
  });
});

describe('rsvpToEvent — additional paths', () => {
  it('returns error on supabase failure', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'Permission denied' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await rsvpToEvent(supabase, 'event-1', 'user-2');
    expect(result.error).toBeDefined();
  });
});

describe('hasUserRsvp — additional paths', () => {
  it('returns error for unexpected DB errors (non-PGRST116)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Permission denied' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await hasUserRsvp(supabase, 'event-1', 'user-1');
    expect(result.error).toBeDefined();
  });
});

describe('createEvent — additional paths', () => {
  it('normalizes whitespace-only photo_url to null in insert payload', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_EVENT, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await createEvent(supabase, {
      title: 'Dashain Celebration',
      description: 'Annual celebration with cultural programs.',
      event_type: 'cultural',
      start_date: FUTURE,
      location_name: 'Dallas Convention Center',
      rsvp_visibility: 'public',
      is_global: false,
      photo_url: '   ',
      organizer_id: 'user-1',
      metro_area_id: '19100',
    });

    const insertPayload = chain.insert.mock.calls[0][0];
    expect(insertPayload.photo_url).toBeNull();
  });

  it('returns error when insert returns no data', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createEvent(supabase, {
      title: 'Dashain Celebration',
      description: 'Annual celebration with cultural programs.',
      event_type: 'cultural',
      start_date: FUTURE,
      location_name: 'Dallas Convention Center',
      rsvp_visibility: 'public',
      is_global: false,
      organizer_id: 'user-1',
      metro_area_id: '19100',
    });
    expect(result.error?.message).toBe('No data returned after insert');
  });
});
