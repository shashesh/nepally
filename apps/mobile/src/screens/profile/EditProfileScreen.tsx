import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useMetroArea } from '../../hooks/useMetroArea';
import { updateUserProfile, APP_CONFIG } from '@nusa/shared';
import { saveMetroArea } from '../../utils/storage';
import { supabase } from '../../config/supabase';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { fetchMetroByZip, updateLocation, loading: metroLoading } = useMetroArea();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [zipCode, setZipCode] = useState(user?.zip_code || '');
  const [metroName, setMetroName] = useState<string | null>(null);
  const [resolvedMetroId, setResolvedMetroId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const originalZip = user?.zip_code || '';

  const handleZipChange = async (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '').slice(0, APP_CONFIG.zipCodeLength);
    setZipCode(cleaned);
    setMetroName(null);
    setResolvedMetroId(null);

    if (cleaned.length === APP_CONFIG.zipCodeLength) {
      const metro = await fetchMetroByZip(cleaned);
      if (metro) {
        setMetroName(`${metro.name}, ${metro.state}`);
        setResolvedMetroId(metro.id);
      } else {
        setMetroName(null);
        setResolvedMetroId(null);
        setErrors((prev) => ({
          ...prev,
          zipCode: 'No metro area found for this ZIP code',
        }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (zipCode && zipCode.length !== APP_CONFIG.zipCodeLength) {
      newErrors.zipCode = `ZIP code must be ${APP_CONFIG.zipCodeLength} digits`;
    }

    if (zipCode !== originalZip && zipCode.length === APP_CONFIG.zipCodeLength && !resolvedMetroId) {
      newErrors.zipCode = 'No metro area found for this ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);

    try {
      // Update name and phone
      const profileResult = await updateUserProfile(supabase, user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });

      if (profileResult.error) {
        throw profileResult.error;
      }

      // Update location if ZIP changed
      if (zipCode !== originalZip && resolvedMetroId) {
        const locationSuccess = await updateLocation(user.id, zipCode, resolvedMetroId);
        if (!locationSuccess) {
          Alert.alert('Warning', 'Profile updated but location change failed. Please try again.');
        } else {
          // Update local cache
          const metro = await fetchMetroByZip(zipCode);
          if (metro) {
            await saveMetroArea(metro);
          }
        }
      }

      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, errors.fullName && styles.inputError]}
            placeholder="Your full name"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        {/* Phone Number */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={colors.text.disabled}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>

        {/* ZIP Code */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ZIP Code</Text>
          <TextInput
            style={[styles.input, errors.zipCode && styles.inputError]}
            placeholder="5-digit ZIP code"
            placeholderTextColor={colors.text.disabled}
            value={zipCode}
            onChangeText={handleZipChange}
            keyboardType="number-pad"
            maxLength={APP_CONFIG.zipCodeLength}
          />
          {errors.zipCode && (
            <Text style={styles.errorText}>{errors.zipCode}</Text>
          )}
          {metroLoading && (
            <Text style={styles.helperText}>Looking up metro area...</Text>
          )}
          {metroName && (
            <Text style={styles.metroText}>{metroName}</Text>
          )}
        </View>

        {/* Save Button */}
        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.l,
    gap: spacing.m,
  },
  fieldContainer: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  metroText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: spacing.s,
  },
});
