import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { Event } from '@nepally/shared';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import EventCard from './EventCard';

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT: Event = {
  id: 'e1',
  title: 'Dashain Celebration 2026',
  description: 'Annual Dashain celebration.',
  event_type: 'cultural',
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'user-1',
  rsvp_count: 8,
  interested_count: 15,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  organizer: {
    id: 'user-1',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

type CardProps = React.ComponentProps<typeof EventCard>;

function renderCard(props: Partial<CardProps> = {}) {
  return render(<EventCard event={MOCK_EVENT} {...props} />);
}

const responseGroup = () =>
  screen.queryByRole('group', { name: 'Your response to Dashain Celebration 2026' });

describe('EventCard (web)', () => {
  describe('content', () => {
    it('renders the title as an h3', () => {
      renderCard();
      expect(screen.getByRole('heading', { level: 3, name: 'Dashain Celebration 2026' })).toBeDefined();
    });

    it('renders the place', () => {
      renderCard();
      expect(screen.getByText('Dallas Convention Center')).toBeDefined();
    });

    it('renders the interested and going counts', () => {
      renderCard();
      expect(screen.getByText('15 interested')).toBeDefined();
      expect(screen.getByText('8 going')).toBeDefined();
    });

    it('formats large counts with K suffix', () => {
      renderCard({ event: { ...MOCK_EVENT, rsvp_count: 1500, interested_count: 6200 } });
      expect(screen.getByText('6.2K interested')).toBeDefined();
      expect(screen.getByText('1.5K going')).toBeDefined();
    });

    it('renders the organizer’s public name', () => {
      renderCard();
      expect(screen.getByText('Asha K.')).toBeDefined();
    });

    it('shows Unknown when the organizer is missing', () => {
      renderCard({ event: { ...MOCK_EVENT, organizer: undefined } });
      expect(screen.getByText('Unknown')).toBeDefined();
    });

    it('renders the event type badge', () => {
      renderCard();
      expect(screen.getByText('Cultural')).toBeDefined();
    });

    it('shows the Global badge only for a global event', () => {
      renderCard({ event: { ...MOCK_EVENT, is_global: true } });
      expect(screen.getByText('Global')).toBeDefined();
    });

    it('shows no scope badge for a local event', () => {
      renderCard();
      expect(screen.queryByText('Global')).toBeNull();
      expect(screen.queryByText('Local')).toBeNull();
    });

    it('shows Cancelled for a cancelled event', () => {
      renderCard({ event: { ...MOCK_EVENT, status: 'cancelled' } });
      expect(screen.getByText('Cancelled')).toBeDefined();
    });

    it('shows a hidden placeholder when there is no photo', () => {
      renderCard();
      expect(screen.getByText('📅').closest('[aria-hidden="true"]')).not.toBeNull();
      expect(screen.queryByRole('presentation')).toBeNull();
    });

    it('gives the cover photo an empty alt, because the title follows it', () => {
      renderCard({ event: { ...MOCK_EVENT, photo_url: 'https://cdn.example.com/dashain.jpg' } });
      expect(screen.getByRole('presentation').getAttribute('alt')).toBe('');
      expect(screen.queryByText('📅')).toBeNull();
    });

    it('renders the start date in a time element', () => {
      renderCard();
      const time = document.querySelector(`time[datetime="${FUTURE}"]`);
      expect(time?.textContent).toMatch(/·/);
    });

    it('renders a multi-day event as a date range', () => {
      const farFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      renderCard({ event: { ...MOCK_EVENT, end_date: farFuture } });
      expect(screen.getByText(/–/)).toBeDefined();
    });

    it('shows Past only on past cards', () => {
      const { unmount } = renderCard({ past: true });
      expect(screen.getByText('Past')).toBeDefined();
      unmount();

      renderCard();
      expect(screen.queryByText('Past')).toBeNull();
    });
  });

  describe('link', () => {
    it('has one link, named by the title, to the event', () => {
      renderCard({ canRespond: true });
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0].textContent).toBe('Dashain Celebration 2026');
      expect(links[0].getAttribute('href')).toBe('/events/e1');
    });

    it('keeps the response control outside the link', () => {
      renderCard({ canRespond: true });
      const link = screen.getByRole('link', { name: 'Dashain Celebration 2026' });
      const group = responseGroup();
      expect(group).not.toBeNull();
      expect(link.contains(group)).toBe(false);
    });
  });

  describe('response control', () => {
    it('is hidden when the member can’t respond', () => {
      renderCard({ canRespond: false });
      expect(responseGroup()).toBeNull();
    });

    it('is hidden on a cancelled event', () => {
      renderCard({ canRespond: true, event: { ...MOCK_EVENT, status: 'cancelled' } });
      expect(responseGroup()).toBeNull();
    });

    it('is hidden on a past card', () => {
      renderCard({ canRespond: true, past: true });
      expect(responseGroup()).toBeNull();
    });

    it('shows the member’s response as pressed', () => {
      renderCard({ canRespond: true, response: 'interested' });
      expect(screen.getByRole('button', { name: 'Interested' }).getAttribute('aria-pressed')).toBe(
        'true'
      );
      expect(screen.getByRole('button', { name: 'Going' }).getAttribute('aria-pressed')).toBe(
        'false'
      );
    });

    it('passes the event id and the new response', () => {
      const onRespond = vi.fn();
      renderCard({ canRespond: true, response: 'interested', onRespond });
      fireEvent.click(screen.getByRole('button', { name: 'Going' }));
      expect(onRespond).toHaveBeenCalledWith('e1', 'going');
    });

    it('passes null when the pressed button is pressed again', () => {
      const onRespond = vi.fn();
      renderCard({ canRespond: true, response: 'going', onRespond });
      fireEvent.click(screen.getByRole('button', { name: 'Going' }));
      expect(onRespond).toHaveBeenCalledWith('e1', null);
    });

    it('ignores presses while busy', () => {
      const onRespond = vi.fn();
      renderCard({ canRespond: true, busy: true, onRespond });
      const going = screen.getByRole('button', { name: 'Going' });
      expect(going.getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(going);
      expect(onRespond).not.toHaveBeenCalled();
    });
  });
});
