import React from 'react';
import type { PublicUser } from '@nepally/shared';
import { HELPER_SCORE_VISIBILITY_THRESHOLD } from '@nepally/shared';
import { render, screen, fireEvent, within } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const mocks = vi.hoisted(() => ({ followButtonSpy: vi.fn() }));

vi.mock('./FollowButton', () => ({
  FollowButton: (props: { viewerId: string | null; targetUserId: string }) => {
    mocks.followButtonSpy(props);
    return props.viewerId
      ? React.createElement('button', { type: 'button', 'data-testid': 'follow-button' }, 'Follow')
      : null;
  },
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
  beforeEach(() => {
    mocks.followButtonSpy.mockClear();
  });

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
    renderHeader({ profileUser: { ...baseUser, trust_level: 0 }, isOwnProfile: true, viewerId: baseUser.id });
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
    renderHeader({ profileUser: { ...baseUser, bio: null }, isOwnProfile: true, viewerId: baseUser.id });
    const link = screen.getByRole('link', { name: /Add a short bio/i });
    expect(link.getAttribute('href')).toBe('/profile');
  });

  it('does not show "Add a short bio" on another user’s profile', () => {
    renderHeader({ profileUser: { ...baseUser, bio: null }, isOwnProfile: false });
    expect(screen.queryByText(/Add a short bio/i)).toBeNull();
  });

  it('does not show "Add a short bio" on your own profile once a bio is set', () => {
    renderHeader({ profileUser: { ...baseUser, bio: 'Hi there.' }, isOwnProfile: true, viewerId: baseUser.id });
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

  it('shows "Opening conversation…" while busy, without a signed-out label', () => {
    renderHeader({ viewerId: null, isOwnProfile: false, messaging: true });
    expect(screen.getByRole('button', { name: /Opening conversation/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Sign in to message/i })).toBeNull();
  });

  it('keeps the message button focusable while busy (aria-disabled, not native disabled)', () => {
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: true });
    const button = screen.getByRole('button', { name: /Opening conversation/i });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('does not call onMessage when clicked while busy', () => {
    const onMessage = vi.fn();
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: true, onMessage });
    fireEvent.click(screen.getByRole('button', { name: /Opening conversation/i }));
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('calls onMessage when the message button is clicked', () => {
    const onMessage = vi.fn();
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false, messaging: false, onMessage });
    fireEvent.click(screen.getByRole('button', { name: 'Message Bikal S.' }));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  // ─── Edit profile (own profile) ─────────────────────────────────────────────

  it('shows an Edit profile link to /profile on your own profile, and no message button', () => {
    renderHeader({ isOwnProfile: true, viewerId: baseUser.id });
    const link = screen.getByRole('link', { name: 'Edit profile' });
    expect(link.getAttribute('href')).toBe('/profile');
    expect(screen.queryByRole('button', { name: /Message/i })).toBeNull();
  });

  it('does not show an Edit profile link on someone else’s profile', () => {
    renderHeader({ isOwnProfile: false });
    expect(screen.queryByRole('link', { name: /Edit profile/i })).toBeNull();
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

  it('renders the follow control for another profile when signed in, targeting the profile user', () => {
    renderHeader({ viewerId: 'viewer-1', isOwnProfile: false });
    expect(screen.getByTestId('follow-button')).toBeDefined();
    expect(mocks.followButtonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ viewerId: 'viewer-1', targetUserId: 'profile-user' })
    );
  });

  // ─── Identity chips ──────────────────────────────────────────────────────────

  it('renders identity chips only for the fields that are set, with an accessible list name', () => {
    renderHeader({
      profileUser: {
        ...baseUser,
        hometown_district: 'Pokhara',
        college: 'Pulchowk',
        years_in_us: 6,
        languages: ['nepali', 'newari'],
      },
    });
    const list = screen.getByRole('list', { name: 'About Bikal' });
    expect(within(list).getByText('Pokhara')).toBeDefined();
    expect(within(list).getByText('Pulchowk')).toBeDefined();
    expect(within(list).getByText('6 years in US')).toBeDefined();
    expect(within(list).getByText('Nepali')).toBeDefined();
    expect(within(list).getByText('Newari')).toBeDefined();
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

  // ─── Stats row (metro + member-since) ───────────────────────────────────────

  it('shows the metro name alongside the joined year when metroName is set', () => {
    renderHeader({ metroName: 'Dallas-Fort Worth, TX' });
    const stats = within(screen.getByLabelText('Location and membership'));
    expect(stats.getByText('Dallas-Fort Worth, TX')).toBeDefined();
    expect(stats.getByText(/Joined 2024/)).toBeDefined();
  });

  it('omits the metro name and its separator when metroName is null', () => {
    renderHeader({ metroName: null });
    const stats = within(screen.getByLabelText('Location and membership'));
    expect(stats.getByText(/Joined 2024/)).toBeDefined();
    expect(stats.queryByText('·')).toBeNull();
  });

  // ─── Avatar mode ─────────────────────────────────────────────────────────────

  it('renders the avatar as decorative: no element (or img alt) named after the person', () => {
    renderHeader({ profileUser: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' } });
    expect(screen.queryByAltText(/Bikal S\.'s avatar/i)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
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
