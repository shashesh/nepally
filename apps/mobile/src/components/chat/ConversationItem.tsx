import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  function handleAvatarPress(pageX: number, pageY: number) {
    const MENU_WIDTH = 160;
    const MENU_HEIGHT = 56;
    const EDGE_GAP = 8;
    const VERTICAL_OFFSET = 8;

    const maxLeft = Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP);
    const left = Math.min(Math.max(EDGE_GAP, pageX), maxLeft);

    const belowTop = pageY + VERTICAL_OFFSET;
    const canOpenBelow = belowTop + MENU_HEIGHT <= viewportHeight - EDGE_GAP;
    const top = canOpenBelow
      ? belowTop
      : Math.max(EDGE_GAP, pageY - MENU_HEIGHT - VERTICAL_OFFSET);

    setDropdownPos({ top, left });
    setDropdownVisible(true);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleAvatarPress(e.nativeEvent.pageX, e.nativeEvent.pageY);
            }}
            activeOpacity={0.7}
          >
            <Avatar
              name={otherUserName}
              photoUrl={otherUserPhoto}
              trustLevel={otherUserTrustLevel}
              size="medium"
            />
          </TouchableOpacity>
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

      {/* Anchored avatar dropdown */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDropdownVisible(false)} />
          <View style={[styles.dropdown, { top: dropdownPos.top, left: dropdownPos.left }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setDropdownVisible(false);
                Alert.alert('Coming Soon', 'User profiles will be available in a future update.');
              }}
            >
              <Ionicons name="person-outline" size={18} color={colors.text.primary} />
              <Text style={styles.dropdownItemText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  modalContainer: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 160,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    gap: spacing.xs,
  },
  dropdownItemText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
  },
});
