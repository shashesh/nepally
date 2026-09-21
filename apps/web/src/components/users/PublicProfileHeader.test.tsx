import React from 'react';
import type { PublicUser } from '@nepally/shared';
import { HELPER_SCORE_VISIBILITY_THRESHOLD } from '@nepally/shared';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PublicProfileHeader, type PublicProfileHeaderProps } from './PublicProfileHeader';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

vi.mock('../../lib/supabase', () => ({ supabase: {} }));

vi.mock('./FollowButton', () => ({
  FollowButton: ({ viewerId }: { viewerId: string | null; targetUserId: string }) =>
    viewerId ? React.createElement('button', { type: 'button', 'data-testid': 'follow-button' }, 'Follow') : null,
}));

const baseUser: PublicUser = {
  id: 'profile-user',
  full_name: 'Bikal Shrestha',
  profile_photo: null,
  bio: null,
  hometown_district: null,
  college: null,
  years_in_us: null,
  languages: [],
  follower_count: 0,
  following_count: 0,
  metro_area_id: '19100',
  trust_level: 1,
  posts_count: 0,
  helpful_votes_received: 0,
  is_premium: false,
  is_banned: false,
  is_moderator: false,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  last_active_at: '2024-01-15T00:00:00Z',
};

function renderHeader(overrides: Partial<PublicProfileHeaderProps> = {}) {
  const props: PublicProfileHeaderProps = {
    profileUser: baseUser,
    metroName: 'Dallas-Fort Worth, TX',
    helperScore: null,
    isOwnProfile: false,
    viewerId: 'viewer-1',
    messaging: false,
    onMessage: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PublicProfileHeader {...props} />) };
}

describe('PublicProfileHeader', () => {
  // ─── Identity ──────────────────────────────────────────────────────────────

  it('renders the public name as the only h1', () => {
    renderHeader();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Bikal S.');
  });

  // ─── Trust badge ───────────────────────────────────────────────────────────

  it('shows "New Member" at trust level 0', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 0 } });
    expect(screen.getByText('New Member')).toBeDefined();
  });

  it('shows "Verified" at trust level 1', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 1 } });
    expect(screen.getByText('Verified')).toBeDefined();
  });

  it('shows "Contributor" at trust level 2', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 2 } });
    expect(screen.getByText('Contributor')).toBeDefined();
  });

  // ─── New-member hint ───────────────────────────────────────────────────────

  it('shows the new-member hint at level 0 on someone else’s profile', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 0 }, isOwnProfile: false });
    expect(screen.getByText(/New to Nepally.*message carefully/i)).toBeDefined();
  });

  it('hides the new-member hint at level 0 on your own profile', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 0 }, isOwnProfile: true });
    expect(screen.queryByText(/New to Nepally/i)).toBeNull();
  });

  it('hides the new-member hint above level 0', () => {
    renderHeader({ profileUser: { ...baseUser, trust_level: 1 }, isOwnProfile: false });
    expect(screen.queryByText(/New to Nepally/i)).toBeNull();
  });

  // ─── Bio ───────────────────────────────────────────────────────────────────

  it('shows the bio when set', () => {
    renderHeader({ profileUser: { ...baseUser, bio: 'Software eng in Dallas.' } });
    expect(screen.getByText('Software eng in Dallas.')).toBeDefined();
  });

  it('shows "Add a short bio" linking to /profile on your own profile when bio is empty', () => {
    renderHeader({ profileUser: { ...baseUser, bio: null }, isOwnProfile: true });
    const link = screen.getByText(/Add a short bio/i).closest('a');
    expect(link?.getAttribute('href')).toBe('/profile');
  });

  it('does not show "Add a short bio" on another user’s profile', () => {
    renderHeader({ profileUser: { ...baseUser, bio: null }, isOwnProfile: false });
    expect(screen.queryByText(/Add a short bio/i)).toBeNull();
  });

  it('does not show "Add a short bio" on your own profile once a bio is set', () => {
    renderHeader({ profileUser: { ...baseUser, bio: 'Hi there.' }, isOwnProfile: true });
    expect(screen.queryByText(/Add a short bio/i)).toBeNull();
  });

  // ─── Message CTA ───────────────────────────────────────────────────────────

  it('labels the message button with the public name when signed in', () => {
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: false });
    expect(screen.getByRole('button', { name: 'Message Bikal S.' })).toBeDefined();
  });

  it('labels the message button "Sign in to message" when signed out', () => {
    renderHeader({ viewerId: null, isOwnProfile: false, messaging: false });
    expect(screen.getByRole('button', { name: /Sign in to message/i })).toBeDefined();
  });

  it('shows "Opening conversation…" and disables the button while messaging', () => {
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: true });
    const button = screen.getByText(/Opening conversation/i).closest('button');
    expect(button).not.toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls onMessage when the message button is clicked', () => {
    const onMessage = vi.fn();
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: false, onMessage });
    fireEvent.click(screen.getByRole('button', { name: 'Message Bikal S.' }));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  // ─── Edit profile (own profile) ─────────────────────────────────────────────

  it('shows an Edit profile link to /profile on your own profile, and no message button', () => {
    renderHeader({ isOwnProfile: true });
    const link = screen.getByText(/Edit profile/i).closest('a');
    expect(link?.getAttribute('href')).toBe('/profile');
    expect(screen.queryByRole('button', { name: /Message/i })).toBeNull();
  });

  // ─── Follower / following counts ────────────────────────────────────────────

  it('shows pluralised follower and following counts', () => {
    renderHeader({ profileUser: { ...baseUser, follower_count: 12, following_count: 4 } });
    expect(screen.getByText(/12 followers/)).toBeDefined();
    expect(screen.getByText(/4 following\b/)).toBeDefined();
  });

  it('singularises a lone follower and keeps "following" invariant', () => {
    renderHeader({ profileUser: { ...baseUser, follower_count: 1, following_count: 1 } });
    expect(screen.getByText(/1 follower\b/)).toBeDefined();
    expect(screen.getByText(/1 following\b/)).toBeDefined();
    expect(screen.queryByText(/1 followers/)).toBeNull();
    expect(screen.queryByText(/1 followings/)).toBeNull();
  });

  it('renders the follow control for another profile when signed in', () => {
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false });
    expect(screen.getByTestId('follow-button')).toBeDefined();
  });

  // ─── Identity chips ──────────────────────────────────────────────────────────

  it('renders identity chips only for the fields that are set', () => {
    renderHeader({
      profileUser: {
        ...baseUser,
        hometown_district: 'Pokhara',
        college: 'Pulchowk',
        years_in_us: 6,
        languages: ['nepali', 'newari'],
      },
    });
    expect(screen.getByText('Pokhara')).toBeDefined();
    expect(screen.getByText('Pulchowk')).toBeDefined();
    expect(screen.getByText('6 years in US')).toBeDefined();
    expect(screen.getByText('Nepali')).toBeDefined();
    expect(screen.getByText('Newari')).toBeDefined();
  });

  it('singularises a lone year in US', () => {
    renderHeader({ profileUser: { ...baseUser, years_in_us: 1 } });
    expect(screen.getByText('1 year in US')).toBeDefined();
  });

  it('renders no identity chip list when no chip fields are set', () => {
    renderHeader({
      profileUser: {
        ...baseUser,
        hometown_district: null,
        college: null,
        years_in_us: null,
        languages: [],
      },
    });
    expect(screen.queryByRole('list')).toBeNull();
  });

  // ─── Helper badge ────────────────────────────────────────────────────────────

  it('shows the helper badge at the visibility threshold', () => {
    renderHeader({ helperScore: HELPER_SCORE_VISIBILITY_THRESHOLD });
    expect(
      screen.getByText(new RegExp(`Helped ${HELPER_SCORE_VISIBILITY_THRESHOLD} people this year`))
    ).toBeDefined();
  });

  it('hides the helper badge just below the visibility threshold', () => {
    renderHeader({ helperScore: HELPER_SCORE_VISIBILITY_THRESHOLD - 1 });
    expect(screen.queryByText(/people this year/)).toBeNull();
  });

  it('hides the helper badge when helperScore is null', () => {
    renderHeader({ helperScore: null });
    expect(screen.queryByText(/people this year/)).toBeNull();
  });
});
