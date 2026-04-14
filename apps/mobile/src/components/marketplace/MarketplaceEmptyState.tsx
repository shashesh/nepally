import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmRadius, warmSurface } from '../../styles/warmTokens';

export type EmptyVariant = 'empty-metro' | 'empty-search' | 'empty-category';

interface Copy {
  headline: string;
  body: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

const COPY: Record<EmptyVariant, Copy> = {
  'empty-metro': {
    headline: 'Nothing in your metro yet',
    body: 'Be the first to share something with your Nepali community here.',
    primaryLabel: 'Create the first listing',
    secondaryLabel: 'Browse nearby metros',
  },
  'empty-search': {
    headline: 'No matches',
    body: 'Try a different search term or category.',
    primaryLabel: 'Clear filters',
  },
  'empty-category': {
    headline: 'Nothing here yet',
    body: 'This corner of the marketplace is still quiet.',
    primaryLabel: 'Back to Marketplace',
  },
};

interface MarketplaceEmptyStateProps {
  variant: EmptyVariant;
  onPrimary?: () => void;
  onSecondary?: () => void;
  /** Hide primary CTA when true (e.g. user can't post yet). */
  hidePrimary?: boolean;
}

export function MarketplaceEmptyState({
  variant,
  onPrimary,
  onSecondary,
  hidePrimary,
}: MarketplaceEmptyStateProps) {
  const copy = COPY[variant];
  return (
    <View style={styles.wrap} accessibilityLabel={`${copy.headline}. ${copy.body}`}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>🏪</Text>
      </View>
      <Text style={styles.headline}>{copy.headline}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {!hidePrimary && copy.primaryLabel && onPrimary ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary} accessibilityRole="button">
          <Text style={styles.primaryText}>{copy.primaryLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {copy.secondaryLabel && onSecondary ? (
        <TouchableOpacity onPress={onSecondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>{copy.secondaryLabel} →</Text>
        </TouchableOpacity>
      ) : null}
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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: warmSurface.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 44,
  },
  headline: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  primaryBtn: {
    marginTop: spacing.s,
    backgroundColor: warmAccent.warm,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: warmRadius.card,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryText: {
    color: warmAccent.warm,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
});
