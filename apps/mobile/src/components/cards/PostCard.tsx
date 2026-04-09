import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import type { Tag } from '@nepally/shared';
import { TAG_EMOJI, TAG_COLORS, DEFAULT_TAG_COLOR, formatRelativeTime, formatCount } from '@nepally/shared';

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


export const PostCard: React.FC<PostCardProps> = React.memo(({
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reactionVisible, setReactionVisible] = useState(false);
  const isOwnPost = Boolean(authorId && currentUserId && authorId === currentUserId);
  const allMediaUrls = (imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [])
    .filter(Boolean) as string[];
  const mediaUrls = allMediaUrls.slice(0, 4);
  const extraCount = allMediaUrls.length - 4;

  function renderMediaGrid() {
    const GAP = 2;
    const totalWidth = viewportWidth;
    const halfWidth = (totalWidth - GAP) / 2;
    const cellStyle = { width: halfWidth, height: halfWidth, backgroundColor: colors.background as string };

    if (mediaUrls.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, 0); }}
        >
          <Image source={mediaUrls[0]} style={styles.mediaSingle} contentFit="cover" />
        </TouchableOpacity>
      );
    }

    if (mediaUrls.length === 2) {
      return (
        <View style={[styles.mediaRow, { gap: GAP }]}>
          {mediaUrls.map((url, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, i); }}
            >
              <Image source={url} style={cellStyle} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (mediaUrls.length === 3) {
      const leftWidth = totalWidth * 0.6 - GAP / 2;
      const rightWidth = totalWidth * 0.4 - GAP / 2;
      const cellHeight = leftWidth; // square-ish
      return (
        <View style={[styles.mediaRow, { gap: GAP }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, 0); }}
          >
            <Image source={mediaUrls[0]} style={{ width: leftWidth, height: cellHeight, backgroundColor: colors.background }} contentFit="cover" />
          </TouchableOpacity>
          <View style={[styles.mediaCol, { gap: GAP }]}>
            {[1, 2].map((i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.9}
                onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, i); }}
              >
                <Image source={mediaUrls[i]} style={{ width: rightWidth, height: (cellHeight - GAP) / 2, backgroundColor: colors.background }} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // 4 photos — 2×2 grid
    return (
      <View style={[styles.mediaGrid, { gap: GAP }]}>
        <View style={[styles.mediaRow, { gap: GAP }]}>
          {[0, 1].map((i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, i); }}
            >
              <Image source={mediaUrls[i]} style={cellStyle} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.mediaRow, { gap: GAP }]}>
          {[2, 3].map((i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              style={{ position: 'relative' }}
              onPress={(e) => { e.stopPropagation?.(); onMediaPress?.(allMediaUrls, i); }}
            >
              <Image source={mediaUrls[i]} style={cellStyle} contentFit="cover" />
              {i === 3 && extraCount > 0 && (
                <View style={styles.mediaOverlay}>
                  <Text style={styles.mediaOverlayText}>+{extraCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
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
      accessibilityRole="button"
      accessibilityLabel={title}
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
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); if (!isOwnPost) onAvatarViewProfile?.(); }}
                activeOpacity={isOwnPost ? 1 : 0.6}
                disabled={isOwnPost}
              >
                <Text style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </Text>
              </TouchableOpacity>
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
            {formatRelativeTime(new Date(timestamp))}
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
          <Text style={styles.descriptionText}>
            {descriptionExpanded ? description : descPreview.text}
            {descPreview.truncated && !descriptionExpanded && (
              <Text
                style={styles.viewMore}
                onPress={(e) => { e.stopPropagation?.(); setDescriptionExpanded(true); }}
              > See more</Text>
            )}
          </Text>
        </View>
      )}

      {/* Photos */}
      {mediaUrls.length > 0 && (
        <View style={styles.mediaWrap}>
          {renderMediaGrid()}
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

      {/* Counts Row */}
      {(likesCount > 0 || commentsCount > 0) && (
        <View style={styles.countsRow}>
          {likesCount > 0 && (
            <Text style={styles.countText}>
              {formatCount(likesCount)} {likesCount === 1 ? 'like' : 'likes'}
            </Text>
          )}
          {commentsCount > 0 && (
            <Text style={styles.countText}>
              {formatCount(commentsCount)} {commentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            if (reactionVisible) {
              return;
            }
            onLikePress?.();
          }}
          onLongPress={(e) => { e.stopPropagation?.(); setReactionVisible(true); }}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? colors.accent.red : colors.text.secondary}
          />
          <Text style={[styles.actionLabel, isLiked && { color: colors.accent.red }]}>Like</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => { e.stopPropagation?.(); onCommentPress?.(); }}
          accessibilityRole="button"
          accessibilityLabel="Comment on post"
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => { e.stopPropagation?.(); onSavePress?.(); }}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Unsave post' : 'Save post'}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary.main : colors.text.secondary}
          />
          <Text style={[styles.actionLabel, isSaved && { color: colors.primary.main }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Reaction Picker */}
      {reactionVisible && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]}
            onPress={() => setReactionVisible(false)}
          />
          <View style={styles.reactionPicker}>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => { setReactionVisible(false); onLikePress?.(); }}
            >
              <Text style={styles.reactionEmoji}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => { setReactionVisible(false); onLikePress?.(); }}
            >
              <Text style={styles.reactionEmoji}>🙏</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

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
});

PostCard.displayName = 'PostCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    paddingTop: spacing.s,
  },
  // Author row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: spacing.s,
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
    paddingHorizontal: spacing.s,
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
    paddingHorizontal: spacing.s,
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
  // Image grid
  mediaWrap: {
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  mediaSingle: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.background,
  },
  mediaRow: {
    flexDirection: 'row',
  },
  mediaCol: {
    flexDirection: 'column',
  },
  mediaGrid: {
    flexDirection: 'column',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlayText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  // Tag pills
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: spacing.s,
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
  // Counts row (above action bar)
  countsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingHorizontal: spacing.s,
    paddingBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.s,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  actionLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  // Reaction picker
  reactionPicker: {
    position: 'absolute',
    bottom: 54,
    left: spacing.s,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 11,
  },
  reactionOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 30,
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
