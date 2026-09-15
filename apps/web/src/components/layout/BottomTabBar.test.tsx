import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import { BottomTabBar } from './BottomTabBar';

const useRouterMock = vi.hoisted(() => vi.fn());
vi.mock('next/router', () => ({ useRouter: useRouterMock }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    function MockLink({ href, children, ...rest }, ref) {
      return React.createElement('a', { href, ref, ...rest }, children);
    }
  ),
}));

const member = { id: 'u1', trust_level: 1, is_moderator: false } as unknown as User;

describe('BottomTabBar', () => {
  it('renders the five tabs with the current one marked', () => {
    useRouterMock.mockReturnValue({ pathname: '/events/[id]', query: {} });
    render(<BottomTabBar user={member} />);
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeDefined();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Events' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });

  it('points the create tab at verification for Level 0', () => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: {} });
    render(<BottomTabBar user={{ ...member, trust_level: 0 } as User} />);
    expect(screen.getByRole('link', { name: 'Verify to post' }).getAttribute('href')).toBe('/profile');
  });
});
