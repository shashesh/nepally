import React from 'react';
import { Avatar as MantineAvatar } from '@mantine/core';
import styles from './Avatar.module.css';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 32,
  medium: 40,
  large: 64,
  xlarge: 80,
};

const TRUST_CLASSES: Record<number, string> = {
  0: styles.trustLevel0,
  1: styles.trustLevel1,
  2: styles.trustLevel2,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function Avatar({
  name,
  photoUrl,
  trustLevel = 0,
  size = 'medium',
}: AvatarProps) {
  const trustClass = !photoUrl ? (TRUST_CLASSES[trustLevel] ?? TRUST_CLASSES[0]) : undefined;

  return (
    <MantineAvatar
      src={photoUrl}
      alt={`${name}'s avatar`}
      size={SIZE_MAP[size]}
      radius="xl"
      className={trustClass}
    >
      {getInitials(name)}
    </MantineAvatar>
  );
}
