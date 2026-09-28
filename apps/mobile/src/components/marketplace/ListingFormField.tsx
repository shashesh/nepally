import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type TextInputProps,
} from 'react-native';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface ListingFormFieldProps extends Omit<TextInputProps, 'style'> {
  /** The field's name, e.g. "Title". Shown with " *" when required, "(optional)" otherwise. */
  label: string;
  required?: boolean;
  error?: string;
  /** Reports where the field sits in the form, so a failed submit can scroll to it. */
  onSectionLayout?: (event: LayoutChangeEvent) => void;
  ref?: React.Ref<TextInput>;
}

/** One labelled text input of the create/edit listing form, with its error below. */
export function ListingFormField({
  label,
  required = false,
  error,
  onSectionLayout,
  ref,
  multiline,
  ...inputProps
}: ListingFormFieldProps) {
  return (
    <View style={styles.section} onLayout={onSectionLayout}>
      <Text style={styles.label}>{required ? `${label} *` : `${label} (optional)`}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, multiline && styles.textArea, error ? styles.inputError : null]}
        placeholderTextColor={colors.text.tertiary}
        multiline={multiline}
        accessibilityLabel={required ? `${label}, required` : label}
        // Screen readers read the error when the field is focused.
        accessibilityHint={error}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
});
