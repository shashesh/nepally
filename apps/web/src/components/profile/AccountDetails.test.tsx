import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import { AccountDetails, type AccountDetailsProps } from './AccountDetails';

type TestUser = AccountDetailsProps['user'];

const baseUser: TestUser = {
  bio: 'Loves momo and community events.',
  email: 'ram@example.com',
  phone: '555-0100',
  zip_code: '10001',
  created_at: '2024-03-15T12:00:00Z',
  posts_count: 12,
  helpful_votes_received: 7,
};

function renderDetails(overrides: Partial<TestUser> = {}) {
  render(<AccountDetails user={{ ...baseUser, ...overrides }} />);
}

/**
 * The value paired with a label. Labels are `<dt role="term">`, values are
 * their sibling `<dd role="definition">` — the accname spec does not give
 * `term`/`definition` a name from their own text content, so pairing by
 * role+name isn't possible; go by text (the dt) and its next sibling (the
 * dd) instead. No class queries either way.
 */
function definitionFor(label: string): HTMLElement {
  const term = screen.getByText(label);
  expect(term.tagName.toLowerCase()).toBe('dt');
  const definition = term.nextElementSibling;
  if (!(definition instanceof HTMLElement)) {
    throw new Error(`No definition sibling found for term "${label}"`);
  }
  return definition;
}

describe('AccountDetails', () => {
  it('renders the Bio, Account Info and Activity section headings', () => {
    renderDetails();

    expect(screen.getByRole('heading', { level: 2, name: 'Bio' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Account Info' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Activity' })).toBeDefined();
  });

  it('exposes each label/value row as a term/definition pair', () => {
    renderDetails();

    expect(screen.getAllByRole('term')).toHaveLength(6);
    expect(screen.getAllByRole('definition')).toHaveLength(6);
  });

  it('shows the bio when the user has one', () => {
    renderDetails({ bio: 'Loves momo and community events.' });

    expect(screen.getByText('Loves momo and community events.')).toBeDefined();
  });

  it('falls back to the no-bio prompt when the bio is missing', () => {
    renderDetails({ bio: null });

    expect(screen.getByText('No bio set. Tap the menu → Edit Bio to add one.')).toBeDefined();
  });

  it('shows the email and the long member-since date', () => {
    renderDetails({ email: 'ram@example.com', created_at: '2024-03-15T12:00:00Z' });

    expect(definitionFor('Email').textContent).toBe('ram@example.com');
    expect(definitionFor('Member Since').textContent).toBe('March 15, 2024');
  });

  it('formats the member-since date consistently across timezones', () => {
    // Midday UTC keeps the local calendar date the same everywhere from
    // UTC-11 to UTC+11, so this assertion is timezone-safe in CI.
    renderDetails({ created_at: '2024-03-15T12:00:00Z' });

    expect(definitionFor('Member Since').textContent).toBe('March 15, 2024');
  });

  it('shows "Not set" for a missing phone and ZIP code', () => {
    renderDetails({ phone: undefined, zip_code: undefined });

    expect(definitionFor('Phone').textContent).toBe('Not set');
    expect(definitionFor('ZIP Code').textContent).toBe('Not set');
  });

  it('shows the phone and ZIP code when set', () => {
    renderDetails({ phone: '555-0100', zip_code: '10001' });

    expect(definitionFor('Phone').textContent).toBe('555-0100');
    expect(definitionFor('ZIP Code').textContent).toBe('10001');
  });

  it('shows the posts and helpful-votes counts', () => {
    renderDetails({ posts_count: 12, helpful_votes_received: 7 });

    expect(definitionFor('Posts').textContent).toBe('12');
    expect(definitionFor('Helpful Votes').textContent).toBe('7');
  });

  it('shows 0 for missing activity counts', () => {
    renderDetails({
      // The User type declares these as required numbers, but Supabase reads
      // can still come back without them — the component falls back to 0.
      posts_count: undefined as unknown as number,
      helpful_votes_received: undefined as unknown as number,
    });

    expect(definitionFor('Posts').textContent).toBe('0');
    expect(definitionFor('Helpful Votes').textContent).toBe('0');
  });
});
