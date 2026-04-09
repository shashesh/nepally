import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../styles/colors';
import { sanitizeMediaUri } from '../utils/mediaUrl';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
}

const SIZES: Record<AvatarSize, number> = {
  small: 32,  // Comments
  medium: 40, // Post cards, conversation list
  large: 64,  // Profile screen
  xlarge: 80, // Profile header
};

const FONT_SIZES: Record<AvatarSize, number> = {
  small: 12,
  medium: 14,
  large: 24,
  xlarge: 28,
};

const TRUST_COLORS: Record<number, string> = {
  0: '#E0E0E0', // Level 0: Light Gray
  1: '#4A90E2', // Level 1: Blue
  2: '#7B61FF', // Level 2: Purple
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoUrl,
  trustLevel = 0,
  size = 'medium',
}) => {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const bgColor = TRUST_COLORS[trustLevel] ?? TRUST_COLORS[0];

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  const safePhotoUrl = photoUrl ? sanitizeMediaUri(photoUrl) : null;

  if (safePhotoUrl) {
    return (
      <Image
        source={safePhotoUrl}
        style={[styles.image, containerStyle]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View style={[styles.initialsContainer, containerStyle, { backgroundColor: bgColor }]}>
      <Text style={[styles.initialsText, { fontSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initialsText: {
    color: colors.white,
    fontWeight: '600',
  },
});
