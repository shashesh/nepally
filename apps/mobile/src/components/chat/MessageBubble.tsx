import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';

interface MessageBubbleProps {
  text: string;
  timestamp: string;
  isSent: boolean;
  isRead: boolean;
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
}) => {
  return (
    <View style={[styles.wrapper, isSent ? styles.wrapperSent : styles.wrapperReceived]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  wrapperSent: {
    alignItems: 'flex-end',
  },
  wrapperReceived: {
    alignItems: 'flex-start',
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
