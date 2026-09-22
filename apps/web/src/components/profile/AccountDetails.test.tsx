import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '../../test-utils';
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

function renderDetails(
  userOverrides: Partial<TestUser> = {},
  props: Omit<AccountDetailsProps, 'user'> = {}
) {
  render(<AccountDetails user={{ ...baseUser, ...userOverrides }} {...props} />);
}

type Scope = Pick<typeof screen, 'getByText'>;

/**
 * The value paired with a label. Labels are `<dt role="term">`, values are
 * their sibling `<dd role="definition">` — the accname spec does not give
 * `term`/`definition` a name from their own text content, so pairing by
 * role+name isn't possible; go by text (the dt) and its next sibling (the
 * dd) instead. No class queries either way. Pass a `within(...)` scope to
 * also confirm the row lives in the expected section.
 */
function definitionFor(scope: Scope, label: string): HTMLElement {
  const term = scope.getByText(label);
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

  it('shows the bio when the user has one, with no empty-bio fallback', () => {
    renderDetails({ bio: 'Loves momo and community events.' });

    expect(screen.getByText('Loves momo and community events.')).toBeDefined();
    expect(screen.queryByText('No bio yet.')).toBeNull();
  });

  it('falls back to "No bio yet." when the bio is missing', () => {
    renderDetails({ bio: null });

    expect(screen.getByText('No bio yet.')).toBeDefined();
  });

  it('falls back to "No bio yet." when the bio is an empty string', () => {
    renderDetails({ bio: '' });

    expect(screen.getByText('No bio yet.')).toBeDefined();
  });

  it('falls back to "No bio yet." when the bio is whitespace only', () => {
    renderDetails({ bio: '   ' });

    expect(screen.getByText('No bio yet.')).toBeDefined();
  });

  it('shows no edit-bio button without onEditBio', () => {
    renderDetails({ bio: 'Loves momo and community events.' });

    expect(screen.queryByRole('button', { name: 'Edit bio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a bio' })).toBeNull();
  });

  it('shows "Add a bio" and calls onEditBio when the bio is missing', () => {
    const onEditBio = vi.fn();
    renderDetails({ bio: null }, { onEditBio });

    fireEvent.click(screen.getByRole('button', { name: 'Add a bio' }));

    expect(onEditBio).toHaveBeenCalledTimes(1);
  });

  it('shows "Edit bio" and calls onEditBio when a bio exists', () => {
    const onEditBio = vi.fn();
    renderDetails({ bio: 'Loves momo and community events.' }, { onEditBio });

    fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));

    expect(onEditBio).toHaveBeenCalledTimes(1);
  });

  it('marks the edit-bio button aria-disabled and ignores clicks while busy', () => {
    const onEditBio = vi.fn();
    renderDetails({ bio: 'Loves momo and community events.' }, { onEditBio, editBioBusy: true });

    const button = screen.getByRole('button', { name: 'Edit bio' });
    expect(button.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(button);

    expect(onEditBio).not.toHaveBeenCalled();
  });

  it('shows the email and the long member-since date, scoped to Account Info', () => {
    renderDetails({ email: 'ram@example.com', created_at: '2024-03-15T12:00:00Z' });

    // Midday UTC keeps the local calendar date the same everywhere from
    // UTC-11 to UTC+11, so this assertion is timezone-safe in CI.
    const accountInfo = within(screen.getByRole('region', { name: 'Account Info' }));

    expect(definitionFor(accountInfo, 'Email').textContent).toBe('ram@example.com');
    expect(definitionFor(accountInfo, 'Member Since').textContent).toBe('March 15, 2024');
  });

  it('shows "Not set" for a missing phone and ZIP code', () => {
    renderDetails({ phone: undefined, zip_code: undefined });
    const accountInfo = within(screen.getByRole('region', { name: 'Account Info' }));

    expect(definitionFor(accountInfo, 'Phone').textContent).toBe('Not set');
    expect(definitionFor(accountInfo, 'ZIP Code').textContent).toBe('Not set');
  });

  it('shows the phone and ZIP code when set', () => {
    renderDetails({ phone: '555-0100', zip_code: '10001' });
    const accountInfo = within(screen.getByRole('region', { name: 'Account Info' }));

    expect(definitionFor(accountInfo, 'Phone').textContent).toBe('555-0100');
    expect(definitionFor(accountInfo, 'ZIP Code').textContent).toBe('10001');
  });

  it('shows the posts and helpful-votes counts, scoped to Activity', () => {
    renderDetails({ posts_count: 12, helpful_votes_received: 7 });
    const activity = within(screen.getByRole('region', { name: 'Activity' }));

    expect(definitionFor(activity, 'Posts').textContent).toBe('12');
    expect(definitionFor(activity, 'Helpful Votes').textContent).toBe('7');
  });

  it('shows 0 for missing activity counts', () => {
    renderDetails({
      // The User type declares these as required numbers, but Supabase reads
      // can still come back without them — the component falls back to 0.
      posts_count: undefined as unknown as number,
      helpful_votes_received: undefined as unknown as number,
    });
    const activity = within(screen.getByRole('region', { name: 'Activity' }));

    expect(definitionFor(activity, 'Posts').textContent).toBe('0');
    expect(definitionFor(activity, 'Helpful Votes').textContent).toBe('0');
  });
});
