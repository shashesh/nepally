import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

export type MarketplaceMenuKey =
  | 'my-listings'
  | 'saved'
  | 'promote'
  | 'browse-categories'
  | 'change-location'
  | 'rules';

interface MarketplaceMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: MarketplaceMenuKey) => void;
}

interface Row {
  key: MarketplaceMenuKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const ROWS: Row[] = [
  { key: 'my-listings', icon: 'pricetag-outline', label: 'My Listings' },
  { key: 'saved', icon: 'heart-outline', label: 'Saved' },
  { key: 'promote', icon: 'star-outline', label: 'Promote a Listing' },
  { key: 'browse-categories', icon: 'grid-outline', label: 'Browse Categories' },
  { key: 'change-location', icon: 'location-outline', label: 'Change Location' },
  { key: 'rules', icon: 'book-outline', label: 'Marketplace Rules' },
];

export function MarketplaceMenuSheet({ visible, onClose, onSelect }: MarketplaceMenuSheetProps) {
  if (!visible) {
    return null;
  }

  const handleSelect = (key: MarketplaceMenuKey) => {
    onSelect(key);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {ROWS.map((row) => (
          <TouchableOpacity
            key={row.key}
            style={styles.row}
            onPress={() => handleSelect(row.key)}
            accessibilityRole="button"
          >
            <Ionicons name={row.icon} size={22} color={colors.text.primary} />
            <Text style={styles.label}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,14,8,0.4)',
  },
  sheet: {
    backgroundColor: warmSurface.canvas,
    borderTopLeftRadius: warmRadius.sheet,
    borderTopRightRadius: warmRadius.sheet,
    paddingTop: spacing.xs,
    paddingBottom: spacing.l,
    paddingHorizontal: spacing.s,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: warmBorder.hairline,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
    gap: 14,
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '600',
  },
});
