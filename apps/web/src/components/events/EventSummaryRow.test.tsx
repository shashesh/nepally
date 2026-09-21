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

// Every fixture uses noon UTC (T12:00:00.000Z), the one convention that keeps
// the rendered local date stable across the timezones this suite actually
// runs in: noon UTC stays on the same calendar day from UTC-11 to UTC+11
// (outside that range it rolls into the next or previous day). An evening UTC
// time (e.g. T18:00Z) renders a day late from TZ=Asia/Tokyo (UTC+9) onward —
// see apps/web/vitest.config.ts, which pins no TZ, so this suite runs in
// whatever zone the machine or CI is in.
const event: SummaryEvent = {
  id: 'event-1',
  title: 'Nepali New Year Mela',
  start_date: '2026-03-05T12:00:00.000Z',
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
    expect(screen.getAllByRole('link')).toHaveLength(1);
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

  it('drops the location entirely when there is none, leaving no dangling separator', () => {
    render(<EventSummaryRow event={{ ...event, location_name: '' }} now={now} />);

    const time = screen.getByRole('time');
    expect(time.textContent).toBe('Mar 5, 2026');
    expect(screen.queryByText('Dallas Convention Center')).toBeNull();
    expect(time.parentElement?.children).toHaveLength(1);
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
      start_date: '2026-05-01T12:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={upcomingCancelled} now={now} />);

    expect(screen.getByText('Cancelled')).toBeDefined();
    expect(screen.queryByText('Past')).toBeNull();
  });

  it('shows Cancelled, not Past, for a past cancelled event', () => {
    const pastCancelled: SummaryEvent = {
      ...event,
      status: 'cancelled',
      start_date: '2026-03-01T12:00:00.000Z',
      end_date: '2026-03-02T12:00:00.000Z',
    };
    render(<EventSummaryRow event={pastCancelled} now={now} />);

    expect(screen.getByText('Cancelled')).toBeDefined();
    expect(screen.queryByText('Past')).toBeNull();
  });

  it('shows Past when end_date is before now', () => {
    const pastEvent: SummaryEvent = {
      ...event,
      start_date: '2026-03-01T12:00:00.000Z',
      end_date: '2026-03-02T12:00:00.000Z',
    };
    render(<EventSummaryRow event={pastEvent} now={now} />);

    expect(screen.getByText('Past')).toBeDefined();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });

  it('shows Past using start_date when there is no end_date', () => {
    const pastEvent: SummaryEvent = {
      ...event,
      start_date: '2026-03-01T12:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={pastEvent} now={now} />);

    expect(screen.getByText('Past')).toBeDefined();
  });

  it('uses end_date over start_date: a past start with a future end shows neither label', () => {
    const ongoing: SummaryEvent = {
      ...event,
      start_date: '2026-03-30T12:00:00.000Z',
      end_date: '2026-04-02T12:00:00.000Z',
    };
    render(<EventSummaryRow event={ongoing} now={now} />);

    expect(screen.queryByText('Past')).toBeNull();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });

  it('shows neither label for an upcoming event', () => {
    const upcoming: SummaryEvent = {
      ...event,
      start_date: '2026-05-01T12:00:00.000Z',
      end_date: undefined,
    };
    render(<EventSummaryRow event={upcoming} now={now} />);

    expect(screen.queryByText('Past')).toBeNull();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });
});
