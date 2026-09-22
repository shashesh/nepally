import React from 'react';
import { Avatar as MantineAvatar } from '@mantine/core';
import { getAvatarToneIndex, getInitials } from '@nepally/shared';
import styles from './Avatar.module.css';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
  /** Overlay a small check for Level 1+ members. */
  showVerifiedMark?: boolean;
  /**
   * Hashed to pick the placeholder tone. Defaults to `name`. Pass a stable
   * identity key (e.g. a full name) when `name` itself varies by context
   * (e.g. a masked public display name) so the same person keeps the same
   * tone everywhere they're shown.
   */
  toneKey?: string;
  /**
   * True when a nearby heading or label already names the person, so the
   * avatar is pure decoration: renders `alt=""` and hides the initials
   * placeholder from assistive tech via `aria-hidden`.
   */
  decorative?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 32,
  medium: 40,
  large: 64,
  xlarge: 80,
};

const TONE_CLASSES = [
  styles.tone1,
  styles.tone2,
  styles.tone3,
  styles.tone4,
  styles.tone5,
  styles.tone6,
  styles.tone7,
  styles.tone8,
];

export default function Avatar({
  name,
  photoUrl,
  trustLevel = 0,
  size = 'medium',
  showVerifiedMark = false,
  toneKey,
  decorative = false,
}: AvatarProps) {
  const toneClass = TONE_CLASSES[getAvatarToneIndex(toneKey ?? name, TONE_CLASSES.length)];

  return (
    <span className={styles.root} aria-hidden={decorative || undefined}>
      <MantineAvatar
        src={photoUrl ?? null}
        alt={decorative ? '' : `${name}'s avatar`}
        size={SIZE_MAP[size]}
        radius="var(--radius-full)"
        classNames={{ placeholder: toneClass }}
      >
        {getInitials(name)}
      </MantineAvatar>
      {showVerifiedMark && trustLevel >= 1 ? (
        <span className={styles.verifiedMark} data-testid="verified-mark" role="img" aria-label="Verified">
          ✓
        </span>
      ) : null}
    </span>
  );
}
