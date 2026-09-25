import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  useSearchPage: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('../hooks/useSearchPage', () => ({ useSearchPage: mocks.useSearchPage }));
vi.mock('../hooks/useLocation', () => ({
  useLocation: () => ({ activeLocation: { metro_area_id: 'metro-nyc', metro_name: 'New York-Newark-Jersey City' } }),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import SearchPage from './search.page';

const post = { id: 'p1', title: 'Thapa Catering', created_at: new Date().toISOString(), is_global: false, tags: [] };
const state = (overrides = {}) => ({
  preview: {
    posts: { items: [post], totalCount: 4, hasMore: true },
    listings: { items: [], totalCount: 0, hasMore: false },
    people: { items: [], totalCount: 0, hasMore: false },
  },
  counts: { posts: 4, listings: 0, people: 0 },
  items: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null,
  loadMore: vi.fn(),
  retry: vi.fn(),
  ...overrides,
});

function setRoute(query: Record<string, string>) {
  mocks.useRouter.mockReturnValue({ query, replace: mocks.replace, pathname: '/search' });
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: 'u1' } });
    mocks.useSearchPage.mockReturnValue(state());
    setRoute({ q: 'thapa' });
  });

  it('redirects signed-out visitors to login without searching', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<SearchPage />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    // The search RPCs are revoked from anon, so they must not be attempted.
    expect(mocks.useSearchPage).toHaveBeenCalledWith(expect.objectContaining({ query: null }));
  });

  it('falls back to the user metro until the active location loads', () => {
    render(<SearchPage />);
    expect(mocks.useSearchPage).toHaveBeenCalledWith(expect.objectContaining({ metroId: 'metro-nyc' }));
  });

  it('shows the error instead of a skeleton when the preview fails', () => {
    mocks.useSearchPage.mockReturnValue(state({ preview: null, counts: null, error: new Error('offline') }));
    render(<SearchPage />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.queryByText('Searching…')).toBeNull();
  });

  it('does not claim a tab is empty when its request failed', () => {
    setRoute({ q: 'thapa', tab: 'listings' });
    mocks.useSearchPage.mockReturnValue(state({ items: [], error: new Error('offline') }));
    render(<SearchPage />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Search all metros' })).toBeNull();
  });

  it('prompts for a query when q is missing', () => {
    setRoute({});
    render(<SearchPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Search Nepally' })).toBeDefined();
  });

  it('shows the query, counts and the All preview', () => {
    render(<SearchPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Results for “thapa”' })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Posts\s*4/ })).toBeDefined();
    expect(screen.getByRole('link', { name: /Thapa Catering/ }).getAttribute('href')).toBe('/posts/p1');
    expect(mocks.useSearchPage).toHaveBeenCalledWith({ query: 'thapa', tab: 'all', allMetros: false, metroId: 'metro-nyc' });
  });

  it('switches tabs through the URL', () => {
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Posts/ }));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=thapa&tab=posts', undefined, { shallow: true, scroll: false });
  });

  it('scrolls each result tab into view when it takes focus', () => {
    const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    try {
      render(<SearchPage />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
      for (const tab of tabs) {
        scrollIntoView.mockClear();
        fireEvent.focus(tab);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(tab);
      }
    } finally {
      scrollIntoView.mockRestore();
    }
  });

  it('widens the scope through the URL', () => {
    render(<SearchPage />);
    fireEvent.click(screen.getByLabelText('All metros'));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=thapa&scope=all', undefined, { shallow: true, scroll: false });
  });

  it('lists a type tab and offers all metros when empty', () => {
    setRoute({ q: 'zzz', tab: 'listings' });
    mocks.useSearchPage.mockReturnValue(state({ items: [] }));
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Search all metros' }));
    expect(mocks.replace).toHaveBeenCalledWith('/search?q=zzz&tab=listings&scope=all', undefined, { shallow: true, scroll: false });
  });

  it('offers retry on error', () => {
    const retry = vi.fn();
    mocks.useSearchPage.mockReturnValue(state({ error: new Error('offline'), retry }));
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
