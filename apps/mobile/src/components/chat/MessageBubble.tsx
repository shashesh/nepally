import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { Avatar } from '../Avatar';

const AVATAR_SIZE = 32; // matches Avatar size="small"
const AVATAR_GAP = 8;

interface MessageBubbleProps {
  text: string;
  timestamp: string;
  isSent: boolean;
  isRead: boolean;
  senderName?: string;
  senderPhotoUrl?: string | null;
  senderTrustLevel?: number;
  showAvatar?: boolean;
  onAvatarPress?: (pageX: number, pageY: number) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  timestamp,
  isSent,
  isRead,
  senderName,
  senderPhotoUrl,
  senderTrustLevel,
  showAvatar = false,
  onAvatarPress,
}) => {
  const bubble = (
    <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
      <Text style={[styles.text, isSent ? styles.textSent : styles.textReceived]}>
        {text}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.time, isSent ? styles.timeSent : styles.timeReceived]}>
          {formatTime(timestamp)}
        </Text>
        {isSent && (
          <Ionicons
            name={isRead ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={isRead ? colors.white : 'rgba(255, 255, 255, 0.7)'}
            style={styles.checkIcon}
          />
        )}
      </View>
    </View>
  );

  if (isSent) {
    return (
      <View style={[styles.wrapper, styles.wrapperSent]}>
        {bubble}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, styles.wrapperReceived]}>
      {showAvatar && senderName ? (
        <TouchableOpacity
          style={styles.avatarSlot}
          onPress={(event) => {
            onAvatarPress?.(event.nativeEvent.pageX, event.nativeEvent.pageY);
          }}
          activeOpacity={onAvatarPress ? 0.7 : 1}
          disabled={!onAvatarPress}
        >
          <Avatar
            name={senderName}
            photoUrl={senderPhotoUrl}
            trustLevel={senderTrustLevel}
            size="small"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.avatarSlot} />
      )}
      {bubble}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 2,
  },
  wrapperSent: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  wrapperReceived: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 8,
    paddingRight: 16,
  },
  avatarSlot: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginRight: AVATAR_GAP,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleSent: {
    backgroundColor: colors.primary.main,
    borderTopRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.surfaceMuted,
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  textSent: {
    color: colors.white,
  },
  textReceived: {
    color: colors.text.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  time: {
    fontSize: 11,
  },
  timeSent: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeReceived: {
    color: colors.text.secondary,
  },
  checkIcon: {
    marginLeft: 2,
  },
});
