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
}: AvatarProps) {
  const toneClass = TONE_CLASSES[getAvatarToneIndex(name, TONE_CLASSES.length)];

  return (
    <span className={styles.root}>
      <MantineAvatar
        src={photoUrl ?? null}
        alt={`${name}'s avatar`}
        size={SIZE_MAP[size]}
        radius="xl"
        classNames={{ placeholder: toneClass }}
      >
        {getInitials(name)}
      </MantineAvatar>
      {showVerifiedMark && trustLevel >= 1 ? (
        <span className={styles.verifiedMark} data-testid="verified-mark" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </span>
  );
}
