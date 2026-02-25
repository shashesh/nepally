import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: indexMocks.useAuthMock }));

vi.mock('./feed', () => ({
  FeedPage: () => React.createElement('div', { 'data-testid': 'feed-page' }, 'Feed'),
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import Home from './index';

describe('Home (index page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null while auth is loading', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: true });
    const { container } = render(React.createElement(Home));
    expect(container.firstChild).toBeNull();
  });

  it('renders FeedPage when user is logged in', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    render(React.createElement(Home));
    expect(screen.getByTestId('feed-page')).toBeDefined();
  });

  it('renders the landing page heading when logged out', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(React.createElement(Home));
    expect(screen.getByText('Welcome to NUSA')).toBeDefined();
    expect(screen.getByText('Nepalese United Support Alliance')).toBeDefined();
  });

  it('renders all four tag cards on the landing page', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(React.createElement(Home));
    expect(screen.getByText('Housing')).toBeDefined();
    expect(screen.getByText('Jobs')).toBeDefined();
    expect(screen.getByText('Help')).toBeDefined();
    expect(screen.getByText('Question')).toBeDefined();
  });

  it('tag cards link to /feed?tags=<slug>', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(React.createElement(Home));
    expect(screen.getByText('Housing').closest('a')?.getAttribute('href')).toBe('/feed?tags=housing');
    expect(screen.getByText('Jobs').closest('a')?.getAttribute('href')).toBe('/feed?tags=jobs');
  });
});
