/**
 * Events domain types — snake_case matching Supabase database columns
 * See: supabase/migrations/006_events.sql
 */
import type { User } from './user';

export type EventType = 'cultural' | 'religious' | 'social' | 'career' | 'other';

export type EventStatus = 'active' | 'cancelled' | 'removed';

export type RsvpVisibility = 'public' | 'private';

export type RsvpStatus = 'going' | 'interested';

export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;       // ISO 8601 timestamptz
  end_date?: string;        // ISO 8601 timestamptz, optional
  location_name: string;
  location_address?: string;
  metro_area_id: string;
  is_global: boolean;
  organizer_id: string;
  photo_url?: string;
  rsvp_count: number;
  interested_count: number;
  rsvp_visibility: RsvpVisibility;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  organizer?: Pick<User, 'id' | 'full_name' | 'trust_level' | 'profile_photo'>;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  user?: Pick<User, 'id' | 'full_name' | 'trust_level' | 'profile_photo'>;
}

/** Result types for API functions */
export interface EventResult {
  data?: Event;
  error?: Error;
  /** Set when no such event exists, or it was removed; a failed request leaves it unset. */
  notFound?: boolean;
}

export interface EventsResult {
  data?: Event[];
  error?: Error;
  hasMore?: boolean;
}

export interface EventRsvpsResult {
  data?: EventRsvp[];
  error?: Error;
}

/** Map of event_id → user's current response status */
export type UserEventResponses = Record<string, RsvpStatus>;
