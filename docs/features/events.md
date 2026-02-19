# Feature: Events

**Status:** Phase 1 (Documentation Only - Implementation Deferred)
**Last Updated:** 2026-02-19
**Priority:** Medium

---

## Overview

The Events feature allows community members to discover, share, and coordinate around local and national Nepalese community events. This includes cultural celebrations, meetups, religious gatherings, career fairs, and social events.

---

## Purpose

- **Community Building:** Help diaspora members connect through shared cultural experiences
- **Event Discovery:** Centralize event information that's currently scattered across Facebook groups
- **Local Relevance:** Show events based on user's metro area (consistent with app's location-first model)
- **Coordination:** Enable RSVPs and reminders to improve event attendance

---

## MVP Scope (Phase 1 Documentation)

### Event Listing
- Browse upcoming events in user's metro area
- View event details: title, date/time, location, description
- See event organizer information
- Filter by event type (Cultural, Religious, Social, Career, Other)

### Event Display
- Chronological list sorted by upcoming date
- Event cards showing: title, date, location, organizer
- "Coming Soon" placeholder in Phase 1 implementation

### Future Features (Post-MVP)
- RSVP functionality with attendance tracking
- Event reminders via push notifications
- Event creation by verified users (Level 1+)
- Recurring event support
- Event photo galleries
- Integration with external calendar apps

---

## User Stories

### As a community member, I want to:
- See upcoming events in my metro area so I can participate in community activities
- View event details (date, time, location) so I can plan my attendance
- Filter events by type so I can find events that interest me

### As a premium user, I want to:
- See events across all my saved locations
- View national/global events from other metro areas

### As an event organizer (future), I want to:
- Create and publish events to the community
- Track RSVPs and attendance
- Send updates to attendees

---

## Data Model

```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  event_type: 'cultural' | 'religious' | 'social' | 'career' | 'other';
  start_date: string; // ISO datetime
  end_date?: string; // ISO datetime (optional)
  location_name: string;
  location_address?: string;
  metro_area_id: string;
  is_global: boolean; // Visible across all metros
  organizer_id: string;
  organizer_name: string;
  photo_url?: string;
  rsvp_count: number;
  created_at: string;
  updated_at: string;
}
```

---

## UI/UX

### Navigation
- Events tab in bottom navigation bar
- Icon: `calendar-outline` (Ionicons)
- Position: 4th tab (Home, Post, Events, Marketplace, Profile)

### Events List Screen
- Header: "Events" with metro area context
- Filter chips: All, Cultural, Religious, Social, Career
- Event cards in chronological order
- Empty state for no upcoming events

### Event Card Design
- Event title (bold, primary text)
- Date/time in relative and absolute format
- Location name
- Organizer name with trust badge
- RSVP count (future)

---

## Technical Considerations

### Database
- New `events` table with RLS policies
- Junction table for RSVPs (future)
- Index on `metro_area_id` and `start_date`

### API Endpoints
- `GET /events?metro_area_id={id}` - List events by metro
- `GET /events/{id}` - Get event details
- `POST /events` - Create event (future, Level 1+)
- `POST /events/{id}/rsvp` - RSVP to event (future)

### Caching
- Cache event list for 5 minutes
- Real-time updates for RSVP counts (future)

---

## Phase 1 Implementation

For Phase 1, the Events tab will show a "Coming Soon" placeholder screen with:
- Illustration indicating the feature is in development
- Brief description of what's coming
- Optional email signup for notifications when feature launches

---

## Success Metrics

### Phase 1
- [ ] Events tab visible in navigation
- [ ] "Coming Soon" placeholder renders correctly
- [ ] No navigation errors

### Future Phases
- [ ] 50+ events posted per metro per month
- [ ] 30% of event viewers RSVP
- [ ] 60% of RSVPs attend events
- [ ] User engagement increase after events feature launch

---

## Related Documentation

- [Home Screen Wireframe](../wireframes/06-home-screen-level-0.md) - Bottom navigation context
- [Product Roadmap](../../product-roadmap.md) - Phase planning
