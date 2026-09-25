import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import type { PublicUser } from '@nepally/shared';
import { AboutPanel, type AboutPanelProps } from './AboutPanel';

const profileUser = {
  id: 'profile-user',
  full_name: 'Bikal Shrestha',
  trust_level: 1,
  metro_area_id: '19100',
  profile_photo: null,
  bio: null,
  created_at: '2024-01-15T12:00:00Z',
} as unknown as PublicUser;

function renderPanel(overrides: Partial<AboutPanelProps> = {}) {
  render(
    <AboutPanel
      profileUser={profileUser}
      metroName="Dallas-Fort Worth, TX"
      postCount={3}
      eventCount={1}
      listingCount={0}
      {...overrides}
    />
  );
}

/** The About panel's term/definition pairs, e.g. { Posts: '3' }. */
function entries(): Record<string, string> {
  const terms = screen.getAllByRole('term');
  const definitions = screen.getAllByRole('definition');
  return Object.fromEntries(
    terms.map((term, index) => [term.textContent ?? '', definitions[index]?.textContent ?? ''])
  );
}

describe('AboutPanel', () => {
  it('lists location, member since, trust and the activity counts', () => {
    renderPanel();

    expect(entries()).toEqual({
      Location: 'Dallas-Fort Worth, TX',
      'Member since': '2024',
      'Trust level': 'Verified',
      Posts: '3',
      'Events organized': '1',
      'Active listings': '0',
    });
  });

  it('shows "Not set" without a metro', () => {
    renderPanel({ metroName: null });

    expect(entries().Location).toBe('Not set');
  });

  it('has no Bio row without a bio', () => {
    renderPanel();

    expect(screen.queryByText('Bio')).toBeNull();
  });

  it('keeps the line breaks the member wrote in their bio', () => {
    renderPanel({ profileUser: { ...profileUser, bio: 'Software engineer.\nHappy to help new arrivals.' } });

    const bio = entries().Bio;
    expect(bio).toBe('Software engineer.\nHappy to help new arrivals.');
    expect(screen.getByText(/Software engineer\.\s+Happy to help new arrivals\./)).toBeDefined();
  });
});
