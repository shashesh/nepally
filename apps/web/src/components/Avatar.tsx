import React from 'react';
import Image from 'next/image';
import styles from './Avatar.module.css';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
  xlarge: styles.sizeXlarge,
};

const FONT_CLASSES: Record<AvatarSize, string> = {
  small: styles.initialsSmall,
  medium: styles.initialsMedium,
  large: styles.initialsLarge,
  xlarge: styles.initialsXlarge,
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
  const sizeClass = SIZE_CLASSES[size];
  const trustClass = TRUST_CLASSES[trustLevel] ?? TRUST_CLASSES[0];

  if (photoUrl) {
    return (
      <div className={`${styles.avatar} ${sizeClass}`}>
        <Image
          src={photoUrl}
          alt={`${name}'s avatar`}
          fill
          sizes="80px"
          className={styles.avatarImage}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.avatar} ${sizeClass} ${trustClass}`}>
      <span className={`${styles.initials} ${FONT_CLASSES[size]}`}>
        {getInitials(name)}
      </span>
    </div>
  );
}
