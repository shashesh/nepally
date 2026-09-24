import React from 'react';
import { render, screen, fireEvent, act, within } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cancelEvent,
  deleteEvent,
  getEventAttendees,
  getEventById,
  getOrCreateConversation,
  getUserEventResponse,
  setEventResponse,
} from '@nepally/shared';
import type { Event } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  notificationsShow: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShow },
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT: Event = {
  id: 'event-1', title: 'Dashain Celebration',
  description: 'Annual cultural celebration in Dallas.',
  event_type: 'cultural', start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  location_address: '650 S Griffin St, Dallas, TX',
  metro_area_id: '19100', is_global: false,
  organizer_id: 'user-1', rsvp_count: 8, interested_count: 15,
  rsvp_visibility: 'public', status: 'active',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  organizer: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getEventById: vi.fn(),
    getEventAttendees: vi.fn(),
    getUserEventResponse: vi.fn(),
    getOrCreateConversation: vi.fn(),
    setEventResponse: vi.fn(),
    removeEventResponse: vi.fn(),
    cancelEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
});

import EventDetailPage from './[id].page';

async function settle() {
  await act(async () => {});
  await act(async () => {});
}

async function renderPage() {
  render(React.createElement(EventDetailPage));
  await settle();
}

const attendance = () => screen.getByRole('region', { name: 'Attendance' });

describe('EventDetailPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.useRouter.mockReturnValue({ query: { id: 'event-1' }, replace: mockReplace, push: mockPush });
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', full_name: 'Bikal Shrestha', trust_level: 1 } });
    vi.mocked(getEventById).mockResolvedValue({ data: MOCK_EVENT });
    vi.mocked(getUserEventResponse).mockResolvedValue({ data: null });
    vi.mocked(getEventAttendees).mockResolvedValue({ data: [] });
    vi.mocked(getOrCreateConversation).mockResolvedValue({
      data: { conversationId: 'conv-1', isNew: true },
    } as Awaited<ReturnType<typeof getOrCreateConversation>>);
    vi.mocked(setEventResponse).mockResolvedValue({});
    vi.mocked(cancelEvent).mockResolvedValue({});
    vi.mocked(deleteEvent).mockResolvedValue({});
  });

  it('renders event details after fetch', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashain Celebration' })).toBeDefined();
    expect(screen.getByText('Annual cultural celebration in Dallas.')).toBeDefined();
    expect(screen.getByText('650 S Griffin St, Dallas, TX')).toBeDefined();
  });

  it('names the breadcrumb and marks the current page', async () => {
    await renderPage();
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Events' }).getAttribute('href')).toBe('/events');
    expect(within(nav).getByText('Dashain Celebration').getAttribute('aria-current')).toBe('page');
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    await renderPage();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  describe('response', () => {
    it('offers Interested and Going to a Level 1 member who is not the organizer', async () => {
      await renderPage();
      const going = within(attendance()).getByRole('button', { name: 'Going' });
      expect(going.getAttribute('aria-pressed')).toBe('false');
      expect(within(attendance()).getByRole('button', { name: 'Interested' })).toBeDefined();
    });

    it('shows an interested viewer Interested pressed', async () => {
      vi.mocked(getUserEventResponse).mockResolvedValue({ data: 'interested' });
      await renderPage();
      expect(
        within(attendance()).getByRole('button', { name: 'Interested' }).getAttribute('aria-pressed')
      ).toBe('true');
    });

    it('marks the viewer going and re-syncs from the server', async () => {
      await renderPage();
      fireEvent.click(within(attendance()).getByRole('button', { name: 'Going' }));
      await settle();

      expect(setEventResponse).toHaveBeenCalledWith({}, 'event-1', 'user-2', 'going');
      expect(getEventById).toHaveBeenCalledTimes(2);
      expect(getUserEventResponse).toHaveBeenCalledTimes(2);
    });

    it('tells the organizer why there is no control', async () => {
      mocks.useAuth.mockReturnValue({ user: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1 } });
      await renderPage();
      expect(within(attendance()).getByText("You're the organizer.")).toBeDefined();
      expect(within(attendance()).queryByRole('group', { name: 'Your response' })).toBeNull();
    });

    it('tells a Level 0 member to verify', async () => {
      mocks.useAuth.mockReturnValue({ user: { id: 'user-2', full_name: 'Bikal Shrestha', trust_level: 0 } });
      await renderPage();
      expect(within(attendance()).getByText('Verify your account to respond.')).toBeDefined();
    });
  });

  describe('status alerts', () => {
    it('shows the cancelled alert, and no response control, for a cancelled event', async () => {
      vi.mocked(getEventById).mockResolvedValue({ data: { ...MOCK_EVENT, status: 'cancelled' } });
      await renderPage();
      expect(screen.getByRole('alert').textContent).toContain('This event has been cancelled.');
      expect(within(attendance()).queryByRole('group', { name: 'Your response' })).toBeNull();
    });

    it('shows the past alert for a past event', async () => {
      vi.mocked(getEventById).mockResolvedValue({ data: { ...MOCK_EVENT, start_date: PAST } });
      await renderPage();
      expect(screen.getByRole('alert').textContent).toContain('This event has passed.');
    });

    it('shows the Global badge only for a global event', async () => {
      vi.mocked(getEventById).mockResolvedValue({ data: { ...MOCK_EVENT, is_global: true } });
      await renderPage();
      expect(screen.getByText('Global')).toBeDefined();
    });
  });

  describe('load failures', () => {
    it('offers Back to events when there is no such event', async () => {
      vi.mocked(getEventById).mockResolvedValue({ error: new Error('Event not found'), notFound: true });
      await renderPage();

      expect(screen.getByRole('heading', { level: 1, name: 'Event not found' })).toBeDefined();
      expect(screen.getByText('It may have been deleted.')).toBeDefined();
      expect(screen.getByRole('link', { name: 'Back to events' }).getAttribute('href')).toBe('/events');
    });

    it('offers Try again, which reloads, when the request fails', async () => {
      vi.mocked(getEventById)
        .mockResolvedValueOnce({ error: new Error('Failed to fetch') })
        .mockResolvedValue({ data: MOCK_EVENT });
      await renderPage();

      expect(screen.getByText("Couldn't load this event")).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await settle();

      expect(screen.getByRole('heading', { level: 1, name: 'Dashain Celebration' })).toBeDefined();
    });
  });

  describe('attendees', () => {
    it('opens the people going from the count', async () => {
      vi.mocked(getEventAttendees).mockResolvedValue({
        data: [
          {
            id: 'r1', event_id: 'event-1', user_id: 'user-3', status: 'going',
            created_at: new Date().toISOString(),
            user: { id: 'user-3', full_name: 'Rohan Shrestha', trust_level: 1, profile_photo: null },
          },
        ],
      });
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: '8 people going' }));
      await settle();

      const dialog = screen.getByRole('dialog', { name: 'People going' });
      expect(within(dialog).getByText('Rohan S.')).toBeDefined();
    });

    it('reloads the people going on every open, keeping the last list while it loads', async () => {
      const rsvp = (id: string, fullName: string) => ({
        id, event_id: 'event-1', user_id: `user-${id}`, status: 'going' as const,
        created_at: new Date().toISOString(),
        user: { id: `user-${id}`, full_name: fullName, trust_level: 1, profile_photo: null },
      });
      let finishSecond: (value: { data: ReturnType<typeof rsvp>[] }) => void = () => {};
      vi.mocked(getEventAttendees)
        .mockResolvedValueOnce({ data: [rsvp('r1', 'Rohan Shrestha')] })
        .mockReturnValueOnce(
          new Promise((resolve) => {
            finishSecond = resolve;
          })
        );
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: '8 people going' }));
      await settle();
      fireEvent.click(within(screen.getByRole('dialog', { name: 'People going' })).getByRole('button', { name: 'Close' }));
      await settle();

      fireEvent.click(screen.getByRole('button', { name: '8 people going' }));
      await settle();
      expect(getEventAttendees).toHaveBeenCalledTimes(2);
      expect(within(screen.getByRole('dialog', { name: 'People going' })).getByText('Rohan S.')).toBeDefined();

      await act(async () => {
        finishSecond({ data: [rsvp('r1', 'Rohan Shrestha'), rsvp('r2', 'Asha Kumar')] });
      });
      await settle();

      const dialog = screen.getByRole('dialog', { name: 'People going' });
      expect(within(dialog).getByText('Asha K.')).toBeDefined();
      expect(within(dialog).getByText('Rohan S.')).toBeDefined();
    });

    it('shows a failed attendee request in our copy, with Try again', async () => {
      vi.mocked(getEventAttendees)
        .mockResolvedValueOnce({ error: new Error('new row violates row-level security policy') })
        .mockResolvedValue({ data: [] });
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: '8 people going' }));
      await settle();

      const dialog = screen.getByRole('dialog', { name: 'People going' });
      expect(within(dialog).getByText("Couldn't load attendees.")).toBeDefined();
      expect(within(dialog).queryByText(/row-level security/)).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));
      await settle();

      expect(getEventAttendees).toHaveBeenCalledTimes(2);
      expect(within(dialog).getByText('No attendees yet.')).toBeDefined();
    });
  });

  describe('organizer and messaging', () => {
    it('creates a conversation and navigates when Message Organizer is clicked', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Message Organizer' }));
      await settle();

      expect(getOrCreateConversation).toHaveBeenCalledWith({}, 'user-2', 'Bikal Shrestha', 'user-1', 'Asha Kumar');
      expect(mockPush).toHaveBeenCalledWith('/messages/conv-1');
    });

    it('raises a toast when the conversation can’t start', async () => {
      vi.mocked(getOrCreateConversation).mockResolvedValue({
        error: new Error('RLS'),
      } as Awaited<ReturnType<typeof getOrCreateConversation>>);
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Message Organizer' }));
      await settle();

      expect(mockPush).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't start a conversation. Please try again." })
      );
    });
  });

  describe('manage event', () => {
    beforeEach(() => {
      mocks.useAuth.mockReturnValue({ user: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1 } });
    });

    it('heads the organizer’s actions "Manage event"', async () => {
      await renderPage();
      const section = screen.getByRole('region', { name: 'Manage event' });
      expect(within(section).getByRole('link', { name: 'Edit Event' }).getAttribute('href')).toBe(
        '/events/create?edit=event-1'
      );
    });

    it('cancels the event after the dialog confirms', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel Event' }));
      await settle();

      const dialog = screen.getByRole('dialog', { name: 'Cancel this event?' });
      expect(within(dialog).getByText('Your attendees will see it as cancelled.')).toBeDefined();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel event' }));
      await settle();

      expect(cancelEvent).toHaveBeenCalledWith({}, 'event-1');
      expect(screen.getByRole('alert').textContent).toContain('This event has been cancelled.');
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Event cancelled.' })
      );
    });

    it('keeps the event when the dialog is dismissed', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel Event' }));
      await settle();

      fireEvent.click(screen.getByRole('button', { name: 'Keep event' }));
      await settle();

      expect(cancelEvent).not.toHaveBeenCalled();
    });

    it('deletes the event and returns to the list after the dialog confirms', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Delete Event' }));
      await settle();

      const dialog = screen.getByRole('dialog', { name: 'Delete this event?' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await settle();

      expect(deleteEvent).toHaveBeenCalledWith({}, 'event-1');
      expect(mockPush).toHaveBeenCalledWith('/events');
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Event deleted.' })
      );
    });

    it('raises a toast when the delete fails', async () => {
      vi.mocked(deleteEvent).mockResolvedValue({ error: new Error('new row violates row-level security policy') });
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Delete Event' }));
      await settle();

      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Delete this event?' })).getByRole('button', {
          name: 'Delete',
        })
      );
      await settle();

      expect(mockPush).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't delete the event. Please try again." })
      );
    });
  });
});
