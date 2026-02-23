import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

interface ConversationItemProps {
  otherUserName: string;
  otherUserPhoto?: string | null;
  otherUserTrustLevel?: number;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  onPress: () => void;
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
  otherUserPhoto,
  otherUserTrustLevel,
  lastMessage,
  lastMessageTime,
  unreadCount,
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
      <View style={styles.avatarContainer}>
        <Avatar
          name={otherUserName}
          photoUrl={otherUserPhoto}
          trustLevel={otherUserTrustLevel}
          size="medium"
        />
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

        {/* Line 2: Last message + unread badge */}
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
  avatarContainer: {
    marginRight: 12,
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
