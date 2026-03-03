import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, heights, borderRadius } from '../../styles/spacing';

interface ZipCodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onValidChange?: (isValid: boolean) => void;
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  autoFocus?: boolean;
  testID?: string;
}

export const ZipCodeInput: React.FC<ZipCodeInputProps> = ({
  value,
  onChangeText,
  onValidChange,
  label,
  error,
  containerStyle,
  autoFocus = false,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isValid = value.length === 5 && /^\d{5}$/.test(value);

  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  const handleChangeText = (text: string) => {
    // Only allow digits, max 5 characters
    const cleaned = text.replace(/\D/g, '').slice(0, 5);
    onChangeText(cleaned);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <RNTextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            error && styles.inputError,
            isValid && !error && styles.inputValid,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          placeholder="12345"
          placeholderTextColor={colors.text.secondary}
          maxLength={5}
          autoFocus={autoFocus}
          returnKeyType="done"
          testID={testID ?? 'zip-code-input'}
        />
        {isValid && !error && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.s,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    ...typography.h2,
    height: heights.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.white,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  inputError: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  inputValid: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  checkmarkContainer: {
    position: 'absolute',
    right: spacing.s,
    top: (heights.input - 24) / 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
});
