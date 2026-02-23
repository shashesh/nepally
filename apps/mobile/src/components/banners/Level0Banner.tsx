import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, heights } from '../../styles/spacing';

interface Level0BannerProps {
  onVerifyPress: () => void;
  onDismiss: () => void;
}

export const Level0Banner: React.FC<Level0BannerProps> = ({
  onVerifyPress,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons
        name="warning"
        size={20}
        color={colors.banner.level0.text}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={2}>
          You&apos;re viewing only. Verify phone to post and message.
        </Text>
        <TouchableOpacity onPress={onVerifyPress} style={styles.button}>
          <Text style={styles.buttonText}>Verify Now</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.banner.level0.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.banner.level0.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    minHeight: heights.banner,
    borderBottomWidth: 1,
    borderBottomColor: colors.banner.level0.text + '20',
  },
  icon: {
    marginRight: spacing.xs,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    ...typography.caption,
    color: colors.banner.level0.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  button: {
    backgroundColor: colors.banner.level0.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  buttonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: spacing.xs,
    padding: spacing.xxs,
  },
});
