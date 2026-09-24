import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Loader } from '@mantine/core';
import {
  formatPublicName,
  getFirstName,
  LANGUAGE_LABELS,
  HELPER_SCORE_VISIBILITY_THRESHOLD,
  pluralize,
  type LanguageCode,
  type PublicUser,
} from '@nepally/shared';
import Avatar from '../Avatar';
import { TrustBadge } from '../ui';
import { FollowButton } from './FollowButton';
import { supabase } from '../../lib/supabase';
import styles from './PublicProfileHeader.module.css';

export interface PublicProfileHeaderProps {
  profileUser: PublicUser;
  metroName: string | null;
  helperScore: number | null;
  isOwnProfile: boolean;
  viewerId: string | null;
  messaging: boolean;
  onMessage: () => void;
}

interface IdentityChip {
  key: string;
  label: string;
}

function buildIdentityChips(profileUser: PublicUser): IdentityChip[] {
  const chips: IdentityChip[] = [];

  if (profileUser.hometown_district) {
    chips.push({ key: 'hometown', label: profileUser.hometown_district });
  }
  if (profileUser.college) {
    chips.push({ key: 'college', label: profileUser.college });
  }
  if (typeof profileUser.years_in_us === 'number') {
    chips.push({ key: 'years', label: `${pluralize(profileUser.years_in_us, 'year')} in US` });
  }
  for (const code of profileUser.languages ?? []) {
    chips.push({ key: `lang-${code}`, label: LANGUAGE_LABELS[code as LanguageCode] ?? code });
  }

  return chips;
}

/**
 * Public profile banner + identity card: avatar, name, trust badge, bio,
 * stats, follow controls, identity chips, helper badge, and the
 * message/edit-profile call to action. Extracted from users/[id].page.tsx.
 */
export function PublicProfileHeader({
  profileUser,
  metroName,
  helperScore,
  isOwnProfile,
  viewerId,
  messaging,
  onMessage,
}: PublicProfileHeaderProps) {
  const publicName = formatPublicName(profileUser.full_name);
  const firstName = getFirstName(profileUser.full_name);
  const memberSinceYear = new Date(profileUser.created_at).getFullYear();

  // The label stays put while the conversation opens (the busy-control
  // pattern): a changing label would change the button's accessible name
  // under the member's focus. The Loader carries the progress cue instead.
  const messageLabel = viewerId ? `Message ${publicName}` : 'Sign in to message';

  // profileUser holds the count as loaded; a follow or unfollow here moves
  // it by one, so the count agrees with the button. Never below 0: an
  // unfollow may undo a follow the loaded count didn't include yet.
  const loadedFollowerCount = profileUser.follower_count ?? 0;
  const [followerDelta, setFollowerDelta] = useState(0);
  const followerCount = loadedFollowerCount + followerDelta;
  const handleFollowChange = (nowFollowing: boolean): void =>
    setFollowerDelta((delta) => Math.max(-loadedFollowerCount, delta + (nowFollowing ? 1 : -1)));

  const chips = buildIdentityChips(profileUser);
  const showNewMemberHint = profileUser.trust_level === 0 && !isOwnProfile;
  const showHelperBadge = typeof helperScore === 'number' && helperScore >= HELPER_SCORE_VISIBILITY_THRESHOLD;

  return (
    <div>
      <div className={styles.banner} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.avatarRing}>
            <Avatar
              name={publicName}
              photoUrl={profileUser.profile_photo}
              size="xlarge"
              toneKey={profileUser.full_name}
              decorative
            />
          </span>
          <div className={styles.identity}>
            <h1 className={styles.displayName}>{publicName}</h1>
            <TrustBadge level={profileUser.trust_level} />
          </div>
        </div>

        <div className={styles.body}>
          {showNewMemberHint && (
            <p className={styles.newMemberHint}>New to Nepally &mdash; message carefully.</p>
          )}

          {profileUser.bio ? (
            <p className={styles.bio}>{profileUser.bio}</p>
          ) : isOwnProfile ? (
            <p className={styles.bioEmpty}>
              <Link href="/profile" className={styles.bioEditLink}>
                Add a short bio &rarr;
              </Link>
            </p>
          ) : null}

          <div className={styles.statsRow} aria-label="Location and membership">
            {metroName && (
              <span className={styles.counts}>
                <span>{metroName}</span>
                <span className={styles.dot} aria-hidden="true">
                  &middot;
                </span>
              </span>
            )}
            <span>Joined {memberSinceYear}</span>
          </div>

          <div className={styles.socialRow}>
            <FollowButton
              supabase={supabase}
              viewerId={viewerId}
              targetUserId={profileUser.id}
              onChange={handleFollowChange}
            />
            <span className={styles.counts}>
              <span className={styles.followCount}>{pluralize(followerCount, 'follower')}</span>
              <span className={styles.dot} aria-hidden="true">
                &middot;
              </span>
              <span className={styles.followCount}>
                {pluralize(profileUser.following_count ?? 0, 'following', 'following')}
              </span>
            </span>
          </div>

          {chips.length > 0 && (
            <ul
              className={styles.chipRow}
              role="list"
              aria-label={firstName ? `About ${firstName}` : undefined}
            >
              {chips.map((chip) => (
                <li key={chip.key} className={styles.chip}>
                  {chip.label}
                </li>
              ))}
            </ul>
          )}

          {showHelperBadge && (
            <p className={styles.helperBadge}>
              <span aria-hidden="true">🙏</span> Helped {helperScore} people this year
            </p>
          )}

          <div className={styles.ctaRow}>
            {isOwnProfile ? (
              <Button
                component={Link}
                href="/profile"
                variant="default"
                radius="var(--radius-full)"
                className={styles.ctaButton}
              >
                Edit profile
              </Button>
            ) : (
              <Button
                type="button"
                variant="filled"
                radius="var(--radius-full)"
                className={styles.ctaButton}
                aria-disabled={messaging || undefined}
                aria-busy={messaging || undefined}
                data-disabled={messaging || undefined}
                leftSection={messaging ? <Loader size="xs" aria-hidden /> : undefined}
                onClick={messaging ? undefined : onMessage}
              >
                {messageLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
