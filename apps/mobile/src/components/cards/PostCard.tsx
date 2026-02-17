import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius, shadows } from '../../styles/spacing';

interface PostCardProps {
  category: 'housing' | 'jobs' | 'emergency' | 'travel';
  title: string;
  description?: string;
  metadata: string;
  timestamp: string;
  metroArea: string;
  imageUrl?: string;
  isVerified?: boolean;
  // Author info
  authorName?: string;
  authorPhotoUrl?: string | null;
  authorTrustLevel?: number;
  // Engagement
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  // Callbacks
  onPress: () => void;
  onMessagePress?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
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

/**
 * Format a count for display (e.g. 1234 → "1.2K")
 */
function formatCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) {
    const k = (count / 1000).toFixed(1);
    return k.endsWith('.0') ? `${Math.floor(count / 1000)}K` : `${k}K`;
  }
  return `${Math.floor(count / 1000)}K`;
}

/**
 * Truncate at last complete word before maxLen chars
 */
function truncateDescription(text: string, maxLen: number = 150): { text: string; truncated: boolean } {
  if (text.length <= maxLen) return { text, truncated: false };
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return {
    text: (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + '...',
    truncated: true,
  };
}

/**
 * Convert a date string to relative time (e.g. "2h ago")
 */
function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export const PostCard: React.FC<PostCardProps> = ({
  category,
  title,
  description,
  metadata,
  timestamp,
  imageUrl,
  isVerified = false,
  authorName,
  authorPhotoUrl,
  authorTrustLevel = 0,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  onPress,
  onMessagePress,
  onLikePress,
  onCommentPress,
}) => {
  const descPreview = description ? truncateDescription(description) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Author Row */}
      {authorName && (
        <View style={styles.authorRow}>
          <Avatar
            name={authorName}
            photoUrl={authorPhotoUrl}
            trustLevel={authorTrustLevel}
            size="medium"
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {authorName}
              </Text>
              {isVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.success}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
          <Text style={styles.relativeTime}>
            {getRelativeTime(timestamp)}
          </Text>
        </View>
      )}

      {/* Category + Title */}
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
      </View>

      {/* Price / Metadata */}
      <Text style={styles.metadata} numberOfLines={1}>
        {metadata}
      </Text>

      {/* Description Preview */}
      {descPreview && (
        <View style={styles.descriptionRow}>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {descPreview.text}
            {descPreview.truncated && (
              <Text style={styles.viewMore}> View More</Text>
            )}
          </Text>
        </View>
      )}

      {/* Photo */}
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onLikePress?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? colors.accent.red : colors.text.secondary}
          />
          <Text style={[styles.actionCount, isLiked && { color: colors.accent.red }]}>
            {formatCount(likesCount)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onCommentPress?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.actionCount}>{formatCount(commentsCount)}</Text>
        </TouchableOpacity>

        {onMessagePress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onMessagePress();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primary.main} />
            <Text style={[styles.actionCount, { color: colors.primary.main }]}>Message</Text>
          </TouchableOpacity>
        )}
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
  // Author row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    maxWidth: '80%',
  },
  relativeTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    fontSize: 17,
  },
  metadata: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  // Description
  descriptionRow: {
    marginBottom: spacing.xs,
  },
  descriptionText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  viewMore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  // Image
  image: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.input,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionCount: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});
