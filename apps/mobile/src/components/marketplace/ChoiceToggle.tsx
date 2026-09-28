import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

interface ChoiceToggleProps<T extends string> {
  /** Names the group for screen readers, e.g. "Listing type". */
  accessibilityLabel: string;
  choices: readonly Choice<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
}

/** A row of side-by-side buttons where one is picked, read out as radio buttons. */
export function ChoiceToggle<T extends string>({
  accessibilityLabel,
  choices,
  selected,
  onSelect,
}: ChoiceToggleProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {choices.map((choice) => {
        const isSelected = choice.value === selected;
        return (
          <Pressable
            key={choice.value}
            style={({ pressed }) => [
              styles.button,
              isSelected && styles.buttonSelected,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onSelect(choice.value)}
            accessibilityRole="radio"
            accessibilityLabel={choice.label}
            accessibilityState={{ checked: isSelected }}
          >
            <Text style={[styles.text, isSelected && styles.textSelected]}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  button: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  buttonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  text: {
    ...typography.body,
    color: colors.text.secondary,
  },
  textSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
});
