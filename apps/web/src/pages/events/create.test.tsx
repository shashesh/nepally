import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type SchemaIssue = { path: string[]; message: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
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
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', () => {
  // The page picks the update schema in edit mode; both validate the same
  // fields, so one stub serves as both.
  const eventSchema = {
    safeParse: (data: unknown) => {
      const parsed = data as Partial<{
        title: string;
        description: string;
        event_type: string;
        start_date: string;
        location_name: string;
      }>;
      const errors: SchemaIssue[] = [];
      if (!parsed.title || parsed.title.trim().length < 5) {
        errors.push({ path: ['title'], message: 'Title must be at least 5 characters' });
      }
      if (!parsed.description || parsed.description.trim().length < 10) {
        errors.push({ path: ['description'], message: 'Description must be at least 10 characters' });
      }
      if (!parsed.event_type) {
        errors.push({ path: ['event_type'], message: 'Select a valid event type' });
      }
      if (!parsed.start_date) {
        errors.push({ path: ['start_date'], message: 'Start date is required' });
      }
      if (!parsed.location_name || parsed.location_name.trim().length < 5) {
        errors.push({ path: ['location_name'], message: 'Location name must be at least 5 characters' });
      }
      if (errors.length > 0) return { success: false, error: { issues: errors } };
      return { success: true, data: parsed };
    },
  };

  return {
    createEvent: vi.fn(async () => ({ data: { id: 'new-event' } })),
    updateEvent: vi.fn(async () => ({ data: { id: 'edit-event' } })),
    getEventById: vi.fn(async () => ({ data: null })),
    createEventSchema: eventSchema,
    updateEventSchema: eventSchema,
      EVENT_TYPES: ['cultural', 'religious', 'social', 'career', 'other'],
    EVENT_TYPE_LABELS: { cultural: 'Cultural', religious: 'Religious', social: 'Social', career: 'Career', other: 'Other' },
    EVENT_TYPE_ICONS: { cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌' },
    EVENT_TYPE_COLORS: {
      cultural: { text: '#E65100', background: '#FFF3E0' },
      religious: { text: '#6A1B9A', background: '#F3E5F5' },
      social: { text: '#1B5E20', background: '#E8F5E9' },
      career: { text: '#0D47A1', background: '#E3F2FD' },
      other: { text: '#424242', background: '#F5F5F5' },
    },
    TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
    MAX_EVENT_PHOTO_BYTES: 2 * 1024 * 1024,
    uploadEventPhoto: vi.fn(async () => ({ url: 'https://cdn.example.com/event.jpg', path: 'u/event.jpg' })),
  };
});

import CreateEventPage from './create.page';

describe('CreateEventPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ query: {}, replace: mockReplace, push: mockPush });
    mocks.useAuth.mockReturnValue({
      user: { id: 'u1', trust_level: 1, metro_area_id: '19100', is_premium: false },
    });
  });

  it('renders the form', () => {
    render(React.createElement(CreateEventPage));
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. Dashain Celebration 2026')).toBeDefined();
    expect(screen.getByPlaceholderText("Tell people about your event...")).toBeDefined();
  });

  it('keeps submit disabled on invalid form', async () => {
    render(React.createElement(CreateEventPage));
    const submitButton = screen.getByRole('button', { name: /Create Event/ });
    expect(submitButton.getAttribute('disabled')).not.toBeNull();
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(CreateEventPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirects to /events for Level 0 user', async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'u1', trust_level: 0, metro_area_id: '19100', is_premium: false },
    });
    render(React.createElement(CreateEventPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/events'));
  });

  it('does not show global toggle for non-premium user', () => {
    render(React.createElement(CreateEventPage));
    expect(screen.queryByText('🌐 Make Global')).toBeNull();
  });

  it('shows global toggle for premium user', () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'u1', trust_level: 1, metro_area_id: '19100', is_premium: true },
    });
    render(React.createElement(CreateEventPage));
    expect(screen.getByText('🌐 Make Global')).toBeDefined();
  });

  it('shows loading, then fills the form with the event being edited', async () => {
    const { getEventById } = await import('@nepally/shared');
    vi.mocked(getEventById).mockResolvedValueOnce({
      data: {
        id: 'edit-event',
        title: 'Tihar Gathering',
        description: 'Lights, sweets and deusi-bhailo.',
        event_type: 'cultural',
        start_date: '2026-11-01T18:00:00.000Z',
        location_name: 'Irving Community Center',
        location_address: null,
        photo_url: null,
        rsvp_visibility: 'public',
        is_global: false,
      },
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
    mocks.useRouter.mockReturnValue({
      query: { edit: 'edit-event' },
      replace: mockReplace,
      push: mockPush,
    });

    render(React.createElement(CreateEventPage));
    expect(screen.getByText('Loading...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeDefined();
    });
    expect(getEventById).toHaveBeenCalledWith({}, 'edit-event');
    expect(
      (screen.getByPlaceholderText('e.g. Dashain Celebration 2026') as HTMLInputElement).value
    ).toBe('Tihar Gathering');
  });

  it('shows loading when the edit query arrives after the first render', async () => {
    const { getEventById } = await import('@nepally/shared');
    type EventByIdResult = Awaited<ReturnType<typeof getEventById>>;
    let resolveEvent: (value: EventByIdResult) => void = () => {};
    vi.mocked(getEventById).mockReturnValueOnce(
      new Promise<EventByIdResult>((resolve) => {
        resolveEvent = resolve;
      })
    );

    // Statically optimized pages render once with an empty query before hydration.
    const { rerender } = render(React.createElement(CreateEventPage));
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeDefined();

    mocks.useRouter.mockReturnValue({
      query: { edit: 'edit-event' },
      replace: mockReplace,
      push: mockPush,
    });
    rerender(React.createElement(CreateEventPage));
    expect(screen.getByText('Loading...')).toBeDefined();

    resolveEvent({ error: new Error('Event not found') });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeDefined();
    });
  });

  it('calls createEvent with valid form data', async () => {
    const { createEvent } = await import('@nepally/shared');
    render(React.createElement(CreateEventPage));

    fireEvent.change(screen.getByPlaceholderText('e.g. Dashain Celebration 2026'), {
      target: { value: 'Dashain Celebration 2026' },
    });
    fireEvent.change(screen.getByPlaceholderText("Tell people about your event..."), {
      target: { value: 'Annual celebration with cultural programs and food.' },
    });
    fireEvent.click(screen.getByText('🎭 Cultural'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Dallas Convention Center'), {
      target: { value: 'Dallas Convention Center' },
    });

    // Fill start_date (separate date + time inputs)
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureDateStr = future.toISOString().slice(0, 10);
    const futureTimeStr = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`;
    const dateInput = document.getElementById('event-start-date');
    const timeInput = document.getElementById('event-start-time');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: futureDateStr } });
    }
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: futureTimeStr } });
    }

    fireEvent.click(screen.getByRole('button', { name: /Create Event/ }));

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: 'Dashain Celebration 2026',
          event_type: 'cultural',
          location_name: 'Dallas Convention Center',
        })
      );
    });
  });
  describe('the converted fields', () => {
    it('keeps the ids the e2e suite drives the date and time by', () => {
      render(React.createElement(CreateEventPage));

      expect(document.getElementById('event-start-date')).not.toBeNull();
      expect(document.getElementById('event-start-time')).not.toBeNull();
      expect(document.getElementById('event-end-date')).not.toBeNull();
      expect(document.getElementById('event-end-time')).not.toBeNull();
      expect(document.getElementById('event-title')).not.toBeNull();
      expect(document.getElementById('event-location-name')).not.toBeNull();
      expect(document.getElementById('event-location-address')).not.toBeNull();
      expect(document.getElementById('event-description')).not.toBeNull();
    });

    it('reports which event type is chosen', () => {
      render(React.createElement(CreateEventPage));

      const cultural = screen.getByRole('button', { name: '🎭 Cultural' });
      expect(cultural.getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(cultural);

      expect(screen.getByRole('button', { name: '🎭 Cultural' }).getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByRole('button', { name: '🕌 Religious' }).getAttribute('aria-pressed')).toBe('false');
    });

    it('offers RSVP visibility as a radio group, public by default', () => {
      render(React.createElement(CreateEventPage));

      const group = screen.getByRole('radiogroup', { name: 'RSVP Visibility' });
      expect(group).toBeDefined();
      expect((screen.getByRole('radio', { name: /Public/ }) as HTMLInputElement).checked).toBe(true);
      expect((screen.getByRole('radio', { name: /Private/ }) as HTMLInputElement).checked).toBe(false);
    });

    it('lets the error banner be dismissed', async () => {
      render(React.createElement(CreateEventPage));

      // Submitting an empty form is blocked by the disabled button, so drive
      // the banner through a failing create instead.
      fireEvent.change(screen.getByPlaceholderText('e.g. Dashain Celebration 2026'), {
        target: { value: 'Dashain Celebration 2026' },
      });
      fireEvent.change(screen.getByPlaceholderText('Tell people about your event...'), {
        target: { value: 'Annual Dashain celebration with cultural programs.' },
      });
      fireEvent.click(screen.getByRole('button', { name: '🎭 Cultural' }));
      fireEvent.change(screen.getByPlaceholderText('e.g. Dallas Convention Center'), {
        target: { value: 'Dallas Convention Center' },
      });
      const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
      fireEvent.change(document.getElementById('event-start-date')!, {
        target: { value: future.toISOString().slice(0, 10) },
      });
      const { createEvent } = await import('@nepally/shared');
      vi.mocked(createEvent).mockResolvedValue({ error: new Error('Event rejected') } as never);

      fireEvent.click(screen.getByRole('button', { name: /Create Event/ }));

      await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
      expect(screen.getByText('Event rejected')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));

      await waitFor(() => expect(screen.queryByText('Event rejected')).toBeNull());
    });
  });

  describe('the event photo', () => {
    it('offers a one-slot uploader', () => {
      render(React.createElement(CreateEventPage));

      expect(screen.getByRole('group', { name: 'Event photo' })).toBeDefined();
      expect(screen.getByText('0/1 photos')).toBeDefined();
    });

    it('shows the photo an edited event already has', async () => {
      mocks.useRouter.mockReturnValue({ query: { edit: 'event-1' }, replace: mockReplace, push: mockPush });
      const { getEventById } = await import('@nepally/shared');
      vi.mocked(getEventById).mockResolvedValue({
        data: {
          id: 'event-1',
          title: 'Existing event',
          description: 'A description that is long enough',
          event_type: 'cultural',
          start_date: new Date(Date.now() + 86_400_000).toISOString(),
          end_date: null,
          location_name: 'Some Venue',
          location_address: '',
          photo_url: 'https://cdn.example.com/event.jpg',
          rsvp_visibility: 'public',
          is_global: false,
        },
      } as never);
      render(React.createElement(CreateEventPage));

      await waitFor(() => expect(screen.getByText('1/1 photos')).toBeDefined());
      expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeDefined();
    });

    it('keeps the stored photo when an edit does not touch it', async () => {
      mocks.useRouter.mockReturnValue({ query: { edit: 'event-1' }, replace: mockReplace, push: mockPush });
      const { getEventById } = await import('@nepally/shared');
      vi.mocked(getEventById).mockResolvedValue({
        data: {
          id: 'event-1',
          title: 'Existing event',
          description: 'A description that is long enough',
          event_type: 'cultural',
          start_date: new Date(Date.now() + 86_400_000).toISOString(),
          end_date: null,
          location_name: 'Some Venue',
          location_address: '',
          photo_url: 'https://cdn.example.com/event.jpg',
          rsvp_visibility: 'public',
          is_global: false,
        },
      } as never);
      const { updateEvent } = await import('@nepally/shared');
      render(React.createElement(CreateEventPage));
      await waitFor(() => expect(screen.getByText('1/1 photos')).toBeDefined());

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

      await waitFor(() =>
        expect(updateEvent).toHaveBeenCalledWith(
          {},
          'event-1',
          expect.objectContaining({ photo_url: 'https://cdn.example.com/event.jpg' })
        )
      );
    });
  });
});
