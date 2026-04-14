import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

interface MarketplaceSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function MarketplaceSearchBar({
  value,
  onChangeText,
  placeholder = 'Search listings…',
}: MarketplaceSearchBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel="Search marketplace"
          accessibilityHint="Filters listings by keyword"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: warmSurface.canvas,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    padding: 0,
  },
});
