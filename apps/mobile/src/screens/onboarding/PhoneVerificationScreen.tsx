import React, { useState, useContext, useEffect, useRef } from 'react';
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../types/navigation';
import { supabase } from '../../config/supabase';
import { createUserProfile, markPhoneVerified } from '@nusa/shared';
import { AuthContext } from '../../contexts/AuthContext';
import { sendPhoneOTP } from '../../services/auth/phoneAuth';
import { verifyPhoneOTP } from '../../services/auth/phoneAuth';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

const RESEND_COOLDOWN_SECONDS = 60;

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return `***-***-${cleaned.slice(-4)}`;
  }
  return phone;
}

export function PhoneVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PhoneVerification'>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'PhoneVerification'>>();
  const { refreshUser } = useContext(AuthContext);

  const { phone, fullName } = route.params;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCooldown();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function parseOtpError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('expired') || lower.includes('invalid otp')) {
      return 'Code expired. Request a new one.';
    }
    if (lower.includes('token') || lower.includes('invalid')) {
      return 'Invalid code. Please try again.';
    }
    return 'Verification failed. Please try again.';
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your SMS.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyPhoneOTP(phone, otp);

      if (!result.success) {
        throw result.error ?? new Error('Verification failed');
      }

      // Get the authenticated user from the session Supabase created
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!authUser) throw new Error('No authenticated user after verification');

      const userId = authUser.id;
      const email = authUser.email ?? '';

      // Create profile (trust_level: 0 initially)
      const profileResult = await createUserProfile(supabase, userId, email, fullName);
      if (profileResult.error) {
        // Profile may already exist for returning users — proceed
        const isDuplicate = profileResult.error.message?.includes('duplicate') ||
          profileResult.error.message?.includes('already exists');
        if (!isDuplicate) {
          console.error('Profile creation error:', profileResult.error);
          setError('Account setup failed. Please try again.');
          return;
        }
      }

      // Mark phone verified → trust_level: 1
      const verifyResult = await markPhoneVerified(supabase, userId);
      if (verifyResult.error) {
        console.error('markPhoneVerified error:', verifyResult.error);
      }

      await refreshUser();
      navigation.navigate('LocationPermission', { userId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(parseOtpError(message));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const result = await sendPhoneOTP(phone);
      if (!result.success) {
        throw result.error ?? new Error('Failed to resend code');
      }

      setOtp('');
      startCooldown();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend';
      Alert.alert('Resend Failed', message);
    } finally {
      setResendLoading(false);
    }
  }

  const resendLabel =
    resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code';

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
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to
          </Text>
          <Text style={styles.phoneDisplay}>{maskPhone(phone)}</Text>
          <Text style={styles.instructions}>
            Enter the code below to verify your account.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.otpInput, error ? styles.inputError : null]}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                if (error) setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.text.disabled}
              autoFocus
              textAlign="center"
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <PrimaryButton
            title="Verify Phone"
            onPress={handleVerify}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.resendContainer}>
            <TextButton
              title={resendLabel}
              onPress={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
            />
          </View>

          <View style={styles.footer}>
            <TextButton
              title="Use a different number"
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
    marginBottom: spacing.xs,
  },
  phoneDisplay: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  instructions: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.l,
  },
  inputWrapper: {
    alignItems: 'center',
  },
  otpInput: {
    ...typography.h2,
    width: '60%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    letterSpacing: 12,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.l,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.m,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.s,
  },
});
