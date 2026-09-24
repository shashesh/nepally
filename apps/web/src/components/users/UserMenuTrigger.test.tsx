import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { UserMenuTrigger } from './UserMenuTrigger';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

// Records what the trigger hands Avatar; the menu behaviour doesn't depend on
// how the avatar draws.
const avatarProps = vi.hoisted(() => ({ calls: [] as Array<{ name: string; toneKey?: string }> }));
vi.mock('../Avatar', () => ({
  default: (props: { name: string; toneKey?: string }) => {
    avatarProps.calls.push(props);
    return React.createElement('span', null, props.name);
  },
}));

describe('UserMenuTrigger', () => {
  it('passes a tone key through to the avatar, so a masked name keeps its colour', () => {
    avatarProps.calls = [];
    render(<UserMenuTrigger userId="u1" name="Bikash T." toneKey="Bikash Thapa" />);

    expect(avatarProps.calls.at(-1)).toMatchObject({ name: 'Bikash T.', toneKey: 'Bikash Thapa' });
  });

  it('opens a menu with a profile link and a chat action', async () => {
    const onChat = vi.fn();
    render(<UserMenuTrigger userId="u1" name="Bikash Thapa" onChat={onChat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikash Thapa' }));

    const profile = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profile.getAttribute('href')).toBe('/users/u1');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat' }));
    expect(onChat).toHaveBeenCalledWith('u1', 'Bikash Thapa');
  });

  it('omits Chat when no handler is given', async () => {
    render(<UserMenuTrigger userId="u1" name="Bikash Thapa" />);

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikash Thapa' }));

    await screen.findByRole('menuitem', { name: 'View profile' });
    expect(screen.queryByRole('menuitem', { name: 'Chat' })).toBeNull();
  });
});
