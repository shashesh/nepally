import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmAccent, warmBorder, warmDisplaySm, warmSurface } from '../../styles/warmTokens';

export type MarketplaceTabKey = 'sponsored' | 'featured' | 'trending' | 'all';

interface MarketplaceTabsProps {
  active: MarketplaceTabKey;
  onChange: (key: MarketplaceTabKey) => void;
}

const TABS: { key: MarketplaceTabKey; label: string }[] = [
  { key: 'sponsored', label: 'Sponsored' },
  { key: 'featured', label: 'Featured' },
  { key: 'trending', label: 'Trending' },
  { key: 'all', label: 'All Listings' },
];

export function MarketplaceTabs({ active, onChange }: MarketplaceTabsProps) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            <View style={[styles.underline, isActive && styles.underlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s,
    backgroundColor: warmSurface.canvas,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  label: {
    ...warmDisplaySm,
    color: colors.text.secondary,
    paddingBottom: 6,
  },
  labelActive: {
    color: warmAccent.warm,
  },
  underline: {
    height: 2,
    width: '60%',
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  underlineActive: {
    backgroundColor: warmAccent.warm,
  },
});
