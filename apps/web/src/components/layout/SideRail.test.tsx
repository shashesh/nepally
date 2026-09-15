import React from 'react';
import { render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import { SideRail } from './SideRail';

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

describe('SideRail', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: {} });
  });

  it('is the primary navigation landmark with feed, topics and community links', () => {
    render(<SideRail user={member} />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toBeDefined();
    expect(screen.getByRole('link', { name: 'Housing' }).getAttribute('href')).toBe('/feed?tags=housing');
    expect(screen.getByRole('link', { name: 'Events' }).getAttribute('href')).toBe('/events');
    expect(screen.getByRole('link', { name: 'Create post' }).getAttribute('href')).toBe('/posts/create');
  });

  it('marks the active topic', () => {
    useRouterMock.mockReturnValue({ pathname: '/feed', query: { tags: 'jobs' } });
    render(<SideRail user={member} />);
    expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Feed' }).getAttribute('aria-current')).toBeNull();
  });

  it('keeps the legal links in the rail footer', () => {
    render(<SideRail user={member} />);
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy');
  });

  it('shows Moderation and Verify to post when appropriate', () => {
    render(<SideRail user={{ ...member, trust_level: 0, is_moderator: true } as User} />);
    expect(screen.getByRole('link', { name: 'Moderation' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Verify to post' }).getAttribute('href')).toBe('/profile');
  });
});
