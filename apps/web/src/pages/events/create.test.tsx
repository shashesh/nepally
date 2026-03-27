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

vi.mock('@nepally/shared', () => ({
  createEvent: vi.fn(async () => ({ data: { id: 'new-event' } })),
  updateEvent: vi.fn(async () => ({ data: { id: 'edit-event' } })),
  getEventById: vi.fn(async () => ({ data: null })),
  createEventSchema: {
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
  },
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
}));

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
});
