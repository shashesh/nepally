import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchSuggestions } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useSearchSuggestions: vi.fn(),
}));

vi.mock('next/router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({ activeLocation: { metro_area_id: 'metro-nyc', metro_name: 'New York-Newark-Jersey City' } }),
}));
vi.mock('../../hooks/useSearchSuggestions', () => ({ useSearchSuggestions: mocks.useSearchSuggestions }));

import { SearchCombobox } from './SearchCombobox';

const empty = { items: [], totalCount: 0, hasMore: false };
const suggestions: SearchSuggestions = {
  posts: {
    items: [{ id: 'p1', title: 'Thapa Catering', created_at: new Date().toISOString(), tags: [] } as never],
    totalCount: 4,
    hasMore: true,
  },
  listings: empty,
  people: {
    items: [{ id: 'u1', full_name: 'Bikash Thapa', profile_photo: null, trust_level: 2, metro_area_id: 'metro-nyc', follower_count: 3, is_local: true }],
    totalCount: 1,
    hasMore: false,
  },
};

function typeQuery(text: string) {
  const input = screen.getByRole('textbox', { name: 'Search Nepally' });
  fireEvent.change(input, { target: { value: text } });
  return input;
}

describe('SearchCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchSuggestions.mockImplementation((input: string) => ({
      query: input.trim().length >= 2 ? input.trim() : null,
      data: input.trim().length >= 2 ? suggestions : null,
      loading: false,
      error: null,
    }));
  });

  it('shows grouped suggestions for the current metro', async () => {
    render(<SearchCombobox />);
    typeQuery('thapa');
    expect(await screen.findByText('Posts in New York-Newark')).toBeDefined();
    expect(screen.getByText('People')).toBeDefined();
    expect(screen.getByRole('option', { name: /3 more posts/ })).toBeDefined();
  });

  it('opens a result', async () => {
    const onNavigate = vi.fn();
    render(<SearchCombobox onNavigate={onNavigate} />);
    typeQuery('thapa');
    fireEvent.click(await screen.findByRole('option', { name: /Bikash Thapa/ }));
    expect(mocks.push).toHaveBeenCalledWith('/users/u1');
    expect(onNavigate).toHaveBeenCalled();
  });

  it('opens the results page on the matching tab from "more"', async () => {
    render(<SearchCombobox />);
    typeQuery('thapa');
    fireEvent.click(await screen.findByRole('option', { name: /3 more posts/ }));
    expect(mocks.push).toHaveBeenCalledWith('/search?q=thapa&tab=posts');
  });

  it('goes to all results on Enter with nothing highlighted', async () => {
    render(<SearchCombobox />);
    const input = typeQuery('thapa');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/search?q=thapa'));
  });

  it('opens the highlighted option with arrow keys and Enter', async () => {
    render(<SearchCombobox />);
    const input = typeQuery('thapa');
    await screen.findByRole('option', { name: /Thapa Catering/ });
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/posts/p1'));
  });

  it('offers all metros when nothing matches locally', async () => {
    mocks.useSearchSuggestions.mockImplementation((input: string, scope: { allMetros: boolean }) => ({
      query: input.trim() || null,
      data: scope.allMetros ? suggestions : { posts: empty, listings: empty, people: empty },
      loading: false,
      error: null,
    }));
    render(<SearchCombobox />);
    typeQuery('zzz');
    expect(await screen.findByText('No matches in New York-Newark')).toBeDefined();
    fireEvent.click(screen.getByRole('option', { name: 'Search all metros' }));
    await waitFor(() =>
      expect(mocks.useSearchSuggestions).toHaveBeenLastCalledWith('zzz', { metroId: 'metro-nyc', allMetros: true })
    );
  });
});
