import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { EventAttendanceCard, type EventAttendanceCardProps } from './EventAttendanceCard';

function renderCard(props: Partial<EventAttendanceCardProps> = {}) {
  const handlers = { onRespond: vi.fn(), onShowAttendees: vi.fn() };
  render(
    <EventAttendanceCard
      event={{ rsvp_count: 12, rsvp_visibility: 'public' }}
      isOrganizer={false}
      blockedBy={null}
      response={null}
      responding={false}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe('EventAttendanceCard', () => {
  it('is a section named "Attendance"', () => {
    renderCard();
    expect(screen.getByRole('region', { name: 'Attendance' })).toBeDefined();
  });

  describe('the going count', () => {
    it('opens the attendee list from a public list', () => {
      const { onShowAttendees } = renderCard();
      const count = screen.getByRole('button', { name: '12 people going' });

      expect(count.getAttribute('aria-haspopup')).toBe('dialog');
      fireEvent.click(count);
      expect(onShowAttendees).toHaveBeenCalledTimes(1);
    });

    it('uses the singular for one person', () => {
      renderCard({ event: { rsvp_count: 1, rsvp_visibility: 'public' } });
      expect(screen.getByRole('button', { name: '1 person going' })).toBeDefined();
    });

    it('is plain text at zero', () => {
      renderCard({ event: { rsvp_count: 0, rsvp_visibility: 'public' } });
      expect(screen.getByText('0 people going')).toBeDefined();
      expect(screen.queryByRole('button', { name: /going$/ })).toBeNull();
    });

    it('reads "12 going" as text on a private list', () => {
      renderCard({ event: { rsvp_count: 12, rsvp_visibility: 'private' } });
      expect(screen.getByText('12 going')).toBeDefined();
      expect(screen.queryByRole('button', { name: /people going/ })).toBeNull();
    });

    it('still opens a private list for the organizer', () => {
      renderCard({
        event: { rsvp_count: 12, rsvp_visibility: 'private' },
        isOrganizer: true,
        blockedBy: 'organizer',
      });
      expect(screen.getByRole('button', { name: '12 people going' })).toBeDefined();
    });
  });

  describe('below the count', () => {
    it('shows the response control when nothing blocks a response', () => {
      renderCard({ response: 'interested' });
      expect(screen.getByRole('group', { name: 'Your response' })).toBeDefined();
      expect(
        screen.getByRole('button', { name: 'Interested' }).getAttribute('aria-pressed')
      ).toBe('true');
    });

    it('passes the control’s value to onRespond', () => {
      const { onRespond } = renderCard({ response: 'interested' });
      fireEvent.click(screen.getByRole('button', { name: 'Going' }));
      expect(onRespond).toHaveBeenCalledWith('going');
    });

    it('marks the control busy while responding', () => {
      renderCard({ responding: true });
      expect(screen.getByRole('button', { name: 'Going' }).getAttribute('aria-disabled')).toBe(
        'true'
      );
    });

    it.each([
      ['past', 'This event has passed.'],
      ['organizer', "You're the organizer."],
      ['unverified', 'Verify your account to respond.'],
    ] as const)('explains a %s block in a sentence, with no control', (blockedBy, line) => {
      renderCard({ blockedBy });
      expect(screen.getByText(line)).toBeDefined();
      expect(screen.queryByRole('group', { name: 'Your response' })).toBeNull();
    });

    it('shows neither a control nor a line for a cancelled event', () => {
      renderCard({ blockedBy: 'cancelled' });
      const section = screen.getByRole('region', { name: 'Attendance' });

      expect(screen.queryByRole('group', { name: 'Your response' })).toBeNull();
      expect(section.textContent).toBe('Attendance12 people going');
    });
  });
});
