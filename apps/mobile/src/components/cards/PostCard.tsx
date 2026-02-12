import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius, shadows } from '../../styles/spacing';

interface PostCardProps {
  category: 'housing' | 'jobs' | 'emergency' | 'travel';
  title: string;
  metadata: string;
  timestamp: string;
  metroArea: string;
  imageUrl?: string;
  isVerified?: boolean;
  onPress: () => void;
}

const categoryIcons: Record<string, any> = {
  housing: 'home',
  jobs: 'briefcase',
  emergency: 'warning',
  travel: 'airplane',
};

const categoryColors: Record<string, string> = {
  housing: colors.primary.main,
  jobs: colors.success,
  emergency: colors.error,
  travel: colors.accent.red,
};

export const PostCard: React.FC<PostCardProps> = ({
  category,
  title,
  metadata,
  timestamp,
  metroArea,
  imageUrl,
  isVerified = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={categoryIcons[category]}
            size={20}
            color={categoryColors[category]}
            style={styles.icon}
          />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {isVerified && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
              style={styles.verifiedIcon}
            />
          )}
        </View>
      </View>

      <Text style={styles.metadata} numberOfLines={1}>
        {metadata}
      </Text>

      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.timestamp} numberOfLines={1}>
          {timestamp} • {metroArea}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s,
    marginBottom: spacing.s,
    ...shadows.card,
  },
  header: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: spacing.xs,
  },
  metadata: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.input,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
