import React from 'react';
import type { Event } from '@nepally/shared';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { EventSummaryRow } from './EventSummaryRow';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

type SummaryEvent = Pick<
  Event,
  'id' | 'title' | 'start_date' | 'end_date' | 'location_name' | 'rsvp_count' | 'is_global' | 'status'
>;

// Midday UTC keeps the rendered local date at "Mar 5, 2026" across any
// reasonable machine timezone (see apps/web/vitest.config.ts — no TZ pin).
const event: SummaryEvent = {
  id: 'event-1',
  title: 'Nepali New Year Mela',
  start_date: '2026-03-05T18:00:00.000Z',
  end_date: undefined,
  location_name: 'Dallas Convention Center',
  rsvp_count: 18,
  is_global: false,
  status: 'active',
};

const now = new Date('2026-04-01T12:00:00.000Z');

describe('EventSummaryRow', () => {
  it('links the title, and only the title, to the event', () => {
    render(<EventSummaryRow event={event} now={now} />);

    const link = screen.getByRole('link', { name: 'Nepali New Year Mela' });
    expect(link.getAttribute('href')).toBe('/events/event-1');
  });

  it('shows a Local badge for a metro event', () => {
    render(<EventSummaryRow event={event} now={now} />);

    expect(screen.getByText('Local')).toBeDefined();
  });

  it('shows a Global badge for a global event', () => {
    render(<EventSummaryRow event={{ ...event, is_global: true }} now={now} />);

    expect(screen.getByText('Global')).toBeDefined();
  });

  it('shows the date and place, with the date machine-readable', () => {
    render(<EventSummaryRow event={event} now={now} />);

    const time = screen.getByRole('time');
    expect(time.textContent).toBe('Mar 5, 2026');
    expect(time.getAttribute('dateTime')).toBe(event.start_date);
    expect(screen.getByText('Dallas Convention Center')).toBeDefined();
  });

  it('omits the location, and its separator, when there is none', () => {
    render(<EventSummaryRow event={{ ...event, location_name: '' }} now={now} />);

    expect(screen.getByRole('time').textContent).toBe('Mar 5, 2026');
    expect(screen.queryByText('Dallas Convention Center')).toBeNull();
  });

  it('shows the rsvp count as "N going"', () => {
    render(<EventSummaryRow event={event} now={now} />);

    expect(screen.getByText('18 going')).toBeDefined();
  });

  it('shows "0 going" rather than "0 goings" for a null count', () => {
    const withoutCount = { ...event, rsvp_count: null } as unknown as SummaryEvent;
    render(<EventSummaryRow event={withoutCount} now={now} />);

    expect(screen.getByText('0 going')).toBeDefined();
  });

  it('shows Cancelled for a cancelled event, even one that is still upcoming', () => {
    const upcomingCancelled: SummaryEvent = {
      ...event,
      status: 'cancelled',
      start_date: '2026-05-01T18:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={upcomingCancelled} now={now} />);

    expect(screen.getByText('Cancelled')).toBeDefined();
    expect(screen.queryByText('Past')).toBeNull();
  });

  it('shows Past when end_date is before now', () => {
    const pastEvent: SummaryEvent = {
      ...event,
      start_date: '2026-03-01T18:00:00.000Z',
      end_date: '2026-03-02T18:00:00.000Z',
    };
    render(<EventSummaryRow event={pastEvent} now={now} />);

    expect(screen.getByText('Past')).toBeDefined();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });

  it('shows Past using start_date when there is no end_date', () => {
    const pastEvent: SummaryEvent = {
      ...event,
      start_date: '2026-03-01T18:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={pastEvent} now={now} />);

    expect(screen.getByText('Past')).toBeDefined();
  });

  it('shows neither label for an upcoming event', () => {
    const upcoming: SummaryEvent = {
      ...event,
      start_date: '2026-05-01T18:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={upcoming} now={now} />);

    expect(screen.queryByText('Past')).toBeNull();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });
});
