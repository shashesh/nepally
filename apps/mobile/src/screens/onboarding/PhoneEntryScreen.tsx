import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { isValidPhoneNumber } from '@nusa/shared';
import { sendPhoneOTP } from '../../services/auth/phoneAuth';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

export function PhoneEntryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PhoneEntry'>>();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!isValidPhoneNumber(phone)) {
      newErrors.phone = 'Enter a valid US phone number (10 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneForSupabase = (raw: string): string => {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length === 11 && cleaned[0] === '1') return `+${cleaned}`;
    return `+${cleaned}`;
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const formattedPhone = formatPhoneForSupabase(phone);
      const result = await sendPhoneOTP(formattedPhone);

      if (!result.success) {
        throw result.error ?? new Error('Failed to send verification code');
      }

      navigation.navigate('PhoneVerification', {
        phone: formattedPhone,
        fullName: fullName.trim(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send code';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Phone Signup</Text>
          <Text style={styles.subtitle}>
            We&apos;ll send a verification code to your phone
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputContainer, errors.fullName ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                placeholder="Enter your full name"
                placeholderTextColor={colors.text.disabled}
                autoCapitalize="words"
              />
            </View>
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputContainer, errors.phone ? styles.inputError : null]}>
              <Text style={styles.countryCode}>+1</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/[^0-9]/g, '').slice(0, 10));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.text.disabled}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <PrimaryButton
            title="Send Verification Code"
            onPress={handleSendOTP}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <TextButton
              title="Back to signup options"
              onPress={() => navigation.goBack()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl,
    paddingBottom: spacing.m,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.l,
  },
  inputGroup: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    height: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  countryCode: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
  submitButton: {
    marginTop: spacing.m,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.m,
  },
});
