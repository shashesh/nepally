import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius, shadows } from '../../styles/spacing';
import type { Tag } from '@nusa/shared';
import { TAG_EMOJI, TAG_COLORS, DEFAULT_TAG_COLOR } from '@nusa/shared';

interface PostCardProps {
  title: string;
  description?: string;
  timestamp: string;
  imageUrl?: string;
  imageUrls?: string[];
  isVerified?: boolean;
  /** Tags attached to this post */
  tags?: Tag[];
  /** Whether this post is a global (premium) post */
  isGlobal?: boolean;
  // Author info
  authorName?: string;
  authorPhotoUrl?: string | null;
  authorTrustLevel?: number;
  // Engagement
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  // Author identity (for avatar menu)
  authorId?: string;
  currentUserId?: string;
  // Callbacks
  onPress: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSavePress?: () => void;
  /** Called when user taps a tag pill — parent can activate the filter */
  onTagPress?: (slug: string) => void;
  /** Called when user taps the ⋯ more button */
  onMorePress?: () => void;
  /** Called when user selects "View Profile" from avatar menu */
  onAvatarViewProfile?: () => void;
  /** Called when user selects "Chat" from avatar menu */
  onAvatarChat?: () => void;
  /** Called when user taps a post image */
  onMediaPress?: (photos: string[], startIndex: number) => void;
}

/**
 * Convert a hex color to an rgba string at the given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  title,
  description,
  timestamp,
  imageUrl,
  imageUrls,
  isVerified = false,
  tags = [],
  isGlobal = false,
  authorName,
  authorPhotoUrl,
  authorTrustLevel = 0,
  authorId,
  currentUserId,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  isSaved = false,
  onPress,
  onLikePress,
  onCommentPress,
  onSavePress,
  onTagPress,
  onMorePress,
  onAvatarViewProfile,
  onAvatarChat,
  onMediaPress,
}) => {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const descPreview = description ? truncateDescription(description) : null;
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [avatarMenuPos, setAvatarMenuPos] = useState({ top: 0, left: 0 });
  const [mediaIndex, setMediaIndex] = useState(0);
  const isOwnPost = authorId && currentUserId && authorId === currentUserId;
  const mediaUrls = (imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [])
    .filter(Boolean)
    .slice(0, 3) as string[];

  useEffect(() => {
    setMediaIndex(0);
  }, [title, timestamp]);

  function showPreviousMedia() {
    if (mediaUrls.length <= 1) return;
    setMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  }

  function showNextMedia() {
    if (mediaUrls.length <= 1) return;
    setMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  }

  function getAvatarMenuPosition(pageX: number, pageY: number) {
    const MENU_WIDTH = 180;
    const MENU_HEIGHT = 112;
    const EDGE_GAP = 8;
    const VERTICAL_OFFSET = 8;

    const maxLeft = Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP);
    const left = Math.min(Math.max(EDGE_GAP, pageX), maxLeft);

    const belowTop = pageY + VERTICAL_OFFSET;
    const canOpenBelow = belowTop + MENU_HEIGHT <= viewportHeight - EDGE_GAP;
    const top = canOpenBelow
      ? belowTop
      : Math.max(EDGE_GAP, pageY - MENU_HEIGHT - VERTICAL_OFFSET);

    return { top, left };
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Author Row */}
      {authorName && (
        <View style={styles.authorRow}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              if (!isOwnPost) {
                const { pageX, pageY } = e.nativeEvent;
                setAvatarMenuPos(getAvatarMenuPosition(pageX, pageY));
                setAvatarMenuVisible(true);
              }
            }}
            activeOpacity={isOwnPost ? 1 : 0.7}
          >
            <Avatar
              name={authorName}
              photoUrl={authorPhotoUrl}
              trustLevel={authorTrustLevel}
              size="medium"
            />
          </TouchableOpacity>
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
          {onMorePress && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onMorePress();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
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

      {/* Photos */}
      {mediaUrls.length > 0 && (
        <View style={styles.mediaWrap}>
          <TouchableOpacity
            style={styles.mediaCarouselFrame}
            activeOpacity={0.9}
            onPress={(e) => {
              e.stopPropagation?.();
              onMediaPress?.(mediaUrls, mediaIndex);
            }}
          >
            <Image source={{ uri: mediaUrls[mediaIndex] }} style={styles.mediaCarouselImage} resizeMode="cover" />

            {mediaUrls.length > 1 && (
              <>
                <View style={styles.mediaCounterPill}>
                  <Text style={styles.mediaCounterText}>{mediaIndex + 1} / {mediaUrls.length}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.mediaNavButton, styles.mediaNavButtonLeft]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    showPreviousMedia();
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Previous image"
                >
                  <Text style={styles.mediaNavText}>‹</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mediaNavButton, styles.mediaNavButtonRight]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    showNextMedia();
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Next image"
                >
                  <Text style={styles.mediaNavText}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Tag Pills + Local / Global Badge */}
      <View style={styles.tagRow}>
        <View style={styles.tagPillsWrap}>
          {tags.map((tag) => {
            const tagColor = TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
            const emoji = TAG_EMOJI[tag.slug] || '';
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagPill, { backgroundColor: hexToRgba(tagColor, 0.15) }]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onTagPress?.(tag.slug);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagPillText, { color: tagColor }]}>
                  {emoji ? `${emoji} ${tag.name}` : tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.badge, isGlobal ? styles.badgeGlobal : styles.badgeLocal]}>
          <Text style={[styles.badgeText, isGlobal ? styles.badgeTextGlobal : styles.badgeTextLocal]}>
            {isGlobal ? '🌐 Global' : '📍 Local'}
          </Text>
        </View>
      </View>

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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onSavePress?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary.main : colors.text.secondary}
          />
        </TouchableOpacity>

      </View>

      {/* Avatar Tap Menu */}
      <Modal
        visible={avatarMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAvatarMenuVisible(false)} />
          <View style={[styles.avatarMenu, { top: avatarMenuPos.top, left: avatarMenuPos.left }]}> 
            <TouchableOpacity
              style={styles.avatarMenuItem}
              onPress={() => {
                setAvatarMenuVisible(false);
                onAvatarViewProfile?.();
              }}
            >
              <Ionicons name="person-outline" size={20} color={colors.text.primary} />
              <Text style={styles.avatarMenuText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarMenuItem}
              onPress={() => {
                setAvatarMenuVisible(false);
                onAvatarChat?.();
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary.main} />
              <Text style={[styles.avatarMenuText, { color: colors.primary.main }]}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  moreButton: {
    padding: 4,
    marginLeft: 4,
  },
  // Title row
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 17,
    marginBottom: 4,
  },
  // Local / Global badge
  badge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  badgeLocal: {
    backgroundColor: colors.badge.localBg,
  },
  badgeGlobal: {
    backgroundColor: colors.badge.globalBg,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeTextLocal: {
    color: colors.badge.localText,
  },
  badgeTextGlobal: {
    color: colors.badge.globalText,
  },
  // Description
  descriptionRow: {
    marginBottom: spacing.xs,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  viewMore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  // Image
  mediaWrap: {
    marginBottom: spacing.xs,
  },
  mediaCarouselFrame: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.background,
    position: 'relative',
  },
  mediaCarouselImage: {
    width: '100%',
    height: '100%',
  },
  mediaCounterPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.overlayMedium,
  },
  mediaCounterText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.white,
  },
  mediaNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayMedium,
  },
  mediaNavButtonLeft: {
    left: 8,
  },
  mediaNavButtonRight: {
    right: 8,
  },
  mediaNavText: {
    fontSize: 19,
    lineHeight: 19,
    color: colors.white,
    fontWeight: '700',
    marginTop: -1,
  },
  // Tag pills
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagPillsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '500',
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
  // Avatar menu
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
  },
  avatarMenu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
});
