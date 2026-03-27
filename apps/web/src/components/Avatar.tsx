import React from 'react';
import { Avatar as MantineAvatar } from '@mantine/core';

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

const AVATAR_COLORS = [
  '#5B8EC9', // Soft blue
  '#4BA3A3', // Teal
  '#6B9E78', // Sage
  '#C4915E', // Amber
  '#C47A82', // Rose
  '#8B7EC7', // Lavender
  '#7B8FA1', // Slate
  '#D08770', // Coral
  '#9B7653', // Warm brown
  '#6C8EAD', // Steel blue
];

export function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
  trustLevel: _trustLevel = 0,
  size = 'medium',
}: AvatarProps) {
  const placeholderColor = !photoUrl ? getColorFromName(name) : undefined;

  return (
    <MantineAvatar
      src={photoUrl}
      alt={`${name}'s avatar`}
      size={SIZE_MAP[size]}
      radius="xl"
      color={placeholderColor}
    >
      {getInitials(name)}
    </MantineAvatar>
  );
}
