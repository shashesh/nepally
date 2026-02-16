import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  housing: 'home',
  jobs: 'briefcase',
  emergency: 'warning',
  travel: 'airplane',
};

interface ConversationItemProps {
  otherUserName: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  postTitle?: string;
  postCategory?: string;
  onPress: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  otherUserName,
  lastMessage,
  lastMessageTime,
  unreadCount,
  postTitle,
  postCategory,
  onPress,
}) => {
  const isUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(otherUserName)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Line 1: Name + Timestamp */}
        <View style={styles.topRow}>
          <Text
            style={[styles.name, isUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {otherUserName}
          </Text>
          {lastMessageTime && (
            <Text style={styles.timestamp}>
              {formatRelativeTime(lastMessageTime)}
            </Text>
          )}
        </View>

        {/* Line 2: Post context */}
        {postCategory && postTitle && (
          <View style={styles.postRow}>
            <Ionicons
              name={categoryIcons[postCategory] || 'document'}
              size={12}
              color={colors.text.secondary}
            />
            <Text style={styles.postTitle} numberOfLines={1}>
              {postTitle}
            </Text>
          </View>
        )}

        {/* Line 3: Last message + unread badge */}
        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {lastMessage || 'No messages yet'}
          </Text>
          {isUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    ...typography.body,
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },
  nameUnread: {
    fontWeight: '600',
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  postTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});
