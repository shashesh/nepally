import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { EventOrganizerCard, type EventOrganizerCardProps } from './EventOrganizerCard';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

const ORGANIZER: EventOrganizerCardProps['organizer'] = {
  id: 'u1',
  full_name: 'Asha Kumar',
  trust_level: 1,
  profile_photo: 'https://cdn.example.com/asha.jpg',
};

function renderCard(props: Partial<EventOrganizerCardProps> = {}) {
  const onMessage = vi.fn();
  render(
    <EventOrganizerCard
      organizer={ORGANIZER}
      canMessage
      messaging={false}
      onMessage={onMessage}
      {...props}
    />
  );
  return { onMessage };
}

describe('EventOrganizerCard', () => {
  it('is a section named "Organizer"', () => {
    renderCard();
    expect(screen.getByRole('region', { name: 'Organizer' })).toBeDefined();
  });

  it('has one link, the public name, to the organizer’s profile', () => {
    renderCard();
    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe('Asha K.');
    expect(links[0].getAttribute('href')).toBe('/users/u1');
  });

  it('gives the avatar no alt text, because the name follows it', () => {
    renderCard();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByAltText(/avatar/)).toBeNull();
  });

  it('shows Message Organizer only when the viewer can message', () => {
    renderCard({ canMessage: false });
    expect(screen.queryByRole('button', { name: 'Message Organizer' })).toBeNull();
  });

  it('calls onMessage from Message Organizer', () => {
    const { onMessage } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Message Organizer' }));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('stays focusable and inert while messaging', () => {
    const { onMessage } = renderCard({ messaging: true });
    const button = screen.getByRole('button', { name: 'Message Organizer' }) as HTMLButtonElement;
    button.focus();

    fireEvent.click(button);

    expect(onMessage).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);
  });
});
