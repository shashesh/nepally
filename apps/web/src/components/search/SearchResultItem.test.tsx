import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import type { MarketplaceListing, PersonSearchResult, Post } from '@nepally/shared';
import { Highlight, SearchResultItem, getSearchResultHref, type SearchResult } from './SearchResultItem';

const post = {
  id: 'p1',
  title: 'Thapa Catering: momo orders open',
  description: 'Dashain orders',
  created_at: new Date().toISOString(),
  is_global: false,
  author: { id: 'u1', full_name: 'Bikash Thapa', trust_level: 2, profile_photo: null },
  tags: [{ id: 't1', slug: 'jobs', name: 'Jobs' }],
} as unknown as Post;

const listing = {
  id: 'l1',
  title: "Thapa's NCLEX prep book set",
  price: '$40',
  photos: [],
  category: { name: 'Education' },
} as unknown as MarketplaceListing;

const person: PersonSearchResult = {
  id: 'u2',
  full_name: 'Anjali Thapa',
  profile_photo: null,
  trust_level: 1,
  metro_area_id: 'metro-nyc',
  follower_count: 34,
  is_local: true,
};

describe('Highlight', () => {
  it('wraps matching words in <mark>', () => {
    const { container } = render(<Highlight text="Thapa Catering" query="tha" />);
    expect(Array.from(container.querySelectorAll('mark')).map((mark) => mark.textContent)).toEqual(['Thapa']);
  });
});

describe('getSearchResultHref', () => {
  it.each<[SearchResult, string]>([
    [{ kind: 'post', post }, '/posts/p1'],
    [{ kind: 'listing', listing }, '/marketplace/listing/l1'],
    [{ kind: 'person', person }, '/users/u2'],
  ])('links %o to %s', (result, href) => {
    expect(getSearchResultHref(result)).toBe(href);
  });
});

describe('SearchResultItem', () => {
  it('shows a post with author and tag', () => {
    render(<SearchResultItem result={{ kind: 'post', post }} query="thapa" />);
    expect(screen.getByText('Catering: momo orders open', { exact: false })).toBeDefined();
    expect(screen.getByText(/Bikash Thapa/)).toBeDefined();
    expect(screen.getByText('Jobs')).toBeDefined();
  });

  it('shows a listing with its price', () => {
    render(<SearchResultItem result={{ kind: 'listing', listing }} query="thapa" />);
    expect(screen.getByText('$40')).toBeDefined();
  });

  it('shows a person with trust tier and locality', () => {
    render(<SearchResultItem result={{ kind: 'person', person }} query="thapa" />);
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByText(/In your metro/)).toBeDefined();
  });

  it.each<[string, SearchResult]>([
    ['post', { kind: 'post', post }],
    ['listing', { kind: 'listing', listing: { ...listing, photos: ['https://example.com/desk.jpg'] } as MarketplaceListing }],
    ['person', { kind: 'person', person }],
  ])('renders a %s with no interactive elements', (_kind, result) => {
    const { container } = render(<SearchResultItem result={result} query="thapa" />);
    expect(container.querySelector('a, button, input, select, textarea, [tabindex]')).toBeNull();
  });
});
