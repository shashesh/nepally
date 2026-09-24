import React from 'react';
import { render, screen } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: indexMocks.useAuthMock }));

vi.mock('./feed.page', () => ({
  FeedPage: () => React.createElement('div', { 'data-testid': 'feed-page' }, 'Feed'),
}));

vi.mock('../components/landing/LandingPage', () => ({
  LandingPage: () => React.createElement('div', { 'data-testid': 'landing-page' }, 'Landing'),
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import Home from './index.page';

describe('Home (index page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null while auth is loading', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: true });
    render(React.createElement(Home));
    expect(screen.queryByTestId('landing-page')).toBeNull();
    expect(screen.queryByTestId('feed-page')).toBeNull();
  });

  it('renders FeedPage when user is logged in', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    render(React.createElement(Home));
    expect(screen.getByTestId('feed-page')).toBeDefined();
  });

  it('renders LandingPage when signed out', () => {
    indexMocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(React.createElement(Home));
    expect(screen.getByTestId('landing-page')).toBeDefined();
    expect(screen.queryByTestId('feed-page')).toBeNull();
    expect(document.querySelector('title')?.textContent).toBe('Nepally - The Nepali community in the USA');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(
      /housing, jobs, help, events and a local marketplace/
    );
    // React hoists <title> and <meta> into document.head; Next provides the viewport meta itself.
    expect(document.querySelector('meta[name="viewport"]')).toBeNull();
  });
});
