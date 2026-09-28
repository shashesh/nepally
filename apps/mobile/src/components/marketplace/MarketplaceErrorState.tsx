import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmRadius } from '../../styles/warmTokens';

interface MarketplaceErrorStateProps {
  message: string;
  onRetry: () => void;
  /** A slimmer version for the end of a list (a failed next page). */
  compact?: boolean;
}

/** A failed load, said as a sentence with a way to try again, never an empty list. */
export function MarketplaceErrorState({ message, onRetry, compact }: MarketplaceErrorStateProps) {
  return (
    // The role sits on the message, not the wrapper: an accessible wrapper would
    // swallow the Try again button for VoiceOver.
    <View style={[styles.wrap, compact && styles.wrapCompact]} accessibilityLiveRegion="polite">
      {!compact && <Ionicons name="cloud-offline-outline" size={40} color={colors.text.tertiary} />}
      <Text style={styles.message} accessibilityRole="alert">
        {message}
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.m,
    gap: spacing.xs,
  },
  wrapCompact: {
    paddingVertical: spacing.s,
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmAccent.warm,
  },
  retryText: {
    ...typography.body,
    color: warmAccent.warm,
    fontWeight: '600',
  },
});
